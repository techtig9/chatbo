"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 font-display text-xl font-semibold text-ink">
            Something went wrong
          </h1>
          <p className="mb-4 text-sm text-slate">
            We&rsquo;ve been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
