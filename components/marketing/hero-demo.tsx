/**
 * The homepage's live "groundedness" demo: a visitor question appears,
 * two source chips light up, animated lines draw from each chip to the
 * forming answer, then the answer and its citation fade in. One shared
 * 9s CSS animation cycle (see app/globals.css's .hero-anim / hero-*
 * keyframes) — no JavaScript timers, no video file. Every element's
 * animation-delay is chosen so the full sequence completes with time
 * to read the held end state before it loops.
 */
export function HeroDemo() {
  return (
    <div className="relative mx-auto mt-10 w-full max-w-md rounded-2xl border border-mist bg-surface p-5 shadow-sm">
      {/* Visitor question */}
      <div
        className="hero-anim mb-4 ml-auto w-fit rounded-2xl rounded-br-sm bg-mist px-3 py-2 text-sm text-ink"
        style={{ animationName: "hero-fade-rise", animationDelay: "0s" }}
      >
        Do you ship to Canada?
      </div>

      {/* Source chips */}
      <div className="relative mb-4 flex gap-2">
        <span
          className="hero-anim rounded-full border border-signal/40 bg-signal/10 px-2.5 py-1 text-xs text-ink"
          style={{ animationName: "hero-chip-in", animationDelay: "0.9s" }}
        >
          Shipping FAQ.pdf
        </span>
        <span
          className="hero-anim rounded-full border border-signal/40 bg-signal/10 px-2.5 py-1 text-xs text-ink"
          style={{ animationName: "hero-chip-in", animationDelay: "1.3s" }}
        >
          Return Policy
        </span>
      </div>

      {/* Connecting lines, drawn from each chip down to the answer */}
      <svg
        viewBox="0 0 300 40"
        className="pointer-events-none absolute left-5 right-5 top-[92px] h-10 w-[calc(100%-40px)]"
        aria-hidden="true"
      >
        <path
          d="M40 0 C 40 20, 150 15, 150 38"
          fill="none"
          stroke="#C3F53C"
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray="1"
          className="hero-anim"
          style={{ animationName: "hero-line-draw", animationDelay: "2.1s" }}
        />
        <path
          d="M140 0 C 140 20, 160 15, 165 38"
          fill="none"
          stroke="#C3F53C"
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray="1"
          className="hero-anim"
          style={{ animationName: "hero-line-draw", animationDelay: "2.4s" }}
        />
      </svg>

      {/* Answer + citation */}
      <div
        className="hero-anim rounded-2xl rounded-bl-sm bg-paper px-3 py-2.5 text-sm text-ink"
        style={{ animationName: "hero-answer-in", animationDelay: "3.3s" }}
      >
        <p className="mb-1.5">
          Yes — we ship to Canada, typically 5&ndash;8 business days. Returns are
          free within 30 days.
        </p>
        <p
          className="hero-anim text-xs text-slate"
          style={{ animationName: "hero-answer-in", animationDelay: "4.2s" }}
        >
          Sources: Shipping FAQ.pdf, Return Policy
        </p>
      </div>
    </div>
  );
}
