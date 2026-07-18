# Resend Warmup Runbook — Phase 2 W1c (D-24 / MED-02 / Gate G-MED-02)

**Last updated:** 2026-05-13 (Plan 02-04 execution)
**Owner:** Founder (julianosmachado@gmail.com)
**Status:** Awaiting Resend domain verification (blocked on Cloudflare NS propagation + Resend account creation)

---

## Goal

Establish sender reputation for `noreply@milespro.net.br` *before* scaling to real users. Sending email from a freshly verified domain without warmup almost guarantees inbox-provider spam folder placement — Gmail/Outlook/iCloud all penalize cold senders.

Three-week warmup sequence ramps volume gradually so the inbox providers learn the domain is legitimate.

---

## Pre-requisites (must all be ✓ before Week 1 starts)

| Check | How to verify | Status |
|-------|---------------|--------|
| Cloudflare NS propagation complete (away from dns-parking.com) | `dig +short NS milespro.net.br` returns Cloudflare nameservers | ⏳ propagating (2026-05-12 started) |
| Resend domain `milespro.net.br` status = Verified | Resend Dashboard → Domains | ❌ pending |
| MX `send.milespro.net.br` resolves to `feedback-smtp.us-east-1.amazonses.com` | `dig +short send.milespro.net.br MX` | ❌ pending |
| TXT `send.milespro.net.br` contains SPF `v=spf1 include:amazonses.com ~all` | `dig +short send.milespro.net.br TXT` | ❌ pending |
| TXT `resend._domainkey.milespro.net.br` non-empty (DKIM key) | `dig +short resend._domainkey.milespro.net.br TXT` | ❌ pending |
| TXT `_dmarc.milespro.net.br` contains `v=DMARC1; p=none; rua=mailto:dmarc@milespro.net.br` | `dig +short _dmarc.milespro.net.br TXT` | ❌ pending |
| `RESEND_API_KEY` set in Supabase edge function secrets | Lovable Cloud chat: list secrets | ❌ pending |
| 6 email templates exist in `src/templates/emails/` | `ls src/templates/emails/` returns 6 files | ✓ done (Plan 02-04 Task 3) |

When all rows above flip to ✓, proceed to Week 1.

---

## Week 1 — Founder-only (≤ 50 emails/day target, hard cap 100/day)

**Goal:** prove the deliverability pipeline end-to-end with zero risk of damaging reputation against real users.

**Recipients:** founder Gmail (`julianosmachado@gmail.com`) + 2 dev addresses on an allowlist (e.g., personal iCloud, personal Outlook).

**Volume cap:** ≤ 50 emails/day total. Pause sends if this is exceeded.

**Test flow:**

1. Deploy `lgpd-delete` edge function with `from: 'MilesPro <noreply@milespro.net.br>'` (currently uses `onboarding@resend.dev` per Plan 02-02 W1a — cutover happens here).
2. Trigger `lgpd-delete?action=request` against a sandbox user; confirm the email arrives in inbox (not spam, not promotions tab).
3. Send a `WelcomeEmail` test render via the Resend API:

   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d @- <<'EOF'
   {
     "from": "MilesPro <noreply@milespro.net.br>",
     "to": ["julianosmachado@gmail.com"],
     "subject": "MilesPro warmup probe — Week 1",
     "html": "<p>Hello from MilesPro. This is a deliverability probe.</p>",
     "text": "Hello from MilesPro. This is a deliverability probe."
   }
   EOF
   ```

   Expect HTTP 200 with `{ id: 'xxx' }`. Verify the email lands in inbox within 60 seconds.

4. Run a `mail-tester.com` probe:
   - Visit https://www.mail-tester.com
   - Copy the unique test address (e.g., `test-abc123@srv1.mail-tester.com`)
   - Send the same WelcomeEmail HTML to that address from Resend
   - Refresh mail-tester after ~30 seconds; **target score > 9/10**
   - If score < 9: investigate which check failed (SPF? DKIM? alignment? body URLs?) and fix BEFORE proceeding to Week 2

**Monitoring (daily):**

- Resend Dashboard → Domains → milespro.net.br → Deliverability tab
  - Bounce rate: target **< 1%** (hard fail at > 5%)
  - Complaint rate: target **< 0.1%** (hard fail at > 0.5%)
- Open the test inbox; confirm zero emails landed in spam/promotions

**Exit criteria to advance to Week 2:**

- 7 consecutive days with bounce < 1% and complaint < 0.1%
- mail-tester probe score consistently > 9/10
- No emails landed in spam folder during the week
- Founder confirms test sends look correct (rendering, links resolve, footer mailtos work)

---

## Week 2 — Limited beta (≤ 200 emails/day)

**Goal:** introduce real-user traffic while keeping the volume controllable.

**Recipients:** first 3–5 opt-in beta users (must have confirmed signup; never to a bounced-unsubscribed address).

**Volume cap:** ≤ 200 emails/day. Examples that count:
- Welcome email at signup
- Trial-ending reminder (3 days before charge)
- LGPD deletion confirm requests
- Resend warmup probes from founder (~10/day continues)

**Activate flows:**

1. Wire the `WelcomeEmail` render into the signup confirmation edge function (W3 task — already scaffolded in `src/templates/emails/WelcomeEmail.tsx`)
2. Enable the trial-ending cron (W3 task) — triggers `TrialEndingEmail` 3 days before each Pro trial's day-8 charge
3. lgpd-delete continues from Week 1

**Monitoring (daily):**

- Resend Dashboard bounce/complaint rates (same thresholds as Week 1: <1% / <0.1%)
- Spot-check 1 user's inbox per day if accessible: confirm not landing in spam
- Watch the founder's `dmarc@milespro.net.br` mailbox: DMARC reports should show 100% pass for both SPF and DKIM alignment

**Exit criteria to advance to Week 3:**

- 7 consecutive days with bounce < 2% and complaint < 0.5% (slightly relaxed from Week 1 because real users have more variable mailbox configs)
- DMARC reports show ≥ 99% SPF + DKIM pass
- No user has reported "your email went to spam" on Crisp helpdesk

---

## Week 3+ — Full volume (open to all users)

**Goal:** unrestricted sending; ready for Wave 3 production cutover.

**No volume cap** beyond Resend free tier limits (3,000 emails/month, 100/day on free; upgrade to Pro tier at $20/month if needed for ~50k/mo).

**Email flows now live:**

- WelcomeEmail at signup
- TrialEndingEmail 3d before trial end
- PaymentReceivedEmail on Asaas `PAYMENT_CONFIRMED` (W2a)
- PaymentFailedEmail on Asaas `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` (W2a)
- DeletionConfirmEmail on `lgpd-delete?action=request`
- LgpdExportReadyEmail — still placeholder; activates only when export goes async

**DMARC progression (the goal: move from monitoring-only to enforcing):**

After 2 weeks of clean DMARC reports at `p=none`:

1. Cloudflare DNS → TXT `_dmarc` → change value to:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@milespro.net.br; pct=25
   ```
   This tells inbox providers to start quarantining (sending to spam) 25% of failing messages.

2. Watch DMARC reports for 7 days. If aggregate reports continue to show ≥99% pass:

3. Raise to `pct=100`:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@milespro.net.br; pct=100
   ```

4. After 2 more weeks at `p=quarantine pct=100` with no incidents, consider final escalation to `p=reject`:
   ```
   v=DMARC1; p=reject; rua=mailto:dmarc@milespro.net.br
   ```

   `p=reject` is the strongest spoofing protection but also unforgiving — a misconfigured third-party send (e.g., a transactional flow forgetting to use Resend) will be silently dropped by receivers. Only escalate after every transactional code path has been confirmed routed through Resend.

---

## Monitoring (ongoing)

Daily during Weeks 1–2, weekly after that:

1. **Resend Dashboard** (open every morning):
   - Total sends, bounces, complaints (last 24h)
   - Domain reputation indicator (Resend shows a 1–5 stars rating)
2. **DMARC aggregate reports** (delivered to `dmarc@milespro.net.br`):
   - Open daily for first 2 weeks; weekly thereafter
   - Use a free tool like `dmarcian.com` (free tier) to visualize them — raw XML is painful to read
3. **PostHog spam-folder funnel** (eventual, post-W3):
   - Watch `welcome_email_link_clicked` event vs `welcome_email_sent`
   - Click rate < 5% within 24h of send is a smell that emails are landing in spam

---

## Rollback (if sender reputation collapses)

Triggers:
- Resend Dashboard shows bounce rate > 10% sustained 24h
- Complaint rate > 1% sustained 24h
- Resend support emails warning of reputation issues
- mail-tester score drops below 7/10

Immediate actions:

1. **PAUSE all sends** — flip a kill-switch env var (`RESEND_PAUSE=true` checked at the top of every edge function before calling Resend) OR disable the API key in Resend Dashboard
2. Audit recent sends: which template? which user-cohort? sudden volume spike?
3. Contact Resend support: `support@resend.com` — they have escalation paths for reputation rebuild
4. Restart the warmup sequence from Week 1; do NOT try to "ramp back" without re-establishing trust
5. If the issue was a specific template (e.g., a link that triggered phishing detectors), rewrite it BEFORE resuming

Reputation recovery typically takes 2–4 weeks of clean low-volume sending. Plan accordingly.

---

## Cross-references

- D-24 (Plan 02-CONTEXT.md): Resend custom domain decision
- MED-02 (PITFALLS.md): email deliverability risk
- Gate G-MED-02 (RESEARCH §8): SPF/DKIM/DMARC verification gate
- Plan 02-02 W1a: `lgpd-delete` edge function currently uses `onboarding@resend.dev` — cutover happens during Week 1
- Plan 02-04 Task 3: 6 email templates in `src/templates/emails/` ready for consumption
- Plan 02-04 HELPDESK-SLA-RUNBOOK.md: helpdesk-side handling when users report deliverability issues
