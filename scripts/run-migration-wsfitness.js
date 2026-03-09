/**
 * WS Fitness -> Timeo Migration Runner
 * Connects to production PostgreSQL and migrates data from the JSON export.
 */
const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

const DB_URL = 'postgresql://timeo:887cb186041f1c19ec94e8615d15b60a@72.61.123.64:25432/timeo';
const EXPORT_FILE = '/sessions/vibrant-ecstatic-knuth/mnt/wsfitness/wsfitness_full_export_2026-03-06.json';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function genId() {
  let id = '';
  const bytes = crypto.randomBytes(21);
  for (let i = 0; i < 21; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

function mapRole(wsRole) {
  if (['admin', 'it_admin'].includes(wsRole)) return 'admin';
  if (['coach', 'staff'].includes(wsRole)) return 'staff';
  return 'customer';
}

function mapMembershipStatus(s) {
  if (s === 'active') return 'active';
  if (['pending_approval', 'pending'].includes(s)) return 'invited';
  return 'suspended';
}

function rmToCents(rm) { return Math.round(parseFloat(rm) * 100); }

async function main() {
  console.log('Loading export...');
  const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf-8'));
  const t = data.tables;

  console.log(`Profiles: ${t.profiles.row_count}, Auth: ${data.auth_users.row_count}`);
  console.log(`Plans: ${t.membership_plans.row_count}, Memberships: ${t.memberships.row_count}`);
  console.log(`Check-ins: ${t.check_ins.row_count}, Clients: ${t.clients.row_count}`);
  console.log(`Training logs: ${t.training_logs.row_count}, Payments: ${t.payment_requests.row_count}`);

  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to production DB');

  // Build lookup maps
  const profileMap = Object.fromEntries(t.profiles.rows.map(p => [p.id, p]));
  const roleMap = Object.fromEntries(t.user_roles.rows.map(r => [r.user_id, r.role]));
  const membershipMap = Object.fromEntries(t.memberships.rows.map(m => [m.user_id, m]));
  const authMap = Object.fromEntries(data.auth_users.rows.map(a => [a.id, a]));
  const clientMap = Object.fromEntries(t.clients.rows.map(c => [c.id, c]));

  const counts = { users: 0, existing: 0, tenant_memberships: 0, plans: 0, subs: 0, qr: 0, checkins: 0, packages: 0, credits: 0, logs: 0, payments: 0, skipped: 0 };

  // WS UUID -> Timeo user ID
  const wsToUserId = {};

  await client.query('BEGIN');

  try {
    // ─── 1. USERS ─────────────────────────────────────────────────────────
    console.log('\n── Creating users ──');
    for (const profile of t.profiles.rows) {
      const email = (profile.email || '').trim().toLowerCase();
      if (!email) { counts.skipped++; continue; }

      const authData = authMap[profile.id];
      const name = profile.name || email.split('@')[0];

      // Check if user already exists
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        wsToUserId[profile.id] = existing.rows[0].id;
        counts.existing++;
        continue;
      }

      const authId = genId();
      const userId = genId();
      const accountId = genId();

      await client.query(
        'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [authId, name, email, !!(authData && authData.email_confirmed_at), profile.created_at]
      );
      await client.query(
        'INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES ($1, $2, $3, $4, NULL, $5, NOW())',
        [accountId, authId, 'credential', authId, profile.created_at]
      );
      await client.query(
        'INSERT INTO users (id, auth_id, email, name, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [userId, authId, email, name, profile.avatar_url || null, profile.created_at]
      );

      wsToUserId[profile.id] = userId;
      counts.users++;
    }
    console.log(`  Created ${counts.users} new users, ${counts.existing} existing, ${counts.skipped} skipped`);

    // ─── 2. TENANT ────────────────────────────────────────────────────────
    console.log('\n── Creating tenant ──');
    const admins = t.user_roles.rows.filter(r => r.role === 'admin');
    const ownerWsId = admins[0].user_id;
    const ownerId = wsToUserId[ownerWsId];

    let tenantId;
    const existingTenant = await client.query("SELECT id FROM tenants WHERE slug = 'ws-fitness'");
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`  Existing tenant: ${tenantId}`);
    } else {
      tenantId = genId();
      await client.query(
        `INSERT INTO tenants (id, name, slug, owner_id, plan, status, settings, branding, payment_gateway, created_at, updated_at)
         VALUES ($1, 'WS Fitness', 'ws-fitness', $2, 'pro', 'active', $3, $4, 'revenue_monster', NOW(), NOW())`,
        [tenantId, ownerId,
         JSON.stringify({ timezone: 'Asia/Kuala_Lumpur', businessHours: { open: '06:00', close: '23:00' }, bookingBuffer: 15, autoConfirmBookings: false }),
         JSON.stringify({ primaryColor: '#dc2626', businessName: 'WS Fitness' })]
      );
      console.log(`  Created tenant: ${tenantId}`);
    }

    // ─── 3. TENANT MEMBERSHIPS ────────────────────────────────────────────
    console.log('\n── Tenant memberships ──');
    for (const profile of t.profiles.rows) {
      const userId = wsToUserId[profile.id];
      if (!userId) continue;

      const wsRole = roleMap[profile.id] || 'member';
      const wsMembership = membershipMap[profile.id];
      const role = mapRole(wsRole);
      const status = wsMembership ? mapMembershipStatus(wsMembership.status) : 'active';
      const notes = wsMembership?.plan_type ? `WS: ${wsMembership.plan_type}` : `WS role: ${wsRole}`;

      const exists = await client.query('SELECT 1 FROM tenant_memberships WHERE tenant_id = $1 AND user_id = $2', [tenantId, userId]);
      if (exists.rows.length > 0) continue;

      await client.query(
        'INSERT INTO tenant_memberships (id, user_id, tenant_id, role, status, notes, tags, joined_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [genId(), userId, tenantId, role, status, notes, JSON.stringify([wsRole]), profile.created_at]
      );
      counts.tenant_memberships++;
    }
    console.log(`  Created ${counts.tenant_memberships}`);

    // ─── 4. MEMBERSHIP PLANS ──────────────────────────────────────────────
    console.log('\n── Membership plans ──');
    const planNameToId = {};
    for (const plan of t.membership_plans.rows) {
      const mId = genId();
      const features = [];
      if (plan.description) {
        for (const line of plan.description.split('\n')) {
          const c = line.replace(/^[•\-*]\s*/, '').trim();
          if (c && !c.startsWith('⚠')) features.push(c);
        }
      }
      if (plan.sessions) features.push(`${plan.sessions} sessions`);
      if (plan.access_level) features.push(`Access: ${plan.access_level}`);
      if (!features.length) features.push(plan.title);

      await client.query(
        'INSERT INTO memberships (id, tenant_id, name, description, price, currency, "interval", features, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [mId, tenantId, plan.title, plan.description || plan.title, rmToCents(plan.price), 'MYR',
         (plan.duration_months || 1) >= 12 ? 'yearly' : 'monthly', features, plan.is_active ?? true, plan.created_at]
      );
      planNameToId[plan.title] = mId;
      counts.plans++;
    }
    console.log(`  Created ${counts.plans}`);

    // ─── 5. SUBSCRIPTIONS ─────────────────────────────────────────────────
    console.log('\n── Subscriptions ──');
    for (const m of t.memberships.rows) {
      const userId = wsToUserId[m.user_id];
      if (!userId || ['pending_approval', 'rejected'].includes(m.status)) continue;

      let membershipId = planNameToId[m.plan_type];
      if (!membershipId) {
        for (const [name, mid] of Object.entries(planNameToId)) {
          if (m.plan_type && name.toLowerCase().substring(0, 10).length > 0 && m.plan_type.toLowerCase().includes(name.toLowerCase().substring(0, 10))) {
            membershipId = mid; break;
          }
        }
      }
      if (!membershipId) continue;

      const validFrom = m.valid_from || m.created_at;
      const expiryDate = m.expiry_date || new Date(new Date(validFrom).getTime() + 30*24*60*60*1000).toISOString();

      await client.query(
        'INSERT INTO subscriptions (id, tenant_id, customer_id, membership_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
        [genId(), tenantId, userId, membershipId, m.status === 'active' ? 'active' : 'canceled',
         validFrom, expiryDate, m.status === 'expired', m.created_at]
      );
      counts.subs++;
    }
    console.log(`  Created ${counts.subs}`);

    // ─── 6. QR CODES ──────────────────────────────────────────────────────
    console.log('\n── QR codes ──');
    for (const p of t.profiles.rows) {
      if (!p.qr_code_url) continue;
      const userId = wsToUserId[p.id];
      if (!userId) continue;

      let code;
      try { const qd = JSON.parse(p.qr_code_url); code = qd.id || p.qr_code_url; }
      catch { code = p.qr_code_url; }

      await client.query(
        'INSERT INTO member_qr_codes (id, tenant_id, user_id, code, is_active, created_at) VALUES ($1, $2, $3, $4, true, $5)',
        [genId(), tenantId, userId, code, p.created_at]
      );
      counts.qr++;
    }
    console.log(`  Created ${counts.qr}`);

    // ─── 7. CHECK-INS (batch) ─────────────────────────────────────────────
    console.log('\n── Check-ins ──');
    const ciRows = t.check_ins.rows;
    for (let i = 0; i < ciRows.length; i += 50) {
      const batch = ciRows.slice(i, i + 50);
      const vals = []; const params = [];
      let pIdx = 1;
      for (const ci of batch) {
        const userId = wsToUserId[ci.member_id];
        if (!userId) continue;
        vals.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, 'manual', $${pIdx++})`);
        params.push(genId(), tenantId, userId, ci.checked_in_at);
      }
      if (vals.length > 0) {
        await client.query(
          `INSERT INTO check_ins (id, tenant_id, user_id, method, "timestamp") VALUES ${vals.join(',')}`,
          params
        );
        counts.checkins += vals.length;
      }
    }
    console.log(`  Created ${counts.checkins}`);

    // ─── 8. SESSION PACKAGES ──────────────────────────────────────────────
    console.log('\n── Session packages ──');
    const pkgTypeToId = {};
    const seenPkgs = new Set();
    for (const cl of t.clients.rows) {
      if (seenPkgs.has(cl.package_type)) continue;
      seenPkgs.add(cl.package_type);

      let price = 0;
      const related = t.payment_requests.rows.find(pr =>
        pr.user_id === cl.member_id && (pr.plan_type || '').toLowerCase().includes('coach'));
      if (related) price = rmToCents(related.amount);

      const pkgId = genId();
      await client.query(
        'INSERT INTO session_packages (id, tenant_id, name, description, session_count, price, currency, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())',
        [pkgId, tenantId, `Coach Training ${cl.package_type}`,
         `Coaching: ${cl.package_type} (${cl.total_sessions_purchased} sessions)`,
         cl.total_sessions_purchased, price, 'MYR']
      );
      pkgTypeToId[cl.package_type] = pkgId;
      counts.packages++;
    }
    console.log(`  Created ${counts.packages}`);

    // ─── 9. SESSION CREDITS ───────────────────────────────────────────────
    console.log('\n── Session credits ──');
    const clientToCreditId = {};
    for (const cl of t.clients.rows) {
      const userId = cl.member_id ? wsToUserId[cl.member_id] : null;
      if (!userId) continue;
      const pkgId = pkgTypeToId[cl.package_type];
      if (!pkgId) continue;

      const used = t.training_logs.rows.filter(tl => tl.client_id === cl.id).length;
      const creditId = genId();

      await client.query(
        'INSERT INTO session_credits (id, tenant_id, user_id, package_id, total_sessions, used_sessions, expires_at, purchased_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [creditId, tenantId, userId, pkgId,
         cl.total_sessions_purchased + (cl.carry_over_sessions || 0), used,
         cl.expiry_date || null, cl.created_at]
      );
      clientToCreditId[cl.id] = creditId;
      counts.credits++;
    }
    console.log(`  Created ${counts.credits}`);

    // ─── 10. SESSION LOGS (batch) ─────────────────────────────────────────
    console.log('\n── Session logs ──');
    for (let i = 0; i < t.training_logs.rows.length; i += 50) {
      const batch = t.training_logs.rows.slice(i, i + 50);
      for (const tl of batch) {
        const clRec = clientMap[tl.client_id];
        const clientUserId = clRec?.member_id ? wsToUserId[clRec.member_id] : null;
        const coachUserId = wsToUserId[tl.coach_id];
        if (!clientUserId || !coachUserId) continue;

        const creditId = clientToCreditId[tl.client_id] || null;
        let sessionType = 'personal_training';
        if (tl.training_type === 'group') sessionType = 'group_class';

        await client.query(
          'INSERT INTO session_logs (id, tenant_id, client_id, coach_id, credit_id, session_type, notes, exercises, metrics, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
          [genId(), tenantId, clientUserId, coachUserId, creditId, sessionType,
           tl.notes || null, JSON.stringify(tl.exercises || []),
           tl.weight_kg ? JSON.stringify({ weight_kg: tl.weight_kg }) : null,
           tl.date || tl.created_at]
        );
        counts.logs++;
      }
    }
    console.log(`  Created ${counts.logs}`);

    // ─── 11. PAYMENTS ─────────────────────────────────────────────────────
    console.log('\n── Payments ──');
    for (const pr of t.payment_requests.rows) {
      const userId = wsToUserId[pr.user_id];
      if (!userId) continue;

      const status = pr.status === 'approved' ? 'succeeded' : (pr.status === 'pending' ? 'pending' : 'failed');
      await client.query(
        'INSERT INTO payments (id, tenant_id, customer_id, amount, currency, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
        [genId(), tenantId, userId, rmToCents(pr.amount), 'MYR', status,
         JSON.stringify({ ws_order_id: pr.order_id, ws_plan_type: pr.plan_type, ws_receipt_url: pr.receipt_url, ws_payer_name: pr.payer_name, migrated_from: 'ws-fitness-lovable' }),
         pr.payment_date || pr.created_at]
      );
      counts.payments++;
    }
    console.log(`  Created ${counts.payments}`);

    await client.query('COMMIT');

    console.log('\n══════════════════════════════════════════');
    console.log('  MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════');
    console.log(`  Users:              ${counts.users} new + ${counts.existing} existing`);
    console.log(`  Skipped (no email): ${counts.skipped}`);
    console.log(`  Tenant memberships: ${counts.tenant_memberships}`);
    console.log(`  Membership plans:   ${counts.plans}`);
    console.log(`  Subscriptions:      ${counts.subs}`);
    console.log(`  QR codes:           ${counts.qr}`);
    console.log(`  Check-ins:          ${counts.checkins}`);
    console.log(`  Session packages:   ${counts.packages}`);
    console.log(`  Session credits:    ${counts.credits}`);
    console.log(`  Session logs:       ${counts.logs}`);
    console.log(`  Payments:           ${counts.payments}`);
    console.log('══════════════════════════════════════════');
    console.log('\n⚠ Users must reset passwords (no hashes migrated)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ MIGRATION FAILED (rolled back):', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(() => process.exit(1));
