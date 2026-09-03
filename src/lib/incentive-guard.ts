import { FailedPayment, Incentive } from "./types";

/**
 * Incentive governance - same spirit as escalation.ts: a rule that used to live only as
 * a soft instruction in the LLM's system prompt ("do not over-offer discounts to
 * low-value or brand-new, unproven customers") is enforced here instead, deterministically
 * and outside the model, so a run where the LLM drifts from its own instructions can't
 * actually over-discount. The LLM still picks the incentive it thinks fits; this is the
 * last word on whether that pick is authorized to go out as-is.
 */
export interface IncentiveGuardResult {
  incentive: Incentive;
  overridden: boolean;
  reason: string;
}

const LOYAL_TENURE_MONTHS = 12;
const LOYAL_PRIOR_PAYMENTS = 6;

export function capIncentive(recommended: Incentive, payment: FailedPayment): IncentiveGuardResult {
  const isFirstEverAttempt = payment.previousSuccessfulPayments < 1;
  const isLoyal =
    payment.customerTenureMonths >= LOYAL_TENURE_MONTHS &&
    payment.previousSuccessfulPayments >= LOYAL_PRIOR_PAYMENTS;

  const isCashDiscount = recommended === "discount_10" || recommended === "discount_20";
  const isAnyDiscount = isCashDiscount || recommended === "fee_waiver";

  if (isAnyDiscount && isFirstEverAttempt) {
    return {
      incentive: "grace_period_3d",
      overridden: true,
      reason: `Customer has 0 prior successful payments - too new/unproven to justify a cash discount or fee waiver. Capped "${recommended}" down to a 3-day grace period instead.`,
    };
  }

  if ((recommended === "discount_20" || recommended === "fee_waiver") && !isLoyal) {
    return {
      incentive: "discount_10",
      overridden: true,
      reason: `"${recommended}" requires >= ${LOYAL_TENURE_MONTHS} months tenure and >= ${LOYAL_PRIOR_PAYMENTS} prior successful payments (loyal, proven customer) - a full fee waiver or 20% discount is at least as costly as a 20% discount. This case doesn't clear that bar - capped to 10%.`,
    };
  }

  return {
    incentive: recommended,
    overridden: false,
    reason: "Recommended incentive is within policy - no cap applied.",
  };
}
