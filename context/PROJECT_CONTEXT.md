# Recovery Agent — Project Context

Living document. Update this whenever a decision, failure, or scope change happens —
this is the source of truth for "why is it built this way," not just "what it does."

---

## 1. What this is

**Recovery Agent** — submission for the **Razorpay AI Buildathon**, Track 03
(**AI Revenue Recovery**). Deadline: **5 September 2026**. Solo build.

An agent that looks at failed payments/subscription renewals individually, diagnoses the
real reason they failed, and drives a personalized win-back flow (channel, timing,
incentive, drafted message) — governed by deterministic escalation/stopping rules so it
never contacts a customer indefinitely.

Repo: `github.com/HarshSalunkhe2005/RazorPay`, branch `main`.

---

## 2. The buildathon's actual requirements (source: razorpay.com/buildathon/)

Pulled directly from the official page — this superseded an earlier, less precise summary
we'd been working from (see §5, "Course corrections").

**Track 03 specifically requires:**
- Money recovered **measured across batches**, not a single demo click
- **Compliant escalation and stopping rules** — the agent must know when to stop
- **Documentation of failures** — cases it couldn't recover, logged with why

**Every submission needs:**
- Public GitHub repo ✅
- 5-minute pitch video ⏳ (not started — record once product is feature-complete)
- Architecture documentation ✅ (in-app "Architecture" tab + this file)
- Audit trails ✅ (per-case, per-batch)
- Performance metrics ✅ (recovery rate, ₹ recovered, channel mix, escalation counts)

Program terms (context, not a build requirement): ₹75k/month stipend, 6 or 12 months,
in-person Bangalore from September, selection skips aptitude tests/GDs for shortlisted
builders and goes straight to panel review.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Single deployable app, fast to ship, judges get a live URL |
| Styling | Tailwind CSS + shadcn/ui | Fast, and the design tokens were hand-tuned (see §4) so it doesn't read as default shadcn |
| AI | Claude API (`@anthropic-ai/sdk`), model `claude-opus-5` | Structured JSON outputs (Zod schema via `messages.parse`) drive the 4-stage agent pipeline |
| Validation | Zod | Schema for the agent's structured output |
| Charts/format | Geist Sans + Geist Mono (tabular-nums for all money figures) | Small detail, reads as "fintech" not "generic dashboard" |

No database — the mock dataset (`src/lib/mock-data.ts`) is the data layer for the demo.
No second service — everything (including the agent pipeline) runs server-side inside
Next.js API routes, deliberately, so there's nothing extra to keep alive for a live demo.

---

## 4. Key decisions & why

- **LLM via API, not a self-trained model.** Considered and explicitly rejected training
  a foundation model from scratch — infeasible in the timeline and not what's being judged.
  What *is* planned (see §7): a small, genuinely trained classifier for one specific
  sub-problem (recoverability scoring), which is a legitimate and scoped use of "trained ML,"
  distinct from "train a model instead of calling an API."
- **Governance logic lives in code, not the prompt.** `src/lib/escalation.ts` implements
  the max-attempts and write-off rules deterministically, outside the LLM call. This
  directly answers the "compliant escalation, stopping rules" requirement in a way an
  auditor can verify without re-running the model.
- **Simulated batch outcomes, clearly labeled.** We have no live Razorpay account, so
  "recovered vs lost" in batch mode is a deterministic, score-weighted simulation
  (`src/lib/simulate.ts`), explicitly labeled "(sim.)" in the UI and documented in the
  Architecture tab. Chose honesty over faking a bigger number — a judge asking "how do you
  know this was recovered" gets a straight answer.
- **Design system: dark fintech, Razorpay-leaning, glass + neumorphism, not default
  shadcn.** User explicitly asked the frontend not read as AI-generated. Palette (electric
  blue `#3395FF`-ish + violet gradient on charcoal-navy), glass panels reserved for
  overlays only, neumorphic dual-shadow stat tiles, tabular-nums money figures. See
  `src/app/globals.css` utilities: `.bg-mesh`, `.glass-panel`, `.neu-tile`,
  `.text-gradient-brand`, `.glow-ring`, `.font-figures`.
- **Single Claude call per case, not 4 separate calls.** The agent produces all 4
  reasoning stages (classify/strategize/draft/action) in one structured-output call, then
  the UI reveals them staggered client-side. Cheaper and faster than 4 round-trips; still
  visibly "agentic" because the reasoning is genuinely multi-stage, just batched.

---

## 5. Course corrections (failures & how we recovered)

Chronological, most useful for "why does the code look like this."

1. **Pasted a live GitHub PAT into chat.** Refused to use it (wouldn't push under a masked
   identity, and the token was already compromised by being posted). User revoked it
   immediately. Resolved by attaching the repo through the proper GitHub App /
   `add_repo` flow instead.
2. **First push access attempt was refused** — Claude's GitHub App wasn't installed for
   the repo. User fixed it from the GitHub App's repository-access settings; verified
   working by pushing the initial scaffold.
3. **`git push` timed out at the default 60s** even though it had actually succeeded
   server-side — the proxy hung waiting for a final response on a large first push.
   Retried with a longer timeout; `git ls-remote` confirmed local and remote SHAs matched
   before concluding it was fine. Lesson: don't trust a push timeout as a failure without
   checking remote state.
4. **ESLint `react-hooks/set-state-in-effect`** fired on the agent-trace dialog calling
   `setResult(null)/setError(null)/setLoading(true)` synchronously at the top of a
   `useEffect`. Fixed by extracting the fetch into a child component keyed by
   `payment.id` (`<AgentRun key={payment.id} .../>`) so React remounts fresh state via
   `useState` initializers instead of manually resetting state inside the effect.
5. **Misconception: "we need to train our own agent, an API key doesn't look good."**
   Corrected directly — training a foundation model isn't required or feasible here;
   what's judged is the agent architecture (orchestration, rules, tool use) built on top
   of a foundation model, which is standard practice industry-wide. Landed on a middle
   path instead: reuse a real trained-classifier *pattern* from the user's prior repo
   (`Retail-Agentic-AI`, churn model) for the one sub-problem where a trained model
   actually beats an LLM guess — recoverability scoring — deferred to a later pass (§7).
6. **First requirements pass was from a secondhand (Gemini chat) summary of the
   buildathon**, not the source page. Re-derived requirements directly from
   razorpay.com/buildathon/ (§2) once asked to "go through it properly" — this surfaced
   the batch-metrics and escalation/stopping-rule requirements that the secondhand summary
   had missed, and the doc/audit-trail requirements.

---

## 6. Prior-art reviewed: `HarshSalunkhe2005/Retail-Agentic-AI`

Read-only review, not merged into this repo. Six modules, FastAPI + React, real trained
scikit-learn/XGBoost/Prophet models (pricing, customer health/churn, demand forecasting,
market basket, inventory/PO, compatibility checker). The transferable pattern: Customer
Health module (RFM features → KMeans segment + XGBoost churn probability → segment×risk
→ recommendation) is architecturally close to what "recoverability scoring" should be.
Not directly reusable (trained on retail churn data, not payment-failure data) but the
*pattern* — and the fact the user already has this stack experience — informs the planned
recoverability-model work in §7.

---

## 7. Deferred: trained recoverability model

**Not yet started, by explicit user instruction ("model training later").** Plan when we
get to it:

1. Generate a larger synthetic labeled dataset: failed-payment features (failure reason,
   attempt number, tenure, prior successful payments, amount) → recovered/not, using a
   believable label-generating rule.
2. Train a small classifier (logistic regression or XGBoost) with a real train/test split.
3. Report precision/recall/AUC on held-out data in the README/Architecture tab — this is
   the "measured metrics" language from the buildathon page, applied honestly.
4. Port the trained model into the Next.js app for inference (avoid running a second
   Python service in production — keep the single-deployable-app property from §3).
5. Wire its output into `classify` stage as (or alongside) the LLM's own score.

---

## 8. Current feature state

- ✅ Single-case run: 4-stage Claude pipeline, staggered reveal, glass-panel dialog
- ✅ Governance layer: pre-check (max attempts) + post-check (write-off threshold),
  both outside the LLM, both logged to a per-case audit trail
- ✅ Batch run: processes all open cases with bounded concurrency (3), aggregate ₹
  recovered/recovery rate/channel mix/escalation counts, simulated outcomes clearly labeled
- ✅ Recovery queue: search + status filter, per-case status badges incl. Escalated/Write-off
- ✅ Architecture tab: pipeline diagram + rationale, in-app
- ✅ Dark fintech design system (see §4)
- ⏳ Trained recoverability model (§7)
- ⏳ Real Razorpay test-mode retry-link generation (currently a constructed mock URL)
- ⏳ 5-minute pitch video
- ⏳ Deployment (Vercel) — not yet deployed to a public URL

## 9. Environment / running locally

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY
npm run dev
```

`ANTHROPIC_API_KEY` is server-side only (used in `src/lib/agent.ts`, called from
`src/app/api/agent/route.ts` and `src/app/api/agent/batch/route.ts`). Never exposed to
the client, never committed — `.gitignore` excludes `.env*` except `.env.example`.
