#!/bin/bash

################################################################################
# Staging Database Sync Script
#
# Purpose: Sync production database to staging with data masking
# Usage: ./sync-staging-db.sh
# Schedule: Run weekly (Sunday 3am recommended)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROD_HOST="${PROD_DB_HOST:-prod-db.example.com}"
PROD_PORT="${PROD_DB_PORT:-5432}"
PROD_USER="${PROD_DB_USER:-girok_user}"
PROD_DB="${PROD_DB_NAME:-girok_user}"

STAGING_HOST="${STAGING_DB_HOST:-staging-db.example.com}"
STAGING_PORT="${STAGING_DB_PORT:-5432}"
STAGING_USER="${STAGING_DB_USER:-staging_girok_user}"
STAGING_DB="${STAGING_DB_NAME:-staging_girok_user}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/prod_dump_${TIMESTAMP}.sql"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "${DUMP_FILE}"
}

trap cleanup EXIT

# Main process
main() {
    log_info "Starting staging database synchronization..."
    log_info "Timestamp: ${TIMESTAMP}"

    # 1. Check prerequisites
    log_info "Checking prerequisites..."
    command -v pg_dump >/dev/null 2>&1 || { log_error "pg_dump is required but not installed. Aborting."; exit 1; }
    command -v psql >/dev/null 2>&1 || { log_error "psql is required but not installed. Aborting."; exit 1; }

    # 2. Create backup directory
    mkdir -p "${BACKUP_DIR}"

    # 3. Backup current staging database
    log_info "Backing up current staging database..."
    pg_dump -h "${STAGING_HOST}" -p "${STAGING_PORT}" -U "${STAGING_USER}" "${STAGING_DB}" | \
        gzip > "${BACKUP_DIR}/staging_backup_${TIMESTAMP}.sql.gz" || {
        log_error "Failed to backup staging database"
        exit 1
    }

    # 4. Dump production database
    log_info "Dumping production database..."
    pg_dump -h "${PROD_HOST}" -p "${PROD_PORT}" -U "${PROD_USER}" "${PROD_DB}" \
        --no-owner --no-acl > "${DUMP_FILE}" || {
        log_error "Failed to dump production database"
        exit 1
    }

    log_info "Production dump completed: $(du -h ${DUMP_FILE} | cut -f1)"

    # 5. Drop and recreate staging database
    log_info "Recreating staging database..."
    psql -h "${STAGING_HOST}" -p "${STAGING_PORT}" -U "${STAGING_USER}" postgres <<EOF
DROP DATABASE IF EXISTS ${STAGING_DB};
CREATE DATABASE ${STAGING_DB};
EOF

    # 6. Restore to staging
    log_info "Restoring to staging database..."
    psql -h "${STAGING_HOST}" -p "${STAGING_PORT}" -U "${STAGING_USER}" "${STAGING_DB}" < "${DUMP_FILE}" || {
        log_error "Failed to restore to staging database"
        exit 1
    }

    # 7. Mask sensitive data
    log_info "Masking sensitive data..."
    psql -h "${STAGING_HOST}" -p "${STAGING_PORT}" -U "${STAGING_USER}" "${STAGING_DB}" <<EOF
-- Mask user emails
UPDATE users SET
    email = 'user_' || id || '@test.example.com',
    name = 'Test User ' || id
WHERE email NOT LIKE '%@example.com';

-- Mask OAuth provider IDs
UPDATE users SET
    "providerId" = 'masked_' || id
WHERE "providerId" IS NOT NULL;

-- Clear refresh tokens
UPDATE sessions SET
    "refreshToken" = md5(random()::text);

-- Mask OAuth client secrets (if applicable)
UPDATE "OAuthProviderConfig" SET
    "clientSecret" = 'masked_secret_' || id
WHERE "clientSecret" IS NOT NULL;
EOF

    log_info "Data masking completed"

    # 8. Verify
    log_info "Verifying staging database..."
    STAGING_COUNT=$(psql -h "${STAGING_HOST}" -p "${STAGING_PORT}" -U "${STAGING_USER}" "${STAGING_DB}" -t -c "SELECT COUNT(*) FROM users;")
    PROD_COUNT=$(psql -h "${PROD_HOST}" -p "${PROD_PORT}" -U "${PROD_USER}" "${PROD_DB}" -t -c "SELECT COUNT(*) FROM users;")

    log_info "Production users: ${PROD_COUNT}"
    log_info "Staging users: ${STAGING_COUNT}"

    if [ "${STAGING_COUNT}" -eq "${PROD_COUNT}" ]; then
        log_info "✅ User count matches!"
    else
        log_warn "⚠️  User count mismatch!"
    fi

    # 9. Cleanup old backups (keep last 7)
    log_info "Cleaning up old backups..."
    find "${BACKUP_DIR}" -name "staging_backup_*.sql.gz" -mtime +7 -delete

    log_info "✅ Staging database synchronization completed successfully!"
    log_info "Backup saved: ${BACKUP_DIR}/staging_backup_${TIMESTAMP}.sql.gz"
}

# Run main
main "$@"
