import { MODEL_METRICS } from "@/lib/recoverability-model";

export function ArchitectureView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Why a governed pipeline, not a single prompt</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The buildathon brief for this track requires &ldquo;compliant escalation, stopping
          rules&rdquo; — not just a plan, but proof the system knows when to stop. Putting that
          logic in code (not a prompt) means it is auditable, cannot drift between runs, and
          is trivially testable in isolation from the LLM.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Batch mode &amp; measured recovery</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Batch Run processes every open case through the same pipeline with bounded
          concurrency and reports aggregate ₹ recovered, recovery rate, and channel mix.
          Since this build has no live Razorpay account wired in, the actual payment
          outcome is a clearly labeled simulation seeded by the model&rsquo;s own
          recoverability score — the metrics machinery is real, the settlement confirmation
          is the one piece not live yet.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">A trained recoverability model, not an LLM guess</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The recoverability score is decided by a logistic regression classifier trained
          on a synthetic labeled dataset (failure type, tenure, payment history, attempt
          count → recovered/not — see <code className="font-figures">scripts/train-recoverability-model.mjs</code>),
          held out and measured honestly: precision {(MODEL_METRICS.precision * 100).toFixed(0)}%,
          recall {(MODEL_METRICS.recall * 100).toFixed(0)}%, AUC {MODEL_METRICS.auc.toFixed(2)} on
          {" "}{MODEL_METRICS.testSize} held-out cases, from a separate validation split
          that never touches the reported test numbers. It runs in-process (no second
          service, zero added latency) and drives the write-off governance rule directly —
          the LLM sees this score as reference context and stays for what it&rsquo;s
          actually good at: strategy and drafting.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Stack</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Next.js 16 (App Router) + TypeScript + Tailwind, shadcn/ui components, Gemini API
          (structured JSON outputs via Zod) for the reasoning stages, all server-side —
          deployable as a single app with no separate services to keep alive for a demo.
        </p>
      </div>
    </div>
  );
}
