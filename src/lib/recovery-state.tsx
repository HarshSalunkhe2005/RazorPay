"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { failedPayments } from "@/lib/mock-data";
import { FailedPayment, PaymentStatus, AuditLogRecord } from "@/lib/types";
import { computeStats, DashboardStats } from "@/lib/stats";
import { loadAuditLog, saveAuditLog, clearAuditLog } from "@/lib/audit-log";

interface RecoveryStateValue {
  payments: FailedPayment[];
  stats: DashboardStats;
  auditLog: AuditLogRecord[];
  datasetLabel: string;
  datasetVersion: number;
  isSample: boolean;
  handleStatusChange: (paymentId: string, status: PaymentStatus) => void;
  handleBatchComplete: (updates: { paymentId: string; status: PaymentStatus }[]) => void;
  appendAuditRecords: (records: AuditLogRecord[]) => void;
  handleClearAuditLog: () => void;
  handleDatasetReplace: (next: FailedPayment[], sourceLabel: string) => void;
  handleDatasetReset: () => void;
}

const RecoveryStateContext = createContext<RecoveryStateValue | null>(null);

/** Owns all app state above the route outlet (mounted from the (dashboard) layout, not
 * any individual page) so it survives client-side navigation between routes instead of
 * resetting every time the matched page component changes. */
export function RecoveryStateProvider({ children }: { children: React.ReactNode }) {
  const [payments, setPayments] = useState<FailedPayment[]>(failedPayments);
  const [auditLog, setAuditLog] = useState<AuditLogRecord[]>([]);
  const [datasetLabel, setDatasetLabel] = useState(`${failedPayments.length} sample cases`);
  const [datasetVersion, setDatasetVersion] = useState(0);
  const [isSample, setIsSample] = useState(true);
  const stats = useMemo(() => computeStats(payments), [payments]);

  // Loaded client-side only, after mount, so the server-rendered HTML (always empty)
  // matches the first client render - avoids a hydration mismatch - then hydrates from
  // localStorage right after. Deferred to a microtask (not called synchronously in the
  // effect body) to keep this a single, non-cascading update.
  useEffect(() => {
    Promise.resolve().then(() => setAuditLog(loadAuditLog()));
  }, []);

  const appendAuditRecords = useCallback((records: AuditLogRecord[]) => {
    setAuditLog((prev) => {
      const next = [...records, ...prev];
      saveAuditLog(next);
      return next;
    });
  }, []);

  const handleClearAuditLog = useCallback(() => {
    clearAuditLog();
    setAuditLog([]);
  }, []);

  const handleStatusChange = useCallback((paymentId: string, status: PaymentStatus) => {
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status } : p)));
  }, []);

  const handleBatchComplete = useCallback((updates: { paymentId: string; status: PaymentStatus }[]) => {
    setPayments((prev) => {
      const map = new Map(updates.map((u) => [u.paymentId, u.status]));
      return prev.map((p) => (map.has(p.id) ? { ...p, status: map.get(p.id)! } : p));
    });
  }, []);

  const handleDatasetReplace = useCallback((next: FailedPayment[], sourceLabel: string) => {
    setPayments(next);
    setDatasetLabel(`${next.length} case${next.length === 1 ? "" : "s"} from ${sourceLabel}`);
    setIsSample(false);
    setDatasetVersion((v) => v + 1);
  }, []);

  const handleDatasetReset = useCallback(() => {
    setPayments(failedPayments);
    setDatasetLabel(`${failedPayments.length} sample cases`);
    setIsSample(true);
    setDatasetVersion((v) => v + 1);
  }, []);

  // Memoized so a change to one piece of state (e.g. a payment status flip) doesn't
  // force every consumer to re-render - AppNav is now mounted on every route (unlike
  // before this session's routing migration), so an unmemoized value here would
  // re-render the whole nav bar on state changes it never reads. The handlers above are
  // all useCallback'd with stable (setter-only) dependencies specifically so they don't
  // defeat this memoization by changing identity every render.
  const value: RecoveryStateValue = useMemo(
    () => ({
      payments,
      stats,
      auditLog,
      datasetLabel,
      datasetVersion,
      isSample,
      handleStatusChange,
      handleBatchComplete,
      appendAuditRecords,
      handleClearAuditLog,
      handleDatasetReplace,
      handleDatasetReset,
    }),
    [
      payments,
      stats,
      auditLog,
      datasetLabel,
      datasetVersion,
      isSample,
      handleStatusChange,
      handleBatchComplete,
      appendAuditRecords,
      handleClearAuditLog,
      handleDatasetReplace,
      handleDatasetReset,
    ]
  );

  return <RecoveryStateContext.Provider value={value}>{children}</RecoveryStateContext.Provider>;
}

export function useRecoveryState() {
  const ctx = useContext(RecoveryStateContext);
  if (!ctx) throw new Error("useRecoveryState must be used within RecoveryStateProvider");
  return ctx;
}
