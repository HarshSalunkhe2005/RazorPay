"use client";

import { Workflow } from "lucide-react";
import { ArchitectureView } from "@/components/dashboard/architecture-view";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function ArchitecturePage() {
  return (
    <div>
      <SectionHeader
        icon={Workflow}
        title="Architecture"
        description="Why this is a governed pipeline instead of a single prompt, and what's still ahead."
        accent="neutral"
      />
      <ArchitectureView />
    </div>
  );
}
