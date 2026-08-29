import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-mesh flex min-h-screen items-center justify-center px-4">
      <div className="neu-tile max-w-sm rounded-2xl p-8 text-center">
        <p className="font-figures text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This route doesn&rsquo;t exist. The Recovery Agent dashboard lives at the root.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
