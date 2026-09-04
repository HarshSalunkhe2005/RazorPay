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
        description="How the pipeline is governed, why it isn't just one prompt, and what's still left to build."
        accent="neutral"
      />
      <ArchitectureView />
    </div>
  );
}
