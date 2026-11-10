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

## Working demo instructions for judges

This repository is public and MIT-licensed. No production server or shared API keys are required to review the source, but **real API operations require the judge's or owner's private sandbox credentials**.

1. Install Node.js 22.16 or later, clone the repository, and copy `.env.example` to `.env`.
2. Create a Google AI Studio API key and PayPal **Sandbox** app. Put `GEMINI_API_KEY`, `GEMINI_MODEL`, `PAYPAL_CLIENT_ID`, and `PAYPAL_CLIENT_SECRET` in the **local** `.env`. Never commit or display secrets.
3. Run `npm run check`, `npm test`, then `npm run verify:integrations`. The last command tests live Gemini JSON generation and PayPal Sandbox OAuth without creating an order or payment.
4. Run `npm start` and visit `http://127.0.0.1:3000`. Open the interactive Scope Lab, select a sample, and click **Open ... in the workbench**.
5. Generate an AI quote, review the amounts/milestones, click **Approve & Lock Terms**, and run a scope-change analysis.
6. Proceed to checkout, sign in with a **PayPal Sandbox Personal buyer** test account, approve the **test** payment, and inspect the verified receipt and project history. Confirm the capture in the Sandbox activity dashboard.

The offline unit/integration tests and optional Browser QA workflow are **developer regression tests only**. Mocked browser receipt screenshots must never be represented as evidence of a real PayPal payment. If a hosted demonstration is set up, add authentication and secure persistence before exposing private client data or payment workflows.

**Ready-to-record narration and final Devpost project copy:** [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md). A saved paid receipt can now be reopened from **Audit Trail → View saved receipt**, without creating another transaction.

## Video shot list — target 2:35 (maximum less than 3 minutes)

| Timing | Visual | Narration point |
| --- | --- | --- |
| 00:00–00:20 | FairFlow homepage + freelance change request | Freelancers lose time and money when extra requirements are accepted without repricing. |
| 00:20–00:38 | Interactive Scope Lab | Show how one added feature can expand the original agreement; values are labelled illustrative. |
| 00:38–01:10 | Actual workbench: input → Gemini proposal | Gemini converts a messy brief into deliverables, estimates, milestones, assumptions and risks. |
| 01:10–01:32 | Human approval | Adjust the approved USD quote; milestones must sum to 100%. |
| 01:32–02:03 | Scope Guard after new request | Compare the new request to the original scope and show the suggested change impact without silently updating the price. |
| 02:03–02:27 | **Real** PayPal Sandbox buyer checkout and receipt | Show the actual Sandbox approval and server-verified capture; if live test fails, fix it before recording or explicitly label simulations. |
| 02:27–02:35 | Project history + logo | The promise: *Every Change Deserves Fair Pay*. |

Record the running application itself; do not substitute static mockups for the functioning demo. Use original narration/graphics, no unlicensed music, and avoid displaying API keys, sandbox passwords, or real client details. Upload the video publicly to YouTube and use its URL in Devpost. The rules say judges are not required to watch beyond three minutes.

## Required owner-only submission steps

- [x] **Owner-verified November 10, 2026:** `npm run verify:integrations` returned PASS for real Gemini generation (`gemini-3.1-flash-lite`) and PayPal Sandbox OAuth.
- [x] **Owner-verified November 10, 2026:** FairFlow displayed a real PayPal Sandbox verified receipt with status `COMPLETED`, an order ID, a capture ID and a $3,500.00 USD **test** capture. No real funds transferred. This confirmation is from the owner's local screenshot; it has not been independently reproduced in GitHub CI.
- [ ] Check the same capture in the PayPal Sandbox activity dashboard and retain private evidence for the submission.
- [ ] Record the actual running product, less than 3 minutes, and upload a public YouTube video.
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
- [ ] On owner's laptop: `npm run verify:scope` with private credentials — real Gemini quote/approval/scope API verification.
- [ ] On owner's laptop: recheck `npm run verify:integrations` after pulling latest code.
- [ ] Verify actual Sandbox capture in the merchant activity dashboard; keep sensitive IDs private.
- [ ] Record and publicly upload an actual **under-three-minute** running-product demo to YouTube. Recording cannot be replaced by animated mockups.
- [ ] Enter the public GitHub link, functional run instructions, complete English description, tools-used details and real video URL into Devpost.
- [ ] **Click Submit before November 13, 2026 at 01:30 IST** and confirm Devpost shows the submission as submitted, not merely saved as draft.

**Important:** There is intentionally no fake login screen for local demo. Public hosting would require real backend login, user-scoped permissions and secure persistence; in-memory request limits are not sufficient.


**Fast final local gate (no new payment):** `npm run verify:submission`. This runs offline checks, REAL provider connectivity and REAL Gemini Scope Guard with private `.env` credentials, using a temporary ledger. It does **not** execute any PayPal order or capture.


### Reviewer-first entry point

The short, security-conscious [JUDGES_START_HERE.md](JUDGES_START_HERE.md) explains how to run and test the app locally, why there is no fake login, what works without credentials and what needs the judge's own private Gemini/PayPal Sandbox keys. Put this guide in your final Devpost functionality / setup instructions.


### Final performance, accessibility & reliability gate

See [FINAL_QUALITY_GATE.md](FINAL_QUALITY_GATE.md): test-only axe-core WCAG scans, first-party resource budgets and observed startup timing, reduced-motion behavior, resilient Gemini 429/503 UX, PayPal SDK-only retry with **no payment**, and exact-SHA CI + Chromium QA release gates. Do not confuse these browser tests (mock upstream) with real API verification.
