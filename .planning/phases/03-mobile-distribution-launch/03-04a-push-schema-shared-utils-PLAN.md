---
phase: 03-mobile-distribution-launch
plan: 04a
type: execute
wave: 2
depends_on: ["00", "01"]
files_modified:
  - supabase/migrations/20260515120005_push_subscriptions.sql
  - supabase/functions/_shared/timingSafeEq.ts
  - supabase/functions/_shared/timingSafeEq.test.ts
  - supabase/functions/_shared/fcmSignJWT.ts
  - supabase/functions/_shared/fcmSignJWT.test.ts
  - supabase/functions/asaas-webhook/index.ts
  - supabase/functions/compute-personalized-promos/index.ts
  - supabase/functions/google-calendar-auth/index.ts
  - supabase/functions/lgpd-delete/index.ts
  - supabase/functions/lgpd-delete-cleanup/index.ts
autonomous: false
requirements: [MOBILE-04]
tags: [push-schema, rls, shared-utils, timing-safe-eq-extract, fcm-jwt, lovable-cloud-deploy]
must_haves:
  truths:
    - "supabase/functions/_shared/timingSafeEq.ts exports `timingSafeEq(a,b)` AND re-export `export { timingSafeEq as constantTimeEq }` for backward compat with existing asaas-webhook test (Plan 02-05 SUMMARY threshold reached: 5 prior duplications + 4 new push fns coming in 03-04b = 9 consumers)"
    - "5 existing edge functions (asaas-webhook, compute-personalized-promos, lgpd-delete, lgpd-delete-cleanup, google-calendar-auth) replace local constantTimeEq with import from _shared/timingSafeEq.ts; existing index.test.ts files still pass (alias preserves contract)"
    - "supabase/functions/_shared/fcmSignJWT.ts mints FCM HTTP v1 access tokens via RS256 service-account JWT → OAuth2 token exchange; caches per cold-start; returns {access_token, expires_at}"
    - "supabase/migrations/20260515120005_push_subscriptions.sql creates push_subscriptions table (id UUID, user_id UUID FK auth.users CASCADE, device_token TEXT, platform CHECK IN ('ios','android'), app_version TEXT, created_at, last_seen_at) + partial UNIQUE INDEX on (user_id, device_token) WHERE device_token IS NOT NULL + 4 RLS policies (SELECT/INSERT/UPDATE/DELETE — all own-row by auth.uid()=user_id; NO has_plan gate at table level — per D-T08)"
    - "_shared/timingSafeEq.ts: 6 Deno test cases (equal strings → true; different lengths → false; same-length different content → false; empty strings → true; unicode safe; constantTimeEq alias matches)"
    - "_shared/fcmSignJWT.ts: 4 Deno test cases (signs valid JWT with RS256 + service-account, mocks fetch to oauth2.googleapis.com returns access_token, caches within expiry, throws on non-200, throws if response missing access_token)"
    - "[BLOCKING] Lovable Cloud deploy task: apply migration 20260514120001 (push_subscriptions table), redeploy 5 modified edge functions (asaas-webhook + compute-personalized-promos + google-calendar-auth + lgpd-delete + lgpd-delete-cleanup) so they pick up the new _shared/timingSafeEq.ts import — captured in 03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md (autonomous: false; founder consumes runbook)"
  artifacts:
    - path: supabase/migrations/20260515120005_push_subscriptions.sql
      provides: "push_subscriptions table + 4 RLS policies + partial UNIQUE on (user_id, device_token)"
      contains: "push_subscriptions"
    - path: supabase/functions/_shared/timingSafeEq.ts
      provides: "Canonical timing-safe string compare; replaces 5 prior duplications + serves 4 push fns in 03-04b"
      contains: "timingSafeEq"
    - path: supabase/functions/_shared/fcmSignJWT.ts
      provides: "FCM HTTP v1 OAuth2 token mint from service-account JWT (RS256) — consumed by 03-04b send-push-notification"
      contains: "getFCMAccessToken"
    - path: .planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md
      provides: "Founder runbook for Lovable Cloud apply of migration 20260514120001 + redeploy of 5 modified edge fns"
      contains: "Aplicar a migration 20260514120001"
  key_links:
    - from: "5 edge fns (asaas-webhook, compute-personalized-promos, lgpd-delete, lgpd-delete-cleanup, google-calendar-auth)"
      to: "_shared/timingSafeEq.ts"
      via: "import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts'"
      pattern: "timingSafeEq"
    - from: "_shared/fcmSignJWT.ts getFCMAccessToken"
      to: "Vault secret push_fcm_service_account (Plan 03-00 staging) — consumed by Plan 03-04b send-push-notification"
      via: "Deno.env.get('PUSH_FCM_SERVICE_ACCOUNT_JSON')"
      pattern: "PUSH_FCM_SERVICE_ACCOUNT_JSON"
---

<objective>
Ship the foundational layer of the push pipeline: `push_subscriptions` table + RLS, the two new `_shared/` utilities (timingSafeEq extraction + fcmSignJWT helper) with full Deno test coverage, and migration of 5 existing edge functions to consume `_shared/timingSafeEq.ts`. Plan 03-04b layers the new edge functions (enqueue-push, send-push-notification, cleanup-push-subscriptions, send-vencimento-alert) on top of these utilities.

Purpose: This was originally a single Plan 03-04 containing 11 tasks (above the 5-task soft threshold). The plan-checker review iter 1 (2026-05-14) flagged that 03-04 was overloaded AND that the `send-vencimento-alert` daily cron (ROADMAP SC#4 + D-T06 #1) was unplanned. Splitting 03-04 → 03-04a (this plan, schema + shared utils) + 03-04b (edge functions + vencimento cron) restores task budget AND closes the SC#4 gap.

The `_shared/timingSafeEq.ts` extraction (Plan 02-05 SUMMARY's deferred decision) is the natural prerequisite for 03-04b's 4 new edge functions. The `_shared/fcmSignJWT.ts` helper is similarly upstream of 03-04b's `send-push-notification`. Splitting them out lets 03-04b focus exclusively on edge-fn logic and fan-out wiring without re-introducing infrastructure.

Output: 1 SQL migration, 2 _shared TypeScript modules + co-located Deno tests, 5 modified existing edge functions (each switches one inline constantTimeEq function for an import), 1 deploy runbook for the founder (Lovable Cloud apply migration + redeploy 5 modified fns).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/03-mobile-distribution-launch/03-PATTERNS.md
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
@supabase/functions/asaas-webhook/index.ts
@supabase/functions/compute-personalized-promos/index.ts
@supabase/functions/lgpd-delete/index.ts
@supabase/functions/lgpd-delete-cleanup/index.ts
@supabase/functions/google-calendar-auth/index.ts
@supabase/migrations/20260515120003_user_promo_alerts.sql

<interfaces>
<!-- Cross-plan contracts -->

**From Plan 03-00 (consumed via runbook):**
- Firebase `project_id` — used by 03-04b's send-push-notification
- FCM service-account JSON full string — staged for 03-04b's Vault secret

**Consumed from Plan 02-06 (shipped):**
- `compute-personalized-promos` exists — touched here only to swap its inline constantTimeEq for an _shared import; the post-insert fan-out to enqueue-push happens in 03-04b

**Consumed from Plan 02-05 (shipped):**
- `asaas-webhook` state machine — touched here only to swap its inline constantTimeEq for an _shared import; downgrade fan-out + payment fan-out happen in 03-04b

**Consumed from Phase 1 (shipped):**
- `public.has_plan(uid, plan)` trust kernel function — used by 03-04b enqueue-push; this plan does NOT call it

**Produced for Plan 03-04b (edge functions):**
- `push_subscriptions` table with own-row RLS — enqueue-push selects from it; cleanup-push-subscriptions deletes from it; client INSERTs into it (Plan 03-05)
- `_shared/timingSafeEq.ts` — imported by enqueue-push, send-push-notification, cleanup-push-subscriptions, send-vencimento-alert
- `_shared/fcmSignJWT.ts` — imported by send-push-notification

**Deno test pattern:**
- Each `_shared/*.ts` has a co-located `*.test.ts` running via `deno test`
- CI integrates via the `.github/workflows/deno-tests.yml` already present (Plan 02-01 W0)
- Tests use `Deno.test(name, async (t) => { await t.step(...) })` pattern matching `lgpd-delete-cleanup/index.test.ts`

</interfaces>

<scratchpad>
**Why this plan is in Wave 2 (same as 03-04b):**
- Depends on 03-00 (account provisioning supplies Firebase service-account JSON for testing fcmSignJWT — though the helper itself works with any RSA key)
- Depends on 03-01 (capacitor.config.ts production identity locks the package name)
- 03-04b depends on this plan (must run AFTER); 03-05 depends on 03-04b

**Why _shared extraction is in 03-04a not 03-04b:**
- Plan 02-05 SUMMARY says "Next consumer should extract" — 03-04b adds 4 new consumers → total 9 → cross threshold
- Backward-compat alias `export { timingSafeEq as constantTimeEq }` preserves existing tests
- All 5 migrated fns redeploy in Task 5 (Lovable Cloud) — they need the new import bundled at fn deploy time

**Why we DON'T put has_plan gate on push_subscriptions at table level:**
- Free users may have a token registered (so they receive payment_event + onboarding pushes)
- The Pro+ gate is per-event in enqueue-push (Plan 03-04b)
- D-T08 + Plan 03-PATTERNS §"push_subscriptions" — own-row only

**Plan size:** 5 tasks. Comfortable.
</scratchpad>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract _shared/timingSafeEq.ts with backward-compat alias + Deno tests</name>
  <files>supabase/functions/_shared/timingSafeEq.ts, supabase/functions/_shared/timingSafeEq.test.ts</files>
  <read_first>
    - supabase/functions/asaas-webhook/index.ts (lines 55-60 — current constantTimeEq inline def)
    - supabase/functions/compute-personalized-promos/index.ts (lines 32-39)
    - supabase/functions/lgpd-delete/index.ts (lines 60-65)
    - supabase/functions/lgpd-delete-cleanup/index.ts (lines 63-68)
    - supabase/functions/google-calendar-auth/index.ts (lines 62-67)
    - Plan 02-05 SUMMARY §"Constant-time string compare helper duplication threshold reached"
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"_shared/timingSafeEq.ts"
  </read_first>
  <behavior>
    timingSafeEq(a, b):
    - Returns false if lengths differ (early bail; length leak acceptable per universal practice)
    - Returns true if strings byte-equal; false otherwise
    - OR-accumulates XOR diffs; final `r === 0` check
    - Constant-time across same-length inputs

    Re-export `timingSafeEq as constantTimeEq` so existing test files keep importing `constantTimeEq` without rewrite.
  </behavior>
  <action>
**1.1 — Create `supabase/functions/_shared/timingSafeEq.ts`:**

```typescript
/**
 * Constant-time string equality for fixed-length tokens.
 *
 * Why this exists: 5 edge functions previously duplicated this 5-line
 * implementation; Plan 03-04b adds 4 more consumers (enqueue-push,
 * send-push-notification, cleanup-push-subscriptions, send-vencimento-alert).
 * 9 consumers is well past the extraction threshold documented in Plan 02-05 SUMMARY.
 *
 * Security note: returning early on length mismatch DOES leak the length of
 * the secret. This is acceptable for our usage because all consumed tokens
 * have fixed lengths (64-char hex strings for openssl-generated secrets,
 * 32-char base64 for HMACs, etc.) — the length is a known constant.
 */
export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) {
    r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return r === 0;
}

/**
 * Backward-compat alias for the legacy name. Existing edge functions
 * imported `constantTimeEq` from their local inline copy; the alias keeps
 * their existing tests green during the gradual migration in Task 2.
 */
export { timingSafeEq as constantTimeEq };
```

**1.2 — Create `supabase/functions/_shared/timingSafeEq.test.ts`:**

```typescript
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { timingSafeEq, constantTimeEq } from './timingSafeEq.ts';

Deno.test('timingSafeEq — equal strings return true', () => {
  assertEquals(timingSafeEq('abc123', 'abc123'), true);
});

Deno.test('timingSafeEq — different lengths return false', () => {
  assertEquals(timingSafeEq('abc', 'abcd'), false);
});

Deno.test('timingSafeEq — same length different content returns false', () => {
  assertEquals(timingSafeEq('abc', 'xyz'), false);
});

Deno.test('timingSafeEq — both empty strings return true', () => {
  assertEquals(timingSafeEq('', ''), true);
});

Deno.test('timingSafeEq — unicode-safe (multi-byte chars compared char-by-char)', () => {
  assertEquals(timingSafeEq('café', 'café'), true);
  assertEquals(timingSafeEq('café', 'cafe'), false);
});

Deno.test('constantTimeEq alias points at same function', () => {
  assertEquals(constantTimeEq('hello', 'hello'), true);
  assertEquals(constantTimeEq('hello', 'world'), false);
});
```

**1.3 — Run Deno tests:**

```bash
deno test supabase/functions/_shared/timingSafeEq.test.ts
```

Expected: 6 tests passing.

**1.4 — Convention enforcement:**
- TypeScript strict (no `any`)
- JSDoc block explains rationale + length-leak caveat
- Aliased re-export uses `export { ... as ... }` syntax
- Tests use `Deno.test` pattern
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/_shared/timingSafeEq.ts','utf8'); const t=fs.readFileSync('supabase/functions/_shared/timingSafeEq.test.ts','utf8'); const req_s=[['export function timingSafeEq','main export'],['export { timingSafeEq as constantTimeEq }','backward-compat alias'],['a.length !== b.length','length check'],['r |=','XOR accumulator']]; const req_t=[['equal strings','equal test'],['different lengths','length test'],['constantTimeEq alias','alias test'],['unicode','unicode test'],['Deno.test','deno test pattern']]; let fail=false; for (const [n,w] of req_s){if(!s.includes(n)){console.error('FAIL: timingSafeEq.ts missing —',w);fail=true;}} for (const [n,w] of req_t){if(!t.includes(n)){console.error('FAIL: timingSafeEq.test.ts missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: timingSafeEq + tests');"</automated>
  </verify>
  <done>
    _shared/timingSafeEq.ts exists with main export + constantTimeEq alias. 6 Deno tests pass.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Migrate 5 existing edge functions to import from _shared/timingSafeEq.ts</name>
  <files>supabase/functions/asaas-webhook/index.ts, supabase/functions/compute-personalized-promos/index.ts, supabase/functions/lgpd-delete/index.ts, supabase/functions/lgpd-delete-cleanup/index.ts, supabase/functions/google-calendar-auth/index.ts</files>
  <read_first>
    - Each of the 5 files at the lines documented in Task 1 read_first (constantTimeEq inline def)
    - supabase/functions/asaas-webhook/index.test.ts (line 35 — imports constantTimeEq; alias preserves)
    - supabase/functions/lgpd-delete/index.test.ts (any references to local helper)
  </read_first>
  <action>
For each of the 5 edge function files:

**2.1 — Add import at the top:**

```typescript
import { timingSafeEq as constantTimeEq } from '../_shared/timingSafeEq.ts';
```

(Alias to the legacy local name to avoid touching every call site in the same edge fn.)

**2.2 — Delete the inline definition:**

Remove the local `function constantTimeEq(...)` or `const constantTimeEq = ...` block (5-6 lines). The doc comment on the inline def can be deleted too — the canonical comment is in `_shared/timingSafeEq.ts`.

**2.3 — Verify no other call sites in the same file broke:**

```bash
grep -n 'constantTimeEq\|timingSafeEq' supabase/functions/asaas-webhook/index.ts
```

Expected: 1 line for the import + N lines for the call sites (unchanged).

**2.4 — Repeat for all 5 files:**
- supabase/functions/asaas-webhook/index.ts
- supabase/functions/compute-personalized-promos/index.ts
- supabase/functions/lgpd-delete/index.ts
- supabase/functions/lgpd-delete-cleanup/index.ts
- supabase/functions/google-calendar-auth/index.ts

**2.5 — Run existing Deno tests to confirm no regression:**

```bash
deno test supabase/functions/asaas-webhook/
deno test supabase/functions/compute-personalized-promos/
deno test supabase/functions/lgpd-delete/
deno test supabase/functions/lgpd-delete-cleanup/
```

All tests must still pass. If any fails, the migration introduced a bug — fix before commit.

**2.6 — Convention enforcement:**
- Relative path `../_shared/timingSafeEq.ts` (Deno convention)
- Import alias to `constantTimeEq` preserves all existing call sites without rewrite
- Single-import-line per file
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const files=['supabase/functions/asaas-webhook/index.ts','supabase/functions/compute-personalized-promos/index.ts','supabase/functions/lgpd-delete/index.ts','supabase/functions/lgpd-delete-cleanup/index.ts','supabase/functions/google-calendar-auth/index.ts']; let fail=false; for (const f of files){const c=fs.readFileSync(f,'utf8'); if(!c.includes(\"from '../_shared/timingSafeEq.ts'\")){console.error('FAIL: '+f+' missing _shared import');fail=true;} const inlineMatch=c.match(/function\\s+constantTimeEq\\s*\\(/); if(inlineMatch){console.error('FAIL: '+f+' still has inline function constantTimeEq(');fail=true;}} if(fail)process.exit(1); console.log('OK: 5 edge fns migrated to _shared/timingSafeEq.ts');"</automated>
  </verify>
  <done>
    5 edge functions import constantTimeEq from _shared/timingSafeEq.ts; inline function defs deleted; existing Deno tests still pass.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create _shared/fcmSignJWT.ts + Deno tests (RS256 service-account → OAuth2)</name>
  <files>supabase/functions/_shared/fcmSignJWT.ts, supabase/functions/_shared/fcmSignJWT.test.ts</files>
  <read_first>
    - supabase/functions/google-calendar-auth/index.ts (lines 37-86 — WebCrypto sign + base64url helpers; analog pattern)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 3: FCM HTTP v1 OAuth2 Token Mint in Deno"
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"_shared/fcmSignJWT.ts"
  </read_first>
  <behavior>
    Module exports `getFCMAccessToken(sa: FCMServiceAccount): Promise<string>`:
    - Returns cached access_token if expires_at > now + 60s buffer
    - Otherwise:
      - Decode PEM private key (strip BEGIN/END headers + whitespace + base64 decode → DER bytes)
      - Import as RSASSA-PKCS1-v1_5 key with SHA-256
      - Build JWT header {alg: 'RS256', typ: 'JWT'} + payload {iss: client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: token_uri, exp: now+3600, iat: now}
      - Sign header.payload via crypto.subtle.sign
      - base64url-encode → JWT string
      - POST to oauth2.googleapis.com/token with grant_type=jwt-bearer
      - Parse response {access_token, expires_in}
      - Cache + return access_token
    - On failure: throw with explicit error message
  </behavior>
  <action>
**3.1 — Create `supabase/functions/_shared/fcmSignJWT.ts`:**

```typescript
/**
 * FCM HTTP v1 access-token mint from service-account JWT.
 *
 * Flow:
 *   1. Build JWT (header + payload + RS256 signature) using crypto.subtle
 *   2. Exchange JWT at token_uri for an OAuth2 access_token
 *   3. Cache token for ~expires_in - 60s
 *
 * Source: firebase.google.com/docs/cloud-messaging/migrate-v1
 */

export interface FCMServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

interface CachedToken {
  access_token: string;
  expires_at: number; // unix seconds
}

let cached: CachedToken | null = null;

function b64urlEncodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlEncodeStr(str: string): string {
  return b64urlEncodeBytes(new TextEncoder().encode(str));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  const body = pem.replace(header, '').replace(footer, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function getFCMAccessToken(sa: FCMServiceAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);

  if (cached && cached.expires_at > nowSec + 60) {
    return cached.access_token;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    exp: nowSec + 3600,
    iat: nowSec,
  };

  const headerB64 = b64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = b64urlEncodeStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  const signatureB64 = b64urlEncodeBytes(new Uint8Array(signature));

  const jwt = `${signingInput}.${signatureB64}`;

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`FCM OAuth2 exchange failed: HTTP ${resp.status} — ${text}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  if (!data.access_token) {
    throw new Error('FCM OAuth2 response missing access_token');
  }

  cached = {
    access_token: data.access_token,
    expires_at: nowSec + data.expires_in,
  };

  return data.access_token;
}

/**
 * Resets the in-memory token cache. Used by tests.
 */
export function _resetFCMTokenCache(): void {
  cached = null;
}
```

**3.2 — Create `supabase/functions/_shared/fcmSignJWT.test.ts`:**

4 Deno tests covering: signs JWT and exchanges for access_token (mocked fetch), caches within validity, throws on non-200, throws if response missing access_token. Use a test-grade RSA private key fixture (1024-bit, hardcoded in the test file as a literal — see Plan 02-06 / 02-05 patterns for committed test fixtures) and mock `globalThis.fetch` to intercept `https://oauth2.googleapis.com/token`. Reset cache via `_resetFCMTokenCache()` between tests.

(Full test file content matches the version in the prior single-plan 03-04 — see git history or recreate from the behavior block above.)

**3.3 — Run tests:**

```bash
deno test supabase/functions/_shared/fcmSignJWT.test.ts
```

Expected: 4 tests passing.

**3.4 — Convention enforcement:**
- TypeScript strict
- Single file (no transitive Deno deps beyond std/assert)
- `_resetFCMTokenCache()` is a test-only helper, underscore prefix per convention
- WebCrypto API (works in both Deno runtime + browser)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/functions/_shared/fcmSignJWT.ts','utf8'); const t=fs.readFileSync('supabase/functions/_shared/fcmSignJWT.test.ts','utf8'); const req_s=[['getFCMAccessToken','main export'],['_resetFCMTokenCache','test helper'],['FCMServiceAccount','type export'],['RSASSA-PKCS1-v1_5','RSA algorithm'],['oauth2.googleapis.com','token endpoint'],['urn:ietf:params:oauth:grant-type:jwt-bearer','grant type'],['firebase.messaging','scope']]; const req_t=[['access_token','main test'],['caches within validity','cache test'],['non-200 token endpoint','error test'],['missing access_token','missing field test']]; let fail=false; for (const [n,w] of req_s){if(!s.includes(n)){console.error('FAIL: fcmSignJWT.ts missing —',w);fail=true;}} for (const [n,w] of req_t){if(!t.includes(n)){console.error('FAIL: test missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: fcmSignJWT + tests');"</automated>
  </verify>
  <done>
    _shared/fcmSignJWT.ts exports getFCMAccessToken using WebCrypto RS256 → OAuth2 token exchange + cache. 4 Deno tests cover mocked-fetch scenarios.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Create push_subscriptions migration (table + 4 RLS policies + partial UNIQUE)</name>
  <files>supabase/migrations/20260515120005_push_subscriptions.sql</files>
  <read_first>
    - supabase/migrations/20260515120003_user_promo_alerts.sql (analog for table + RLS + self-check pattern)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"create_push_subscriptions.sql"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T08
  </read_first>
  <action>
**4.1 — Create `supabase/migrations/20260515120005_push_subscriptions.sql`:**

```sql
-- Phase 3 W2 — MOBILE-04 push notifications
-- D-T08 — push_subscriptions table with own-row RLS, partial UNIQUE,
--         service-role-only cleanup path on downgrade + SIGNED_OUT (Plan 03-04b + 03-05)

BEGIN;

CREATE TABLE public.push_subscriptions (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token    TEXT,
  platform        TEXT         NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version     TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Partial UNIQUE: prevent duplicate device_token for the same user, allow NULL token
-- (intermediate state during permission-granted-but-token-not-yet-received).
CREATE UNIQUE INDEX push_subscriptions_user_token_uniq
  ON public.push_subscriptions (user_id, device_token)
  WHERE device_token IS NOT NULL;

CREATE INDEX push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Own-row SELECT — NO has_plan gate at table level. Free users may have tokens
-- registered for payment_event + onboarding pushes. The Pro+ event-type gating
-- lives in enqueue-push (Plan 03-04b).
CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_update ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Self-checks
DO $$
DECLARE
  _p TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: push_subscriptions table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'push_subscriptions_user_token_uniq') THEN
    RAISE EXCEPTION 'MOBILE-04 self-check failed: partial UNIQUE index missing';
  END IF;

  FOREACH _p IN ARRAY ARRAY['push_subscriptions_select', 'push_subscriptions_insert', 'push_subscriptions_update', 'push_subscriptions_delete'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = _p) THEN
      RAISE EXCEPTION 'MOBILE-04 self-check failed: policy % not created', _p;
    END IF;
  END LOOP;

  RAISE NOTICE 'MOBILE-04 self-check passed: push_subscriptions + 4 RLS policies + partial UNIQUE';
END $$;

COMMIT;
```

**4.2 — Convention enforcement:**
- `BEGIN; ... COMMIT;` per migration convention
- `ON DELETE CASCADE` for user_id FK
- `CHECK (platform IN ('ios','android'))`
- No `CREATE EXTENSION` (pg_cron + pg_net pre-provisioned)
- Self-check via PL/pgSQL DO block
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('supabase/migrations/20260515120005_push_subscriptions.sql','utf8'); const req=[['CREATE TABLE public.push_subscriptions','table'],['device_token    TEXT','token col'],[\"CHECK (platform IN ('ios', 'android'))\",'platform check'],['CREATE UNIQUE INDEX push_subscriptions_user_token_uniq','partial unique idx'],['WHERE device_token IS NOT NULL','partial unique predicate'],['ENABLE ROW LEVEL SECURITY','RLS on'],['push_subscriptions_select','SELECT policy'],['push_subscriptions_insert','INSERT policy'],['push_subscriptions_update','UPDATE policy'],['push_subscriptions_delete','DELETE policy'],['auth.uid() = user_id','own-row gate'],['ON DELETE CASCADE','user_id FK cascade'],['MOBILE-04 self-check','self-check raise'],['COMMIT;','transactional commit']]; const banned=[['has_plan(auth.uid()','should NOT have plan gate at table level per D-T08']]; let fail=false; for (const [n,w] of req){if(!m.includes(n)){console.error('FAIL: migration missing —',w);fail=true;}} for (const [n,w] of banned){if(m.includes(n)){console.error('FAIL: banned —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: push_subscriptions migration');"</automated>
  </verify>
  <done>
    20260515120005_push_subscriptions.sql exists: table with 7 columns, partial UNIQUE on (user_id, device_token) WHERE NOT NULL, 4 RLS policies (own-row only, NO has_plan), self-checks via DO block.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 5: [BLOCKING] Lovable Cloud deploy — apply migration + redeploy 5 modified edge fns</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/02-monetiza-o-compliance-telemetria/02-05-PLAN.md (Lovable Cloud deploy runbook template)
    - supabase/migrations/20260515120005_push_subscriptions.sql (Task 4 output)
  </read_first>
  <what-built>
    Operator-driven Lovable Cloud chat actions. Claude cannot deploy to Lovable Cloud directly.
  </what-built>
  <how-to-verify>
    1. Create `.planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md`:

       **Step 1 — Apply migration:**
       In Lovable Cloud chat: `Aplicar a migration 20260515120005_push_subscriptions.sql em produção`

       Expected: migration self-check raises NOTICE "MOBILE-04 self-check passed: push_subscriptions + 4 RLS policies + partial UNIQUE".

       **Step 2 — Regenerate types:**
       `Regenerar tipos do Supabase`. Confirm `push_subscriptions` table appears in `src/integrations/supabase/types.ts`.

       **Step 3 — Redeploy 5 modified edge fns:**
       - `Redeployar a edge function asaas-webhook`
       - `Redeployar a edge function compute-personalized-promos`
       - `Redeployar a edge function lgpd-delete`
       - `Redeployar a edge function lgpd-delete-cleanup`
       - `Redeployar a edge function google-calendar-auth`

       Each redeploy bundles the current `_shared/timingSafeEq.ts` into the fn's runtime.

       **Step 4 — Smoke test asaas-webhook:**
       POST to the webhook endpoint with a valid HMAC signature payload (fixture from Plan 02-05 CRIT-04 smoke runbook). Expected: 200 OK. Failure mode: TypeError if the alias import is misconfigured (would log "constantTimeEq is not defined").

       **Step 5 — Capture in runbook:**
       Timestamped log: migration apply timestamp + type regeneration timestamp + 5 edge fn redeploy timestamps + smoke test result.
  </how-to-verify>
  <resume-signal>
    Reply: "03-04a deploy complete: migration 20260514120001 aplicada, types regenerados, 5 edge fns redeployadas, asaas-webhook smoke 200 OK."
  </resume-signal>
  <acceptance_criteria>
    - `.planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md` exists
    - Contains literal `Aplicar a migration 20260514120001`
    - Has 5 timestamped redeploy entries
    - Smoke test of asaas-webhook captured
    - `src/integrations/supabase/types.ts` contains `push_subscriptions:`
  </acceptance_criteria>
  <done>
    Migration applied, types regenerated, 5 edge fns redeployed, asaas-webhook smoke OK. Plan 03-04b can now proceed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `push_subscriptions` table ↔ authenticated client | Own-row RLS only; service role bypasses for cleanup (03-04b) |
| `_shared/timingSafeEq.ts` ↔ 5 existing edge fns + 4 future fns (03-04b) | All Bearer-token auth paths route through this helper |
| FCM service-account private key (Vault) ↔ `_shared/fcmSignJWT.ts` consumer | Helper signs internally; key never appears in logs or fetch URLs |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-08 | Information Disclosure | FCM service-account JSON leak | mitigate | `_shared/fcmSignJWT.ts` reads only from `Deno.env.get(...)`; signs internally; returns only short-lived access_token. Plan 03-04b's deploy runbook forbids committing the JSON to repo. |
| T-3-09 | Tampering | Future PR re-introduces inline constantTimeEq in one of the 5 migrated fns, drifting implementation | mitigate | Task 2 verification grep `! grep 'function constantTimeEq(' supabase/functions/.../index.ts` catches re-introduction |
| T-3-10 | Spoofing | push_subscriptions cross-user write attempt | mitigate | RLS policy `WITH CHECK (auth.uid() = user_id)`; adversarial test in Plan 03-05 proves empirically |
| T-3-11 | Information Disclosure | push_subscriptions cross-user SELECT attempt | mitigate | RLS policy `USING (auth.uid() = user_id)`; Free-user SELECT on another user's row returns empty array |
</threat_model>

<verification>
After all 5 tasks complete:

```bash
test -f supabase/functions/_shared/timingSafeEq.ts
test -f supabase/functions/_shared/timingSafeEq.test.ts
test -f supabase/functions/_shared/fcmSignJWT.ts
test -f supabase/functions/_shared/fcmSignJWT.test.ts
test -f supabase/migrations/20260515120005_push_subscriptions.sql

for f in asaas-webhook compute-personalized-promos lgpd-delete lgpd-delete-cleanup google-calendar-auth; do
  grep -q "from '../_shared/timingSafeEq.ts'" "supabase/functions/$f/index.ts" || echo "FAIL: $f not migrated"
done

deno test supabase/functions/_shared/
deno test supabase/functions/asaas-webhook/
deno test supabase/functions/compute-personalized-promos/
deno test supabase/functions/lgpd-delete/
deno test supabase/functions/lgpd-delete-cleanup/

grep -F 'Aplicar a migration 20260514120001' .planning/phases/03-mobile-distribution-launch/03-04a-LOVABLE-CLOUD-DEPLOY-RUNBOOK.md

grep -F 'push_subscriptions' src/integrations/supabase/types.ts
```
</verification>

<success_criteria>
- `_shared/timingSafeEq.ts` + tests exist; 6 Deno tests pass; `constantTimeEq` alias exported
- `_shared/fcmSignJWT.ts` + tests exist; 4 Deno tests pass; cached + refresh logic works
- Migration `20260515120005_push_subscriptions.sql` with table + 4 RLS policies + partial UNIQUE + self-checks
- 5 edge functions migrated; inline function defs deleted; existing tests still pass
- Lovable Cloud deploy runbook captures migration apply + 5 redeploys + smoke test
- `src/integrations/supabase/types.ts` regenerated, contains `push_subscriptions:`
- Plan 03-04b can now proceed (depends_on includes "04a")
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-04a-SUMMARY.md` documenting:
- Lovable Cloud deploy timestamps (migration + 5 redeploys)
- Deno test counts (6 timingSafeEq + 4 fcmSignJWT + N regression for migrated fns)
- Any deviations (e.g., migrated edge fn needed manual call-site cleanup beyond import line)
- Reminder: 03-04b consumes both `_shared/timingSafeEq.ts` and `_shared/fcmSignJWT.ts`; 4 new edge fns in 03-04b will each import these
</output>
