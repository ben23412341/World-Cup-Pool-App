"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl text-text">Something went wrong</h1>
      <p className="mt-4 max-w-sm text-base text-text-muted">
        An unexpected error occurred. You can try again or head back home.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-primary px-6 py-3 text-base font-medium text-text transition-colors hover:bg-primary-bright"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-6 py-3 text-base font-medium text-text-muted transition-colors hover:text-text"
        >
          Go home
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-text-subtle">
          Error reference: <code className="text-text-subtle">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
