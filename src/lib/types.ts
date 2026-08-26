export type FailureReason =
  | "insufficient_funds"
  | "card_expired"
  | "bank_decline"
  | "issuer_unavailable"
  | "network_error"
  | "otp_timeout";

export type PaymentStatus = "failed" | "in_progress" | "contacted" | "recovered" | "lost";

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
  generatedAt: string;
}
