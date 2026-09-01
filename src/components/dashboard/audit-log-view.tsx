"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditLogRecord, EscalationAction } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AuditTrendChart } from "./audit-trend-chart";

const ACTION_META: Record<EscalationAction, { label: string; className: string }> = {
  proceed: { label: "Proceeded", className: "text-primary" },
  escalate_human_review: { label: "Escalated", className: "text-escalated" },
  stop_write_off: { label: "Write-off", className: "text-orange-500" },
  agent_error: { label: "Failed", className: "text-destructive" },
};

interface AuditLogViewProps {
  records: AuditLogRecord[];
  onClear: () => void;
}

function RecordRow({ record }: { record: AuditLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[record.escalationAction];

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
      >
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            record.source === "batch"
              ? "bg-accent/15 text-accent"
              : "bg-primary/15 text-primary"
          )}
        >
          {record.source}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {record.customerName}
        </span>
        <span className="hidden shrink-0 font-figures text-xs text-muted-foreground sm:inline">
          {formatINR(record.amount)}
        </span>
        <span className={cn("shrink-0 text-xs font-medium", meta.className)}>{meta.label}</span>
        {record.recoverabilityScore !== undefined && (
          <span className="hidden shrink-0 font-figures text-xs text-muted-foreground md:inline">
            {record.recoverabilityScore}/100
          </span>
        )}
        <span className="shrink-0 text-xs text-muted-foreground/70">
          {new Date(record.recordedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="shrink-0 text-muted-foreground/50">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <ol className="space-y-2 border-l border-border/60 px-4 pb-4 pl-8">
          {record.entries.map((entry, i) => (
            <li key={i} className="relative text-xs">
              <span
                className={cn(
                  "absolute -left-[17px] top-1 h-1.5 w-1.5 rounded-full",
                  entry.actor === "agent" ? "bg-primary" : "bg-accent"
                )}
              />
              <span className="font-medium text-foreground">{entry.action}</span>
              <span className="ml-1.5 text-muted-foreground/70">
                · {entry.actor === "agent" ? "agent" : "governance layer"}
              </span>
              <p className="mt-0.5 text-muted-foreground">{entry.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function useBreakdown(records: AuditLogRecord[]) {
  return useMemo(() => {
    const counts: Record<EscalationAction, number> = {
      proceed: 0,
      escalate_human_review: 0,
      stop_write_off: 0,
      agent_error: 0,
    };
    for (const r of records) counts[r.escalationAction]++;
    return counts;
  }, [records]);
}

export function AuditLogView({ records, onClear }: AuditLogViewProps) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<EscalationAction | "all">("all");
  const breakdown = useBreakdown(records);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => actionFilter === "all" || r.escalationAction === actionFilter)
      .filter((r) => q.length === 0 || r.customerName.toLowerCase().includes(q))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [records, query, actionFilter]);

  return (
    <div className="space-y-4">
      {records.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BreakdownTile label="Proceeded" value={breakdown.proceed} className="text-primary" />
          <BreakdownTile label="Escalated" value={breakdown.escalate_human_review} className="text-escalated" />
          <BreakdownTile label="Write-off" value={breakdown.stop_write_off} className="text-orange-500" />
          <BreakdownTile label="Failed" value={breakdown.agent_error} className="text-destructive" />
        </div>
      )}

      <AuditTrendChart records={records} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search customer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as EscalationAction | "all")}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dispositions</SelectItem>
              <SelectItem value="proceed">Proceeded</SelectItem>
              <SelectItem value="escalate_human_review">Escalated</SelectItem>
              <SelectItem value="stop_write_off">Write-off</SelectItem>
              <SelectItem value="agent_error">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {records.length} run{records.length === 1 ? "" : "s"} logged · saved in this browser
          </p>
          {records.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
              Clear log
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {records.length === 0
              ? "No runs yet. Every single-case or batch run appears here automatically, and persists across page reloads."
              : "No log entries match this filter."}
          </p>
        ) : (
          filtered.map((record) => <RecordRow key={record.id} record={record} />)
        )}
      </div>
    </div>
  );
}

function BreakdownTile({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="neu-tile rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 font-figures text-xl font-semibold tabular-nums", className)}>{value}</p>
    </div>
  );
}
