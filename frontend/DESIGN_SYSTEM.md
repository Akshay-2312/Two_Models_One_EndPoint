# NLP Lab design system

Status: established in phase 01. Pages 05–10 consume it; they must not redefine it.

Two files hold every decision:

- `frontend/styles/tokens.css` — colour, type, space, shape, motion. The only place a literal
  colour, font stack or duration may appear.
- `frontend/styles/globals.css` — layout and component styles, written entirely against tokens.

`frontend/scripts/test-design-system.mjs` enforces the contract: no hex or `rgb()` literals in
`globals.css`, `font-family` only via `var(--font-*)`, no `transition: all`, every base token
present, primitives unchanged in their accessible essentials, and no `order: -1` source-order
hack. `npm run test:design` runs it.

---

## 1. Direction

**Language Intelligence Lab.** A dark research notebook rather than a product dashboard.

- Deep ink/navy ground, warm near-white text — the page reads like paper stock under a lamp, not
  like a screen.
- Cyan is the only chrome accent: links, primary action, focus ring, active marker.
- Violet is reserved for the **model channel** — it marks model output and model internals, never
  decoration or brand flourish.
- Mint = success/ready, amber = caution/degraded, red = failure/unreachable.
- Editorial typography: an old-style serif for page titles only, sans for UI, mono for anything
  the machine produced.
- No hue gradients, no glows, no glass cards, no illustrations, no emoji, no decorative
  geometry. The one atmospheric surface is the landing ink plate: a labelled illustration of
  text developing into form, never a rendered result.

## 2. Colour

### Ink ramp

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#070b13` | page ground |
| `--color-surface-sunken` | `#05080f` | sidebar |
| `--color-surface-input` | `#0a101a` | textarea, sunken card |
| `--color-surface` | `#0d1320` | card, default panel |
| `--color-surface-raised` | `#141c2b` | meter track, chips, hover fill |
| `--color-border` | `rgba(232,238,248,.10)` | hairline |
| `--color-border-strong` | `rgba(232,238,248,.20)` | control edge, emphasis hairline |

Four surface steps, two hairlines. Do not add a fifth surface.

### Text

| Token | Value | Use |
|---|---|---|
| `--color-text` | `#f2f1ec` | body, headings, numbers |
| `--color-text-muted` | `#aab3c4` | lede, card body, meter labels |
| `--color-text-subtle` | `#7b8698` | specimen lines, footnote metadata, placeholders |

Three text roles only. There is no fourth "faint" grey.

### Signal and state

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#5fd3e0` | action, link, focus ring, active nav |
| `--color-primary-strong` | `#9beaf2` | hover/pressed |
| `--color-primary-ink` | `#04121a` | text on a primary fill |
| `--color-ai-accent` | `#a394f8` | model-channel bars and borders |
| `--color-ai-accent-strong` | `#c3b8ff` | model badge text |
| `--color-ai-surface` | `rgba(163,148,248,.12)` | model badge fill |
| `--color-success` | `#6fe0b2` | ready |
| `--color-warning` | `#edc06b` | degraded, caution |
| `--color-danger` | `#ff9d9d` | unreachable, request failure |
| `--color-info-text` | `#bdf4ef` | text inside an info callout |

Every state also carries text. Colour never carries a state alone.

### Measured contrast

Computed with a WCAG 2.1 relative-luminance script over the shipped hex values (alpha surfaces
composited against `--color-surface`). Text is 13–16 px, so the 4.5:1 body threshold applies
everywhere.

| Pair | Ratio |
|---|---|
| text on bg | 17.41:1 |
| text on surface | 16.42:1 |
| text on sunken | 17.72:1 |
| text on input surface | 16.85:1 |
| muted on surface | 8.80:1 |
| subtle on surface | 5.04:1 |
| muted on input surface | 9.03:1 |
| subtle on input surface | 5.18:1 |
| primary on surface | 10.50:1 |
| primary-ink on primary | 10.74:1 |
| ai-accent on surface | 7.20:1 |
| ai-accent-strong on ai surface | 8.62:1 |
| success on surface | 11.48:1 |
| success on success surface | 9.40:1 |
| warning on surface | 10.92:1 |
| warning on warning surface | 9.12:1 |
| danger on surface | 9.34:1 |
| danger on danger surface | 7.51:1 |
| info text on info surface | 11.37:1 |

All 19 pairs clear 4.5:1. The weakest is `--color-text-subtle` on the card surface at 5.04:1 —
it is only used for 12 px metadata and specimen lines, never for body copy.

## 3. Typography

| Token | Stack | Use |
|---|---|---|
| `--font-display` | `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif` | `h1` only |
| `--font-sans` | `Inter, ui-sans-serif, system-ui, …` | everything else |
| `--font-mono` | `"SFMono-Regular", Consolas, "Liberation Mono", monospace` | specimen indexes, values, thresholds, counts |

Sizes are fluid `clamp()` values: `xs` 12 px, `sm` ≈13–14, `base` ≈15–16, `lg` 18–22, `xl` 24–32,
`display` 36–56 px, `hero` 40–72 px. Weights are 400 / 500 / 600 — **600 is the ceiling**; 700 and
above are not available as tokens.

Rules:

- One `h1` per page, serif, `--weight-medium`, `--tracking-display`, `text-wrap: pretty`.
  `balance` was tried and rejected: it stranded the final period of the dashboard headline on its
  own line.
- The landing `h1` is the one display moment: it uses `--font-size-hero`, `text-wrap: balance`,
  and one `.hero-word` mask per word so the line rises out of its own baseline box. Each mask is
  real text with a real space between words; the effect is pure CSS and resolves to the plain
  sentence when animation is unavailable.
- `h2` and below are sans at `--weight-strong`. A card title is an `h2`; a sub-block inside a card
  is an `h3`.
- `text-wrap: pretty` on headings and `.lede`; never on data.
- No uppercase tracking, no eyebrow labels, no letter-spaced micro-caps. The mono specimen line
  replaces that device and carries real information.
- Numbers are always mono. A number set in the sans face reads as prose and gets skimmed.

### Specimen indexes

Every page opens with a mono index in the form `NLP-0n / ROLE`. They are fixed positions in a
sequence, so they stay stable even if a page is rewritten:

| Index | Page |
|---|---|
| `NLP-01 / WORKBENCH` | Dashboard |
| `NLP-02 / SENTIMENT` | Sentiment Analyzer |
| `NLP-03 / EMOTIONS` | Emotion Analyzer |
| `NLP-04 / MODELS` | Model Lab |
| `NLP-05 / DATASETS` | Dataset Explorer |
| `NLP-06 / REFERENCE` | Documentation |

## 4. Space, shape, motion

- Space is a 4 px grid: `2xs` 4, `xs` 8, `sm` 12, `md` 16, `lg` 24, `xl` 32, `2xl` 48→80,
  `3xl` 64→128 px.
- Radii nest: control 8 px (`--radius-sm`), panel 12 px (`--radius-md`), card 16 px
  (`--radius-lg`), badge pill. Nothing is fully rounded except the badge, and a card is never
  nested inside another card.
- `--shadow-card: none`. Depth comes from one hairline and one surface step. The system has no
  floating surface: the ink plate sits in the page grid, and the entry title card owns its own
  internal shadow.
- Durations: 100 / 160 / 240 / 420 ms on two curves (`--ease-out` for anything entering or
  responding, `--ease-in-out` for state changes in place). No spring, no bounce.
- Focus is instant and static: `outline: 2px solid var(--color-primary); outline-offset: 2px` on
  `:focus-visible`. The outline is never animated and never removed.
- Reduced motion collapses every duration to 100 ms, drops the hero entrances and the scroll
  reveals, and is checked in JavaScript before the entry card mounts. Implemented in one media
  block at the end of `globals.css`; pages must not re-implement it.

## 5. Primitives

All in `frontend/components/ui/`, exported from `index.ts`.

| Component | File | Contract |
|---|---|---|
| `Button` | `Button.tsx` | `variant` `primary` \| `secondary` \| `quiet`; defaults to `type="button"` so a stray click cannot submit a form; 40 px minimum hit target; disabled styling is token-driven |
| `ButtonLink` | `Button.tsx` | navigation that looks like an action — renders a real anchor via `next/link`, never a button with a click handler |
| `Card` | `Card.tsx` | the only content container; `kicker` is a mono specimen label, `title` renders an `h2`, `tone` `default` \| `sunken`; flex column so a footer link or action pins to the bottom edge |
| `Badge` | `Badge.tsx` | `tone` `neutral` \| `success` \| `warning` \| `danger` \| `model`; `dot` adds the leading state dot and is for live status only, never decoration |
| `Meter` | `Meter.tsx` | labelled bar over a real `<progress>` element, so the printed percentage and the bar cannot disagree; `valueLabel` overrides the rounded default when the backend returns more precision |
| `SectionHeader` | `SectionHeader.tsx` | page opening or in-page section: optional specimen `index`, `level` `1` (default) \| `2`, one heading, optional lede, optional actions |
| `Callout` | `Callout.tsx` | inline info/success/warning/danger message with a role; always carries text |

Retained but **not** part of the system: `components/ui/animator-title-preloader.tsx` owns its
own palette (see §7).

`Reveal` in `components/Reveal.tsx` is a behaviour, not a primitive: it wraps a below-the-fold
section, renders it visible by default, and only arms a one-shot `IntersectionObserver` reveal
when the block starts off-screen and reduced motion is off.

### Non-primitive classes

These are stable layout classes rather than components; pages may use them but must not restyle
them: `.app-shell`, `.sidebar`, `.sidebar-toggle`, `.nav-link`, `.main-content`, `.page-section`,
`.card-grid`, `.specimen`, `.lede`, `.muted`, `.chip-row`, `.status-list`, `.probability-list`,
`.hero`, `.ink-hero`, `.landing-section`, `.readiness-card`, `.reveal`, `.prediction`,
`.result-meta`.

## 6. Page composition

```
SectionHeader            index + h1 + lede
  Card / card-grid       content, one level deep only
    Meter                any number with a maximum
    Badge                any discrete state
    Callout              any error, warning or empty result
    Button / ButtonLink  the single primary action per region
```

The dashboard is the one page with a two-column hero (`.hero` + `InkHero`), followed by four
below-the-fold sections: capabilities, the two model paths, live API readiness and a short
project note. Every other page is a single reading column.

## 7. Documented exceptions

1. **`animator-title-preloader.tsx`** is a self-contained title-card component with its own
   colour constants in three presets. It predates the token layer and is scheduled for phase 04.
   `EntryPreloader` passes a `palette` that mirrors the tokens one-for-one (`stage`, `ink`,
   `muted`, `rough`, `ghost`, `word0–2`) because the component takes hex strings; its own presets
   are never used for the app. The card keeps `rough` and `hud` (the typographic pencil pass and
   the `NLP-01 / WORKBENCH` slate). `hands` and `mascot` are off: painted hands and a spectacled
   mascot belong to a different product.
2. **`pages/_document.tsx` sets `theme-color: #070b13`.** A `<meta>` tag cannot read a CSS custom
   property, so the value is duplicated with a comment. If `--color-bg` changes, this changes.
3. **`InkHero` wash** (`.ink-hero__wash`, `--ink-wash-core`, `--ink-wash-deep`) is permitted because it is
   one atmospheric plate standing in for the idea of text becoming interpretation, not chrome. It is a
   single ink ramp, two teal-graphite stops on the card surface, with no violet and no blur: a second hue
   or a glowing wash would break the palette rule the rest of the app follows. The plate carries a caption
   saying it is an illustration rather than a model output.
4. **`--color-danger-surface` and `--color-info-surface` are opaque hexes**, not alpha. Alpha
   over the card surface produced a ratio below 4.5:1 for the danger text, so the surfaces were
   solved backwards from the text colour.

### Entry gate

`EntryPreloader` is mounted once in `pages/_app.tsx`, so it covers whichever route a visitor lands
on and client-side navigation cannot mount a second copy.

- Shown at most once per **tab session**: `sessionStorage["nlp-lab-entry-seen"]`.
- The key is written only when the sequence finishes or the visitor presses Skip. A bypass writes
  nothing.
- Bypasses: `prefers-reduced-motion: reduce` and `?entry=off`.
- `?entry=force` shows the card even in a tab that has already seen it. All three are
  presentation-only; no data, auth or routing path depends on them.
- Console reset: `sessionStorage.removeItem("nlp-lab-entry-seen")`.
- Storage access goes through `lib/storage.ts` and can never throw. An unreadable store shows the
  card again rather than blocking entry.
- The card is a `role="dialog"` with `aria-modal="true"` and a real Skip button that takes focus;
  Tab and Shift+Tab stay on Skip and Escape dismisses it. It is a `group`, not a `progressbar`,
  because nothing is loading.
- API readiness is independent: the app renders underneath and the sidebar and readiness section
  report the real state after the card leaves.

## 8. Responsive rules

Breakpoints, mobile last:

| Width | Behaviour |
|---|---|
| > 78 rem | two-column hero (copy + ink plate), sidebar expanded or as a rail |
| ≤ 78 rem | hero stacks to one column |
| ≤ 64 rem | shell collapses; sidebar becomes a sticky header with a 3-column nav grid; the collapse control retires and labels stay visible |
| ≤ 40 rem | cards stack to one column; hero title drops to `--font-size-display` |
| ≤ 30 rem | nav drops to 2 columns; brand subtitle hides; full-width hero buttons |

Rules that the responsive pass had to enforce and that must not regress:

- The readiness badge stays visible at every width. It was `display: none` below 48 rem; it now
  moves into the header row. Phase 01 test asserts the selector is never hidden.
- `.sidebar` needs `align-self: start` in the collapsed layout, otherwise the grid stretches it to
  the full page height and opens a gap under the header.
- Collapsed labels are hidden with `clip-path: inset(50%)` and a 1 px box, not `display: none`,
  so every nav link keeps its accessible name. Each link also carries `title` for pointer users.
- The rail is a desktop device: below 64 rem the header keeps every label and the toggle is
  hidden, because an icon-only header would lose the page names.
- Source order never changes for layout — no `order: -1`.
- `overflow-x: clip` on `html`/`body` is a guard, not a fix: the layout is expected to fit without
  it, and every width was checked for `scrollWidth > innerWidth`.

## 9. Known gaps

- **Reduced-motion is source-verified only.** This browser runtime could not emulate
  `prefers-reduced-motion`, so the CSS block and the gate's JS bypass are asserted by test rather
  than observed. Phase 04 must confirm it on a real preference switch.
- **No dark/light pair.** The system is dark-only by intent; there is no light theme and
  `color-scheme: dark` is declared so form controls agree.
- **No `frontend/Dockerfile`.** The compose frontend service still points at a file that does not
  exist, so the Docker path is unverified. Docker was unavailable this phase.
- **`gsap`, `@gsap/react`, `lenis`, `framer-motion`, `lottie-react` and `@rive-app/react-canvas`
  are declared but unused.** The landing motion is CSS plus one `IntersectionObserver`; no
  library was needed for a word mask and a one-shot reveal. They remain installed pending a
  later decision.
