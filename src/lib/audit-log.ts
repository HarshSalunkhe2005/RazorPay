import { AgentOutcome, AuditLogRecord, isPrecheckStop } from "./types";

const STORAGE_KEY = "recovery-agent-audit-log";
const MAX_RECORDS = 200; // bound growth for a long demo session

export function loadAuditLog(): AuditLogRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditLog(records: AuditLogRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Storage full or unavailable (private browsing, etc.) - non-critical for a demo,
    // the in-memory copy still works for the rest of the session.
  }
}

export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildAuditLogRecord(params: {
  paymentId: string;
  customerName: string;
  amount: number;
  outcome: AgentOutcome;
  source: "single" | "batch";
}): AuditLogRecord {
  const { paymentId, customerName, amount, outcome, source } = params;
  return {
    id: `${paymentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    paymentId,
    customerName,
    amount,
    source,
    escalationAction: outcome.escalation.action,
    recoverabilityScore: isPrecheckStop(outcome) ? undefined : outcome.recoverabilityScore,
    entries: outcome.auditTrail,
    recordedAt: new Date().toISOString(),
  };
}
