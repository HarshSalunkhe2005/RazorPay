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

/** The end-to-end governed pipeline, kept visible outside the tabs since it's the answer
 * to "how does this actually work" - not something worth burying a click deep. */
export function PipelineFlow() {
  return (
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
    </div>
  );
}
