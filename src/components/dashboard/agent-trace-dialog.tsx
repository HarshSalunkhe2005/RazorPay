"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FailedPayment,
  AgentOutcome,
  AgentResult,
  AgentStep,
  AuditEntry,
  isPrecheckStop,
} from "@/lib/types";
import { formatINR, formatDate, channelLabel, incentiveLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RadialGauge } from "./radial-gauge";
import { WRITE_OFF_SCORE_THRESHOLD } from "@/lib/escalation";

/** Gradient stops per score band, matching the same red/blue/emerald vocabulary used
 * elsewhere for destructive / neutral / success states. */
function scoreGaugeColors(score: number) {
  if (score < WRITE_OFF_SCORE_THRESHOLD) {
    return {
      gradientFrom: "color-mix(in oklch, var(--destructive), white 12%)",
      gradientTo: "color-mix(in oklch, var(--destructive), black 12%)",
    };
  }
  if (score >= 70) {
    return {
      gradientFrom: "color-mix(in oklch, var(--success), white 12%)",
      gradientTo: "color-mix(in oklch, var(--success), black 12%)",
    };
  }
  return { gradientFrom: "var(--primary)", gradientTo: "var(--accent)" };
}

const STAGE_LABELS: Record<AgentStep["stage"], string> = {
  classify: "1 · Classify",
  strategize: "2 · Strategize",
  draft: "3 · Draft outreach",
  action: "4 · Take action",
};

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 380);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-secondary/30 p-4 transition-all duration-500 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
          {STAGE_LABELS[step.stage]}
        </span>
        <span className="text-sm font-medium text-foreground">{step.title}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.reasoning}</p>
      {Object.keys(step.output).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(step.output).map(([key, value]) => (
            <span
              key={key}
              className="rounded-md border border-border/60 bg-background/60 px-2 py-1 font-figures text-[11px] text-muted-foreground"
            >
              <span className="text-foreground/70">{key.replace(/_/g, " ")}:</span> {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Recovery agent is analyzing the case…</p>
    </div>
  );
}

const ESCALATION_BANNER: Record<
  "escalate_human_review" | "stop_write_off",
  { label: string; className: string }
> = {
  escalate_human_review: {
    label: "Escalated to human review — stopping rule fired before the agent ran",
    className: "border-escalated/30 bg-escalated/10 text-escalated",
  },
  stop_write_off: {
    label: "Plan drafted but not executed — below the write-off threshold",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

/** Collapsed by default - the full trail is always saved to the centralized Audit Log
 * tab (see audit-log-view.tsx), so this is just a quick peek, not the record of truth. */
function AuditLog({ trail }: { trail: AuditEntry[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        Audit trail ({trail.length}) <span className="text-muted-foreground/50">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <ol className="space-y-2 border-l border-border/60 pl-4">
          {trail.map((entry, i) => (
            <li key={i} className="relative text-xs">
              <span
                className={cn(
                  "absolute -left-[21px] top-1 h-2 w-2 rounded-full",
                  entry.actor === "agent" ? "bg-primary" : "bg-accent"
                )}
              />
              <span className="font-medium text-foreground">{entry.action}</span>
              <span className="ml-1.5 text-muted-foreground/70">
                · {entry.actor === "agent" ? "agent" : "governance layer"}
              </span>
              <p className="mt-0.5 text-muted-foreground">{entry.detail}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[11px] text-muted-foreground/60">
        Also saved to the Audit Log tab.
      </p>
    </div>
  );
}

interface AgentRunProps {
  payment: FailedPayment;
  onComplete: (paymentId: string, outcome: AgentOutcome) => void;
}

/** Keyed by payment.id from the parent so a fresh fetch + fresh state runs per payment,
 * without ever calling setState synchronously inside the effect body. */
function AgentRun({ payment, onComplete }: AgentRunProps) {
  const [outcome, setOutcome] = useState<AgentOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Agent run failed");
        }
        return res.json() as Promise<AgentOutcome>;
      })
      .then((data) => {
        setOutcome(data);
        onComplete(payment.id, data);
      })
      .catch((err) => setError(err.message ?? "Something went wrong"))
      .finally(() => setLoading(false));
  }, [payment, onComplete]);

  return (
    <>
      {loading && <ThinkingSkeleton />}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {outcome && isPrecheckStop(outcome) && (
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-lg border p-4 text-sm",
              ESCALATION_BANNER.escalate_human_review.className
            )}
          >
            {ESCALATION_BANNER.escalate_human_review.label}
          </div>
          <AuditLog trail={outcome.auditTrail} />
        </div>
      )}

      {outcome && !isPrecheckStop(outcome) && <AgentResultView result={outcome} />}
    </>
  );
}

function AgentResultView({ result }: { result: AgentResult }) {
  const banner =
    result.escalation.action !== "proceed"
      ? ESCALATION_BANNER[result.escalation.action as "stop_write_off"]
      : null;

  const gaugeColors = scoreGaugeColors(result.recoverabilityScore);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RadialGauge value={result.recoverabilityScore} size={52} strokeWidth={5} {...gaugeColors}>
          <span className="font-figures text-xs font-semibold tabular-nums text-foreground">
            {result.recoverabilityScore}
          </span>
        </RadialGauge>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-figures">
            Recoverability {result.recoverabilityScore}/100
          </Badge>
          <Badge variant="outline">{channelLabel(result.recommendedChannel)}</Badge>
          <Badge variant="outline">{incentiveLabel(result.recommendedIncentive)}</Badge>
        </div>
      </div>

      {banner && (
        <div className={cn("rounded-lg border p-3 text-sm", banner.className)}>{banner.label}</div>
      )}

      {result.retryScheduledFor && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Bank gateway outage detected (simulated check) — contact deferred until{" "}
          {formatDate(result.retryScheduledFor)}, not sent immediately.
        </div>
      )}

      <div className="space-y-3">
        {result.steps.map((step, i) => (
          <StepCard key={step.stage} step={step} index={i} />
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          Drafted message {result.escalation.action !== "proceed" && "(not sent — see above)"}
          {result.escalation.action === "proceed" && (
            <Badge
              variant="outline"
              className={cn(
                "normal-case",
                result.retryLinkIsLive
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              {result.retryLinkIsLive ? "Live Razorpay test-mode link" : "Demo link (Razorpay keys not set)"}
            </Badge>
          )}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {result.message}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <a
            href={result.retryLink}
            target="_blank"
            rel="noreferrer"
            className="inline-block break-all font-figures text-xs text-primary underline underline-offset-2"
          >
            {result.retryLink}
          </a>
          <a
            href={result.upiIntentLink}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent underline underline-offset-2"
          >
            Pay via UPI (GPay / PhonePe)
          </a>
        </div>
      </div>

      <AuditLog trail={result.auditTrail} />
    </div>
  );
}

interface AgentTraceDialogProps {
  payment: FailedPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (paymentId: string, outcome: AgentOutcome) => void;
}

export function AgentTraceDialog({
  payment,
  open,
  onOpenChange,
  onComplete,
}: AgentTraceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[85vh] max-w-2xl overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            Recovery plan {payment ? `— ${payment.customerName}` : ""}
          </DialogTitle>
          <DialogDescription>
            {payment
              ? `${payment.planName} · ${formatINR(payment.amount)} · attempt #${payment.attemptNumber}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {open && payment && <AgentRun key={payment.id} payment={payment} onComplete={onComplete} />}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
