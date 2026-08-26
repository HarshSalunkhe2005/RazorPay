import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FailedPayment, AgentResult } from "./types";

const client = new Anthropic();

const AgentStepSchema = z.object({
  stage: z.enum(["classify", "strategize", "draft", "action"]),
  title: z.string(),
  reasoning: z.string(),
  output: z.record(z.string(), z.string()),
});

const AgentOutputSchema = z.object({
  recoverabilityScore: z.number().min(0).max(100),
  rootCause: z.string(),
  recommendedChannel: z.enum(["email", "sms", "whatsapp", "voice_call"]),
  recommendedTiming: z.string(),
  recommendedIncentive: z.enum([
    "none",
    "grace_period_3d",
    "discount_10",
    "discount_20",
    "fee_waiver",
  ]),
  message: z.string(),
  steps: z.array(AgentStepSchema).length(4),
});

const SYSTEM_PROMPT = `You are the Recovery Agent for a payments platform, modeled on Razorpay's AI Buildathon "Revenue Recovery" track.

Given one failed payment/subscription-renewal event, work through four explicit reasoning stages and return them all:
1. "classify" - diagnose the true root cause behind the failure code (not just restate it), and estimate a recoverability score 0-100 based on failure type, customer tenure, and payment history.
2. "strategize" - decide the best recovery channel (email / sms / whatsapp / voice_call), timing, and incentive (none / grace_period_3d / discount_10 / discount_20 / fee_waiver). Weigh cost of incentive against customer lifetime value signals (tenure, prior successful payments). Do not over-offer discounts to low-value or brand-new, unproven customers; do protect high-tenure loyal customers.
3. "draft" - write the actual outbound recovery message in the customer's preferred language/tone (support Hinglish naturally, not just literal translation). Keep it short, warm, and action-oriented with a clear next step.
4. "action" - summarize the concrete automated action taken (e.g. "Generated fresh payment retry link, scheduled WhatsApp send in 2 hours").

Each step's "reasoning" field should read like real analyst thinking (2-4 sentences), and "output" must be a flat string-to-string map of the concrete decision fields for that step (e.g. {"root_cause": "...", "recoverability_score": "72"}).

Be decisive and specific to the given customer data - do not give generic advice.`;

function buildUserPrompt(payment: FailedPayment): string {
  return `Failed payment event:
- Customer: ${payment.customerName} (${payment.preferredLanguage} preferred)
- Plan: ${payment.planName}, Amount: ₹${payment.amount}
- Failure reason code: ${payment.failureReason}
- Attempt number: ${payment.attemptNumber}
- Customer tenure: ${payment.customerTenureMonths} months
- Previous successful payments: ${payment.previousSuccessfulPayments}
- Failed at: ${payment.failedAt}

Produce the full 4-stage recovery plan as structured output.`;
}

export async function runRecoveryAgent(payment: FailedPayment): Promise<AgentResult> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(payment) }],
    output_config: {
      format: zodOutputFormat(AgentOutputSchema),
      effort: "medium",
    },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Recovery agent failed to produce structured output");
  }

  return {
    paymentId: payment.id,
    recoverabilityScore: parsed.recoverabilityScore,
    rootCause: parsed.rootCause,
    recommendedChannel: parsed.recommendedChannel,
    recommendedTiming: parsed.recommendedTiming,
    recommendedIncentive: parsed.recommendedIncentive,
    message: parsed.message,
    retryLink: `https://rzp.io/retry/${payment.subscriptionId.toLowerCase()}`,
    steps: parsed.steps,
    generatedAt: new Date().toISOString(),
  };
}
