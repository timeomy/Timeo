#!/bin/sh
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/timeo_${DATE}.sql.gz"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)..."

# Run pg_dump and compress
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$PGHOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  --format=custom \
  --compress=9 \
  --verbose \
  | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "timeo_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "Removed backups older than ${RETENTION_DAYS} days"

echo "Backup complete at $(date)"
