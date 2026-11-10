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

- [ ] Verify `npm run verify:integrations` passes with your real private Gemini and PayPal Sandbox credentials.
- [ ] Complete a genuine Sandbox Personal buyer approval and verify the capture/receipt before filming.
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
