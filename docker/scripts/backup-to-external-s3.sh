#!/bin/bash
set -euo pipefail

EXTERNAL_ENDPOINT="${BACKUP_S3_ENDPOINT}"
EXTERNAL_KEY="${BACKUP_S3_ACCESS_KEY}"
EXTERNAL_SECRET="${BACKUP_S3_SECRET_KEY}"
EXTERNAL_BUCKET="${BACKUP_S3_BUCKET}"
EXTERNAL_REGION="${BACKUP_S3_REGION:-us-east-1}"

if [ "$BACKUP_S3_ENABLED" != "true" ]; then
  echo "$(date): External backup disabled, skipping."
  exit 0
fi

if [ -z "$EXTERNAL_ENDPOINT" ] || [ -z "$EXTERNAL_KEY" ] || [ -z "$EXTERNAL_SECRET" ] || [ -z "$EXTERNAL_BUCKET" ]; then
  echo "$(date): ERROR: External S3 credentials not configured."
  exit 1
fi

LOCAL_ALIAS="myminio"
EXTERNAL_ALIAS="external"

mc alias set "$EXTERNAL_ALIAS" "$EXTERNAL_ENDPOINT" "$EXTERNAL_KEY" "$EXTERNAL_SECRET" \
  --api s3v4

SYNC_COUNT=$(mc mirror --overwrite --remove --json \
  "${LOCAL_ALIAS}/dms-storage" "${EXTERNAL_ALIAS}/${EXTERNAL_BUCKET}" 2>&1 | wc -l)

echo "$(date): External backup sync completed. ${SYNC_COUNT} operations processed."
