#!/usr/bin/env bash
set -euo pipefail

SOURCE_DB="/opt/mbti/backend/data/mbti.sqlite"
BACKUP_DIR="/opt/mbti/backups"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "${BACKUP_DIR}"
cp "${SOURCE_DB}" "${BACKUP_DIR}/mbti-${TIMESTAMP}.sqlite"

find "${BACKUP_DIR}" -type f -name "mbti-*.sqlite" -mtime +14 -delete

echo "Backup completed: ${BACKUP_DIR}/mbti-${TIMESTAMP}.sqlite"
