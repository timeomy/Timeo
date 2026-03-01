# Convex → PostgreSQL Data Migration

Migrates all data from the Convex backend to the new PostgreSQL database.

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16 running with schema already migrated (`pnpm --filter @timeo/db db:migrate`)
- Convex deployment access (deploy key)

## Environment Variables

```bash
# Convex source
CONVEX_URL=https://mild-gnat-567.convex.cloud
CONVEX_DEPLOY_KEY=<your-convex-deploy-key>

# PostgreSQL target
DATABASE_URL=postgresql://timeo:timeo@localhost:5432/timeo
```

## Steps

### 1. Install dependencies

```bash
cd infra/migration
pnpm install
```

### 2. Export from Convex

Exports all tables to `./data/convex-export/` as JSON files.

```bash
pnpm run export
```

### 3. Transform data

Converts Convex format → PostgreSQL format:
- `_id` → nanoid(21) text primary keys
- `_creationTime` (epoch ms) → ISO timestamps
- camelCase → snake_case field names
- Float money values → integer cents (×100)
- FK references → mapped nanoid IDs (consistent across all tables)

Output goes to `./data/pg-import/`.

```bash
pnpm run transform
```

### 4. Import into PostgreSQL

Inserts data in FK dependency order. Uses `ON CONFLICT DO NOTHING` for idempotent re-runs.

```bash
pnpm run import
```

### 5. Verify

Compares row counts, checks FK integrity, and spot-checks data quality.

```bash
pnpm run verify
```

### Run all steps

```bash
pnpm run migrate
```

## Data Directory Structure

```
data/
  convex-export/         # Raw JSON from Convex
    users.json
    tenants.json
    ...
    _manifest.json       # Export metadata
  pg-import/             # Transformed for PostgreSQL
    users.json
    tenants.json
    ...
    _id_map.json         # Convex ID → nanoid mapping
    _manifest.json       # Transform metadata
```

## Notes

- **Better Auth tables** (`user`, `session`, `account`, `verification`) are NOT migrated. Users will need to re-register or use the "forgot password" flow after migration.
- **Money values**: The transform script detects whether values are in dollars (float) or cents (integer). Values ≥ 100 and already integers are kept as-is; smaller values are multiplied by 100.
- **ID mapping**: A global mapping ensures FK references remain consistent. The `_id_map.json` file maps every Convex `_id` to its new nanoid.
- **Idempotent**: The import uses `ON CONFLICT (id) DO NOTHING`, so re-running is safe.
- **FK constraints**: Temporarily disabled during import (`session_replication_role = 'replica'`), then re-enabled and validated.

## Troubleshooting

- **"Table not found" during export**: The table may not exist in your Convex deployment. This is non-fatal; it will be skipped.
- **FK violations after import**: Check `_id_map.json` for missing references. A document might reference an ID that wasn't in the export.
- **Price sanity warnings**: Review the `services` and `products` tables. If prices look too low, the source data might already be in cents.
