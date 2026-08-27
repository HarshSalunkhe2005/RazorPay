import { MAX_AUTOMATED_ATTEMPTS, WRITE_OFF_SCORE_THRESHOLD } from "@/lib/escalation";

function FlowNode({
  title,
  sub,
  variant = "default",
}: {
  title: string;
  sub: string;
  variant?: "default" | "governance" | "agent";
}) {
  return (
    <div
      className={
        "min-w-[150px] rounded-xl border p-3 text-center " +
        (variant === "governance"
          ? "border-accent/30 bg-accent/10"
          : variant === "agent"
            ? "border-primary/30 bg-primary/10"
            : "border-border/60 bg-secondary/30")
      }
    >
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center px-1 text-muted-foreground/60">
      <span className="text-lg leading-none">→</span>
      {label && <span className="text-[10px] whitespace-nowrap">{label}</span>}
    </div>
  );
}

export function ArchitectureView() {
  return (
    <div className="space-y-8">
      <div className="neu-tile rounded-2xl p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1 overflow-x-auto pb-2">
          <FlowNode title="Failed payment event" sub="Razorpay webhook (simulated: seeded dataset)" />
          <Arrow />
          <FlowNode
            title="Pre-check"
            sub={`Max-attempts rule (cap: ${MAX_AUTOMATED_ATTEMPTS})`}
            variant="governance"
          />
          <Arrow label="within policy" />
          <FlowNode
            title="Recovery Agent"
            sub="Gemini · classify → strategize → draft → act"
            variant="agent"
          />
          <Arrow label="scored" />
          <FlowNode
            title="Post-check"
            sub={`Write-off floor (score < ${WRITE_OFF_SCORE_THRESHOLD})`}
            variant="governance"
          />
          <Arrow label="authorized" />
          <FlowNode title="Execute + audit" sub="Retry link, outreach, logged trail" />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Both governance checks sit outside the model on purpose — deterministic, testable
          rules the LLM cannot reason its way around. A case that fails either check never
          reaches (or acts on) the agent&rsquo;s recommendation, and the decision is written to
          that case&rsquo;s audit trail either way.
        </p>
      </div>

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
    </div>
  );
}
