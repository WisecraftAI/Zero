#!/usr/bin/env bash
set -euo pipefail

mkdir -p /app/artifacts /app/logs

DROP_USER="node"
if id pwuser >/dev/null 2>&1; then
  DROP_USER="pwuser"
fi

chown -R "$DROP_USER:$DROP_USER" /app/artifacts /app/logs 2>/dev/null || true

if [[ "$(id -u)" -eq 0 ]] && command -v runuser >/dev/null 2>&1; then
  exec runuser -u "$DROP_USER" -- "$@"
fi

exec "$@"
