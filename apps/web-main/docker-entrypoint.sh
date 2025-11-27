#!/bin/sh
set -e

# Get Rybbit Site ID from environment
export RYBBIT_SITE_ID_VALUE="${RYBBIT_SITE_ID:-default-site-id}"

echo "Starting nginx with Rybbit Site ID: ${RYBBIT_SITE_ID_VALUE}"

# Check if running in Kubernetes with ConfigMap mount
# K8s_CONFIG_MOUNTED env var is set by Helm deployment
if [ "${K8S_CONFIG_MOUNTED}" = "true" ]; then
    echo "Using Kubernetes ConfigMap (K8S_CONFIG_MOUNTED=true)"
elif [ -f /etc/nginx/conf.d/default.conf.template ]; then
    # Local/Docker Compose: Generate config from template
    echo "Generating nginx config from template"
    envsubst '${RYBBIT_SITE_ID_VALUE}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
    echo "Generated nginx config:"
    cat /etc/nginx/conf.d/default.conf | grep -A 2 "sub_filter" || true
else
    echo "Using existing nginx config"
fi

# Start nginx
exec nginx -g "daemon off;"
