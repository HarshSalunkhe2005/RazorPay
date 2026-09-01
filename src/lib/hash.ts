/** Deterministic pseudo-random unit interval from a string id - same input always gives
 * the same output, so a re-run doesn't produce a new random draw. Shared by simulate.ts
 * (batch outcome simulation) and bank-uptime.ts (gateway-outage simulation) - both need
 * "deterministic per payment id," not real randomness. */
export function hashToUnit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 10000) / 10000;
}
