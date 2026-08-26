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
import { FailedPayment, AgentResult, AgentStep } from "@/lib/types";
import { formatINR, channelLabel, incentiveLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

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

interface AgentRunProps {
  payment: FailedPayment;
  onComplete: (paymentId: string, result: AgentResult) => void;
}

/** Keyed by payment.id from the parent so a fresh fetch + fresh state runs per payment,
 * without ever calling setState synchronously inside the effect body. */
function AgentRun({ payment, onComplete }: AgentRunProps) {
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: payment.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Agent run failed");
        }
        return res.json() as Promise<AgentResult>;
      })
      .then((data) => {
        setResult(data);
        onComplete(payment.id, data);
      })
      .catch((err) => setError(err.message ?? "Something went wrong"))
      .finally(() => setLoading(false));
  }, [payment.id, onComplete]);

  return (
    <>
      {loading && <ThinkingSkeleton />}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && <AgentResultView result={result} />}
    </>
  );
}

function AgentResultView({ result }: { result: AgentResult }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-figures">
          Recoverability {result.recoverabilityScore}/100
        </Badge>
        <Badge variant="outline">{channelLabel(result.recommendedChannel)}</Badge>
        <Badge variant="outline">{incentiveLabel(result.recommendedIncentive)}</Badge>
      </div>

      <div className="space-y-3">
        {result.steps.map((step, i) => (
          <StepCard key={step.stage} step={step} index={i} />
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Drafted message
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {result.message}
        </p>
        <a
          href={result.retryLink}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block break-all font-figures text-xs text-primary underline underline-offset-2"
        >
          {result.retryLink}
        </a>
      </div>
    </div>
  );
}

interface AgentTraceDialogProps {
  payment: FailedPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (paymentId: string, result: AgentResult) => void;
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
