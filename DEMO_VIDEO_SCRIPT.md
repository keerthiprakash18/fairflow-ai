# FairFlow AI — Devpost Copy + Historical Recording Outline

> **FINAL VIDEO WAS ALREADY RECORDED:** [FairFlow AI Judge Demo](https://youtu.be/5gkWMoQ1E2A) (135.13 s / ~2:15, English narration and burned-in captions). The **2:40 timeline below is a historical planning script**, not a timestamp map of the published video. For the final judge walkthrough and real vs mocked-provider distinction, use [JUDGES_START_HERE.md](JUDGES_START_HERE.md). Do **not** imply the replayed historical verified Sandbox receipt is a newly executed payment.

**Project:** FairFlow AI — Every Change Deserves Fair Pay  
**Category:** AI + PayPal Sandbox · Freelance Agreements & Scope Protection  
**Public repository:** https://github.com/keerthiprakash18/fairflow-ai  
**Submission deadline:** Nov 12, 2026 at 12:00 PM PST (**Nov 13, 2026, 1:30 AM IST**).  
**Owner status:** Real Gemini API generation, PayPal OAuth and a completed PayPal Sandbox capture were demonstrated locally on November 10, 2026. No real funds were transferred. The video and Devpost submission still need to be completed by the owner.

---

## 1. Copy-ready Devpost project write-up

### Project name
FairFlow AI

### Tagline
Every Change Deserves Fair Pay — AI-scoped freelance agreements, clear scope-change analysis, and verified PayPal Sandbox settlement.

### The inspiration
A freelancer agrees to a website for a fixed fee. A week later, the client asks for a marketplace, seller accounts and chat — presented as “just a small update.” Without a written baseline and clear repricing, both sides end up arguing about what was agreed. We wanted to make that moment understandable and fair.

### What it does
FairFlow AI connects the stages freelancers usually handle across separate documents and messages. The freelancer enters a rough brief. Google Gemini proposes a clear project description, deliverables, estimated cost, delivery timeline, assumptions, risks and milestones. The freelancer reviews and explicitly approves the quote; no AI suggestion becomes a payment instruction automatically.

When requirements change, Scope Guard compares the new request against that approved baseline and suggests additional work, cost and timeline implications. A separate PayPal Sandbox Orders v2 checkout lets a test buyer approve a **single full-quote transaction**. FairFlow's server checks the order ID, USD amount, currency and completed capture before recording a receipt in a local audit trail. The recorded receipt can later be reopened without making another payment.

The homepage includes an interactive, explicitly labelled illustration. The workbench is the working application, not merely a mockup.

### How we built it
We built a lightweight Node.js 22+ server using native HTTP, file persistence and fetch, with an HTML/CSS/vanilla JavaScript front end. Google Gemini's GenerateContent API powers the brief, proposal and scope-difference analysis. PayPal Sandbox REST OAuth, Orders API v2 and JavaScript SDK power checkout. We also added structured validation, server-side amount verification, duplicate-capture protections, persisted ledger records, GitHub Actions regression tests and Chromium desktop/mobile visual QA.

### Challenges we ran into
The difficult part was connecting human-reviewed AI estimates to a genuine payment workflow rather than displaying simulated payment buttons. Sandbox buyer country and merchant-account configuration also affected checkout testing. We diagnosed incomplete PayPal orders with the actual Sandbox Orders API, tested different Sandbox buyer accounts and confirmed a successful capture in the real developer environment. We also caught a JavaScript notification error and an unstyled receipt by running the full browser journey.

### What we learned
AI is most useful when it explains a decision rather than making irreversible financial decisions silently. A good fintech prototype must clearly separate *suggested price*, *approved price*, *buyer approval* and *verified capture*. We also learned how essential real browser testing is: unit tests can pass while the actual checkout or receipt experience still needs refinement.

### What's next
Introduce authenticated workspaces and access controls, protected database storage, real client-facing agreement acceptance, order reconciliation and production payment safeguards. In the current hackathon prototype, milestone percentages are a planning breakdown **only** — not real milestone releases or escrow.

### Built with
PayPal Sandbox Orders v2, PayPal JavaScript SDK, PayPal REST OAuth, Google Gemini API, Node.js, JavaScript, HTML, CSS, GitHub Actions, Playwright/Chromium (test-only), Node.js built-in test runner.

---

## 2. Demonstration video — 2 minutes 40 seconds

> Record the actual running browser, not slides. Follow this timeline and read the narration as written or in your own voice. Keep any PayPal Sandbox buyer passwords, access tokens, DevTools credentials and private identifiers off camera. **Do not claim a replayed receipt is a new live payment.**

| Time | What to show | What to say (spoken English) |
| --- | --- | --- |
| **0:00–0:18** | Landing hero. Zoom on *Every Change Deserves Fair Pay*. | “Freelancers lose money when a fixed project turns into endless extra requests. FairFlow AI makes the original agreement, every scope change and every test payment easy to track.” |
| **0:18–0:37** | Interactive Scope Lab: choose multi-vendor request. | “A client might ask to add seller accounts and split payments after the project begins. Our interactive Scope Lab makes the impact easy to understand before anyone agrees to more work.” |
| **0:37–1:05** | Open workbench. Enter/select boutique brief. Gemini generates proposal. | “In the real workbench, Gemini converts a rough brief into concrete deliverables, realistic estimates, risks and a structured milestone plan. This is a real AI request, not a static template.” |
| **1:05–1:27** | Review price and milestones, click *Approve & Lock Terms*. | “AI recommends, but the freelancer stays in control. The project quote is reviewed by a human, and milestones must add up to exactly one hundred percent.” |
| **1:27–1:58** | Scope Guard: enter added marketplace requirement; analyze difference. | “Now the client changes the scope. FairFlow compares the new request against the approved baseline and explains the extra features, estimated cost and schedule impact. It does not silently change the agreed price.” |
| **1:58–2:25** | PayPal Sandbox checkout; real buyer approval or correctly labelled archival demonstration. | “FairFlow also connects the agreement to PayPal Sandbox. The server creates a USD order, and after buyer approval, verifies the captured order, currency and amount before recording settlement. This is a Sandbox transaction — no real money moves.” |
| **2:25–2:40** | Show newly polished verified receipt; click Audit Trail → View saved receipt. | “The verified receipt and transaction history remain available without charging the buyer again. FairFlow AI: every change deserves fair pay.” |

**Recording advice:** Aim for 2:30–2:45, leaving a buffer under the official *less than three minutes* requirement. For live API calls that may be slow, record separate real product segments and edit them together; never fabricate a response, completion status or PayPal capture. Show the actual verified receipt screenshot and the saved-receipt replay, clearly labelled if reusing the existing transaction.

## 3. Practical recording & export checklist

- [ ] Pull latest `main`; run `npm run check` and `npm test`.
- [ ] Start app with the real (local-only) `.env`. Never show the `.env` content.
- [ ] Screen-record at **1920×1080** if possible; zoom browser to keep text legible.
- [ ] Show actual Gemini proposal and actual Scope Guard request.
- [ ] Show a genuine PayPal Sandbox capture if available on recording; otherwise show the **clearly labelled saved real Sandbox receipt**, without claiming that playback executed a fresh checkout.
- [ ] Use **Audit Trail → View saved receipt** to revisit a previously captured transaction; this does not initiate a payment.
- [ ] Hide or crop PayPal order IDs and capture IDs for public screenshots if you do not want them visible.
- [ ] Add narration or on-screen English subtitles and avoid copyrighted music.
- [ ] Export MP4, H.264, 1080p; ensure final run time is **strictly under 3:00**.
- [ ] Upload to **public YouTube**, test the link in a private browser, and add it to the Devpost submission.
- [ ] Complete Devpost fields: description, tools used, how to run, repository URL, demonstration video URL and any required eligibility details.
- [ ] Submit before **Nov 13, 2026 at 1:30 AM IST**. Draft/saved entries are not final submissions.

## 4. Judge access and security

A hosted URL is **not mandatory**: the official rules permit a public code repository with complete setup/run instructions. However, judges must be able to interact with a functioning application, not only inspect pictures. The public repo includes source and setup instructions; running real Gemini/PayPal flows needs private Sandbox credentials configured locally. Do not publish actual API secrets or sandbox passwords in GitHub. A public multi-user demo must first add authentication and protected persistence: the current prototype is explicitly for local hackathon evaluation.

## 5. Rules and source references

- https://paypalaihackathon.devpost.com/rules
- https://paypalaihackathon.devpost.com/details/dates
- https://developer.paypal.com/docs/api/orders/v2/
- https://ai.google.dev/gemini-api/docs/models

**Truthfulness note:** This file is an editable pitch/narration and an owner checklist. It is **not** an uploaded video, a deployed production system, or a completed Devpost submission.


### Ready-to-import subtitles

[DEMO_VIDEO_SUBTITLES.srt](DEMO_VIDEO_SUBTITLES.srt) contains a 2:40 English caption timeline for the **actual screen recording**. Adjust cue boundaries to match your real footage before uploading. Never imply that an archived receipt is a newly executed charge.


## Final pre-recording safety checks — November 11
**App verification before OBS:** `git pull --ff-only origin main`, `npm run verify:submission`, then `npm run verify:payments` (read-only). The last command checks **existing** records; no new Sandbox checkout needed. Keep `.env`, `data/projects.json`, buyer logins and payment IDs out of the recording.

**Demonstration clarity:** The landing Scope Lab is a **preset sample**; the New Agreement and Scope Guard workflow are real Gemini API requests when using `npm start` with configured private credentials. Wait for the **AI RESPONSE OK** badge after a successful response; **AI KEY SET** alone does not verify connectivity. **PAYPAL OAUTH OK** means authorization only, not buyer capture.

**Recovery if recording is interrupted:** Reload, select **Audit Trail** or **Dashboard**, and choose **Resume agreement** for a draft/approved project. If a PayPal order is already pending, click **Review existing checkout** and inspect its **existing order status** before proceeding; do not blindly repeat buyer approval/capture. For already completed payments use **View saved receipt**. The live financial ledger must stay intact.

**Pricing trust:** If Gemini cannot estimate an additional cost, display **Estimate unavailable — manual review required**; do not narrate it as a free change. The original approved payment never changes automatically.

**Recording:** Keep the microphone muted if using post-produced narration. Show truthful screen recording, concise navigation and real results; using existing verified receipt is appropriate if clearly labelled. Edit clips into one under-three-minute 1080p MP4, upload public/unlisted according to competition requirements (verify visibility), and confirm the Devpost final submission state. This document alone is not the video.

## One-pass final recording update — November 11, 2026
Use the latest merged code before recording. The guide must distinguish the **preset illustrative Scope Lab** from **real Gemini** in New Agreement and Scope Guard. If Gemini returns no usable quote price, do not narrate a fictional suggested amount: show the manual-pricing warning and enter a human-approved amount. If system-default milestone templates appear, explain that these require review.

For a previously started PayPal Sandbox order, use **Review existing checkout → Check existing PayPal order (read-only)**. Only after checking a pending/approved status should the next buyer action be shown. For an existing completed capture, show **Audit Trail → View saved receipt** or reconciliation; do not simulate a new buyer capture. The video can use the known saved verified receipt, accurately labelled as earlier Sandbox test funds. `npm run verify:payments` checks existing captures without placing a new order.
