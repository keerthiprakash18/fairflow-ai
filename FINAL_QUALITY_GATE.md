# FairFlow AI — Final Quality Gate (November 10, 2026)

**Scope:** Performance, WCAG-oriented accessibility and recoverable failures.  
**Release policy:** Ship this branch only when BOTH GitHub CI and Browser QA are green on the exact final commit. Earlier green runs do not certify new code. Preserve the existing real Gemini, PayPal Sandbox capture and private local ledger.

## Performance

- Removed eagerly loaded third-party confetti JavaScript; a tiny CSS receipt-confirmation animation replaces it and honors `prefers-reduced-motion`.
- The showcase autoplay timer is stopped, not merely ignored, whenever it is offscreen, hidden, not on the landing view, manually paused or reduced motion is requested.
- Smooth scrolling follows the user's reduced-motion preference.
- Local bundle budgets fail tests if `index.html > 85 KB`, `style.css > 130 KB` or `app.js > 100 KB`.
- Chromium QA saves `performance-snapshot.json` with startup navigation timing, first contentful paint (FCP), observed cumulative layout shift (CLS), and eager confetti requests.

**Measurement limit:** A single mocked local Chromium run is not a Lighthouse audit, mobile field measurement, or guaranteed 60 FPS; scores vary by network, device and cache.

## Accessibility

- Labels and text contrast are tested with the **axe-core 4.14** engine in headless Chromium, scoped to landing, dashboard, proposal, Scope Guard, real-mode mocked-receipt UI and offline simulated receipt.
- The QA gate fails on **serious/critical axe WCAG A/AA** violations; audit findings are preserved in `browser-artifacts/accessibility-audit.json`.
- High-contrast financial labels, larger selectable showcase targets, keyboard-friendly previous/next, and native accessible names for playback controls.
- Form errors persist visibly with `role=alert` and wizard-step changes use a polite status live region.
- Motion-sensitive visitors are not forced into carousel autoplay or smooth page scrolling.

**Accessibility limit:** Axe does not replace manual screen-reader testing, high zoom testing or human usability review.

## Error recovery

- Frontend fetch requests have bounded timeouts, recoverable HTTP 429 rate-limit feedback, invalid-JSON messages, and clear offline/server-connection guidance.
- Gemini quote failures return to the original brief and keep it intact. Scope Guard failures preserve the change request and replace the loading skeleton with an accessible, retryable error state.
- If the PayPal **JavaScript SDK fails to load or render**, a distinct retry action reloads only the SDK. It **never creates or captures a payment**.
- If PayPal capture status is ambiguous, **do not automatically repeat a capture**; use the existing order-status/reconciliation flow instead.
- Playwright injects real HTTP 429 and 503 failures and a PayPal SDK load outage, verifies that inputs survive, then completes a safe retry without charging.

## Judge and owner commands

```powershell
git status --short
git pull --ff-only origin main
npm run check
npm test
npm run verify:submission
```

`verify:submission` needs your own local private `.env`, performs **real Gemini** quote/scope checks and **PayPal Sandbox OAuth only**, and initiates **no new payments**. The owner's November 10 run passed with the configured Gemini fallback; after code changes, run it again. Separately, `npm run verify:payments` reads the existing local real paid ledger and checks its capture records against PayPal's read-only Sandbox Orders API, without making a payment. Avoid resetting the local `data/` folder, and never commit `.env`.

Credential-free reviewer flow: `npm run demo:offline` uses **clearly marked mock responses** in an isolated temporary ledger; it is not independent proof of live providers.

## Security and release boundaries

This is a **loopback-only single-user hackathon application**; no public internet hosting or multiple users without genuine authentication, per-user authorization, hardened database persistence, HTTPS and production-grade monitoring. Successful functional tests do not prove complete application security.

After both CI suites pass, freeze feature development and only reopen for reproducible blocking defects. Demo video and Devpost submission are explicitly separate user-owned tasks.
