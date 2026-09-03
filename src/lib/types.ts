export type FailureReason =
  | "insufficient_funds"
  | "card_expired"
  | "bank_decline"
  | "issuer_unavailable"
  | "network_error"
  | "otp_timeout";

export type PaymentStatus =
  | "failed"
  | "in_progress"
  | "contacted"
  | "recovered"
  | "lost"
  | "escalated" // handed off to a human collections agent by the stopping rules
  | "write_off"; // recoverability too low to justify further automated contact

export interface FailedPayment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number; // in INR
  currency: "INR";
  planName: string;
  failureReason: FailureReason;
  failedAt: string; // ISO date
  attemptNumber: number;
  subscriptionId: string;
  status: PaymentStatus;
  previousSuccessfulPayments: number;
  customerTenureMonths: number;
  preferredLanguage: "English" | "Hindi" | "Hinglish";
}

export type Channel = "email" | "sms" | "whatsapp" | "voice_call";
export type Incentive = "none" | "grace_period_3d" | "discount_10" | "discount_20" | "fee_waiver";

export interface AgentStep {
  stage: "classify" | "strategize" | "draft" | "action";
  title: string;
  reasoning: string;
  output: Record<string, string>;
}

/** One entry in a case's audit trail - every automated decision, human-visible and timestamped. */
export interface AuditEntry {
  timestamp: string;
  actor: "agent" | "governance";
  action: string;
  detail: string;
}

export type EscalationAction =
  | "proceed" // within policy, agent's recommended outreach is authorized to run
  | "escalate_human_review" // hit the max-attempts stopping rule, handed to a human
  | "stop_write_off" // recoverability too low to justify further automated contact
  | "agent_error"; // pipeline itself failed (API/parse error) - not a governance decision

export interface EscalationDecision {
  action: EscalationAction;
  reason: string;
}

export interface AgentResult {
  paymentId: string;
  recoverabilityScore: number; // 0-100
  rootCause: string;
  recommendedChannel: Channel;
  recommendedTiming: string;
  recommendedIncentive: Incentive;
  message: string;
  retryLink: string;
  /** True when retryLink is a genuine Razorpay Payment Links API (test mode) response,
   * false when it's the constructed fallback (no RAZORPAY_KEY_ID/SECRET configured, or
   * the call failed) - see lib/razorpay.ts. Surfaced in the UI so the distinction is
   * never silently blurred. */
  retryLinkIsLive: boolean;
  /** UPI deep link (upi://pay?...) for 1-tap payment via GPay/PhonePe/etc - a demo
   * construction against a mock VPA, same honesty framing as a fallback retryLink. */
  upiIntentLink: string;
  /** Set when a deterministic bank-gateway-outage check (lib/bank-uptime.ts) defers this
   * case's contact instead of recommending immediate outreach. Absent for the common
   * case. */
  retryScheduledFor?: string;
  steps: AgentStep[];
  escalation: EscalationDecision;
  auditTrail: AuditEntry[];
  generatedAt: string;
}

/** A pre-check stop: the case never reached the LLM because a deterministic rule
 * (e.g. max attempts already exhausted) fired first. Cheaper and faster than running
 * the full pipeline just to discard the result. */
export interface PrecheckStop {
  paymentId: string;
  escalation: EscalationDecision;
  auditTrail: AuditEntry[];
  skippedAgent: true;
}

export type AgentOutcome = AgentResult | PrecheckStop;

export function isPrecheckStop(outcome: AgentOutcome): outcome is PrecheckStop {
  return "skippedAgent" in outcome;
}

/** One row of a batch run's results, including the demo's simulated payment outcome. */
export interface BatchRunResult {
  paymentId: string;
  customerName: string;
  amount: number;
  outcome: AgentOutcome;
  /** DEMO ONLY: in production this is a real webhook confirmation of the retried payment,
   * not something an agent can determine on its own. Simulated here, deterministically per
   * payment id, weighted by the model's own recoverability score so the metrics stay honest
   * about what they represent. */
  simulatedResult: "recovered" | "lost" | "pending" | "n/a";
}

export interface BatchSummary {
  totalCases: number;
  totalAtRiskAmount: number;
  processedCount: number;
  escalatedCount: number;
  writeOffCount: number;
  failedCount: number; // agent pipeline threw for this case (API/parse error) - documented, not silently dropped
  simulatedRecoveredCount: number;
  simulatedRecoveredAmount: number;
  simulatedRecoveryRate: number; // % of processed (non-escalated, non-write-off) cases
  channelBreakdown: Record<Channel, number>;
  runDurationMs: number;
}

export interface BatchRunResponse {
  summary: BatchSummary;
  results: BatchRunResult[];
}

/**
 * One centralized, persisted record of a governed run - single-case or batch. This is
 * the thing that used to only live inside a dialog's component state and would
 * disappear once closed; now every run appends one of these to a durable log
 * (see lib/audit-log.ts) so nothing gets lost.
 */
export interface AuditLogRecord {
  id: string;
  paymentId: string;
  customerName: string;
  amount: number;
  source: "single" | "batch";
  escalationAction: EscalationAction;
  recoverabilityScore?: number; // absent when a pre-check stopped the case before the agent ran
  entries: AuditEntry[];
  recordedAt: string;
}
