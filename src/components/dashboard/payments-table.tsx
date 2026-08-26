"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FailedPayment, AgentOutcome, PaymentStatus, AuditLogRecord, isPrecheckStop } from "@/lib/types";
import { formatINR, formatDate, failureReasonLabel, initials } from "@/lib/format";
import { buildAuditLogRecord } from "@/lib/audit-log";
import { StatusBadge } from "./status-badge";
import { AgentTraceDialog } from "./agent-trace-dialog";
import { cn } from "@/lib/utils";

interface PaymentsTableProps {
  payments: FailedPayment[];
  onStatusChange: (paymentId: string, status: FailedPayment["status"]) => void;
  onAuditLogAppend: (records: AuditLogRecord[]) => void;
}

const RESOLVED_STATUSES: PaymentStatus[] = ["recovered", "lost", "escalated", "write_off"];
const STATUS_FILTERS: { value: PaymentStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "failed", label: "Failed" },
  { value: "in_progress", label: "Agent running" },
  { value: "contacted", label: "Contacted" },
  { value: "recovered", label: "Recovered" },
  { value: "escalated", label: "Escalated" },
  { value: "write_off", label: "Write-off" },
  { value: "lost", label: "Lost" },
];

export function PaymentsTable({ payments, onStatusChange, onAuditLogAppend }: PaymentsTableProps) {
  const [activePayment, setActivePayment] = useState<FailedPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, AgentOutcome>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        p.customerName.toLowerCase().includes(q) ||
        p.customerEmail.toLowerCase().includes(q) ||
        p.planName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [payments, query, statusFilter]);

  function handleRun(payment: FailedPayment) {
    setActivePayment(payment);
    setDialogOpen(true);
    if (payment.status === "failed") {
      onStatusChange(payment.id, "in_progress");
    }
  }

  function handleComplete(paymentId: string, outcome: AgentOutcome) {
    setOutcomes((prev) => ({ ...prev, [paymentId]: outcome }));
    const nextStatus: PaymentStatus = isPrecheckStop(outcome)
      ? "escalated"
      : outcome.escalation.action === "stop_write_off"
        ? "write_off"
        : "contacted";
    onStatusChange(paymentId, nextStatus);

    const payment = payments.find((p) => p.id === paymentId);
    if (payment) {
      onAuditLogAppend([
        buildAuditLogRecord({
          paymentId: payment.id,
          customerName: payment.customerName,
          amount: payment.amount,
          outcome,
          source: "single",
        }),
      ]);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search customer, email, or plan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Customer</TableHead>
                <TableHead>Plan / Amount</TableHead>
                <TableHead>Failure reason</TableHead>
                <TableHead>Failed at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recovery agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No payments match this filter.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((payment) => {
                const hasResult = Boolean(outcomes[payment.id]);
                const resolved = RESOLVED_STATUSES.includes(payment.status);
                return (
                  <TableRow key={payment.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border/60">
                          <AvatarFallback className="bg-gradient-to-br from-primary/25 to-accent/25 text-xs font-medium text-foreground">
                            {initials(payment.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none text-foreground">
                            {payment.customerName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {payment.customerEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{payment.planName}</p>
                      <p className="font-figures text-sm text-muted-foreground">
                        {formatINR(payment.amount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {failureReasonLabel(payment.failureReason)}
                      </span>
                      <span className="ml-1.5 text-xs text-muted-foreground/70">
                        · attempt {payment.attemptNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.failedAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant={hasResult ? "outline" : "default"}
                          onClick={() => handleRun(payment)}
                          className={cn(!hasResult && "shadow-sm")}
                        >
                          {hasResult ? "View plan" : "Run agent"}
                        </Button>
                        {payment.status === "contacted" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-success hover:text-success"
                              onClick={() => onStatusChange(payment.id, "recovered")}
                            >
                              Recovered
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => onStatusChange(payment.id, "lost")}
                            >
                              Lost
                            </Button>
                          </>
                        )}
                        {resolved && payment.status !== "recovered" && payment.status !== "lost" && (
                          <span className="text-xs text-muted-foreground">closed by policy</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AgentTraceDialog
        payment={activePayment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onComplete={handleComplete}
      />
    </>
  );
}
