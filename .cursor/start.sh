#!/usr/bin/env bash
# Cloud Agent start: bring Docker and the local Supabase stack up on every boot,
# apply the database schema idempotently, and write .env.local. The Next.js dev
# server itself runs as a terminal (see .cursor/environment.json).
#
# Must tolerate restarts and return once services are ready.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPA_DIR="$HOME/supabase-local"
DB_CONTAINER="supabase_db_supabase-local"

bash "$REPO_ROOT/.cursor/docker-up.sh"

echo "==> Starting Supabase stack"
cd "$SUPA_DIR"
supabase start 2>&1 | tail -3 || { supabase stop >/dev/null 2>&1 || true; supabase start 2>&1 | tail -3; }

echo "==> Waiting for Postgres to accept connections"
for _ in $(seq 1 60); do
  docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

echo "==> Applying schema (idempotent) and reloading PostgREST"
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  < "$REPO_ROOT/supabase/migration.sql" >/dev/null
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
  -c "NOTIFY pgrst, 'reload schema';" >/dev/null

echo "==> Writing .env.local"
if [ ! -f "$REPO_ROOT/.env.local" ]; then
  # Defaults are the Supabase CLI's constant local demo keys; override from live
  # status when available in case the local JWT secret was customised.
  SB_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
  SB_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  eval "$(supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=' | sed 's/^/SB_/')" || true
  cat > "$REPO_ROOT/.env.local" <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SB_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SB_SERVICE_ROLE_KEY}
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=admin123
EUSTP_INTEGRATION_SECRET=local-dev-eustp-secret
EOF
fi

echo "==> start.sh complete — Supabase API on http://127.0.0.1:54321, Studio on http://127.0.0.1:54323"
