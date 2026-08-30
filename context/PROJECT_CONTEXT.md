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
| AI | Gemini API (`@google/genai`), model `gemini-3.6-flash` | Structured JSON outputs (`responseMimeType`/`responseJsonSchema`, validated with Zod) drive the 4-stage agent pipeline. Switched from Claude/Anthropic — see §5.7 |
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
- **Single LLM call per case, not 4 separate calls.** The agent produces all 4
  reasoning stages (classify/strategize/draft/action) in one structured-output call, then
  the UI reveals them staggered client-side. Cheaper and faster than 4 round-trips; still
  visibly "agentic" because the reasoning is genuinely multi-stage, just batched.
- **Gemini over Claude for the model provider** (see §5.7). Functionally equivalent
  architecture either way — this was a provider preference, not a capability gap. Verified
  the actual installed `@google/genai` SDK's own type definitions and README before
  writing code, rather than trusting a docs-page fetch summary that had hallucinated a
  nonexistent `interactions.create()` API — worth remembering next time a fast-moving
  SDK's docs need checking.
- **UI structure/storytelling patterns borrowed from a reviewed reference site
  (BhuAyu/PranaVeda), not its visual skin.** That site's cream/serif/Ayurveda palette
  would fight the dark-fintech identity above, but its content shape was worth stealing:
  a composite score front-and-center (→ `RadialGauge`, reused for both the hero
  recovery-rate ring and the per-case recoverability score) and a governed pipeline told
  as a visible step-by-step diagram, not buried a tab deep (→ `PipelineFlow`, promoted
  out of the Architecture tab to sit permanently above the tabs). See
  `src/components/dashboard/radial-gauge.tsx` and `pipeline-flow.tsx`.
- **Batch-run failures are caught per-case, not left to crash the whole batch.** See §5.11
  — a single API/parse error used to 502 the entire batch and discard every other case's
  result. `EscalationAction` gained an `"agent_error"` value specifically so a pipeline
  failure is documented in the same audit trail as a governance decision, distinguishable
  from one, and retryable (case reverts to `PaymentStatus: "failed"`).
- **Public routes get a best-effort in-memory per-IP rate limit** (`src/lib/rate-limit.ts`)
  — 20 req/min on `/api/agent`, 5 req/min on `/api/agent/batch` (tighter, since one batch
  call fans out to many Gemini calls). Not a substitute for a real gateway, but the app
  calls a paid API with no auth in front of it and is headed for a public URL, so leaving
  it fully open felt like the wrong default even for a demo.
- **Dataset upload replaces the client's in-memory dataset directly, no server round trip
  to "save" it.** Consistent with §3's "no database, client state is the record" design —
  a CSV/JSON upload is parsed and validated in the browser (`src/lib/dataset-import.ts`),
  and from that point on it *is* the working dataset the rest of the app already operates
  on. This only actually works end-to-end because of §5.13's fix: the API routes take
  full payment objects now, not ids to look up server-side.
- **Tabs stay tabs, not routes.** Explicitly discussed with the user whether "doesn't feel
  like a SPA" meant real per-section URLs — it didn't; the ask was a richer, more
  distinct-feeling single page (see `SectionHeader`), not a bigger routing rewrite. Worth
  remembering if this comes up again: don't infer "convert to multi-page" from "doesn't
  feel like an SPA" without asking, since the two aren't the same complaint.
- **`Tabs` is explicitly controlled, not left to the library's own panel-hiding.** See
  §5.16 — `@base-ui/react/tabs`'s built-in hidden-panel mechanism depends on detecting a
  CSS transition/animation completing, which doesn't fire reliably without one defined
  (and broke outright with a one-shot entrance animation). `RecoveryDashboard` now owns
  `activeTab` state directly and gates each `TabsContent`'s children on it, rather than
  trusting the library to hide inactive panels correctly.
- **Caption/description text earns its place or gets cut, not shortened-but-kept.** See
  §5.15 — the instinct when copy feels like clutter is to trim it; the actual fix was
  asking whether each piece said anything the surrounding UI didn't already show, and
  deleting the ones that didn't (the pipeline rationale paragraph, most `SectionHeader`
  descriptions) rather than keeping a smaller version of restated-the-obvious text.

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
7. **Considered training a self-hosted SLM instead of using any foundation-model API**,
   over concern that "inserting a key" looked weak. Talked through the actual tradeoffs:
   fine-tuning + hosting a small model in the remaining timeline is a real reliability
   risk (needs an always-on second service, exactly what the single-deployable-app
   decision in §4 was avoiding), and it doesn't even address the underlying concern since
   a self-hosted model still needs a credential/endpoint pointing at it. Settled on:
   keep the API-based LLM approach (industry standard), reserve genuine model *training*
   for the narrow, well-scoped recoverability classifier in §7 instead. Then, separately,
   switched providers from Claude/Anthropic to Gemini — a preference, not a capability
   fix — and re-verified the request/response shape against the real installed SDK
   (`@google/genai`) rather than trust a docs-fetch summary, which had confidently
   described a nonexistent `interactions.create()` API. Net effect: same architecture,
   `src/lib/agent.ts` now targets `gemini-3.6-flash` via `models.generateContent` with
   `responseJsonSchema`, env var renamed `ANTHROPIC_API_KEY` → `GEMINI_API_KEY`.
8. **First live deployed test failed**: `gemini-2.5-flash` returned `404 NOT_FOUND` —
   "This model ... is no longer available to new users. Please update your code to use
   models/gemini-3.6-flash." Caught from actual Vercel runtime logs (user pulled them via
   the dashboard's log export), not from docs — the installed SDK's own bundled README
   examples were already stale for a key created this late. Fixed by switching `MODEL` to
   `gemini-3.6-flash` in `src/lib/agent.ts`. Lesson repeated from §5.7: for a fast-moving
   provider, the live API's own error response is more trustworthy than any cached
   docs/SDK example — trust it over what's written down when the two disagree.
9. **A second live GitHub PAT got pasted into chat** (same failure mode as §5.1). Refused
   again, told the user to revoke it, and this time set up push access properly instead:
   `git-credential-manager github login --device` run from a real interactive terminal
   (Git Bash, since GCM isn't on PowerShell's PATH), then the repo's `credential.helper`
   repointed from a stale `store` entry to `manager`, and the remote URL given an explicit
   username (`https://<user>@github.com/...`) so GCM knows which of two linked accounts to
   use non-interactively. Lesson: a device-code login needs a real interactive
   console — running it through this sandbox's non-interactive Bash hangs forever waiting
   on a prompt it can never answer; it only works launched directly in the user's own
   terminal.
10. **Found a stray `.claude/launch.json`** at the primary working directory
    (`C:\Users\Harsh`), left over from an unrelated past session that had cloned the
    BhuAyu/PranaVeda reference site. The preview/dev-server tool reads that root
    `launch.json`, not one placed inside this project's own clone — so `preview_start`
    silently launched the wrong app on first try. Added a `razorpay-dev` entry alongside
    the old one (via `npm --prefix <path> run dev`, since the launch-config schema has no
    `cwd` field) rather than deleting the stray entry, since it wasn't ours to remove.
11. **A real correctness bug found doing a "prod ready" pass**: `runWithConcurrencyLimit`
    in the batch route let one case's thrown error (a Gemini API hiccup, a malformed JSON
    response) propagate and reject the whole `Promise.all`, discarding every other case's
    already-computed result and 502-ing the entire batch. Directly undermines the
    buildathon's "measured across batches" and "documentation of failures, logged with
    why" requirements. Fixed by catching per-case inside the worker and synthesizing a
    `PrecheckStop`-shaped outcome with a new `EscalationAction` value, `"agent_error"` —
    reusing the existing pre-check-stop shape rather than inventing a parallel result type,
    so every place that already branches on `isPrecheckStop`/`escalation.action` handles it
    for free. Failed cases revert to `PaymentStatus: "failed"` (retryable), not
    mislabeled as escalated.
12. **Vercel's `deploy --temporary` device-login timed out twice** when launched through
    this sandbox's backgrounded Bash — same root cause as #10 above (a device code
    needs a human to actually click the link inside the polling window; a background
    command notification arrives asynchronously, well after the CLI's own wait timeout
    lapses). Handed the deploy command to the user to run themselves in their own
    terminal instead of retrying indefinitely.
13. **The dataset-upload feature (§8) initially would have been decorative only.**
    `/api/agent` and `/api/agent/batch` looked payments up server-side from the hardcoded
    `mock-data.ts` array by id - so an uploaded/replaced dataset that only exists in the
    client's React state could never actually be run through the agent; every case not in
    the original nine would 404. Caught this before shipping it, not after. Fixed by
    having both routes accept the full `FailedPayment` object(s) in the POST body instead
    of an id to look up - correct anyway, since "no database, client state is the record"
    was already the stated architecture (§3) and the id-lookup pattern was quietly
    violating it. Added `src/lib/schemas.ts` (`FailedPaymentSchema`, Zod) as the one place
    that validates payment data crossing the client→server trust boundary, shared between
    the two API routes and the dataset importer.
14. **A derived-state bug in the dataset-upload UI**: `isSample` was computed as
    `datasetVersion === 0`, so once a version counter was bumped (even by clicking "Reset
    to sample") it never went back to `0` and the reset button stayed visible forever.
    Caught by actually clicking through the feature in the browser after building it, not
    just typechecking it - `isSample` is now its own state, set explicitly by whichever
    handler (`handleDatasetReplace` vs `handleDatasetReset`) actually ran.
15. **User feedback: the app "feels too AI" / "something's missing."** Investigated
    concretely rather than reassuring: found (a) caption text that explained the app's own
    architecture rationale to end users instead of just being a product (cut - the
    pipeline diagram's node labels already said enough; section-header descriptions that
    only restated visible UI were dropped, not just shortened), (b) dataset upload was a
    single-line text link, not a real feature surface (rebuilt as an actual drag-and-drop
    drop-zone card), and (c) `recharts` was installed but never imported anywhere in the
    codebase - a real, checkable gap given the buildathon brief explicitly wants "money
    recovered measured across batches, not a single demo click," and the app had no chart
    of anything, anywhere. Added `AuditTrendChart` (stacked bar, decisions-by-disposition
    over time), built from the audit log's already-persisted history rather than a new
    tracking mechanism.
16. **A real, load-bearing tab-switching bug**, found only because building the trend
    chart required actually clicking into the Audit Log tab and reloading repeatedly.
    `TabsContent` panels weren't hiding when inactive - the underlying
    `@base-ui/react/tabs` `Tabs.Panel` clears its native `hidden` attribute only after
    detecting a CSS transition/animation complete on that element, and with none defined
    (or with a one-shot `animate-in` entrance class that has no matching exit animation,
    which is what this session had added earlier for polish - see §4) that completion
    never fires, so a previously-active panel's content stays visibly stuck under the new
    one, sometimes at `opacity: 0` and sometimes fully opaque depending on timing. This
    had almost certainly been live and broken since the panel-promotion work earlier this
    session - undetected because the original verification only checked *text content*
    per tab (`get_page_text`), which doesn't reflect `opacity`/`hidden` state at all, so a
    tab switch that silently failed to visually update still "passed" a text-based check.
    Fixed by not trusting the library's built-in hidden-panel mechanism at all: `Tabs` is
    now explicitly controlled (`value`/`onValueChange` state in `RecoveryDashboard`), and
    each `TabsContent`'s real children are gated on `activeTab === "<value>"` directly, so
    an inactive panel is guaranteed empty regardless of what the library's own transition
    logic is doing. Lesson: verifying interactive UI state (tab switches, toggles,
    modals) by reading text content alone is not sufficient - check the actual rendered
    visibility (computed `opacity`/`display`/`hidden`) when a bug report or gut feeling
    says something looks wrong, don't stop at "the text is technically present somewhere
    in the DOM."

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

- ✅ Single-case run: 4-stage Gemini pipeline, staggered reveal, glass-panel dialog
- ✅ Governance layer: pre-check (max attempts) + post-check (write-off threshold),
  both outside the LLM, both logged to a per-case audit trail
- ✅ Batch run: processes all open cases with bounded concurrency (3), aggregate ₹
  recovered/recovery rate/channel mix/escalation counts, simulated outcomes clearly labeled
- ✅ Recovery queue: search + status filter, per-case status badges incl. Escalated/Write-off
- ✅ Architecture tab: pipeline rationale cards; the pipeline diagram itself now lives
  permanently above the tabs (see §4)
- ✅ Composite recovery-rate gauge (hero tile) + recoverability-score gauge (agent trace
  dialog), `RadialGauge` — see §4
- ✅ Dark fintech design system (see §4)
- ✅ Batch run resilient to per-case pipeline failures — documented via `agent_error`,
  never silently drops or 502s the whole batch (see §4, §5.11)
- ✅ Basic per-IP rate limiting on both Gemini-calling routes (see §4)
- ✅ Themed 404 / error boundaries (`src/app/not-found.tsx`, `error.tsx`)
- ✅ Dataset upload: CSV or JSON, real drag-and-drop drop-zone (not just a link), replaces
  the working dataset end-to-end (both API routes take full payment objects, not a
  server-side id lookup — see §5.13), partial-success row errors surfaced via toast,
  "reset to sample" always available
- ✅ Each tab panel has its own `SectionHeader` (icon, accent color, description only
  where it adds real information) — deliberately kept as tabs, not routed pages, per
  explicit user direction (see §4)
- ✅ `AuditTrendChart`: decisions-by-disposition over time, stacked bar (recharts),
  built from the audit log's persisted history — the buildathon's "measured across
  batches" requirement made visual (see §5.15)
- ⏳ Trained recoverability model (§7)
- ⏳ Real Razorpay test-mode retry-link generation (currently a constructed mock URL)
- ⏳ 5-minute pitch video
- ⏳ Deployment (Vercel) — CLI device-login only works from the user's own terminal (see
  §5.12); handed off to the user to run `vercel deploy` themselves and report back the URL

## 9. Environment / running locally

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY (get one at aistudio.google.com/apikey)
npm run dev
```

`GEMINI_API_KEY` is server-side only (used in `src/lib/agent.ts`, called from
`src/app/api/agent/route.ts` and `src/app/api/agent/batch/route.ts`). Never exposed to
the client, never committed — `.gitignore` excludes `.env*` except `.env.example`.
