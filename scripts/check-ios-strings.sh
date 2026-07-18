#!/usr/bin/env bash
# G-CRIT-03 gate — iOS Path C kill switch
#
# Verifies the production JS bundle ships ZERO anti-steering route-link patterns.
# Run after `npm run build` (which writes dist/assets/*.js).
# Exit 0 = clean (no patterns). Exit non-zero = leak detected.
#
# Cycle-level kill switch per ROADMAP §"Phase 3: Mobile Distribution & Launch"
# Success Criteria #1. Failing this blocks LAUNCH-06.
#
# ============================================================================
# AUTHORITATIVE DECISION REFERENCE
# ============================================================================
# The PATTERN below is the official narrowed gate locked 2026-05-14 (founder
# approved). DO NOT widen/soften without first updating:
#   .planning/ROADMAP.md §"Phase 3: Mobile Distribution & Launch" Success Criteria #1
#
# Why narrowed + refined (full rationale in ROADMAP SC#1 inline blocks):
#   - The original verbatim pattern from ROADMAP (planos|checkout|R$|Upgrade|Assinar)
#     CANNOT pass on a Vite-bundled SPA. Pricing UI strings live in shared React
#     components gated at RUNTIME by useIsIOSCapacitor(). Vite cannot tree-shake
#     branches whose predicate is Capacitor.getPlatform() === 'ios' (runtime).
#   - Apple Guideline 3.1.3(b) Multiplatform Services cares about user-visible
#     NAVIGATION to external purchase, not cosmetic strings in a minified bundle.
#   - 2026-05-14 refinement: the first-narrowed regex used `.*` which is greedy
#     and matched 200KB single-line spans, conflating reads (window.location.pathname)
#     with writes, and producing useless signal. The refined pattern requires:
#       (a) write semantics: window.location.(href|assign|replace) followed by = or (
#       (b) literal-string argument containing a pricing token (planos/checkout/
#           assinatura/asaas). Variable-URL writes (e.g., window.location.href =
#           checkoutUrl) are NOT caught by this bundle gate; they are defended
#           by per-component useIsIOSCapacitor() wrap + per-component unit tests.
#   - Tokens grepped (precise, no false positives on read/non-pricing writes):
#       * href="/planos|/checkout|/assinatura       JSX anchor tags (literal)
#       * window.location.(href|assign|replace) [=(] "<literal-with-pricing-token>"
#       * Browser.open                              Capacitor Browser plugin (any)
#   - TestFlight manual walkthrough is the user-visible-UI gate; this grep is
#     defense in depth that catches commits BEFORE they reach TestFlight.
# ============================================================================
#
# Filter out comments BEFORE counting matches (prevents self-invalidating grep
# gate — sourcemap comments inside the JS could otherwise contribute false hits).

set -euo pipefail

DIST_DIR="${DIST_DIR:-dist/assets}"
# PATTERN locked verbatim to ROADMAP §"Phase 3 SC#1" (2026-05-14 refined).
# P2 extension (2026-05-16): added react-router `navigate("/...")` and JSX
# `<Link to="/...">` literal-pricing-route writes — both are common ways to
# regress past the existing href= / window.location.* / Browser.open coverage.
# Variable-URL writes (navigate(checkoutUrl)) remain defended at runtime by
# the per-component useIsIOSCapacitor() wraps.
PATTERN='href=["'"'"']/(planos|checkout|assinatura)|window\.location\.(href|assign|replace)\s*[=(]\s*["'"'"'][^"'"'"']*(planos|checkout|assinatura|asaas)|Browser\.open|navigate\(["'"'"']/(planos|checkout|assinatura)|to=["'"'"']/(planos|checkout|assinatura)'

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: dist directory not found at $DIST_DIR" >&2
  echo "Run 'npm run build' first." >&2
  exit 2
fi

JS_FILES=$(find "$DIST_DIR" -name '*.js' -type f)
if [ -z "$JS_FILES" ]; then
  echo "ERROR: no .js files found in $DIST_DIR" >&2
  exit 2
fi

# Run strings on each .js, strip comment lines, then grep for the pattern.
COUNT=0
MATCHES=""
for f in $JS_FILES; do
  if command -v strings >/dev/null 2>&1; then
    CONTENT=$(strings "$f")
  else
    CONTENT=$(cat "$f")
  fi
  # Filter: drop lines starting with // (single-line JS comment) or # (defensive).
  FILTERED=$(printf '%s\n' "$CONTENT" | grep -v '^//' | grep -v '^#' || true)
  # Use grep -P for PCRE (?:...) non-capturing group support; fallback to -E.
  FILE_MATCHES=$(printf '%s\n' "$FILTERED" | grep -oP "$PATTERN" 2>/dev/null || \
                  printf '%s\n' "$FILTERED" | grep -oE "$PATTERN" || true)
  if [ -n "$FILE_MATCHES" ]; then
    FILE_COUNT=$(printf '%s\n' "$FILE_MATCHES" | wc -l)
    COUNT=$((COUNT + FILE_COUNT))
    MATCHES="$MATCHES\n  $f: $FILE_COUNT hits"
    UNIQUE_HITS=$(printf '%s\n' "$FILE_MATCHES" | sort -u | head -5 | tr '\n' ' ')
    MATCHES="$MATCHES    [tokens: $UNIQUE_HITS]"
  fi
done

if [ "$COUNT" -gt 0 ]; then
  echo "FAIL: G-CRIT-03 gate detected $COUNT anti-steering route-link occurrence(s) in $DIST_DIR" >&2
  printf "%b\n" "$MATCHES" >&2
  echo "" >&2
  echo "Resolution: every surface that links to pricing must be wrapped in useIsIOSCapacitor()" >&2
  echo "such that the link DOM node is NOT rendered on iOS." >&2
  echo "See .planning/phases/02-monetiza-o-compliance-telemetria/02-06-PLAN.md §Task 4 for the canonical pattern." >&2
  echo "See .planning/ROADMAP.md §'Phase 3 SC#1' for gate semantics rationale." >&2
  exit 1
fi

echo "OK: G-CRIT-03 gate CLEAN — zero anti-steering route-links detected in $DIST_DIR"
exit 0
