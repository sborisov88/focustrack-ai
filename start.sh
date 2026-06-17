#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PRODUCTION_URL="${FOCUSTRACK_PRODUCTION_URL:-https://focustrack-ai.vercel.app}"
SUPABASE_FUNCTIONS_URL="${FOCUSTRACK_SUPABASE_FUNCTIONS_URL:-https://wbxyyvvuqrhqtuywfeto.supabase.co/functions/v1}"
HEALTH_URL="${SUPABASE_FUNCTIONS_URL%/}/health"

echo "FocusTrack AI local start"
echo "Frontend: local Vite dev server"
echo "Backend: Supabase Cloud (PostgreSQL, Auth, RLS, Edge Functions)"
echo "Production frontend: ${PRODUCTION_URL}"
echo "Backend health: ${HEALTH_URL}"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm is required. Install it with corepack or your package manager." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Dependencies are missing; running pnpm install --frozen-lockfile."
  pnpm install --frozen-lockfile
fi

node - "$PRODUCTION_URL" "$HEALTH_URL" <<'NODE'
const [productionUrl, healthUrl] = process.argv.slice(2)

async function probe(url, expectedStatus) {
  const started = Date.now()
  const response = await fetch(url, { redirect: "manual" })
  const body = await response.text()

  if (response.status !== expectedStatus) {
    throw new Error(`${url} returned ${response.status}, expected ${expectedStatus}`)
  }

  return { status: response.status, bytes: body.length, ms: Date.now() - started }
}

try {
  const frontend = await probe(productionUrl, 200)
  console.log(
    `OK production frontend: ${frontend.status}, ${frontend.bytes} bytes, ${frontend.ms} ms`,
  )

  const health = await probe(healthUrl, 200)
  console.log(`OK Supabase health: ${health.status}, ${health.bytes} bytes, ${health.ms} ms`)
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
NODE

if [[ "${FOCUSTRACK_CHECK_ONLY:-0}" == "1" ]]; then
  echo "Check-only mode completed. Set FOCUSTRACK_CHECK_ONLY=0 or omit it to start Vite."
  exit 0
fi

echo "Starting local frontend at http://127.0.0.1:5173"
exec pnpm dev --host 127.0.0.1 "$@"
