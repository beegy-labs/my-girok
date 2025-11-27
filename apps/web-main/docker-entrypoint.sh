#!/bin/sh
set -e

# Get Rybbit Site ID from environment
export RYBBIT_SITE_ID_VALUE="${RYBBIT_SITE_ID:-default-site-id}"

echo "Starting nginx with Rybbit Site ID: ${RYBBIT_SITE_ID_VALUE}"

# Check if config is already mounted by Kubernetes (Helm deployment)
# In K8s, ConfigMap is mounted as read-only at /etc/nginx/conf.d/default.conf
if [ -f /etc/nginx/conf.d/default.conf ] && [ ! -w /etc/nginx/conf.d/default.conf ]; then
    echo "Using Kubernetes ConfigMap (read-only mount)"
else
    # Local/Docker Compose: Generate config from template
    if [ -f /etc/nginx/conf.d/default.conf.template ]; then
        echo "Generating nginx config from template"
        envsubst '${RYBBIT_SITE_ID_VALUE}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
        echo "Generated nginx config:"
        cat /etc/nginx/conf.d/default.conf | grep -A 2 "sub_filter" || true
    fi
fi

# Start nginx
exec nginx -g "daemon off;"
