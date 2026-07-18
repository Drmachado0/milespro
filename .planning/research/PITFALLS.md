# Domain Pitfalls — MilesPro

**Domain:** Paid-tier SaaS in Brazil (Free / Pro / VIP) — miles & points data, CPFs, Web + iOS + Android via Capacitor
**Researched:** 2026-05-11
**Milestone context:** Subsequent milestone (brownfield) — going from "functional" to "first 10 paying users"
**Overall confidence:** HIGH on Apple/Google/LGPD/Stripe-Brazil specifics; MEDIUM on conversion/support pitfalls (operational best-practice, not vendor docs)

---

## Overview

This document is the "list of things that kill the launch" — derived from MilesPro's actual `CONCERNS.md` (where several pitfalls have **already manifested in code**) crossed with current (May 2026) reality of Apple, Google, LGPD/ANPD and Stripe-Brazil. It is not a generic SaaS checklist; every pitfall maps either to a concrete file in the repo or to a vendor rule that has rejected apps in 2025–2026.

Three pitfalls are existential to the milestone "first 10 paying users":

1. **Plan gating client-side only** (CRIT-01) — already in the codebase, see `CONCERNS.md` Security section. Ship as-is = guaranteed revenue leak.
2. **Apple IAP rule 3.1.1** (CRIT-03) — direct Stripe checkout in the iOS app **will be rejected**. There is a legal workaround, but it has trade-offs that must be designed for, not patched in.
3. **Service-role key in client bundle** (CRIT-02) — `VITE_` prefix on `SUPABASE_SERVICE_ROLE_KEY` in `src/integrations/supabase/client.ts:7`. If this env var is ever set, every site visitor receives a key that bypasses RLS. End of product.

Everything else is "expensive lesson" rather than "fatal", but several (LGPD 15-day deadline, webhook double-billing, trial abuse) will produce visible damage within the first 10 paying users if not handled.

---

## Critical Pitfalls (CRITICAL — must be fixed before any paid charge)

### CRIT-01 — Plan gating done only on the client / route guard

**Already manifested:** `src/components/PlanProtectedRoute.tsx:28` is the only check; all `travel_*` and `vip_*` table policies in `supabase/migrations/20260131123615_*.sql` only check `auth.uid() = user_id`. A `free` user with their own JWT can `POST /rest/v1/travel_cruises` and create rows the UI claims to forbid. (`CONCERNS.md` flags this as the single biggest finding.)

**Why it happens:** "Hide the menu item" is the natural first instinct when you're prototyping. The route guard works in the browser, so it feels done. Server-side enforcement requires changing every RLS policy and is invisible work.

**Consequences:** Free users get paid features for free. Worse — once discovered (it will be, within hours of launch on Reddit/Twitter), refund disputes cite the policy gap directly. Class-action exposure in BR is non-trivial when the gap touches CPFs/financial data.

**Warning signs to detect early:**
- Any `requiredPlans={[...]}` prop on a route component without a matching `can_access_feature()` call in the corresponding RLS policy
- RLS policies that only reference `auth.uid()` and never `subscription_plan` / `can_access_feature()`
- `useSubscription().canAccessPro` used anywhere as the *only* gate (search: `canAccessPro`, `canAccessVip`)
- `as never` / `as unknown as` casts in travel hooks (`CONCERNS.md` lists 14) — bypass type system makes wrong-table writes invisible

**Prevention:**
1. Add `WITH CHECK (auth.uid() = user_id AND public.can_access_feature(auth.uid(), 'agency'))` to every `travel_*` insert/update policy.
2. Add equivalent `USING` clauses to SELECT policies so a downgrade from Pro→Free immediately hides paid data (decide policy: hide vs. read-only; document the choice).
3. Write **negative** integration tests: spin up a `free` user, attempt direct REST POST to `travel_*`, assert 403. Without negative tests, the policy can be silently regressed.
4. Audit views separately — RLS does **not** automatically apply to views unless created `with (security_invoker = true)` (Postgres ≥ 15) or you add explicit policies. A view over a protected table is the most common silent leak.

**Phase mapping:** Phase 1 (Security hardening) — `SEC-01`/`SEC-02` in PROJECT.md. Blocks all PAY-* work.

**Severity:** CRITICAL

---

### CRIT-02 — Service-role key referenced in client bundle (`VITE_` prefix is fatal)

**Already manifested:** `src/integrations/supabase/client.ts:7` reads `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` and constructs a `supabaseAdmin` client. The author comment claims "use only in trusted environments" — but **`import.meta.env` is a build-time substitution that lands in the JS bundle every visitor downloads.** There is no "trusted environment" in client code.

**Why it happens:** Vite's auto-completion suggests `VITE_*` variants of every env var. Anyone who copies the `SUPABASE_*` block into Vercel/Netlify dashboards will tick the wrong box once.

**Consequences:** The service-role key bypasses every RLS policy. With it, any visitor can read/write/delete any row in any table — including `user_subscriptions` (self-elevate to VIP), `auth.users` (read every CPF), or `travel_*` (export every customer's miles data). This is "fold the company" tier; LGPD breach notification within 72 hours, ANPD fine up to 2% of BR revenue or R$ 50M.

**Warning signs:**
- Any reference to `import.meta.env.VITE_*SERVICE*` anywhere in `src/`
- A `supabaseAdmin` export from the client package (no legitimate reason exists)
- Build pipeline does not fail when a `VITE_*SERVICE*` env var is set
- Bundle search post-build: `grep -r 'service_role\|sk_' dist/` should return zero matches

**Prevention:**
1. **Delete** lines 7 and 22-29 of `src/integrations/supabase/client.ts`. Service-role usage belongs only in `supabase/functions/*` (Deno edge runtime) where it reads `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.
2. Add a build-time guard: `if (Object.keys(import.meta.env).some(k => k.includes('SERVICE'))) throw new Error('Service-role key in client env')`. Fail-fast in CI.
3. Add a post-build `grep` step in `.github/workflows/ci.yml` that fails the build if any known service-role-key prefix appears in `dist/`.
4. Rotate the current service-role key in Supabase dashboard — assume it has already leaked given the file has existed for months.

**Phase mapping:** Phase 1 (Security hardening) — `SEC-03`. Cannot ship a single paying user with this present.

**Severity:** CRITICAL

---

### CRIT-03 — Apple IAP rule 3.1.1 / direct Stripe checkout in iOS app = rejection

**The rule:** Apple Guideline 3.1.1 requires that "if you want to unlock features or functionality within your app — subscriptions, premium content, **software as a service** — you must use Apple's in-app purchase system." SaaS is explicitly listed. Direct Stripe checkout for the Pro/VIP upgrade flow inside the iOS Capacitor app **will be rejected** at review.

**Why it happens:** The web/Android version uses Stripe natively. Devs assume the same code path works on iOS because the WebView renders it. It does — until the reviewer opens the app and sees a non-Apple subscription button.

**Consequences:** App rejected. Re-submission cycle is ~7 days. Multiple rejections flag the team account (`LAUNCH-02` blocked; iOS revenue = 0).

**Apple's allowed paths for MilesPro (May 2026 reality):**

| Path | Rule | Trade-off |
|------|------|-----------|
| **A. Use Apple IAP for iOS subscriptions** | 3.1.1 — fully compliant | 30% Apple fee (15% after Y1, or under Small Business Program ≤ $1M/yr); subscriptions managed in Apple's UI; dual-source-of-truth headache (Apple receipts + Stripe for web/Android) |
| **B. "Reader app" exception under 3.1.3(a)** | Allowed if app's primary purpose is consumption of *content* (audio/video/news/books) | **Does not fit MilesPro** — miles data is not "content" in Apple's sense; rejected if claimed |
| **C. Sign-in only, no upgrade UI in app** | Allowed: account creation/sign-in, paid tier changes happen on web only | Cleanest for MVP. iOS app shows upgrade banner that does *not* link to a paywall, only explains what Pro unlocks. Users upgrade via web, then re-open the app. Loses some conversion. |
| **D. External link entitlement (3.1.1(a))** | Available in some storefronts (US/EU) but **not generally available in Brazil** as of May 2026; requires entitlement application + 27% Apple fee on external transactions | Not viable for BR-first launch |

**Recommendation for MilesPro:** Path **C for the v1 launch** (no upgrade UI on iOS), then evaluate Path A in milestone 2 once revenue justifies the Apple integration cost. Document this trade-off explicitly in `Assinatura.tsx` for iOS — the `isPlatform('ios')` branch should hide all Stripe CTAs and show a "manage subscription on milespro.com.br" message instead. Crucially: **do not link out to a Stripe checkout URL from inside the iOS app** — that is a 3.1.1(a) violation when the link is "encouraging users to use a payment method other than IAP". A neutral "go to your account on the web" message is allowed.

**Warning signs:**
- iOS review feedback mentioning "3.1.1" or "in-app purchase"
- Capacitor app shows a "Upgrade to Pro" button that opens Stripe checkout in `Browser.open()` — instant rejection
- App description on App Store Connect mentions "subscription" without an IAP product configured

**Prevention:**
1. Wrap every paywall CTA in `Capacitor.getPlatform() !== 'ios'` for v1.
2. iOS-only "Subscription info" page that lists features but only links to "Manage on web" with an iOS-acceptable wording (no "Buy", no "Upgrade now", no price).
3. If/when adopting IAP later: use `@capacitor-community/in-app-purchases` or RevenueCat (recommended — handles Apple/Google/Stripe reconciliation, ~$0–$8K/mo depending on revenue, $0 free tier ≤ $2.5K MTR). Start design now with RevenueCat as the abstraction.

**Phase mapping:** Phase 3 (Mobile distribution / launch) — `LAUNCH-02`. Design decision needed in Phase 2 (Monetization) before pricing UI is built.

**Severity:** CRITICAL

---

### CRIT-04 — Webhook handler without idempotency = double-billing / double-upgrades

**The Stripe reality:** Stripe documentation explicitly warns that webhook endpoints "occasionally receive the same event more than once" due to network timeouts, retries, or infrastructure issues. Stripe retries with exponential backoff for up to 3 days. Without idempotency, a `customer.subscription.created` event delivered twice = two upgrade emails, two PostHog conversion events, possibly two `subscription_plan` updates with conflicting state if two events race.

**Why it happens:** First webhook handler is "happy path" code. The retry behavior only manifests under load or during Stripe maintenance windows — exactly when it hurts most.

**Consequences:** Duplicate upgrade emails (looks unprofessional to first 10 users). Inflated conversion metrics in TEL-01. Worst case: race between `subscription.deleted` (cancel) and a delayed retry of `subscription.created` flips the user from canceled back to active and re-charges them next cycle.

**Concrete idempotent pattern (recommended for `PAY-02`):**

```sql
-- Migration
CREATE TABLE webhook_events_processed (
  event_id TEXT PRIMARY KEY,            -- Stripe event.id (evt_*)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_hash TEXT                     -- optional: detect payload mutation across retries
);
```

```typescript
// Edge function: stripe-webhook/index.ts
const event = stripe.webhooks.constructEvent(body, sig, secret);

// 1. Acknowledge fast (Stripe must see 2xx within ~30s; do work async if needed)
// 2. Idempotency check FIRST — single round-trip via INSERT ... ON CONFLICT
const { error } = await supabaseAdmin
  .from('webhook_events_processed')
  .insert({ event_id: event.id, event_type: event.type });

if (error?.code === '23505') {
  // Duplicate — already processed, return 200 silently
  return new Response('ok', { status: 200 });
}

// 3. Now safe to process side effects
await handleEvent(event);
```

**Critical ordering:** mark-as-processed **before** side effects that are themselves not idempotent (sending email via Resend, posting to PostHog). If you mark after, a crash mid-handler replays the email on retry. If you mark before and the side effect fails, you need an explicit retry queue (separate concern; OK for MVP to log + alert).

**Warning signs:**
- Webhook handler does `await sendEmail(...)` before any database write
- No `event.id` column anywhere
- `subscription_plan` updated with `UPDATE` instead of conditional update (e.g. `UPDATE ... WHERE updated_at < event.created_at`)

**Prevention:**
1. Migration above + the insert-first pattern.
2. Add `pg_stat_statements` query to detect duplicate `event.id` attempts post-launch.
3. **Test with Stripe CLI:** `stripe trigger customer.subscription.created` twice in a row; verify second invocation returns 200 and does not re-upgrade.
4. Use Stripe's built-in idempotency keys for any *outbound* API calls in the handler (e.g. creating a refund).

**Phase mapping:** Phase 2 (Monetization) — `PAY-02`. Untestable post-hoc; must be designed in.

**Severity:** CRITICAL

---

### CRIT-05 — LGPD violations on signup/cancellation (the 15-day clock)

**The LGPD reality:** Article 19 gives data subjects the right to confirmation, access, correction, anonymization, blocking and **deletion** of their personal data. **Response deadline: 15 days from request, with no extension allowed** (compared to GDPR's 30 days and CCPA's 45 — Brazil is the strictest in the OECD on this metric). The ANPD has been actively fining since 2023; 2026 enforcement is mature.

**MilesPro-specific PII inventory** (everything below counts as "dado pessoal" or "dado pessoal sensível"):
- `auth.users.email`, `phone` — personal data
- `profiles.cpf` — personal data, treated as "identificador governamental" (extra documentation duty)
- `travel_*` rows linking CPF to itineraries — could constitute "perfil comportamental"
- Miles balances tied to CPF — financial data, not technically "sensitive" in LGPD terms but ANPD has signaled financial data warrants higher care
- IP + geolocation logged by Supabase — personal data
- PostHog/Sentry events tied to `user_id` — personal data via inferential link

**Why violations happen:**
- Signup flow has no granular consent (one giant "concordo com tudo" checkbox is **not valid** under LGPD Art. 8 §4 — consent must be specific and informed for each purpose)
- "Delete my account" deletes `auth.users` but leaves orphaned `travel_*`, `operations`, `profiles`, audit logs, PostHog events, Stripe customer
- No data export endpoint (Art. 18 IV requires "portabilidade" — machine-readable format)
- Privacy policy doesn't list third-party processors (Supabase, Stripe, PostHog, Sentry, Apple, Google) — LGPD Art. 9 II requires this disclosure

**Consequences:** ANPD complaint → 15-day response window → if missed, sanction process opens. Sanctions: warning → fine up to 2% of BR group revenue (max R$ 50M per violation) → publication of the violation → suspension of data processing. For a pre-revenue product, even a `R$ 50K` fine is fatal. Reputational damage in the BR fintech-adjacent space is permanent.

**Concrete requirements for MilesPro v1:**

| Requirement | Implementation |
|---|---|
| **Granular consent at signup** | Separate checkboxes: (1) Termos de Uso, (2) Política de Privacidade, (3) opt-in para emails de marketing (default unchecked), (4) opt-in para envio de dados pra PostHog (analytics). Store `consent_log(user_id, consent_type, version, timestamp, ip)`. |
| **Privacy policy lists every sub-processor** | Supabase (US/EU), Stripe (US), PostHog (US/EU), Sentry (US), Apple (US), Google (US), Resend (US) — and the legal basis for the international transfer (ANPD's August 2025 international transfer rules require SCCs or adequacy decision; US has neither — use SCC clauses) |
| **Data export endpoint** | `/api/lgpd/export` — returns JSON+CSV bundle of `profiles`, `operations`, `travel_*`, `user_subscriptions`. Edge function, rate-limited (1/hour/user). Must complete within 15 days; recommend immediate sync delivery via signed URL. |
| **True account deletion** | Edge function that (1) cascades delete across all `user_id`-keyed tables, (2) calls Stripe to cancel subscription + delete customer, (3) calls PostHog `/api/projects/{id}/persons/{user_id}/delete-events/`, (4) calls Sentry to scrub PII for that user, (5) deletes `auth.users` last. Log the deletion in a `deletion_audit` table (retained 5 years per ANPD guidance) so you can prove compliance. |
| **DPO contact** | LGPD Art. 41 requires designating an Encarregado (DPO). For solo dev: name yourself, publish email `dpo@milespro.com.br`, document your DPO obligations in a one-page internal doc. ANPD allows the controller and DPO to be the same person for small operations. |
| **Breach notification path** | Documented internal runbook: detect → assess severity → notify ANPD via gov.br portal within "razoável" time (ANPD has indicated 72h for serious breaches, mirroring GDPR) → notify affected users. |

**Warning signs:**
- Privacy policy says "we may share with partners" without naming them
- Account deletion flow that returns 200 but leaves rows behind (search: `DELETE FROM auth.users` with no preceding cascade)
- Consent stored as a single `accepted_terms BOOLEAN` instead of an audit log
- No `dpo@` email reachable

**Prevention:**
1. Build the export + deletion edge functions **before** the first paid signup. Test that a deletion request triggered today completes (incl. Stripe + PostHog) in < 15 days reliably. Better target: < 24h.
2. Lawyer review of the privacy policy and ToS — budget R$ 2-5K for a one-time review by a BR lawyer with LGPD experience. Cheaper than one fine.
3. Publish a public `/lgpd` page with the DSAR form, response SLA, and DPO contact.
4. Add `subscription_deleted` and `account_deleted` events to PostHog (these are diagnostic, not user-PII, and don't reset on deletion — log to a separate analytics-only project if needed).

**Phase mapping:** Phase 1 (Security & compliance foundation) — `LAUNCH-05`. Must precede `LAUNCH-06` (first paying users).

**Severity:** CRITICAL

---

## High Pitfalls (HIGH — will damage the milestone if hit)

### HIGH-01 — Trial abuse via multi-account creation

**What happens:** Free trial of Pro = users sign up with `gmail+1@`, `gmail+2@`, ... and never pay. Even without trial, the Free plan limits (`20 operations/month` per `CONCERNS.md`) become "Free for everyone with multiple accounts."

**Why it happens:** Email-only signup with no fingerprinting; CPF is collected but only at later steps (per `profiles.cpf`).

**Consequences:** Silent revenue leak. Conversion metrics inflate. PostHog funnels show fake activation cohorts.

**Prevention:**
1. **Require CPF at signup**, not later. Validate CPF via checksum + uniqueness constraint on `profiles.cpf`. One CPF = one account. (Caveat: this changes signup friction; A/B test trial-with-CPF vs. trial-without — but for v1 with 10 paying users, friction is acceptable.)
2. Trial = first 7 days *after* card-on-file capture (Stripe `trial_period_days` on the subscription). No card = no trial. Stripe will refuse a second trial on the same `customer` automatically.
3. Device fingerprint via Stripe Radar (free with Stripe) blocks the same device opening multiple accounts within X hours.
4. Rate-limit signups by IP at the Supabase auth level (built-in).

**Phase mapping:** Phase 2 (Monetization) — combine with `PAY-06` (trial design).

**Severity:** HIGH

---

### HIGH-02 — Stripe-in-Brazil: Pix expiration & boleto reconciliation lag

**Stripe BR specifics (verified May 2026):**
- **Pix:** instant push payment. Default expiration **4 hours** from PaymentIntent confirmation if you don't set one. Pix is now >40% of BR online transactions; without it, conversion in BR drops materially.
- **Boleto:** delayed payment. `expires_days` 0–60 (default in Stripe is 3 days). Stripe sends `payment_intent.succeeded` only **on the next business day** (Mon–Fri excluding BR holidays) after the boleto is paid. So a boleto issued Friday and paid Friday won't fire the webhook until Monday morning.
- **Cards:** standard, but BR card decline rates are ~30% on first attempt — Stripe Smart Retries are essential.

**Why it goes wrong:**
- App immediately marks order as "pending" after issuing boleto, then user is left in limbo for 3 days. No status updates → support ticket spam.
- Pix QR code displayed without countdown timer → user closes the page, comes back next day, scans the dead QR, payment fails silently → support ticket.
- App polls Stripe API instead of waiting for the webhook → wastes API rate limit, still misses the boleto Mon-morning lag.
- App treats `payment_intent.succeeded` as the unlock signal but for subscriptions you should listen to `customer.subscription.created`/`invoice.paid` instead.

**Prevention:**
1. **Pix:** show the QR code with a visible countdown (default 4h, configurable up to 24h via `payment_method_options.pix.expires_after_seconds`). Auto-refresh the page when expired.
2. **Boleto:** clear UX message — "Boletos demoram até 2 dias úteis para serem reconhecidos pela Stripe após o pagamento. Se você pagou hoje, sua assinatura será ativada no próximo dia útil." Set expectation up front.
3. Listen to the *correct* event for subscriptions: `customer.subscription.created` (active), `invoice.paid` (recurring), `invoice.payment_failed` (dunning). Not `payment_intent.succeeded`.
4. Localize Stripe Checkout to `pt-BR` explicitly (`locale: 'pt-BR'`); Stripe auto-detects from `Accept-Language` but in Capacitor WebView this is unreliable.
5. Test the BR holiday calendar — first launch around Carnival or Christmas with boleto-only would mean a 5-day gap on receipts.

**Warning signs:**
- Customer support tickets with "paguei o boleto e nada aconteceu" within 24h of launch
- Polling code in the webhook handler
- No `locale: 'pt-BR'` on the Stripe checkout session

**Phase mapping:** Phase 2 (Monetization) — `PAY-01` (gateway integration), `PAY-02` (webhook).

**Severity:** HIGH

---

### HIGH-03 — Analytics PII leakage (sending CPFs to PostHog/Sentry)

**What happens:** Sentry's default `beforeSend` captures the URL, request body, and any `extra` context. URL params with CPF (`/perfil?cpf=12345678900`), captured form state, or a user-tagged Sentry event with `setUser({ id: cpf })` ships CPF to Sentry's US servers. PostHog's autocapture grabs input field values unless explicitly disabled.

**Consequences:** Now Sentry/PostHog are LGPD data processors of CPF data. International transfer compliance (SCCs) becomes mandatory for them. Most teams haven't signed an SCC with PostHog/Sentry as processors of national IDs — instant compliance gap. Also: Sentry public projects (yes, this happens by accident) leak CPFs to anyone with the project URL.

**Concrete preventions:**

```typescript
// posthog.ts — disable autocapture for any input that could contain PII
posthog.init(KEY, {
  autocapture: {
    css_selector_allowlist: [], // explicit allowlist; default = capture everything
  },
  property_blacklist: ['$ip', 'cpf', 'email', 'phone'],
  person_profiles: 'identified_only', // don't create profiles for anon visitors
  loaded: (ph) => {
    ph.register({ env: import.meta.env.MODE });
  },
});

// Identify by Supabase user_id (UUID), NEVER by CPF or email
posthog.identify(user.id, { plan: subscription.plan }); // plan is OK; email/CPF NOT
```

```typescript
// sentry.ts
Sentry.init({
  dsn: ...,
  beforeSend(event) {
    // Strip CPF patterns from messages, URLs, breadcrumbs
    const stringify = (s: unknown) => typeof s === 'string'
      ? s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
      : s;
    if (event.message) event.message = stringify(event.message) as string;
    event.breadcrumbs?.forEach(b => { b.message = stringify(b.message) as string });
    return event;
  },
  beforeBreadcrumb(crumb) {
    if (crumb.category === 'fetch' && crumb.data?.url) {
      crumb.data.url = (crumb.data.url as string).replace(/cpf=[\d.\-]+/g, 'cpf=[REDACTED]');
    }
    return crumb;
  },
  // NEVER:
  // Sentry.setUser({ id: profile.cpf })
  // Use Supabase user_id instead.
});
```

**Warning signs:**
- `Sentry.setUser({ ... cpf })` anywhere
- PostHog autocapture with no `property_blacklist`
- URL routes that put CPF in query params (`?cpf=...`) — even if logged client-side, they end up in Sentry breadcrumbs

**Phase mapping:** Phase 2 (Telemetry) — `TEL-01`/`TEL-03`.

**Severity:** HIGH

---

### HIGH-04 — RLS policies that *look* secure but aren't

This is the family of "policy passes review but bypassed in practice." MilesPro is exposed to several variants:

**4a. Policy on table but not on view.** A view over `travel_tickets` does **not** inherit the table's RLS unless created with `WITH (security_invoker = true)` in Postgres ≥ 15. The `useConsolidatedSavings` candidate view (`v_consolidated_savings`, suggested in `CONCERNS.md` Performance) would silently leak across users.

**4b. `USING` vs `WITH CHECK` confusion.**
- `USING` filters rows that can be **read or referenced** by the policy
- `WITH CHECK` filters rows that can be **written** (INSERT/UPDATE)
- A policy with only `USING (auth.uid() = user_id)` on UPDATE allows you to update a row to set `user_id = someone_else_uuid` (because there's no `WITH CHECK` on the new state). Result: you can give your free row to a Pro user and reverse-engineer access patterns.

**4c. Missing policy = default deny, but `bypass_rls` role overrides.** The Postgres role used by Supabase edge functions (when using `service_role` key) bypasses RLS entirely. Any edge function that accepts user input and constructs SQL is now a privilege-escalation surface.

**4d. JWT claims trusted blindly.** `auth.uid()` in RLS reads from the JWT. If anywhere in the codebase a custom claim like `plan` is set on the JWT (instead of looked up server-side), a malicious user with a doctored JWT (from a stolen old session) can claim VIP. **Always look up plan via `(SELECT plan FROM user_subscriptions WHERE user_id = auth.uid())`, never `auth.jwt() ->> 'plan'`.**

**4e. RLS on parent table, not on child.** `travel_tickets.client_id → travel_clients.id`. If `travel_clients` has RLS but `travel_tickets` doesn't (or vice versa), the resource-embedding query `select('*, client:travel_clients(*)')` may bypass one of them depending on which row is the join driver.

**Prevention:**
1. Run **Supabase advisors** (`mcp__supabase-claude_ai__get_advisors` with `lints: 'security'`) before every release. The advisors specifically detect 4a/4c.
2. Code-review checklist: every new policy must declare both `USING` and `WITH CHECK` for `UPDATE`. Anyone reviewing a migration PR rejects single-clause UPDATE policies by default.
3. Write **adversarial tests**: pgTAP or simple Vitest+Supabase test that authenticates as user A and tries to read/write user B's row. One test per RLS-protected table.
4. Audit the JWT — `select * from auth.jwt()` after login. Confirm no `plan`/`tier` claim is present that could be trusted in policies.
5. Every view: add `WITH (security_invoker = true)` and a comment explaining why.

**Phase mapping:** Phase 1 (Security) — `SEC-02`.

**Severity:** HIGH

---

### HIGH-05 — Migration disasters: changing enum values mid-flight

**Already a manifest concern:** `CONCERNS.md` flags that the `subscription_plan` enum has 5 DB values (`free`, `pro`, `agency`, `pro_familia`, `basic`) but only 3 TS values (`free`, `plus`, `pro`), with collapse logic at `useSubscription.ts:242-245`. "Funciona por acidente."

**Why this is a launch-time bomb:**
- Postgres enums cannot have values **removed** without dropping and recreating the type (cascade through every column that uses it).
- `ALTER TYPE ADD VALUE` works, but cannot be in a transaction with `INSERT`/`UPDATE` using the new value (Postgres limitation pre-v12 partially relaxed).
- If you rename `plus` → `pro` in TS, any existing user whose `user_subscriptions.plan = 'agency'` falls out of the route guard math entirely → 403 on every paid feature → mass churn before they even try to cancel.
- `pro_familia` collapsing to `pro` works for reads but breaks `PAY-03` (Stripe sync) — Stripe doesn't know about `pro_familia` so the next webhook will overwrite the DB back to `pro` and lose multi-CPF entitlement.

**Prevention (concrete migration plan):**
1. **Decide the canonical enum once** before any pricing page goes live. Recommend: `'free' | 'pro' | 'vip'` as DB enum, matching the user-facing tiers exactly. Drop `agency`, `basic`, `pro_familia`, `plus` aliases.
2. Migration sequence (safe, requires brief read-only window):
   ```sql
   -- a. Add new enum
   CREATE TYPE subscription_plan_v2 AS ENUM ('free', 'pro', 'vip');
   -- b. Add new column
   ALTER TABLE user_subscriptions ADD COLUMN plan_v2 subscription_plan_v2;
   -- c. Backfill with explicit collapse rules (document each)
   UPDATE user_subscriptions SET plan_v2 = CASE plan
     WHEN 'free' THEN 'free'
     WHEN 'basic' THEN 'free'         -- decision: basic users get downgraded; refund offered
     WHEN 'pro' THEN 'pro'
     WHEN 'plus' THEN 'pro'
     WHEN 'agency' THEN 'vip'
     WHEN 'pro_familia' THEN 'vip'
   END;
   -- d. NOT NULL + drop old (in a SECOND migration after a deploy that reads only plan_v2)
   ```
3. Coordinate with TS: ship code that **reads both** `plan` and `plan_v2`, prefers `plan_v2`. Once 100% of rows have `plan_v2`, drop `plan`.
4. **Run on a copy of production data first** (Supabase `db dump` → local restore → run migration → verify counts). Never run untested migrations on prod.
5. Stripe product/price IDs must be re-mapped: maintain a `stripe_product_to_plan` lookup table; do not hard-code Stripe IDs in TS.

**Phase mapping:** Phase 1 (Security/foundation) — `SEC-05`. Must precede `PAY-*`.

**Severity:** HIGH

---

### HIGH-06 — Pricing-page conversion mistakes

**Common mistakes specific to a 3-tier BR SaaS:**

| Mistake | Why it kills conversion | Fix |
|---|---|---|
| **No annual option** | BR users overweight monthly cost; annual with ~17% discount (10 months for 12) is the standard ask | Show monthly + annual toggle. Default annual highlighted. |
| **No anchor / no "most popular" badge** | Users decision-paralyze on three tiers. The middle tier (Pro) needs visual anchoring. | Highlight Pro as "Mais escolhido"; make Free de-emphasized; make VIP visually richer (gold accent, "Para profissionais") |
| **Weak VIP differentiation** | Per `PROJECT.md`, VIP = Pro + multi-CPF + relatórios + afiliados. If the page just says "tudo do Pro + multi-CPF", it reads as "+R$ X for one feature" | Lead VIP with the persona ("Para consultor / influenciador / família"); list multi-CPF as the headline + 2-3 differentiators (white-glove support? early access?) |
| **No social proof** | Brand-new SaaS in finance-adjacent space → trust deficit | At minimum: logos of programs supported (Livelo, Smiles, TudoAzul, Esfera) — the brands themselves act as authority. Add testimonials as soon as first paying users provide them. |
| **No money-back guarantee** | BR conversion data shows 7-day money-back lifts conversion 15-30% on subscription products | "7 dias de garantia, sem perguntas." Stripe refunds are 1-click. |
| **Price in USD or no currency formatting** | Stripe defaults vary; if the checkout shows USD or unformatted BRL, drop-off doubles | Force `currency: 'brl'` at the Stripe checkout level + display `R$ XX,XX/mês` consistently |
| **Hidden total (annual)** | "R$ 19,90/mês" small + "cobrado anualmente como R$ 238,80" smaller still | Both prices same size; show savings explicitly ("Economize R$ 41/ano") |
| **No comparison table** | Users on mobile cannot scan three columns side-by-side | Comparison table below the cards, scrollable horizontally on mobile |
| **CTA wording** | "Assinar" / "Comprar" feels heavy; "Começar grátis" or "Testar Pro 7 dias" performs better | Default: "Começar grátis" on Free, "Testar Pro grátis" on Pro, "Falar com vendas" on VIP (high-touch ok for premium tier) |

**Phase mapping:** Phase 2 (Monetization) — `PAY-04` (pricing page).

**Severity:** HIGH

---

### HIGH-07 — Mobile build pitfalls (Capacitor + permissions + push)

**iOS/Android specifics for MilesPro (Capacitor, May 2026):**

| Pitfall | Consequence | Prevention |
|---|---|---|
| **Push notification setup post-launch** | Users update app → APNs/FCM tokens regenerate → push silently breaks for existing users. Adding push *after* launch requires a re-permission prompt that ~50% deny. | If push is in v2 plans at all, add the `@capacitor/push-notifications` plugin **before** launch but only register tokens on the user's first opt-in moment (after a value moment, not on app open) |
| **iOS `Info.plist` usage descriptions** | Camera/photos/location used (e.g. for OCR of card statements?) without `NS*UsageDescription` keys → app crashes on first use, App Store rejects | Audit all native plugin permissions; add every `NS*UsageDescription` with user-facing copy |
| **Android `targetSdk` lag** | Play Store requires `targetSdk = 35` (API 35) for new uploads in 2026. Capacitor defaults can lag. | Verify `android/app/build.gradle` `targetSdk = 35`, run on Android 15 emulator before submission |
| **iOS App Tracking Transparency (ATT)** | If PostHog is initialized before the ATT prompt, all events are sent without IDFA → fine, but if any SDK uses IDFA without ATT → reject under guideline 5.1.2(i) | Don't use IDFA. Confirm PostHog/Sentry SDKs respect `getTrackingAuthorizationStatus()`. |
| **Capacitor `WebView` cookie handling** | Stripe checkout in `Browser.open()` (system browser) loses session because cookies don't transfer back to the WebView | Use Stripe's mobile SDK / RevenueCat for IAP, OR use Universal Links / App Links to return to the app post-checkout (web-only path means upgrade-on-web only — see CRIT-03 Path C) |
| **Capacitor JS/native version mismatch** | `@capacitor/core@7` with `@capacitor/ios@6` plugins → silent runtime failures | Pin all `@capacitor/*` packages to the same major. Check via `npx cap doctor`. |
| **Deep links not configured for OAuth callbacks** | Google Calendar OAuth (already implemented per `google-calendar-auth` edge function) will return to a URL the iOS/Android app doesn't claim → callback opens in Safari/Chrome, user is lost | Configure Universal Links (iOS `apple-app-site-association`) + Android App Links (`assetlinks.json`) for the OAuth callback URL |
| **App Store screenshots for required device sizes** | 6.7" (iPhone 15 Pro Max) screenshots required; missing = rejection | Generate via Fastlane snapshot or manual; need 5-10 screenshots per device size |
| **Privacy nutrition labels (App Privacy)** | Inaccurate labels = rejection or post-launch warning | Declare every data type collected (email, payment info via Stripe, usage data via PostHog, crash data via Sentry); link to LGPD privacy policy |

**Phase mapping:** Phase 3 (Mobile distribution) — `LAUNCH-02`/`LAUNCH-03`.

**Severity:** HIGH

---

### HIGH-08 — Customer support readiness (refund/dispute storm risk)

**The pattern:** First 10 paying users hit unexpected issues (boleto reconciliation lag, RLS edge cases, mobile-specific bugs). With no help channel: they file Stripe disputes ("payment unauthorized"). Stripe disputes cost USD $15 each + chargeback ratio damage. Three disputes in your first 30 days flag your Stripe account for review; six = potential account suspension.

**MilesPro-specific risks:**
- BR users prefer WhatsApp over email by ~3:1 — if the only support channel is `support@milespro.com.br`, response rate from users is low
- "Por que minha assinatura não ativou?" questions during boleto lag (HIGH-02) will dominate week 1
- LGPD requests (export/deletion) are *also* customer support tickets and have the 15-day clock (CRIT-05)

**Minimum viable support setup before LAUNCH-06:**

| Channel | Tool | Cost | Why |
|---|---|---|---|
| **Email helpdesk** | Front, Help Scout, Crisp, or Plain — anything with shared inbox + canned responses | $0–$20/mo for solo dev | Auditability + response-time tracking. Don't use personal Gmail. |
| **WhatsApp Business** | WhatsApp Business app (free) or Z-API (~R$ 50/mo) for programmatic | R$ 0–50/mo | BR-default channel; first response within 1h |
| **In-app chat** | Crisp or Intercom messenger (free tier) | $0 | For mobile-app-only users who can't easily email |
| **Status page** | StatusPage, Instatus, or `statuspage.io` (free tier) | $0 | When boleto lag or Supabase outage hits, broadcast once instead of replying 10x |
| **Refund policy doc** | Markdown page on the site | $0 | Sets expectations; required for Stripe dispute defense |
| **Stripe dispute defense templates** | Saved snippets explaining boleto lag, plan downgrade, etc. | $0 | Pre-written = win disputes that come in |

**Prevention:**
1. Set up the helpdesk **before** the first paying user. Forwarding rule from `support@` and `dpo@`.
2. Document a **refund policy** (recommend: 7-day no-questions-asked, partial refund pro-rated after) and link it from pricing + ToS + invoice emails.
3. **Reach out proactively** to the first 10 paying users in week 1 — "Como tá indo? Algum problema?" prevents 80% of disputes by giving them an email channel before they go to Stripe.
4. Create a runbook for the 5 most likely tickets: (a) boleto não confirmou, (b) cancelei mas continuei sendo cobrado, (c) feature do Pro não apareceu após upgrade, (d) quero meus dados (LGPD), (e) quero deletar minha conta (LGPD).

**Phase mapping:** Phase 3 (Launch) — operational, must be in place before `LAUNCH-06`.

**Severity:** HIGH

---

## Medium Pitfalls

### MED-01 — Stripe Customer Portal localization

The Stripe Customer Portal supports `pt-BR` but only auto-applies if the customer's `preferred_locales` is set on the customer object. If you create the customer with default locale (English), the portal shows in English forever even if the BR user manually sets it once. Set `preferred_locales: ['pt-BR']` on every customer creation.

**Phase:** Phase 2 — `PAY-05`. **Severity:** MEDIUM.

### MED-02 — Email deliverability from `noreply@milespro.com.br`

A new domain sending transactional email (welcome, receipts, LGPD request confirmations) without SPF/DKIM/DMARC will land in spam at Gmail/Outlook 60-80% of the time. First-month conversion catastrophe: user signs up, never receives confirmation email, never returns.

**Prevention:** Use Resend or Postmark (NOT SES for first month — SES new senders are throttled). Configure SPF + DKIM + DMARC on the domain before any send. Warm up by sending to dev/founder addresses for a week.

**Phase:** Phase 2 — pre-`PAY-04`. **Severity:** MEDIUM.

### MED-03 — Onboarding state stored in `localStorage` only

`useOnboarding.ts` (per `CONCERNS.md`, untested, uses `as unknown as` casts) — if onboarding completion lives only in `localStorage`, every device switch (web → mobile) re-triggers onboarding, looking broken. Sync to DB.

**Phase:** Phase 1 — testing/hardening. **Severity:** MEDIUM.

### MED-04 — `count_monthly_operations` SQL function full table scan

`CONCERNS.md` Scaling Limits section flags this. Today fine, but at 100+ Pro users it'll add 100ms per dashboard load. Add `(user_id, created_at) DESC` partial index covering the last 31 days.

**Phase:** Phase 1 — concurrent with `SEC-02` migration work. **Severity:** MEDIUM (not blocking, but trivial to fix during the migration window).

### MED-05 — `dangerouslySetInnerHTML` in `chart.tsx`

`CONCERNS.md` flags this. Low impact unless user-controlled colors are passed; for v1, sanitize or document. **Phase:** Phase 1. **Severity:** MEDIUM-LOW.

### MED-06 — PWA service worker cache poisoning

`vite.config.ts:101` has `NetworkFirst` for `/rest/.*` with 10s timeout. If the cache stores an authenticated response and the user logs out, the cached response can leak to the next user on shared device. Add `cacheName: 'rest-${userId}'` or skip caching for `/rest/` entirely.

**Phase:** Phase 1. **Severity:** MEDIUM.

### MED-07 — Apple/Google sandbox testing missed

iOS IAP (if adopted later) and Android Play Billing both require sandbox/test accounts and a fully-configured product in the respective console BEFORE the build can even compile against them. Skipping = wasted submission cycle.

**Phase:** Phase 3. **Severity:** MEDIUM.

### MED-08 — Stripe Tax not configured for BR

For BR, Stripe Tax can compute and remit ICMS/ISS on digital services in some scenarios but is not fully automated for SaaS. For v1 with 10 users, manual handling is fine — but document the decision and the threshold at which tax becomes a real issue (BR digital services tax (CIDE-Digital, ISS over digital services) is jurisdiction-dependent; consult an accountant once MRR > R$ 10K/mo).

**Phase:** Phase 2 (decision documented), Phase 5+ (implementation). **Severity:** MEDIUM.

---

## Low Pitfalls

### LOW-01 — Three lockfiles in repo

`CONCERNS.md` flags this. Pick `package-lock.json` (matches CI), delete others, add CI guard. **Phase:** Phase 1, cleanup. **Severity:** LOW.

### LOW-02 — `legacy-peer-deps=true` in `.npmrc`

Hides peer-dep warnings; surface them before next major upgrade. **Phase:** Phase 1, cleanup. **Severity:** LOW.

### LOW-03 — `.lovable/plan.md` committed

Move under `.planning/` or `.gitignore`. **Phase:** Phase 1, cleanup. **Severity:** LOW.

### LOW-04 — `@types/node@25` vs CI Node 22 mismatch

Cosmetic. **Phase:** Phase 1. **Severity:** LOW.

---

## By Category

### Security & Privacy
- **CRIT-01** Plan gating client-side only
- **CRIT-02** Service-role key in client bundle
- **HIGH-03** Analytics PII leakage
- **HIGH-04** RLS policies that look secure but aren't
- **MED-05** `dangerouslySetInnerHTML`
- **MED-06** PWA service worker cache poisoning

### Billing & Payments
- **CRIT-04** Webhook handler without idempotency
- **HIGH-01** Trial abuse via multi-account
- **HIGH-02** Stripe BR: Pix expiration, boleto lag
- **HIGH-06** Pricing-page conversion mistakes
- **MED-01** Stripe Customer Portal localization
- **MED-08** Stripe Tax for BR

### App Store / Play Store
- **CRIT-03** Apple IAP rule 3.1.1 (direct Stripe = rejection)
- **HIGH-07** Capacitor + native plugin pitfalls
- **MED-07** Sandbox testing missed

### LGPD / Compliance
- **CRIT-05** LGPD violations on signup/cancellation (15-day clock)

### Migration & Schema
- **HIGH-05** Enum changes mid-flight (already manifest in MilesPro)
- **MED-04** `count_monthly_operations` full scan

### Telemetry & Analytics
- **HIGH-03** PII leakage to PostHog/Sentry

### Conversion & Pricing
- **HIGH-06** Pricing page mistakes

### Operations & Support
- **HIGH-08** Customer support readiness (refund/dispute storm)
- **MED-02** Email deliverability
- **MED-03** Onboarding state in localStorage only

### Cleanup / Hygiene
- **LOW-01** Three lockfiles
- **LOW-02** `legacy-peer-deps`
- **LOW-03** `.lovable/plan.md` checked in
- **LOW-04** Node version mismatch

---

## Phase Mapping Table

| Pitfall | Severity | Phase | Maps to PROJECT.md req |
|---|---|---|---|
| CRIT-01 Plan gating client-side | CRITICAL | Phase 1 (Sec) | SEC-01, SEC-02 |
| CRIT-02 Service-role key in bundle | CRITICAL | Phase 1 (Sec) | SEC-03 |
| CRIT-03 Apple IAP rule 3.1.1 | CRITICAL | Phase 2 design / Phase 3 launch | LAUNCH-02 (with PAY-04 design impact) |
| CRIT-04 Webhook idempotency | CRITICAL | Phase 2 (Monetization) | PAY-02 |
| CRIT-05 LGPD 15-day clock | CRITICAL | Phase 1/2 (Compliance) | LAUNCH-05 |
| HIGH-01 Trial abuse | HIGH | Phase 2 | PAY-06 |
| HIGH-02 Pix/boleto specifics | HIGH | Phase 2 | PAY-01, PAY-02 |
| HIGH-03 PII to PostHog/Sentry | HIGH | Phase 2 | TEL-01, TEL-03 |
| HIGH-04 RLS subtleties | HIGH | Phase 1 | SEC-02 |
| HIGH-05 Enum migration disasters | HIGH | Phase 1 | SEC-05 |
| HIGH-06 Pricing-page conversion | HIGH | Phase 2 | PAY-04 |
| HIGH-07 Mobile build pitfalls | HIGH | Phase 3 | LAUNCH-02, LAUNCH-03 |
| HIGH-08 Support readiness | HIGH | Phase 3 (pre-launch) | LAUNCH-06 |
| MED-01 Stripe portal locale | MEDIUM | Phase 2 | PAY-05 |
| MED-02 Email deliverability | MEDIUM | Phase 2 | (pre-PAY-04) |
| MED-03 Onboarding state | MEDIUM | Phase 1 | SEC-06 |
| MED-04 `count_monthly_operations` index | MEDIUM | Phase 1 | (with SEC migrations) |
| MED-05 `dangerouslySetInnerHTML` | MEDIUM | Phase 1 | (cleanup) |
| MED-06 SW cache poisoning | MEDIUM | Phase 1 | (cleanup) |
| MED-07 IAP sandbox testing | MEDIUM | Phase 3 | LAUNCH-02, LAUNCH-03 |
| MED-08 Stripe Tax BR | MEDIUM | Phase 2 (decision) | (decision doc) |
| LOW-01..04 Hygiene | LOW | Phase 1 | (cleanup) |

---

## Sources

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.1, 3.1.3(a)) — HIGH confidence (official, May 2026 current)
- [Apple Reader App Distribution](https://developer.apple.com/support/reader-apps/) — HIGH confidence
- [Google Play Billing Update March 2026](https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html) — HIGH confidence (official, March 2026)
- [Google Play User Choice Billing — Brazil availability](https://support.google.com/googleplay/android-developer/answer/13821247) — HIGH confidence
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) (idempotency, retry behavior) — HIGH confidence
- [Stripe Pix Payments](https://docs.stripe.com/payments/pix) (4h default expiration, push payment) — HIGH confidence
- [Stripe Boleto Payments](https://docs.stripe.com/payments/boleto/accept-a-payment) (next-business-day reconciliation, 0-60 day expiration) — HIGH confidence
- [LGPD Article 19 — Data Subject Requests](https://lgpd-brazil.info/chapter_03/article_19) (15-day deadline, no extension) — HIGH confidence
- [LGPD Compliance for SaaS — Complydog 2026 guide](https://complydog.com/blog/brazil-lgpd-complete-data-protection-compliance-guide-saas) — MEDIUM confidence (third-party guide)
- [IAPP — DSAR under Brazil's LGPD](https://iapp.org/news/a/processing-rights-and-dsars-under-brazils-lgpd) — HIGH confidence (IAPP is the authority on global privacy)
- [Brazil — International Data Transfer Deadline (Aug 2025)](https://www.legalmondo.com/2025/08/brazil-deadline-for-compliance-on-international-data-transfers/) — HIGH confidence
- `.planning/PROJECT.md` — internal source of truth for requirements
- `.planning/codebase/CONCERNS.md` — internal codebase audit (2026-05-11) flagging existing manifestations of CRIT-01, CRIT-02, HIGH-05

---

*Pitfalls research: 2026-05-11. Re-validate Apple/Google rule changes quarterly — both are actively rewriting fee structures and entitlements through 2026-2027.*
