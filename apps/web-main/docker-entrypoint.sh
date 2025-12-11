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
    # Note: For non-root nginx, we write to a tmp location first
    echo "Generating nginx config from template"
    envsubst '${RYBBIT_SITE_ID_VALUE}' < /etc/nginx/conf.d/default.conf.template > /tmp/default.conf
    cp /tmp/default.conf /etc/nginx/conf.d/default.conf 2>/dev/null || \
        echo "Warning: Could not update nginx config (read-only), using template values"
    echo "Generated nginx config:"
    cat /etc/nginx/conf.d/default.conf | grep -A 2 "sub_filter" || true
else
    echo "Using existing nginx config"
fi

# Start nginx (nginx-unprivileged handles pid file location internally)
exec nginx -g "daemon off;"
