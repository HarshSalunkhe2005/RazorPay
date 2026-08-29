import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  neutral: "bg-secondary text-muted-foreground",
} as const;

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: keyof typeof ACCENT_STYLES;
}

/** Small icon + title + one-liner at the top of each tab panel, so each section reads as
 * a distinct surface with its own identity rather than an interchangeable pane behind a
 * generic tab strip. */
export function SectionHeader({ icon: Icon, title, description, accent = "neutral" }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          ACCENT_STYLES[accent]
        )}
      >
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
