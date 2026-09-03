"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PALETTES, PaletteId, usePalette } from "@/lib/palette";

function Swatch({ primary, accent }: { primary: string; accent: string }) {
  return (
    <span className="flex -space-x-1">
      <span className="size-2.5 rounded-full ring-1 ring-background" style={{ backgroundColor: primary }} />
      <span className="size-2.5 rounded-full ring-1 ring-background" style={{ backgroundColor: accent }} />
    </span>
  );
}

export function PalettePicker() {
  const { palette, setPalette } = usePalette();

  return (
    <Select value={palette} onValueChange={(v) => setPalette(v as PaletteId)}>
      <SelectTrigger size="sm" aria-label="Choose color palette">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PALETTES.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <Swatch primary={p.swatchPrimary} accent={p.swatchAccent} />
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
