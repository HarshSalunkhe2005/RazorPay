import { FailedPayment, EscalationDecision, AuditEntry } from "./types";

/**
 * Governance layer for the Recovery Agent.
 *
 * The buildathon brief for Track 3 explicitly requires "compliant escalation, stopping
 * rules" - the agent must not be allowed to contact a customer indefinitely. These rules
 * are deliberately kept OUTSIDE the LLM: they are deterministic, auditable, and cannot be
 * reasoned around by a prompt. The LLM proposes a recovery plan; this module decides
 * whether that plan is authorized to run.
 *
 * Two distinct checks:
 *  - PRE-CHECK (runs before the agent, cheap): max-attempts rule. If a case has already
 *    been touched MAX_AUTOMATED_ATTEMPTS times, we do not spend another LLM call
 *    re-analyzing it - it is hand-off territory.
 *  - POST-CHECK (runs after the agent, using its own output): write-off rule. If the
 *    model's own recoverability score is below threshold, continuing automated outreach
 *    is not cost-justified, even though a plan was drafted.
 */

export const MAX_AUTOMATED_ATTEMPTS = 3;
export const WRITE_OFF_SCORE_THRESHOLD = 25;

export function precheckAttempts(payment: FailedPayment): EscalationDecision | null {
  if (payment.attemptNumber >= MAX_AUTOMATED_ATTEMPTS) {
    return {
      action: "escalate_human_review",
      reason: `Case has reached ${payment.attemptNumber} automated attempts (policy cap: ${MAX_AUTOMATED_ATTEMPTS}). Escalating to a human collections reviewer instead of contacting the customer again.`,
    };
  }
  return null;
}

export function postcheckRecoverability(recoverabilityScore: number): EscalationDecision {
  if (recoverabilityScore < WRITE_OFF_SCORE_THRESHOLD) {
    return {
      action: "stop_write_off",
      reason: `Recoverability score ${recoverabilityScore}/100 is below the write-off threshold (${WRITE_OFF_SCORE_THRESHOLD}). Further automated contact is unlikely to be cost-justified; plan is logged but not executed.`,
    };
  }
  return {
    action: "proceed",
    reason: `Recoverability score ${recoverabilityScore}/100 clears the automated-outreach threshold (${WRITE_OFF_SCORE_THRESHOLD}). Plan is authorized to execute.`,
  };
}

export function auditEntry(
  actor: AuditEntry["actor"],
  action: string,
  detail: string
): AuditEntry {
  return { timestamp: new Date().toISOString(), actor, action, detail };
}
