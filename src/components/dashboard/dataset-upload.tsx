"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FailedPayment } from "@/lib/types";
import { parseDatasetFile, SAMPLE_CSV } from "@/lib/dataset-import";
import { cn } from "@/lib/utils";

interface DatasetUploadProps {
  onReplace: (payments: FailedPayment[], sourceLabel: string) => void;
  onReset: () => void;
  isSample: boolean;
  currentLabel: string;
}

export function DatasetUpload({ onReplace, onReset, isSample, currentLabel }: DatasetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const { payments, errors } = parseDatasetFile(file.name, text);

      if (payments.length === 0) {
        toast.error("No valid rows found", {
          description: errors[0] ?? "Check the file matches the expected columns.",
        });
        return;
      }

      onReplace(payments, file.name);

      if (errors.length > 0) {
        toast.warning(
          `Loaded ${payments.length} case${payments.length === 1 ? "" : "s"}, skipped ${errors.length}`,
          { description: errors.slice(0, 2).join(" · ") }
        );
      } else {
        toast.success(`Loaded ${payments.length} case${payments.length === 1 ? "" : "s"} from ${file.name}`);
      }
    } catch (err) {
      toast.error("Couldn't read that file", {
        description: err instanceof Error ? err.message : "Make sure it's valid CSV or JSON.",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-agent-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={cn(
        "neu-tile relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-colors",
        dragActive ? "border-primary/60 bg-primary/5" : "border-border/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <UploadCloud className="size-5" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {busy ? "Reading file…" : "Drop a CSV or JSON file to run your own cases"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Runs through the same governed pipeline as the sample data. Currently loaded: {currentLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            Browse file
          </Button>
          {!isSample && (
            <Button variant="outline" size="sm" onClick={onReset} className="text-muted-foreground">
              <RotateCcw /> Reset
            </Button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={downloadSample}
        className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <Download className="size-3" /> Download sample CSV format
      </button>
    </div>
  );
}
