# Phase 01 progress — stabilisation and design system

**Date:** 2026-11-17
**Scope:** deterministic tooling, repository hygiene, and a design system the later phases consume.
**Constraint honoured:** Next.js 14 Pages Router preserved; no endpoint, response shape, model
behaviour or route changed.

---

## 1. What changed, by path

### Tooling and repository

| Path | Change |
|---|---|
| `frontend/package.json` | added `lint`, `typecheck`, `test`, `test:motion`, `test:entry`, `test:design`, `build`, `verify`; declared the six animation packages that were already installed and locked |
| `frontend/tsconfig.json` | `target` `es5` → `ES2020` |
| `frontend/.eslintrc.json` | kept as the single lint config (`next/core-web-vitals`) |
| `frontend/eslint.config.mts` | **deleted** — a second, unused flat config |
| `package.json`, `package-lock.json`, `node_modules/` (repo root) | **deleted** — a duplicate Node project with no scripts, which also risked parent-directory module resolution |
| `.gitignore` | re-included `.env.example`; ignored `*.log`, `logs/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `coverage/`, `.vercel/`; kept `*.tsbuildinfo` ignored |
| `.env.example` | trimmed to variables the code actually reads; the Google Drive block and its real folder ID removed |
| `frontend/.env.example` | **new** — documents `NEXT_PUBLIC_API_URL` with a safe placeholder |
| `README.md` | rewritten: real structure, local dev for backend and frontend, the check commands, and the Dockerfile gap stated plainly |

### Design system

| Path | Change |
|---|---|
| `frontend/styles/tokens.css` | rewritten: ink ramp, three text roles, cyan signal, violet model channel, three state families, editorial type scale, 4 px space grid, nested radii, two motion curves |
| `frontend/styles/globals.css` | rewritten against tokens only: base, typography, buttons, cards, badges, meter, callout, section header, ink hero, forms, status rows, responsive shell, reduced motion |
| `frontend/components/ui/Button.tsx` | `Button` + `ButtonLink` |
| `frontend/components/ui/Card.tsx` | the single content container |
| `frontend/components/ui/Badge.tsx` | five tones plus an opt-in state dot |
| `frontend/components/ui/Meter.tsx` | labelled bar over a real `<progress>` |
| `frontend/components/ui/SectionHeader.tsx` | specimen index + one `h1` + lede |
| `frontend/components/ui/Callout.tsx` | info / success / warning / danger message |
| `frontend/components/ui/index.ts` | barrel |
| `frontend/components/Layout.tsx` | badge bound to tone map; header grid areas for the collapsed layout |
| `frontend/components/AnalyzerForm.tsx` | `SectionHeader`, `Button`, `Callout`; specimen index passed by the page |
| `frontend/pages/index.tsx` | hero + three cards on primitives; status card on `Callout`/`Button` |
| `frontend/pages/analyze/{sentiment,emotions}.tsx` | results on `Card` + `Meter` / `Card` + `Badge` |
| `frontend/pages/{model-lab,datasets,documentation}.tsx` | `SectionHeader` + `Card` |
| `frontend/pages/_app.tsx` | per-route document titles and a shared description |
| `frontend/pages/_document.tsx` | `color-scheme` and `theme-color` |
| `frontend/DESIGN_SYSTEM.md` | **new** — inventory, token tables, 19 measured contrast pairs, rules, exceptions, gaps |

### Tests

| Path | Change |
|---|---|
| `frontend/scripts/test-design-system.mjs` | **new** — token presence, no hex/`rgb()`/raw `font-family` in `globals.css`, no `transition: all`, primitive contracts, badge not hidden, no `order: -1`, focus and reduced-motion blocks present |
| `frontend/scripts/test-entry.mjs` | updated for the `Example trace` label |

## 2. Commands

From `frontend/`:

```bash
npm run lint        # next lint — single config
npm run typecheck   # tsc --noEmit
npm test            # motion, entry, design-system suites
npm run build       # next build
npm run verify      # all four, in order
```

From the repository root:

```bash
python -m pytest backend/tests -q
```

Contrast was measured out of the shipped token file rather than from intent: a WCAG 2.1
relative-luminance script parsed every `--color-*` value from `frontend/styles/tokens.css`,
composited alpha surfaces over `--color-surface`, and compared 19 foreground/background pairs.

## 3. Results

| Check | Result |
|---|---|
| `next lint` | clean, no warnings |
| `tsc --noEmit` | exit 0 |
| motion / entry / design-system suites | all pass |
| `next build` | 8 routes, **92.4 kB** shared JS (91.0 kB after step 1) |
| `pytest backend/tests` | 5 passed |
| contrast | **19 / 19 pairs ≥ 4.5:1**; weakest `--color-text-subtle` on card surface at 5.04:1 |
| console errors across all six routes | 0 |
| horizontal overflow at 390 / 976 / 1440 px | none |

Rendering was verified in same-origin iframes at true viewport widths, because this browser
runtime exposes no viewport emulation:

| Viewport | Measured |
|---|---|
| 1440 × 1057 | sidebar 256 px sticky; hero columns 518 / 440; three card columns ≈335 px; `h1` 56 px serif; all three cards 267 px tall with footers flush at 25 px |
| 390 × 1701 | header 185 px; 3 × 2 nav grid; hero and cards stacked; `h1` 24 px; readiness badge visible; no overflow |

Artifacts in `reports/figures/`:

- `phase01_dashboard_desktop_1440.png`
- `phase01_dashboard_mobile_390.png`
- `phase01_sentiment_result_1440.png` — a live backend prediction, `5 / 5 stars`, bars
  0.2 / 0.4 / 3.2 / 41.7 / 54.5 %

## 4. Tracker movement

15 PASS / 18 FAIL / 6 WARN / 1 BLOCKED across 40 rows (was 7 / 22 / 7 / 1 across 37).

Closed: `N-03`, `N-05`, `N-14`, `N-15`, `N-16`, plus three new findings fixed in the same phase
(`N-18` card footer alignment, `N-19` mobile nav overflow, `N-20` no typecheck/test gate).
Downgraded: `N-04` FAIL → WARN (env example added, Dockerfile still absent).

## 5. Limits, stated plainly

- **Reduced motion is source-verified only.** This runtime cannot emulate
  `prefers-reduced-motion`, so the CSS block is asserted by test and read by source; it was not
  observed switching.
- **No `frontend/Dockerfile`.** The Docker daemon is unavailable, so the file would have been
  unverifiable. The compose frontend service therefore still cannot build; this is documented in
  the README rather than papered over.
- **The ink hero still shows invented numbers** (`4 / 5`, `admiration`, `82 %`, `68 %`). They are
  labelled `Example trace` and exposed as `role="img"` with an accessible name, so they no longer
  read as live output — but they remain invented. `F-13` stays open for phase 04.
- **`frontend/components/ui/animator-title-preloader.tsx` keeps its own palette.** It predates the
  token layer, is owned by phase 04, and is documented as an exception rather than silently
  restyled.
- **Real Drive folder IDs remain hard-coded** in `sync_drive.py` and
  `gemini_notebook_context.md`. Out of phase-01 scope; flagged, not silently edited.

## 6. Next phase

Phase 02 continues the same rule: no claim without a runnable check. The design system is now
usable, which is the precondition for the page-by-page rebuilds in phases 05–10.
