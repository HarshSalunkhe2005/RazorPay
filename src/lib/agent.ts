import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { FailedPayment, AgentResult, AgentOutcome, AuditEntry } from "./types";
import {
  precheckAttempts,
  postcheckRecoverability,
  auditEntry,
  MAX_AUTOMATED_ATTEMPTS,
} from "./escalation";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash";

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

// Gemini's responseJsonSchema takes a plain JSON Schema object (not a Zod schema
// directly) - kept in sync with AgentOutputSchema above, which still does the runtime
// validation/parsing once a response comes back.
const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    recoverabilityScore: { type: "number" },
    rootCause: { type: "string" },
    recommendedChannel: { type: "string", enum: ["email", "sms", "whatsapp", "voice_call"] },
    recommendedTiming: { type: "string" },
    recommendedIncentive: {
      type: "string",
      enum: ["none", "grace_period_3d", "discount_10", "discount_20", "fee_waiver"],
    },
    message: { type: "string" },
    steps: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          stage: { type: "string", enum: ["classify", "strategize", "draft", "action"] },
          title: { type: "string" },
          reasoning: { type: "string" },
          output: { type: "object", additionalProperties: { type: "string" } },
        },
        required: ["stage", "title", "reasoning", "output"],
      },
    },
  },
  required: [
    "recoverabilityScore",
    "rootCause",
    "recommendedChannel",
    "recommendedTiming",
    "recommendedIncentive",
    "message",
    "steps",
  ],
};

const SYSTEM_PROMPT = `You are the Recovery Agent for a payments platform, modeled on Razorpay's AI Buildathon "Revenue Recovery" track.

Given one failed payment/subscription-renewal event, work through four explicit reasoning stages and return them all:
1. "classify" - diagnose the true root cause behind the failure code (not just restate it), and estimate a recoverability score 0-100 based on failure type, customer tenure, and payment history.
2. "strategize" - decide the best recovery channel (email / sms / whatsapp / voice_call), timing, and incentive (none / grace_period_3d / discount_10 / discount_20 / fee_waiver). Weigh cost of incentive against customer lifetime value signals (tenure, prior successful payments). Do not over-offer discounts to low-value or brand-new, unproven customers; do protect high-tenure loyal customers.
3. "draft" - write the actual outbound recovery message in the customer's preferred language/tone (support Hinglish naturally, not just literal translation). Keep it short, warm, and action-oriented with a clear next step.
4. "action" - summarize the concrete automated action taken (e.g. "Generated fresh payment retry link, scheduled WhatsApp send in 2 hours").

Each step's "reasoning" field should read like real analyst thinking (2-4 sentences), and "output" must be a flat string-to-string map of the concrete decision fields for that step (e.g. {"root_cause": "...", "recoverability_score": "72"}).

Be decisive and specific to the given customer data - do not give generic advice.

Respond with ONLY the JSON object matching the required schema - no prose, no markdown fences.`;

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

/**
 * Runs one payment through the full governed pipeline:
 * pre-check (deterministic) -> LLM reasoning -> post-check (score-driven) -> audit trail.
 * See lib/escalation.ts for what the checks do and why they live outside the model.
 */
export async function runRecoveryAgent(payment: FailedPayment): Promise<AgentOutcome> {
  const trail: AuditEntry[] = [];

  const precheck = precheckAttempts(payment);
  if (precheck) {
    trail.push(
      auditEntry(
        "governance",
        "pre-check: max-attempts rule",
        `${precheck.reason} Agent was not invoked for this run.`
      )
    );
    return { paymentId: payment.id, escalation: precheck, auditTrail: trail, skippedAgent: true };
  }
  trail.push(
    auditEntry(
      "governance",
      "pre-check: max-attempts rule",
      `Attempt ${payment.attemptNumber}/${MAX_AUTOMATED_ATTEMPTS} - within policy, proceeding to agent.`
    )
  );

  const response = await client.models.generateContent({
    model: MODEL,
    contents: buildUserPrompt(payment),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Recovery agent returned an empty response");
  }

  const parsed = AgentOutputSchema.parse(JSON.parse(raw));

  trail.push(
    auditEntry(
      "agent",
      "4-stage recovery plan generated",
      `Recoverability ${parsed.recoverabilityScore}/100 · root cause: ${parsed.rootCause}`
    )
  );

  const postcheck = postcheckRecoverability(parsed.recoverabilityScore);
  trail.push(
    auditEntry("governance", "post-check: write-off threshold rule", postcheck.reason)
  );

  const result: AgentResult = {
    paymentId: payment.id,
    recoverabilityScore: parsed.recoverabilityScore,
    rootCause: parsed.rootCause,
    recommendedChannel: parsed.recommendedChannel,
    recommendedTiming: parsed.recommendedTiming,
    recommendedIncentive: parsed.recommendedIncentive,
    message: parsed.message,
    retryLink: `https://rzp.io/retry/${payment.subscriptionId.toLowerCase()}`,
    steps: parsed.steps,
    escalation: postcheck,
    auditTrail: trail,
    generatedAt: new Date().toISOString(),
  };

  return result;
}
