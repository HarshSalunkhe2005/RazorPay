import { hashToUnit } from "./hash";

/**
 * DEMO-ONLY simulation of issuing-bank gateway uptime - same honesty framing as
 * simulate.ts's payment-outcome simulation. There is no live bank uptime API wired in
 * (no live payments account at all - see context/PROJECT_CONTEXT.md §3), so "is the
 * bank's gateway currently down" is a deterministic-per-payment-id stand-in, not a real
 * signal. It's only ever consulted for failureReason: "issuer_unavailable", the one
 * failure code that actually means "the bank's side was unreachable," not the
 * customer's.
 *
 * Deliberately kept out of lib/agent.ts and lib/escalation.ts: this is a data/simulation
 * concern (what is the state of the world), not a governance rule (what should the
 * system do about it) - agent.ts composes the two.
 */
export function isBankGatewayLikelyDown(paymentId: string): boolean {
  return hashToUnit(`bank-outage:${paymentId}`) < 0.35;
}

/** Deterministic "next likely uptime window" - a fixed +2h offset from now, not derived
 * from any real bank status feed. */
export function nextLikelyUptimeWindow(): string {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
}
