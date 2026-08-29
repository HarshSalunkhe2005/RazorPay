"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BatchRunResponse,
  BatchRunResult,
  FailedPayment,
  PaymentStatus,
  AuditLogRecord,
  isPrecheckStop,
  Channel,
} from "@/lib/types";
import { formatINR, channelLabel } from "@/lib/format";
import { buildAuditLogRecord } from "@/lib/audit-log";
import { cn } from "@/lib/utils";

interface BatchRunPanelProps {
  payments: FailedPayment[];
  onBatchComplete: (updates: { paymentId: string; status: PaymentStatus }[]) => void;
  onAuditLogAppend: (records: AuditLogRecord[]) => void;
}

function outcomeStatus(result: BatchRunResult): PaymentStatus {
  // A pipeline error is not a governance decision - leave the case as "failed" so it's
  // still eligible to be retried, rather than mislabeling it as escalated or written off.
  if (result.outcome.escalation.action === "agent_error") return "failed";
  if (isPrecheckStop(result.outcome)) return "escalated";
  if (result.outcome.escalation.action === "stop_write_off") return "write_off";
  if (result.simulatedResult === "recovered") return "recovered";
  if (result.simulatedResult === "lost") return "lost";
  return "contacted";
}

const CHANNELS: Channel[] = ["email", "sms", "whatsapp", "voice_call"];

export function BatchRunPanel({ payments, onBatchComplete, onAuditLogAppend }: BatchRunPanelProps) {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<BatchRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const eligible = payments.filter((p) => p.status === "failed" || p.status === "in_progress");

  async function runBatch() {
    setRunning(true);
    setError(null);
    setResponse(null);
    setProgress(8);

    const ticker = setInterval(() => {
      setProgress((p) => (p < 88 ? p + Math.random() * 10 : p));
    }, 350);

    try {
      const res = await fetch("/api/agent/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments: eligible }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Batch run failed");
      }
      const data: BatchRunResponse = await res.json();
      setResponse(data);
      onBatchComplete(
        data.results.map((r) => ({ paymentId: r.paymentId, status: outcomeStatus(r) }))
      );
      onAuditLogAppend(
        data.results.map((r) =>
          buildAuditLogRecord({
            paymentId: r.paymentId,
            customerName: r.customerName,
            amount: r.amount,
            outcome: r.outcome,
            source: "batch",
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(ticker);
      setProgress(100);
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="neu-tile rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Run the recovery agent across every open case
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {eligible.length} case{eligible.length === 1 ? "" : "s"} eligible right now
              (failed / not yet contacted). Each goes through the same governed pipeline —
              pre-check → agent → post-check — with bounded concurrency.
            </p>
          </div>
          <Button onClick={runBatch} disabled={running || eligible.length === 0} className="shrink-0">
            {running ? "Running…" : `Run batch (${eligible.length})`}
          </Button>
        </div>
        {running && (
          <div className="mt-4">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {response && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryTile
              label="Simulated recovered"
              value={formatINR(response.summary.simulatedRecoveredAmount)}
              sub={`${response.summary.simulatedRecoveredCount} of ${response.summary.processedCount} processed`}
              tone="success"
            />
            <SummaryTile
              label="Simulated recovery rate"
              value={`${response.summary.simulatedRecoveryRate}%`}
              sub="of authorized-to-proceed cases"
            />
            <SummaryTile
              label="Escalated / write-off / failed"
              value={`${response.summary.escalatedCount} / ${response.summary.writeOffCount} / ${response.summary.failedCount}`}
              sub="stopped by rules, or pipeline error"
              tone={response.summary.failedCount > 0 ? "destructive" : undefined}
            />
            <SummaryTile
              label="Run time"
              value={`${(response.summary.runDurationMs / 1000).toFixed(1)}s`}
              sub={`${response.summary.totalCases} cases, concurrency 3`}
            />
          </div>

          <div className="neu-tile rounded-2xl p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recommended channel mix (authorized cases only)
            </p>
            <div className="space-y-2.5">
              {CHANNELS.map((ch) => {
                const count = response.summary.channelBreakdown[ch] ?? 0;
                const max = Math.max(1, ...CHANNELS.map((c) => response.summary.channelBreakdown[c] ?? 0));
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {channelLabel(ch)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-figures text-xs text-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Disposition</th>
                    <th className="px-4 py-3 font-medium">Recoverability</th>
                    <th className="px-4 py-3 font-medium">Simulated outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {response.results.map((r) => (
                    <tr key={r.paymentId} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-3 text-foreground">{r.customerName}</td>
                      <td className="px-4 py-3 font-figures text-muted-foreground">
                        {formatINR(r.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <DispositionBadge action={r.outcome.escalation.action} />
                      </td>
                      <td className="px-4 py-3 font-figures text-muted-foreground">
                        {isPrecheckStop(r.outcome) ? "—" : `${r.outcome.recoverabilityScore}/100`}
                      </td>
                      <td className="px-4 py-3">
                        <SimulatedBadge value={r.simulatedResult} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="neu-tile rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-figures text-xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          !tone && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DispositionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    proceed: "text-primary",
    escalate_human_review: "text-violet-500",
    stop_write_off: "text-orange-500",
    agent_error: "text-destructive",
  };
  const label: Record<string, string> = {
    proceed: "Proceed",
    escalate_human_review: "Escalated",
    stop_write_off: "Write-off",
    agent_error: "Error",
  };
  return <span className={cn("text-xs font-medium", map[action])}>{label[action] ?? action}</span>;
}

function SimulatedBadge({ value }: { value: BatchRunResult["simulatedResult"] }) {
  if (value === "n/a") return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        value === "recovered" ? "text-success" : "text-muted-foreground"
      )}
    >
      {value === "recovered" ? "Recovered (sim.)" : "Lost (sim.)"}
    </span>
  );
}
