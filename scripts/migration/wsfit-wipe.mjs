#!/usr/bin/env node

import process from "node:process";
import postgres from "postgres";

const WSFITNESS_TENANT_ID = "7Kw87VeAnXg4qDXi6UTbu";

const CONFIRM_FLAG = "--confirm";
const SHOULD_CONFIRM = process.argv.includes(CONFIRM_FLAG);
const DATABASE_URL = process.env.DATABASE_URL;

const WIPE_STEPS = [
  {
    key: "invoice_items",
    tables: ["invoice_items", "invoices"],
    whereClause:
      '"invoice_id" IN (SELECT "id" FROM "invoices" WHERE "tenant_id" = $1)',
  },
  {
    key: "check_ins",
    tables: ["check_ins"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "gate_events",
    tables: ["gate_events"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "access_logs",
    tables: ["access_logs"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "turnstile_events",
    tables: ["turnstile_events"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "turnstile_face_logs",
    tables: ["turnstile_face_logs"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "member_qr_codes",
    tables: ["member_qr_codes"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "session_logs",
    tables: ["session_logs"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "session_credits",
    tables: ["session_credits"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "face_registrations",
    tables: ["face_registrations"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "subscriptions",
    tables: ["subscriptions"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "payments",
    tables: ["payments"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "invoices",
    tables: ["invoices"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "payment_requests",
    tables: ["payment_requests"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "files",
    tables: ["files"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "audit_logs",
    tables: ["audit_logs"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "turnstile_devices",
    tables: ["turnstile_devices"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "memberships",
    tables: ["memberships"],
    whereClause: '"tenant_id" = $1',
  },
  {
    key: "tenant_memberships",
    tables: ["tenant_memberships"],
    whereClause: '"tenant_id" = $1',
  },
];

function assertIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Unsafe identifier: ${value}`);
  }
}

function quoteIdentifier(value) {
  assertIdentifier(value);
  return `"${value}"`;
}

async function tableExists(sql, tableName) {
  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(exists);
}

async function deleteWithWhere(sql, tableName, whereClause, tenantId) {
  assertIdentifier(tableName);
  const query = `
    WITH deleted AS (
      DELETE FROM ${quoteIdentifier(tableName)}
      WHERE ${whereClause}
      RETURNING 1
    )
    SELECT COUNT(*)::int AS count
    FROM deleted
  `;

  const [row] = await sql.unsafe(query, [tenantId]);
  return Number(row?.count ?? 0);
}

async function getTenantUserIds(sql, tenantId) {
  const rows = await sql`
    SELECT DISTINCT user_id
    FROM tenant_memberships
    WHERE tenant_id = ${tenantId}
  `;

  return rows
    .map((row) => row.user_id)
    .filter((value) => typeof value === "string" && value.length > 0);
}

async function getUserReferenceColumns(sql) {
  const rows = await sql`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
      AND tc.table_name <> 'tenant_memberships'
    ORDER BY tc.table_name, kcu.column_name
  `;

  return rows.map((row) => ({
    tableName: row.table_name,
    columnName: row.column_name,
  }));
}

async function deleteScopedUsers(sql, tenantUserIds, summary) {
  if (!tenantUserIds.length) {
    summary.users = {
      attempted: 0,
      deleted: 0,
      skipped: 0,
      reason: "no scoped users found",
    };
    return;
  }

  const references = await getUserReferenceColumns(sql);
  const safetyChecks = references.map(({ tableName, columnName }, index) => {
    assertIdentifier(tableName);
    assertIdentifier(columnName);
    return `
      NOT EXISTS (
        SELECT 1
        FROM ${quoteIdentifier(tableName)} ref_${index}
        WHERE ref_${index}.${quoteIdentifier(columnName)} = u.id
      )
    `;
  });

  const safetyWhere = safetyChecks.length ? safetyChecks.join(" AND ") : "TRUE";

  const query = `
    WITH candidate_users AS (
      SELECT UNNEST($1::text[]) AS id
    ),
    safe_users AS (
      SELECT u.id
      FROM users u
      INNER JOIN candidate_users c ON c.id = u.id
      WHERE u.auth_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM tenant_memberships tm
          WHERE tm.user_id = u.id
        )
        AND ${safetyWhere}
    ),
    deleted AS (
      DELETE FROM users
      WHERE id IN (SELECT id FROM safe_users)
      RETURNING id
    )
    SELECT
      (SELECT COUNT(*)::int FROM safe_users) AS safe_count,
      (SELECT COUNT(*)::int FROM deleted) AS deleted_count
  `;

  const [row] = await sql.unsafe(query, [tenantUserIds]);

  const deleted = Number(row?.deleted_count ?? 0);
  const safeCount = Number(row?.safe_count ?? 0);
  const attempted = tenantUserIds.length;

  summary.users = {
    attempted,
    deleted,
    skipped: attempted - deleted,
    candidatesWithoutBlockingRefs: safeCount,
  };
}

async function main() {
  if (!SHOULD_CONFIRM) {
    console.error(
      [
        "Refusing to wipe data without explicit confirmation.",
        `Run again with ${CONFIRM_FLAG} to proceed.`,
        `Target tenant: ${WSFITNESS_TENANT_ID}`,
      ].join("\n"),
    );
    process.exit(1);
  }

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
      ? undefined
      : "prefer",
  });

  const summary = {
    tenantId: WSFITNESS_TENANT_ID,
    deleted: {},
    skippedTables: [],
  };

  try {
    await sql.begin(async (tx) => {
      const tenantUserIds = await getTenantUserIds(tx, WSFITNESS_TENANT_ID);

      for (const step of WIPE_STEPS) {
        const missingTable = [];

        for (const tableName of step.tables) {
          const exists = await tableExists(tx, tableName);
          if (!exists) {
            missingTable.push(tableName);
          }
        }

        if (missingTable.length > 0) {
          summary.skippedTables.push({
            key: step.key,
            missing: missingTable,
          });
          summary.deleted[step.key] = 0;
          continue;
        }

        const deletedCount = await deleteWithWhere(
          tx,
          step.tables[0],
          step.whereClause,
          WSFITNESS_TENANT_ID,
        );
        summary.deleted[step.key] = deletedCount;
      }

      await deleteScopedUsers(tx, tenantUserIds, summary.deleted);
    });

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[wsfit-wipe] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
