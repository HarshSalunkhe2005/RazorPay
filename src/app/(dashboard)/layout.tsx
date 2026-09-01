import { RecoveryStateProvider } from "@/lib/recovery-state";
import { AppNav } from "@/components/shell/app-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecoveryStateProvider>
      <div className="bg-mesh min-h-screen">
        <AppNav />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </RecoveryStateProvider>
  );
}
