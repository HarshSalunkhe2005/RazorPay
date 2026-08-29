import { z } from "zod";
import { FailedPayment } from "./types";
import { FailedPaymentSchema } from "./schemas";

/**
 * Lenient version of the strict FailedPaymentSchema for user-uploaded data: fills in
 * sensible defaults for fields a judge's spreadsheet is unlikely to bother with
 * (id, subscriptionId, status, history/tenure, language), and coerces numeric-looking
 * strings (CSV cells are always strings). The strict schema still runs server-side once
 * a case is actually submitted to run - this is just about accepting a rough upload.
 */
const ImportRowSchema = z.object({
  id: z.string().min(1).optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  amount: z.coerce.number().positive(),
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
  attemptNumber: z.coerce.number().int().min(1).default(1),
  subscriptionId: z.string().min(1).optional(),
  status: z
    .enum(["failed", "in_progress", "contacted", "recovered", "lost", "escalated", "write_off"])
    .default("failed"),
  previousSuccessfulPayments: z.coerce.number().int().min(0).default(0),
  customerTenureMonths: z.coerce.number().int().min(0).default(0),
  preferredLanguage: z.enum(["English", "Hindi", "Hinglish"]).default("English"),
});

export interface DatasetImportResult {
  payments: FailedPayment[];
  errors: string[]; // one entry per row that failed to parse, human-readable
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

/** Accepts a CSV or JSON (array of objects, or a single object) file's raw text and
 * returns validated FailedPayment rows plus a list of per-row errors for anything that
 * didn't parse - partial success is the point, not all-or-nothing. */
export function parseDatasetFile(filename: string, text: string): DatasetImportResult {
  const looksLikeJson = filename.toLowerCase().endsWith(".json") || /^\s*[[{]/.test(text);

  let rawRows: unknown[];
  if (looksLikeJson) {
    try {
      const data: unknown = JSON.parse(text);
      rawRows = Array.isArray(data) ? data : [data];
    } catch {
      return { payments: [], errors: ["File is not valid JSON."] };
    }
  } else {
    rawRows = parseCsv(text);
    if (rawRows.length === 0) {
      return { payments: [], errors: ["No data rows found - is the first line a header row?"] };
    }
  }

  const payments: FailedPayment[] = [];
  const errors: string[] = [];
  const usedIds = new Set<string>();

  rawRows.forEach((raw, index) => {
    const parsed = ImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(`Row ${index + 1}: ${issue?.path.join(".") || "field"} — ${issue?.message ?? "invalid"}`);
      return;
    }

    const d = parsed.data;
    let id = d.id?.trim() || `uploaded_${index + 1}_${Date.now()}`;
    while (usedIds.has(id)) id = `${id}_dup`;
    usedIds.add(id);

    const candidate: FailedPayment = {
      id,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      amount: d.amount,
      currency: "INR",
      planName: d.planName,
      failureReason: d.failureReason,
      failedAt: d.failedAt,
      attemptNumber: d.attemptNumber,
      subscriptionId: d.subscriptionId?.trim() || `sub_${id}`,
      status: d.status,
      previousSuccessfulPayments: d.previousSuccessfulPayments,
      customerTenureMonths: d.customerTenureMonths,
      preferredLanguage: d.preferredLanguage,
    };

    // Re-validate against the strict schema so an upload can never produce a payment
    // object the run-agent API routes would themselves reject later.
    const strict = FailedPaymentSchema.safeParse(candidate);
    if (!strict.success) {
      errors.push(`Row ${index + 1}: ${strict.error.issues[0]?.message ?? "invalid"}`);
      return;
    }

    payments.push(strict.data);
  });

  return { payments, errors };
}

export const SAMPLE_CSV = `customerName,customerEmail,customerPhone,amount,planName,failureReason,failedAt,attemptNumber,previousSuccessfulPayments,customerTenureMonths,preferredLanguage
Anaya Gupta,anaya.gupta@example.com,+91 98123 45678,1499,Pro Monthly,insufficient_funds,2026-08-20T10:00:00Z,1,4,8,English
Ravi Kumar,ravi.kumar@example.com,+91 90011 22334,799,Starter Monthly,card_expired,2026-08-21T14:30:00Z,2,0,1,Hindi
`;
