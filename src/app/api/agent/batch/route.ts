import { NextRequest, NextResponse } from "next/server";
import { failedPayments } from "@/lib/mock-data";
import { runRecoveryAgent } from "@/lib/agent";
import { simulateOutcome } from "@/lib/simulate";
import { isPrecheckStop } from "@/lib/types";
import type {
  BatchRunResult,
  BatchSummary,
  BatchRunResponse,
  Channel,
  FailedPayment,
} from "@/lib/types";

const CONCURRENCY = 3;

async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    results[i] = await worker(items[i]);
    return next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

export async function POST(req: NextRequest) {
  let paymentIds: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    paymentIds = body?.paymentIds;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const targets: FailedPayment[] = paymentIds?.length
    ? failedPayments.filter((p) => paymentIds!.includes(p.id))
    : failedPayments.filter((p) => p.status === "failed" || p.status === "in_progress");

  if (targets.length === 0) {
    return NextResponse.json({ error: "No eligible payments to run" }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const results: BatchRunResult[] = await runWithConcurrencyLimit(
      targets,
      CONCURRENCY,
      async (payment): Promise<BatchRunResult> => {
        const outcome = await runRecoveryAgent(payment);
        const simulatedResult = isPrecheckStop(outcome)
          ? "n/a"
          : outcome.escalation.action === "proceed"
            ? simulateOutcome(payment.id, outcome.recoverabilityScore)
            : "n/a";

        return {
          paymentId: payment.id,
          customerName: payment.customerName,
          amount: payment.amount,
          outcome,
          simulatedResult,
        };
      }
    );

    const summary: BatchSummary = {
      totalCases: targets.length,
      totalAtRiskAmount: targets.reduce((sum, p) => sum + p.amount, 0),
      processedCount: results.filter((r) => !isPrecheckStop(r.outcome)).length,
      escalatedCount: results.filter((r) => r.outcome.escalation.action === "escalate_human_review")
        .length,
      writeOffCount: results.filter((r) => r.outcome.escalation.action === "stop_write_off").length,
      simulatedRecoveredCount: results.filter((r) => r.simulatedResult === "recovered").length,
      simulatedRecoveredAmount: results
        .filter((r) => r.simulatedResult === "recovered")
        .reduce((sum, r) => sum + r.amount, 0),
      simulatedRecoveryRate: 0,
      channelBreakdown: { email: 0, sms: 0, whatsapp: 0, voice_call: 0 },
      runDurationMs: Date.now() - startedAt,
    };

    const attempted = results.filter((r) => r.simulatedResult !== "n/a").length;
    summary.simulatedRecoveryRate =
      attempted === 0 ? 0 : Math.round((summary.simulatedRecoveredCount / attempted) * 100);

    for (const r of results) {
      if (!isPrecheckStop(r.outcome) && r.outcome.escalation.action === "proceed") {
        const channel = r.outcome.recommendedChannel as Channel;
        summary.channelBreakdown[channel] = (summary.channelBreakdown[channel] ?? 0) + 1;
      }
    }

    const response: BatchRunResponse = { summary, results };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Batch recovery run error:", err);
    return NextResponse.json({ error: "Batch run failed. Please try again." }, { status: 502 });
  }
}
