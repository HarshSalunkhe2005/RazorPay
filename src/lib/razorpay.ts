import { FailedPayment } from "./types";

/**
 * Real Razorpay Payment Links API integration (test mode) - genuinely creates a live,
 * clickable payment link via https://api.razorpay.com/v1/payment_links, not a
 * constructed URL string. Falls back to null (never throws) when RAZORPAY_KEY_ID/
 * RAZORPAY_KEY_SECRET aren't configured or the call fails, so the app stays fully
 * demoable without them - lib/agent.ts constructs the existing mock link in that case
 * and is explicit in the audit trail about which path was used, same honesty framing as
 * every other simulated piece of this app (see simulate.ts, bank-uptime.ts).
 *
 * Plain fetch with HTTP Basic Auth rather than the `razorpay` SDK - one endpoint doesn't
 * justify a new dependency, and this is more transparent to read/audit.
 */
export interface RazorpayPaymentLink {
  id: string;
  shortUrl: string;
}

export async function createRazorpayPaymentLink(payment: FailedPayment): Promise<RazorpayPaymentLink | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  try {
    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(payment.amount * 100), // paise
        currency: payment.currency,
        description: `Retry: ${payment.planName} - ${payment.customerName}`,
        customer: {
          name: payment.customerName,
          email: payment.customerEmail,
          contact: payment.customerPhone,
        },
        // Never auto-send from a demo run - this app drafts the message, it doesn't
        // dispatch it (see architecture-view.tsx), so Razorpay shouldn't either.
        notify: { sms: false, email: false },
        reference_id: payment.id,
        notes: { subscriptionId: payment.subscriptionId, attemptNumber: String(payment.attemptNumber) },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.short_url !== "string" || typeof data.id !== "string") return null;
    return { id: data.id, shortUrl: data.short_url };
  } catch {
    // Network error, timeout, malformed response - never let a Razorpay hiccup fail
    // the whole agent run. See lib/agent.ts for the fallback.
    return null;
  }
}
