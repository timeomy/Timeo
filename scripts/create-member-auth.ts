import postgres, { type Sql } from "postgres";
import { randomBytes } from "crypto";

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(21);
  let id = '';
  for (let i = 0; i < 21; i++) id += chars[bytes[i] % chars.length];
  return id;
}

const WS_FITNESS_TENANT_ID = "7Kw87VeAnXg4qDXi6UTbu";
const DEFAULT_PASSWORD = "WsGym2026";
const BCRYPT_ROUNDS = 12;
const DRY_RUN = process.argv.includes("--dry-run");

interface MemberRow {
  id: string;
  name: string;
  email: string;
  auth_id: string | null;
}

interface MigrationSummary {
  total: number;
  processed: number;
  usersInserted: number;
  accountsInserted: number;
  usersUpdated: number;
  skippedConflicts: number;
  errors: number;
}

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function findMembersNeedingCredentials(sql: Sql): Promise<MemberRow[]> {
  return sql<MemberRow[]>`
    select
      u.id,
      u.name,
      lower(trim(u.email)) as email,
      u.auth_id
    from tenant_memberships tm
    inner join users u on u.id = tm.user_id
    where tm.tenant_id = ${WS_FITNESS_TENANT_ID}
      and tm.status = 'active'
      and u.email is not null
      and trim(u.email) <> ''
      and not exists (
        select 1
        from account a
        where a.provider_id = 'credential'
          and (
            a.user_id = u.id
            or (u.auth_id is not null and a.user_id = u.auth_id)
          )
      )
    order by u.created_at asc, u.id asc
  `;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set in environment or .env file");
  }

  const sql = postgres(databaseUrl, { max: 5 });

  console.log("======================================================");
  console.log("  WS Fitness Better Auth Credential Migration");
  console.log("======================================================");
  if (DRY_RUN) {
    console.log("\n[DRY RUN] No data will be written\n");
  }

  try {
    const members = await findMembersNeedingCredentials(sql);
    console.log(
      `Found ${members.length} active WS Fitness members without credentials.`
    );

    if (DRY_RUN) {
      console.log(`Dry run count: ${members.length}`);
      return;
    }

    const summary: MigrationSummary = {
      total: members.length,
      processed: 0,
      usersInserted: 0,
      accountsInserted: 0,
      usersUpdated: 0,
      skippedConflicts: 0,
      errors: 0,
    };

    console.log("\nCreating Better Auth credentials...");

    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      const prefix = `[${index + 1}/${members.length}] ${member.id} (${member.email})`;

      try {
        const outcome = await sql.begin(async (tx) => {
          const insertedAuthUsers = await tx<{ id: string }[]>`
            insert into "user" (id, name, email, email_verified)
            values (${member.id}, ${member.name}, ${member.email}, false)
            on conflict do nothing
            returning id
          `;

          const authUserById = await tx<{ exists: boolean }[]>`
            select exists(
              select 1 from "user" where id = ${member.id}
            ) as exists
          `;

          if (!authUserById[0]?.exists) {
            return {
              skippedConflict: true,
              insertedAuthUsers: insertedAuthUsers.length,
              insertedAccounts: 0,
              updatedUsers: 0,
            };
          }

          const passwordHash = await hashPassword(DEFAULT_PASSWORD);

          const insertedAccounts = await tx<{ id: string }[]>`
            insert into account (id, account_id, provider_id, user_id, password)
            values (
              ${generateId()},
              ${member.id},
              'credential',
              ${member.id},
              ${passwordHash}
            )
            on conflict do nothing
            returning id
          `;

          const updatedUsers = await tx<{ id: string }[]>`
            update users
            set auth_id = ${member.id},
                force_password_reset = true,
                updated_at = now()
            where id = ${member.id}
            returning id
          `;

          return {
            skippedConflict: false,
            insertedAuthUsers: insertedAuthUsers.length,
            insertedAccounts: insertedAccounts.length,
            updatedUsers: updatedUsers.length,
          };
        });

        summary.processed += 1;
        summary.usersInserted += outcome.insertedAuthUsers;
        summary.accountsInserted += outcome.insertedAccounts;
        summary.usersUpdated += outcome.updatedUsers;

        if (outcome.skippedConflict) {
          summary.skippedConflicts += 1;
          console.log(`${prefix} -> skipped (auth user ID not created/found)`);
          continue;
        }

        console.log(
          `${prefix} -> ok (auth:${outcome.insertedAuthUsers > 0 ? "created" : "exists"}, account:${outcome.insertedAccounts > 0 ? "created" : "exists"})`
        );
      } catch (error) {
        summary.errors += 1;
        console.error(`${prefix} -> error`);
        console.error(error);
      }
    }

    console.log("\n======================================================");
    console.log("Migration Summary");
    console.log("======================================================");
    console.log(`Total members queued:      ${summary.total}`);
    console.log(`Processed members:         ${summary.processed}`);
    console.log(`Auth user rows inserted:   ${summary.usersInserted}`);
    console.log(`Credential accounts added: ${summary.accountsInserted}`);
    console.log(`Users rows updated:        ${summary.usersUpdated}`);
    console.log(`Skipped conflicts:         ${summary.skippedConflicts}`);
    console.log(`Errors:                    ${summary.errors}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("\nMigration failed:", error);
  process.exit(1);
});
