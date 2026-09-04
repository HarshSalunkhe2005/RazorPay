import { MODEL_METRICS } from "@/lib/recoverability-model";

export function ArchitectureView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Escalation rules run in code</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The buildathon brief for this track asks for compliant escalation and stopping
          rules, meaning proof the system knows when to stop, not just a plan. That logic
          lives in code rather than in a prompt, so it&rsquo;s auditable, it can&rsquo;t drift
          between runs, and it can be tested on its own without touching the LLM.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Batch mode and measured recovery</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Batch Run processes every open case through the same pipeline with bounded
          concurrency and reports aggregate ₹ recovered, recovery rate, and channel mix.
          Every authorized case gets a real Razorpay Payment Links API response for its
          retry link (test mode), as long as
          {" "}<code className="font-figures">RAZORPAY_KEY_ID</code>/<code className="font-figures">RAZORPAY_KEY_SECRET</code>{" "}
          are configured; otherwise it falls back to a clearly labeled demo link. The one
          piece that&rsquo;s still simulated is the settlement outcome itself. Confirming a
          customer actually completed the payment would need a webhook loop this build
          doesn&rsquo;t run unattended, so recovered versus lost is seeded by the model&rsquo;s
          own recoverability score.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">How recoverability is actually scored</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          A logistic regression classifier decides the recoverability score, trained on a
          synthetic labeled dataset (failure type, tenure, payment history, attempt count →
          recovered or not; see <code className="font-figures">scripts/train-recoverability-model.mjs</code>).
          It&rsquo;s held out and measured honestly: precision {(MODEL_METRICS.precision * 100).toFixed(0)}%,
          recall {(MODEL_METRICS.recall * 100).toFixed(0)}%, AUC {MODEL_METRICS.auc.toFixed(2)} on
          {" "}{MODEL_METRICS.testSize} cases from a validation split that never touches the
          reported test numbers. The model runs in-process with no added latency and no
          second service, and it drives the write-off rule directly. The LLM only sees the
          score as reference context, and spends its effort on what it&rsquo;s actually
          good at: strategy and drafting.
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 p-5">
        <p className="text-sm font-medium text-foreground">Stack</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Next.js 16 (App Router) + TypeScript + Tailwind, shadcn/ui components, Gemini API
          (structured JSON outputs via Zod) for the reasoning stages, Razorpay Payment
          Links API for live test-mode retry links, all server-side — deployable as a
          single app with no separate services to keep alive for a demo.
        </p>
      </div>
    </div>
  );
}
