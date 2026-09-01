import { FailedPayment } from "./types";
import { MODEL_WEIGHTS } from "./recoverability-model";

/**
 * Zero-latency inference for the trained recoverability classifier (see
 * scripts/train-recoverability-model.mjs and the generated recoverability-model.ts).
 * Replaces what used to be the LLM's own invented recoverabilityScore - the model now
 * decides the number, the LLM reasons about strategy/drafting given that number as
 * context (see lib/agent.ts).
 *
 * Feature order here must match what the training script builds: the 4 numeric
 * features (z-scored using the training set's own stats) followed by the one-hot
 * failureReason categories, both in MODEL_WEIGHTS' stored order - not hardcoded twice,
 * read directly off the generated artifact so the two can't drift out of sync.
 */
export function predictRecoverability(payment: FailedPayment): number {
  const { numericFeatures, numericStats, failureReasonCategories, weights, bias } = MODEL_WEIGHTS;

  const raw: Record<string, number> = {
    attemptNumber: payment.attemptNumber,
    customerTenureMonths: payment.customerTenureMonths,
    previousSuccessfulPayments: payment.previousSuccessfulPayments,
    amount: payment.amount,
  };

  const numericPart = numericFeatures.map((key) => {
    const { mean, std } = numericStats[key];
    return (raw[key] - mean) / std;
  });

  const oneHotPart = failureReasonCategories.map((reason) => (payment.failureReason === reason ? 1 : 0));

  const features = [...numericPart, ...oneHotPart];
  const logit = features.reduce((sum, x, i) => sum + x * weights[i], bias);
  const probability = 1 / (1 + Math.exp(-logit));

  return Math.max(0, Math.min(100, Math.round(probability * 100)));
}
