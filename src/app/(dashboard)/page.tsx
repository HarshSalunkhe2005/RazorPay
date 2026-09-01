"use client";

import { Inbox } from "lucide-react";
import { useRecoveryState } from "@/lib/recovery-state";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PipelineFlow } from "@/components/dashboard/pipeline-flow";
import { DatasetUpload } from "@/components/dashboard/dataset-upload";
import { PaymentsTable } from "@/components/dashboard/payments-table";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function DashboardPage() {
  const {
    payments,
    stats,
    datasetLabel,
    datasetVersion,
    isSample,
    handleStatusChange,
    appendAuditRecords,
    handleDatasetReplace,
    handleDatasetReset,
  } = useRecoveryState();

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
      <div>
        <SectionHeader icon={Inbox} title="Recovery queue" accent="primary" />
        <PaymentsTable
          key={datasetVersion}
          payments={payments}
          onStatusChange={handleStatusChange}
          onAuditLogAppend={appendAuditRecords}
        />
      </div>
    </div>
  );
}
