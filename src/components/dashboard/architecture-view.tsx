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
        <p className="text-sm font-medium text-foreground">What&rsquo;s next: a trained recoverability model</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The recoverability score is currently the LLM&rsquo;s own judgment. The planned
          next step swaps it for a small classifier trained on a synthetic labeled dataset
          (failure type, tenure, payment history → recovered/not) with a held-out
          precision/recall/AUC report, ported into the app for zero-latency inference — the
          LLM stays for what it&rsquo;s actually good at: strategy and drafting.
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
