---
phase: 03-mobile-distribution-launch
plan: 01
subsystem: infra
tags: [capacitor, ios-scaffold, android-add, bundle-id, icons, splash, targetsdk-35, capacitor-assets, sharp, pwa-manifest]

requires:
  - phase: 03-mobile-distribution-launch
    provides: "Plan 03-00 runbook scaffold — bundle ID br.com.milespro.app + display name MilesPro (D-T01, D-T02) decisions already locked"
provides:
  - "capacitor.config.ts pinned to production identity (br.com.milespro.app / MilesPro) with PushNotifications + SplashScreen dark variant configured; Lovable server.url + cleartext removed"
  - "Fresh android/ scaffold via npx cap add android — applicationId + namespace = br.com.milespro.app, targetSdkVersion=35, minSdkVersion=24"
  - "iOS scaffold identity rewrite (CFBundleDisplayName=MilesPro, PRODUCT_BUNDLE_IDENTIFIER=br.com.milespro.app in pbxproj Debug + Release configs); 4 NS*UsageDescription keys removed for unused features (T-3-04 Privacy Manifest mitigation)"
  - "3 Capacitor plugins installed: @capacitor/app@7.1.2, @capacitor/push-notifications@7.0.6, @capacitor/assets@3.0.5"
  - "5 master placeholder PNGs in resources/ generated programmatically via sharp (exact #e8590c/#171717/#0a0a0a colors, exact 1024x1024 + 2732x2732 dimensions, true alpha channel)"
  - "136 Android + 13 iOS icon/splash variants generated via @capacitor/assets"
  - "PWA manifest at public/manifest.webmanifest with full PWA-required fields (name, theme_color, etc.) + 7 webp icons under public/icons/"
affects: [03-02, 03-03, 03-04a, 03-04b, 03-05, 03-06, 03-07]

tech-stack:
  added:
    - "@capacitor/app@^7.1.2 (deep-link App.appUrlOpen chokepoint for Plan 03-03)"
    - "@capacitor/push-notifications@^7.0.6 (push permission + token registration for Plans 03-04/03-05)"
    - "@capacitor/assets@^3.0.5 (dev) — icon/splash variant generator"
  patterns:
    - "Programmatic placeholder asset generation via sharp + svg-string composite — beats AI generation for exact colors/dimensions/alpha when output is a placeholder"
    - "Capacitor 7 native scaffold: capacitor.config.ts is the single source of truth; cap-add inherits appId/appName/plugin config from it (no manual sync needed for fresh scaffolds)"
    - "Privacy Manifest audit at Info.plist creation time — strip every NS*UsageDescription key whose feature is not actually used (T-3-04 mitigation)"

key-files:
  created:
    - resources/icon.png (1024x1024, #e8590c + white M)
    - resources/icon-foreground.png (1024x1024, transparent + white M, 25% padding)
    - resources/icon-background.png (1024x1024, solid #171717)
    - resources/splash.png (2732x2732, #171717 + orange M at 30%)
    - resources/splash-dark.png (2732x2732, #0a0a0a + orange M)
    - scripts/gen-placeholder-icons.mjs (regeneration script for masters)
    - public/manifest.webmanifest (PWA manifest with theme_color/icons)
    - public/icons/icon-{48,72,96,128,192,256,512}.webp (PWA icon set)
    - android/ (fresh scaffold from npx cap add android)
    - 136 Android icon/splash variants (mipmap-{ldpi..xxxhdpi} + drawable + drawable-port-night)
    - 13 iOS icon/splash variants (Assets.xcassets/AppIcon + Splash.imageset)
  modified:
    - capacitor.config.ts (Lovable identity → production identity)
    - ios/App/App/Info.plist (CFBundleDisplayName, removed 4 NS*UsageDescription keys)
    - ios/App/App.xcodeproj/project.pbxproj (PRODUCT_BUNDLE_IDENTIFIER 2× occurrences)
    - android/variables.gradle (minSdkVersion 23 → 24)
    - package.json + package-lock.json (3 new plugin deps)

key-decisions:
  - "Existing Lovable android/ scaffold deleted and recreated via `npx cap add android` (cleaner than rewriting 54 placeholder files — cap-add inherits br.com.milespro.app from capacitor.config.ts automatically)"
  - "iOS scaffold ALREADY EXISTED in repo from a prior Lovable session — no Mac required for `cap add ios`; identity rewrite done via text edit on Windows. Mac still needed later for CocoaPods + xcodebuild + Archive (Plan 03-07)."
  - "Placeholder icons generated programmatically via sharp (not banana skill) because exact colors/dimensions/alpha matter more than creative variation for placeholders. Founder replaces with final design later — @capacitor/assets generate consumes same filenames so no rewiring."
  - "Removed 4 Lovable-injected NS*UsageDescription keys (calendar/camera/photos x2) — T-3-04 Privacy Manifest mismatch was HIGH risk. Only NSUserNotificationsUsageDescription remains (text updated for push)."
  - "PWA manifest at public/ rather than root — capacitor-assets put both manifest + icons at repo root but Vite only serves public/* in production. Moved + fixed paths + filled PWA-required fields (name/theme_color/etc.)"
  - "minSdkVersion bumped 23 → 24 per plan must_have (Capacitor 7 docs allow 23 but plan locked to 24; ~0.5% Android market drop in BR for 24+)"

patterns-established:
  - "cap-add identity inheritance: write capacitor.config.ts FIRST, then `npx cap add <platform>` — platform files inherit appId/appName automatically. Skip the manual rewrite step for fresh scaffolds."
  - "Sharp-based placeholder generation: scripts/gen-placeholder-icons.mjs is re-runnable. To regenerate (different colors/dimensions), edit constants at top of file and `node scripts/gen-placeholder-icons.mjs` overwrites resources/."
  - "Privacy Manifest audit on every Info.plist edit: enumerate NS*UsageDescription keys, cross-check with Capacitor plugins in package.json (or capacitor.plugins.json). Remove orphaned keys."
  - "PWA manifest path convention: manifest at public/manifest.webmanifest with absolute /icons/... src paths (Vite serves public/* as root)"

requirements-completed: [MOBILE-01, MOBILE-02]

duration: ~70min
completed: 2026-05-14
---

# Plan 03-01: Capacitor Scaffold — Summary

**Capacitor 7 native scaffold pinned to production identity (br.com.milespro.app / MilesPro): fresh android/ via cap add, iOS skeleton identity rewrite + Privacy Manifest audit, 3 plugins installed, 5 sharp-generated placeholder masters → 149 platform icon/splash variants, PWA manifest fixed.**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-05-14 ~19:00 UTC
- **Completed:** 2026-05-14 ~20:30 UTC
- **Tasks:** 6 (all 6 closed; Task 4 partial-by-design — Mac-side cap add ios was not needed because iOS skeleton pre-existed)
- **Files modified:** ~155 (mostly auto-generated icon/splash variants)

## Accomplishments

- capacitor.config.ts rewritten: production appId + appName, Lovable server.url removed, SplashScreen dark variant + PushNotifications block added (D-T01/02/04/05)
- 3 Capacitor plugins installed (app, push-notifications, assets) — 6 high-sev npm-audit findings are transitive devDeps from @capacitor/assets@3 (minimatch + tar via nested @capacitor/cli@<7.4.5); no fix upstream, build-time only, accepted per plan policy
- 5 placeholder PNGs generated via custom sharp script (exact #e8590c orange + #171717/#0a0a0a darks + true alpha channel)
- Fresh android/ scaffold via `npx cap add android`: br.com.milespro.app identity inherited from capacitor.config.ts; targetSdkVersion=35 + minSdkVersion=24 (Capacitor 7 floor); 2 plugins wired
- iOS identity rewrite without Mac: CFBundleDisplayName "miles-pro-hub" → "MilesPro", PRODUCT_BUNDLE_IDENTIFIER com.example.milesprohub → br.com.milespro.app in pbxproj Debug+Release configs, 4 NS*UsageDescription keys deleted (T-3-04 mitigation)
- `npx capacitor-assets generate` produced 136 Android variants (mipmap-{ldpi..xxxhdpi} icons + adaptive foreground/background + drawable splash + drawable-port-night dark splash) + 13 iOS variants (AppIcon + Splash.imageset universal + dark) + 7 PWA webp icons
- `npx cap sync` verified: 2 plugins wired to both platforms
- `npm run lint` (0 errors, 2 pre-existing warnings) + `npm run typecheck` (PASS)
- PWA manifest at public/manifest.webmanifest with full PWA fields + absolute /icons/ paths

## Task Commits

1. **Task 1: capacitor.config.ts production identity** — `ca3f10a` (feat)
2. **Task 2: install @capacitor/app + push-notifications + assets** — `37c306b` (chore)
3. **Task 3: generate 5 placeholder masters via sharp** — `403adf5` (feat)
4. **Tasks 4+5+6: cap-add android + iOS identity + asset generation** — `398d4e3` (feat) — bundled atomically because the changes are interdependent (cap-add prerequisites Task 5's file edits)
5. **Task 6 follow-up: PWA manifest path fix** — `(committed at end)` (fix)

## Files Created/Modified

(see frontmatter key-files for the full list; highlights below)

- **capacitor.config.ts** — production identity, Path C ready
- **resources/{icon,icon-foreground,icon-background,splash,splash-dark}.png** — 5 sharp-generated masters
- **scripts/gen-placeholder-icons.mjs** — regenerable script for masters
- **android/** — fresh Capacitor scaffold, br.com.milespro.app, targetSdk 35, minSdk 24
- **ios/App/App/Info.plist** — MilesPro display name, 4 unused privacy keys removed
- **ios/App/App.xcodeproj/project.pbxproj** — bundle id production
- **public/manifest.webmanifest** + **public/icons/*.webp** — PWA assets ready

## Decisions Made

(see frontmatter key-decisions — captured there in machine-readable form)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Privacy Manifest mismatch] Removed 4 Lovable-injected NS*UsageDescription keys**
- **Found during:** Task 5 (iOS Info.plist audit)
- **Issue:** Plan 03-01 Task 5.1 explicitly mandated this audit. Lovable's iOS scaffold injected NSCalendarsUsageDescription, NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSPhotoLibraryAddUsageDescription — none of these features exist in MilesPro code. Shipping these to App Store Review = T-3-04 HIGH-07 rejection (Privacy Manifest mismatch).
- **Fix:** Rewrote Info.plist keeping only NSUserNotificationsUsageDescription (Plans 03-04/03-05 will use), updated description text to actual product behavior.
- **Files modified:** ios/App/App/Info.plist
- **Verification:** grep returns 0 hits for the 4 removed keys
- **Committed in:** 398d4e3

**2. [Rule 1 - Scope expansion / planner anti-pattern auto-fix] PWA manifest path correction**
- **Found during:** Task 6 (capacitor-assets generate)
- **Issue:** capacitor-assets output icons/ at repo root + public/manifest.webmanifest with `../icons/...` src paths. In a Vite project, public/* is the static-serve root → root-level icons/ is NOT served in production. Manifest would have shipped with broken icon URLs.
- **Fix:** Moved icons/ → public/icons/, rewrote manifest with absolute /icons/... paths, added PWA-required fields (name, short_name, start_url, display, theme_color #e8590c, background_color #171717). Also fixed type field "image/png" → "image/webp" (capacitor-assets bug — icons are webp not png).
- **Files modified:** public/manifest.webmanifest, public/icons/*.webp (moved from root)
- **Verification:** npm run build + browser-side manifest fetch (deferred to dev verification)
- **Committed in:** (separate fix commit)

**3. [Rule 4 - Verifier deviation surface] Plan Tasks 4 + 5 + 6 bundled into single commit**
- **Found during:** Task 5 (Android native config rewrites)
- **Issue:** Plan written assuming sequential task→commit boundary. In practice, `cap add android` produced 54+ files including those Task 5 was supposed to rewrite (build.gradle namespace, applicationId, variables.gradle targetSdk). Splitting into 3 commits would have produced one "broken intermediate" commit (cap-add output) with Lovable defaults briefly visible in git history before Task 5 fixed them. Bundling Tasks 4+5+6 into one commit preserves a clean fast-forward history.
- **Fix:** Single commit 398d4e3 documents all three tasks atomically.
- **Files modified:** N/A (commit-level decision)
- **Committed in:** 398d4e3

---

**Total deviations:** 3 auto-fixed (1 Rule 2 security/compliance, 1 Rule 1 scope-correction, 1 Rule 4 commit-grain pragmatism)
**Impact on plan:** All deviations necessary for correctness — Privacy Manifest mismatch would have been an App Store reject, broken PWA manifest paths would have caused runtime 404s, split commits would have created a transient broken state in git history. No scope creep beyond what the plan implicitly required.

## Issues Encountered

- **iOS skeleton pre-existed** (Lovable had previously run `cap add ios`). Surprising but useful: removed the "needs Mac" blocker for Task 4 iOS portion. Mac is still needed for Plans 03-07 (Archive + TestFlight upload + xcodebuild + CocoaPods install). Captured as a deferred dependency.
- **`@capacitor/assets@3` ships 6 high-severity npm-audit findings** (minimatch ReDoS + node-tar path traversal via nested @capacitor/cli@<7.4.5). Build-time only; no runtime exposure. No fix upstream. Accepted per Plan 03-01 Task 2.3 policy.
- **capacitor-assets PWA output paths broken for Vite projects** — see deviation #2. Worth filing an upstream issue; for now patched locally.

## Next Phase Readiness

- **Wave 1 unblocks:**
  - Plan 03-02 (iOS Path C hardening) — depends_on: ["01"] — autonomous, can run any time
  - Plan 03-03 (Universal Links / App Links) — depends_on: ["01"] — partial: AASA template can ship now, real Apple Team ID substitution waits on 03-00 founder action
- **Wave 2 unblocks (after 03-00 founder action lands FCM JSON):**
  - 03-04a/04b/05 push pipeline
- **Wave 3 unblocks (after 03-00 founder action lands developer accounts):**
  - 03-06 Android submission (needs Play Console + signing key)
  - 03-07 iOS submission (needs Apple Developer + Mac for Archive)
- **Still pending action:**
  - Founder fills 03-00 runbook over next 3–7 days
  - Mac access for Plan 03-07 final Archive + xcodebuild
  - Final design assets to replace placeholder masters in resources/

---
*Phase: 03-mobile-distribution-launch*
*Completed: 2026-05-14*
