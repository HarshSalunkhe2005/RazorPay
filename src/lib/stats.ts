import { FailedPayment } from "./types";

export interface DashboardStats {
  totalCount: number;
  totalAmount: number;
  failedCount: number;
  contactedCount: number;
  recoveredCount: number;
  recoveredAmount: number;
  lostCount: number;
  lostAmount: number;
  escalatedCount: number;
  writeOffCount: number;
  writeOffAmount: number;
  recoveryRate: number; // % of (recovered + lost) resolved payments that were recovered
}

export function computeStats(payments: FailedPayment[]): DashboardStats {
  const totalCount = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  const failedCount = payments.filter((p) => p.status === "failed").length;
  const contactedCount = payments.filter(
    (p) => p.status === "contacted" || p.status === "in_progress"
  ).length;

  const recovered = payments.filter((p) => p.status === "recovered");
  const recoveredCount = recovered.length;
  const recoveredAmount = recovered.reduce((sum, p) => sum + p.amount, 0);

  const lost = payments.filter((p) => p.status === "lost");
  const lostCount = lost.length;
  const lostAmount = lost.reduce((sum, p) => sum + p.amount, 0);

  const escalatedCount = payments.filter((p) => p.status === "escalated").length;

  const writeOff = payments.filter((p) => p.status === "write_off");
  const writeOffCount = writeOff.length;
  const writeOffAmount = writeOff.reduce((sum, p) => sum + p.amount, 0);

  const resolved = recoveredCount + lostCount;
  const recoveryRate = resolved === 0 ? 0 : Math.round((recoveredCount / resolved) * 100);

  return {
    totalCount,
    totalAmount,
    failedCount,
    contactedCount,
    recoveredCount,
    recoveredAmount,
    lostCount,
    lostAmount,
    escalatedCount,
    writeOffCount,
    writeOffAmount,
    recoveryRate,
  };
}
