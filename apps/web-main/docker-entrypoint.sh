#!/bin/sh
set -e

# Get Rybbit Site ID from environment
RYBBIT_SITE_ID_VALUE="${RYBBIT_SITE_ID:-default-site-id}"

echo "Starting nginx with Rybbit Site ID: ${RYBBIT_SITE_ID_VALUE}"

# Replace RYBBIT_SITE_ID_VALUE in nginx config template
# This replaces ${RYBBIT_SITE_ID_VALUE} with the actual site-id value
envsubst '${RYBBIT_SITE_ID_VALUE}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g "daemon off;"
