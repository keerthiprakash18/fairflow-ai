# FairFlow AI — AI-Powered Freelancer Trust & Payment OS

**Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/).**

A sandbox-only prototype that connects natural-language freelance project analysis, scope-change detection, human-approved quotations, and PayPal payment capture. **AI recommends; users approve; PayPal processes.**

> **Hackathon prototype, not a real-money finance product.** No real customer records or PayPal Live credentials should be used.

## What works in the code

- Multi-view, mobile-responsive interface: Dashboard, New Project, History.
- Gemini API structured proposals: deliverables, milestones, risks, questions, timeline and indicative USD estimates.
- Human approval and server-validated quotation amount.
- AI Scope Change analysis: compare added requirements against the original quote without silently changing the approved amount.
- PayPal Sandbox Orders v2 order creation and server-side capture with verified order/capture status and amount.
- Printable **sandbox-only** receipt and recent transaction summaries.
- Local JSON persistence in `data/projects.json`. Writes are serialized and atomic. This directory is Git-ignored.
- Backend uses Node.js built-in HTTP/fetch. No third-party npm dependencies.

**Verification:** Syntax and offline smoke tests can run without credentials. A real Gemini call and an end-to-end PayPal Sandbox capture still **must be tested by the project owner** using rotated private credentials before the Devpost demonstration. Never describe a transaction as successful unless actually confirmed in the Sandbox.

## Quick start

Requirements: **Node.js 22.16+**, PayPal Developer **Sandbox REST app**, a Gemini API key, and a test-buyer account from PayPal Sandbox Accounts.

```bash
git clone https://github.com/keerthiprakash18/fairflow-ai.git
cd fairflow-ai
```

Copy `.env.example` to `.env`. Replace placeholders in **`.env` only**:

```env
PAYPAL_CLIENT_ID=YOUR_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_SANDBOX_CLIENT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
PORT=3000
```

See [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and [Google AI Studio](https://aistudio.google.com/apikey). Never paste secrets in screenshots, chats, GitHub, or front-end code. If a key was exposed, revoke/rotate it and use a replacement locally.

```bash
npm run check
npm test
npm start
```

Visit **http://localhost:3000**. Check `/api/health`: `aiConfigured` and `paypalConfigured` only indicate that non-placeholder credentials were loaded, **not** that remote authentication succeeds.

If port 3000 is already in use, stop the older process or in PowerShell run:

```powershell
$env:PORT=3001
npm start
```

Then visit **http://localhost:3001**.

## Judge walkthrough (Sandbox-only)

1. Open **New Project**. Describe a freelance project of at least 20 characters.
2. Select **Generate AI Proposal**. Review deliverables, price, milestones, timeline, risks and questions.
3. Edit the price and explicitly approve the quotation.
4. In **Scope Change**, enter a new client request; compare added work and estimated impact. The original approved price is preserved.
5. Choose **Continue to Checkout**. Use a PayPal **Sandbox personal test-buyer account**, not a real PayPal login.
6. Approve the Sandbox payment; the server verifies the PayPal order **and capture** amount/currency/status.
7. View the receipt, print it, then inspect Dashboard/History for the transaction record.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Configuration flags, version, sandbox status (no secrets) |
| GET | `/api/config` | Public PayPal client ID for browser SDK |
| GET | `/api/projects` | Recent local prototype records (no authentication; **demo only**) |
| POST | `/api/quote` | Generate AI scope and draft quotation |
| POST | `/api/confirm-quote` | Human approval and price validation |
| POST | `/api/scope-change` | AI comparison of approved quote and new client request |
| POST | `/api/paypal/create-order` | Create PayPal Sandbox order from approved server-side amount |
| POST | `/api/paypal/capture-order` | Server-side Sandbox capture, verify amount and capture status |

## Architecture

- **Frontend:** static HTML/CSS/JavaScript and PayPal JavaScript SDK.
- **Backend:** Node.js built-in `http`, `fetch`, and `fs/promises`.
- **AI:** Google Gemini Interactions API with JSON response schema.
- **Payments:** PayPal Sandbox OAuth 2.0 and Orders API v2. No payment/card credentials are stored.
- **Storage:** local `data/projects.json`, excluded from Git. This is **not production-grade storage**. Set `FAIRFLOW_DATA_DIR` for a separate writable storage directory if testing; make sure it remains private.
- **Tests:** `node --check` and Node built-in `node --test` smoke checks. They do not prove successful external API transactions.

## Security and limitations

This prototype lacks **user accounts, authorization, CSRF protection, request-rate limiting, durable multi-instance transaction reconciliation, tested webhooks, and production fraud controls**. Project history is visible to anyone who can access its server. Run it locally with fictional/demo project descriptions; **do not expose it publicly with real client data** until access control and storage/security are designed properly.

JSON persistence is local to the server and may be lost on ephemeral hosting. Outstanding Sandbox payments may require manual PayPal verification if the app restarts during checkout. Do not assume a failed browser response means no payment happened. Sandbox order/capture IDs are test data, never evidence of real-world funds.

## Devpost submission still required

To enter judging, also provide: (1) complete project description and tooling explanation, (2) public repository and MIT license, (3) a functional demo via accessible hosted URL **or complete local run instructions**, and (4) a **public YouTube demo under three minutes** showing the actual application. Devpost submission is a separate manual action. **A public GitHub repository alone is not a submission.**

Deadline: **November 12, 2026, 12:00 PM Pacific / November 13, 2026, 1:30 AM IST**.

## License

MIT — see [LICENSE](LICENSE).
