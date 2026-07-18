---
phase: 03-mobile-distribution-launch
plan: 00
type: runbook
owner: founder
status: scaffold_complete_awaiting_action
created: 2026-05-14
updated: 2026-05-14
gates: [LAUNCH-02, LAUNCH-03, MOBILE-04, MOBILE-05]
unblocks: [03-01, 03-03, 03-04, 03-05, 03-06, 03-07]
---

# Phase 3 — Account Provisioning Runbook

> **Founder-owned checklist.** Every downstream Phase 3 plan (03-01 through 03-08) references credentials, IDs, or signing fingerprints captured here. Fill in each placeholder as the corresponding external workflow completes (Apple 3–7d, Google ~24h, Firebase ~10min).

## How to use this runbook

1. Work the H2 sections in order: **Apple Developer → Google Play → Firebase → Quick Reference → Rotation Calendar**.
2. Each H2 section has numbered steps. Do them sequentially.
3. Replace every `<PLACEHOLDER>` token with the real value. Do NOT delete the brackets — search-replace them.
4. **Never commit secrets** (`.p8` files, FCM service-account JSON contents, sandbox tester passwords). Store offline in password manager (1Password / Bitwarden). Capture only file paths or password-manager references in this document.
5. When all sections are populated AND `## Quick Reference Table` has no `<PLACEHOLDER>` rows, paste the completion signal in chat: `"Runbook consolidated, Quick Reference Table complete, no placeholders remaining."` — that's the Plan 03-00 done signal.

## Quick Reference Table

> Single grep target for downstream plans. Update each row as the corresponding section is completed below.

| Key | Value | Used By Plan |
|-----|-------|--------------|
| Apple Team ID | `<TEAM_ID>` | 03-03 (AASA), 03-07 (App Store Connect) |
| Apple App ID | `br.com.milespro.app` | 03-01 (capacitor.config.ts), 03-07 |
| Apple Services ID (Sign in with Apple) | `br.com.milespro.app.signin` | 03-03 (Supabase Auth provider config) |
| Apple Sign in with Apple Key ID | `<APPLE_SIWA_KEY_ID>` | 03-03 (Supabase Auth) |
| Apple Sign in with Apple .p8 path | `<APPLE_SIWA_P8_PATH>` | 03-03 (upload to Supabase Auth → Providers form) |
| Apple APNs Key ID | `<APNS_KEY_ID>` | already uploaded to Firebase in §Firebase Project |
| Apple Sandbox Tester #1 email | `<SANDBOX_TESTER_EMAIL>` | 03-07 (submission notes) |
| Android Package Name | `br.com.milespro.app` | 03-01 (build.gradle), 03-03 (assetlinks), 03-06 |
| Android App Signing SHA-256 | `<ANDROID_APP_SIGNING_SHA256>` | 03-03 (assetlinks.json primary) |
| Android Upload Key SHA-256 | `<ANDROID_UPLOAD_KEY_SHA256>` | 03-03 (assetlinks.json secondary) |
| Firebase project_id | `milespro-26` | 03-04 (FCM HTTP v1 URL) |
| Firebase project_number | `822126992634` | 03-04 |
| FCM Service Account JSON path | `1Password → Machado vault → MilesPro Firebase Service Account` (filename `milespro-26-firebase-adminsdk-fbsvc-5f7577e417.json`) | 03-04 (Supabase Vault `push_fcm_service_account`) |
| FCM Service Account client_email | `firebase-adminsdk-fbsvc@milespro-26.iam.gserviceaccount.com` | 03-04 (FCM JWT iss claim) |

---

## Apple Developer Program

**Prerequisite:** PJ entity (CNPJ) active. This is a Phase 2 W3 workstream tracked separately. If PJ is not yet approved, request a free DUNS Number in parallel — DUNS only needs the legal entity name, not an active CNPJ, which shaves 24–48h off the critical path.

**Cost:** USD $99/year, paid with corporate card (or PJ-issued debit).
**Timing:** 3–7 days after submission for organization-tier enrollment.

### Steps

1. **DUNS Number (parallel pre-step).** Request a free DUNS at https://www.dnb.com/duns-number/get-a-duns.html → Brazil supplier registration. Issuance takes 24–48h.

2. Visit https://developer.apple.com/programs/enroll/ → **Enroll as Organization**.

3. Fill enrollment form using PJ CNPJ. When asked for DUNS Number, paste the number from step 1.

4. Pay the $99/yr fee. Apple Operations will email a verification call schedule. Answer the call, confirm organization details.

5. **Wait for approval email** (`Welcome to the Apple Developer Program`).

6. Capture below once approved:

   - Apple ID email used for enrollment: `<APPLE_DEV_ID_EMAIL>`
   - Apple Team ID (Membership page at https://developer.apple.com/account/): `<TEAM_ID>` (exactly 10 alphanumeric chars)
   - Approval date: `<APPROVAL_DATE>`
   - Renewal date (1 year out): `<RENEWAL_DATE>`

7. **Create App ID.** Apple Developer Console → Certificates, Identifiers & Profiles → Identifiers → "+" → App IDs → App.
   - Description: `MilesPro Production`
   - Bundle ID: **Explicit** = `br.com.milespro.app` (D-T01)
   - Capabilities (enable all three): Push Notifications, Sign in with Apple, Associated Domains
   - Save.

8. **Create Sign in with Apple Key (.p8).** Keys → "+".
   - Key Name: `MilesPro Sign in with Apple`
   - Enable: Sign in with Apple → Configure → Primary App ID = `br.com.milespro.app`
   - Continue → Register → **Download .p8 file immediately** (one-time download; lose it = regenerate).
   - Move file to password manager OR secure local path. Suggested path: `~/secure/apple/AuthKey_<KEY_ID>.p8`
   - Capture:
     - Sign in with Apple Key ID: `<APPLE_SIWA_KEY_ID>` (10-char alphanumeric)
     - Path: `<APPLE_SIWA_P8_PATH>`

9. **Create APNs Auth Key (.p8 — separate from Sign in with Apple key).** Keys → "+".
   - Key Name: `MilesPro APNs`
   - Enable: Apple Push Notifications service (APNs)
   - Continue → Register → **Download .p8** immediately. Move to `~/secure/apple/AuthKey_<APNS_KEY_ID>.p8`.
   - Capture:
     - APNs Key ID: `<APNS_KEY_ID>` (10-char alphanumeric)
     - Path: `<APNS_P8_PATH>`
   - This `.p8` is uploaded to Firebase Console in the Firebase section below (step 7).

10. **Create Apple Services ID (for Apple Sign-In OAuth via Supabase).**
    - Apple Developer → Identifiers → "+" → Services IDs
    - Description: `MilesPro Sign In`
    - Identifier: `br.com.milespro.app.signin`
    - Continue → Register.
    - Click the new Services ID → Configure → enable **Sign in with Apple**.
    - Primary App ID: `br.com.milespro.app`
    - Web Domain: `opusftqbbaozucmbuuug.supabase.co`
    - Return URLs:
      - `https://opusftqbbaozucmbuuug.supabase.co/auth/v1/callback`
    - Save.
    - Capture:
      - Services ID: `br.com.milespro.app.signin`
      - Verified domain: `opusftqbbaozucmbuuug.supabase.co`

11. **Create at least one Apple Sandbox Tester** (App Store Connect → Users and Access → Sandbox Testers → "+").
    - First Name / Last Name: arbitrary (e.g., `Sandbox / Tester01`)
    - Email: `<SANDBOX_TESTER_EMAIL>` (use a yopmail alias or `+sandbox1@yourdomain` to keep your inbox clean)
    - Password: random 16+ char string saved in password manager under `Apple Sandbox Tester #1`
    - Date of Birth: any adult date
    - App Store Country: Brazil
    - Save.
    - Capture: `<SANDBOX_TESTER_EMAIL>` in the Quick Reference table above. Password reference: `1Password → Apple Sandbox Tester #1`.

### Acceptance check

```bash
# Team ID exactly 10 alphanumeric chars
grep -E 'Apple Team ID:\s*[A-Z0-9]{10}' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# Sandbox tester captured
grep -E 'Sandbox Tester #1.*email:' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# No <TEAM_ID> placeholder remaining in Quick Reference table for Apple rows
! grep -c '<TEAM_ID>\|<APPLE_SIWA_KEY_ID>\|<APNS_KEY_ID>\|<APPLE_SIWA_P8_PATH>\|<SANDBOX_TESTER_EMAIL>' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
```

### Resume signal

> Reply in chat: `"Apple Developer approved, Team ID = <TEAM_ID>, runbook updated"`

---

## Google Play Console

**Cost:** USD $25 one-time.
**Timing:** ~24h for organization-tier identity verification.

### Steps

1. Visit https://play.google.com/console/ → **Create developer account** → choose **Organization** → enter PJ details.

2. Pay the one-time $25 fee with corporate card.

3. Complete identity verification (Google may request a passport/RG scan + PJ social contract within 24h).

4. **Wait for approval email.**

5. Once approved, in the Play Console:
   - Create new app:
     - App name: `MilesPro`
     - Default language: `pt-BR`
     - App / Game: **App**
     - Free / Paid: **Free**
     - Declarations: complete per Play policies.
   - Capture:
     - Developer account approval date: `<PLAY_APPROVAL_DATE>`
     - Package name: `br.com.milespro.app`
     - App ID slot: reserved ✓

6. **Enroll in Play App Signing** (recommended for new apps since 2017).
   - Setup → App integrity → App Signing → enroll.
   - After enrollment, App Signing key certificate appears.
   - Capture **App Signing SHA-256**:
     - `<ANDROID_APP_SIGNING_SHA256>` (format: 32 hex byte-pairs separated by colons, e.g., `AB:CD:EF:...`)
   - After the first upload, Upload Key SHA-256 also appears.
   - Capture **Upload Key SHA-256**:
     - `<ANDROID_UPLOAD_KEY_SHA256>`
   - Both fingerprints land in `public/.well-known/assetlinks.json` (Plan 03-03) so Internal Testing builds (signed with upload key) AND Production builds (signed with App Signing key) both resolve Android App Links.

7. **Configure Closed Testing track** (D-T13: Android-first submission staging).
   - Play Console → Testing → Closed testing → Create new track → name it `Closed Testing - Alpha`
   - Seed tester allowlist with founder email + 5–10 close contacts (capture list under `## Closed Testing Allowlist` below).

8. **Configure Internal Testing track in parallel.**
   - Play Console → Testing → Internal testing → Create.
   - Allowlist: same 5–10 founder contacts initially. Plan 03-06 will recruit community testers later (target: 30–40 by submission).

### Closed Testing Allowlist

| # | Tester email | Role | Date added |
|---|--------------|------|------------|
| 1 | `<FOUNDER_EMAIL>` | Founder | `<DATE>` |
| 2 | `<TESTER_EMAIL>` | Family/friend | `<DATE>` |
| 3 | `<TESTER_EMAIL>` | Family/friend | `<DATE>` |
| ... | ... | ... | ... |

### Acceptance check

```bash
# SHA-256 fingerprint format (32 hex byte-pairs)
grep -E 'App Signing SHA-256:\s*([A-F0-9]{2}:){31}[A-F0-9]{2}' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# Closed Testing track populated
grep -E '^\| 1 \| .+ \| Founder' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# No <ANDROID_*> placeholders remaining
! grep -c '<ANDROID_APP_SIGNING_SHA256>\|<ANDROID_UPLOAD_KEY_SHA256>' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
```

### Resume signal

> Reply: `"Play Console approved, App Signing SHA-256 = AB:CD:..., runbook updated"`

---

## Firebase Project

**Cost:** Free (Spark plan covers Cloud Messaging fan-out at our volume).
**Timing:** ~10 minutes.

### Steps

1. Visit https://console.firebase.google.com/ and sign in with the Google account used for the PJ (consider a dedicated `firebase@<your-corp-domain>` if you have one).

2. **Add project** → name `MilesPro`.
   - Google Analytics? **NO** (we use PostHog).
   - Create project.

3. Capture:
   - Firebase project name: `MilesPro`
   - Firebase project_id: `milespro-26` ✓ (created 2026-05-14)
   - Firebase project_number: `822126992634` ✓

4. **Register Android app.**
   - Firebase Console → Project settings → General → Add app → Android.
   - Package name: `br.com.milespro.app`
   - App nickname: `MilesPro Android`
   - SHA-1 fingerprint: **leave blank for now** (will be added in Plan 03-06 when the upload keystore is finalized — required only for Google Sign-In on Android, which is optional v1).
   - Register → download `google-services.json` → save to `android/app/google-services.json`.
   - **Decision:** commit `google-services.json` to the repo (Firebase docs explicitly permit it; contains only public app-id config). Plan 03-01 will ensure the folder exists.

5. **Register iOS app.**
   - Firebase Console → Add app → iOS.
   - Bundle ID: `br.com.milespro.app`
   - App nickname: `MilesPro iOS`
   - App Store ID: leave blank
   - Register → download `GoogleService-Info.plist` → save locally; Plan 03-01 will move it to `ios/App/App/GoogleService-Info.plist` after `npx cap add ios`.

6. **Enable Cloud Messaging.**
   - Firebase Console → Build → Cloud Messaging.
   - Confirm FCM HTTP v1 API enabled (default for new projects).
   - If you see a "Legacy server keys are disabled" notice, that's expected — we are on HTTP v1.

7. **Upload APNs Auth Key** (the `.p8` from Apple Developer §Apple Developer Program step 9).
   - Firebase Console → Project settings → Cloud Messaging → iOS app configuration → APNs Authentication Key → Upload.
   - Upload the `.p8` file from `<APNS_P8_PATH>`.
   - Key ID: `<APNS_KEY_ID>` (from §Apple Developer)
   - Team ID: `<TEAM_ID>` (from §Apple Developer)
   - Save.

8. **Generate FCM service-account JSON for server-side use.**
   - Firebase Console → Project settings → Service accounts → "Generate new private key" → Generate.
   - Browser downloads a JSON named `<FIREBASE_PROJECT_ID>-firebase-adminsdk-xxxxx-yyyyyyyy.json`.
   - **THIS IS A SECRET.** Move immediately to a path that is gitignored or to a password manager. Suggested path: `~/secure/firebase/<filename>.json`
   - **NEVER COMMIT THE JSON FILE.** Plan 03-04 will instruct you to paste its contents into Supabase Vault under secret name `push_fcm_service_account`.
   - Capture:
     - FCM Service Account JSON path: `1Password → Machado vault → MilesPro Firebase Service Account` ✓ (filename `milespro-26-firebase-adminsdk-fbsvc-5f7577e417.json`, 2 KB, generated 2026-05-14 20:42 UTC). Original download deleted from filesystem.
     - FCM Service Account client_email: `firebase-adminsdk-fbsvc@milespro-26.iam.gserviceaccount.com` ✓

### Acceptance check

```bash
# project_id format
grep -E 'Firebase project_id:\s*[a-z0-9-]+' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# Service account client_email format
grep -E 'FCM Service Account client_email:.*@.*\.iam\.gserviceaccount\.com' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md

# Local google-services.json exists (after Plan 03-01 adds Android platform)
test -f android/app/google-services.json && echo "google-services.json present" || echo "google-services.json NOT YET PLACED (expected if Plan 03-01 not done)"

# JSON contents NOT committed
! git ls-files | grep -E '.*-firebase-adminsdk-.*\.json$'

# No <FIREBASE_*> or <FCM_*> placeholders remaining
! grep -c '<FIREBASE_PROJECT_ID>\|<FIREBASE_PROJECT_NUMBER>\|<FCM_JSON_PATH>\|<FCM_CLIENT_EMAIL>' .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
```

### Resume signal

> Reply: `"Firebase project <id> created, service-account JSON path = <path>, google-services.json + GoogleService-Info.plist downloaded, APNs key uploaded, runbook updated"`

---

## Rotation Calendar

| Credential | Rotation cadence | Owner | Next rotation date |
|------------|------------------|-------|--------------------|
| Apple Sign in with Apple .p8 key | every 6 months | founder | `<DATE+6mo>` |
| Apple APNs .p8 key | every 6 months (less critical — Firebase relays) | founder | `<DATE+6mo>` |
| FCM service-account JSON | quarterly (T-3-08 threat mitigation) | founder | `<DATE+3mo>` |
| Apple Developer Program | annual renewal | founder | `<APPROVAL_DATE + 1y>` |
| Google Play Console | no renewal (one-time $25) | — | — |

> Set calendar reminders 14 days before each rotation date. Rotating means:
> - Apple .p8 keys: generate new key in Apple Developer Console, update Supabase Auth (Sign in with Apple) and Firebase Console (APNs), revoke old key after 7 days.
> - FCM service-account JSON: generate new key in Firebase Console → Service accounts, paste into Supabase Vault `push_fcm_service_account`, delete old key from Service accounts dashboard.

---

## Threat-model notes (T-3-07, T-3-08)

- **T-3-07:** Apple Sandbox Tester credentials live in this runbook as **email only**. Password reference is `1Password → Apple Sandbox Tester #N` — never paste the password into a committed file.
- **T-3-08:** FCM service-account JSON contents NEVER touch git. The file path captured above is for the founder's local reference only. Plan 03-04 copies JSON contents directly into Supabase Vault `push_fcm_service_account`.
- **T-3-08b:** Pre-emptively, when Plan 03-04 lands, add `*-firebase-adminsdk-*.json` to `.gitignore` so an accidental `git add .` at the repo root cannot commit the secret.

---

## Critical-path notes

- **Apple is the long pole.** Submit DUNS request first thing (parallel with PJ approval), then Apple enrollment as soon as DUNS issued.
- **Play Console can run in parallel** with Apple — different review queues, different identity systems. Don't serialize them.
- **Firebase has zero blockers** other than a Google account. Can be created on Day 0 even before Apple/Play approvals. Push pipeline (Plan 03-04) only needs the FCM service-account JSON; the APNs upload to Firebase needs the Apple .p8 (waits on Apple approval).

| Day | Apple track | Play track | Firebase track |
|-----|-------------|------------|-----------------|
| D0 | Request DUNS + submit Apple enrollment | Pay $25 + identity verification | Create project, register Android app, generate FCM JSON |
| D1 | Apple Operations verification call | Approval likely | iOS app register, GoogleService-Info.plist download |
| D3–D7 | Apple approval → create App ID + 2 .p8 keys + Services ID + Sandbox Tester | Closed Testing track configured | APNs .p8 upload (depends on Apple) |
| D7+ | Runbook §Apple complete | Runbook §Play complete | Runbook §Firebase complete |

Day 7 = Plan 03-00 done, Plans 03-03 + 03-04 unblock simultaneously.
