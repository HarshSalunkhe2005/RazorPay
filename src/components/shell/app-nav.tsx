"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecoveryState } from "@/lib/recovery-state";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { PalettePicker } from "./palette-picker";
import { Logomark } from "./logomark";

const NAV_ITEMS = [
  { href: "/", label: "Queue" },
  { href: "/batch", label: "Batch run" },
  { href: "/audit", label: "Audit log" },
  { href: "/architecture", label: "Architecture" },
] as const;

function NavLink({
  href,
  label,
  onNavigate,
  block,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  block?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { auditLog } = useRecoveryState();
  const suffix = href === "/audit" && auditLog.length > 0 ? ` (${auditLog.length})` : "";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        block && "block w-full",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {suffix}
    </Link>
  );
}

export function AppNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
            <Logomark className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-foreground">
              Rebound<span className="text-gradient-brand">AI</span>
            </p>
            <p className="hidden items-center gap-1.5 truncate text-[11px] text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              Razorpay AI Buildathon · Revenue Recovery
            </p>
          </div>
        </div>

        {/* Full nav - hidden below sm, where it doesn't reliably fit alongside the
            palette picker and theme toggle without silently scrolling a link
            off-screen with no visible affordance. */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <PalettePicker />
          <ThemeToggle />
        </div>

        {/* Mobile: compact bar, everything else behind a disclosure panel. */}
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} block onNavigate={() => setMobileOpen(false)} />
            ))}
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <PalettePicker />
          </div>
        </div>
      )}
    </nav>
  );
}
