#!/bin/sh
set -e

echo "Starting nginx..."

# Check if running in Kubernetes with ConfigMap mount
# K8S_CONFIG_MOUNTED env var is set by Helm deployment
if [ "${K8S_CONFIG_MOUNTED}" = "true" ]; then
    echo "Using Kubernetes ConfigMap (K8S_CONFIG_MOUNTED=true)"
else
    echo "Using existing nginx config"
fi

# Start nginx (nginx-unprivileged handles pid file location internally)
exec nginx -g "daemon off;"
