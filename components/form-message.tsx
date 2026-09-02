export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        error
          ? "rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-ink"
          : "rounded-lg border border-success-border bg-success-soft px-4 py-3 text-sm text-ink"
      }
    >
      {error ?? success}
    </div>
  );
}
