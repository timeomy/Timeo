/**
 * Production migration runner
 * Runs all Drizzle migration SQL files against PostgreSQL.
 * Uses the postgres npm package directly (no drizzle-kit needed).
 * Designed to run before the API server starts in Docker.
 */
import postgres from "postgres";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set — skipping migrations");
  process.exit(0);
}

const MIGRATIONS_DIR = join(process.cwd(), "packages", "db", "drizzle");
const JOURNAL_PATH = join(MIGRATIONS_DIR, "meta", "_journal.json");

async function runMigrations() {
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    // Create the drizzle migrations tracking table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `;

    // Get already-applied migrations
    const applied = await sql`SELECT hash FROM "__drizzle_migrations"`;
    const appliedHashes = new Set(applied.map((r) => r.hash));

    // Read journal to get ordered migrations
    if (!existsSync(JOURNAL_PATH)) {
      console.log("No migration journal found at", JOURNAL_PATH);
      await sql.end();
      return;
    }

    const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8"));
    const entries = journal.entries || [];

    let migrationsRun = 0;

    for (const entry of entries) {
      const tag = entry.tag;
      if (appliedHashes.has(tag)) {
        console.log(`  ✓ ${tag} (already applied)`);
        continue;
      }

      const sqlFile = join(MIGRATIONS_DIR, `${tag}.sql`);
      if (!existsSync(sqlFile)) {
        console.error(`  ✗ ${tag} — SQL file not found: ${sqlFile}`);
        continue;
      }

      const content = readFileSync(sqlFile, "utf8");
      // Split on Drizzle's statement breakpoint marker
      const statements = content
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`  → Running ${tag} (${statements.length} statements)...`);

      for (const stmt of statements) {
        try {
          await sql.unsafe(stmt);
        } catch (err) {
          // Skip "already exists" errors for idempotency
          if (
            err.message?.includes("already exists") ||
            err.message?.includes("duplicate key")
          ) {
            console.log(`    (skipped: ${err.message.substring(0, 80)})`);
          } else {
            throw err;
          }
        }
      }

      // Record the migration as applied
      await sql`
        INSERT INTO "__drizzle_migrations" (hash, created_at)
        VALUES (${tag}, ${Date.now()})
      `;

      migrationsRun++;
      console.log(`  ✓ ${tag} applied`);
    }

    if (migrationsRun === 0) {
      console.log("All migrations already applied.");
    } else {
      console.log(`${migrationsRun} migration(s) applied successfully.`);
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

console.log("Running database migrations...");
await runMigrations();
console.log("Migrations complete.");
