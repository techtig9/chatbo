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
          ? "rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-ink"
          : "rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-ink"
      }
    >
      {error ?? success}
    </div>
  );
}
