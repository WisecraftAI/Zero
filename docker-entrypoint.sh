#!/usr/bin/env bash
set -euo pipefail

mkdir -p /app/artifacts /app/logs
chown -R pwuser:pwuser /app/artifacts /app/logs

if [[ "$(id -u)" -eq 0 ]]; then
  exec runuser -u pwuser -- "$@"
fi

exec "$@"
