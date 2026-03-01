#!/bin/sh
set -euo pipefail

##
## Timeo Database Restore
##
## Usage:
##   ./restore.sh /backups/timeo-2026-03-01.sql.gz
##
## Env vars (required):
##   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, PGHOST
##
## WARNING: This drops and recreates the database. All existing data will be lost.
##

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Example: $0 /backups/timeo-2026-03-01.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "=== Timeo Database Restore ==="
echo ""
echo "  Backup file: $BACKUP_FILE"
echo "  Target host: $PGHOST"
echo "  Target db:   $POSTGRES_DB"
echo ""
echo "WARNING: This will DROP and RECREATE the '$POSTGRES_DB' database."
echo "All existing data will be lost."
echo ""
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "[$(date -Iseconds)] Terminating active connections..."
psql -h "$PGHOST" -U "$POSTGRES_USER" -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

echo "[$(date -Iseconds)] Dropping database '$POSTGRES_DB'..."
psql -h "$PGHOST" -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"

echo "[$(date -Iseconds)] Creating database '$POSTGRES_DB'..."
psql -h "$PGHOST" -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"

echo "[$(date -Iseconds)] Restoring from backup..."
if gunzip -c "$BACKUP_FILE" | psql -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --quiet; then
  echo "[$(date -Iseconds)] Restore complete"
else
  echo "[$(date -Iseconds)] ERROR: Restore failed"
  exit 1
fi

# Re-run init.sql to restore RLS helper functions
if [ -f /docker-entrypoint-initdb.d/init.sql ]; then
  echo "[$(date -Iseconds)] Re-applying RLS helper functions..."
  psql -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/init.sql
fi

# Verify
TABLE_COUNT=$(psql -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "[$(date -Iseconds)] Verification: ${TABLE_COUNT} tables in restored database"
echo ""
echo "=== Restore complete ==="
exit 0
