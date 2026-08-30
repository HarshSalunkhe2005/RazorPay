"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AuditLogRecord } from "@/lib/types";

const SERIES: { key: "proceed" | "escalate_human_review" | "stop_write_off" | "agent_error"; label: string; color: string }[] = [
  { key: "proceed", label: "Proceeded", color: "var(--chart-1)" },
  { key: "escalate_human_review", label: "Escalated", color: "var(--chart-2)" },
  { key: "stop_write_off", label: "Write-off", color: "var(--chart-4)" },
  { key: "agent_error", label: "Failed", color: "var(--chart-5)" },
];

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function buildSeries(records: AuditLogRecord[]) {
  const byDay = new Map<string, Record<string, number>>();
  for (const r of records) {
    const day = dayKey(r.recordedAt);
    const bucket = byDay.get(day) ?? { proceed: 0, escalate_human_review: 0, stop_write_off: 0, agent_error: 0 };
    bucket[r.escalationAction] = (bucket[r.escalationAction] ?? 0) + 1;
    byDay.set(day, bucket);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, counts]) => ({
      day: new Date(day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      ...counts,
    }));
}

/** Governed decisions over time, by disposition - the "measured across batches, not a
 * single demo click" requirement made visual, built from the audit log's own persisted
 * history rather than a separate tracking mechanism. */
export function AuditTrendChart({ records }: { records: AuditLogRecord[] }) {
  const data = buildSeries(records);
  if (data.length < 2) return null; // a single day of data isn't a trend

  return (
    <div className="neu-tile rounded-2xl p-5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Decisions over time
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "oklch(0.66 0.02 265)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "oklch(0.66 0.02 265)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: "oklch(1 0 0 / 4%)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--popover-foreground)" }}
          />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
