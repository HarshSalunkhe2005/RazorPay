import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { FailedPayment, AgentResult, AgentOutcome, AuditEntry } from "./types";
import {
  precheckAttempts,
  postcheckRecoverability,
  auditEntry,
  MAX_AUTOMATED_ATTEMPTS,
} from "./escalation";
import { predictRecoverability } from "./recoverability";
import { capIncentive } from "./incentive-guard";
import { isBankGatewayLikelyDown, nextLikelyUptimeWindow } from "./bank-uptime";
import { createRazorpayPaymentLink } from "./razorpay";

const MODEL = "gemini-3.6-flash";

// Constructed lazily, not at module load - the SDK warns as soon as it's built without a
// key, and this module gets imported during Next's build-time page-data collection where
// no env var is set yet. The actual call sites already guard on GEMINI_API_KEY first.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const AgentStepSchema = z.object({
  stage: z.enum(["classify", "strategize", "draft", "action"]),
  title: z.string(),
  reasoning: z.string(),
  output: z.record(z.string(), z.string()),
});

const AgentOutputSchema = z.object({
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
1. "classify" - diagnose the true root cause behind the failure code (not just restate it). A trained classifier's recoverability estimate for this case is given to you as reference context below (not something you output) - use it as a starting point, and say in your reasoning whether the qualitative picture (failure type, tenure, payment history) agrees with it or would push the number higher/lower.
2. "strategize" - decide the best recovery channel (email / sms / whatsapp / voice_call), timing, and incentive (none / grace_period_3d / discount_10 / discount_20 / fee_waiver). Weigh cost of incentive against customer lifetime value signals (tenure, prior successful payments). Do not over-offer discounts to low-value or brand-new, unproven customers; do protect high-tenure loyal customers. (A deterministic guardrail also caps this after you decide - see lib/incentive-guard.ts - so treat this as the real target, not a suggestion to push against.) If a bank-gateway-outage window is flagged in the context below, timing must reflect deferring contact until it clears, not immediate outreach.
3. "draft" - write the actual outbound recovery message in the customer's preferred language/tone (support Hinglish naturally, not just literal translation). Keep it short, warm, and action-oriented with a clear next step. Match the tone to the channel: sms/whatsapp should be short and punchy (a sentence or two, not a paragraph); voice_call should read as a short spoken call script ("Hi, this is..."), not written prose; email can be slightly more formal, with a clear opening line that works as a subject-line-style hook.
4. "action" - summarize the concrete automated action taken (e.g. "Generated fresh payment retry link, scheduled WhatsApp send in 2 hours").

Each step's "reasoning" field should read like real analyst thinking (2-4 sentences), and "output" must be a flat string-to-string map of the concrete decision fields for that step (e.g. {"root_cause": "...", "reference_model_score": "72"}).

Be decisive and specific to the given customer data - do not give generic advice.

Respond with ONLY the JSON object matching the required schema - no prose, no markdown fences.`;

function buildUserPrompt(payment: FailedPayment, modelScore: number, bankGatewayDown: boolean): string {
  const bankLine = bankGatewayDown
    ? `\n- Bank gateway status: the issuing bank's gateway is currently flagged as down (simulated check - see lib/bank-uptime.ts). Contact should be deferred until it's back, not sent immediately.`
    : "";

  return `Failed payment event:
- Customer: ${payment.customerName} (${payment.preferredLanguage} preferred)
- Plan: ${payment.planName}, Amount: ₹${payment.amount}
- Failure reason code: ${payment.failureReason}
- Attempt number: ${payment.attemptNumber}
- Customer tenure: ${payment.customerTenureMonths} months
- Previous successful payments: ${payment.previousSuccessfulPayments}
- Failed at: ${payment.failedAt}
- Trained classifier's recoverability estimate: ${modelScore}/100 (reference context for your classify reasoning - see instruction 1)${bankLine}

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

  // Recoverability is a trained-classifier decision, not an LLM guess - see
  // lib/recoverability.ts. The LLM gets the score as reference context for its classify
  // reasoning (see SYSTEM_PROMPT), but does not invent the number itself.
  const modelScore = predictRecoverability(payment);

  const bankGatewayDown =
    payment.failureReason === "issuer_unavailable" && isBankGatewayLikelyDown(payment.id);
  const retryScheduledFor = bankGatewayDown ? nextLikelyUptimeWindow() : undefined;
  trail.push(
    auditEntry(
      "governance",
      "bank-outage-aware retry scheduling",
      bankGatewayDown
        ? `Issuing bank's gateway is flagged down (simulated check). Deferring contact until ${retryScheduledFor}.`
        : payment.failureReason === "issuer_unavailable"
          ? "Issuer-unavailable failure, but the bank gateway check came back up - proceeding without deferral."
          : "Not applicable - failure reason isn't a bank-gateway issue."
    )
  );

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: buildUserPrompt(payment, modelScore, bankGatewayDown),
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

  // The model occasionally mislabels a step's "stage" field (e.g. two steps both tagged
  // "classify") even though the prompt asks for classify/strategize/draft/action in that
  // exact order and the schema already enforces exactly 4 steps. Rather than rejecting an
  // otherwise-good response over a label slip, trust the position (which the prompt does
  // guarantee) over the model's own stage string.
  const STAGE_ORDER = ["classify", "strategize", "draft", "action"] as const;
  const steps = parsed.steps.map((step, i) => ({ ...step, stage: STAGE_ORDER[i] }));

  trail.push(
    auditEntry(
      "agent",
      "4-stage recovery plan generated",
      `Recoverability ${modelScore}/100 (trained classifier) · root cause: ${parsed.rootCause}`
    )
  );

  const incentiveCap = capIncentive(parsed.recommendedIncentive, payment);
  trail.push(auditEntry("governance", "incentive guardrail", incentiveCap.reason));

  const postcheck = postcheckRecoverability(modelScore);
  trail.push(
    auditEntry("governance", "post-check: write-off threshold rule", postcheck.reason)
  );

  // Only spend a real API call generating a live link for a case actually authorized to
  // proceed - a write-off case's plan is drafted but never sent (see architecture-view.tsx),
  // so there's nothing for a real payment link to do there.
  let liveLink: Awaited<ReturnType<typeof createRazorpayPaymentLink>> = null;
  if (postcheck.action === "proceed") {
    liveLink = await createRazorpayPaymentLink(payment);
  }
  trail.push(
    auditEntry(
      "governance",
      "retry link generation",
      postcheck.action !== "proceed"
        ? "Case not authorized to proceed - no payment link generated."
        : liveLink
          ? `Live Razorpay test-mode payment link created (id: ${liveLink.id}).`
          : "RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not configured (or the API call failed) - used a constructed demo link instead."
    )
  );

  const result: AgentResult = {
    paymentId: payment.id,
    recoverabilityScore: modelScore,
    rootCause: parsed.rootCause,
    recommendedChannel: parsed.recommendedChannel,
    recommendedTiming: parsed.recommendedTiming,
    recommendedIncentive: incentiveCap.incentive,
    message: parsed.message,
    retryLink: liveLink?.shortUrl ?? `https://rzp.io/retry/${payment.subscriptionId.toLowerCase()}`,
    retryLinkIsLive: liveLink !== null,
    upiIntentLink: `upi://pay?pa=recoveryagent@razorpay&pn=RecoveryAgent&am=${payment.amount}&cu=INR&tn=${encodeURIComponent(
      `Retry ${payment.planName}`
    )}`,
    retryScheduledFor,
    steps,
    escalation: postcheck,
    auditTrail: trail,
    generatedAt: new Date().toISOString(),
  };

  return result;
}
