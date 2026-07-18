#!/usr/bin/env bash
# scripts/test-secret-guard.sh
# Verifies the failOnSecretLeak() Vite plugin (vite.config.ts, ships in Plan 03):
#   1. Aborts the build when a forbidden VITE_*SERVICE_ROLE* env var is set
#   2. Aborts the build when a required VITE_SUPABASE_PUBLISHABLE_KEY is missing
# Exit code 0 = guard works; non-zero = guard broken.
#
# This script is BLOCKING in CI for Plan 03 onward.

set -uo pipefail

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

fail() { echo "[secret-guard] FAIL — $1"; exit 1; }
pass() { echo "[secret-guard] PASS — $1"; }

# --- Test 1: Build must reject forbidden VITE_*SERVICE_ROLE* env -------------
echo "[secret-guard] Test 1: build with VITE_FAKE_SERVICE_ROLE_KEY=x must abort"
if VITE_FAKE_SERVICE_ROLE_KEY=x \
   VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://placeholder.supabase.co}" \
   VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-placeholder-key}" \
   VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-placeholder-id}" \
   npm run build > "$LOG" 2>&1; then
  cat "$LOG"
  fail "build succeeded with VITE_FAKE_SERVICE_ROLE_KEY set (plugin missing or broken)"
fi
if ! grep -qi 'failOnSecretLeak\|service_role\|dangerous.*env' "$LOG"; then
  cat "$LOG"
  fail "build aborted but error message does not reference failOnSecretLeak / service_role"
fi
pass "build correctly rejected forbidden VITE_*SERVICE_ROLE* env"

# --- Test 2: Build must reject missing required VITE_SUPABASE_PUBLISHABLE_KEY
echo "[secret-guard] Test 2: build without VITE_SUPABASE_PUBLISHABLE_KEY must abort"
unset VITE_SUPABASE_PUBLISHABLE_KEY
if VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://placeholder.supabase.co}" \
   VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID:-placeholder-id}" \
   npm run build > "$LOG" 2>&1; then
  cat "$LOG"
  fail "build succeeded without VITE_SUPABASE_PUBLISHABLE_KEY (plugin missing or broken)"
fi
if ! grep -qi 'required.*missing\|VITE_SUPABASE_PUBLISHABLE_KEY' "$LOG"; then
  cat "$LOG"
  fail "build aborted but error message does not mention missing required vars"
fi
pass "build correctly rejected missing required VITE_SUPABASE_PUBLISHABLE_KEY"

echo "[secret-guard] All checks passed."
