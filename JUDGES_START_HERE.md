# FairFlow AI — Judges: Start Here

**FairFlow AI** demonstrates human-reviewed AI scoping, scope-change analysis and **PayPal Sandbox Orders v2** payment verification. It is a **local-only, single-user hackathon prototype**, not a hosted production app, not legal e-signature and not escrow.

## 1. Try the complete simulation without credentials

**Run this first if you are judging.** It exercises the full working UI without API keys or a PayPal buyer account. Every AI and payment response is **MOCKED**, clearly labelled as a simulation, and **not proof of real API integration**. Real provider instructions follow below.

```bash
git clone https://github.com/keerthiprakash18/fairflow-ai.git
cd fairflow-ai
npm run demo:offline
```

Open **http://127.0.0.1:3000** (or choose another local port with `PORT=3100 npm run demo:offline` on Unix; on Windows PowerShell, set `$env:PORT="3100"` before the command). Use **New Agreement → Generate → Approve → Scope Guard → Simulate buyer approval → Simulated Receipt → Audit Trail**.

The offline mode does **not** load `.env` or use real Gemini/PayPal credentials. It forcibly uses fake keys and a temporary local ledger, removes records when stopped, and rejects unexpected external provider calls. Its receipt explicitly says **NOT A PAYMENT RECEIPT**.

For independently verified Gemini/PayPal integration, see the real API mode in Step 4 below and the actual Sandbox capture evidence in the project demonstration.

## 2. Open the interactive product overview (no credentials)

After the app starts, visit **http://127.0.0.1:3000**. The homepage contains an explicitly labelled illustrative **4-stage Scope Intelligence preview** and an interactive Scope Lab with three client-request scenarios. These illustrations work even if you don't have external API keys.

## 3. Run locally (Node.js 22.16+)

```bash
git clone https://github.com/keerthiprakash18/fairflow-ai.git
cd fairflow-ai
cp .env.example .env
npm start
```

On Windows PowerShell, copy the environment file using `Copy-Item .env.example .env`, then `npm start`. Open **http://127.0.0.1:3000**. On another occupied port, set `PORT=3100` in your own private `.env` and open **http://127.0.0.1:3100**.

**Real AI and PayPal checkout require separate private development credentials.** Replace placeholders in your private `.env` for `GEMINI_API_KEY` and PayPal **Sandbox** Client ID/Secret. Never publish `.env`, credentials, buyer passwords or token values. Real money is never used; the integration has a hard-coded Sandbox endpoint.

## 4. Test the actual workflow (live Gemini key required)

1. On the **Scope Lab** select **Multi-vendor marketplace** and click its **Open in Workbench** button.
2. **Generate** the proposal using Gemini and review the deliverables, assumptions, risks and milestone percentages.
3. Explicitly **Approve & Lock** the quote.
4. On **Scope Guard**, analyze the prefilled new client requirement. Examine **Original Approved Scope**, requested additions, **AI-estimated additional USD cost**, **schedule impact** and the **copyable draft change order** (marked **NOT APPROVED**). The original approved payment remains unchanged.
5. Optional PayPal Sandbox end-to-end verification: enter the checkout stage; use a *separate Personal Sandbox buyer* to approve the Seller's single full-quote test order. The server verifies the amount, currency, order and completed capture before displaying a receipt.
6. In **Audit Trail**, use **View saved receipt** to reopen an already completed local Sandbox transaction without charging again.

The workflow does **not** digitally sign contracts, approve revised AI prices automatically, or release actual milestone installments.

## 5. Safe automated checks

```bash
npm run check
npm test
npm run verify:integrations
npm run verify:scope
# Optional owner-only proof of previously saved real Sandbox captures (read-only):
npm run verify:payments
```

`verify:payments` requires a private local ledger with a completed real Sandbox capture; a fresh GitHub clone has no private receipts. It uses read-only PayPal Orders API lookups, and does not create/capture orders or print transaction IDs. `npm test` runs fully offline, with **mocked** Gemini and PayPal responses. `verify:integrations` tests real Gemini generation + Sandbox OAuth only. `verify:scope` uses a temporary ledger for **real Gemini quote, human confirmation and Scope Guard**, and **does not initiate a PayPal charge**. `npm run verify:submission` combines them. The live commands need your own private credentials.

Desktop/mobile visual browser QA also runs on each commit via **GitHub Actions** and uploads screenshots. It mocks upstream providers, not the real PayPal buyer approval.

## 6. Technical and security boundaries

**Node.js native HTTP + vanilla JavaScript + CSS**; runtime uses no third-party npm packages. Gemini API performs structured analysis, human approval is required, PayPal Orders v2 verifies the Sandbox capture, and local JSON ledger data is preserved through restarts. Backend is bound to loopback only, rejects untrusted Host/Origin, validates request size and rate-limits routes.

There is intentionally **no login** because this is a local-only demonstration; public hosting and real multi-user usage require server-side authentication, per-user authorization, protected storage, HTTPS and stronger payment controls.

[Source](https://github.com/keerthiprakash18/fairflow-ai) · [Detailed README](README.md) · [Security scope](SECURITY_AUDIT.md) · [Submission content](HACKATHON_SUBMISSION.md)

**Important for reviewers:** Owner confirmed a real $3,500 USD **test-funds** capture on the owner's local machine. A fresh clone will not contain private local transaction history; this does not mean the published application has secretly embedded payment data. Automated mock tests are distinct from the separately owner-verified real Sandbox transaction.


## Resuming an interrupted agreement
Saved **draft**, **approved**, or **checkout-started** work may be reopened via **Dashboard / Audit Trail → Resume agreement** (or **Review existing checkout**). The recovery endpoint is read-only and does not create or capture money. A resumed pending order must be checked against existing PayPal Sandbox order status before further buyer approval. Paid records are accessed by **View saved receipt**. The local JSON ledger must remain on the same computer; deleting `data/projects.json` destroys this demo history.

The UI differentiates key configuration from a verified Gemini response in the current server session and from PayPal OAuth; successful OAuth is *not* a buyer payment. Unavailable scope-change cost is flagged for manual review instead of presented as zero.
