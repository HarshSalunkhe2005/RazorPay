"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FailedPayment } from "@/lib/types";
import { parseDatasetFile, SAMPLE_CSV } from "@/lib/dataset-import";

interface DatasetUploadProps {
  onReplace: (payments: FailedPayment[], sourceLabel: string) => void;
  onReset: () => void;
  isSample: boolean;
  currentLabel: string;
}

export function DatasetUpload({ onReplace, onReset, isSample, currentLabel }: DatasetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="flex flex-wrap items-center gap-3">
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
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        <Upload /> {busy ? "Loading…" : "Upload dataset"}
      </Button>
      {!isSample && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
          <RotateCcw /> Reset to sample
        </Button>
      )}
      <button
        type="button"
        onClick={downloadSample}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <Download className="size-3" /> Sample CSV format
      </button>
      <span className="text-xs text-muted-foreground/70">· {currentLabel}</span>
    </div>
  );
}
