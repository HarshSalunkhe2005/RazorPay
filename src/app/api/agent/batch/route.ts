import { NextRequest, NextResponse } from "next/server";
import { runRecoveryAgent } from "@/lib/agent";
import { auditEntry } from "@/lib/escalation";
import { simulateOutcome } from "@/lib/simulate";
import { isRateLimited, clientIdentifier } from "@/lib/rate-limit";
import { isPrecheckStop } from "@/lib/types";
import { FailedPaymentSchema } from "@/lib/schemas";
import { z } from "zod";
import type { BatchRunResult, BatchSummary, BatchRunResponse, Channel } from "@/lib/types";

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
  // Batch calls fan out to many Gemini requests at once, so it gets a much tighter cap
  // than the single-case route.
  if (isRateLimited(clientIdentifier(req), 5)) {
    return NextResponse.json(
      { error: "Too many batch runs. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  // There's no database - the client sends the exact set of payments to run (its own
  // in-memory dataset, seeded or uploaded, already filtered to eligible cases), not ids
  // for the server to look up. Validated here since it's client-supplied input.
  const parsed = z.array(FailedPaymentSchema).min(1).safeParse((body as { payments?: unknown })?.payments);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "No eligible payments to run, or payment data was malformed" },
      { status: 400 }
    );
  }
  const targets = parsed.data;

  const startedAt = Date.now();

  try {
    const results: BatchRunResult[] = await runWithConcurrencyLimit(
      targets,
      CONCURRENCY,
      async (payment): Promise<BatchRunResult> => {
        let outcome;
        try {
          outcome = await runRecoveryAgent(payment);
        } catch (err) {
          // One case's API/parse failure must not sink the whole batch - the buildathon
          // brief explicitly wants failures documented with why, not silently dropped.
          console.error(`Recovery agent error for payment ${payment.id}:`, err);
          outcome = {
            paymentId: payment.id,
            escalation: {
              action: "agent_error" as const,
              reason: err instanceof Error ? err.message : "Recovery agent failed to run",
            },
            auditTrail: [
              auditEntry(
                "governance",
                "pipeline error",
                "Agent run threw before producing a plan - case left as-is for retry."
              ),
            ],
            skippedAgent: true as const,
          };
        }

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
      failedCount: results.filter((r) => r.outcome.escalation.action === "agent_error").length,
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
