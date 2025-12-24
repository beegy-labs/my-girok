#!/bin/sh
set -e

echo "Starting web-admin nginx server"

# Start nginx (nginx-unprivileged handles pid file location internally)
exec nginx -g "daemon off;"
