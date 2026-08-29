/**
 * Best-effort per-IP rate limit for the two routes that call the paid Gemini API.
 * In-memory, so it only protects a single warm serverless instance - not a substitute
 * for a real gateway/WAF, but cheap insurance against a public demo URL getting
 * hammered and running up the API bill, which a from-scratch limiter is worth having
 * for zero added infra.
 */

const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export function isRateLimited(
  identifier: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_WINDOW
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(identifier) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(identifier, timestamps);

  // Bound memory: drop the oldest tracked identifier once the map gets large, rather
  // than growing unbounded for the lifetime of the instance.
  if (hits.size > 5000) {
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined) hits.delete(oldestKey);
  }

  return timestamps.length > maxRequests;
}

export function clientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
