#!/usr/bin/env bash
# Run from the generated staging directory on a disposable Linux Docker host.
set -euo pipefail
stage_id=$(basename "$PWD" | tr '[:upper:]' '[:lower:]')
if [[ ! $stage_id =~ ^serbisyogo-056-[a-z0-9]{6}$ ]] ||
   ! grep -Fxq "project_id = \"$stage_id\"" <(tr -d '\r' < supabase/config.toml) ||
   [[ -e supabase/.temp/project-ref || -e .env.local || -e .env.production.local ]]; then
  echo 'Use a fresh directory from prepare-staging-056.mjs.' >&2
  exit 1
fi
# These variables would override the generated local test configuration.
if env | cut -d= -f1 | grep -E '^(SUPABASE_|PG(HOST|SERVICE|PORT|DATABASE|PASSWORD)|DATABASE_URL$|NEXT_PUBLIC_|EXPO_PUBLIC_|TEST_|E2E_|SMTP_|GITHUB_ACTIONS$|DOCKER_(HOST|CONTEXT)$)' >/dev/null; then
  echo 'Start a clean staging shell without backend, Docker override or client settings.' >&2
  exit 1
fi
db="supabase_db_$stage_id"
if [[ $(docker context inspect --format '{{.Endpoints.docker.Host}}') != unix://* ]] ||
   docker container inspect "$db" >/dev/null 2>&1; then
  echo 'Use an unused staging directory and a local Docker engine.' >&2
  exit 1
fi
docker info >/dev/null
umask 077
mkdir -p .cache
npm ci
cli=./node_modules/.bin/supabase
sql() { docker exec -i "$db" psql -XAtq -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
manifest() { sql -v upgrade=yes < scripts/recovery-manifest.sql; }
local_node() { node --env-file=.cache/local-integration.env "$@"; }
export CI=1
export DO_NOT_TRACK=1
# Use the CLI's project network name, including for containers recreated by
# db reset and functions serve. Every CLI subprocess inherits this network.
export SUPABASE_NETWORK_ID="supabase_network_$stage_id"
if docker network inspect "$SUPABASE_NETWORK_ID" >/dev/null 2>&1; then
  echo 'Expected an unused staging network.' >&2
  exit 1
fi
edge_pid=
stop_edge() {
  if [[ -n "$edge_pid" ]]; then
    kill "$edge_pid" 2>/dev/null || true
    wait "$edge_pid" 2>/dev/null || true
    edge_pid=
  fi
}
cleanup() {
  stop_edge
  "$cli" stop >.cache/stop.log 2>&1
  if docker network inspect "$SUPABASE_NETWORK_ID" >/dev/null 2>&1; then
    docker network rm "$SUPABASE_NETWORK_ID" >/dev/null
  fi
}
start_stack() {
  if ! docker network inspect "$SUPABASE_NETWORK_ID" >/dev/null 2>&1; then
    docker network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 "$SUPABASE_NETWORK_ID" >/dev/null
  fi
  [[ $(docker network inspect --format '{{index .Options "com.docker.network.bridge.host_binding_ipv4"}}' "$SUPABASE_NETWORK_ID") == 127.0.0.1 ]]
  # Startup prints keys. Only the effective host bindings go to the console.
  "$cli" start --network-id "$SUPABASE_NETWORK_ID" --exclude vector >".cache/start-$1.log" 2>&1
  node scripts/check-staging-bindings.mjs
}
trap cleanup EXIT
start_stack upgrade
"$cli" db reset --local --version 202611170023 >.cache/reset-023.log 2>&1
node scripts/check-staging-bindings.mjs
[[ $(sql -c 'select max(version) from supabase_migrations.schema_migrations') == 202611170023 ]]
node scripts/prepare-local-integration.mjs
local_node scripts/seed-demo.mjs
manifest > .cache/before.tsv
"$cli" db push --local --dry-run
"$cli" db push --local --yes
[[ $(sql -c "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations where version > '202611170023'") == 202611190024,202611190025 ]]
manifest > .cache/after.tsv
diff -u .cache/before.tsv .cache/after.tsv
echo 'Schema 023 to 025 preserved the historical staging rows.'

"$cli" db reset --local >.cache/reset-tests.log 2>&1
node scripts/check-staging-bindings.mjs
"$cli" test db --local
node scripts/generate-types.mjs
npm run typecheck
npx --no-install playwright install --with-deps chromium
for trial in 1 2; do
  for viewport in desktop mobile; do
    tag="$viewport-$trial"
    "$cli" stop >".cache/pre-$tag-stop.log" 2>&1
    start_stack "$tag"
    "$cli" db reset --local >".cache/reset-$tag.log" 2>&1
    node scripts/check-staging-bindings.mjs
    node scripts/prepare-local-integration.mjs
    "$cli" functions serve --env-file .cache/edge-test.env >".cache/edge-$tag.log" 2>&1 &
    edge_pid=$!
    local_node scripts/wait-for-local-edge.mjs
    node scripts/check-staging-bindings.mjs
    local_node scripts/seed-demo.mjs
    local_node node_modules/@playwright/test/cli.js test tests/e2e/workflows.spec.ts \
      --project="$viewport" --grep-invert 'an actual test APK' --reporter=line --retries=0 --trace=off \
      | tee ".cache/workflows-$tag.log"
    stop_edge
  done
done
