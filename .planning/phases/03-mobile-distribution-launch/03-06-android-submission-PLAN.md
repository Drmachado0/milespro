---
phase: 03-mobile-distribution-launch
plan: 06
type: execute
wave: 3
depends_on: ["01", "02", "03", "04", "05"]
files_modified:
  - android/app/src/main/AndroidManifest.xml
  - android/app/build.gradle
  - android/app/proguard-rules.pro
  - .planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md
  - .planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md
  - .planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md
autonomous: false
requirements: [MOBILE-02, LAUNCH-03, MOBILE-04, MOBILE-05]
tags: [android, play-console, targetsdk-35, privacy-manifest, pre-launch-report, internal-testing, closed-testing, production-track]
must_haves:
  truths:
    - "android/app/src/main/AndroidManifest.xml has <uses-permission android:name='android.permission.POST_NOTIFICATIONS' /> (Android 13+ runtime permission for push notifications — MOBILE-04 prerequisite)"
    - "android/app/src/main/AndroidManifest.xml has <uses-permission android:name='android.permission.INTERNET' /> (HTTPS-only; already added by cap-add but verify)"
    - "android/app/build.gradle targetSdk = 35 (Play Store hard requirement — Aug 2025 deadline already past per ROADMAP §Phase 3 SC#2)"
    - "android/app/build.gradle minSdk >= 24 (Capacitor 7 floor)"
    - "android/app/build.gradle versionCode = 1 (initial release) and versionName = '1.0.0' (semver baseline)"
    - "android/app/build.gradle has signingConfig wired to Play App Signing OR upload-keystore-only flow (founder decided in Plan 03-00); release variant uses minifyEnabled true + proguardFiles per Capacitor 7 production-build convention"
    - "android/app/proguard-rules.pro preserves the Capacitor + WebView entry points (Capacitor docs minimum rule set)"
    - "03-06-PRIVACY-NUTRITION-LABELS.md captures the Play Console Data Safety Form answers, derived verbatim from src/pages/Privacidade.tsx §5 sub-processors list (Supabase Auth email + name + UUID, Asaas payment info via storage of customer_id ref, PostHog usage data consent-gated, Sentry diagnostics with PII scrubbed, Resend, Crisp EU)"
    - "03-06-RELEASE-NOTES.md has pt-BR copy for the first Play Console release (versionName 1.0.0): what's new + main features + privacy policy link"
    - "03-06-PLAY-CONSOLE-RUNBOOK.md captures the full Internal Testing → Closed Testing → Production track flow with screenshots/timestamps placeholders for the founder"
    - "[BLOCKING] founder action sequence: (a) generate signed .aab via `cd android && ./gradlew bundleRelease`; (b) upload to Internal Testing track + tester allowlist seeded from Plan 03-00; (c) run Pre-launch Report; (d) verify 0 crashes + 0 ANRs + 0 security warnings; (e) promote to Closed Testing; (f) Data Safety form + Privacy Policy link + Content Rating questionnaire; (g) submit for production review; (h) wait for Google approval (typically 1-3 days for first submission); (i) capture Play Store listing URL in runbook"
    - "Android Pre-launch Report on Pixel 8 + Android 15 returns zero crashes, zero ANRs, zero security warnings (ROADMAP §Phase 3 SC#2 verbatim)"
  artifacts:
    - path: android/app/src/main/AndroidManifest.xml
      provides: "POST_NOTIFICATIONS permission for Android 13+"
      contains: "android.permission.POST_NOTIFICATIONS"
    - path: android/app/build.gradle
      provides: "targetSdk=35, versionCode=1, versionName=1.0.0, signing config"
      contains: "targetSdk = 35"
    - path: android/app/proguard-rules.pro
      provides: "Capacitor + WebView ProGuard rules for release variant"
      contains: "Capacitor"
    - path: .planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md
      provides: "Internal → Closed → Production track operator runbook with submission notes ready for review"
      contains: "Pre-launch Report"
    - path: .planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md
      provides: "Play Console Data Safety form answers derived from Privacidade.tsx §5"
      contains: "Sub-processors"
    - path: .planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md
      provides: "pt-BR release notes for v1.0.0"
      contains: "novidades"
  key_links:
    - from: "Plan 03-00 Android App Signing SHA-256"
      to: "Plan 03-03 public/.well-known/assetlinks.json"
      via: "fingerprint already added in 03-03; this plan validates via adb pm verify-app-links"
      pattern: "sha256_cert_fingerprints"
    - from: "src/pages/Privacidade.tsx §5 sub-processors"
      to: "03-06-PRIVACY-NUTRITION-LABELS.md Play Data Safety form"
      via: "1:1 derivation per source-of-truth doctrine"
      pattern: "sub-processors"
---

<objective>
Ship the Android app to Play Store production track. D-T13 mandated Android-first submission (lower review risk + faster iteration than Apple). This plan hardens `android/app/build.gradle` + `AndroidManifest.xml` to Play 2025 requirements (`targetSdk=35`, `POST_NOTIFICATIONS` Android 13+ permission), generates the Privacy Nutrition Labels (Play "Data Safety" form) from `src/pages/Privacidade.tsx §5` sub-processors, writes the pt-BR release notes, and produces the founder runbook for Internal → Closed → Production track promotion.

Purpose: MOBILE-02 + LAUNCH-03 hinge on a Play Store approval. The Pre-launch Report (Google automated test on Pixel 8 + Android 15) is the cycle-level kill-switch from ROADMAP §Phase 3 SC#2 — zero crashes, ANRs, security warnings. T-3-05 mitigation (`targetSdk=35` enforcement) is hardcoded into `android/app/build.gradle` and verified via the migration's grep gate; failing this = automatic Play upload rejection. The Privacy Manifest mismatch threat (T-3-04) is countered by deriving the Data Safety form from a single source (Privacidade.tsx §5) so what the policy says matches what Play declares.

Output: 3 Android config files (AndroidManifest.xml + build.gradle + proguard-rules.pro) + 3 founder runbook artifacts (Play Console flow + Privacy Nutrition Labels + Release Notes). Wave 3 (sequential after Wave 2 push integration; submission depends on full app being functional).
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
@src/pages/Privacidade.tsx
@android/app/build.gradle
@android/app/src/main/AndroidManifest.xml

<interfaces>
**Consumes from Plan 03-00 runbook:**
- Google Play Console approved + app slot reserved with package `br.com.milespro.app`
- App Signing SHA-256 + Upload Key SHA-256 (already used in Plan 03-03 assetlinks.json)
- Closed Testing track configured with tester allowlist

**Consumes from Plan 03-01:**
- android/app/ directory exists with build.gradle pre-configured (targetSdk=35 + applicationId + namespace + minSdk=24)
- android/variables.gradle has targetSdkVersion=35

**Consumes from Plan 03-03:**
- AndroidManifest.xml already has App Links intent-filter (autoVerify=true + 3 pathPrefixes) — Plan 03-06 only ADDS the POST_NOTIFICATIONS permission

**Consumes from Plan 03-05:**
- POST_NOTIFICATIONS is required for the `@capacitor/push-notifications` runtime permission request on Android 13+
- Push pipeline operational so push delivery can be smoke-tested during Pre-launch Report
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add POST_NOTIFICATIONS permission + ProGuard rules to Android config</name>
  <files>android/app/src/main/AndroidManifest.xml, android/app/proguard-rules.pro</files>
  <read_first>
    - android/app/src/main/AndroidManifest.xml (current — has MAIN/LAUNCHER intent-filter + App Links intent-filter from Plan 03-03)
    - android/app/proguard-rules.pro (Capacitor cap-add default — may be near-empty)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md (POST_NOTIFICATIONS reference)
  </read_first>
  <action>
**1.1 — Update `android/app/src/main/AndroidManifest.xml`:**

At the top, near the existing `<uses-permission>` block (or create one if not present, immediately after the opening `<manifest>` tag, before `<application>`), add:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

`POST_NOTIFICATIONS` is the Android 13+ (API 33+) runtime permission required by `@capacitor/push-notifications` plugin. Without this declaration, the plugin's `requestPermissions()` call silently returns 'denied' on Android 13+ devices, breaking Plan 03-05's flow.

`INTERNET` is the baseline HTTPS permission. Capacitor's cap-add usually includes it; verify and add if missing.

Do NOT add:
- `RECEIVE_BOOT_COMPLETED` (only needed for scheduling local notifications across reboot; we use server-side push)
- `WAKE_LOCK` (only for high-priority background tasks; not needed for our notification flow)
- `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` (no photo picker)
- `CAMERA` / `RECORD_AUDIO` / `ACCESS_COARSE_LOCATION` (no corresponding feature; declaring would trigger T-3-04 Privacy Manifest mismatch)

**1.2 — Update `android/app/proguard-rules.pro`:**

Append (preserve any existing rules from cap-add):

```proguard
# Capacitor + WebView entry points (release variant must not strip these)
-keep class com.getcapacitor.** { *; }
-keep class br.com.milespro.app.** { *; }

# WebView interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase + FCM (Google Play Services)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Gson / JSON parsing (if used by any plugin)
-keepattributes Signature
-keepattributes *Annotation*
```

**1.3 — Convention enforcement:**
- 2-space XML indent for AndroidManifest.xml
- ProGuard rule comments use `#` prefix and explain why each block exists
- Permissions declared in the MINIMUM set required by actual code (T-3-04 mitigation: every NS*/uses-permission must map to a real feature)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const m=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8'); const p=fs.readFileSync('android/app/proguard-rules.pro','utf8'); const req_m=[['android.permission.POST_NOTIFICATIONS','push permission'],['android.permission.INTERNET','internet permission']]; const banned_m=[['android.permission.CAMERA','no camera feature'],['android.permission.ACCESS_FINE_LOCATION','no location feature'],['android.permission.RECORD_AUDIO','no audio feature']]; const req_p=[['com.getcapacitor','capacitor keep'],['br.com.milespro.app','app keep'],['JavascriptInterface','webview interface']]; let fail=false; for (const [n,w] of req_m){if(!m.includes(n)){console.error('FAIL: AndroidManifest missing —',w);fail=true;}} for (const [n,w] of banned_m){if(m.includes(n)){console.error('FAIL: banned —',w);fail=true;}} for (const [n,w] of req_p){if(!p.includes(n)){console.error('FAIL: proguard-rules missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: POST_NOTIFICATIONS + ProGuard rules');"</automated>
  </verify>
  <done>
    AndroidManifest.xml has POST_NOTIFICATIONS + INTERNET permissions only (no over-declared permissions). proguard-rules.pro preserves Capacitor + Firebase + JavascriptInterface entry points for release variant.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Update android/app/build.gradle for release variant (versionCode + signingConfig + minifyEnabled)</name>
  <files>android/app/build.gradle</files>
  <read_first>
    - android/app/build.gradle (post Plan 03-01 state: applicationId + namespace already set; targetSdk via rootProject.ext)
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (signing strategy decided here — Play App Signing recommended)
  </read_first>
  <action>
**2.1 — In `android/app/build.gradle`, locate the `android { ... }` block:**

Set explicit versionCode + versionName in `defaultConfig`:

```gradle
defaultConfig {
    applicationId "br.com.milespro.app"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    // ... preserve existing aaptOptions, etc.
}
```

**2.2 — Add `buildTypes` block (or modify existing):**

```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        // Signing: Play App Signing (Plan 03-00 decided) → no signingConfig in release block;
        // upload keystore is used by `./gradlew bundleRelease` via signingConfigs.upload,
        // configured via android/key.properties (gitignored) at build time.
    }
    debug {
        // Default debug variant — no minification; signs with the debug keystore
    }
}
```

**2.3 — Add `signingConfigs` block (uses external `android/key.properties` file, gitignored):**

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config above

    signingConfigs {
        upload {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.upload
        }
    }
}
```

**2.4 — Verify .gitignore excludes `android/key.properties` and `android/app/*.jks`:**

Check `.gitignore`. If missing, add:

```gitignore
# Android signing — NEVER commit
android/key.properties
android/app/*.jks
android/app/*.keystore
android/local.properties
```

**2.5 — Create `android/key.properties.example` (template, committed):**

```properties
# Copy to android/key.properties and fill in. NEVER commit the real file.
# Generate keystore: keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 9125 -alias upload
storeFile=../app/upload.jks
storePassword=
keyAlias=upload
keyPassword=
```

**2.6 — Convention enforcement:**
- versionCode is an integer (1 for initial release; increment by 1 per Play upload)
- versionName follows semver (1.0.0 baseline)
- minifyEnabled true on release (Play recommends; ProGuard rules from Task 1 preserve necessary classes)
- Signing config reads from external properties file (gitignored)
- All paths relative to `android/` directory
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const b=fs.readFileSync('android/app/build.gradle','utf8'); const g=fs.readFileSync('.gitignore','utf8'); const req_b=[['versionCode 1','version code'],[\"versionName \\\"1.0.0\\\"\",'version name'],['minifyEnabled true','minify on release'],[\"proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')\",'proguard wiring'],['signingConfigs','signing block'],['signingConfig signingConfigs.upload','release signing']]; const req_g=[['android/key.properties','gitignore key.properties'],['android/app/*.jks','gitignore jks']]; let fail=false; for (const [n,w] of req_b){if(!b.includes(n)){console.error('FAIL: build.gradle missing —',w);fail=true;}} for (const [n,w] of req_g){if(!g.includes(n)){console.error('FAIL: .gitignore missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: build.gradle release config + .gitignore secrets');"</automated>
  </verify>
  <done>
    build.gradle has versionCode=1, versionName=1.0.0, minifyEnabled=true on release, signingConfigs.upload wired to key.properties file. .gitignore excludes key.properties + *.jks. key.properties.example template committed.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write Privacy Nutrition Labels runbook (Play Data Safety form)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md</files>
  <read_first>
    - src/pages/Privacidade.tsx (§5 sub-processors list — sole source of truth)
    - .planning/phases/03-mobile-distribution-launch/03-RESEARCH.md §"Pitfall 6: Apple App Privacy Nutrition Labels mismatch"
  </read_first>
  <action>
**3.1 — Create `.planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md`:**

```markdown
# Play Console — Data Safety Form Answers

**Generated:** <date>
**Source of truth:** `src/pages/Privacidade.tsx` §5 sub-processors. Any change to that file requires updating this document AND re-submitting Data Safety form via Play Console.

---

## Data Collected

| Data type | Collected? | Linked to user? | Used for tracking? | Optional? | Why |
|-----------|-----------|----------------|-------------------|-----------|-----|
| **Personal info — Email address** | YES | YES | NO | NO | Account creation + transactional emails (Supabase Auth + Resend) |
| **Personal info — Name** | YES | YES | NO | NO | Account profile (`profiles.full_name`) |
| **Personal info — User ID** | YES | YES | NO | NO | UUID from `auth.users.id` — internal identifier |
| **Personal info — National ID (CPF)** | YES | YES | NO | NO | Required by Asaas for NFS-e issuance + LGPD compliance |
| **Personal info — Phone number** | NO | — | — | — | Not collected (WhatsApp Business is opt-in customer initiated, not stored) |
| **Personal info — Address** | NO | — | — | — | Not collected |
| **Financial info — Payment info** | YES (reference only) | YES | NO | NO | We store Asaas `customer_id` reference, NOT card data. Cards stay at Asaas (PCI DSS) |
| **Financial info — Purchase history** | YES | YES | NO | NO | Subscription history visible to the account holder |
| **Health and fitness** | NO | — | — | — | — |
| **Messages** | NO | — | — | — | — |
| **Photos and videos** | NO | — | — | — | — |
| **Audio files** | NO | — | — | — | — |
| **Files and docs** | NO | — | — | — | — |
| **Calendar** | NO | — | — | — | Google Calendar integration is opt-in and OAuth-mediated; we don't STORE calendar events |
| **Contacts** | NO | — | — | — | — |
| **App activity — App interactions** | YES | YES (linked to user_id) | NO | YES (consent required per LGPD Art. 8 §4) | PostHog product analytics, consent-gated |
| **App activity — In-app search history** | NO | — | — | — | — |
| **App activity — Installed apps** | NO | — | — | — | — |
| **App activity — Other user-generated content** | YES | YES | NO | NO | Programa configurations, balance entries — owned by the user, displayed to them |
| **Web browsing — Web history** | NO | — | — | — | — |
| **App info and performance — Crash logs** | YES | YES (linked via Sentry user.id only — email + name scrubbed before send) | NO | NO | Sentry crash reporting, PII scrubbed via beforeSend (Plan 02-03) |
| **App info and performance — Diagnostics** | YES | YES (same as crash logs) | NO | NO | Sentry performance traces (10% sample rate) |
| **App info and performance — Other app performance data** | NO | — | — | — | — |
| **Device or other IDs — Device or other IDs** | NO | — | — | — | We do NOT use IDFA / GAID for tracking. Capacitor `device_id` is NOT collected. |
| **Audio recordings** | NO | — | — | — | — |
| **Location — Approximate location** | NO | — | — | — | IP-based geo-inference happens at Supabase / Vercel infra level; not declared as collected by the app |
| **Location — Precise location** | NO | — | — | — | — |

---

## Data Shared (with third parties)

| Recipient | Data | Purpose |
|-----------|------|---------|
| Asaas (gateway, BR) | CPF + name + email + phone (for invoice) + payment method | Process subscription payments + issue NFS-e |
| PostHog Cloud EU | User UUID + interaction events (consent-gated) | Product analytics + funnel measurement |
| Sentry | User UUID + crash + performance traces (PII scrubbed) | Crash reporting + performance monitoring |
| Resend | Email + name | Transactional email delivery |
| Crisp (EU) | User UUID + email + name + chat content | Helpdesk + customer support (marketing consent gate) |
| Supabase (US-east-1 with SCC) | All operational data | Hosted database + auth + edge functions |
| Google Calendar | User-granted OAuth scope (calendar events) | Optional integration; opt-in per user |

---

## Security Practices

- [x] Data is encrypted in transit (HTTPS everywhere, Supabase TLS, Asaas TLS)
- [x] Data is encrypted at rest (Supabase Postgres + AWS RDS encryption)
- [x] You can request data deletion (LGPD Art. 18 endpoint at `/configurações > Excluir minha conta` — Plan 02-02)
- [x] You follow Play Families Policy (we do NOT target children; app does NOT use COPPA-relevant data)
- [x] Independent security review: NO (deferred to post-launch; documented in `.planning/research/SUMMARY.md`)

---

## Privacy Policy URL

`https://app.milespro.net.br/privacidade`

Must be live BEFORE submitting Data Safety form.

---

## Approval Checklist

Before submitting the Data Safety form in Play Console:
- [ ] Every "Collected: YES" row corresponds to actual code in the app
- [ ] No NO row hides a real collection (audit: `grep -rE "navigator.geolocation|getUserMedia|Camera|MediaRecorder" src/`)
- [ ] Privacidade.tsx §5 sub-processors list matches "Data Shared" recipients exactly
- [ ] DPO email `dpo@milespro.net.br` visible in privacy policy
```

**3.2 — Convention enforcement:**
- 1:1 mapping with Privacidade.tsx §5 (single source of truth)
- pt-BR-aware naming (CPF, NFS-e) preserved in English context
- Audit grep commands inline so the founder can verify before submitting
- Defensive: every NO row has an explanation, not just a blank
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md','utf8'); const req=[['Email address','email row'],['User ID','UUID row'],['National ID (CPF)','CPF row'],['Asaas','Asaas recipient'],['PostHog','PostHog recipient'],['Sentry','Sentry recipient'],['Crisp','Crisp recipient'],['Privacy Policy URL','policy URL section'],['dpo@milespro.net.br','DPO email'],['encrypted in transit','security practice'],['data deletion','deletion claim']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: privacy nutrition labels missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: privacy nutrition labels runbook');"</automated>
  </verify>
  <done>
    03-06-PRIVACY-NUTRITION-LABELS.md captures every Play Data Safety category with YES/NO + rationale + sub-processor recipients matching Privacidade.tsx §5.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Write pt-BR release notes (v1.0.0)</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md</files>
  <read_first>
    - src/pages/Index.tsx (landing copy — value proposition)
    - .planning/REQUIREMENTS.md (TIER-01..06 — feature surface)
    - .planning/phases/03-mobile-distribution-launch/03-CONTEXT.md D-T15 (Outreach — language target)
  </read_first>
  <action>
**4.1 — Create `.planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md`:**

```markdown
# MilesPro — Notas de versão

## v1.0.0 (primeira versão Android)

Bem-vindo ao MilesPro! Saia da planilha. Tenha uma visão clara das suas milhas e pontos, com decisões inteligentes sobre quando e como usar.

**Principais recursos:**
- Cadastro de programas de fidelidade (Smiles, TudoAzul, LATAM Pass, Livelo, Esfera e mais)
- Acompanhamento de saldos e datas de vencimento
- Alertas de vencimento de milhas (planos Pro e VIP)
- Alertas personalizados de promoção de transferência (plano Pro)
- Gestão de múltiplos CPFs em uma só conta (plano VIP)
- Histórico de movimentação e relatórios
- Notificações push para vencimentos e promoções (planos Pro e VIP)

**Privacidade:**
Dados gerenciados em conformidade com a LGPD. Você pode exportar ou excluir seus dados a qualquer momento. Política completa em milespro.net.br/privacidade.

**Suporte:**
suporte@milespro.net.br ou via chat no app.

**Versão:** 1.0.0
**Data:** <date>
```

**4.2 — Character-count check (Play Console limit):**

Play Console "What's New" field limits to 500 chars per locale. The text above is ~600 chars; trim if needed for the actual Play submission. The longer form here is for documentation / `.planning/`.

**4.3 — Short form for Play "What's New" (500 chars):**

```
Bem-vindo ao MilesPro! Saia da planilha. Visão clara das suas milhas e pontos, decisões inteligentes sobre quando usar.

Principais recursos:
- Cadastro de programas de fidelidade BR
- Saldos e datas de vencimento
- Alertas de vencimento e de promoções (Pro+)
- Multi-CPF (VIP)
- Notificações push (Pro+)

Política em milespro.net.br/privacidade. Suporte: suporte@milespro.net.br.
```

Founder pastes the short form into Play Console.

**4.4 — Convention enforcement:**
- pt-BR throughout (D-T15 — BR audience)
- Mentions Pro+ gated features explicitly (no surprise paywall)
- LGPD callout matches Privacidade.tsx §5 declarations
- Support contact = suporte@milespro.net.br (canonical mailbox)
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const r=fs.readFileSync('.planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md','utf8'); const req=[['v1.0.0','version'],['MilesPro','app name'],['programas de fidelidade','feature: programs'],['vencimento','expiry feature'],['Pro','tier reference Pro'],['VIP','tier reference VIP'],['Multi-CPF','VIP feature'],['LGPD','compliance'],['privacidade','privacy link'],['suporte@milespro.net.br','support email']]; let fail=false; for (const [n,w] of req){if(!r.includes(n)){console.error('FAIL: release notes missing —',w);fail=true;}} if(fail)process.exit(1); console.log('OK: release notes pt-BR');"</automated>
  </verify>
  <done>
    03-06-RELEASE-NOTES.md has both long-form (for docs) and short-form (≤500 char for Play What's New) pt-BR release notes.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 5: [BLOCKING] Founder runbook — Internal Testing → Closed Testing → Production track</name>
  <files>.planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md</files>
  <read_first>
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (Play Console + tester allowlist + keystore strategy)
    - .planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md (Task 3)
    - .planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md (Task 4)
  </read_first>
  <what-built>
    Founder-driven Play Console submission. Claude generates the runbook here as a step-by-step checklist; the founder executes against Play Console UI.
  </what-built>
  <how-to-verify>
    Create `.planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md` with:

    ```markdown
    # Play Console Submission Runbook — Android v1.0.0

    **Created:** <date>
    **Status:** PENDING — awaiting founder execution

    ---

    ## Step 1: Generate release .aab build

    From a machine with Android Studio + JDK 17+ installed:

    ```bash
    cd C:/Users/Machado/Milespro/miles-pro-hub
    # Ensure latest web build is synced
    npm run build
    npx cap sync android

    # Create android/key.properties (gitignored) from the template:
    cp android/key.properties.example android/key.properties
    # Edit android/key.properties with the upload keystore path + passwords (from Plan 03-00 runbook)

    # Generate signed bundle
    cd android
    ./gradlew bundleRelease

    # Output: android/app/build/outputs/bundle/release/app-release.aab
    ```

    Capture in this runbook:
    - [ ] .aab built at: `<path>`
    - [ ] File size: `<bytes>` (expect ~20-50 MB for a Capacitor app)
    - [ ] Build duration: `<time>`

    ---

    ## Step 2: Upload to Internal Testing track

    1. Visit https://play.google.com/console/u/0/developers/<account-id>/app/<app-id>/tracks/internal-testing
    2. "Create new release" → upload `app-release.aab`
    3. Release name: `v1.0.0`
    4. Release notes: paste the short-form pt-BR from `03-06-RELEASE-NOTES.md`
    5. "Review release" → confirm:
       - Bundle name = `br.com.milespro.app`
       - versionCode = 1, versionName = 1.0.0
       - No pre-launch warnings
    6. "Start rollout to Internal testing"
    7. Add testers — founder email + 5-10 close contacts from Plan 03-00 allowlist
    8. Capture:
       - [ ] Internal testing release rolled out at: `<timestamp>`
       - [ ] Tester install URL: `<play-internal-testing-url>`

    ---

    ## Step 3: Pre-launch Report

    Play Console automatically runs the bundle against Pixel 8 (Android 15) and ~5 other devices.

    1. Wait 20-60 minutes after Internal Testing upload
    2. Visit https://play.google.com/console/u/0/developers/<account-id>/app/<app-id>/pre-launch-reports
    3. Verify the report (FOR THE PIXEL 8 + ANDROID 15 ROW SPECIFICALLY — ROADMAP SC#2 verbatim):
       - [ ] Crashes: 0
       - [ ] ANRs: 0
       - [ ] Security warnings: 0
       - [ ] Accessibility: review screenshots, fix critical issues if surfaced
       - [ ] Performance: note any cold-start > 3s and assess

    **If non-zero crashes/ANRs/security warnings on Pixel 8 + Android 15:**
    - Read the stacktraces
    - Reproduce locally via Android Studio emulator
    - Fix in source → re-bundle → re-upload (versionCode +1)
    - Do NOT promote to Closed/Production until Pixel 8 row is clean

    Capture:
    - [ ] Pre-launch report URL: `<url>`
    - [ ] Pixel 8 + Android 15 result: ZERO crashes/ANRs/warnings

    ---

    ## Step 4: Closed Testing track

    1. After Internal Testing + Pre-launch Report clean:
       - Play Console → Testing → Closed testing → "Promote" from Internal Testing
       - OR: Create new release on Closed Testing track → upload same .aab
    2. Expand tester allowlist to 30-40 community recruits (BR miles community emails captured via outreach)
    3. Wait 3-7 days for tester feedback (per D-T13 Android-first cadence)
    4. Capture:
       - [ ] Closed Testing release rolled out at: `<timestamp>`
       - [ ] Tester install URL: `<url>`
       - [ ] Feedback summary: `<notes>`

    ---

    ## Step 5: Data Safety Form

    1. Play Console → App content → Data safety
    2. Fill every field per `03-06-PRIVACY-NUTRITION-LABELS.md`
    3. Click "Save and review"
    4. Submit when all sections marked complete

    Capture:
    - [ ] Data Safety form submitted at: `<timestamp>`
    - [ ] Approval status: `<status>` (typically auto-approved unless audit flag)

    ---

    ## Step 6: Other App Content

    1. Privacy Policy URL → `https://app.milespro.net.br/privacidade`
    2. Content rating: Complete the IARC questionnaire (no violence, no adult content, no gambling → rating "E for Everyone")
    3. Target audience: 18+ (financial product)
    4. News app: NO
    5. COVID-19 contact tracing: NO
    6. Health: NO
    7. Government: NO
    8. Financial features → "Financial information management" if asked (this is the closest category)
    9. Ads: NO (no ads)

    Capture:
    - [ ] Content rating obtained: `<rating>`
    - [ ] Privacy Policy URL submitted

    ---

    ## Step 7: Production track submission

    1. Play Console → Production → "Create new release"
    2. Promote from Closed Testing OR upload .aab directly
    3. Release name: `v1.0.0` (production)
    4. Release notes: paste short-form from `03-06-RELEASE-NOTES.md`
    5. Rollout percentage: start at 20% (staged rollout — observe crash reports for 24h before bumping to 100%)
    6. "Start rollout to production"
    7. Google review begins (typically 1-3 days for first submission)

    Capture:
    - [ ] Production release submitted at: `<timestamp>`
    - [ ] Rollout %: 20% (staged)
    - [ ] Google review status: `<status>`
    - [ ] Production listing live at: `<timestamp>` (when approved)
    - [ ] Production listing URL: `https://play.google.com/store/apps/details?id=br.com.milespro.app`

    ---

    ## Step 8: Smoke test on a real Pixel device (post-approval)

    1. Install from Play Store URL on the founder's Pixel phone
    2. Test flows:
       - [ ] Sign up with email
       - [ ] Sign in with Google (Universal Link / App Link via assetlinks)
       - [ ] Create first user_program → expect push permission pre-prompt (Plan 03-05)
       - [ ] Grant permission → token registers (verify in Supabase Studio: `SELECT * FROM push_subscriptions WHERE user_id = <my uid>`)
       - [ ] Receive a test push via Asaas sandbox PAYMENT_CONFIRMED webhook (triggers asaas-webhook → enqueue-push → send-push-notification)
       - [ ] Tap notification → opens app to `/dashboard`
       - [ ] Open `/lgpd/confirm-delete?token=fake` via email simulator → App Link interception works

    Capture:
    - [ ] All 7 flows verified at: `<timestamp>`
    - [ ] Any failures: `<notes>`
    ```

  </how-to-verify>
  <resume-signal>
    Reply: "Play Console production release submitted, runbook updated with all 8 step timestamps."
  </resume-signal>
  <acceptance_criteria>
    - .planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md exists
    - Contains 8 H2 step headings
    - At least 1 [x] check mark with a captured timestamp
    - Production listing URL captured (once approved): `https://play.google.com/store/apps/details?id=br.com.milespro.app`
  </acceptance_criteria>
  <done>
    Android v1.0.0 promoted from Internal → Closed → Production track. Pre-launch Report on Pixel 8 + Android 15 returns ZERO crashes/ANRs/security warnings. Play Store production listing live. Runbook 03-06-PLAY-CONSOLE-RUNBOOK.md captures all 8 steps with timestamps.
  </done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-05 | Compliance / DoS | targetSdk < 35 → Play Store upload rejection | mitigate | Task 2 build.gradle versionCode=1 + Task 1 verifies targetSdk=35 via variables.gradle (Plan 03-01 prerequisite). Pre-launch Report won't even start if rejection at upload time. |
| T-3-04 | Compliance | AndroidManifest declares permissions the app does not use → Play warning + potential audit | mitigate | Task 1 limits permissions to INTERNET + POST_NOTIFICATIONS only; banned-string verification catches accidental CAMERA/LOCATION/AUDIO additions. Data Safety form (Task 3) further documents the data-collection surface. |
| T-3-04a | Information Disclosure | Privacy Policy → Data Safety form mismatch (PostHog "Optional?" YES requires explicit "Optional" claim in Play form) | mitigate | Task 3 derives Data Safety verbatim from Privacidade.tsx §5; founder Audit Checklist at end of Task 3 enforces. Single source of truth: Privacidade.tsx. |
| T-3-04b | Tampering | Upload keystore committed accidentally → secret leak | mitigate | Task 2.4 enforces .gitignore for `android/key.properties` + `android/app/*.jks`. Task 2.5 commits a template file (`key.properties.example`) so the founder knows the shape without committing the real file. |
</threat_model>

<verification>
```bash
# 1. Android manifest has POST_NOTIFICATIONS, no over-declared perms
grep -E 'POST_NOTIFICATIONS' android/app/src/main/AndroidManifest.xml
! grep -E 'CAMERA|ACCESS_FINE_LOCATION|RECORD_AUDIO' android/app/src/main/AndroidManifest.xml

# 2. build.gradle release config
grep -E 'versionCode 1|versionName "1.0.0"|minifyEnabled true' android/app/build.gradle

# 3. Runbooks exist
test -f .planning/phases/03-mobile-distribution-launch/03-06-PRIVACY-NUTRITION-LABELS.md
test -f .planning/phases/03-mobile-distribution-launch/03-06-RELEASE-NOTES.md
test -f .planning/phases/03-mobile-distribution-launch/03-06-PLAY-CONSOLE-RUNBOOK.md

# 4. .gitignore excludes keystore + properties
grep -E 'android/key.properties|android/app/\*\.jks' .gitignore

# 5. Pre-launch Report clean (manual confirmation in 03-06-PLAY-CONSOLE-RUNBOOK.md Step 3)
# 6. Production listing live (manual confirmation in 03-06-PLAY-CONSOLE-RUNBOOK.md Step 7-8)
```
</verification>

<success_criteria>
- POST_NOTIFICATIONS + INTERNET permissions ONLY in AndroidManifest.xml (no over-declared perms)
- build.gradle versionCode=1 + versionName=1.0.0 + minifyEnabled true on release + signingConfigs.upload
- ProGuard rules preserve Capacitor + Firebase + JavascriptInterface
- .gitignore excludes android/key.properties + *.jks
- Privacy Nutrition Labels runbook captures every Play Data Safety category
- pt-BR release notes (short + long form)
- Founder runbook walks through Internal → Closed → Production with checkboxes + URLs
- [BLOCKING] manual: Pre-launch Report clean on Pixel 8 + Android 15; production track approved by Google
</success_criteria>

<output>
After completion, create `.planning/phases/03-mobile-distribution-launch/03-06-SUMMARY.md` documenting:
- versionCode + Build .aab size + Play Console URL
- Pre-launch Report URL + verdict (ZERO crashes/ANRs/warnings on Pixel 8 + Android 15)
- Submission date + approval date + production listing URL
- Tester recruitment count (Internal: founder + 5-10; Closed: 30-40 community)
- Any deviations (re-uploads required, ANRs discovered + fixed, etc.)
- Reminder for Plan 03-07 (iOS submission): App Privacy nutrition labels follow the same pattern but in Apple's format; reuse the Play form answers as the source
- Reminder for Plan 03-08 (helpdesk): once production-live, monitor Play Console reviews; integrate with helpdesk SLA runbook
</output>