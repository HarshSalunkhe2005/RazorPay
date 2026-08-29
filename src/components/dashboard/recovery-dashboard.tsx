"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, Zap, ScrollText, Workflow } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FailedPayment, PaymentStatus, AuditLogRecord } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { loadAuditLog, saveAuditLog, clearAuditLog } from "@/lib/audit-log";
import { StatCards } from "./stat-cards";
import { PaymentsTable } from "./payments-table";
import { BatchRunPanel } from "./batch-run-panel";
import { ArchitectureView } from "./architecture-view";
import { AuditLogView } from "./audit-log-view";
import { PipelineFlow } from "./pipeline-flow";
import { DatasetUpload } from "./dataset-upload";
import { SectionHeader } from "./section-header";

const PANEL_ANIMATION = "animate-in fade-in-0 slide-in-from-bottom-2 duration-300";

export function RecoveryDashboard({ initialPayments }: { initialPayments: FailedPayment[] }) {
  const [payments, setPayments] = useState<FailedPayment[]>(initialPayments);
  const [auditLog, setAuditLog] = useState<AuditLogRecord[]>([]);
  const [datasetLabel, setDatasetLabel] = useState(`${initialPayments.length} sample cases`);
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

  function handleDatasetReplace(next: FailedPayment[], sourceLabel: string) {
    setPayments(next);
    setDatasetLabel(`${next.length} case${next.length === 1 ? "" : "s"} from ${sourceLabel}`);
    setIsSample(false);
    setDatasetVersion((v) => v + 1);
  }

  function handleDatasetReset() {
    setPayments(initialPayments);
    setDatasetLabel(`${initialPayments.length} sample cases`);
    setIsSample(true);
    setDatasetVersion((v) => v + 1);
  }

  return (
    <div className="space-y-6">
      <StatCards stats={stats} />

      <PipelineFlow />

      <DatasetUpload
        onReplace={handleDatasetReplace}
        onReset={handleDatasetReset}
        isSample={isSample}
        currentLabel={datasetLabel}
      />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Recovery queue</TabsTrigger>
          <TabsTrigger value="batch">Batch run</TabsTrigger>
          <TabsTrigger value="audit">
            Audit log{auditLog.length > 0 && ` (${auditLog.length})`}
          </TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className={`mt-5 ${PANEL_ANIMATION}`}>
          <SectionHeader
            icon={Inbox}
            title="Recovery queue"
            description="Every failed payment, searchable and filterable. Run the agent per case, or work through them one at a time."
            accent="primary"
          />
          <PaymentsTable
            key={datasetVersion}
            payments={payments}
            onStatusChange={handleStatusChange}
            onAuditLogAppend={appendAuditRecords}
          />
        </TabsContent>

        <TabsContent value="batch" className={`mt-5 ${PANEL_ANIMATION}`}>
          <SectionHeader
            icon={Zap}
            title="Batch run"
            description="Process every open case through the same governed pipeline at once, bounded concurrency, aggregate metrics."
            accent="accent"
          />
          <BatchRunPanel
            key={datasetVersion}
            payments={payments}
            onBatchComplete={handleBatchComplete}
            onAuditLogAppend={appendAuditRecords}
          />
        </TabsContent>

        <TabsContent value="audit" className={`mt-5 ${PANEL_ANIMATION}`}>
          <SectionHeader
            icon={ScrollText}
            title="Audit log"
            description="Every governed decision, single-case or batch, persisted across reloads — the record of truth, not the dialog you happened to leave open."
            accent="success"
          />
          <AuditLogView records={auditLog} onClear={handleClearAuditLog} />
        </TabsContent>

        <TabsContent value="architecture" className={`mt-5 ${PANEL_ANIMATION}`}>
          <SectionHeader
            icon={Workflow}
            title="Architecture"
            description="Why this is a governed pipeline instead of a single prompt, and what's still ahead."
            accent="neutral"
          />
          <ArchitectureView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
