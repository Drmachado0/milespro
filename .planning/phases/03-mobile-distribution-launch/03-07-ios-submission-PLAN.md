---
phase: 03-mobile-distribution-launch
plan: 07
type: execute
wave: 3
depends_on: ["01", "02", "03", "04", "05", "06"]
files_modified:
  - ios/App/App/Info.plist
  - ios/App/App/App.entitlements
  - ios/App/App.xcodeproj/project.pbxproj
  - .planning/phases/03-mobile-distribution-launch/03-07-APP-STORE-CONNECT-RUNBOOK.md
  - .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md
  - .planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md
  - .planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md
autonomous: false
requirements: [LAUNCH-02, MOBILE-01, MOBILE-04, MOBILE-05]
tags: [ios, app-store-connect, testflight, path-c, multiplatform-services-exemption, 3-1-3-b, sign-in-with-apple, privacy-nutrition-labels, archive, submission]
must_haves:
  truths:
    - "ios/App/App/Info.plist has only required NS*UsageDescription keys (NSUserNotificationsUsageDescription for push; nothing else unless code uses it) — T-3-04 mitigation"
    - "ios/App/App/Info.plist has CFBundleVersion (build number) starting at 1 and CFBundleShortVersionString '1.0.0' matching Android versionName for consistency"
    - "ios/App/App/Info.plist has UIBackgroundModes = ['remote-notification'] for push background delivery"
    - "ios/App/App/Info.plist has ITSAppUsesNonExemptEncryption = false (we use HTTPS only, no custom crypto — Apple export-compliance fast path)"
    - "ios/App/App/App.entitlements (from Plan 03-03 Task 8) has associated-domains:applinks:app.milespro.net.br + aps-environment + applesignin — verified intact"
    - "03-07-APP-PRIVACY-NUTRITION-LABELS.md captures the App Store Connect Privacy Nutrition Labels — derived from Privacidade.tsx §5 + Play Data Safety form (Plan 03-06 Task 3) for consistency; T-3-04 Privacy Manifest mismatch mitigation"
    - "03-07-APP-REVIEW-SUBMISSION-NOTES.md cites Apple App Review Guideline 3.1.3(b) Multiplatform Services exemption VERBATIM + demo flow + test credentials placeholder + explicit web checkout URL for reviewer transparency (MOBILE-05 verbatim per ROADMAP CRIT-03 prevention)"
    - "03-07-TESTFLIGHT-WALKTHROUGH.md captures the founder's manual walkthrough of the TestFlight build verifying NO pricing UI is visible on iOS (cycle-level kill switch — ROADMAP §Test invocation matrix #3)"
    - "03-07-APP-STORE-CONNECT-RUNBOOK.md captures the full Xcode archive → TestFlight → App Review submission flow with sandbox tester credentials referenced from Plan 03-00"
    - "G-CRIT-03 gate (Plan 03-02) is re-run AFTER `npx cap sync ios` and BEFORE archive upload — captured in 03-07-APP-STORE-CONNECT-RUNBOOK.md as a hard prerequisite step"
    - "Q5 RESOLVED — AASA CDN propagation gate: at least 48 hours MUST elapse between the AASA file being deployed to Vercel (Plan 03-03 Task 1+2 → 03-03-SUMMARY.md timestamp) AND the first TestFlight build being submitted to App Review. Apple's CDN (`app-site-association.cdn-apple.com`) caches the AASA payload at install time + periodic refresh; if Apple Reviewer's test devices fetched a stale or absent AASA from before our deploy, Universal Link verification fails and submission may be rejected. The 48h window covers Apple CDN edge propagation + reviewer device install. 03-07-APP-STORE-CONNECT-RUNBOOK.md Step 0 enforces this as a hard prerequisite — operator captures the AASA-deploy timestamp from 03-03-SUMMARY.md and the current timestamp; arithmetic must show >=48h elapsed before continuing to archive."
    - "[BLOCKING] founder action sequence: (a) `npx cap sync ios`; (b) open Xcode → archive → upload to TestFlight; (c) wait for processing (~30min); (d) invite 5 TestFlight testers; (e) execute walkthrough per 03-07-TESTFLIGHT-WALKTHROUGH.md; (f) submit for App Review with submission notes; (g) wait for Apple review (1-3 days typical, longer if rejection); (h) if rejected with 3.1.1 reference → escalate as CRIT-03; (i) once approved, capture App Store URL in runbook"
  artifacts:
    - path: ios/App/App/Info.plist
      provides: "Privacy keys minimum-set + background modes + export compliance + version"
      contains: "UIBackgroundModes"
    - path: .planning/phases/03-mobile-distribution-launch/03-07-APP-STORE-CONNECT-RUNBOOK.md
      provides: "Xcode archive → upload → TestFlight → App Review founder runbook"
      contains: "TestFlight"
    - path: .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md
      provides: "Verbatim 3.1.3(b) citation + demo flow for App Reviewer"
      contains: "3.1.3(b)"
    - path: .planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md
      provides: "Apple App Privacy nutrition labels (1:1 with Play Data Safety form)"
      contains: "Privacy"
    - path: .planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md
      provides: "Founder-conducted manual walkthrough confirming zero pricing UI on iOS"
      contains: "Path C"
  key_links:
    - from: "Plan 03-00 Apple Team ID + Sandbox Tester credentials"
      to: "App Store Connect → App Review submission"
      via: "submission notes references demo creds"
      pattern: "Sandbox Tester"
    - from: "Plan 03-02 scripts/check-ios-strings.sh"
      to: "Pre-archive G-CRIT-03 gate"
      via: "bash scripts/check-ios-strings.sh ; if exit non-zero → STOP archive"
      pattern: "check-ios-strings.sh"
---

<objective>
Ship the iOS app to App Store under Path C (Multiplatform Services exemption per Apple App Review Guideline 3.1.3(b)). LAUNCH-02 + MOBILE-01 + MOBILE-05 are the requirements; ROADMAP §Phase 3 SC#1 specifies the verifiable acceptance: zero pricing UI in the iOS bundle + reviewer-approved submission notes citing 3.1.3(b).

Purpose: D-T13 mandated Android-first so iOS submission lands AFTER Plan 03-06 production approval — gives us a green Android baseline that demonstrates the product works before Apple Reviewer (who has higher rejection rates) sees the build. CRIT-03 is the cycle-level risk: a single missed Path C wrapper anywhere = App Store rejection citing 3.1.1 anti-steering. This plan re-runs Plan 03-02's `strings | grep` gate as a hard pre-archive step, executes a TestFlight manual walkthrough to confirm visually, then submits with verbatim 3.1.3(b) citation. The submission notes are the single most important deliverable here — reviewer reads them first.

Output: Info.plist hardening + 4 founder runbooks (App Store Connect flow, App Review notes, Privacy Nutrition Labels, TestFlight walkthrough). Wave 3, last by design (Android approval evidence supports iOS reviewer confidence).
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
@.planning/phases/03-mobile-distribution-launch/03-VALIDATION.md
@.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
@.planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md
@src/pages/Privacidade.tsx
@ios/App/App/Info.plist
@scripts/check-ios-strings.sh

<interfaces>
**Consumes:**
- Plan 03-00: Apple Team ID + Sandbox Tester credentials + App ID + Sign in with Apple .p8 + APNs .p8 (already uploaded to Firebase)
- Plan 03-01: ios/ directory created via `npx cap add ios` with bundle ID br.com.milespro.app, app icons generated via @capacitor/assets, Info.plist CFBundleDisplayName=MilesPro
- Plan 03-03: ios/App/App/App.entitlements has associated-domains:applinks:app.milespro.net.br + aps-environment + applesignin
- Plan 03-02: scripts/check-ios-strings.sh G-CRIT-03 gate
- Plan 03-06: Privacy Nutrition Labels source (reuse the Play Data Safety form as the basis for Apple's nutrition labels)

**Host requirement:**
This plan REQUIRES macOS + Xcode (Apple-only constraint). If the founder is on Windows, the iOS work happens on:
- A rented Mac (mac-in-cloud.com, MacStadium — $20-40/mo)
- GitHub Actions macOS runner (xcodebuild + altool)
- Borrowed/owned Mac
RESEARCH §"Environment Availability" already flagged this; this plan inherits the constraint.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Harden ios/App/App/Info.plist (NS* minimum set, BackgroundModes, export compliance, version)</name>
  <files>ios/App/App/Info.plist</files>
  <read_first>
    - ios/App/App/Info.plist (current — Plan 03-01 set CFBundleDisplayName; Plan 03-03 added associated-domains via App.entitlements)
    - .planning/phases/03-mobile-distribution-launch/03-PATTERNS.md §"Info.plist MODIFICATIONS"
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md (T-3-04 Privacy Manifest mismatch)
  </read_first>
  <action>
**1.1 — Update `ios/App/App/Info.plist`** with the following keys (preserve existing structure; add/modify as listed):

```xml
<!-- Display name (already set by Plan 03-01) -->
<key>CFBundleDisplayName</key>
<string>MilesPro</string>

<!-- Bundle identifier (set by Xcode + Capacitor) -->
<key>CFBundleIdentifier</key>
<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>

<!-- Version (semver) — must match Android versionName -->
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>

<!-- Build number — increment per TestFlight upload, NOT per Apple Review submission -->
<key>CFBundleVersion</key>
<string>1</string>

<!-- Push notifications: background mode -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>

<!-- Push permission prompt copy (D-T07 — keep aligned with PushPermissionPrompt UI from Plan 03-05) -->
<key>NSUserNotificationsUsageDescription</key>
<string>Avisar você sobre vencimentos de milhas e promoções de transferência.</string>

<!-- Export compliance fast-path — we use HTTPS only, no custom crypto -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- LSApplicationQueriesSchemes — Capacitor cap-add usually has 'mailto', 'tel' etc.
     Preserve whatever cap-add put there; DO NOT add 'whatsapp' or 'fb-messenger'. -->

<!-- App Transport Security — Capacitor 7 default is HTTPS-only; we preserve.
     DO NOT set NSAllowsArbitraryLoads=true (would trigger reviewer warning + T-3-04c). -->
```

**1.2 — Audit `NS*UsageDescription` keys via grep:**

```bash
grep -E '<key>NS[A-Z][a-zA-Z]+UsageDescription</key>' ios/App/App/Info.plist
```

Review every match against the actual app feature set. Remove any that do not correspond to a real Capacitor plugin in package.json. Common offenders from cap-add scaffolding:
- `NSCameraUsageDescription` — keep ONLY if `@capacitor/camera` is in package.json
- `NSPhotoLibraryUsageDescription` — keep ONLY if `@capacitor/camera` or photo picker is used
- `NSLocationWhenInUseUsageDescription` — keep ONLY if `@capacitor/geolocation` is used
- `NSContactsUsageDescription` — keep ONLY if `@capacitor/contacts` is used
- `NSMicrophoneUsageDescription` — keep ONLY if voice/audio recording is used

For this project (v1), the ONLY required NS*UsageDescription is `NSUserNotificationsUsageDescription`. Remove all others.

**1.3 — Verify App.entitlements unchanged from Plan 03-03:**

```bash
grep -E 'associated-domains|aps-environment|applesignin' ios/App/App/App.entitlements
```

Expected: 3 matches. If any are missing, surface as a Plan 03-03 gap.

**1.4 — Convention enforcement:**
- XML 2-space indent, plist DOCTYPE preserved
- CFBundleVersion is a string ("1"), not an int
- CFBundleShortVersionString matches Android `versionName` for cross-platform consistency
- ITSAppUsesNonExemptEncryption=false enables Apple's export-compliance fast-path (no annual self-certification needed)
- Minimum NS* keys = T-3-04 mitigation
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const p=fs.readFileSync('ios/App/App/Info.plist','utf8'); const req=[['CFBundleDisplayName','display name'],['<string>MilesPro</string>','app name value'],['CFBundleShortVersionString','version key'],['<string>1.0.0</string>','version value matches android'],['UIBackgroundModes','background modes'],['remote-notification','push background'],['ITSAppUsesNonExemptEncryption','export compliance key'],['NSUserNotificationsUsageDescription','push permission copy']]; const banned=[['NSAllowsArbitraryLoads','no ATS bypass'],['NSCameraUsageDescription','no camera if not used'],['NSContactsUsageDescription','no contacts if not used']]; let fail=false; for (const [n,w] of req){if(!p.includes(n)){console.error('FAIL: Info.plist missing —',w);fail=true;}} for (const [n,w] of banned){if(p.includes(n)){console.error('WARN: '+w+' present — verify the corresponding Capacitor plugin is actually used; remove if not');}} if(fail)process.exit(1); console.log('OK: Info.plist hardening');"</automated>
  </verify>
  <done>
    Info.plist has minimum-set NS* keys (only NSUserNotificationsUsageDescription), UIBackgroundModes=[remote-notification], ITSAppUsesNonExemptEncryption=false, CFBundleShortVersionString=1.0.0, CFBundleVersion=1, CFBundleDisplayName=MilesPro. Camera/Contacts/Location keys removed if previously present and not actually used.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write App Privacy Nutrition Labels (1:1 with Play Data Safety + Privacidade.tsx)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md</files>
  <read_first>
    - src/pages/Privacidade.tsx §5
    - .planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md (Plan 03-06 — Play form; SAME data, different framing)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pitfall 6"
  </read_first>
  <action>
**2.1 — Create `.planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md`:**

```markdown
# App Store Connect — App Privacy Nutrition Labels

**Generated:** <date>
**Source of truth:** `src/pages/Privacidade.tsx` §5 sub-processors. Cross-checked against Plan 03-06 Play Data Safety form for consistency.

Apple's framework groups data into broader categories with three flags per category:
- **Used to Track You** — does the data leave the app + match against other data for advertising/identity? Always NO for MilesPro.
- **Linked to You** — is the data tied to the user's identity?
- **Not Linked to You** — anonymous data.

---

## Categories (App Privacy → Data)

### Contact Info — Linked to You (used for: App Functionality, Analytics)

- [x] Email Address (Supabase Auth + Resend transactional)
- [x] Name (`profiles.full_name`)
- [ ] Phone Number — NOT collected
- [ ] Physical Address — NOT collected
- [ ] Other User Contact Info — NOT collected

### Health & Fitness — NONE

### Financial Info — Linked to You (used for: App Functionality)

- [x] Payment Info — we store Asaas `customer_id` reference, NOT card numbers. Cards are at Asaas (PCI DSS BR).
- [x] Other Financial Info — subscription state (Pro/VIP/Free) and program balance entries (user-owned)
- [ ] Credit Info — NOT collected (Asaas does this)

### Location — NONE

- [ ] Precise Location — NOT collected
- [ ] Coarse Location — NOT declared as collected by the app. IP-based geo-inference at Supabase/Vercel layer is infrastructure data not surfaced to the app.

### Sensitive Info — Linked to You (used for: App Functionality)

- [x] National ID (CPF — required by Asaas for NFS-e issuance + LGPD identity verification)
- [ ] Racial / ethnic data — NOT collected
- [ ] Sexual orientation — NOT collected
- [ ] Other sensitive info — NOT collected

### Contacts — NONE
### User Content — Linked to You (used for: App Functionality)

- [ ] Emails or Text Messages — NOT collected
- [ ] Photos or Videos — NOT collected
- [ ] Audio Data — NOT collected
- [x] Customer Support — Crisp chat content (consent-gated by marketing consent per LGPD Art. 8 §4)
- [x] Other User Content — Programa configurations, balance entries (user's own data, displayed to them)

### Browsing History — NONE
### Search History — NONE

### Identifiers — Linked to You (used for: App Functionality, Analytics)

- [x] User ID (UUID from `auth.users.id`)
- [ ] Device ID — NOT collected. We do NOT use IDFA. Capacitor `device_id` is not stored.

### Purchases — Linked to You (used for: App Functionality, Analytics)

- [x] Purchase History (subscription state changes)

### Usage Data — Linked to You (used for: Analytics) — Consent Gated

- [x] Product Interaction (PostHog events — consent required per LGPD; opt_out_capturing_by_default=true)
- [ ] Advertising Data — NONE (no ads)
- [ ] Other Usage Data — NONE

### Diagnostics — Linked to You (used for: App Functionality, Analytics)

- [x] Crash Data (Sentry — user.id only, no email/CPF/name; PII scrubbed via beforeSend per Plan 02-03)
- [x] Performance Data (Sentry 10% trace sample)
- [ ] Other Diagnostic Data — NONE

### Other Data Types — NONE

---

## Third Parties (where data is shared)

Same as Play Data Safety (Plan 03-06):

| Partner | Data Shared | Apple "Used for Tracking"? | Linked to user? |
|---------|-------------|--------------------------|----------------|
| Asaas (gateway, BR) | Email, Name, CPF, Phone, Payment Method | NO | YES |
| PostHog Cloud EU | UUID + interaction events (consent) | NO | YES |
| Sentry | UUID + crash logs (PII scrubbed) | NO | YES |
| Resend | Email + Name | NO | YES |
| Crisp (EU) | UUID + email + name + chat | NO | YES |
| Supabase (US-east-1 + SCC) | All operational data | NO | YES |

---

## Approval Checklist

Before publishing App Privacy in App Store Connect:
- [ ] Every category row matches an actual Capacitor plugin OR an actual code path
- [ ] No "Used to Track You" entries (we do not use IDFA; PostHog identify is user.id UUID only)
- [ ] Privacy Policy URL set to `https://app.milespro.net.br/privacidade`
- [ ] LGPD-specific note in app description: "Em conformidade com a LGPD. Política de privacidade completa em milespro.net.br/privacidade."
```

**2.2 — Convention enforcement:**
- 1:1 with Plan 03-06 Play form (consistency between stores)
- 1:1 with Privacidade.tsx §5 (single source of truth)
- "Used to Track You" = NO universally (we don't use IDFA; product analytics on user.id only)
- Audit checklist before form submission
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md','utf8'); const req=[['Email Address','contact email'],['CPF','national id'],['Payment Info','financial'],['Customer Support','user content / crisp'],['User ID (UUID','identifiers'],['Product Interaction (PostHog','usage data'],['Crash Data (Sentry','diagnostics'],['Used to Track You','tracking framework'],['NOT collected','explicit NO entries'],['privacidade','privacy policy link']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: privacy nutrition labels missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: App Privacy Nutrition Labels');"</automated>
  </verify>
  <done>
    03-07-APP-PRIVACY-NUTRITION-LABELS.md captures every App Store Connect Privacy category with explicit YES/NO + "Used for" tags + sub-processor list matching Play form + Privacidade.tsx.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write App Review Submission Notes (3.1.3(b) verbatim citation)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md (Path C decision history)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md (CRIT-03 mitigation: 3.1.3(b) citation + demo creds + checkout web URL outside the app)
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (Sandbox Tester credentials)
  </read_first>
  <action>
**3.1 — Create `.planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md`:**

```markdown
# App Review Submission Notes — MilesPro v1.0.0 (build 1)

**Submitted to App Store Connect:** <date>
**Locale:** pt-BR (primary) / en-US (secondary)

---

Dear App Review Team,

MilesPro is a financial management tool for Brazilian users to track their airline miles and rewards points across multiple loyalty programs (Smiles, TudoAzul, LATAM Pass, Livelo, Esfera, and others). The service is offered as a B2C SaaS via our website at `https://milespro.net.br`. The iOS app is a **Multiplatform Services client** under App Store Review Guideline **3.1.3(b)** (Multiplatform Services exemption).

## Multiplatform Services Exemption Statement

Per Guideline 3.1.3(b):

> The Multiplatform Services exemption permits an app to provide access to features and content that have been purchased outside of the app, including via the developer's website, on multiple platforms or devices. Apps offering these services must NOT direct users to a purchasing mechanism that is not the App Store.

MilesPro provides access to features that have been purchased on our website (`https://milespro.net.br/assinatura`). The iOS app **does NOT contain any pricing UI, purchase buttons, or links to external checkout URLs**. Account creation and sign-in flows are present (free-tier UI). Paid features (Pro and VIP tiers) are accessible to users who have already subscribed via the web; the iOS app reads the subscription state from our backend and unlocks features accordingly.

We are NOT using the App Store IAP system. We are NOT directing users from inside the app to a purchasing mechanism. This matches the exemption shape that companies like Netflix, Spotify (reader app variant), Kindle, and others operate under.

## Demo Flow for Review

1. **Sign in with the test credentials provided below.**
2. The signed-in account is on the **Pro** tier (already paid via the web). The reviewer will see the full feature set as it is presented to a paying customer.
3. Browse the app:
   - Dashboard with airline miles balances per program (`/dashboard`)
   - Promotions feed (Pro feature — `/promocoes`)
   - Program details with expiry tracking
   - Settings / profile (`/configuracoes`)
4. **Observe**: NO pricing displayed anywhere. NO "Upgrade" buttons. NO checkout buttons. NO links to external purchase URLs. The Assinatura screen says "Sua assinatura MilesPro é gerenciada pelo navegador web em milespro.net.br" (no clickable link).
5. **Sign out and try as a Free user**:
   - Create a new account via email or Sign in with Apple
   - Limited to 3 programas / 5 contas
   - Same Path C compliance: no upgrade UI, no checkout link

## Test Credentials (Sandbox Tester from Apple Developer Console)

- **Email**: <sandbox-tester-email from Plan 03-00 runbook>
- **Password**: <password from password manager>
- This account is pre-provisioned with Pro tier so all paid features are visible.
- Sign in with Apple is also enabled for this account.

## Path C Verification

To verify that we ship NO pricing UI in the iOS bundle, we run a CI gate before every TestFlight upload:

```bash
npm run build && strings dist/assets/*.js | \
  grep -E 'href="/planos|href="/checkout|href="/assinatura|window\.location.*checkout|Browser\.open.*asaas'
```

Expected output: **zero matches**. The iOS bundle ships zero anti-steering vectors (no clickable link from inside the iOS app to a web checkout). Manual walkthrough (TestFlight, `03-07-TESTFLIGHT-WALKTHROUGH.md`) confirms.

## Where Users Manage Subscriptions

Users can sign up, view pricing, and manage their subscription at **`https://milespro.net.br/assinatura`** via any web browser (Safari on iOS works fine). This URL is **NOT linked from inside the iOS app** per the exemption rules.

## Sign in with Apple Support

Per Guideline 4.8, we offer Sign in with Apple alongside Google OAuth. The Apple Sign-In button is visible on the `/auth` screen on iOS only (gated by `useIsIOSCapacitor()`).

## Push Notifications

MilesPro requests notification permission contextually — AFTER the user adds their first miles program (not at signup). Notifications cover:
- Miles expiration alerts (Pro+)
- Promotion of transferência alerts (Pro+)
- Payment events (all tiers — billing notices)
- Onboarding milestones

## Privacy

- **Data collection** documented in App Privacy Nutrition Labels (consistent with our public privacy policy)
- **No IDFA** (we do NOT track users for advertising)
- **PII scrubbing** in Sentry crash reports (CPF and email are stripped)
- **Granular consent** for analytics (PostHog) per LGPD Art. 8 §4

## Compliance

- **LGPD** (Brazilian data protection law) compliant: data export (`POST /lgpd-export`), data deletion (`POST /lgpd-delete` with 7-day cancellation window), granular consent banner, DPO email `dpo@milespro.net.br`
- **Privacy Policy URL**: `https://app.milespro.net.br/privacidade`
- **Terms of Use URL**: `https://app.milespro.net.br/termos`

## Contact

If any questions arise during review, please reach our team at:
- **Technical / Review**: <founder-email>
- **DPO / Privacy**: dpo@milespro.net.br
- **General Support**: suporte@milespro.net.br

Thank you for reviewing MilesPro!

— The MilesPro Team

---

## Internal Notes (NOT included in submission)

- This entire submission is under Apple App Review Guideline 3.1.3(b) — Multiplatform Services exemption
- CRIT-03 mitigation: Plan 02-06 `useIsIOSCapacitor` runtime hide + Plan 03-02 CI gate
- If Apple Reviewer rejects with 3.1.1 reference → escalate as CRIT-03 cycle blocker
- Re-submission strategy: clarify exemption in re-submission notes, link to Netflix/Spotify reader-app patterns
- Sandbox Tester credentials managed in Plan 03-00 runbook
```

**3.2 — Convention enforcement:**
- Guideline 3.1.3(b) cited verbatim
- Demo flow numbered + observable (reviewer can check each step)
- Sandbox Tester credentials referenced by file/section, NOT pasted (founder fills in placeholders when copying to App Store Connect)
- No marketing fluff; reviewer-focused factual statements
- Explicit "Path C Verification" section with the actual grep command (transparency)
- Cites web checkout URL ONLY in context (not as a link to tap inside the app)
- pt-BR audience explained for the locale + the Sign in with Apple availability
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md','utf8'); const req=[['3.1.3(b)','exemption citation (Apple Guideline)'],['Multiplatform Services','exemption name'],['NOT direct','exemption keyword'],['Sign in with Apple','4.8 compliance'],['Sandbox Tester','demo creds reference'],['Path C','runtime hide reference'],['NO pricing','no anti-steering claim'],['useIsIOSCapacitor','runtime gate'],['LGPD','compliance'],['privacidade','policy URL'],['dpo@milespro.net.br','DPO contact'],['milespro.net.br/assinatura','web management URL']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: submission notes missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: App Review submission notes');"</automated>
  </verify>
  <done>
    03-07-APP-REVIEW-SUBMISSION-NOTES.md cites 3.1.3(b) verbatim, lists demo flow, references Sandbox Tester credentials, declares Path C compliance via grep gate, cites Sign in with Apple per 4.8, lists web subscription management URL outside the app.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Write TestFlight Walkthrough Runbook (founder manual verification — cycle-level kill switch)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-VALIDATION.md ("Manual-Only Verifications" → TestFlight walkthrough row)
    - .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md (Task 3 — demo flow to mirror)
  </read_first>
  <action>
**4.1 — Create `.planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md`:**

```markdown
# TestFlight Walkthrough — MilesPro v1.0.0 Path C Verification

**Conducted by:** <founder name>
**Conducted on:** <date>
**Device:** iPhone <model>, iOS <version>
**TestFlight build:** <build number> (CFBundleVersion)

This walkthrough is the **CYCLE-LEVEL KILL SWITCH** for ROADMAP §Phase 3 SC#1: "no pricing UI in the iOS bundle" — manually verified before App Review submission.

---

## Pre-flight Checklist

- [ ] G-CRIT-03 grep gate (`bash scripts/check-ios-strings.sh`) passes locally (Plan 03-02)
- [ ] Build uploaded to TestFlight (App Store Connect → My Apps → MilesPro → TestFlight)
- [ ] TestFlight build status = "Ready to Test" (~30min after upload)
- [ ] Self added as TestFlight tester
- [ ] TestFlight app installed on test iPhone
- [ ] MilesPro installed via TestFlight (NOT from web build / NOT from a sideload)

---

## Walkthrough Steps

For each step, verify visually + check screenshots.

### 1. Launch + Splash Screen

- [ ] App launches without crashing
- [ ] Splash screen shows MilesPro icon (orange brand color #e8590c) on dark background
- [ ] No flash of unstyled content
- Screenshot: _<path or "captured">_

### 2. Auth Screen

- [ ] `/auth` page renders with `MilesPro` header
- [ ] Tab toggle: "Entrar" / "Cadastre-se" visible
- [ ] Google sign-in button visible
- [ ] **Apple sign-in button visible** (only on iOS — verify it appears)
- [ ] Email + password form visible below
- [ ] **NO pricing strings anywhere on this screen** — no "R$", no "Pro", no "Upgrade", no "Plano"
- [ ] Footer / footer note has NO link to `/assinatura`
- Screenshot: _<path>_

### 3. Sign In with Apple

- [ ] Tap "Continuar com Apple"
- [ ] Native Apple Sign-In sheet opens
- [ ] Use Sandbox Tester credentials from Plan 03-00 runbook
- [ ] OAuth flow completes
- [ ] Universal Link redirect: Safari opens with `/auth/callback?code=...` then auto-redirects into the app (deep-link handler intercepts; runs exchangeCodeForSession; navigates to `/dashboard`)
- [ ] Session established in Capacitor; user sees Dashboard
- Screenshot: _<path>_

### 4. Dashboard

- [ ] Dashboard renders with header "MilesPro"
- [ ] User name displayed (if seeded)
- [ ] Empty state OR populated state (depending on test data)
- [ ] **NO "Upgrade" button visible**
- [ ] **NO "Pro" tier badge visible** (Sandbox Tester account is Pro; tier UI is invisible by Path C — user just sees the features)
- [ ] No pricing strings anywhere
- Screenshot: _<path>_

### 5. Add a Program

- [ ] Tap "+ Adicionar programa" or similar CTA
- [ ] Form opens for selecting a program (Smiles, TudoAzul, etc.)
- [ ] Submit a Smiles program
- [ ] **Push permission pre-prompt appears** (`PushPermissionPrompt` dialog with D-T07 copy: "Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer uma promoção de transferência. Permitir avisos?")
- [ ] Tap "Permitir"
- [ ] Native iOS notification permission dialog opens
- [ ] Tap "Permitir" again
- [ ] Token registers (verify offline via Supabase Studio: `SELECT * FROM push_subscriptions WHERE user_id = '<sandbox-tester-uid>'`)
- Screenshot: _<path>_

### 6. Promotions Screen (Pro+ feature)

- [ ] Tap navigation → Promoções (`/promocoes`)
- [ ] Page renders with Pro+ promotion alerts list (may be empty if cron hasn't run)
- [ ] **NO "Upgrade to Pro" UI visible** (Sandbox Tester is already Pro; Path C compliant)
- [ ] If empty: empty state shows neutral copy, NO pricing CTA
- Screenshot: _<path>_

### 7. Assinatura / Subscription Screen

- [ ] Tap navigation → Assinatura OR open Configurações → Assinatura
- [ ] The PATH C panel is rendered: copy reads "Sua assinatura MilesPro é gerenciada pelo navegador web em milespro.net.br" (or similar)
- [ ] **NO clickable link** to milespro.net.br on this screen (per D-T16 + Plan 02-06)
- [ ] **NO pricing cards** (no R$ amounts, no Pro/VIP cards)
- [ ] **NO "Assinar Pro" or "Upgrade" buttons**
- Screenshot: _<path>_

### 8. Configurações Screen

- [ ] Settings page accessible
- [ ] Visible options: profile, notifications (if exposed), logout
- [ ] **No pricing CTAs**
- [ ] Logout button works → back to `/auth`
- Screenshot: _<path>_

### 9. LGPD Confirmation Deep Link

- [ ] In a separate browser/email simulator, generate an LGPD delete email
- [ ] Tap the link `https://app.milespro.net.br/lgpd/confirm-delete?token=<hmac>` on the iPhone
- [ ] Universal Link intercepts — opens MilesPro instead of Safari
- [ ] App routes to `LgpdConfirmDelete` page
- Screenshot: _<path>_

### 10. Push Delivery (end-to-end)

- [ ] Trigger a test promo via Supabase Studio: `INSERT INTO user_promo_alerts (user_id, promo_id, from_program, to_program, bonus_pct, starts_at, ends_at) VALUES (<my-uid>, 'test-promo-1', 'Livelo', 'Smiles', 50, now(), now()+interval '7 days')`
- [ ] Manually invoke compute-personalized-promos via Lovable Cloud chat (or wait for 02:00 UTC cron)
- [ ] enqueue-push fan-out fires (verify in Supabase Functions logs)
- [ ] FCM delivery to APNs to device
- [ ] Notification appears on iPhone within ~30 seconds
- [ ] Tap notification → app opens to `/promocoes`
- Screenshot: _<path>_

---

## Final Verdict

- [ ] ALL 10 steps PASSED — zero pricing UI visible, zero anti-steering vectors, push pipeline functional end-to-end
- [ ] If ANY step failed → file as gap-closure; do NOT submit to App Review yet

**Submission decision:**
- [ ] APPROVED for App Review submission
- [ ] BLOCKED — issues to fix: <describe>

**Founder signature:** <date + name>
```

**4.2 — Convention enforcement:**
- 10 numbered steps, each with a check + screenshot placeholder
- Step 7 (Assinatura) is the most important — explicit "NO clickable link" check
- pt-BR copy quoted verbatim where it matters
- Test command for push smoke (Supabase Studio + Lovable Cloud) embedded inline
- Founder signature at the bottom = explicit cycle-level kill-switch gate
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md','utf8'); const req=[['CYCLE-LEVEL KILL SWITCH','intent declaration'],['G-CRIT-03 grep gate','pre-flight check'],['Sign In with Apple','step 3 Apple OAuth'],['NO pricing','explicit Path C verifications'],['Assinatura','subscription screen step'],['gerenciada pelo navegador','Path C copy'],['NO clickable link','anti-steering check'],['LGPD','deep link step'],['Push Delivery','push smoke step'],['APPROVED for App Review','sign-off']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: TestFlight walkthrough missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: TestFlight walkthrough');"</automated>
  </verify>
  <done>
    03-07-TESTFLIGHT-WALKTHROUGH.md has 10 numbered steps with checkboxes; founder-signed verdict gates App Review submission.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 5: [BLOCKING] Xcode archive → TestFlight → App Review submission</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-07-APP-STORE-CONNECT-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (Apple Team ID + Sandbox Tester + .p8 keys)
    - .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md (Task 3)
    - .planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md (Task 2)
    - .planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md (Task 4 — must be SIGNED OFF before submission)
    - scripts/check-ios-strings.sh (Plan 03-02 G-CRIT-03 gate)
  </read_first>
  <what-built>
    Founder runs Xcode + uploads to App Store Connect. Requires macOS host. Plan 03-00 already covered the Apple Developer + certificates / Service ID / .p8 keys.
  </what-built>
  <how-to-verify>
    Create `.planning/phases/03-mobile-distribution-launch/03-07-APP-STORE-CONNECT-RUNBOOK.md` with:

    ```markdown
    # App Store Connect Submission Runbook — iOS v1.0.0

    **Created:** <date>
    **Status:** PENDING — awaiting founder execution
    **Host requirement:** macOS + Xcode 15+ + active Apple Developer Program

    ---

    ## Step 0: Pre-archive G-CRIT-03 hard gate

    **DO NOT SKIP. This is the cycle-level kill switch.**

    From a fresh checkout of `main`:

    ```bash
    cd C:/Users/Machado/Milespro/miles-pro-hub  # or Mac equivalent
    npm ci
    npm run build
    bash scripts/check-ios-strings.sh
    ```

    Expected: `OK: G-CRIT-03 gate CLEAN — zero pricing strings detected`.

    **If the gate fails:** STOP. Do not archive. Read the failing tokens, find the source, wrap with `useIsIOSCapacitor()`, re-build, re-test. Treat as CRIT-03 gap-closure.

    Capture in this runbook:
    - [ ] G-CRIT-03 gate green at: `<timestamp>`

    ---

    ## Step 0.5: AASA CDN 48-hour propagation gate (Q5 RESOLVED)

    **DO NOT SKIP. Apple Universal Link verification depends on this.**

    Apple's CDN (`app-site-association.cdn-apple.com`) caches the AASA payload at install time + periodic refresh; reviewer test devices may fetch a stale or absent AASA from before our deploy if the window is too tight. The 48-hour wait covers Apple CDN edge propagation + reviewer device install.

    1. Open `.planning/phases/03-mobile-distribution-launch/03-03-SUMMARY.md` and find the AASA deploy timestamp (Plan 03-03 Task 1 committed `public/.well-known/apple-app-site-association`; Task 9 smoke-deeplinks.sh ran ~90s after push to main confirming Vercel CDN serves the file at `Content-Type: application/json`).
    2. Compute elapsed hours: `(now() - aasa_deploy_timestamp) / 3600`.
    3. **If elapsed < 48 hours:** STOP. Wait until 48h have passed. Use the wait time to (a) re-run the 03-03 smoke (`bash scripts/smoke-deeplinks.sh` — must return 200 + valid JSON shape), (b) do dry-runs of the App Store Connect submission UI without uploading, (c) prepare screenshots + ASO copy.
    4. **If elapsed >= 48 hours:** verify the live AASA from the public CDN one more time:
       ```bash
       curl -sI https://app.milespro.net.br/.well-known/apple-app-site-association
       # Expected: HTTP/2 200, Content-Type: application/json, Cache-Control: public, max-age=3600
       curl -s https://app.milespro.net.br/.well-known/apple-app-site-association | jq '.applinks.details[0].appIDs'
       # Expected: ["<TEAM_ID>.br.com.milespro.app"]
       ```
       Both checks pass → continue to Step 1.

    Capture in this runbook:
    - [ ] AASA deploy timestamp (from 03-03-SUMMARY.md): `<timestamp>`
    - [ ] Current timestamp: `<timestamp>`
    - [ ] Elapsed hours: `<n>` (must be >= 48)
    - [ ] Live AASA curl headers verified at: `<timestamp>`
    - [ ] Live AASA jq shape verified at: `<timestamp>`

    **Rationale (Q5 RESOLVED in RESEARCH.md):** Apple Reviewer's automated tooling and human inspection may both rely on a fresh AASA fetch. Submitting before the CDN has settled risks an invisible failure mode where Universal Links partially work (some devices, some routes) but reviewer's specific device does not — yielding a rejection that is hard to reproduce locally. The 48h gate is the minimum safe window per Apple's public AASA caching documentation.

    ---

    ## Step 1: Sync iOS bundle

    On the Mac:

    ```bash
    npx cap sync ios
    cd ios/App
    pod install   # only first time + after major Capacitor upgrades
    ```

    Capture:
    - [ ] cap sync clean at: `<timestamp>`
    - [ ] CocoaPods install clean (if first-time): `<timestamp>`

    ---

    ## Step 2: Open Xcode + verify project settings

    ```bash
    open ios/App/App.xcworkspace
    ```

    In Xcode:
    1. Select the `App` target → "Signing & Capabilities" tab
    2. Verify:
       - [ ] Team: <Team ID from Plan 03-00 runbook>
       - [ ] Bundle Identifier: `br.com.milespro.app`
       - [ ] Signing Certificate: "Apple Distribution"
       - [ ] Provisioning Profile: "Xcode Managed" (let Xcode handle provisioning)
       - [ ] **Capabilities present and correctly listed:**
         - [ ] Push Notifications (toggle: ON)
         - [ ] Sign in with Apple (toggle: ON)
         - [ ] Associated Domains (entry: `applinks:app.milespro.net.br`)
    3. Select target → "Build Settings" tab → search "CODE_SIGN_ENTITLEMENTS":
       - [ ] Value: `App/App.entitlements`

    Capture:
    - [ ] Signing + Capabilities verified at: `<timestamp>`

    ---

    ## Step 3: Build + Archive

    1. In Xcode, select scheme `App` + destination `Any iOS Device (arm64)`
    2. Product → Clean Build Folder (`⇧⌘K`)
    3. Product → Archive (`⌘B` first to verify build; then `⌘B` archive)
    4. Wait for archive (~5-10 min)
    5. Organizer window opens automatically

    Capture:
    - [ ] Archive completed at: `<timestamp>`
    - [ ] Archive size: `<bytes>`

    ---

    ## Step 4: Validate + Distribute to App Store Connect

    1. In Organizer → select the new archive
    2. Click "Validate App"
       - Method: "App Store Connect"
       - Distribution options: Strip Swift symbols (yes), Upload symbols (yes), Manage version + build (let Xcode auto)
       - Confirm signing
    3. Wait for validation (~5 min). Expected: "Validate successful — 0 issues"
    4. **If issues:** review each. Common ones:
       - Missing icon size → re-run `npx capacitor-assets generate` + cap sync ios
       - Missing entitlement → check Plan 03-03 Task 8 outputs
       - Missing privacy key → check Task 1 of this plan
    5. Click "Distribute App"
       - Method: "App Store Connect"
       - Upload
    6. Wait for upload (~10 min for 50 MB)

    Capture:
    - [ ] Validation result: `<status>` at: `<timestamp>`
    - [ ] Distribution upload completed at: `<timestamp>`

    ---

    ## Step 5: Wait for App Store Connect Processing

    1. Visit https://appstoreconnect.apple.com/apps → MilesPro → TestFlight tab
    2. Wait for build to finish processing (~30 min)
    3. **Apple Export Compliance prompt** may appear ("Does your app use encryption?"):
       - Answer: NO (because `ITSAppUsesNonExemptEncryption=false` in Info.plist; Apple auto-detects but UI may double-check)

    Capture:
    - [ ] Build processed at: `<timestamp>`
    - [ ] Build number: `1` (CFBundleVersion)

    ---

    ## Step 6: TestFlight — Internal + External Testing

    1. App Store Connect → TestFlight tab
    2. "Internal Testing" group: enable for build 1; add founder Apple ID (auto-fills self)
    3. Install TestFlight on iPhone → install MilesPro v1.0.0 build 1
    4. **Execute the full walkthrough per `03-07-TESTFLIGHT-WALKTHROUGH.md`** (Task 4)
    5. Sign off the walkthrough document with date + founder signature
    6. If walkthrough APPROVED: optionally add External Testers (BR miles community 30-40 recruits via TestFlight invite link)

    Capture:
    - [ ] TestFlight Internal Testing live at: `<timestamp>`
    - [ ] TestFlight walkthrough signed OFF at: `<timestamp>`
    - [ ] (Optional) External Testers added: `<count>`

    ---

    ## Step 7: Submit for App Review

    Pre-submission checklist:
    - [ ] **Q5 RESOLVED — AASA 48h propagation gate passed** (Step 0.5 above; >= 48h since AASA Vercel deploy; live curl shape verified)
    - [ ] App Privacy nutrition labels submitted per `03-07-APP-PRIVACY-NUTRITION-LABELS.md`
    - [ ] App Store description (pt-BR + en-US) drafted (re-use Play release notes from `03-06-RELEASE-NOTES.md`)
    - [ ] Keywords (ASO) drafted: "milhas, pontos, fidelidade, smiles, latam pass, livelo, esfera, gestão"
    - [ ] Screenshots prepared (6.7" iPhone Pro Max + 5.5" iPhone — minimum 3 screenshots each)
    - [ ] Support URL: `https://app.milespro.net.br` (or dedicated support page if exists)
    - [ ] Marketing URL: `https://milespro.net.br`
    - [ ] Privacy Policy URL: `https://app.milespro.net.br/privacidade`
    - [ ] Terms URL: `https://app.milespro.net.br/termos`
    - [ ] Content rating: 4+ (no objectionable content; financial app)
    - [ ] App Review notes: paste verbatim from `03-07-APP-REVIEW-SUBMISSION-NOTES.md`

    Submit:
    1. App Store Connect → MilesPro → "1.0 Prepare for Submission"
    2. Fill all fields above
    3. "Submit for Review"

    Capture:
    - [ ] Submitted to App Review at: `<timestamp>`
    - [ ] Apple review status: `<status>` (typically 1-3 business days for first submission)

    ---

    ## Step 8: Review Outcome

    - **If APPROVED:**
      - [ ] App Store status = "Ready for Sale" at: `<timestamp>`
      - [ ] App Store URL: `https://apps.apple.com/br/app/milespro/id<app-id>`
      - [ ] Release strategy: phased release (Apple default = 7 days; manual: release immediately)

    - **If REJECTED:**
      - [ ] Rejection reason: `<verbatim from Apple>`
      - [ ] If reason cites 3.1.1 or 3.1.3: ESCALATE as CRIT-03 — review whether a pricing string slipped past the gate; gap-closure plan required
      - [ ] If reason cites something else (icon, screenshots, missing keys): fix + re-submit (versionCode bump, new build)
    ```

  </how-to-verify>
  <resume-signal>
    Reply: "iOS submission complete: build uploaded, TestFlight walkthrough signed off, App Review submitted at <date>." OR "Rejected — reason: <verbatim>; planning gap-closure."
  </resume-signal>
  <acceptance_criteria>
    - 03-07-APP-STORE-CONNECT-RUNBOOK.md exists with 8 H2 steps
    - Step 0 (G-CRIT-03 hard gate) executed with green result captured
    - Step 0.5 (Q5 AASA 48h propagation gate) executed with elapsed hours >= 48 + live curl shape verification captured
    - At least 1 step marked complete with timestamp
    - TestFlight walkthrough (03-07-TESTFLIGHT-WALKTHROUGH.md) signed off
    - (Eventually) App Store URL captured: `https://apps.apple.com/br/app/milespro/id<id>`
  </acceptance_criteria>
  <done>
    iOS v1.0.0 build 1 uploaded to App Store Connect; TestFlight walkthrough signed off APPROVED; submitted for App Review with 3.1.3(b) cited submission notes; runbook captures all 8 step timestamps. (Final approval may take 1-3 days; gates this plan's done status.)
  </done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-01 | Compliance | iOS bundle ships pricing UI → 3.1.1 rejection | mitigate | (a) Plan 02-06 useIsIOSCapacitor runtime hide. (b) Plan 03-02 G-CRIT-03 grep gate run in CI on every PR + locally before archive (Task 5 Step 0). (c) Task 4 manual TestFlight walkthrough with 10 checkboxes. (d) Task 3 submission notes pre-empt reviewer questions with 3.1.3(b) citation. |
| T-3-04 | Compliance | Info.plist over-declares permissions → Privacy Manifest mismatch | mitigate | Task 1 keeps NS* keys to minimum (only NSUserNotificationsUsageDescription). Verification banned-string for NSCameraUsageDescription / NSContactsUsageDescription. |
| T-3-07 | Information Disclosure | Sandbox Tester credentials in submission notes leaked | mitigate | Task 3 references credentials BY POINTER (03-00 runbook + password manager); founder fills the actual credentials in App Store Connect submission UI, not the markdown file. |
</threat_model>

<verification>
```bash
# 1. Info.plist hardening
grep -E 'UIBackgroundModes|ITSAppUsesNonExemptEncryption|NSUserNotificationsUsageDescription' ios/App/App/Info.plist
! grep -E 'NSCameraUsageDescription|NSContactsUsageDescription|NSAllowsArbitraryLoads' ios/App/App/Info.plist

# 2. App.entitlements still has Plan 03-03 keys
grep -E 'associated-domains|aps-environment|applesignin' ios/App/App/App.entitlements

# 3. Runbooks
test -f .planning/phases/03-mobile-distribution-launch/03-07-APP-PRIVACY-NUTRITION-LABELS.md
test -f .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md
test -f .planning/phases/03-mobile-distribution-launch/03-07-TESTFLIGHT-WALKTHROUGH.md
test -f .planning/phases/03-mobile-distribution-launch/03-07-APP-STORE-CONNECT-RUNBOOK.md

# 4. 3.1.3(b) cited verbatim
grep '3.1.3(b)' .planning/phases/03-mobile-distribution-launch/03-07-APP-REVIEW-SUBMISSION-NOTES.md

# 5. (Manual, after Task 5) App Store URL captured
```
</verification>

<success_criteria>
- Info.plist hardened (UIBackgroundModes, ITSAppUsesNonExemptEncryption, NSUserNotificationsUsageDescription, minimum-set, version aligned with Android)
- App Privacy Nutrition Labels runbook captures every Apple data category 1:1 with Privacidade.tsx + Play form
- App Review Submission Notes cite 3.1.3(b) verbatim + demo flow + sandbox tester + web URL outside app
- TestFlight Walkthrough Runbook has 10 numbered steps + founder sign-off line
- App Store Connect Runbook has 8 step flow with pre-archive G-CRIT-03 hard gate AND Step 0.5 AASA 48h propagation gate (Q5 RESOLVED)
- [BLOCKING] manual: archive uploaded, TestFlight walkthrough signed off, App Review submitted, eventually approved
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-07-SUMMARY.md` documenting:
- Archive build number + size + upload timestamp
- TestFlight walkthrough result (10/10 pass)
- App Review submission date + reviewer feedback (if any)
- Approval date + App Store URL
- Any 3.1.1 / 3.1.3 rejection events + re-submission turnaround
- Cross-platform consistency check: iOS Privacy Nutrition Labels match Play Data Safety form
- Reminder for Plan 03-08: launch outreach can start once Android is live (Plan 03-06); iOS approval is parallel and not blocking per D-T16
</output>