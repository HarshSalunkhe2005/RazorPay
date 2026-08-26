"use client";

import { useState } from "react";
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
import { FailedPayment, AgentResult } from "@/lib/types";
import { formatINR, formatDate, failureReasonLabel, initials } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import { AgentTraceDialog } from "./agent-trace-dialog";
import { cn } from "@/lib/utils";

interface PaymentsTableProps {
  payments: FailedPayment[];
  onStatusChange: (paymentId: string, status: FailedPayment["status"]) => void;
}

export function PaymentsTable({ payments, onStatusChange }: PaymentsTableProps) {
  const [activePayment, setActivePayment] = useState<FailedPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [results, setResults] = useState<Record<string, AgentResult>>({});

  function handleRun(payment: FailedPayment) {
    setActivePayment(payment);
    setDialogOpen(true);
    if (payment.status === "failed") {
      onStatusChange(payment.id, "in_progress");
    }
  }

  function handleComplete(paymentId: string, result: AgentResult) {
    setResults((prev) => ({ ...prev, [paymentId]: result }));
    onStatusChange(paymentId, "contacted");
  }

  return (
    <>
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
              {payments.map((payment) => {
                const hasResult = Boolean(results[payment.id]);
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
