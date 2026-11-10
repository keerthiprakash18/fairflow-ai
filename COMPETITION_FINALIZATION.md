# FairFlow AI — Competition Finalization & Evidence Matrix
_Last reviewed: 2026-11-10. This document distinguishes code changes from owner-only proof and submission actions._

## Judge story (45-second explanation)
A client asks a freelancer to build a single-seller store. After approval, the client asks for multi-vendor sellers and split payouts. FairFlow turns the original brief into a reviewable scope, keeps the approved price immutable, and makes the change visible with AI-estimated effort, assumptions and cost. The human must approve changes; the existing checkout still uses the original approved amount. PayPal Sandbox confirms a **single complete test-funds payment** and the server validates the capture before issuing a local receipt.

**Why this is more than a chatbot + checkout:** one end-to-end, stateful, human-controlled project lifecycle, preserving the approved baseline, a scope-diff and a verifiable payment record. The AI does not authorize money movement.

## Delivery matrix
| Area | Implemented in branch | Evidence / remaining gate |
|---|---|---|
| Explainable scope estimate | Estimate drivers, optional rough additional hours, missing information questions, and clear disclaimer | Mock integration test; manually inspect new panel in Chromium |
| Scope comparison | Existing approved-vs-added requirements panel preserved | Browser QA; verify no price mutation |
| Payment trust | Existing status/reconciliation/verified-receipt protections preserved, no capture handler altered | Mock integration test; owner-only real Sandbox validation |
| Professional visual design | Existing editorial system preserved; accessible explanation panel added | Browser QA at 390/1440 px, keyboard, 200% zoom, receipt print |
| Performance | Avoided new libraries, images, and animation dependencies | Existing performance budgets and Browser QA |
| Judge entry | Credential-free `npm run demo:offline` + real provider instructions | Clearly label simulated flow; require real-provider video evidence |
| Public cloud deployment | **Not included**: production auth/data isolation still absent | Do not expose API publicly as-is |
| Video | **Not recorded or uploaded here** | Owner records working app, under three minutes, uploads publicly to YouTube |
| Devpost | **Not submitted here** | Owner completes form and verifies final submitted state |

## Demo recording checklist (2:45 target)
- **0:00–0:20**: real problem: unpaid scope creep; title and mission.
- **0:20–0:45**: actual product homepage and transition into workbench.
- **0:45–1:15**: with private API key, show **real Gemini** generating a structured proposal.
- **1:15–1:35**: reviewer changes quote and locks it; milestone percentages add to 100%.
- **1:35–2:05**: add a new requirement; show approved baseline vs additions; show **estimate drivers / unknowns**, and unchanged approved checkout amount.
- **2:05–2:35**: **real PayPal Sandbox buyer** authorizes the test order; capture verified; show actual receipt and audit history.
- **2:35–2:45**: brand/impact. Keep the run-through under 3 minutes; do not show private keys, sandbox buyer password, or real client data.

Never claim a synthetic screenshot or offline simulation is a real provider run. The milestone schedule is planning-only; payment is one full amount, not escrow or installments.

## Release checklist
1. On owner machine: `git pull --ff-only origin main` **only after the feature PR has been merged**. Before merging, inspect PR CI and Browser QA on its exact head SHA.
2. Run `npm run check`, `npm test` and `npm run verify:submission` in a private environment. The final command makes real Gemini calls but **no new PayPal payment**.
3. Start `npm start` for real-provider recording. Only use sandbox merchant and personal sandbox buyer accounts.
4. Verify the previously owner-recorded capture in PayPal merchant Sandbox activity; retain evidence locally, not in public repo.
5. Run a clean clone with `npm run demo:offline`; confirm prominent simulated labels.
6. Check final public repo, LICENSE, README, judge guide and YouTube link. Submit Devpost before **2026-11-13 01:30 IST**, and verify it is **submitted**, not merely draft.

## Explicit release constraints
- No fake login; current server intentionally rejects public binding.
- No automatic PayPal recapture/retry after ambiguous failures.
- Do not mutate the original approved payment based on an AI suggestion.
- Never label estimate inputs as objectively verified labor hours or market prices.
- No claims of production payments, escrow, digital signatures, or multi-user security.
