# FairFlow AI — PayPal AI Hackathon 2026 Submission Kit

> Preparation guide for the project owner. **Do not submit claims that have not been personally verified with real credentials.**
>
> **Deadline:** Thursday, November 12, 2026 at 12:00 PM PST = Friday, November 13, 2026 at 1:30 AM IST. Submit ahead of the deadline.

## Devpost-ready description

### Project title
FairFlow AI — Every Change Deserves Fair Pay

### Tagline
Turn messy freelance briefs into human-approved agreements, detect unpaid scope creep with AI, and verify PayPal Sandbox payments.

### The problem
Freelancers often agree to an unclear set of deliverables. Later, an innocent-sounding additional request can increase cost and delivery time without a matching conversation about compensation. Manual scopes and payment records make it difficult to connect what was agreed to what was actually paid.

### The solution
FairFlow AI gives a freelancer one guided workflow: paste a client's project brief, use Google Gemini to propose a structured scope and estimated budget, review a 100%-balanced milestone plan, approve the final quoted amount, then compare new client requests against the approved baseline. Gemini suggests the cost and schedule implications, but the **human makes the pricing decision**. A separate PayPal Sandbox Orders v2 integration creates and captures a test checkout order; the backend checks the order and capture status, USD currency, and amount before storing a local receipt.

The interactive homepage illustrates the scope-change concept, with clear sample labels. The actual workbench performs AI requests and PayPal Sandbox API operations when valid private credentials are provided.

**Important limitations:** The current prototype captures a **single full-quote sandbox order**, not individually scheduled milestone payments, real escrow, or real-money transfers. It has no user authentication and uses a local JSON ledger; it is **not** a production finance platform. Automated CI uses offline provider mocks; live integrations must be separately verified.

### Technologies
Node.js 22+ native HTTP and fetch, HTML/CSS/vanilla JavaScript, Google Gemini GenerateContent REST API, PayPal Sandbox Orders API v2, PayPal JavaScript SDK buttons, GitHub Actions, Node's built-in test runner, optional Playwright-based visual QA.

### What makes it distinct
The workflow connects **AI-assisted scope definition, human approval, an explicit scope-creep comparison, and a checked PayPal Sandbox capture**. Users can explore a sample change on the landing page, then carry that scenario into an actual AI proposal workflow. An estimate is never silently applied to a previously approved quote.

## Working demo instructions for judges — final, November 11

**Direct quick-start instructions:** [JUDGES_START_HERE.md](JUDGES_START_HERE.md). No production server or shared API keys are needed to explore the working browser UI.

**A. Credential-free, clearly marked simulation (recommended first):**

```bash
git clone https://github.com/keerthiprakash18/fairflow-ai.git
cd fairflow-ai
npm run demo:offline
```

Requires Node.js 22.16+, but **no npm install**. Open **http://127.0.0.1:3000**. Walk through **Launch FairFlow → New Agreement → E-Commerce Boutique · sample brief → Generate Scoping Agreement with Gemini → Approve & Lock Terms → + Multi-Vendor Payouts → Analyze Variance & Price Impact → Proceed to Checkout with Original Terms → Simulate buyer approval (no payment) → Audit Trail**. The app explicitly marks every upstream AI/checkout result as **OFFLINE SIMULATION** and the mock receipt **NOT A PAYMENT RECEIPT**; no external Gemini or PayPal calls occur.

**B. Real integrations (own private free developer credentials required):** Configure a Gemini API key and PayPal **Sandbox** app in a local `.env` copied from `.env.example`. Use `npm start` to run the same workbench. Use `npm run verify:integrations` (real Gemini + Sandbox OAuth only), and `npm run verify:scope` (real Gemini quote and Scope Guard, **no payment**). An optional real test checkout requires a **separate Sandbox Personal buyer**; no real money is charged. **Never publish real API keys or Sandbox buyer passwords.** Real provider calls may be subject to rate limits or external outages; an offline screenshot is not evidence of those services.

**C. Independent evidence:** The publicly shared [2:15 FairFlow AI walkthrough](https://youtu.be/5gkWMoQ1E2A) was filmed on the owner's actual laptop. It demonstrates a real Gemini proposal, approved agreement, Scope Guard, PayPal Sandbox checkout and **reopening an existing server-verified test-funds receipt**. The receipt is not a new charge in the recording. The owner has separately checked historical Sandbox captures against PayPal's read-only Orders API; this does not publish the private ledger to GitHub. Public YouTube visibility must be checked in a signed-out browser.

## Final video — submitted link, not a future recording shot list

**Video:** https://youtu.be/5gkWMoQ1E2A  
**Local MP4 technical check:** H.264 1920×1080, 30 fps, AAC English narration, duration 135.13 seconds (< 3 minutes).  
**Presentation:** Explain problem → product-first overview → Gemini proposals → human approval → AI Scope Guard/draft change order → PayPal Sandbox checkout → already verified receipt. Website sample figures are illustrative, and all payments are Sandbox test funds. English on-video captions are present. No public website hosting is claimed.

## Required owner-only submission steps

- [x] **Automated release candidate:** 42/42 offline integration/unit tests and real Chromium browser QA on the November 11 code; these use mocked upstream providers and include credential-free `npm run demo:offline` end-to-end UI. The owner's earlier real Gemini and OAuth checks were separate historical verification; re-run `npm run verify:submission` locally against the final checkout before final submission if possible. These checks do not capture payment.
- [x] **Owner-verified November 10, 2026:** FairFlow displayed a real PayPal Sandbox verified receipt with status `COMPLETED`, an order ID, a capture ID and a $3,500.00 USD **test** capture. No real funds transferred. This confirmation is from the owner's local screenshot; it has not been independently reproduced in GitHub CI.
- [x] **Owner-verified November 11:** `npm run verify:payments` matched **3/3 existing real Sandbox capture records** against live PayPal Orders API (read-only; no new charge). Repeat after final code pull for the last gate.
- [x] Actual product footage is edited into a 2:15 captioned H.264 video and a YouTube URL was supplied. [ ] Confirm YouTube **Public**, not Private/Unlisted, by opening https://youtu.be/5gkWMoQ1E2A in a signed-out/incognito window.
- [ ] Complete the Devpost text, tools-used fields, project access instructions, public GitHub repository URL, and video link.
- [ ] Ensure the public repo MIT license is visible in the GitHub About panel, and check official eligibility/rules.
- [ ] Submit before **November 13, 2026, 1:30 AM IST**. A draft is **not** the final submission.

## References

- Official rules and current submission requirements: https://paypalaihackathon.devpost.com/rules
- Challenge page and submission: https://paypalaihackathon.devpost.com/
- Gemini API models: https://ai.google.dev/gemini-api/docs/models
- PayPal Orders v2: https://developer.paypal.com/docs/api/orders/v2/

_This kit is documentation; it does not certify that external provider connectivity, Devpost registration, or the YouTube upload has been completed._


## Final engineering verification / owner actions

- [x] Local-only binding, basic origin, security header, body-size and rate-limit controls.
- [x] Corrupt-ledger fail-closed handling and last-valid-ledger backup.
- [x] Safe completed-capture PayPal reconciliation without issuing another capture.
- [x] Misleading signed agreement / exact estimate claims and invalid computer-local README links corrected.
- [x] Automated security, integration and browser QA coverage added. **Mocked** provider responses are not new real transactions.
- [x] On owner's laptop, November 10: `npm run verify:scope` passed — real Gemini quote/approval/scope API verification; no payment.
- [x] On owner's laptop, November 10: `npm run verify:integrations` passed via Gemini fallback plus real PayPal Sandbox OAuth.
- [x] Owner verified 3 existing captures on November 11. Recheck the saved private ledger after the final merge; keep transaction IDs and secrets private.
- [ ] Record and publicly upload an actual **under-three-minute** running-product demo to YouTube. Recording cannot be replaced by animated mockups.
- [ ] Enter the public GitHub link, functional run instructions, complete English description, tools-used details and real video URL into Devpost.
- [ ] **Click Submit before November 13, 2026 at 01:30 IST** and confirm Devpost shows the submission as submitted, not merely saved as draft.

**Important:** There is intentionally no fake login screen for local demo. Public hosting would require real backend login, user-scoped permissions and secure persistence; in-memory request limits are not sufficient.


**Fast final local gate (no new payment):** `npm run verify:submission`. This runs offline checks, REAL provider connectivity and REAL Gemini Scope Guard with private `.env` credentials, using a temporary ledger. It does **not** execute any PayPal order or capture.


### Reviewer-first entry point

The short, security-conscious [JUDGES_START_HERE.md](JUDGES_START_HERE.md) explains how to run and test the app locally, why there is no fake login, what works without credentials and what needs the judge's own private Gemini/PayPal Sandbox keys. Put this guide in your final Devpost functionality / setup instructions.


### Final performance, accessibility & reliability gate

See [FINAL_QUALITY_GATE.md](FINAL_QUALITY_GATE.md): test-only axe-core WCAG scans, first-party resource budgets and observed startup timing, reduced-motion behavior, resilient Gemini 429/503 UX, PayPal SDK-only retry with **no payment**, and exact-SHA CI + Chromium QA release gates. Do not confuse these browser tests (mock upstream) with real API verification.


## Final pre-video regression status (November 11)
- Gemini fallback is bounded at 42 seconds overall / 16 seconds per candidate; 401 and similar non-retryable errors do not cycle through model guesses.
- Unknown/invalid Gemini additional-cost estimate is explicitly **unavailable / manual review**, not a fake $0.00. A genuine numeric zero remains valid.
- Dashboard and Audit Trail provide **Resume agreement** for draft/approved and **Review existing checkout** for pending PayPal Sandbox orders. These actions do not initiate payment and require checking any previously opened PayPal order before buyer approval.
- Provider badges distinguish **KEY SET**, **AI RESPONSE OK**, **AI IN PROGRESS**, **PAYPAL OAUTH OK**, and **OFFLINE SIMULATION**. OAuth proves only merchant authentication, not a completed capture.
- The owner previously reported **34/34** passing offline tests and **3 existing Sandbox captures** verified against the live PayPal Orders API (Nov 11). New code has separate mocked CI/browser tests; repeat `npm run verify:submission` and `npm run verify:payments` on the final local checkout to close the latest-build gate.
- Do not claim the newly edited build has passed the owner's live provider test until the post-pull commands actually pass.

## November 11 — final unified reliability patch
Current release-candidate automated suite: **42/42 mocked tests** and Chromium Browser QA PASS in the PR. The earlier **32/32** and **34/34** reports are older historical checkpoints, not today's test count. The owner independently verified 3 existing real Sandbox captures before this last patch; repeat the read-only check against the final locally pulled checkout.

**Repaired in one patch:** price-unavailable Gemini proposals require manually entered USD amount; malformed title/deliverable structure fails closed; system-fallback milestone templates are disclosed; offline sample Scope Guard matches marketplace/AI support/rush client request; pending PayPal checkout requires a read-only status check before resumed approval; concurrent order creation shares an in-flight promise and keeps PayPal idempotency; badges update after provider actions; mobile financial and recovery text is more readable.

**Release sequence:** exact-head CI+Browser QA must both PASS → merge once → `git pull --ff-only origin main` on Windows → `npm run verify:submission` (real Gemini/API checks, no payment) → `npm run verify:payments` (read-only comparison of existing Sandbox captures) → record real UI demo + narrate/edit → YouTube + final Devpost submission. Preserve private `.env` and `data/projects.json`; neither belongs in Git.
