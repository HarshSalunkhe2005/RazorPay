"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="neu-tile max-w-sm rounded-2xl p-8 text-center">
        <p className="font-figures text-sm text-destructive">Error</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The dashboard hit an unexpected error. This is separate from a single case or
          batch run failing, which is handled and logged inline instead.
        </p>
        <button
          onClick={reset}
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
