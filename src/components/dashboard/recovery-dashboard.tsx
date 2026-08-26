"use client";

import { useMemo, useState } from "react";
import { FailedPayment } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { StatCards } from "./stat-cards";
import { PaymentsTable } from "./payments-table";

export function RecoveryDashboard({ initialPayments }: { initialPayments: FailedPayment[] }) {
  const [payments, setPayments] = useState<FailedPayment[]>(initialPayments);
  const stats = useMemo(() => computeStats(payments), [payments]);

  function handleStatusChange(paymentId: string, status: FailedPayment["status"]) {
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status } : p)));
  }

  return (
    <div className="space-y-6">
      <StatCards stats={stats} />
      <PaymentsTable payments={payments} onStatusChange={handleStatusChange} />
    </div>
  );
}
