"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FailedPayment, PaymentStatus } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { StatCards } from "./stat-cards";
import { PaymentsTable } from "./payments-table";
import { BatchRunPanel } from "./batch-run-panel";
import { ArchitectureView } from "./architecture-view";

export function RecoveryDashboard({ initialPayments }: { initialPayments: FailedPayment[] }) {
  const [payments, setPayments] = useState<FailedPayment[]>(initialPayments);
  const stats = useMemo(() => computeStats(payments), [payments]);

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
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <PaymentsTable payments={payments} onStatusChange={handleStatusChange} />
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <BatchRunPanel payments={payments} onBatchComplete={handleBatchComplete} />
        </TabsContent>

        <TabsContent value="architecture" className="mt-4">
          <ArchitectureView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
