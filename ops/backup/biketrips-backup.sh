#!/usr/bin/env bash
# Nightly backup of the BikeTrips production database and uploaded files.
# Installed as /usr/local/bin/biketrips-backup and run by biketrips-backup.timer.
set -euo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/biketrips}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-biketrips-postgres}"
POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE:-/etc/biketrips/postgres.env}"
STORAGE_PARENT="${STORAGE_PARENT:-/srv/biketrips}"
STORAGE_DIR_NAME="${STORAGE_DIR_NAME:-storage}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
KEEP_MONTHLY="${KEEP_MONTHLY:-12}"

db_user="$(sed -n 's/^POSTGRES_USER=//p' "$POSTGRES_ENV_FILE" | tr -d '"')"
db_name="$(sed -n 's/^POSTGRES_DB=//p' "$POSTGRES_ENV_FILE" | tr -d '"')"
stamp="$(date -u +%Y-%m-%dT%H%M%SZ)"

mkdir -p "$BACKUP_ROOT"/{daily,weekly,monthly}
work="$(mktemp -d "$BACKUP_ROOT/.in-progress-XXXXXX")"
trap 'rm -rf "$work"' EXIT

# Custom-format dump: compressed, and restorable table by table with pg_restore.
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$db_user" -d "$db_name" --format=custom --compress=9 \
  > "$work/database.dump"
# Fail now rather than at restore time if the archive is unreadable.
docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$work/database.dump" > /dev/null

tar -C "$STORAGE_PARENT" -czf "$work/storage.tar.gz" "$STORAGE_DIR_NAME"
(cd "$work" && sha256sum database.dump storage.tar.gz > SHA256SUMS)

target="$BACKUP_ROOT/daily/$stamp"
mv "$work" "$target"
trap - EXIT

# Promote copies (hard links, no extra space) for longer retention.
if [ "$(date -u +%u)" = 7 ]; then cp -al "$target" "$BACKUP_ROOT/weekly/$stamp"; fi
if [ "$(date -u +%d)" = 01 ]; then cp -al "$target" "$BACKUP_ROOT/monthly/$stamp"; fi

prune() {
  local dir="$1" keep="$2"
  find "$dir" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +"$((keep + 1))" | xargs -r rm -rf
}
prune "$BACKUP_ROOT/daily" "$KEEP_DAILY"
prune "$BACKUP_ROOT/weekly" "$KEEP_WEEKLY"
prune "$BACKUP_ROOT/monthly" "$KEEP_MONTHLY"

echo "Backup written to $target ($(du -sh "$target" | cut -f1))"
