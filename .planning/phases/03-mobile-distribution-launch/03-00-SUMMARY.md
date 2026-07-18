---
phase: 03-mobile-distribution-launch
plan: 00
subsystem: infra
tags: [hard-blocker, accounts, apple-developer, play-console, firebase, founder-action, runbook]

requires:
  - phase: 02-monetiza-o-compliance-telemetria
    provides: "PJ entity (CNPJ) workstream — Apple Developer Program enrollment requires it"
provides:
  - "Founder-owned runbook 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md with step-by-step instructions for Apple Developer Program enrollment (PJ + DUNS + .p8 keys + Services ID + Sandbox Tester), Google Play Console (App Signing + Closed Testing track), and Firebase (project + Android/iOS apps + APNs upload + FCM service-account JSON)"
  - "Quick Reference Table with 14 placeholder credentials downstream plans grep for (Apple Team ID, SHA-256 fingerprints, Firebase project_id, FCM client_email, etc.)"
  - "Rotation calendar for credential lifecycle management (6mo .p8 keys, quarterly FCM JSON)"
  - "Critical-path Gantt showing parallelism opportunity (Apple + Play + Firebase tracks)"
affects: [03-01, 03-03, 03-04, 03-05, 03-06, 03-07]

tech-stack:
  added: []
  patterns:
    - "Founder-action runbook with placeholder credentials — downstream plans grep the runbook for the value they need (Apple Team ID, SHA-256, FCM client_email, etc.)"
    - "Threat-mitigated capture: secret values (passwords, .p8 file contents, FCM JSON contents) stay in password manager — runbook captures only references/paths"

key-files:
  created:
    - .planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md
  modified: []

key-decisions:
  - "Runbook scaffold ships NOW with placeholders; founder fills in over 3–7 days as Apple/Play/Firebase approvals land. Plan tracks as scaffold_complete_awaiting_action until all <PLACEHOLDER> tokens are replaced."
  - "Commit google-services.json (Firebase docs explicitly permit; contains only public app-id config). Plan 03-04 will add `*-firebase-adminsdk-*.json` to .gitignore to protect the service-account JSON."
  - "Apple Sandbox Tester credentials: email in runbook (committed), password reference is `1Password → Apple Sandbox Tester #N` (never in repo)."

patterns-established:
  - "External-account provisioning runbook: scaffold the checklist now with placeholders so downstream plans have a stable grep target; founder fills in credentials over time"
  - "Quick Reference Table at top of runbook = single grep surface for downstream plans (avoid scanning sections to find a value)"

requirements-completed: [LAUNCH-02, LAUNCH-03, MOBILE-04, MOBILE-05]

duration: ~25min (scaffold-only)
completed: 2026-05-14
status: scaffold_complete_awaiting_founder_action
---

# Plan 03-00: Account Provisioning Runbook — Summary

**Founder-owned runbook scaffolded with step-by-step instructions for Apple Developer Program ($99/yr via PJ + DUNS), Google Play Console ($25 one-time), and Firebase (FCM + APNs). 14 credential placeholders ready for founder to fill in over 3–7 days.**

## Performance

- **Duration:** ~25 min (scaffold-only — runbook content + threat notes + critical-path table)
- **Started:** 2026-05-14
- **Completed:** 2026-05-14 (scaffold; founder action ongoing)
- **Tasks (per plan):** 4 (all type=checkpoint:human-action, deferred to founder)
- **Files modified:** 1

## Accomplishments

- 03-00-ACCOUNT-PROVISIONING-RUNBOOK.md (330 lines) covering:
  - Apple Developer Program enrollment (DUNS pre-step, $99 fee, 3 .p8 keys: APNs + Sign in with Apple + Services ID, Sandbox Tester creation)
  - Google Play Console setup (App Signing enrollment, SHA-256 capture, Closed Testing track + allowlist)
  - Firebase project (Android + iOS apps register, APNs key upload, FCM service-account JSON generation)
- Quick Reference Table at top with 14 placeholder rows mapping credential → downstream plan consumer
- Rotation Calendar with 4 cadences (6mo .p8 keys, quarterly FCM JSON, annual Apple Dev renewal)
- T-3-07 + T-3-08 + T-3-08b threat notes embedded inline
- Critical-path Gantt (Day 0 → Day 7) showing Apple/Play/Firebase parallelism

## Task Commits

1. **Plan scaffold** — `6748c98` (docs(03-00): scaffold account provisioning runbook with founder checklist)

Tasks 0a/0b/0c/0d are `checkpoint:human-action` type — they complete as the founder pastes back the real credential values during the next 3–7 days. No further atomic commits from Claude until that resumes.

## Files Created/Modified

- `.planning/phases/03-mobile-distribution-launch/03-00-ACCOUNT-PROVISIONING-RUNBOOK.md` — 330-line founder checklist with placeholder Quick Reference Table

## Decisions Made

- Scaffold-now-fill-later approach: produce the checklist structure + instructions + Quick Reference Table immediately so the founder has a stable working document. Downstream plans (03-03 AASA, 03-04 FCM Vault secret) can grep for `<TEAM_ID>`, `<FIREBASE_PROJECT_ID>`, etc. as canonical names and surface "value still placeholder" failures at runtime if founder action is incomplete.
- iOS GoogleService-Info.plist placement deferred to Plan 03-01 (now: Plan 03-07) — runbook captures the file location but the file is moved into `ios/App/App/` only after `cap add ios` materializes the directory. Plan 03-01 executed against a pre-existing iOS skeleton (Lovable scaffold), so this step actually closed in 03-01.

## Deviations from Plan

None — plan executed as written for the scaffold portion. The 4 checkpoint:human-action tasks remain unresolved pending external founder action (Apple Developer approval, Play Console approval, Firebase project setup).

## Issues Encountered

None during scaffolding. Hard-blockers (Apple Developer + Play Console approval timing) remain as expected.

## Next Phase Readiness

- **Unblocks:** structurally, none yet — downstream plans need real credential values (Team ID, SHA-256, FCM JSON) before they can fully verify. However:
  - Plan 03-01 (Capacitor scaffold) does NOT need 03-00 credentials — ran in parallel, completed in same session
  - Plan 03-02 (iOS Path C hardening) does NOT need 03-00 credentials — autonomous, can run anytime
  - Plan 03-03 (deep links) needs Apple Team ID + Android App Signing SHA-256 — gated on 03-00 founder action
  - Plan 03-04 (push schema/edge fns) needs FCM service-account JSON — gated on 03-00 founder action
  - Plans 03-06 + 03-07 (Android + iOS submission) need approved developer accounts — gated on 03-00 founder action
- **Founder action queue:** open DUNS request + Apple Developer enrollment + Play Console + Firebase project in parallel (D0). Apple is the long pole (3–7d). Firebase can complete Day 0.
- **Resume signal:** when Quick Reference Table has zero `<PLACEHOLDER>` rows, founder pastes `"Runbook consolidated, Quick Reference Table complete, no placeholders remaining."` in chat; plan 03-00 marks fully done.

---
*Phase: 03-mobile-distribution-launch*
*Completed (scaffold): 2026-05-14*
*Status: scaffold_complete_awaiting_founder_action*
