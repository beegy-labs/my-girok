#!/bin/sh
set -e

# Get Rybbit Site ID from environment
export RYBBIT_SITE_ID_VALUE="${RYBBIT_SITE_ID:-default-site-id}"

echo "Starting nginx with Rybbit Site ID: ${RYBBIT_SITE_ID_VALUE}"

# Replace RYBBIT_SITE_ID_VALUE in nginx config template
envsubst '${RYBBIT_SITE_ID_VALUE}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf | grep -A 2 "sub_filter"

# Start nginx
exec nginx -g "daemon off;"
