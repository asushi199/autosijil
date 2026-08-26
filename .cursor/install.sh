#!/usr/bin/env bash
# Cloud Agent install: system packages, Supabase CLI, node dependencies, the local
# Supabase workspace, and a one-time pre-pull of the Supabase Docker images so that
# fresh agents (booting from the environment build snapshot) start quickly.
#
# Must be idempotent and must terminate — no long-running processes live here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPABASE_CLI_VERSION="2.115.0"
SUPA_DIR="$HOME/supabase-local"

echo "==> System packages"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
# Resolve any half-configured conffile prompts (e.g. fuse3) without interaction.
sudo dpkg --configure -a --force-confold >/dev/null 2>&1 || true
sudo apt-get install -y -qq \
  docker.io fuse-overlayfs iptables uidmap poppler-utils curl ca-certificates >/dev/null

echo "==> Supabase CLI ${SUPABASE_CLI_VERSION}"
if [ "$(supabase --version 2>/dev/null || true)" != "${SUPABASE_CLI_VERSION}" ]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/supabase.deb" \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_amd64.deb"
  sudo dpkg -i "$tmp/supabase.deb" >/dev/null
  rm -rf "$tmp"
fi

echo "==> Node dependencies"
cd "$REPO_ROOT"
npm ci

echo "==> Local Supabase workspace at ${SUPA_DIR}"
mkdir -p "$SUPA_DIR"
if [ ! -f "$SUPA_DIR/supabase/config.toml" ]; then
  ( cd "$SUPA_DIR" && supabase init --force >/dev/null )
fi
# Expose new public tables to the Data API roles (matches hosted Supabase, which the
# app relies on via the service_role key) and disable services this app never uses.
python3 - "$SUPA_DIR/supabase/config.toml" <<'PY'
import re, sys
path = sys.argv[1]
s = open(path).read()
s = s.replace("# auto_expose_new_tables = true", "auto_expose_new_tables = true")
for section in ("realtime", "edge_runtime", "analytics"):
    s = re.sub(r'(\[' + re.escape(section) + r'\]\nenabled = )true', r'\1false', s, count=1)
open(path, "w").write(s)
PY

echo "==> Pre-pulling Supabase Docker images (one-time)"
bash "$REPO_ROOT/.cursor/docker-up.sh"
( cd "$SUPA_DIR" && timeout 900 supabase start >/dev/null 2>&1 || true )
( cd "$SUPA_DIR" && supabase stop >/dev/null 2>&1 || true )

echo "==> install.sh complete"
