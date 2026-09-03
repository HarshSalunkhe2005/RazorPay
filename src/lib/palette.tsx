"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const PALETTES = [
  {
    id: "amber",
    label: "Amber & Teal",
    swatchPrimary: "oklch(0.62 0.16 85)",
    swatchAccent: "oklch(0.42 0.09 195)",
  },
  {
    id: "emerald",
    label: "Emerald & Lime",
    swatchPrimary: "oklch(0.5 0.15 155)",
    swatchAccent: "oklch(0.55 0.17 125)",
  },
  {
    id: "coral",
    label: "Coral & Slate",
    swatchPrimary: "oklch(0.6 0.19 35)",
    swatchAccent: "oklch(0.42 0.03 250)",
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
export const DEFAULT_PALETTE: PaletteId = "amber";
export const PALETTE_STORAGE_KEY = "recovery-agent-palette";

function isPaletteId(value: string | null): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

interface PaletteContextValue {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

/** Applies the brand-color palette independently of light/dark mode (see globals.css's
 * [data-palette] blocks) - a second axis next-themes doesn't manage, so this owns its
 * own tiny localStorage-backed state instead of trying to bolt onto ThemeProvider. The
 * blocking inline script in app/layout.tsx sets the attribute before first paint (same
 * reasoning as next-themes' own script); this provider just keeps React's state in sync
 * with it after hydration. */
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
      if (isPaletteId(stored)) setPaletteState(stored);
    });
  }, []);

  function setPalette(id: PaletteId) {
    setPaletteState(id);
    document.documentElement.dataset.palette = id;
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
      // Storage full or unavailable (private browsing, etc.) - non-critical, the
      // in-memory choice still applies for the rest of the session.
    }
  }

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider");
  return ctx;
}
