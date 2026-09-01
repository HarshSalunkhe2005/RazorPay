import { hashToUnit } from "./hash";

/**
 * DEMO-ONLY simulation of a payment retry's real-world outcome.
 *
 * In production, "recovered" vs "lost" is determined by a real Razorpay webhook
 * confirming the retried payment - never something the agent decides for itself.
 * Since this build has no live payments account wired in, batch-run metrics need a
 * stand-in so the aggregate numbers (recovery rate, ₹ recovered) mean something instead
 * of being hand-waved. This function is that stand-in: deterministic per payment id (so
 * a re-run gives the same result, not a new random draw), and weighted by the model's
 * own recoverability score so a 90/100 case is much more likely to "recover" than a
 * 15/100 one - the simulation stays honest about what it represents.
 */
export function simulateOutcome(
  paymentId: string,
  recoverabilityScore: number
): "recovered" | "lost" {
  const roll = hashToUnit(paymentId);
  return roll < recoverabilityScore / 100 ? "recovered" : "lost";
}
