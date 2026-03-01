#!/bin/sh
set -euo pipefail

##
## Timeo Database Backup
##
## Env vars (required):
##   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, PGHOST
##
## Env vars (optional):
##   S3_BACKUP_BUCKET — if set, uploads backup to S3 after local dump
##   BACKUP_DIR — override backup directory (default: /backups)
##   RETENTION_DAYS — days to keep backups (default: 30)
##

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/timeo-${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup..."

# Run pg_dump and compress
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$PGHOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_FILE"; then

  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date -Iseconds)] Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date -Iseconds)] ERROR: pg_dump failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Upload to S3 if bucket is configured
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "[$(date -Iseconds)] Uploading to s3://${S3_BACKUP_BUCKET}/..."
  if aws s3 cp "$BACKUP_FILE" "s3://${S3_BACKUP_BUCKET}/timeo-${DATE}.sql.gz" --quiet; then
    echo "[$(date -Iseconds)] S3 upload complete"
  else
    echo "[$(date -Iseconds)] WARNING: S3 upload failed (local backup still available)"
  fi
fi

# Remove backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "timeo-*.sql.gz" -mtime +"${RETENTION_DAYS}" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date -Iseconds)] Cleaned up $DELETED backups older than ${RETENTION_DAYS} days"
fi

echo "[$(date -Iseconds)] Backup complete"
exit 0
