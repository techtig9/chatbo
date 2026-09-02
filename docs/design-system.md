# Chatbo Design System

The reference `tailwind.config.ts` points at. Source of truth for tokens,
components, motion and the Figma file that mirrors them.

**Figma:** https://www.figma.com/design/pQUKhDnsreWCeCtl8teXLF

---

## 1. Direction

Warm off-white paper, near-black ink, one vivid lime accent. A geometric
sans for display and UI, a serif for reading-length body copy, a mono for
code and numeric data.

The restraint is the point: subtle borders, minimal shadows, one accent.
No random purple/cyan gradients, no neon glow.

---

## 2. Token architecture

Three layers. Components bind to the **semantic** layer only — never to a
raw hex, never to a primitive.

```
Primitives  (raw ramps, hidden from pickers)
    ↓ alias
Semantic    (color/bg/page, color/text/primary, …)
    ↓ bind
Components  (Button, Card, Badge, Input)
```

### 2.1 Colour — semantic

| Token | CSS var | Light | Role |
|---|---|---|---|
| `color/bg/page` | `--color-paper` | `#FAFAF7` | Page ground |
| `color/bg/surface` | `--color-surface` | `#FFFFFF` | Cards, panels |
| `color/bg/elevated` | `--color-elevated` | `#F1F1EA` | Nested panels, hover |
| `color/text/primary` | `--color-ink` | `#0C0D09` | Body, headings |
| `color/text/secondary` | `--color-slate` | `#5B5D51` | Supporting copy |
| `color/text/muted` | `--color-muted` | `#8C8E7F` | Captions, meta |
| `color/border/default` | `--color-mist` | `#E6E6DC` | All borders |
| `color/accent/signal` | `--color-signal` | `#C3F53C` | CTAs, active state — **fill/border only** |
| `color/accent/signal-ink` | `--color-signal-ink` | `#4F6B08` | The accent **as text** |
| `color/accent/secondary` | `--color-accent2` | `#3B66D6` | Charts, informational |
| `color/status/success` | `--color-success` | `#0F7A38` | Healthy, published |
| `color/status/warning` | `--color-ember` | `#C2670A` | Attention, not failure |
| `color/status/danger` | `--color-danger` | `#D33232` | Blocking error |

**Status colour as text.** The base status tokens were tuned to read on
white, and do not survive being placed on a tinted surface.

| Text token | Value | Replaces | Why |
|---|---|---|---|
| `ember-ink` | `#9C5307` | `ember` | `ember` fails on **every** surface — 3.83:1 on paper, 4.01:1 on white, 3.40:1 on its tint |
| `danger-ink` | `#B82B2B` | `danger` *on a tint or `elevated`* | 4.06:1 on tint, 4.33:1 on `elevated` |
| `accent2-ink` | `#3459C2` | `accent2` *on a tint* | 4.33:1 on tint |
| `success-ink` | `#0E7134` | `success` *on a tint* | 4.52:1 — passes by 0.02, no headroom |

Each clears 4.5:1 on its tint, on paper and on white. Keep the base tokens for
fills, borders, dots and icons — those are non-text and answer to 3:1. Same
split as `signal` / `signal-ink`.

`text-ember` should not appear in the codebase at all; the others are safe on
`paper` and `surface` and only need the `-ink` form on a tinted ground.

**The lime rule.** `signal` is a background/border colour. As text on a
light surface it measures ~1.2:1 — nowhere near the 4.5:1 minimum. Any
time the accent must be *text*, use `signal-ink`. Lime fills always carry
near-black text, never white.

### 2.2 Colour — tints

Status surfaces use **pre-blended tints**, not alpha. A tint over a known
ground is predictable and inspectable; alpha over an unknown parent is not.

| Token | Value | Role |
|---|---|---|
| `color/status/danger-soft` | `#F6E6E3` | Danger card / button fill |
| `color/status/danger-hover` | `#F2D2CF` | Danger button hover |
| `color/status/danger-border` | `#EEBEBC` | Danger border |
| `color/status/success-soft` | `#E2EDE4` | Success card fill |
| `color/status/success-border` | `#B4D4BE` | Success border |
| `color/status/warning-soft` | `#F4EBDF` | Warning card fill |
| `color/status/warning-border` | `#E9CEB0` | Warning border |
| `color/accent/info-soft` | `#E7EBF4` | Info badge fill |
| `color/bg/neutral-soft` | `#EAEAE6` | Neutral badge fill |
| `color/accent/signal-soft` | `#E9ECDF` | Accent badge fill |

All computed at 10% over `#FAFAF7` (danger-hover at 20%, borders at 30%).

Available in code as Tailwind colours — `bg-danger-soft`, `border-danger-border`,
`bg-success-soft`, and so on. The existing `bg-x/10` alpha call sites still
work; the tints are additive, and are what new work should use.

### 2.3 Spacing — 4px grid

`2xs` 2 · `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `2xl` 24 ·
`3xl` 32 · `4xl` 40 · `5xl` 48 · `6xl` 64 · `7xl` 80

Card padding 20. Grid gaps 16. Section breaks 48–64. Off-scale is a bug.

### 2.4 Radius

`sm` 6 chips · `md` 8 buttons/inputs · `lg` 12 small cards ·
`xl` 16 cards/panels · `2xl` 20 modals · `full` 999 pills/avatars

### 2.5 Elevation

| Style | Use |
|---|---|
| `Elevation/0 Flat` | Nested / inline panels |
| `Elevation/1 Raised` | Resting card |
| `Elevation/2 Card Hover` | Card under cursor |
| `Elevation/3 Overlay` | Dropdown, popover |
| `Elevation/4 Modal` | Dialog, command palette |
| `Focus/Ring` | 4px lime halo, pairs with a 2px ink outline |

In code: `shadow-e1` … `shadow-e4`, plus `shadow-focus`. The older
`shadow-glow` / `shadow-glow-sm` bundle a lime ring into the shadow — correct
for a hovered accent surface, wrong as the system's only depth vocabulary.
Use the neutral `e*` scale for depth and let the accent be a separate decision.

A card is defined by its 1px border first, its shadow second.

---

## 3. Typography

| Role | Family | Notes |
|---|---|---|
| Display / UI | **General Sans** (Fontshare) | Geometric sans |
| Body | **Newsreader** | Serif, reading-length copy |
| Mono | **IBM Plex Mono** | Code, IDs, token counts |

### Type ramp

| Style | Size / line | Weight |
|---|---|---|
| `Display/2XL` | 56 / 60 | Bold, -2.5% |
| `Display/XL` | 44 / 48 | Bold, -2% |
| `Display/L` | 32 / 38 | SemiBold, -1.5% |
| `Display/M` | 24 / 30 | SemiBold, -1% |
| `Display/S` | 18 / 24 | SemiBold, -0.5% |
| `Body/L` | 18 / 30 | Regular |
| `Body/M` | 16 / 26 | Regular |
| `Body/S` | 14 / 22 | Regular |
| `UI/Label Strong` | 14 / 20 | SemiBold |
| `UI/Label` | 14 / 20 | Medium |
| `UI/Caption` | 12 / 16 | Medium |
| `UI/Eyebrow` | 11 / 14 | Bold, +16%, uppercase |
| `Mono/M` | 13 / 20 | Regular |
| `Mono/S` | 11 / 16 | Regular |

> **Figma substitution.** General Sans is a Fontshare font and is not
> available in Figma. The Figma file uses **Geist** as the closest
> stand-in. Metrics differ slightly — treat Figma display type as a
> size/weight/rhythm reference, not a pixel-exact spec.

---

## 4. Motion

| Token | ms | Use |
|---|---|---|
| `duration/instant` | 100 | Button press, checkbox, toggle |
| `duration/fast` | 150 | Hover, tooltip, dropdown, tab |
| `duration/base` | 200 | Card hover lift, modal in/out |
| `duration/slow` | 300 | Page transition, drawer, sheet |
| `duration/slower` | 500 | Section scroll-reveal, chart draw |
| `duration/deliberate` | 900 | Hero anchor-line, deploy success |

In code: `duration-instant` … `duration-deliberate`.

**Easing.** Entering → `ease-out`. Exiting → `ease-in`. Moving between
two states → `ease-in-out`.

**Never animate** colour-only changes over 150ms, list reorder, or text
reflow.

**Every action states itself:** `Loading → Success` or
`Loading → Error → Retry`. No silent success, no silent failure.

**Reduced motion.** `globals.css` forces every animation and transition to
0.01ms under `prefers-reduced-motion: reduce`. Any keyframe animation must
therefore be authored so its **100% frame is the correct resting state** —
a reduced-motion user jumps straight there and stays.

---

## 5. Components

Figma component names mirror `components/ui/` so a designer and a
developer point at the same object.

### Button — `components/ui/button.tsx`
Variants `primary · secondary · tertiary · danger`, states
`default · hover · loading · disabled`.

One primary action per view. Loading swaps the icon for a spinner and
disables the button **without changing its size**, so the page never
reflows mid-submit.

### Badge — `components/ui/badge.tsx`
Tones `neutral · success · warning · danger · info · accent`.

Always pairs a dot with a word — colour is never the only cue. `success`
is a distinct green from the lime accent so "brand" and "healthy" never
collide. Fills use the `*-soft` tints; labels use the `-ink` text variants
where the base token is too light on its own tint. The dot keeps the base
colour, since it is a fill rather than text.

### Card — `components/ui/card.tsx`
Variants `primary · secondary · metric · interactive · warning · success · danger`.

One radius (16), one padding (20), one border. **Variant changes meaning,
never geometry.** Every card needs its four states designed: default,
hover, loading (skeleton), empty.

### Input
States `default · filled · focus · error · disabled`.

Focus is a 2px ink outline **plus** a lime halo — lime alone is too
low-contrast on a light surface to be the only focus signal. Error always
pairs the red border with a message.

---

## 6. Accessibility

- Target **WCAG AA** (4.5:1 normal text, 3:1 large).
- Never suppress `:focus-visible`. The ink-outline + lime-halo pair is
  deliberate: the dark outline reads on light surfaces, the lime halo
  reads on dark ones.
- Colour is never the only carrier of meaning — pair with an icon, a dot,
  or a word.
- Respect `prefers-reduced-motion` (see §4).
- Every empty state is useful: icon, explanation, primary action.

---

## 7. Figma file structure

The Figma account is on the **Starter (free)** plan, which constrains the
file in three ways worth knowing before editing it:

| Limit | Effect |
|---|---|
| 3 pages max | Structure is `01 Cover & Foundations` / `02 Components` / `03 Screens`, with boards stacked vertically inside each |
| 1 mode per collection | Light/Dark cannot be a switchable mode. Light is built; the dark ramp exists in Primitives, ready to become a second mode on a paid plan |
| MCP tool-call cap | Agent-driven edits stop once the cap is reached |

### Current state

| Page | Built |
|---|---|
| 01 · Cover & Foundations | Cover, Colour, Typography, Elevation/Space/Motion |
| 02 · Components | 31 components — Button, Badge, Card, Input |
| 03 · Screens | *empty — not yet built* |

### Known gaps

1. **Tinted fills render solid.** `setBoundVariableForPaint` discards paint
   opacity, so Badge, the status Cards and the danger Button currently show
   saturated fills with unreadable labels. The fix is the tint tokens in
   §2.2 — now present in `tailwind.config.ts`, still to be applied in Figma.
2. **Screens page is empty.** Landing, Dashboard, Agent Builder and
   Marketplace are designed in spec but not laid out.
3. **Dark mode** is a documented direction, not a shipped theme.
4. **Ambient `/5` and `/20` washes** (`bg-success/5`, `border-success/20`)
   are left as alpha. They are decorative washes rather than status
   surfaces, and nothing sets text directly against them at a contrast
   that matters.
