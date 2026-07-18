---
phase: 03-mobile-distribution-launch
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
autonomous: false
requirements: [LAUNCH-02, LAUNCH-03, MOBILE-04, MOBILE-05]
tags: [hard-blocker, accounts, apple-developer, play-console, firebase, founder-action]
must_haves:
  truths:
    - "Apple Developer Program enrollment via PJ + DUNS Number submitted (D-T14) — receipt + projected approval date captured in runbook"
    - "Google Play Console account purchased ($25 one-time) and enrollment submitted (D-T14) — receipt captured in runbook"
    - "At least one Apple Sandbox Tester account created under the Apple Developer dashboard once enrollment lands (MED-07)"
    - "Firebase project created at console.firebase.google.com with Cloud Messaging enabled; project_id, sender_id, and App IDs (iOS bundle = br.com.milespro.app, Android package = br.com.milespro.app per D-T01) registered"
    - "FCM service account JSON downloaded (Firebase Console → Project Settings → Service Accounts → Generate new private key) and stored offline, NEVER committed to git"
    - "APNs Auth Key (.p8) generated in Apple Developer → Certificates, Identifiers & Profiles → Keys (created AFTER Apple Developer approval) and uploaded to Firebase Console → Cloud Messaging → APNs Authentication Key"
    - "google-services.json downloaded from Firebase (Android app) and saved to android/app/google-services.json (gitignored if production keys, committed if public app-id-only per Firebase docs)"
    - "Apple Team ID captured (visible after Apple Developer approval) and recorded in 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md as TEAM_ID placeholder for AASA"
    - "Android signing keystore strategy decided: Play App Signing enrolled (recommended) OR upload-only keystore generated via keytool — SHA-256 fingerprint of the App Signing certificate captured for assetlinks.json"
    - "Closed Testing track configured in Play Console (D-T13: Android-first submission staging area) with tester gmail allowlist seeded with founder email"
    - "All credentials stored in 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md as placeholders (FCM service-account JSON path, Apple Team ID, Apple Key ID, APNs Key ID, Android SHA-256, Firebase project_id) — used by downstream plans 03-01..03-08"
  artifacts:
    - path: .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
      provides: "Founder-owned checklist of external account provisioning with placeholders for credentials downstream plans consume"
      contains: "Apple Developer Program"
  key_links:
    - from: "Apple Developer Account TEAM_ID"
      to: "public/.well-known/apple-app-site-association (Plan 03-03 AASA payload)"
      via: "TEAM_ID prefix on appIDs entry"
      pattern: "<TEAM_ID>.br.com.milespro.app"
    - from: "Firebase service-account JSON"
      to: "Supabase Vault secret push_fcm_service_account (Plan 03-04 register-push fn)"
      via: "vault.create_secret(<json-string>, 'push_fcm_service_account')"
      pattern: "push_fcm_service_account"
    - from: "Android App Signing SHA-256 fingerprint"
      to: "public/.well-known/assetlinks.json (Plan 03-03 assetlinks payload)"
      via: "sha256_cert_fingerprints array"
      pattern: "sha256_cert_fingerprints"
---

<objective>
Open and provision every external account, certificate, and signing artifact required by Phases 3 plans 03-01..03-08. This is the founder-owned hard-blocker plan: every downstream plan in Phase 3 references credentials, IDs, or signing fingerprints produced here.

Purpose: D-T14 from CONTEXT.md flagged Apple Developer Program (PJ + DUNS, 3–7 days) and Google Play Console ($25, ~24h) as both pending — until they exist, no iOS .ipa archive and no Android .aab upload is possible. The Firebase project, FCM service-account JSON, and APNs Auth Key gate the push pipeline (Plan 03-04). The Android App Signing SHA-256 and Apple Team ID gate the deep-link payloads (Plan 03-03). Without this plan landing first, Plans 03-03 through 03-07 ship placeholder values and cannot be verified.

Output: One operator runbook (`03-00-ACCOUNT-PROVISIONING-RUNBOOK.md`) capturing every credential, ID, fingerprint, and account state with timestamped checkpoints. The downstream plans treat this runbook as the canonical credential source.
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

<interfaces>
<!-- Downstream consumers of this plan's output -->

**Plan 03-01 (Capacitor scaffold) consumes:**
- Apple Team ID (for `capacitor.config.ts` iOS hints if applicable)
- Bundle ID `br.com.milespro.app` (D-T01 — locked, not produced here)

**Plan 03-03 (Universal Links / App Links) consumes:**
- Apple Team ID → AASA `appIDs` value: `"<TEAM_ID>.br.com.milespro.app"`
- Android App Signing SHA-256 fingerprint → assetlinks.json `sha256_cert_fingerprints[0]`

**Plan 03-04 (Push schema + edge fns) consumes:**
- FCM service-account JSON (full JSON string) → Supabase Vault secret `push_fcm_service_account`
- Firebase `project_id` → FCM HTTP v1 URL `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send`

**Plan 03-05 (Client push integration) consumes:**
- Apple Push Notifications capability (configured in Xcode after iOS code is added in Plan 03-01) — depends on Apple Developer approval
- google-services.json placed at `android/app/google-services.json`

**Plan 03-06 (Android submission) consumes:**
- Play Console account active
- Closed Testing track configured
- Android signing keystore (Play App Signing OR upload keystore)

**Plan 03-07 (iOS submission) consumes:**
- Apple Developer Program active
- App Store Connect listing slot
- Apple Sandbox Tester credentials for test users in submission notes
- Apple Sign In with Apple key + Service ID (configured in Apple Developer → Certificates, Identifiers & Profiles)

**Plan 03-08 (Outreach + helpdesk) — independent of this plan**
</interfaces>

<scratchpad>
**Why autonomous: false:** Every task here requires the founder to interact with external dashboards (Apple Developer Console, Google Play Console, Firebase Console) using personal credentials Claude cannot hold. Apple enrollment specifically requires DUNS Number, which requires the PJ entity to be active — and the PJ is itself a parallel founder workstream tracked in Phase 2 W3.

**Why this is Plan 00 not Task 0 of Plan 01:** Account provisioning has 3-7 day asynchronous wait time on Apple's side. Holding up an executable plan with a multi-day external blocker would lock up the executor's context and produce stale plan summaries. Splitting it out gives the orchestrator a clean signal: when 03-00 is marked complete, Wave 1 unblocks.

**Why Firebase is here not in 03-04:** Firebase project creation gates the FCM service-account JSON. Without the JSON, plan 03-04's `send-push-notification` edge function cannot pass its Deno tests. Front-loading the account work means 03-04 can verify against a real Vault secret instead of a mock.

**Why one runbook not multiple files:** Single source of truth for all external state. Downstream plans grep this file (`grep -F 'TEAM_ID' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md`) for the value they need. Sectioned with H2 headings per dependency: Apple, Google Play, Firebase, Android Signing.
</scratchpad>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 0a: [BLOCKING] Apple Developer Program enrollment via PJ + DUNS</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T14 (account provisioning hard-blocker)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Environment Availability" (Apple Developer + DUNS requirements)
    - .planning/PROJECT.md (PJ entity status — required prerequisite)
  </read_first>
  <what-built>
    Manual provisioning, no automation possible. Claude cannot enroll developer accounts.
  </what-built>
  <how-to-verify>
    1. Confirm PJ entity (CNPJ) is active before starting — if not, this task is blocked on a Phase 2 W3 prerequisite. Pause and resume when PJ is approved.
    2. Visit https://developer.apple.com/programs/enroll/ → "Enroll as Organization".
    3. Complete the enrollment form with the PJ CNPJ. Apple will ask for the DUNS Number; if you do not have one, request a free one at https://www.dnb.com/duns-number/get-a-duns.html (Brazil supplier registration). DUNS issuance takes 24–48h.
    4. After DUNS issued, complete Apple enrollment. Pay the $99/yr fee with a corporate card or PJ-issued debit.
    5. Apple Operations will email a verification call schedule. Answer the call, confirm the organization details.
    6. Once Apple emails "Welcome to the Apple Developer Program", capture in `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` the following values under section `## Apple Developer Program`:
       - Apple ID email used for enrollment
       - Apple Team ID (visible in https://developer.apple.com/account/ → Membership)
       - Approval date
       - Renewal date (one year out)
    7. Inside Apple Developer Console, create an App ID:
       - Identifier: `br.com.milespro.app` (Explicit, D-T01)
       - Capabilities to enable: Push Notifications, Sign in with Apple, Associated Domains
       - Save and capture the App ID record.
    8. Create a Sign in with Apple Key (.p8):
       - Apple Developer → Certificates, Identifiers & Profiles → Keys → "+"
       - Name: `MilesPro Sign in with Apple`
       - Enable: Sign in with Apple → configure for App ID `br.com.milespro.app`
       - Download the .p8 file (ONE-TIME download; lose it = regenerate). Save to a password manager (1Password / Bitwarden) under the path noted in the runbook (e.g., `~/secure/apple/AuthKey_<KEY_ID>.p8`).
       - Capture Key ID + the path to the .p8 file in runbook.
    9. Create the APNs Auth Key (.p8 — separate from Sign in with Apple key):
       - Apple Developer → Certificates, Identifiers & Profiles → Keys → "+"
       - Name: `MilesPro APNs`
       - Enable: Apple Push Notifications service (APNs)
       - Download the .p8, capture Key ID + path in runbook. Upload this .p8 to Firebase Console in Task 0c.
    10. Create the Apple Services ID (used for Apple Sign-In OAuth on Android / web):
       - Apple Developer → Certificates, Identifiers & Profiles → Identifiers → "+" → Services IDs
       - Identifier: `br.com.milespro.app.signin`
       - Configure: enable Sign in with Apple, set Primary App ID to `br.com.milespro.app`, set Return URLs to Supabase callback (`https://opusftqbbaozucmbuuug.supabase.co/auth/v1/callback`), Domains to `opusftqbbaozucmbuuug.supabase.co` + `app.milespro.net.br`.
       - Capture the Services ID string in runbook.
    11. Create at least one Apple Sandbox Tester account (App Store Connect → Users and Access → Sandbox Testers → "+"):
       - Email: `sandbox-tester-1@<your-private-email-or-yopmail-alias>`
       - Capture credentials in 1Password under `Apple Sandbox Tester #1`. This account is referenced in Plan 03-07 submission notes.

    Resume signal: paste the runbook H2 section `## Apple Developer Program` filled in (Team ID + Approval date present + all four .p8 keys created + Services ID captured + at least one sandbox tester).
  </how-to-verify>
  <resume-signal>
    Reply: "Apple Developer approved, Team ID = ABC123XYZ4, runbook updated" — or describe blockers (DUNS pending, PJ not approved, payment rejected, etc.).
  </resume-signal>
  <acceptance_criteria>
    - `.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` exists
    - Contains H2 heading `## Apple Developer Program`
    - Under that H2: Team ID captured (non-empty, not `<TEAM_ID>` placeholder), enrollment status = "Approved", and Approval date populated
    - APNs .p8 Key ID + storage path captured
    - Sign in with Apple .p8 Key ID + Services ID captured
    - At least 1 Apple Sandbox Tester credential captured (email visible; password in password manager reference)
    - `grep -E 'Team ID:\s*[A-Z0-9]{10}' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` returns 1 match (Team ID is exactly 10 alphanumeric chars)
  </acceptance_criteria>
  <done>
    Apple Developer enrollment approved, App ID created with capabilities (Push, Sign in with Apple, Associated Domains), both .p8 keys generated and stored, Services ID captured, at least one sandbox tester created. Runbook §"Apple Developer Program" complete.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 0b: [BLOCKING] Google Play Console account + Closed Testing track</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T14, D-T13 (Android-first submission)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Environment Availability" (Play Console requirements)
  </read_first>
  <what-built>
    Manual provisioning, no automation possible.
  </what-built>
  <how-to-verify>
    1. Visit https://play.google.com/console/ → "Create developer account" → choose "Organization" type and enter PJ details.
    2. Pay the one-time $25 fee with a corporate card.
    3. Complete identity verification (Google may request a passport/RG scan + PJ social contract within 24h).
    4. Once approved, in the Play Console:
       - Create a new app: package name `br.com.milespro.app` (D-T01), default language `pt-BR`, "App" type, "Free" pricing.
       - Capture in `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` under H2 `## Google Play Console`:
         - Developer account approval date
         - Package name `br.com.milespro.app`
         - App ID slot reservation status
    5. In the new app → Setup → App Signing → enroll in Google Play App Signing (recommended for new apps since 2017).
       - After enrollment, Setup → App integrity → "App signing key certificate" → SHA-256 fingerprint. Capture in runbook as `Android App Signing SHA-256: <HEX:HEX:HEX...>`.
       - Also capture the SHA-256 for the upload key (visible alongside App Signing key after the first upload). Both fingerprints will be added to `assetlinks.json` in Plan 03-03 so Internal Testing builds (signed with upload key) also resolve App Links.
    6. Configure Closed Testing track (D-T13: Android-first submission staging):
       - Play Console → Testing → Closed testing → Create new track → "Closed Testing - Alpha"
       - Seed tester allowlist with founder email + 5-10 close contacts (capture list in runbook under `## Closed Testing Allowlist`)
    7. Configure Internal Testing track in parallel:
       - Play Console → Testing → Internal testing → Create
       - Allowlist same testers + add 30-40 community-recruited testers later (Plan 03-06 will collect)

    Resume signal: paste runbook H2 `## Google Play Console` filled in.
  </how-to-verify>
  <resume-signal>
    Reply: "Play Console approved, App Signing SHA-256 = AB:CD:..., runbook updated" — or describe blockers.
  </resume-signal>
  <acceptance_criteria>
    - Runbook contains H2 `## Google Play Console`
    - Developer account approval date populated
    - SHA-256 fingerprint captured (format `XX:XX:XX:...` 32 hex byte-pairs separated by colons)
    - Upload key SHA-256 also captured (format identical)
    - Closed Testing track configured with at least 1 tester on the allowlist
    - `grep -E 'App Signing SHA-256:\s*([A-F0-9]{2}:){31}[A-F0-9]{2}' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` returns 1 match
  </acceptance_criteria>
  <done>
    Play Console developer account approved, app slot reserved with package `br.com.milespro.app`, Play App Signing enrolled, SHA-256 fingerprints captured, Closed Testing track configured. Runbook §"Google Play Console" complete.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 0c: [BLOCKING] Firebase project + FCM service-account JSON + APNs upload</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md, android/app/google-services.json (NEW, gitignored)</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T05 (FCM HTTP v1 + service-account JSON in Supabase Vault)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"FCM HTTP v1 API Server-side" (service account flow)
    - .gitignore (verify android/app/google-services.json line — add if missing in this task)
  </read_first>
  <what-built>
    Manual Firebase Console interaction. No CLI for Firebase project creation (gcloud could create the GCP project, but Firebase setup is web-only).
  </what-built>
  <how-to-verify>
    1. Visit https://console.firebase.google.com/ and sign in with a Google account dedicated to this PJ (use the founder email; consider creating `firebase@<corporate-domain>` if you have one).
    2. "Add project" → name `MilesPro` → enable Google Analytics? NO (skip — we already use PostHog) → Create project.
    3. After project creation:
       - Capture in `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` under H2 `## Firebase Project`:
         - Firebase project name = `MilesPro`
         - Firebase project_id (auto-generated, e.g., `milespro-12345`)
         - Firebase project number (the numeric ID — distinct from project_id)
    4. Register the Android app:
       - Firebase Console → Project settings → General → "Add app" → Android
       - Package name: `br.com.milespro.app` (D-T01)
       - App nickname: `MilesPro Android`
       - SHA-1 fingerprint: leave blank for now (will be added in Plan 03-06 when the keystore is finalized; Google Sign-In on Android requires this)
       - Click Register → Download `google-services.json` → save to `android/app/google-services.json` (this folder may not exist yet; create the parent `android/app/` if needed for Plan 03-01).
    5. Register the iOS app:
       - Firebase Console → "Add app" → iOS
       - Bundle ID: `br.com.milespro.app` (D-T01)
       - App nickname: `MilesPro iOS`
       - App Store ID: leave blank
       - Click Register → Download `GoogleService-Info.plist` → save to a local path noted in runbook (will be added to Xcode in Plan 03-01 or 03-07).
    6. Enable Cloud Messaging:
       - Firebase Console → Build → Cloud Messaging → ensure FCM HTTP v1 API enabled (it is on by default for new projects; if a "Legacy server keys are disabled" notice appears, that is expected behavior and means we are correctly on HTTP v1).
    7. Upload APNs Auth Key (from Plan 03-00 Task 0a step 9):
       - Firebase Console → Project settings → Cloud Messaging → iOS app configuration → APNs Authentication Key → Upload
       - Upload the .p8 file
       - Fill in Key ID + Team ID (both captured in Task 0a runbook)
       - Save. Firebase now relays iOS pushes to APNs via this key.
    8. Generate the FCM service-account JSON for server-side use (the heart of Plan 03-04):
       - Firebase Console → Project settings → Service accounts → "Generate new private key" → Generate
       - Browser downloads a JSON file named like `milespro-12345-firebase-adminsdk-xxxxx-yyyyyyyy.json`. **THIS IS A SECRET.** Save to a password manager OR a path that is explicitly in `.gitignore` (e.g., `~/secure/firebase/<filename>.json`).
       - Capture in runbook under H3 `### FCM Service Account JSON` the file path + `client_email` (visible at top of the JSON file).
       - DO NOT commit the JSON file to the repo. Plan 03-04 will instruct you to store the JSON content in Supabase Vault under secret name `push_fcm_service_account`.
    9. Verify `android/app/google-services.json` is either committed (Firebase docs say it is safe — contains only public app-id config) OR gitignored per project policy:
       - This project's `.gitignore` already has `android/` ignored at line ~? — verify with `grep '^android' .gitignore`. If `android/` is fully ignored, the file is fine. If `android/app/google-services.json` must be committed (some teams do for CI), add an exception in `.gitignore`: `!android/app/google-services.json`.
       - **Decision for this project:** commit `google-services.json` (Firebase docs explicitly permit public commit). Plan 03-01 will run `npx cap add android` which generates the `android/` folder; this file lands inside `android/app/` and Capacitor's build-gradle (already present in repo at `android/app/build.gradle:48-54`) auto-applies the FCM plugin when the file exists.

    Resume signal: paste runbook H2 `## Firebase Project` filled with project_id + service-account JSON path + Android google-services.json saved.
  </how-to-verify>
  <resume-signal>
    Reply: "Firebase project milespro-XXXXX created, service-account JSON path = ~/secure/firebase/..., google-services.json + GoogleService-Info.plist downloaded, APNs key uploaded, runbook updated."
  </resume-signal>
  <acceptance_criteria>
    - Runbook contains H2 `## Firebase Project` with project_id (lowercase alphanumeric + hyphens, e.g., `milespro-12345`)
    - Runbook H3 `### FCM Service Account JSON` exists with `client_email` captured and file path noted (NOT the JSON contents themselves — those go in Vault per Plan 03-04)
    - `android/app/google-services.json` exists locally (will be picked up by Plan 03-01 cap add android)
    - APNs key uploaded to Firebase (Firebase Console shows "Key ID: XXXXXXXXXX" under Cloud Messaging → iOS)
    - `grep -E 'Firebase project_id:\s*[a-z0-9-]+' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` returns 1 match
    - GoogleService-Info.plist saved locally (not yet placed in `ios/App/App/` — that happens in Plan 03-01 after `npx cap add ios`)
  </acceptance_criteria>
  <done>
    Firebase project created, both Android + iOS apps registered, APNs Auth Key uploaded, FCM service-account JSON generated and stored offline, google-services.json available for Plan 03-01 cap add. Runbook §"Firebase Project" complete.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 0d: [BLOCKING] Consolidate runbook + downstream credential table</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (populated by Tasks 0a/0b/0c)
  </read_first>
  <what-built>
    Synthesis task: consolidate scattered captures from Tasks 0a-0c into a single H1-level table at the top of the runbook for fast grep by downstream plans.
  </what-built>
  <how-to-verify>
    1. Open `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md`. Confirm sections `## Apple Developer Program`, `## Google Play Console`, `## Firebase Project` are all populated.
    2. Add a top-of-document `## Quick Reference Table` after the YAML frontmatter (if present) or at the very top. Table columns: `Key`, `Value`, `Used By Plan`.

       Expected rows:
       | Key | Value | Used By Plan |
       |-----|-------|--------------|
       | Apple Team ID | `<10-char alphanumeric>` | 03-03 (AASA), 03-07 (App Store Connect) |
       | Apple App ID | `br.com.milespro.app` | 03-01 (capacitor.config.ts), 03-07 |
       | Apple Services ID (Sign in with Apple) | `br.com.milespro.app.signin` | 03-03 (Supabase Auth provider config) |
       | Apple Sign in with Apple Key ID | `<10-char alphanumeric>` | 03-03 (Supabase Auth) |
       | Apple Sign in with Apple .p8 path | `~/secure/apple/AuthKey_XXX.p8` | 03-03 (upload to Supabase Auth → Providers form) |
       | Apple APNs Key ID | `<10-char alphanumeric>` | already uploaded to Firebase in 0c |
       | Apple Sandbox Tester #1 email | `<email>` | 03-07 (submission notes) |
       | Android Package Name | `br.com.milespro.app` | 03-01 (build.gradle), 03-03 (assetlinks), 03-06 |
       | Android App Signing SHA-256 | `XX:XX:...` (32 byte-pairs) | 03-03 (assetlinks.json) |
       | Android Upload Key SHA-256 | `XX:XX:...` | 03-03 (assetlinks.json secondary) |
       | Firebase project_id | `<lowercase-alphanumeric>` | 03-04 (FCM HTTP v1 URL) |
       | FCM Service Account JSON path | `~/secure/firebase/<file>.json` | 03-04 (Supabase Vault `push_fcm_service_account`) |
       | FCM Service Account client_email | `<sa>@<project>.iam.gserviceaccount.com` | 03-04 (FCM JWT iss claim) |
    3. Verify every row has a non-placeholder value. Any value still `<...>` means the corresponding Task 0a/0b/0c has a gap — go back and fill.
    4. Append a `## Rotation Calendar` section listing 6-month rotation reminders:
       - Apple .p8 Sign in with Apple key: rotate every 6 months
       - APNs .p8 key: rotate every 6 months (less critical — Firebase relays)
       - FCM service-account JSON: rotate quarterly (T-3-08 mitigation per phase threat model)
       - Apple Developer Program renewal: 1 year from approval
       - Google Play Console: no renewal (one-time $25)

  </how-to-verify>
  <resume-signal>
    Reply: "Runbook consolidated, Quick Reference Table complete with N rows, no placeholders remaining."
  </resume-signal>
  <acceptance_criteria>
    - `## Quick Reference Table` exists in `03-00-ACCOUNT-PROVISIONING-RUNBOOK.md`
    - Table has at least 12 data rows (one per key listed above)
    - `grep -c '^|.*|.*|.*|$' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` returns at least 14 (12 rows + 2 header/separator)
    - No row contains the literal string `<TEAM_ID>` or `<PLACEHOLDER>` or `TBD`
    - `## Rotation Calendar` H2 exists with at least 4 bullet points
  </acceptance_criteria>
  <done>
    Runbook has a single Quick Reference Table at the top with all 12+ credentials captured, plus Rotation Calendar appended. Downstream plans 03-01..03-08 can grep this file for the exact values they need.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Founder ↔ Apple Developer Console | Apple verifies PJ identity + DUNS + payment; high-value credentials cross this boundary |
| Founder ↔ Google Play Console | Google verifies PJ identity + payment |
| Founder ↔ Firebase Console | Service-account JSON (high-value secret) is generated here and flows to local disk → Supabase Vault |
| Local Disk ↔ Password Manager | .p8 keys and FCM JSON path stored offline; never in git |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-07 | Information Disclosure | Apple Sandbox Tester credentials in submission notes | mitigate | Sandbox account created with throwaway alias (`sandbox-tester-1@<alias>`); credentials in password manager; runbook references the password manager entry name, NOT the password itself |
| T-3-08 | Information Disclosure | FCM service-account JSON leak | mitigate | JSON file path is in runbook but contents NEVER committed to git. Stored offline in password manager OR local secure directory. Plan 03-04 copies JSON contents directly into Supabase Vault secret `push_fcm_service_account`, NEVER through a committed file. Rotation calendar in runbook enforces quarterly key rotation. |
| T-3-08b | Tampering | .gitignore drift could commit secrets | mitigate | This plan's verification grep is on the runbook only (which is meant to be committed — placeholders only, no actual secret values). Future task in Plan 03-04 adds a pre-commit hook (or relies on Phase 1's existing `failOnSecretLeak()` Vite plugin which catches `VITE_*SECRET` patterns at build time — though the Vite plugin will NOT catch a misplaced `service-account.json` in `public/`; add an explicit `*.json` exclusion in `.gitignore` for any Firebase-style filename pattern `*-firebase-adminsdk-*.json` at the repo root). |
| T-3-07b | Repudiation | Apple Developer enrollment uses founder personal Apple ID | accept | Single-founder operation; transfer to PJ Apple ID post-launch if team expands. Acceptable risk for v1. |
| T-3-08c | Denial of Service | DUNS Number delay blocks Apple enrollment | mitigate | Task 0a explicitly calls out DUNS as a 24-48h pre-step; founder can request DUNS in parallel with PJ approval (DUNS does not require PJ to be active, only the legal entity name). Reduces critical-path time from 7 days (PJ→DUNS→Apple) to 3-5 days (PJ→Apple while DUNS races). |
</threat_model>

<verification>
After all 4 tasks complete, run from `.planning/phases/03-mobile-distribution-launch/`:

```bash
# All required H2 sections present
grep -c '^## Apple Developer Program\|^## Google Play Console\|^## Firebase Project\|^## Quick Reference Table\|^## Rotation Calendar' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
# Expected: 5

# Team ID format check
grep -E 'Apple Team ID.*[A-Z0-9]{10}' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# SHA-256 fingerprint format check
grep -E 'SHA-256.*([A-F0-9]{2}:){31}[A-F0-9]{2}' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# No placeholders remaining
! grep -E '<TEAM_ID>|<PLACEHOLDER>|TBD' 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
```

All four checks must pass before Plan 03-01 (Wave 1) can execute.
</verification>

<success_criteria>
- Apple Developer Program approved, Team ID captured (10-char alphanumeric)
- Apple App ID `br.com.milespro.app` created with Push + Sign in with Apple + Associated Domains capabilities
- Apple Sign in with Apple .p8 key, Services ID, APNs .p8 key all generated; APNs uploaded to Firebase
- At least 1 Apple Sandbox Tester created
- Google Play Console approved, package `br.com.milespro.app` reserved
- Play App Signing enrolled, App Signing SHA-256 + Upload Key SHA-256 captured
- Closed Testing track configured
- Firebase project created with `br.com.milespro.app` registered for both Android + iOS
- FCM service-account JSON generated and stored offline (path in runbook, contents NEVER committed)
- google-services.json available locally for Plan 03-01 cap add android
- GoogleService-Info.plist available locally for Plan 03-01 cap add ios
- Single consolidated `## Quick Reference Table` in runbook with all 12+ credentials non-placeholder
- `## Rotation Calendar` in runbook with at least 4 rotation reminders
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-00-SUMMARY.md` documenting:
- Account approval timestamps (Apple, Google Play, Firebase)
- Critical-path days from request → approval
- Any rework needed (DUNS denied + reapplied, etc.)
- Links to the populated runbook sections
- List of downstream plans now unblocked (03-01 through 03-07; 03-08 was independent and can have been running in parallel)
</output>