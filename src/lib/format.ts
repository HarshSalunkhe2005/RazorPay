export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    // Explicit, not the runtime's local zone - without this, the server (prerendering
    // "/" at build time, UTC on Vercel) and the client (whatever timezone the browser is
    // in) can format the same ISO timestamp into different text, which is a hydration
    // mismatch (React error #418) on every row of the payments table. IST since this is
    // an Indian payments product - real Razorpay merchants read failure times in IST.
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const FAILURE_REASON_LABELS: Record<string, string> = {
  insufficient_funds: "Insufficient funds",
  card_expired: "Card expired",
  bank_decline: "Bank declined",
  issuer_unavailable: "Issuer unavailable",
  network_error: "Network error",
  otp_timeout: "OTP timeout",
};

export function failureReasonLabel(reason: string): string {
  return FAILURE_REASON_LABELS[reason] ?? reason;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  voice_call: "Voice call",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

const INCENTIVE_LABELS: Record<string, string> = {
  none: "No incentive",
  grace_period_3d: "3-day grace period",
  discount_10: "10% discount",
  discount_20: "20% discount",
  fee_waiver: "Fee waiver",
};

export function incentiveLabel(incentive: string): string {
  return INCENTIVE_LABELS[incentive] ?? incentive;
}
