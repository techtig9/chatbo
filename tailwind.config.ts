import type { Config } from "tailwindcss";

// Chatbo design-token system — Figma-reference light SaaS direction
// (warm off-white base, near-black text, vivid lime-green primary
// accent, a muted blue kept as secondary/chart accent). Migrated from
// the prior dark-navy/violet system by redefining what each of the
// original 6 semantic tokens (paper/ink/slate/mist/signal/ember) points
// to, plus the 4 added later (surface/elevated/muted/accent2/success/
// danger) — every one of these is used as a semantic name (a
// background, primary text, secondary text, a border, "the brand/
// primary-accent color") across 1,700+ places, never a literal color
// name, so redefining the values here is what makes this an app-wide
// theme change instead of a per-page rewrite. See docs/design-system.md
// for the full rationale.
//
// A dark variant remains a documented, supported direction per the
// Figma reference, but the doc's own Appendix A is explicit that ONE
// primary production theme should ship — light + black + lime — rather
// than building a full theme-switcher, which was out of scope here.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds — 3-tier elevation (page / card / hover-dropdown)
        paper: "#FAFAF7",
        surface: "#FFFFFF",
        elevated: "#F1F1EA",
        // Text — 3-tier emphasis
        ink: "#0C0D09",
        slate: "#5B5D51",
        muted: "#8C8E7F",
        // Border — thin, low-contrast, warm-neutral
        mist: "#E6E6DC",
        // Primary accent — vivid lime/chartreuse: CTAs, active nav,
        // selected tabs, links, progress, focus states, AI highlights.
        // This is the signature accent from the Figma reference.
        signal: "#C3F53C",
        // Text-safe variant of signal — bright lime as *text color* on a
        // light background fails WCAG badly (~1.2:1, nowhere near the
        // 4.5:1 normal-text minimum — verified with this file's own
        // contrast math). `signal` itself stays untouched because it's
        // correct and matches the reference everywhere it's used as a
        // background/border/fill (badges, buttons, active states all
        // pair it with dark text already); this exists specifically for
        // the eyebrow-label/link/icon-on-light-surface case that needs
        // to read as "the lime accent" while actually being legible.
        "signal-ink": "#4F6B08",
        // Secondary accent — kept as a muted blue for charts, secondary
        // actions and informational states. The reference names purple
        // only as an *optional* alternate theme ("do not use random
        // purple/cyan gradients throughout") — this is deliberately a
        // reserved, secondary role now, not a co-equal brand color.
        accent2: "#3B66D6",
        // Semantic status — success shifted to a standard green
        // distinct from the now-lime signal (both being "green" would
        // collide); darkened slightly further than the first pass at
        // this token to genuinely clear 4.5:1 against white (measured
        // 4.17:1 originally — failed the normal-text threshold, not
        // just close to it). Warning/danger were already re-tuned
        // correctly for light-surface contrast in that same pass.
        success: "#0F7A38",
        ember: "#C2670A",
        danger: "#D33232",
        // Pre-blended status tints. These are what `bg-danger/10` resolves
        // to *over the paper ground* — computed once, at 10% (borders 30%,
        // danger-hover 20%). Two reasons they exist as real tokens rather
        // than staying alpha modifiers: an alpha fill composites against
        // whatever is behind it, so the same `/10` reads differently on
        // paper vs. inside an `elevated` panel; and Figma's
        // setBoundVariableForPaint discards paint opacity outright, so an
        // alpha-based tint cannot round-trip into the design file at all.
        // Existing `bg-x/10` call sites still work — these are additive.
        "danger-soft": "#F6E6E3",
        "danger-hover": "#F2D2CF",
        "danger-border": "#EEBEBC",
        "success-soft": "#E2EDE4",
        "success-border": "#B4D4BE",
        "warning-soft": "#F4EBDF",
        "warning-border": "#E9CEB0",
        "info-soft": "#E7EBF4",
        "neutral-soft": "#EAEAE6",
        "signal-soft": "#E9ECDF",
      },
      fontFamily: {
        // All three load via CDN <link> in app/layout.tsx (General
        // Sans from Fontshare, Newsreader + IBM Plex Mono from Google
        // Fonts) — literal family names are correct here since nothing
        // renames them the way next/font's self-hosting would have.
        display: ["'General Sans'", "system-ui", "sans-serif"],
        body: ["'Newsreader'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Restrained on a light surface by design — the reference's own
        // language is "subtle borders and restrained decoration" /
        // "minimal shadows", explicitly warning against neon glow
        // everywhere. A soft neutral shadow does the main lifting; the
        // lime tint is low-opacity and only meant to read as a faint
        // warmth on hover/active states, not a glow effect.
        glow: "0 1px 2px rgb(12 13 9 / 0.04), 0 8px 20px -6px rgb(12 13 9 / 0.12), 0 0 0 1px rgb(195 245 60 / 0.25)",
        "glow-sm": "0 1px 2px rgb(12 13 9 / 0.03), 0 4px 10px -3px rgb(12 13 9 / 0.10), 0 0 0 1px rgb(195 245 60 / 0.18)",
        // Elevation scale. `glow`/`glow-sm` above bundle a lime ring into
        // the shadow, which is right for a hovered accent surface but is
        // the only depth vocabulary the system had — so every raised thing
        // borrowed a lime tint whether or not it was accent-related. These
        // five are neutral and ordered, so depth can say "how far off the
        // page" independently of "is this the accent". Mirrors the
        // Elevation/* effect styles in the Figma file.
        e0: "none",
        e1: "0 1px 2px rgb(12 13 9 / 0.04)",
        e2: "0 1px 2px rgb(12 13 9 / 0.03), 0 4px 10px -3px rgb(12 13 9 / 0.10)",
        e3: "0 1px 2px rgb(12 13 9 / 0.04), 0 8px 20px -6px rgb(12 13 9 / 0.12)",
        e4: "0 2px 4px rgb(12 13 9 / 0.05), 0 16px 40px -12px rgb(12 13 9 / 0.18)",
        // Focus halo, split out from the outline it pairs with in
        // globals.css :focus-visible so it can be composed onto a node
        // that already carries an elevation.
        focus: "0 0 0 4px rgb(195 245 60 / 0.35)",
      },
      transitionDuration: {
        // Named durations for the timings that were previously written as
        // bare numbers across the config and components. The pairing with
        // intent is the point: anything a user is waiting on stays at or
        // under `base`, and `deliberate` is reserved for the two places
        // motion is the message (hero anchor-line, deploy success).
        // globals.css collapses all of these under prefers-reduced-motion.
        instant: "100ms",
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
        slower: "500ms",
        deliberate: "900ms",
      },
      backgroundImage: {
        // Primary-button fill — the reference's CTAs read as solid lime,
        // not a strong gradient; this stays close to solid with just
        // enough gradient to avoid a flat-fill look ("subtle gradients"
        // per the reference formula).
        "accent-gradient": "linear-gradient(135deg, #B8ED1E 0%, #C3F53C 55%, #D4FA6B 100%)",
      },
      keyframes: {
        "anchor-draw": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.97) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "dash-flow": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "anchor-draw": "anchor-draw 900ms ease-out forwards",
        // Micro-interactions (spec section 91): "keep animations subtle
        // and fast" — used for the command palette and other modals.
        "modal-in": "modal-in 150ms ease-out",
        // Marching-ants flow along a workflow edge that the most recent
        // run actually traversed (spec section 76: "connections should
        // animate during execution").
        "dash-flow": "dash-flow 700ms linear infinite",
        // Landing-page scroll-reveal sections (Figma redesign section 9:
        // "fade-up sections... respect prefers-reduced-motion" — the
        // reduced-motion override in globals.css already neutralizes
        // this for anyone who has that preference set).
        "fade-up": "fade-up 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
