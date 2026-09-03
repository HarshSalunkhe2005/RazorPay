# Recovery Agent

An AI agent that turns failed payments into recovered revenue — built for the **Razorpay AI Buildathon**, Revenue Recovery track.

Live: [razor-pay-five-bice.vercel.app](https://razor-pay-five-bice.vercel.app)

Instead of firing the same generic "your payment failed, please retry" email at every customer, Recovery Agent looks at each failed payment individually and reasons through four explicit stages before acting:

1. **Classify** — diagnoses the real root cause behind the failure (not just the raw decline code). Recoverability is scored by a **trained logistic-regression classifier** (`scripts/train-recoverability-model.mjs`), not an LLM guess — the model gets the score as reference context, not something it invents.
2. **Strategize** — picks the best recovery channel (email / SMS / WhatsApp / voice), timing, and incentive, weighing it against the customer's tenure and payment history. A deterministic **incentive guardrail** (`lib/incentive-guard.ts`) caps discounts/waivers for unproven customers regardless of what the model recommends, and a **bank-outage check** (`lib/bank-uptime.ts`) defers contact instead of retrying into a known-down gateway.
3. **Draft** — writes the actual outbound message, in the customer's preferred language and channel-appropriate tone (short/punchy for SMS/WhatsApp, a spoken script for voice, natural Hinglish where relevant — not literal translation).
4. **Act** — generates a fresh retry payment link plus a 1-tap UPI deep link, and summarizes the automated next step.

The dashboard shows this reasoning live (staggered reveal, not a single opaque LLM call) so it's visibly an agent working the case, not a black box. A persistent nav bar (`/`, `/batch`, `/audit`, `/architecture`) replaces a single scrolling page, with a light/dark toggle and a choice of three color palettes.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **shadcn/ui** components, `next-themes` for light/dark mode
- **Gemini API** (`@google/genai`, model `gemini-3.6-flash`) with structured JSON outputs (`responseJsonSchema`, validated with Zod) driving the 4-stage agent pipeline
- A hand-rolled logistic-regression classifier (no external ML library, no second service — trained offline, shipped as plain TypeScript constants, zero-latency inference at request time)
- Seeded mock dataset simulating Razorpay failed-payment/subscription-renewal webhook events — no live payments account required to demo

## Getting started

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY (get one at aistudio.google.com/apikey)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To retrain the recoverability classifier (regenerates `src/lib/recoverability-model.ts`):

```bash
npm run train:model
```

## Project structure

```
src/
  app/
    layout.tsx                 Root shell: fonts, next-themes ThemeProvider, palette pre-paint script
    (dashboard)/
      layout.tsx                 Mounts RecoveryStateProvider + PaletteProvider + AppNav, shared page shell
      page.tsx                    "/" - stat cards, pipeline diagram, dataset upload, recovery queue
      batch/page.tsx               "/batch" - batch run panel
      audit/page.tsx                "/audit" - audit log + trend chart
      architecture/page.tsx          "/architecture"
    api/agent/route.ts          API route that runs the recovery agent for one payment
    api/agent/batch/route.ts     API route that runs the agent across all open cases
  components/
    dashboard/                  Stat cards, payments table, agent trace dialog, batch run panel, architecture view
    shell/                      AppNav, ThemeToggle, PalettePicker
  lib/
    types.ts                    Shared domain types
    mock-data.ts                 Seeded failed-payment dataset
    agent.ts                      The 4-stage Gemini agent pipeline
    escalation.ts                  Governance layer: pre-check/post-check stopping rules
    incentive-guard.ts              Governance layer: deterministic discount/waiver caps
    bank-uptime.ts                   Demo-only simulated bank-gateway-outage check
    recoverability.ts / recoverability-model.ts   Trained-classifier inference (generated file + runtime)
    recovery-state.tsx                App state (Context), shared across all routes
    palette.tsx                        Brand-color palette state, independent of light/dark mode
    simulate.ts                         Demo-only simulated payment outcome for batch metrics
    stats.ts / format.ts                Derived dashboard stats + formatting helpers
scripts/
  train-recoverability-model.mjs  Trains the classifier: synthetic dataset, train/val/test split, hyperparameter grid search
```

See `context/PROJECT_CONTEXT.md` for the full decision log, requirements sourced from
the buildathon page, and what's still deferred.

## Deploying

Any Vercel/Node host works. Set `GEMINI_API_KEY` as a server-side environment variable — it is never exposed to the client. Note that this is separate from a local `.env.local`: setting the key on Vercel does not make it available to `npm run dev` on your own machine, and vice versa.
