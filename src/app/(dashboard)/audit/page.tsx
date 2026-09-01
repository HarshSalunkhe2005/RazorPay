"use client";

import { ScrollText } from "lucide-react";
import { useRecoveryState } from "@/lib/recovery-state";
import { AuditLogView } from "@/components/dashboard/audit-log-view";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function AuditPage() {
  const { auditLog, handleClearAuditLog } = useRecoveryState();

  return (
    <div>
      <SectionHeader
        icon={ScrollText}
        title="Audit log"
        description="Every governed decision, single-case or batch, persisted across reloads — the record of truth, not the dialog you happened to leave open."
        accent="success"
      />
      <AuditLogView records={auditLog} onClear={handleClearAuditLog} />
    </div>
  );
}
