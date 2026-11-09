# FairFlow AI

**AI-assisted freelance quotes → user-approved price → real PayPal Sandbox checkout.**

A hackathon prototype built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). This project uses **Gemini AI** to interpret freelance project descriptions and the **PayPal Developer Platform** to create and capture sandbox payment orders.

## Core demo flow

1. Type a freelance project brief (20+ characters).
2. Gemini generates a structured scope, milestones, assumptions and proposed price.
3. Human reviews/edits the estimate and clicks **Approve quote**.
4. A PayPal Checkout button creates an order *on the server* using PayPal REST Orders v2.
5. Sign in with **PayPal Sandbox personal test-buyer account** to approve the transaction.
6. Server captures the order with PayPal. The page reports the order/capture IDs and confirmed `COMPLETED` status.

**This is a REAL API integration in SANDBOX, not mock data.** Sandbox funds are fake. The app will not work without valid AI and PayPal Sandbox credentials.

## Quick setup (Windows, Mac, Linux)

### 1. Prerequisites

- Node.js 20.12+ (Node 24 recommended). No npm install is required.
- Free PayPal Developer account with a **Sandbox REST App**.
- Gemini API key created in [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Environment variables

Copy `.env.example` to `.env` in the project root. Replace placeholder text with **your own** credentials:

```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

Do not share secrets. Do not commit `.env` or screenshots of it. API keys are stored on the server only. The PayPal **client ID** is intentionally exposed to the PayPal browser SDK; the **secret** is never sent to the browser.

### 3. Start the app

```bash
npm start
```

Open **http://localhost:3000**. You can check configuration status at **http://localhost:3000/api/health** (returns booleans only, no secrets).

### 4. Complete a test payment

From PayPal Developer Dashboard → **Testing Tools → Sandbox Accounts**, locate or create a **Personal** buyer test account. Use those *sandbox-only* credentials in the PayPal checkout window. Never use your real PayPal account for sandbox checkout.

## Technical architecture

- **Frontend:** HTML5, CSS3, browser JavaScript, PayPal JavaScript SDK.
- **Backend:** Node.js built-in HTTP server and `fetch` (no dependencies).
- **AI:** Gemini REST `generateContent` with JSON output; backend normalizes data, validates pricing and sums milestone percentages.
- **Payments:** PayPal Sandbox OAuth 2.0, Orders v2 create / capture, with all secrets kept server-side.
- **Trust and control:** AI suggests, user explicitly approves the amount, then buyer explicitly authorizes the payment through PayPal.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Test that server is running and keys are configured (never returns secrets) |
| GET | `/api/config` | PayPal browser SDK public client ID |
| POST | `/api/quote` | Gemini AI project estimate and milestones |
| POST | `/api/confirm-quote` | Human confirms the price and freezes quote amount for checkout |
| POST | `/api/paypal/create-order` | Server creates a PayPal sandbox order |
| POST | `/api/paypal/capture-order` | Server captures approved order and checks status |

## Important limitations

This is a **hackathon prototype**, not a real-money invoice/payment service: it has no account login, persistence, production-grade authorization, webhooks, tax handling, fraud protection, or refund service. Quote/order records are held in server memory and expire after two hours. On server restart they are lost. **Do not configure live credentials or use real customer data.** For real production use, add authentication, database, price validation/business logic, reliable server-side idempotency, webhook validation, rate limiting, and durable order reconciliation.

If a Gemini API call fails due to quota/model availability, check your API key and change model by defining `GEMINI_MODEL` in `.env` to an available model you have access to.

## Judge reproducibility

- Clone or download repository, configure your own Sandbox and Gemini keys, run `npm start`.
- No dependency installation, paid hosting, or real payment needed.
- For a public demo, host in an environment supporting Node.js HTTP processes and set environment variables privately. Keep deployment accessible through judging (and apply controls appropriate for demo traffic).

## License

MIT, see `LICENSE`.
