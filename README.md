# ReboundAI

An AI agent that turns failed payments into recovered revenue — built for the **Razorpay AI Buildathon**, Revenue Recovery track.

Live: [razor-pay-five-bice.vercel.app](https://razor-pay-five-bice.vercel.app)

Most failed-payment flows send the same generic "your payment failed, please retry" email to every customer. ReboundAI looks at each failed payment individually and works through four explicit stages before deciding what to do:

1. **Classify** — figures out the real root cause behind the failure, beyond the raw decline code. Recoverability is scored by a **trained logistic-regression classifier** (`scripts/train-recoverability-model.mjs`) rather than an LLM guess; the model gets that score as context to reason from, but doesn't invent the number itself.
2. **Strategize** — picks the best recovery channel (email / SMS / WhatsApp / voice), timing, and incentive, weighing it against the customer's tenure and payment history. A deterministic **incentive guardrail** (`lib/incentive-guard.ts`) caps discounts and waivers for unproven customers no matter what the model recommends, and a **bank-outage check** (`lib/bank-uptime.ts`) defers contact instead of retrying into a gateway that's known to be down.
3. **Draft** — writes the actual outbound message in the customer's preferred language, matching tone to channel: short and punchy for SMS/WhatsApp, a spoken script for voice calls, natural Hinglish where it fits rather than a literal translation.
4. **Act** — generates a fresh retry payment link (a real Razorpay Payment Links API test-mode response, not a constructed URL) plus a 1-tap UPI deep link, and logs the automated next step.

The dashboard shows this reasoning live, with each stage revealed as it completes, so you can watch the agent actually work a case instead of just seeing a final answer appear. A persistent nav bar (`/`, `/batch`, `/audit`, `/architecture`) replaces a single scrolling page, with a light/dark toggle and a choice of three color palettes.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **shadcn/ui** components, `next-themes` for light/dark mode
- **Gemini API** (`@google/genai`, model `gemini-3.6-flash`) with structured JSON outputs (`responseJsonSchema`, validated with Zod) driving the 4-stage agent pipeline
- **Razorpay Payment Links API** (test mode) for real, live retry links — falls back to a clearly-labeled demo link if `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` aren't set
- A hand-rolled logistic-regression classifier (no external ML library, no second service — trained offline, shipped as plain TypeScript constants, zero-latency inference at request time)
- Seeded mock dataset simulating Razorpay failed-payment/subscription-renewal webhook events — no live payments account required to demo

## Getting started

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (required) + RAZORPAY_KEY_ID/SECRET (optional, test mode)
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
    shell/                      AppNav, ThemeToggle, PalettePicker, Logomark
  lib/
    types.ts                    Shared domain types
    mock-data.ts                 Seeded failed-payment dataset
    agent.ts                      The 4-stage Gemini agent pipeline
    escalation.ts                  Governance layer: pre-check/post-check stopping rules
    incentive-guard.ts              Governance layer: deterministic discount/waiver caps
    bank-uptime.ts                   Demo-only simulated bank-gateway-outage check
    razorpay.ts                       Real Razorpay Payment Links API call (test mode), graceful fallback
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

Any Vercel/Node host works. Set `GEMINI_API_KEY` (required) and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (optional, test mode) as server-side environment variables — never exposed to the client. Note that this is separate from a local `.env.local`: setting a key on Vercel does not make it available to `npm run dev` on your own machine, and vice versa.
