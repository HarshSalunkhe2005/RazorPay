"use client";

import { Zap } from "lucide-react";
import { useRecoveryState } from "@/lib/recovery-state";
import { BatchRunPanel } from "@/components/dashboard/batch-run-panel";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function BatchPage() {
  const { payments, datasetVersion, handleBatchComplete, appendAuditRecords } = useRecoveryState();

  return (
    <div>
      <SectionHeader
        icon={Zap}
        title="Batch run"
        description="Runs every open case through the same pipeline at once, instead of working through them one at a time."
        accent="accent"
      />
      <BatchRunPanel
        key={datasetVersion}
        payments={payments}
        onBatchComplete={handleBatchComplete}
        onAuditLogAppend={appendAuditRecords}
      />
    </div>
  );
}
