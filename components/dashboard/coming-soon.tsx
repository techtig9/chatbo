export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        {title}
      </h1>
      <p className="mb-6 text-sm text-slate">{description}</p>
      <div className="rounded-xl border border-dashed border-mist bg-surface p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-ink">
          {phase}
        </p>
        <p className="mt-2 text-sm text-slate">
          This screen is part of the build sequence, not yet reached.
        </p>
      </div>
    </main>
  );
}
