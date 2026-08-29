import { z } from "zod";

/**
 * Canonical shape of a FailedPayment, as a Zod schema - the single source of truth for
 * validating payment data that crosses a trust boundary. Two call sites need this:
 *  - the API routes, which now take full payment objects from the client (there's no
 *    database - the client's in-memory dataset, whether seeded or user-uploaded, IS the
 *    record), so a public POST body needs real validation, not just a lookup key
 *  - the dataset importer, which parses arbitrary uploaded CSV/JSON
 * Kept structurally in sync with the FailedPayment interface in lib/types.ts.
 */
export const FailedPaymentSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  amount: z.number().positive(),
  currency: z.literal("INR"),
  planName: z.string().min(1),
  failureReason: z.enum([
    "insufficient_funds",
    "card_expired",
    "bank_decline",
    "issuer_unavailable",
    "network_error",
    "otp_timeout",
  ]),
  failedAt: z.string().min(1),
  attemptNumber: z.number().int().min(1),
  subscriptionId: z.string().min(1),
  status: z.enum([
    "failed",
    "in_progress",
    "contacted",
    "recovered",
    "lost",
    "escalated",
    "write_off",
  ]),
  previousSuccessfulPayments: z.number().int().min(0),
  customerTenureMonths: z.number().int().min(0),
  preferredLanguage: z.enum(["English", "Hindi", "Hinglish"]),
});
