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
  | "stop_write_off"; // recoverability too low to justify further automated contact

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
