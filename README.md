# Recovery Agent

An AI agent that turns failed payments into recovered revenue — built for the **Razorpay AI Buildathon**, Revenue Recovery track.

Instead of firing the same generic "your payment failed, please retry" email at every customer, Recovery Agent looks at each failed payment individually and reasons through four explicit stages before acting:

1. **Classify** — diagnoses the real root cause behind the failure (not just the raw decline code) and scores how recoverable the case is.
2. **Strategize** — picks the best recovery channel (email / SMS / WhatsApp / voice), timing, and incentive, weighing it against the customer's tenure and payment history so loyal customers get protected and low-value/unproven ones don't get over-discounted.
3. **Draft** — writes the actual outbound message, in the customer's preferred language and tone (including natural Hinglish, not literal translation).
4. **Act** — generates a fresh retry payment link and summarizes the automated next step.

The dashboard shows this reasoning live (staggered reveal, not a single opaque LLM call) so it's visibly an agent working the case, not a black box.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **shadcn/ui** components
- **Gemini API** (`@google/genai`, model `gemini-3.6-flash`) with structured JSON outputs (`responseJsonSchema`, validated with Zod) driving the 4-stage agent pipeline
- Seeded mock dataset simulating Razorpay failed-payment/subscription-renewal webhook events — no live payments account required to demo

## Getting started

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY (get one at aistudio.google.com/apikey)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    page.tsx              Dashboard shell
    api/agent/route.ts     API route that runs the recovery agent for one payment
    api/agent/batch/route.ts  API route that runs the agent across all open cases
  components/dashboard/    Stat cards, payments table, agent trace dialog, batch run panel, architecture view
  lib/
    types.ts               Shared domain types
    mock-data.ts            Seeded failed-payment dataset
    agent.ts                 The 4-stage Gemini agent pipeline
    escalation.ts             Governance layer: pre-check/post-check stopping rules
    simulate.ts                Demo-only simulated payment outcome for batch metrics
    stats.ts / format.ts       Derived dashboard stats + formatting helpers
```

See `context/PROJECT_CONTEXT.md` for the full decision log, requirements sourced from
the buildathon page, and what's still deferred.

## Deploying

Any Vercel/Node host works. Set `GEMINI_API_KEY` as a server-side environment variable — it is never exposed to the client.
