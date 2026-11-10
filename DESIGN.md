# FairFlow AI — Design System

**System:** Editorial Fintech / Quiet Intelligence  · **Last updated:** November 10, 2026  
**Scope:** Landing, Workbench, AI Proposal, Scope Guard, PayPal Sandbox, Verified Receipt.  
**Implementation:** Native HTML/CSS + vanilla JavaScript. This is the project's **visual source of truth**; it is not a legal security standard.

## Brand thesis

Every Change Deserves Fair Pay. Trust comes from legible terms and predictable payment status, not dramatic motion. Preserve the distinctive **editorial paper + dark ink + cobalt action + forest confirmation** language.

- **Style:** Contemporary Swiss editorial with restrained Apple-style input feedback.
- **Personality:** Calm, credible, precise, human-first.
- **Visual hierarchy:** Proposal/price/status first; decorative textures last.
- **Product truth:** Real ledger counts, AI estimates clearly labelled, Sandbox test funds never described as actual earnings. A scope-change draft does not charge or amend approved terms.

## Tokens and component rules

| Role | CSS token / value | Use |
| --- | --- | --- |
| Page canvas | `--canvas-bg: #F7F7F2` | Quiet warm off-white |
| Paper surfaces | `--surface-sheet: #FFFFFF` | Agreement cards, content panels |
| Primary ink | `--text-primary: #17191D` | Headings, tables, figures |
| Secondary ink | `--text-secondary: #5A5D64` | Descriptions |
| Primary action | `--action-cobalt: #2555F4` | Main CTA, keyboard focus |
| Confirmation | `--accent-forest: #128853` | Completed Sandbox capture |
| Scope change | `--action-coral-contrast: #B83D2D` | High-contrast warning-action backgrounds |
| Card border | `--border-subtle: #E4E5E1` | 1px dividers |
| Background radius | `--radius-md: 8px` | Editorial card geometry |

**Typography:** Fraunces for expressive headlines, Plus Jakarta Sans for interface copy, JetBrains Mono for financial identifiers. Headline sizes use `clamp()`. Never set body metadata under 11px if it carries meaning. Use tabular numbers for USD and date fields.

**Spacing:** Base 4px rhythm, common 8/12/16/24/32px. Panels typically 20–28px padding, never put two equal-strength action buttons in the same primary hierarchy. Keep touch targets approximately 40–44px; primary buttons 44px or taller.

**Gradients:** Only subtle in large surfaces where they add depth (navy checkout amount, pale green workbench snapshot). No neon, giant animated glows, or excessive glassmorphism.

## Components

- **Landing:** Preserve “Every Change Deserves Fair Pay.” and the four-stage demonstrator. It is labelled as an illustration, not a PayPal transaction.
- **Workbench dashboard:** Status pulse and ledger filters are calculated from `/api/projects` only. Do not invent metrics or persist fake example transactions.
- **AI proposal:** AI suggests; humans approve. Milestones are a **planning** breakdown, not recurring installment releases.
- **Scope Guard:** Show original **approved** baseline versus added requirements. Draft change orders are labelled NOT APPROVED and do not change checkout amount.
- **Sandbox checkout:** Show the actual PayPal sandbox status and safe recovery; never style “key configured” as “payment verified.”
- **Receipt:** Use the existing premium receipt card; keep test-funds caveat and copyable order/capture IDs.

## Interaction principles

- Fast tactile feedback on press; prefer CSS transitions on `transform` and `opacity`.
- **Motion budget:** 120–240ms for UI affordances, slower only for deliberate storytelling; no perpetual RAF-driven decoration. All animations must honor `prefers-reduced-motion: reduce`.
- Buttons are native `<button>`; filter groups use `aria-pressed`; feedback states have a live region.
- Modal controls restore focus and trap Tab; keyboard users can operate demo stages with arrows.
- Mobile starts at 320px and must not horizontally overflow. Target 320, 375, 390, 768, and 1440px in browser QA.
- Avoid new dependencies, third-party icon packs or animation frameworks unless a measured need exists.

## Accessibility and performance quality gates

- Normal body text aims for **WCAG AA 4.5:1 contrast**; component borders and key labels must be visible without relying on color alone.
- Test keyboard Tab, Escape, focus-visible, filters and error announcements.
- Use real DOM text nodes for untrusted project titles and model output; never build dynamic HTML from user strings.
- Track perceived performance using browser tests and real profiling rather than making unverified “60 FPS” guarantees.
- Prefer layout-stable cards and progressive enhancement. Avoid CSS `will-change` on many elements.
- Keep native Node implementation and provider APIs untouched for design-only work.

## Skills and external inspiration

The repository contains `.agents/skills/apple-design/SKILL.md` and an Inspo MCP **configuration**. `skills-lock.json` references Taste, but the Taste skill file is not committed: do not claim it was installed or run. These rules are authored from the current interface and verified code, not from an unverified live Inspo session. Review actual reference screens before copying external design patterns.

## Release discipline

1. Work on a feature branch and keep Gemini/PayPal capture/ledger logic intact.
2. Run `npm run check` and `npm test`.
3. Run Chromium Browser QA at desktop, mobile and keyboard accessibility.
4. Merge the verified branch; avoid speculative redesign close to hackathon submission.
5. For live Gemini/PayPal testing, use local private `.env` (do not commit secrets). Repo CI tests use mocks.

## Submission quality gate: performance, accessibility & failure recovery

- Eager third-party celebration JavaScript is removed; a tiny local CSS feedback cue replaces it.
- The landing showcase pauses its interval entirely while offscreen, in another view, when the document is hidden, or when reduced motion is preferred. Navigation honors reduced motion.
- AI requests are time-bounded; failures preserve user input and show persistent `role=alert` instructions. A rate-limit response includes server-provided retry guidance.
- A PayPal JavaScript SDK failure provides a **retry loading the SDK** button that never creates or captures an order. Never auto-retry payment capture after an ambiguous network failure.
- Chromium QA now uses test-only axe-core to audit accessible names, labels, structure and text contrast on major routes. Automated WCAG scans are valuable but **do not constitute screen-reader certification**.
- Performance budgets apply to first-party HTML, CSS and JS; recorded browser paint timings are local CI observations, not real-user Core Web Vitals or a Lighthouse score.
