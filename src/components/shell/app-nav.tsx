"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRecoveryState } from "@/lib/recovery-state";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Queue" },
  { href: "/batch", label: "Batch run" },
  { href: "/audit", label: "Audit log" },
  { href: "/architecture", label: "Architecture" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { auditLog } = useRecoveryState();
  const suffix = href === "/audit" && auditLog.length > 0 ? ` (${auditLog.length})` : "";

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {suffix}
    </Link>
  );
}

export function AppNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-figures text-xs font-bold text-primary-foreground shadow-sm">
            RA
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              Recovery <span className="text-gradient-brand">Agent</span>
            </p>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              Razorpay AI Buildathon · Revenue Recovery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <ThemeToggle />
      </div>
    </nav>
  );
}
