"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FailedPayment, PaymentStatus, AuditLogRecord } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { loadAuditLog, saveAuditLog, clearAuditLog } from "@/lib/audit-log";
import { StatCards } from "./stat-cards";
import { PaymentsTable } from "./payments-table";
import { BatchRunPanel } from "./batch-run-panel";
import { ArchitectureView } from "./architecture-view";
import { AuditLogView } from "./audit-log-view";

export function RecoveryDashboard({ initialPayments }: { initialPayments: FailedPayment[] }) {
  const [payments, setPayments] = useState<FailedPayment[]>(initialPayments);
  const [auditLog, setAuditLog] = useState<AuditLogRecord[]>([]);
  const stats = useMemo(() => computeStats(payments), [payments]);

  // Loaded client-side only, after mount, so the server-rendered HTML (always empty)
  // matches the first client render - avoids a hydration mismatch - then hydrates from
  // localStorage right after. Deferred to a microtask (not called synchronously in the
  // effect body) to keep this a single, non-cascading update.
  useEffect(() => {
    Promise.resolve().then(() => setAuditLog(loadAuditLog()));
  }, []);

  function appendAuditRecords(records: AuditLogRecord[]) {
    setAuditLog((prev) => {
      const next = [...records, ...prev];
      saveAuditLog(next);
      return next;
    });
  }

  function handleClearAuditLog() {
    clearAuditLog();
    setAuditLog([]);
  }

  function handleStatusChange(paymentId: string, status: PaymentStatus) {
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status } : p)));
  }

  function handleBatchComplete(updates: { paymentId: string; status: PaymentStatus }[]) {
    setPayments((prev) => {
      const map = new Map(updates.map((u) => [u.paymentId, u.status]));
      return prev.map((p) => (map.has(p.id) ? { ...p, status: map.get(p.id)! } : p));
    });
  }

  return (
    <div className="space-y-6">
      <StatCards stats={stats} />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Recovery queue</TabsTrigger>
          <TabsTrigger value="batch">Batch run</TabsTrigger>
          <TabsTrigger value="audit">
            Audit log{auditLog.length > 0 && ` (${auditLog.length})`}
          </TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <PaymentsTable
            payments={payments}
            onStatusChange={handleStatusChange}
            onAuditLogAppend={appendAuditRecords}
          />
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <BatchRunPanel
            payments={payments}
            onBatchComplete={handleBatchComplete}
            onAuditLogAppend={appendAuditRecords}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogView records={auditLog} onClear={handleClearAuditLog} />
        </TabsContent>

        <TabsContent value="architecture" className="mt-4">
          <ArchitectureView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
