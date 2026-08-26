import { DashboardStats } from "@/lib/stats";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

function MiniStat({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "success" | "destructive" | "default";
}) {
  return (
    <div className="neu-tile rounded-2xl p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p
        className={cn(
          "mt-2 font-figures text-2xl font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          (!tone || tone === "default") && "text-foreground"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function StatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
      {/* Hero tile - largest visual weight, glowing gradient number */}
      <div className="neu-tile glow-ring relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,oklch(0.63_0.19_258_/_22%),transparent_70%)]"
        />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Revenue recovered
        </p>
        <p className="mt-3 font-figures text-4xl font-semibold tabular-nums text-gradient-brand sm:text-5xl">
          {formatINR(stats.recoveredAmount)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            <span className="font-figures font-medium text-foreground">
              {stats.recoveredCount}
            </span>{" "}
            payments won back
          </span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>
            <span className="font-figures font-medium text-foreground">
              {stats.recoveryRate}%
            </span>{" "}
            recovery rate
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MiniStat
          title="At-risk revenue"
          value={formatINR(stats.totalAmount)}
          sub={`${stats.totalCount} events`}
        />
        <MiniStat
          title="Being worked"
          value={String(stats.contactedCount + stats.failedCount)}
          sub="failed + contacted"
        />
        <MiniStat
          title="Escalated"
          value={String(stats.escalatedCount)}
          sub="max-attempts stopping rule"
        />
        <MiniStat
          title="Write-offs"
          value={formatINR(stats.writeOffAmount)}
          sub={`${stats.writeOffCount} below recoverability floor`}
        />
      </div>
    </div>
  );
}
