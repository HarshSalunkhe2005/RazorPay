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
        description="Every governed decision gets logged here, whether it came from a single case or a batch run, and it survives a page reload. This is the actual record, not whatever dialog you happened to leave open."
        accent="success"
      />
      <AuditLogView records={auditLog} onClear={handleClearAuditLog} />
    </div>
  );
}
