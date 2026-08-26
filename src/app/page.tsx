import { failedPayments } from "@/lib/mock-data";
import { RecoveryDashboard } from "@/components/dashboard/recovery-dashboard";

export default function Home() {
  return (
    <main className="bg-mesh min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Razorpay AI Buildathon · Revenue Recovery
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Recovery <span className="text-gradient-brand">Agent</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Diagnoses every failed payment, then autonomously drafts a personalized win-back
              flow — channel, timing, and incentive — instead of a generic retry email.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-figures text-sm font-bold text-primary-foreground shadow-lg sm:h-12 sm:w-12 sm:text-base">
            RA
          </div>
        </header>

        <RecoveryDashboard initialPayments={failedPayments} />
      </div>
    </main>
  );
}
