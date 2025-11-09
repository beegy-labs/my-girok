#!/bin/sh
set -e

# Replace environment variables in index.html
# This allows runtime configuration without rebuilding the image
echo "Replacing environment variables in index.html..."

# Default values if not set
RYBBIT_SITE_ID="${RYBBIT_SITE_ID:-default-site-id}"

# Use envsubst to replace variables in index.html
# Write to /tmp first (writable by nginx user), then move
envsubst '${RYBBIT_SITE_ID}' < /usr/share/nginx/html/index.html.template > /tmp/index.html
mv /tmp/index.html /usr/share/nginx/html/index.html

echo "Environment variables replaced successfully"
echo "RYBBIT_SITE_ID: ${RYBBIT_SITE_ID}"

# Start nginx
exec nginx -g "daemon off;"
