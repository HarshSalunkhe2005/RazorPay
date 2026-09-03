import { RecoveryStateProvider } from "@/lib/recovery-state";
import { PaletteProvider } from "@/lib/palette";
import { AppNav } from "@/components/shell/app-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaletteProvider>
      <RecoveryStateProvider>
        <div className="bg-mesh min-h-screen">
          <AppNav />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        </div>
      </RecoveryStateProvider>
    </PaletteProvider>
  );
}
