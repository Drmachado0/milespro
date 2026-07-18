---
phase: 03-mobile-distribution-launch
plan: 03
type: execute
wave: 1
depends_on: ["01"]
files_modified:
  - public/.well-known/apple-app-site-association
  - public/.well-known/assetlinks.json
  - vercel.json
  - src/lib/deepLinkHandler.ts
  - src/lib/__tests__/deepLinkHandler.test.ts
  - src/pages/AuthCallback.tsx
  - src/pages/Auth.tsx
  - src/contexts/AuthProvider.tsx
  - src/App.tsx
  - src/hooks/useAppleSignIn.ts
  - scripts/smoke-deeplinks.sh
  - .github/workflows/smoke-deeplinks.yml
  - android/app/src/main/AndroidManifest.xml
  - ios/App/App/App.entitlements
autonomous: false
requirements: [MOBILE-03, MOBILE-01]
tags: [universal-links, app-links, aasa, assetlinks, oauth-callback, pkce, apple-signin, deep-link-handler, vercel-headers]
must_haves:
  truths:
    - "public/.well-known/apple-app-site-association exists (NO .json extension per AASA spec) with payload `{applinks:{details:[{appIDs:['<TEAM_ID>.br.com.milespro.app'], components:[{/:'/auth/callback*'},{/:'/lgpd/confirm-delete*'},{/:'/promocoes*'}]}]}}` (D-T09 + D-T11)"
    - "public/.well-known/assetlinks.json exists with payload listing relation=delegate_permission/common.handle_all_urls + namespace=android_app + package_name=br.com.milespro.app + sha256_cert_fingerprints array containing BOTH the App Signing SHA-256 (from Plan 03-00) AND the Upload Key SHA-256"
    - "vercel.json rewrites regex extended to `/((?!api/|assets/|\\.well-known/).*)` so AASA + assetlinks are NOT routed through the SPA index.html catch-all (D-T11)"
    - "vercel.json headers array has a new entry `{source:'/.well-known/(.*)', headers:[{key:'Content-Type', value:'application/json'},{key:'Cache-Control', value:'public, max-age=3600'}]}` (D-T11)"
    - "src/lib/deepLinkHandler.ts exports `registerDeepLinkHandler(navigate)` which (a) is a no-op when !Capacitor.isNativePlatform(); (b) validates url.host === 'app.milespro.net.br' (production) or 'localhost:5173' (dev only via import.meta.env.DEV); (c) routes /auth/callback without auth check; (d) for other paths, checks supabase.auth.getSession() — if no session, writes sessionStorage('returnTo', path) + navigates to /auth; if session, navigates directly (D-T10, D-T11, D-T12)"
    - "src/pages/AuthCallback.tsx renders 3 states (loading / error / success-with-navigate); calls supabase.auth.exchangeCodeForSession(searchParams.get('code')); consumes sessionStorage('returnTo') OR falls back to '/dashboard'; uses navigate(returnTo, {replace: true}) (D-T11)"
    - "src/pages/AuthCallback.tsx handles BOTH OAuth PKCE exchange AND password-recovery flows (Q3 RESOLVED in RESEARCH.md): on mount, reads searchParams ('code' for OAuth/email-verify PKCE) AND ('type' === 'recovery'); if type=recovery, redirects to /auth?reset=true with the access_token + refresh_token preserved (Supabase password-reset email URL pattern `https://app.milespro.net.br/auth/callback?type=recovery&access_token=...&refresh_token=...`); otherwise standard PKCE flow via exchangeCodeForSession. Operator runbook step required: update Supabase Auth -> Email Templates -> Reset Password to use redirectURL `https://app.milespro.net.br/auth/callback?type=recovery` so the link lands at AuthCallback and the recovery branch fires (Q3 RESOLVED)"
    - "src/pages/Auth.tsx line 89 redirectTo updated from `${window.location.origin}/dashboard` → `${window.location.origin}/auth/callback`; AND new Apple Sign-In button rendered only when useIsIOSCapacitor()===true via new useAppleSignIn hook (D-T03)"
    - "src/contexts/AuthProvider.tsx line 61 emailRedirectTo updated from `${window.location.origin}/dashboard` → `${window.location.origin}/auth/callback`"
    - "src/App.tsx adds Route `/auth/callback` (NOT inside ProtectedRoute) + useEffect that calls registerDeepLinkHandler(navigate) on mount"
    - "src/hooks/useAppleSignIn.ts implements useAppleSignIn returning {signInWithApple, isLoading, isAvailable} where isAvailable=useIsIOSCapacitor() and signInWithApple invokes supabase.auth.signInWithOAuth({provider:'apple', options:{redirectTo:'${origin}/auth/callback'}}) (D-T03)"
    - "Apple Sign-In flow uses supabase.auth.signInWithOAuth({provider: 'apple'}) inside iOS WebView (web OAuth fallback) — native @capacitor-community/apple-sign-in plugin DEFERRED to v2 per RESEARCH.md Q1 RESOLVED. The web OAuth flow opens Apple's sign-in page via Safari (or SFSafariViewController inside Capacitor), captures the PKCE code, redirects to /auth/callback for exchange. Native idToken-direct flow is not required for v1 Apple Review per Guideline 4.8 — the WebView OAuth is acceptable."
    - "android/app/src/main/AndroidManifest.xml has a second <intent-filter android:autoVerify='true'> inside MainActivity covering action.VIEW + category.BROWSABLE + scheme=https + host=app.milespro.net.br + pathPrefix entries for /auth/callback, /lgpd/confirm-delete, /promocoes (D-T09 + D-T10)"
    - "ios/App/App/App.entitlements has <key>com.apple.developer.associated-domains</key><array><string>applinks:app.milespro.net.br</string></array>"
    - "src/lib/__tests__/deepLinkHandler.test.ts covers: host validation rejects wrong-host URL, /auth/callback bypasses auth check, non-callback path without session writes sessionStorage + navigates to /auth, non-callback path with session navigates directly, helper is no-op on web (Capacitor.isNativePlatform()===false)"
    - "scripts/smoke-deeplinks.sh curls the production AASA + assetlinks URLs and uses jq to assert payload shape; called by .github/workflows/smoke-deeplinks.yml on deploy"
    - "deepLinkHandler strict host allowlist mitigates T-3-02 (Universal Link host spoofing)"
  artifacts:
    - path: public/.well-known/apple-app-site-association
      provides: "AASA payload for iOS Universal Links"
      contains: "applinks"
    - path: public/.well-known/assetlinks.json
      provides: "App Links assertion for Android"
      contains: "br.com.milespro.app"
    - path: vercel.json
      provides: "SPA rewrite exclusion + .well-known content-type override"
      contains: "well-known"
    - path: src/lib/deepLinkHandler.ts
      provides: "Capacitor App.appUrlOpen chokepoint with strict host allowlist + auth gate"
      contains: "registerDeepLinkHandler"
    - path: src/pages/AuthCallback.tsx
      provides: "PKCE exchange page; consumes returnTo; navigates"
      contains: "exchangeCodeForSession"
    - path: src/hooks/useAppleSignIn.ts
      provides: "iOS-only Apple OAuth handler"
      contains: "signInWithOAuth"
    - path: android/app/src/main/AndroidManifest.xml
      provides: "App Links intent-filter with autoVerify=true"
      contains: "autoVerify"
    - path: ios/App/App/App.entitlements
      provides: "Associated Domains entitlement applinks:app.milespro.net.br"
      contains: "associated-domains"
  key_links:
    - from: "AASA appIDs entry"
      to: "Apple Team ID from Plan 03-00 runbook"
      via: "string interpolation in payload"
      pattern: "<TEAM_ID>.br.com.milespro.app"
    - from: "assetlinks sha256_cert_fingerprints"
      to: "Android App Signing SHA-256 + Upload Key SHA-256 from Plan 03-00 runbook"
      via: "json array of fingerprint strings"
      pattern: "sha256_cert_fingerprints"
    - from: "src/pages/Auth.tsx Google handler redirectTo"
      to: "src/pages/AuthCallback.tsx PKCE page"
      via: "supabase.auth.signInWithOAuth redirect → URL match → AuthCallback effect"
      pattern: "/auth/callback"
    - from: "src/App.tsx useEffect on mount"
      to: "src/lib/deepLinkHandler.ts registerDeepLinkHandler(navigate)"
      via: "function call inside useEffect dep [navigate]"
      pattern: "registerDeepLinkHandler"
---

<objective>
Ship the deep-link infrastructure that makes OAuth callbacks, LGPD email-confirm flows, and push-notification taps land back inside the native iOS/Android app instead of opening Safari/Chrome. Wire Apple Sign-In as an iOS-only auth provider (D-T03, mandatory for Apple Review per Guideline 4.8). Add a CI smoke gate that verifies the AASA + assetlinks payloads are structurally correct after every deploy.

Purpose: MOBILE-03 is the Universal Links + App Links requirement (`OAuth callbacks, deep linking of email transactional, return of checkout web to app`). Without AASA + assetlinks correctly hosted, every OAuth flow strands the user in Safari with the session living on the wrong origin. Without `AuthCallback.tsx`, the PKCE code-exchange has no landing page. Without `deepLinkHandler.ts`, taps on Universal Link URLs do not propagate to React Router. Without Apple Sign-In, the iOS submission gets rejected by Guideline 4.8 (since we already offer Google OAuth, Apple Sign-In becomes mandatory). The strict host allowlist on `deepLinkHandler` is the T-3-02 (HIGH) mitigation per the phase threat model.

Output: 2 static files in `public/.well-known/`, 1 vercel.json extension, 1 new chokepoint module + tests, 1 new page (AuthCallback), 1 new hook (useAppleSignIn), wiring in App.tsx + Auth.tsx + AuthProvider.tsx, 2 native config edits (Android intent-filter + iOS entitlements), 1 smoke script + CI workflow.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-mobile-distribution-launch/03-CONTEXT.md
@.planning/phases/03-mobile-distribution-launch/03-RESEARCH.md
@.planning/phases/03-mobile-distribution-launch/03-PATTERNS.md
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
@src/pages/Auth.tsx
@src/contexts/AuthProvider.tsx
@src/pages/LgpdConfirmDelete.tsx
@src/App.tsx
@src/lib/sentry.ts
@vercel.json

<interfaces>
<!-- Cross-plan contracts -->

**Consumes from Plan 03-00 (runbook):**
- Apple Team ID (10-char alphanumeric) → AASA `appIDs[0]` value
- Android App Signing SHA-256 fingerprint → assetlinks `sha256_cert_fingerprints[0]`
- Android Upload Key SHA-256 fingerprint → assetlinks `sha256_cert_fingerprints[1]` (so Internal Testing builds also resolve App Links)

**Consumes from Plan 03-01:**
- `ios/App/App/` directory exists (post `npx cap add ios`)
- `android/app/src/main/AndroidManifest.xml` exists (post `npx cap add android`)
- `capacitor.config.ts` has `appId: 'br.com.milespro.app'` (so the App Links intent-filter package name matches)

**Apple Sign In with Apple supabase setup:**
- Plan 03-00 created the Apple Services ID `br.com.milespro.app.signin` + .p8 Sign in with Apple key
- This plan adds ONE founder action in Task 7: paste the Services ID + Team ID + Key ID + .p8 contents into Supabase Auth → Providers → Apple (web UI). This is unavoidable manual setup; no Supabase CLI for OAuth provider config.

**deepLinkHandler module relationship:**
- Registered from `src/App.tsx` `useEffect` (NOT from `main.tsx`) — needs React Router's `useNavigate()` and the AuthContext to be in scope, both of which only exist below the AppErrorBoundary + Router + Providers tree
- Exposes `registerDeepLinkHandler(navigate: NavigateFunction): () => void` (returns unsubscribe for useEffect cleanup)
- No-op when `!Capacitor.isNativePlatform()` so calling it on the web build is safe and a single useEffect serves all platforms

**Existing test patterns:**
- `src/pages/LgpdConfirmDelete.tsx` is the closest analog for `AuthCallback.tsx` (per Plan 03-PATTERNS §"AuthCallback.tsx")
- `src/hooks/travel/travel.adversarial.test.ts` is the closest test analog for vitest mocking patterns

**Existing redirectTo sites (must update):**
- `src/pages/Auth.tsx:89` — Google OAuth handler
- `src/contexts/AuthProvider.tsx:55` — signUp emailRedirectTo
- `src/pages/Auth.tsx:293` — password reset redirectTo (LEAVE AS IS — `/auth?reset=true` is a different flow, not Universal-Link-bound)

</interfaces>

<scratchpad>
**Why /auth/callback is in `AuthCallback.tsx` not in `Auth.tsx`:**
- Universal Link routes to a path; the path must be a `<Route>` for React Router to dispatch
- Inline-in-Auth doesn't work because the URL is `/auth/callback`, not `/auth`
- LgpdConfirmDelete.tsx pattern proves the shape works

**Why localhost:5173 dev exception in deepLinkHandler:**
- During development the founder runs `npm run dev` on localhost; iOS simulator can hit it via `http://10.0.2.2:5173` (Android emulator equivalent)
- BUT Universal Links require HTTPS in production; Apple won't resolve `http://` URLs
- The dev exception is gated by `import.meta.env.DEV` so the production bundle has NO localhost match in the host allowlist
- This satisfies T-3-02 (host spoofing) defense while keeping dev workflow alive

**Why AASA file has no `.json` extension:**
- Apple AASA spec literally requires the file to be served WITHOUT extension at `/apple-app-site-association`
- Vercel serves files in `public/` verbatim; we just need to write the file without extension
- Linux/Mac/Windows all support extensionless files; git tracks them normally

**Why we extend the regex AND add a header rule in vercel.json:**
- The regex change (`(?!api/|assets/|\\.well-known/)`) makes Vercel's SPA fallback NOT route AASA through index.html
- The header rule sets `Content-Type: application/json` (AASA has no extension, so default is `text/plain`; Apple's CDN rejects)
- Both are required; doing only one fails the AASA download

**Why useAppleSignIn is a separate hook not inline in Auth.tsx:**
- Symmetry with future hooks (Sign in with Apple may grow features: nonce generation, native plugin integration via `@capacitor-community/apple-sign-in`)
- Testable independently
- iOS-only via `isAvailable = useIsIOSCapacitor()` keeps Path C clean — the BUTTON is never rendered on non-iOS, the FUNCTION isn't either

**Why sessionStorage instead of router state for returnTo:**
- React Router state is wiped on full page reload (which happens when OAuth redirects back)
- sessionStorage survives the redirect AND is automatically scoped to the origin (won't leak between tabs)
- Cleared by AuthCallback after consumption; double-clear in onAuthStateChange (defensive)

**Why we modify AuthProvider.tsx line 61 + Auth.tsx line 89 in the SAME plan:**
- Both are the same OAuth-callback contract; splitting risks one updated, one not, leaving signup-via-email broken
- Single plan, single commit, atomic

**Why we DON'T deep-link `/assinatura`:**
- D-T09 explicit: Path C concern. iOS app must NOT have a deep-link target that re-opens it at a pricing page.
- If a checkout email contains `https://app.milespro.net.br/assinatura?status=success`, that link opens in Safari on iOS (NOT in our app), which is the correct behavior. The user can come back to the app manually after seeing the success page on web.

**Plan size check:** 7 tasks, ~13 files modified, 2 native config edits. Larger than the "2-3 tasks" guideline because deep-links is one cohesive flow (split into 7 because each task is independent enough to verify atomically, and rejecting split = the parts are tightly coupled — AASA + assetlinks + vercel.json all gate each other). Context cost estimate: ~50% — at the budget edge, justified by single-concern boundary.
</scratchpad>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create public/.well-known/apple-app-site-association + assetlinks.json</name>
  <files>public/.well-known/apple-app-site-association, public/.well-known/assetlinks.json</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (Apple Team ID + Android App Signing SHA-256 + Upload Key SHA-256 captured here)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 4: AASA Payload + Vercel Headers"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T09, D-T11
  </read_first>
  <action>
**1.1 — Create directory:**

```bash
mkdir -p public/.well-known
```

**1.2 — Read the runbook for credentials:**

Grep the Quick Reference Table for `Apple Team ID:` and `Android App Signing SHA-256:` and `Android Upload Key SHA-256:`. These three values MUST be non-placeholder; if any are still `<TEAM_ID>` or `TBD`, STOP and re-check Plan 03-00 completion.

**1.3 — Create `public/.well-known/apple-app-site-association` (NO `.json` extension):**

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.br.com.milespro.app"],
        "components": [
          { "/": "/auth/callback*", "comment": "OAuth PKCE callback (Google + Apple)" },
          { "/": "/lgpd/confirm-delete*", "comment": "LGPD deletion email confirmation" },
          { "/": "/promocoes*", "comment": "D-13 push notification target / share" }
        ]
      }
    ]
  }
}
```

Replace `<TEAM_ID>` with the literal 10-char Apple Team ID from the runbook (e.g., `ABC123XYZ4`). The final appIDs entry becomes `"ABC123XYZ4.br.com.milespro.app"`.

**IMPORTANT:**
- File name is `apple-app-site-association` exactly (NO `.json` extension; Apple AASA spec is strict)
- Content type is set to `application/json` by Vercel headers (Task 2)
- DO NOT escape the `*` glob in the path; it is part of the AASA wildcard syntax

**1.4 — Create `public/.well-known/assetlinks.json`:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "br.com.milespro.app",
      "sha256_cert_fingerprints": [
        "<APP_SIGNING_SHA256>",
        "<UPLOAD_KEY_SHA256>"
      ]
    }
  }
]
```

Replace placeholders with the actual hex-byte-pair strings from the runbook. Both fingerprints listed so Internal Testing builds (signed with upload key) AND Production builds (re-signed by Play with the App Signing key) both verify.

Format check: each fingerprint is 32 byte-pairs separated by colons (e.g., `AB:CD:EF:01:23:45:67:89:0A:0B:0C:0D:0E:0F:10:11:12:13:14:15:16:17:18:19:1A:1B:1C:1D:1E:1F:20:21`).

**1.5 — Validate JSON syntax:**

```bash
cat public/.well-known/assetlinks.json | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))"
cat public/.well-known/apple-app-site-association | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))"
```

Both must exit 0. If either fails, JSON syntax error — fix.

**1.6 — Convention enforcement:**
- 2-space indent (matches Prettier defaults)
- LF line endings (cross-platform consistent; commit hook .gitattributes already enforces if present)
- No trailing whitespace
- File `apple-app-site-association` has NO extension (Mac/Linux fine; Windows verify via `Get-ChildItem` that no `.txt` was appended by Notepad)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); if(!fs.existsSync('public/.well-known/apple-app-site-association')){console.error('FAIL: AASA file missing');process.exit(1);} if(!fs.existsSync('public/.well-known/assetlinks.json')){console.error('FAIL: assetlinks.json missing');process.exit(1);} const aasa=JSON.parse(fs.readFileSync('public/.well-known/apple-app-site-association','utf8')); const al=JSON.parse(fs.readFileSync('public/.well-known/assetlinks.json','utf8')); if(!aasa.applinks||!aasa.applinks.details||!aasa.applinks.details[0].appIDs){console.error('FAIL: AASA payload shape broken');process.exit(1);} const appId=aasa.applinks.details[0].appIDs[0]; if(!/^[A-Z0-9]{10}\\.br\\.com\\.milespro\\.app$/.test(appId)){console.error('FAIL: AASA appIDs[0] not in TEAMID.br.com.milespro.app format —',appId);process.exit(1);} const comps=aasa.applinks.details[0].components.map(c=>c['/']); for (const need of ['/auth/callback*','/lgpd/confirm-delete*','/promocoes*']){if(!comps.includes(need)){console.error('FAIL: AASA components missing',need);process.exit(1);}} if(!Array.isArray(al)||al.length<1||al[0].target.package_name!=='br.com.milespro.app'){console.error('FAIL: assetlinks payload shape broken');process.exit(1);} const fp=al[0].target.sha256_cert_fingerprints; if(!Array.isArray(fp)||fp.length<2){console.error('FAIL: assetlinks needs >=2 fingerprints (App Signing + Upload Key)');process.exit(1);} for (const f of fp){if(!/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(f)){console.error('FAIL: assetlinks fingerprint format —',f);process.exit(1);}} console.log('OK: AASA + assetlinks shapes valid');"</automated>
  </verify>
  <done>
    `public/.well-known/apple-app-site-association` (no extension) + `public/.well-known/assetlinks.json` exist. Both parse as valid JSON. AASA appIDs[0] matches `<10-char>.br.com.milespro.app`. AASA components include /auth/callback*, /lgpd/confirm-delete*, /promocoes*. assetlinks has 2+ SHA-256 fingerprints (App Signing + Upload).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend vercel.json — .well-known rewrites exclusion + Content-Type header</name>
  <files>vercel.json</files>
  <read_first>
    - vercel.json (current rewrites at line 7-9; headers array at line 10-26)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"vercel.json MODIFICATIONS"
  </read_first>
  <action>
**2.1 — Read current `vercel.json`:**

The current rewrites are:
```json
"rewrites": [
  { "source": "/((?!api/|assets/).*)", "destination": "/index.html" }
]
```

The current headers array has 2 entries (global security headers + assets cache).

**2.2 — Update the rewrites regex to exclude `\\.well-known/`:**

Change to:
```json
"rewrites": [
  { "source": "/((?!api/|assets/|\\.well-known/).*)", "destination": "/index.html" }
]
```

Without this, Vercel's SPA catch-all rewrite would route `/.well-known/apple-app-site-association` to `/index.html`, serving HTML with status 200, breaking Apple's content-type validation.

**2.3 — Add a new headers entry for `/.well-known/*`:**

Append to the `headers` array (AFTER the existing assets cache entry):

```json
{
  "source": "/.well-known/(.*)",
  "headers": [
    { "key": "Content-Type", "value": "application/json" },
    { "key": "Cache-Control", "value": "public, max-age=3600" }
  ]
}
```

Both keys are mandatory:
- `Content-Type: application/json` — AASA file has NO `.json` extension; without this header, Vercel serves `text/plain` by default, Apple's CDN rejects with "Invalid mime type"
- `Cache-Control: public, max-age=3600` — Apple's CDN refreshes every ~1h based on Cache-Control; this matches the upstream behavior

**2.4 — Resulting `vercel.json` structure:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci --legacy-peer-deps",
  "trailingSlash": false,
  "rewrites": [
    { "source": "/((?!api/|assets/|\\.well-known/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/.well-known/(.*)",
      "headers": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

(Preserve any existing top-level fields like `framework`, `outputDirectory`, `cleanUrls`, `redirects` from the current `vercel.json`. The action above is illustrative; the actual edit only changes the rewrites line + appends to headers.)

**2.5 — Validate JSON:**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" && echo OK
```

**2.6 — Convention enforcement:**
- 2-space indent
- Header keys use PascalCase per HTTP convention (e.g., `Content-Type` not `content-type`)
- `Cache-Control: public, max-age=3600` matches the AASA refresh cadence; do NOT set immutable (Apple needs to refresh)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const v=JSON.parse(fs.readFileSync('vercel.json','utf8')); const rw=v.rewrites&&v.rewrites[0]&&v.rewrites[0].source; if(!rw||!rw.includes('\\\\.well-known/')){console.error('FAIL: rewrites regex does not exclude .well-known/ (got',rw+')');process.exit(1);} const wkHeader=(v.headers||[]).find(h=>h.source==='/.well-known/(.*)'); if(!wkHeader){console.error('FAIL: no headers entry for /.well-known/(.*)');process.exit(1);} const ct=wkHeader.headers.find(h=>h.key==='Content-Type'); if(!ct||ct.value!=='application/json'){console.error('FAIL: .well-known headers missing Content-Type=application/json');process.exit(1);} const cc=wkHeader.headers.find(h=>h.key==='Cache-Control'); if(!cc||!cc.value.includes('max-age=3600')){console.error('FAIL: .well-known headers missing Cache-Control max-age=3600');process.exit(1);} console.log('OK: vercel.json extended for .well-known');"</automated>
  </verify>
  <done>
    vercel.json rewrites regex extends to exclude `.well-known/`. Headers array has new `/.well-known/(.*)` entry with `Content-Type: application/json` + `Cache-Control: public, max-age=3600`. JSON parses clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create src/lib/deepLinkHandler.ts + tests (T-3-02 host spoofing mitigation)</name>
  <files>src/lib/deepLinkHandler.ts, src/lib/__tests__/deepLinkHandler.test.ts</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 1: Deep Link Handler Chokepoint (D-T12)"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T10, D-T12
    - src/lib/sentry.ts (init-once pattern reference for module structure)
    - src/lib/logger.ts (canonical logger usage)
  </read_first>
  <behavior>
    - registerDeepLinkHandler(navigate) is a no-op when !Capacitor.isNativePlatform()
    - On Capacitor App.appUrlOpen event:
      - Parse `event.url` as URL
      - REJECT if url.host !== 'app.milespro.net.br' (production) AND NOT (import.meta.env.DEV AND url.host === 'localhost:5173')
      - Compute path = url.pathname + url.search
      - If path starts with '/auth/callback' → navigate(path) immediately (no auth check; this IS the callback)
      - Else → check supabase.auth.getSession(): if session exists, navigate(path); else, sessionStorage.setItem('returnTo', path) + navigate('/auth')
    - Return unsubscribe function for useEffect cleanup
    - logger.warn on rejected host; logger.error on URL parse failure
  </behavior>
  <action>
**3.1 — Create `src/lib/deepLinkHandler.ts`:**

```typescript
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { NavigateFunction } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Strict allowlist of hosts whose URLs we will navigate INTO the app.
 * - Production: only the live origin
 * - Dev (npm run dev — vite serves on localhost:5173): allowed ONLY when import.meta.env.DEV
 *
 * Anything else is rejected (T-3-02 host-spoofing mitigation per Phase 3 threat model).
 */
const ALLOWED_HOST_PROD = 'app.milespro.net.br';
const ALLOWED_HOST_DEV = 'localhost:5173';

function isAllowedHost(host: string): boolean {
  if (host === ALLOWED_HOST_PROD) return true;
  if (import.meta.env.DEV && host === ALLOWED_HOST_DEV) return true;
  return false;
}

/**
 * Auth-gated routes that pre-auth deep-links must defer through /auth.
 * /auth/callback is the EXCEPTION (it IS the auth callback; runs without session).
 */
function isCallbackPath(path: string): boolean {
  return path.startsWith('/auth/callback');
}

/**
 * Registers the Capacitor App.appUrlOpen listener. Returns an unsubscribe
 * function for cleanup in useEffect.
 *
 * No-op on web (Capacitor.isNativePlatform() === false). Safe to call from
 * any platform; the early return keeps the module zero-cost outside iOS/Android.
 *
 * Architecture:
 *   1. Validate event.url is well-formed
 *   2. Validate url.host against the strict allowlist
 *   3. Extract path (pathname + search), discard hash/fragment by design
 *   4. /auth/callback → navigate directly (PKCE exchange runs inside AuthCallback.tsx)
 *   5. Other paths:
 *      - If session present → navigate directly
 *      - If no session → write sessionStorage('returnTo', path) + navigate('/auth')
 *      - AuthProvider.tsx (post-login) reads + consumes the returnTo key
 *
 * @param navigate from React Router's useNavigate() — passed in to avoid
 *   needing hooks inside this module
 * @returns unsubscribe function for the Capacitor listener (use in useEffect cleanup)
 */
export function registerDeepLinkHandler(navigate: NavigateFunction): () => void {
  if (!Capacitor.isNativePlatform()) {
    // No-op on web. Returned unsubscribe is also no-op.
    return () => {};
  }

  let unsubscribe: (() => void) | null = null;

  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    let parsed: URL;
    try {
      parsed = new URL(event.url);
    } catch (err) {
      logger.error('[DeepLink]', 'Malformed URL rejected:', event.url, err);
      return;
    }

    if (!isAllowedHost(parsed.host)) {
      logger.warn('[DeepLink]', 'Host not allowed — rejected:', parsed.host);
      return;
    }

    const path = parsed.pathname + parsed.search;

    if (isCallbackPath(path)) {
      logger.log('[DeepLink]', 'Navigating to auth callback:', path);
      navigate(path);
      return;
    }

    // Auth-gated path: defer through /auth if no session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        logger.log('[DeepLink]', 'Authed — navigating:', path);
        navigate(path);
      } else {
        logger.log('[DeepLink]', 'No session — saving returnTo:', path);
        sessionStorage.setItem('returnTo', path);
        navigate('/auth');
      }
    }).catch((err) => {
      logger.error('[DeepLink]', 'getSession failed:', err);
      navigate('/auth');
    });
  }).then((handle) => {
    unsubscribe = () => handle.remove();
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
```

**3.2 — Create `src/lib/__tests__/deepLinkHandler.test.ts`:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/core and @capacitor/app BEFORE importing the module under test
const mockListener = vi.fn();
let isNative = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNative,
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (event: string, handler: (e: { url: string }) => void) => {
      mockListener.mockImplementation(handler);
      return { remove: vi.fn() };
    }),
  },
}));

const mockGetSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerDeepLinkHandler } from '@/lib/deepLinkHandler';

const navigate = vi.fn();

describe('registerDeepLinkHandler', () => {
  beforeEach(() => {
    isNative = true;
    navigate.mockReset();
    mockListener.mockReset();
    mockGetSession.mockReset();
    sessionStorage.clear();
  });

  it('is a no-op when not on a native platform', () => {
    isNative = false;
    const unsubscribe = registerDeepLinkHandler(navigate);
    expect(typeof unsubscribe).toBe('function');
    // No listener attached; calling unsubscribe is safe
    unsubscribe();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects URLs with wrong host', async () => {
    registerDeepLinkHandler(navigate);
    // Simulate Capacitor firing the listener with a spoofed host
    mockListener({ url: 'https://attacker.example.com/auth/callback?code=abc' });
    await new Promise((r) => setTimeout(r, 10));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates directly for /auth/callback without session check', async () => {
    registerDeepLinkHandler(navigate);
    mockListener({ url: 'https://app.milespro.net.br/auth/callback?code=XYZ&state=ABC' });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/auth/callback?code=XYZ&state=ABC');
  });

  it('defers non-callback path to /auth when no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    registerDeepLinkHandler(navigate);
    mockListener({ url: 'https://app.milespro.net.br/promocoes' });
    await new Promise((r) => setTimeout(r, 20));
    expect(sessionStorage.getItem('returnTo')).toBe('/promocoes');
    expect(navigate).toHaveBeenCalledWith('/auth');
  });

  it('navigates directly for non-callback path when session present', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } } });
    registerDeepLinkHandler(navigate);
    mockListener({ url: 'https://app.milespro.net.br/promocoes?id=42' });
    await new Promise((r) => setTimeout(r, 20));
    expect(sessionStorage.getItem('returnTo')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/promocoes?id=42');
  });

  it('handles malformed URLs without crashing', async () => {
    registerDeepLinkHandler(navigate);
    mockListener({ url: 'not-a-url' });
    await new Promise((r) => setTimeout(r, 10));
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

**3.3 — Run tests:**

```bash
npm run test:unit -- src/lib/__tests__/deepLinkHandler.test.ts
```

Expected: 6 tests passing.

**3.4 — Convention enforcement:**
- TypeScript strict; no `any`
- `logger.*` not `console.*`
- Module imports `@capacitor/app` directly (Plan 03-01 installed it)
- Tests use `vi.mock` hoisting; module-level mock state via `let isNative`
- All assertions are explicit (no snapshot tests)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('src/lib/deepLinkHandler.ts','utf8'); const t=fs.readFileSync('src/lib/__tests__/deepLinkHandler.test.ts','utf8'); const required_m=[['registerDeepLinkHandler','exported function'],[\"ALLOWED_HOST_PROD = 'app.milespro.net.br'\",'prod host const'],[\"ALLOWED_HOST_DEV = 'localhost:5173'\",'dev host const'],['import.meta.env.DEV','dev gate'],['isCallbackPath','callback exception'],['sessionStorage.setItem','returnTo write'],['logger.warn','rejection logging'],['Capacitor.isNativePlatform()','web no-op']]; const required_t=[['rejects URLs with wrong host','spoof test'],['/auth/callback','callback test'],['returnTo','sessionStorage test'],['malformed URLs','error path test'],['not-a-url','malformed input test']]; let fail=false; for (const [n,w] of required_m){if(!m.includes(n)){console.error('FAIL: deepLinkHandler missing —',w);fail=true;}} for (const [n,w] of required_t){if(!t.includes(n)){console.error('FAIL: test missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: deepLinkHandler module + tests structure');"</automated>
  </verify>
  <done>
    `src/lib/deepLinkHandler.ts` exports `registerDeepLinkHandler` with strict host allowlist (prod + dev-only-when-DEV), callback exception, sessionStorage returnTo gate, logger calls. 6 vitest cases pass covering happy + spoof + malformed + session/no-session.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Create src/pages/AuthCallback.tsx + Route in App.tsx + register deepLinkHandler</name>
  <files>src/pages/AuthCallback.tsx, src/App.tsx</files>
  <read_first>
    - src/pages/LgpdConfirmDelete.tsx (analog page; 3-state pattern)
    - src/App.tsx (lines 22-82 lazy imports, 124 Route /auth, 110-117 pageview useEffect — pattern for adding the deep-link useEffect)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pattern 2: OAuth PKCE Callback Page"
    - src/lib/deepLinkHandler.ts (Task 3)
  </read_first>
  <action>
**4.1 — Create `src/pages/AuthCallback.tsx`:**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { logger } from '@/lib/logger';

type State =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; reason: string };

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Q3 RESOLVED — Password-recovery branch: Supabase Email Templates -> Reset Password
      // is configured by the operator to point at https://app.milespro.net.br/auth/callback?type=recovery
      // The URL also contains access_token + refresh_token from the recovery link.
      const type = searchParams.get('type');
      if (type === 'recovery') {
        // Hand off to /auth?reset=true; the existing recovery UI lives there (Auth.tsx line ~293 password reset form).
        // Preserve access_token + refresh_token in the URL so Supabase SDK picks them up via detectSessionInUrl.
        const accessToken = searchParams.get('access_token') ?? '';
        const refreshToken = searchParams.get('refresh_token') ?? '';
        const recoveryQS = new URLSearchParams({ reset: 'true' });
        if (accessToken) recoveryQS.set('access_token', accessToken);
        if (refreshToken) recoveryQS.set('refresh_token', refreshToken);
        if (!cancelled) {
          setState({ status: 'success' });
          navigate(`/auth?${recoveryQS.toString()}`, { replace: true });
        }
        return;
      }

      const code = searchParams.get('code');
      if (!code) {
        if (!cancelled) {
          setState({
            status: 'error',
            reason: 'Código de autenticação ausente. Tente fazer login novamente.',
          });
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          logger.error('[AuthCallback]', 'exchangeCodeForSession failed', error);
          setState({
            status: 'error',
            reason: 'Falha ao concluir autenticação. O link pode ter expirado.',
          });
          return;
        }
        if (!data.session) {
          setState({ status: 'error', reason: 'Sessão não foi criada.' });
          return;
        }

        // Consume sessionStorage('returnTo') set by deepLinkHandler when a
        // pre-auth deep-link landed. Falls back to /dashboard.
        const returnTo = sessionStorage.getItem('returnTo') ?? '/dashboard';
        sessionStorage.removeItem('returnTo');

        setState({ status: 'success' });
        // Use replace to avoid leaving the callback URL in history
        navigate(returnTo, { replace: true });
      } catch (err) {
        if (cancelled) return;
        logger.error('[AuthCallback]', 'unexpected error', err);
        setState({
          status: 'error',
          reason: 'Erro inesperado durante a autenticação. Tente novamente.',
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <div className="container mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
          <h1 className="text-2xl font-semibold">Autenticação falhou</h1>
          <p className="text-sm text-muted-foreground">{state.reason}</p>
          <Button onClick={() => navigate('/auth')} variant="default">
            Voltar para login
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'success') {
    // Brief flash before navigate replaces the route
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <div className="container mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-mp-orange-500" aria-hidden />
          <p className="text-sm">Sessão estabelecida. Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <div className="container mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-mp-orange-500" aria-hidden />
        <p className="text-sm text-muted-foreground">Concluindo autenticação...</p>
      </div>
    </div>
  );
}
```

**4.2 — Update `src/App.tsx`:**

Add lazy import alongside other lazy pages (around line 22-82):
```typescript
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
```

Add the Route INSIDE the `<Routes>` block, BEFORE the protected `/dashboard` route, NOT wrapped in `<ProtectedRoute>`:
```tsx
<Route path="/auth/callback" element={<AuthCallback />} />
```

Find the `AppRoutes` component (line 110+) where the existing pageview useEffect lives. Add a second useEffect that wires the deep-link handler:

```tsx
import { useNavigate } from 'react-router-dom';
import { registerDeepLinkHandler } from '@/lib/deepLinkHandler';

// Inside AppRoutes component, after the existing pageview useEffect:
const navigate = useNavigate();
useEffect(() => {
  return registerDeepLinkHandler(navigate);
}, [navigate]);
```

The `registerDeepLinkHandler` is a no-op on web (per Task 3), so this useEffect is safe to always run.

**4.3 — Convention enforcement:**
- TypeScript strict; State discriminated union (not `string | null | undefined`)
- `useSearchParams` + `useNavigate` from `react-router-dom`
- shadcn `Button` + `LandingHeader` for visual consistency with LgpdConfirmDelete.tsx
- pt-BR copy
- `logger.*` for diagnostic logging
- Lazy import in App.tsx (matches convention for all other page imports)
- Route NOT wrapped in ProtectedRoute (per D-T12 exception — /auth/callback IS the page that establishes auth)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const p=fs.readFileSync('src/pages/AuthCallback.tsx','utf8'); const a=fs.readFileSync('src/App.tsx','utf8'); const need_p=[['exchangeCodeForSession','PKCE exchange'],['sessionStorage.getItem','returnTo consumption'],[\"sessionStorage.removeItem('returnTo')\",'returnTo cleanup'],['replace: true','no-history navigate'],['Concluindo autenticação','loading copy pt-BR'],['Voltar para login','error CTA pt-BR']]; const need_a=[['AuthCallback','lazy import'],['\"/auth/callback\"','route path'],['registerDeepLinkHandler','listener wire']]; let fail=false; for (const [n,w] of need_p){if(!p.includes(n)){console.error('FAIL: AuthCallback missing —',w);fail=true;}} for (const [n,w] of need_a){if(!a.includes(n)){console.error('FAIL: App.tsx missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: AuthCallback + App.tsx wiring');"</automated>
  </verify>
  <done>
    `src/pages/AuthCallback.tsx` exists with 3-state UI + PKCE exchange + returnTo consumption + replace-history navigate. `src/App.tsx` lazy-imports AuthCallback, registers /auth/callback Route, calls registerDeepLinkHandler in useEffect.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Update src/pages/Auth.tsx (line 89 redirectTo) + create src/hooks/useAppleSignIn.ts + add Apple button</name>
  <files>src/pages/Auth.tsx, src/hooks/useAppleSignIn.ts</files>
  <read_first>
    - src/pages/Auth.tsx (lines 75-101 handleGoogleSignIn, line 89 redirectTo, line 293 password-reset redirect)
    - src/hooks/useIsIOSCapacitor.ts (gating hook)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"useAppleSignIn.ts"
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T03
  </read_first>
  <action>
**5.1 — Create `src/hooks/useAppleSignIn.ts`:**

```typescript
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useIsIOSCapacitor } from '@/hooks/useIsIOSCapacitor';
import { logger } from '@/lib/logger';

export interface UseAppleSignInResult {
  signInWithApple: () => Promise<void>;
  isLoading: boolean;
  /**
   * True only on iOS (Capacitor native). On web/Android, render the
   * button conditionally on this flag — never display Apple Sign-In on
   * non-iOS surfaces (D-T03: iOS-only auth provider).
   */
  isAvailable: boolean;
}

export function useAppleSignIn(): UseAppleSignInResult {
  const isAvailable = useIsIOSCapacitor();
  const [isLoading, setIsLoading] = useState(false);

  const signInWithApple = useCallback(async () => {
    if (!isAvailable) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error('[AppleSignIn]', 'signInWithOAuth failed', error);
        toast.error('Não foi possível iniciar o login com Apple. Tente novamente.');
        setIsLoading(false);
      }
      // Success: redirect handled by Supabase OAuth flow. Spinner remains
      // until the browser leaves; intentionally do NOT clear setIsLoading on success.
    } catch (err) {
      logger.error('[AppleSignIn]', 'unexpected error', err);
      toast.error('Erro inesperado durante o login com Apple.');
      setIsLoading(false);
    }
  }, [isAvailable]);

  return { signInWithApple, isLoading, isAvailable };
}
```

**5.2 — Update `src/pages/Auth.tsx` line 89 redirectTo:**

Find the existing `handleGoogleSignIn` function and change the redirectTo from `/dashboard` to `/auth/callback`:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,  // was /dashboard
  },
});
```

**5.3 — Add Apple Sign-In button in `src/pages/Auth.tsx`:**

At the top of the component:
```typescript
import { useAppleSignIn } from '@/hooks/useAppleSignIn';
// ... inside component:
const { signInWithApple, isLoading: isAppleLoading, isAvailable: isAppleAvailable } = useAppleSignIn();
```

In BOTH `<TabsContent value="login">` and `<TabsContent value="signup">`, AFTER the existing Google button JSX, BEFORE the email/password separator, add:

```tsx
{isAppleAvailable && (
  <Button
    type="button"
    variant="outline"
    className="w-full"
    onClick={signInWithApple}
    disabled={isAppleLoading || isLoading || isGoogleLoading}
  >
    {isAppleLoading ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      // Use inline SVG for Apple logo (lucide-react does NOT have one) OR
      // use the lucide-react Apple icon if introduced in future minor;
      // safe fallback: simple text mark "" (Apple's unicode logo char,
      // U+F8FF — renders blank on non-Apple devices, but isAppleAvailable
      // guarantees we're on iOS so it always renders correctly).
      <span className="mr-2 inline-block">&#xF8FF;</span>
    )}
    Continuar com Apple
  </Button>
)}
```

**5.4 — Leave line 293 password-reset redirectTo alone:**

Line 293 redirects to `/auth?reset=true` — that is a different flow (password recovery), NOT a Universal Link target. It must remain pointing at `/auth` so the recovery form renders.

**5.5 — Convention enforcement:**
- TypeScript strict; result interface explicit
- Sonner toast for user-visible errors (pt-BR)
- `logger.*` for diagnostics
- Apple button gated by `isAppleAvailable` (which is `useIsIOSCapacitor()`)
- Button text "Continuar com Apple" — pt-BR, consistent with "Continuar com Google" elsewhere
- DO NOT add an `<a href>` link inside the button (anti-steering-safe)
- `disabled` aggregates all three loading flags (Google, Apple, email/password)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const a=fs.readFileSync('src/pages/Auth.tsx','utf8'); const h=fs.readFileSync('src/hooks/useAppleSignIn.ts','utf8'); if(!a.includes(\"/auth/callback\")){console.error('FAIL: Auth.tsx redirectTo not updated to /auth/callback');process.exit(1);} if(a.includes(\"${window.location.origin}/dashboard\")){console.error('FAIL: Auth.tsx still has /dashboard redirectTo somewhere');process.exit(1);} const need_a=[['useAppleSignIn','hook imported'],['isAppleAvailable','availability flag'],['Continuar com Apple','pt-BR button copy']]; const need_h=[[\"provider: 'apple'\",'Apple provider'],['/auth/callback','redirect to callback'],['useIsIOSCapacitor','iOS gate']]; let fail=false; for (const [n,w] of need_a){if(!a.includes(n)){console.error('FAIL: Auth.tsx missing —',w);fail=true;}} for (const [n,w] of need_h){if(!h.includes(n)){console.error('FAIL: useAppleSignIn missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: Auth.tsx redirectTo + Apple button + useAppleSignIn hook');"</automated>
  </verify>
  <done>
    Auth.tsx Google OAuth redirectTo updated to /auth/callback (line 89; line 293 password-reset unchanged). useAppleSignIn hook created with isAvailable=useIsIOSCapacitor() gate. Apple button rendered in both login + signup tabs, conditional on isAppleAvailable. pt-BR copy.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Update src/contexts/AuthProvider.tsx emailRedirectTo (line ~55-61)</name>
  <files>src/contexts/AuthProvider.tsx</files>
  <read_first>
    - src/contexts/AuthProvider.tsx (lines 54-66 signUp function, line 61 emailRedirectTo)
  </read_first>
  <action>
**6.1 — Update line 55 (signUp redirectUrl):**

Change:
```typescript
const redirectUrl = `${window.location.origin}/dashboard`;
```

To:
```typescript
const redirectUrl = `${window.location.origin}/auth/callback`;
```

The signUp flow uses `emailRedirectTo` to construct the email-verify link; that link must land in AuthCallback so the PKCE exchange runs and the session is established before navigating to /dashboard.

**6.2 — DO NOT add returnTo consumption here:**

Per the planner architectural decision (see Task 3 + 4 wiring), AuthCallback.tsx is the canonical returnTo consumer. AuthProvider stays as a pure session-state holder. Adding navigate calls inside `onAuthStateChange` would create a double-navigate when both AuthCallback and AuthProvider fire on the same SIGNED_IN event.

**6.3 — Convention enforcement:**
- Single-line change; rest of file unchanged
- TypeScript strict (no shape change)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const a=fs.readFileSync('src/contexts/AuthProvider.tsx','utf8'); if(!a.includes('${window.location.origin}/auth/callback')){console.error('FAIL: AuthProvider redirectUrl not updated to /auth/callback');process.exit(1);} const dashboardRefs=(a.match(/\\$\\{window\\.location\\.origin\\}\\/dashboard/g)||[]).length; if(dashboardRefs>0){console.error('FAIL: AuthProvider still has',dashboardRefs,'/dashboard redirect(s); should be 0');process.exit(1);} console.log('OK: AuthProvider emailRedirectTo points at /auth/callback');"</automated>
  </verify>
  <done>
    AuthProvider.tsx signUp redirectUrl points at `${origin}/auth/callback`. No remaining `${origin}/dashboard` redirect strings in the file.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 7: Configure Apple Sign-In provider in Supabase Auth dashboard</name>
  <files>(none — external dashboard config; capture confirmation in .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md)</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (Apple Services ID + Key ID + .p8 path captured)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Don't Hand-Roll" — Apple Sign-In nonce/state validation row
  </read_first>
  <what-built>
    Manual Supabase Dashboard configuration. No CLI for OAuth provider setup.
  </what-built>
  <how-to-verify>
    1. Visit https://supabase.com/dashboard/project/opusftqbbaozucmbuuug/auth/providers
    2. Find the "Apple" row → toggle Enabled.
    3. Fill in:
       - **Services ID (the Service ID, NOT the App ID)**: `br.com.milespro.app.signin` (created in Plan 03-00 Task 0a step 10)
       - **Team ID**: from 03-00 runbook
       - **Key ID**: the 10-char Apple Key ID for the Sign in with Apple .p8 key (from runbook)
       - **Secret Key (PEM)**: paste the FULL contents of the .p8 file (BEGIN/END PRIVATE KEY headers included). The path is in the runbook.
       - **Redirect URL** (read-only display): confirm it shows `https://opusftqbbaozucmbuuug.supabase.co/auth/v1/callback` (this matches what we set in the Apple Services ID Return URLs in 03-00 Task 0a step 10)
    4. Save. Supabase validates the .p8 and Service ID match.
    4a. **Q3 RESOLVED — Supabase Email Template config (password recovery deep-link):**
       - Visit https://supabase.com/dashboard/project/opusftqbbaozucmbuuug/auth/templates
       - Select template: **Reset Password**
       - Update the redirect URL inside the template body. Replace the existing `{{ .SiteURL }}/auth?reset=true` (or similar) with: `{{ .SiteURL }}/auth/callback?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}`
       - Save.
       - Verify: copy the rendered template URL preview; it should match the pattern `https://app.milespro.net.br/auth/callback?type=recovery&access_token=...&refresh_token=...`
       - Rationale: Plan 03-03 Task 4 added a `?type=recovery` branch in AuthCallback.tsx that picks up these tokens and hands off to `/auth?reset=true` (where the existing password-reset form renders). The deep-link via Universal Links / App Links picks up the recovery URL the same as OAuth callbacks (the route /auth/callback is in AASA from Task 1 of this plan).
       - In the runbook (03-00-ACCOUNT-PROVISIONING-RUNBOOK.md), add under H2 `## Supabase Email Templates`:
         - `Reset Password redirect URL configured: YES — <date>`
         - `Sample recovery URL: <paste rendered preview>`
    5. Test once: from a Mac (Safari), visit `https://app.milespro.net.br/auth` → click "Continuar com Apple" → confirm the OAuth dialog appears. Cancel out (do not actually sign in yet; we have not yet built TestFlight).
    6. In `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` add a row under `## Apple Developer Program`:
       - `Supabase Apple provider configured: YES — <date>`
    7. **Defer**: Native iOS app may also need the `@capacitor-community/apple-sign-in` plugin for idToken-direct flow per RESEARCH "Pitfall 4". v1 ships with the web OAuth flow (Safari → Universal Link → /auth/callback) which works for native iOS via the same code path. Re-evaluate post-launch if Apple Review specifically flags the absence of native idToken flow.
  </how-to-verify>
  <resume-signal>
    Reply: "Supabase Apple provider configured, OAuth dialog tested OK from Safari on Mac, runbook updated."
  </resume-signal>
  <acceptance_criteria>
    - Supabase Auth → Providers shows Apple = Enabled
    - 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md has a line confirming Supabase Apple provider configured + date
    - Safari OAuth dialog tested at least once (cancel-out is fine; full sign-in deferred to TestFlight)
    - Q3 RESOLVED: Supabase Email Templates -> Reset Password redirect URL points at `https://app.milespro.net.br/auth/callback?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}` and is captured in 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md under `## Supabase Email Templates` H2
  </acceptance_criteria>
  <done>
    Supabase Auth → Apple provider enabled with Services ID + Team ID + Key ID + .p8 PEM contents. Smoke-tested from Mac Safari. Runbook updated.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 8: Add App Links intent-filter to AndroidManifest.xml + iOS Associated Domains entitlement</name>
  <files>android/app/src/main/AndroidManifest.xml, ios/App/App/App.entitlements</files>
  <read_first>
    - android/app/src/main/AndroidManifest.xml (current MainActivity block)
    - ios/App/App/App.entitlements (if exists from cap-add; create if not)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"AndroidManifest.xml MODIFICATIONS" + §"Info.plist MODIFICATIONS" (deviation re: entitlements file)
  </read_first>
  <action>
**8.1 — Update `android/app/src/main/AndroidManifest.xml`:**

Inside the existing `<activity android:name=".MainActivity">` block, ALONGSIDE the existing `<intent-filter>` for LAUNCHER, add a SECOND intent-filter:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" />
    <data android:host="app.milespro.net.br" />
    <data android:pathPrefix="/auth/callback" />
    <data android:pathPrefix="/lgpd/confirm-delete" />
    <data android:pathPrefix="/promocoes" />
</intent-filter>
```

`android:autoVerify="true"` triggers Play Protect to fetch `https://app.milespro.net.br/.well-known/assetlinks.json` at install + every 24h. Match must succeed for App Link interception.

Verify the MainActivity attributes remain:
- `android:launchMode="singleTask"` (so re-opens to the same task)
- `android:exported="true"` (Android 12+ requirement)
- `android:label="@string/title_activity_main"` (resolves to "MilesPro" per Plan 03-01)

**8.2 — Create or update `ios/App/App/App.entitlements`:**

If the file does NOT exist after `npx cap add ios`, create it. If it exists, append the entitlement.

Expected final content (preserve any existing entitlements like Sign in with Apple):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.associated-domains</key>
  <array>
    <string>applinks:app.milespro.net.br</string>
  </array>
  <key>aps-environment</key>
  <string>development</string>
  <key>com.apple.developer.applesignin</key>
  <array>
    <string>Default</string>
  </array>
</dict>
</plist>
```

Notes:
- `applinks:app.milespro.net.br` is the Universal Link associated domain (no port, no path)
- `aps-environment` enables APNs (`development` for sandbox; flip to `production` after first Production build — Plan 03-07 reminder)
- `applesignin` enables Sign in with Apple capability (Plan 03-00 created the App ID with this capability; entitlement file is the runtime mirror)
- Xcode usually generates this file when capabilities are toggled in the UI; if `npx cap add ios` did not create it, we create it directly here so the Plan 03-07 archive step succeeds

**8.3 — Verify pbxproj reference (optional — manual):**

After committing the entitlements file, when the founder opens Xcode in Plan 03-07, they may need to drag `App.entitlements` into the App target → Signing & Capabilities → "+ Capability" → Associated Domains, then ensure the entitlements file path is referenced in the target Build Settings (CODE_SIGN_ENTITLEMENTS). Some Capacitor versions wire this automatically; verify and fix in Plan 03-07 if missing.

**8.4 — Convention enforcement:**
- XML 2-space indent matches Android/iOS conventions
- `applinks:` prefix MANDATORY (just the host without prefix breaks AASA matching)
- No trailing whitespace
- iOS plist DOCTYPE preserved
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8'); const ent=fs.existsSync('ios/App/App/App.entitlements')?fs.readFileSync('ios/App/App/App.entitlements','utf8'):''; const need_m=[['android:autoVerify=\"true\"','autoVerify on'],['android:host=\"app.milespro.net.br\"','host literal'],['android:pathPrefix=\"/auth/callback\"','callback path'],['android:pathPrefix=\"/lgpd/confirm-delete\"','lgpd path'],['android:pathPrefix=\"/promocoes\"','promocoes path']]; const need_e=[['com.apple.developer.associated-domains','associated-domains key'],['applinks:app.milespro.net.br','applinks value'],['aps-environment','APNs entitlement'],['com.apple.developer.applesignin','Sign in with Apple entitlement']]; let fail=false; for (const [n,w] of need_m){if(!m.includes(n)){console.error('FAIL: AndroidManifest missing —',w);fail=true;}} if(!ent){console.error('FAIL: ios/App/App/App.entitlements does not exist');fail=true;}else{for (const [n,w] of need_e){if(!ent.includes(n)){console.error('FAIL: App.entitlements missing —',w);fail=true;}}} if(fail)process.exit(1); console.log('OK: Android intent-filter + iOS entitlements');"</automated>
  </verify>
  <done>
    AndroidManifest.xml has the App Links intent-filter with autoVerify=true + host + 3 pathPrefixes. ios/App/App/App.entitlements has associated-domains + aps-environment + applesignin keys.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 9: Create scripts/smoke-deeplinks.sh + CI workflow for post-deploy verification</name>
  <files>scripts/smoke-deeplinks.sh, .github/workflows/smoke-deeplinks.yml</files>
  <read_first>
    - scripts/check-ios-strings.sh (Plan 03-02 — pattern for shell-based CI scripts)
    - .github/workflows/check-ios-strings.yml (Plan 03-02 — workflow template)
    - .planning/phases/03-mobile-distribution-launch/03-VALIDATION.md (MOBILE-03 row — AASA + assetlinks structural smoke)
  </read_first>
  <action>
**9.1 — Create `scripts/smoke-deeplinks.sh`:**

```bash
#!/usr/bin/env bash
# Post-deploy smoke for AASA + assetlinks endpoints.
# Verifies:
#   1. https://app.milespro.net.br/.well-known/apple-app-site-association returns:
#      - HTTP 200
#      - Content-Type: application/json
#      - valid JSON with applinks.details[0].appIDs[0] matching pattern
#   2. https://app.milespro.net.br/.well-known/assetlinks.json returns:
#      - HTTP 200
#      - valid JSON array with target.package_name === 'br.com.milespro.app'

set -euo pipefail

DOMAIN="${DOMAIN:-app.milespro.net.br}"
BASE_URL="https://${DOMAIN}/.well-known"

echo "→ Smoking AASA + assetlinks on https://${DOMAIN}"

# --- AASA ---
AASA_URL="${BASE_URL}/apple-app-site-association"
echo "  Fetching ${AASA_URL}"
AASA_RESPONSE=$(curl -sSL -w '\n---STATUS:%{http_code}---\nCTYPE:%{content_type}\n' "${AASA_URL}")
AASA_STATUS=$(echo "$AASA_RESPONSE" | grep -oE 'STATUS:[0-9]+' | cut -d: -f2)
AASA_CTYPE=$(echo "$AASA_RESPONSE" | grep -oE 'CTYPE:[^[:space:]]+' | cut -d: -f2)
AASA_BODY=$(echo "$AASA_RESPONSE" | sed -e 's/---STATUS:.*$//' -e 's/---CTYPE:.*$//')

if [ "$AASA_STATUS" != "200" ]; then
  echo "FAIL: AASA returned HTTP ${AASA_STATUS}" >&2
  exit 1
fi

if ! echo "$AASA_CTYPE" | grep -q 'application/json'; then
  echo "FAIL: AASA Content-Type is '${AASA_CTYPE}' (expected application/json)" >&2
  exit 1
fi

AASA_APPID=$(echo "$AASA_BODY" | jq -r '.applinks.details[0].appIDs[0] // empty')
if [ -z "$AASA_APPID" ]; then
  echo "FAIL: AASA payload missing applinks.details[0].appIDs[0]" >&2
  echo "$AASA_BODY" >&2
  exit 1
fi

if ! echo "$AASA_APPID" | grep -qE '^[A-Z0-9]{10}\.br\.com\.milespro\.app$'; then
  echo "FAIL: AASA appID '${AASA_APPID}' does not match TEAMID.br.com.milespro.app" >&2
  exit 1
fi
echo "  ✔ AASA OK — appID=${AASA_APPID}"

# --- assetlinks ---
AL_URL="${BASE_URL}/assetlinks.json"
echo "  Fetching ${AL_URL}"
AL_RESPONSE=$(curl -sSL -w '\n---STATUS:%{http_code}---\n' "${AL_URL}")
AL_STATUS=$(echo "$AL_RESPONSE" | grep -oE 'STATUS:[0-9]+' | cut -d: -f2)
AL_BODY=$(echo "$AL_RESPONSE" | sed -e 's/---STATUS:.*$//')

if [ "$AL_STATUS" != "200" ]; then
  echo "FAIL: assetlinks returned HTTP ${AL_STATUS}" >&2
  exit 1
fi

AL_PKG=$(echo "$AL_BODY" | jq -r '.[0].target.package_name // empty')
if [ "$AL_PKG" != "br.com.milespro.app" ]; then
  echo "FAIL: assetlinks package_name is '${AL_PKG}' (expected br.com.milespro.app)" >&2
  exit 1
fi

AL_FP_COUNT=$(echo "$AL_BODY" | jq '.[0].target.sha256_cert_fingerprints | length')
if [ "$AL_FP_COUNT" -lt 1 ]; then
  echo "FAIL: assetlinks sha256_cert_fingerprints array empty" >&2
  exit 1
fi
echo "  ✔ assetlinks OK — package=${AL_PKG}, fingerprints=${AL_FP_COUNT}"

echo "OK: deep-link smoke complete"
exit 0
```

**9.2 — Make executable:**
```bash
chmod +x scripts/smoke-deeplinks.sh
```

**9.3 — Create `.github/workflows/smoke-deeplinks.yml`:**

```yaml
name: Smoke Deep Links (post-deploy)

on:
  workflow_dispatch:
  # Run on every push to main AFTER the deploy completes — Vercel auto-deploys on push to main
  # so we wait ~90s then probe (Vercel deploy is usually faster but this is the safe margin)
  push:
    branches: [main]
    paths:
      - 'public/.well-known/**'
      - 'vercel.json'

jobs:
  smoke:
    name: Smoke AASA + assetlinks endpoints
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install jq
        run: sudo apt-get install -y jq

      - name: Wait for Vercel deploy (90s)
        run: sleep 90

      - name: Run smoke
        run: bash scripts/smoke-deeplinks.sh
        env:
          DOMAIN: app.milespro.net.br
```

**9.4 — Convention enforcement:**
- POSIX-compatible bash
- `set -euo pipefail`
- `curl -sSL` (silent, show errors, follow redirects)
- `jq` for JSON shape checks
- HTTP status + content-type both validated for AASA (per Pitfall 1 from RESEARCH: Apple CDN rejects wrong content-type)
- `workflow_dispatch` allows manual re-run from GitHub UI
- The 90s sleep is a defense against the race between the GH Actions check running before Vercel finishes deploying
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('scripts/smoke-deeplinks.sh','utf8'); const y=fs.readFileSync('.github/workflows/smoke-deeplinks.yml','utf8'); const need_s=[['apple-app-site-association','AASA URL'],['assetlinks.json','assetlinks URL'],['application/json','content-type check'],['br.com.milespro.app','package validation'],['jq','jq usage'],['HTTP ${AASA_STATUS}','status code check']]; const need_y=[['smoke-deeplinks','workflow name'],['workflow_dispatch','manual trigger'],['public/.well-known/','path filter'],['vercel.json','vercel.json path filter'],['sleep 90','vercel deploy wait']]; let fail=false; for (const [n,w] of need_s){if(!s.includes(n)){console.error('FAIL: smoke script missing —',w);fail=true;}} for (const [n,w] of need_y){if(!y.includes(n)){console.error('FAIL: workflow missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: smoke-deeplinks script + workflow');"</automated>
  </verify>
  <done>
    scripts/smoke-deeplinks.sh exists + executable + validates HTTP 200 + Content-Type + JSON shape for both AASA + assetlinks. .github/workflows/smoke-deeplinks.yml triggers on push to main + workflow_dispatch.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Apple CDN ↔ Production AASA | Apple fetches AASA once at install + periodic refresh; bad payload locks devices for up to 1 week |
| Google Play Protect ↔ Production assetlinks.json | Play Protect fetches at install + every 24h; bad fingerprint silently fails App Links |
| Capacitor App.appUrlOpen ↔ React Router | Untrusted URL crosses this boundary; host validation is the chokepoint |
| OAuth provider (Google/Apple) ↔ AuthCallback | PKCE code from URL search params is exchanged server-side; no plaintext token in URL |
| Supabase Auth (Apple provider) ↔ Apple Sign-In flow | Supabase validates the idToken against Apple's JWKS server-side |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-02 | Spoofing | A malicious page tricks the user into tapping a Universal Link with a spoofed host, attempting to route the victim's PKCE code to an attacker's clone of our app | mitigate | `src/lib/deepLinkHandler.ts` validates `url.host === 'app.milespro.net.br'` (production) before any navigation. Tests in Task 3 cover spoofed-host rejection. Supabase Auth's PKCE state validation (server-side) is the secondary defense — even if a host-spoof bypassed our handler, the code-state mismatch would fail at exchange. |
| T-3-02b | Spoofing | Universal Link spoofs the dev branch (`localhost:5173`) at build time | mitigate | Dev host allowlist gated by `import.meta.env.DEV`; production bundle has zero references to `localhost:5173` after Vite tree-shake of the const branch. Verified by Task 3 unit tests + a final `grep` in production bundle. |
| T-3-02c | Information Disclosure | AASA payload accidentally lists too many components (e.g., `/assinatura*` per D-T09 explicit exclusion) → iOS app intercepts pricing URLs from outside, opens to a route that does not exist or that breaks Path C | mitigate | AASA components in Task 1 strictly listed: only `/auth/callback*`, `/lgpd/confirm-delete*`, `/promocoes*`. Verification at Task 1 enforces these three components exactly. |
| T-3-02d | Tampering | A future PR changes `ALLOWED_HOST_PROD` from `app.milespro.net.br` to a wider pattern (`*.milespro.net.br`) | accept (code review) | Constant string match enforced by Task 3 tests. Wider patterns would fail the unit tests that assert `attacker.example.com` rejection. |
| T-3-02e | Denial of Service | AASA CDN cache traps a wrong payload (per RESEARCH Pitfall 1) | mitigate | Task 9 smoke-deeplinks.sh probes the production AASA after every deploy + validates shape. If a wrong payload deploys, the smoke fails within minutes (vs. waiting for a TestFlight reviewer to discover). The `cache-bust` query trick (`?bust=1`) from RESEARCH is documented in Task 9 inline comments. |
| T-3-02f | Spoofing | Android assetlinks signed with wrong fingerprint (Play App Signing vs. Upload Key — RESEARCH Pitfall 2) | mitigate | Task 1 enforces BOTH fingerprints in `sha256_cert_fingerprints` array. Internal Testing builds (signed with upload key) and Production builds (re-signed by Play with App Signing key) both verify. |
</threat_model>

<verification>
After all 9 tasks complete:

```bash
# 1. Static files committed
test -f public/.well-known/apple-app-site-association
test -f public/.well-known/assetlinks.json

# 2. vercel.json extended
grep -E 'well-known' vercel.json

# 3. deepLinkHandler tests green
npm run test:unit -- src/lib/__tests__/deepLinkHandler.test.ts

# 4. Auth.tsx + AuthProvider redirectTo updated
grep -c '/auth/callback' src/pages/Auth.tsx src/contexts/AuthProvider.tsx
# Expected: at least 2 hits (one in each file)

# 5. AuthCallback Route in App.tsx
grep -E 'AuthCallback|/auth/callback' src/App.tsx

# 6. Apple hook + button
test -f src/hooks/useAppleSignIn.ts
grep -E 'Continuar com Apple' src/pages/Auth.tsx

# 7. Native config
grep -E 'autoVerify="true"|applinks:app.milespro.net.br' android/app/src/main/AndroidManifest.xml ios/App/App/App.entitlements

# 8. CI smoke
test -x scripts/smoke-deeplinks.sh

# 9. Full unit suite green (regression)
npm run test:unit

# 10. Lint + typecheck
npm run lint && npm run typecheck

# 11. Post-deploy smoke (manual, after merge to main + Vercel deploy)
bash scripts/smoke-deeplinks.sh
# Expected: "OK: deep-link smoke complete"
```
</verification>

<success_criteria>
- AASA + assetlinks committed, both valid JSON, TEAMID + 2 SHA-256 fingerprints non-placeholder
- vercel.json rewrites exclude `.well-known/`, headers set Content-Type=application/json for `.well-known/*`
- deepLinkHandler with strict host allowlist + 6 vitest cases passing
- AuthCallback page implements PKCE exchange + returnTo consumption
- Auth.tsx Google + Apple OAuth buttons; Apple gated by useIsIOSCapacitor; both redirectTo /auth/callback
- AuthProvider emailRedirectTo → /auth/callback
- AndroidManifest intent-filter autoVerify=true with 3 pathPrefixes
- iOS App.entitlements has associated-domains + aps-environment + applesignin
- Supabase Apple provider configured in dashboard
- scripts/smoke-deeplinks.sh + CI workflow validate production AASA + assetlinks endpoints
- Full unit suite green (113 + 6 new + 8 from Plan 03-02 = 127+)
- `npm run lint && npm run typecheck` pass
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-03-SUMMARY.md` documenting:
- AASA + assetlinks payloads (with TEAM_ID + fingerprints substituted) — for future debugging reference
- Supabase Auth Apple provider config date
- Any deviation in entitlements file (e.g., aps-environment had to be flipped to production earlier than planned)
- Smoke check first-run results
- Reminder for Plan 03-04: enqueue-push deep_link_path values must align with the 3 components in AASA (`/auth/callback`, `/lgpd/confirm-delete`, `/promocoes`) — adding a new push deep-link target requires AASA + assetlinks redeploy + 24h Apple CDN refresh
</output>