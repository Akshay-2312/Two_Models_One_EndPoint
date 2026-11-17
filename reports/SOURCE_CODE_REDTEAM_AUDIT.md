# NLP Lab — Verified Source Audit (Phase 00)

**Basis:** live repository at `C:\Users\aksha\projects\NLP\nlp-lab` (frontend + backend + ml + artifacts + data + reports), inspected directly, with commands executed and a real browser session.
**Supersedes:** the archive-only audit supplied in `NLP_Lab_Frontend_Repair_Prompt_Pack.zip`.
**Date:** 17 November 2026
**Status:** Audit complete. Build, lint, typecheck, backend tests, live API, and browser entry cases verified. Responsive-viewport and reduced-motion reproduction **BLOCKED** (tooling). No source file was modified.

---

## 0. Method and environment

| Item | Value |
|---|---|
| Node / npm | Node runtime in use, npm 10.x |
| Next.js | 14.2.35 (Pages Router) |
| React | 18.3.1 |
| TypeScript | 5.9.3, `strict: true` |
| Python | 3.13.15 (`.venv`) |
| Backend | FastAPI + Uvicorn, pydantic 2 |
| Models on disk | Amazon BiLSTM (PyTorch), DistilBERT GoEmotions (PyTorch + ONNX) |
| Version control | **None** — `nlp-lab` is not a git repository |
| Browser tooling | Chromium via browser tools; no Playwright package installed |

Commands executed in this phase (all from `frontend/` unless stated):

```text
npx tsc --noEmit                    -> exit 0
npm run lint                        -> "No ESLint warnings or errors", exit 0
npm run build                       -> success, 8 routes
npm run test:motion                 -> pass
npm run test:entry                  -> pass
.venv python -m pytest backend/tests-> 5 passed in 0.37s
uvicorn backend.app.main:app        -> live, models ready in 8.54 s
```

---

## 1. Executive verdict

The supplied audit's core judgement still holds: **this is a partial prototype, not the intended research workbench.** Two of seven routes are real; three are single-card stubs; one route does not exist; there is no chart, diagram, or route-reveal system, and no browser test.

But the repository has **moved past** the audited snapshot, and the audit's most important unknown is now resolved:

- `components/InkHero.tsx` exists and is mounted — F-04 is partially fixed, though it is not the reference's three-station sequence.
- **The backend contract is verified and matches the frontend exactly** — F-17 is closed as PASS.
- **The two models are present, load successfully, and return real predictions** — the "unavailable" risk is low.
- **Real dataset and metric artifacts exist** for Dataset Explorer and Model Lab. No invented numbers are needed.

The blocking problem the supplied audit missed is integration, not decoration:

> **With the documented default configuration, every browser call from the frontend to the API is rejected by CORS.** The backend allowlist defaults to port 5173; the app runs on 3000; `docker-compose.yml` never passes `CORS_ORIGINS`. Both analyzers and the readiness badge are dead in any default startup, while the sidebar still claims "API-connected workspace".

That must be fixed before any visual work, otherwise every later phase will "pass" against a UI that cannot reach its own backend.

**Current rubric score (audit-time estimate, evidence above): 31 / 100.** Not a release candidate, and further from it than the page currently looks.

| Dimension | Weight | Now | Why |
|---|---:|---:|---|
| Product completeness and correctness | 20 | 4 | 2 real routes, 3 stubs, 1 missing route |
| Visual design, hierarchy, distinct identity | 15 | 7 | Coherent tokens and typography; identity only on the dashboard |
| Motion quality, lifecycle, reduced-motion | 15 | 4 | Entry preloader + progress strip only; no route reveal; fake progressbar |
| Data/model transparency and provenance | 15 | 5 | Excellent artifacts exist, none surfaced; dashboard shows a fake sample |
| API reliability and error handling | 10 | 1 | CORS-blocked by default, no timeout/abort/retry, stuck "Checking…" |
| Accessibility and responsive UX | 10 | 4 | Labels and focus styles present; overlay not modal-safe; no viewport evidence |
| Performance and maintainability | 10 | 5 | Clean 88.9 kB shared JS; phantom deps, dead lint config, no git |
| Testing, documentation, delivery evidence | 5 | 1 | Grep-based contract scripts only; CI covers backend only |
| **Total** | **100** | **31** | |

---

## 2. Corrections to the supplied audit

| Supplied claim | Verified status | Evidence |
|---|---|---|
| F-04 "No Ink Hero on landing page" | **PARTIAL / CORRECTED** | `components/InkHero.tsx:1-70` + `styles/globals.css:47-96`; mounted at `pages/index.tsx:26-49` |
| F-17 "Backend contract cannot be verified" | **RESOLVED — PASS** | Contracts proven live from the browser origin; see §7 |
| F-18 "Two ESLint styles, flat config imports undeclared packages" | **CORRECTED — inert, not ambiguous** | `next lint` uses `.eslintrc.json`; ESLint 8.57 with `ESLINT_USE_FLAT_CONFIG=true` reports `Could not find config file` because v8 flat mode does not read `.mts`, and `typescript-eslint` is absent |
| "No runtime dependency declared for GSAP / Framer Motion" | **CORRECTED — installed but undeclared** | `package-lock.json` and `node_modules` contain `gsap@3.15.1`, `@gsap/react@2.1.2`, `framer-motion@14.14.0`, `lenis@1.3.27`, `lottie-react@3.1.2`, `@rive-app/react-canvas@4.39.0`; `package.json` declares none |
| "The backend was not included / endpoints assumed" | **CORRECTED — backend is local and running** | `backend/app/main.py`, `backend/app/schemas.py`, `ml/*/inference.py` inspected; live responses captured |
| "`.next/` in archive, 411 MB" | **Still true locally** | `frontend/.next` present (104 files); `artifacts/` ≈ 2.4 GB (checkpoints, ONNX, parquet) |
| "No `/technology` route" | **CONFIRMED** | Build route list, `components/Layout.tsx:6-13` |
| "Line refs" (e.g. `globals.css:220-520`) | **Stale** | `globals.css` is 208 lines total |

---

## 3. Confirmed defects (carried forward, with current evidence)

| ID | Sev | Status | Finding | Evidence |
|---|---|---|---|---|
| F-01 | High | **CONFIRMED + REPRODUCED** | Entry preloader is mounted only by the dashboard, so direct entry to any secondary route never shows it | `pages/index.tsx:14`; `pages/_app.tsx:6-14`; new-tab `/datasets` with empty storage: no `.entry-preloader-shell` |
| F-02 | High | **CONFIRMED (source) / PARTIAL reproduction** | Preloader skips under reduced motion or an existing session key | `components/EntryPreloader.tsx:15-17`; session-skip reproduced; reduced-motion not reproducible in this tooling |
| F-03 | High | **CONFIRMED** | Route transition is a 0.2 rem top strip; no circular reveal; it snaps to a fixed 65 % scale rather than tracking progress | `styles/globals.css:18-21`; `components/MotionProvider.tsx:18-31` |
| F-04 | High | **PARTIAL — corrected** | An Ink Hero exists as a CSS adaptation (radial wash, two ridge shapes, grain, pointer-tracked `--ink-x/y`, scroll-driven `--ink-progress`). It is **not** the reference behaviour: no ink→print develop, no full-bleed sheet, no line-by-line headline, no ScrollTrigger, no WebGL dissolve | `components/InkHero.tsx:18-69`; `styles/globals.css:47-96`; reference metadata: three stations, one ScrollTrigger, authored WebGL dissolve, deps `gsap` + `@gsap/react` |
| F-05 | High | **CONFIRMED** | Model Lab is one section with two static cards; no pipeline, no architecture, no artifacts | `pages/model-lab.tsx:1-3` |
| F-06 | High | **CONFIRMED** | Dataset Explorer is one card of prose | `pages/datasets.tsx:1-3` |
| F-07 | High | **CONFIRMED** | Documentation is one card of prose | `pages/documentation.tsx:1-3` |
| F-08 | High | **CONFIRMED** | No `/technology` route or nav entry; no footer component anywhere | build output; `components/Layout.tsx:6-13,18-44` |
| F-09 | High | **CONFIRMED** | No chart/diagram dependency installed (recharts, mermaid, reactflow all absent) | `package.json`; `node_modules` probe |
| F-10 | High | **CONFIRMED** | No statistics, analysis, or model-init loader; pending state is a button label | `components/AnalyzerForm.tsx:56-58` |
| F-11 | High | **CONFIRMED + REPRODUCED** | Sidebar claims "API-connected workspace" unconditionally; observed while all requests were failing | `components/Layout.tsx:38-40`; live DOM text |
| F-12 | High | **CONFIRMED + REPRODUCED** | Readiness failure sets `null`; UI falls back to `"Checking..."` forever. Reproduced **with both models ready** (CORS blocked the call) | `pages/index.tsx:10`, `:54`; live DOM: `Checking...` |
| F-13 | Medium | **WARN — mitigated, not resolved** | Hard-coded `4 / 5`, `admiration`, `82 %`, `68 %` remain. Labelled `sample / 014`, `role="img"`, `aria-label="Example inference trace"`, but the visual treatment still reads as a live result and the numbers are unverifiable | `pages/index.tsx:26-49` |
| F-14 | Medium | **CONFIRMED + REPRODUCED** | Session key is written before the animation finishes; observed `key="true"` while the shell was still visible | `components/EntryPreloader.tsx:20` |
| F-15 | Medium | **CONFIRMED (source)** | `sessionStorage` access is unguarded; a storage exception would throw inside the effect | `components/EntryPreloader.tsx:15,20` |
| F-16 | Medium | **CONFIRMED** | No `AbortController`, timeout, retry, or stale-response guard; a slow earlier response can overwrite a newer result | `components/AnalyzerForm.tsx:23-38`; `lib/api.ts:29-39` |
| F-17 | Medium | **RESOLVED — PASS** | Endpoints and response shapes match exactly; see §7 | live capture |
| F-18 | Medium | **CORRECTED — Low** | One effective config (`.eslintrc.json`); `eslint.config.mts` is dead code importing an uninstalled package | §2 |
| F-19 | Medium | **CONFIRMED** | The two "tests" only regex source text; they never mount React or open a browser | `scripts/test-motion.mjs`, `scripts/test-entry.mjs` |
| F-20 | Medium | **UNKNOWN / BLOCKED** | Mobile behaviour unverified: no viewport control in this tooling, Playwright absent. Source has one 48 rem breakpoint, a horizontal-scroll nav, and duplicated `.card-grid` rules | `styles/globals.css:185-199` |

---

## 4. New findings

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| **N-01** | **Critical** | **CORS blocks every frontend→API call under the default configuration.** Backend default allowlist is `localhost:5173`, the app runs on `3000`, and `docker-compose.yml` never sets `CORS_ORIGINS`. Preflight from `:3000` returns **400**. With `CORS_ORIGINS=http://localhost:3000` the same preflight returns **200** with `access-control-allow-origin`. Net effect: dashboard stuck on `Checking...`, both analyzers unusable | `backend/app/main.py:35-48`; `docker-compose.yml:9-11`; `.env.example:12`; measured preflight 400 → 200 |
| **N-02** | High | `request()` sets `Content-Type: application/json` on **GET** requests, making every readiness poll a preflighted request — an avoidable extra round trip and a second failure mode | `lib/api.ts:29-33` |
| **N-03** | High | **Manifest/lockfile drift.** Six motion packages are present in `node_modules` and `package-lock.json` but absent from `package.json`. A clean `npm install` silently removes the animation stack phase 03 depends on. The repo root also holds a second, script-less `package.json` with the same six dependencies | `frontend/package.json`; `frontend/package-lock.json`; `nlp-lab/package.json`; `npm ls --depth=0` |
| **N-04** | Medium | `docker-compose.yml` builds the frontend from `./frontend/Dockerfile`, which does not exist. No `next.config.*`, no `postcss.config.*`, no frontend `.env.example` | file probe |
| **N-05** | Medium | No page titles or metadata anywhere: the only `<Head>` is the favicon in `_document.tsx`. Browser tab shows the raw URL | `pages/_document.tsx:6`; grep for `next/head`/`<title>` found nothing |
| **N-06** | Medium | The entry overlay is not modal-safe: no `role="dialog"`, no `aria-modal`, no `inert`/`aria-hidden` on the app behind it, no focus move or trap. Keyboard users can tab into links hidden behind the overlay | `components/EntryPreloader.tsx:27-47`; `styles/globals.css:22` |
| **N-07** | Medium | The preloader exposes **simulated** progress through a real `role="progressbar"`, contradicting the "no fake progress" rule and announcing invented percentages to screen readers | `components/ui/animator-title-preloader.tsx:948-951`, `:1155`; `EntryPreloader.tsx:36` |
| **N-08** | Low | Raw float artefacts are surfaced verbatim: the emotion result prints `Threshold: 0.30000000000000004`; the manifest stores `optimal_threshold: 0.30000000000000004` | `artifacts/goemotions_thresholds.json:2`; `pages/analyze/emotions.tsx:5` |
| **N-09** | Low | The emotion result discards `probabilities` (all 28 scores are returned by the API) and shows only above-threshold labels | `pages/analyze/emotions.tsx:5` vs. `ml/go_emotions/inference.py:112-116` |
| **N-10** | Low | **No version control.** `nlp-lab` has no `.git`; an 11-phase rewrite cannot be diffed, reverted, or reviewed per phase | `Test-Path .git` → False |
| **N-11** | Low | Empty `frontend/app/` and `frontend/src/` directories sit beside `pages/`. Harmless today; one file in `app/` switches Next to App Router and breaks the "keep Pages Router" rule | directory probe |
| **N-12** | Info | `reports/research_report.md` is a section skeleton with no results, while `reports/metrics/*.json` and `reports/figures/*.png` contain real numbers — the Documentation page has no narrative source to cite | `reports/research_report.md:1-24` |
| **N-13** | Low | `artifacts/unified_model_manifest.json` embeds absolute Colab Drive paths (`/content/drive/MyDrive/NLP_Lab/...`). Fine as a repo artefact; must be redacted if Model Lab or Documentation render it verbatim | `artifacts/unified_model_manifest.json:6,12` |
| **N-14** | Info | `frontend/eslint.config.mts` and the root `package.json` are both orphaned leftovers; removing them reduces ambiguity for later phases | §2, N-03 |

---

## 5. Why the animation experience still does not appear

Updated chain of causes, now with reproduction status:

1. **Entry gate is route-bound** — only `/` renders `EntryPreloader`. Any direct link into the app skips it entirely. *Reproduced.*
2. **Session gate** — the key is written before the animation runs, so a reload mid-animation suppresses the next attempt and the preloader appears "once per tab" at best. *Reproduced: key `"true"` observed while the overlay was visible.*
3. **Reduced-motion gate** — both the component (`matchMedia`) and the stylesheet (`display: none`) bypass the sequence. *Source-verified only; not reproducible in this tooling.*
4. **No route reveal** — only the 0.2 rem strip. *Confirmed.*
5. **Ink Hero is a static composition** — the wash, ridges, and grain change opacity/scale with scroll, but there is no station choreography, no pinning, no develop, and the caption "Scroll to develop" promises more than the effect delivers. *Confirmed by source; the reference's GSAP/WebGL path is absent.*
6. **Motion stack is undeclared** — GSAP and Framer Motion exist in `node_modules` only because the lockfile drifted; nothing imports them and a clean install removes them. *Confirmed.*

---

## 6. Page-by-page gap analysis (updated)

### Dashboard (`pages/index.tsx`, 59 lines)
Exists: hero copy, two CTAs, Ink Hero wrapper around a sample inference card, three info cards, one readiness fetch.
Missing: real hero entrance, truthful status machine, below-the-fold product narrative, footer, page metadata.
Defects: `:10` swallows errors into `null`; `:54` prints the API enum verbatim (`ready` / `not_ready`) rather than a human state; the sample card is hard-coded.

### Sentiment Analyzer (`pages/analyze/sentiment.tsx`, 6 lines)
Exists: shared form, five probability bars, rating headline.
Missing: analysis loader, abort/timeout/retry, example prompts, clear action, confidence caveat, submitted-text echo, request-id guard.
Contract: correct today (§7).

### Emotion Analyzer (`pages/analyze/emotions.tsx`, 6 lines)
Exists: threshold labels as chips, empty-label message.
Missing: all 28 scores, ranking, threshold explanation, loader, error/timeout states; raw float leak (N-08).

### Model Lab (`pages/model-lab.tsx`, 3 lines)
Missing everything: two pipelines, architecture diagrams, hyperparameters, checkpoints, metrics. **All source material exists** (§8).

### Dataset Explorer (`pages/datasets.tsx`, 3 lines)
Missing everything: source links, schemas, distributions, splits, quality warnings, samples. **All source material exists** (§8).

### Documentation (`pages/documentation.tsx`, 3 lines)
Missing everything: inference sequence, training lifecycle, tool inventory, storage map. Contracts are now verified, so this page can finally be truthful.

### Technology (`/technology`)
Does not exist. No footer. Nav has six entries and an unconditional status badge.

---

## 7. API surface — verified, not assumed

All three endpoints were exercised from origin `http://localhost:3000` against a correctly configured backend. **The frontend types are accurate.**

| Call | Method / path | Request | Verified response | Match |
|---|---|---|---|---|
| `getReadiness` | `GET /readiness` | — | `{"status":"ready","models":{"amazon_rating":{"ready":true,"error":null},"go_emotions":{"ready":true,"error":null}}}` | ✅ |
| `predictAmazon` | `POST /predict/amazon` | `{text}` ≤ 10 000 chars | `{"rating":1,"probabilities":[0.5359,0.3944,0.0654,0.0030,0.0013]}` | ✅ exactly 5 probabilities, `rating` 1–5 |
| `predictEmotions` | `POST /predict/go-emotions` | `{text}` | `{"emotions":[{"label":"gratitude","probability":0.789},{"label":"joy","probability":0.637}],"probabilities":{28 keys},"threshold":0.30000000000000004}` | ✅ |

Additional endpoints the frontend does **not** use yet: `GET /`, `GET /health`, **`GET /metadata`** (service/model cards), and FastAPI's `/docs` + `/openapi.json`.

Error contract: `422` → `{"error":"validation_error","detail":"..."}`; `503` → `{"error":"model_not_ready","detail":"..."}`; `500` → `{"error":"internal_error",...}`. The client reads `detail`, so messages surface correctly.

Model load cost: first readiness call took **8.54 s** on this machine (both models cold-loaded). Any spinner design must tolerate that; the readiness state machine should show a distinct `loading` phase, not a generic "Checking…".

---

## 8. Real artefacts available for phases 05–07

No invented numbers are needed. These are on disk and machine-readable.

### Datasets
- **Amazon Reviews** — Kaggle `yacharki/amazon-reviews-for-sentianalysis-finegrained-csv` (exact slug recorded in `notebooks/00_environment_and_dataset_audit.ipynb`). Schema: `class_index`, `review_title`, `review_text`. Train **3,000,000** rows, perfectly balanced (600 000 per class), 6 parquet chunks. Test **650,000** rows (130 000 per class), 2 chunks. `val_sampled.parquet` and `test_sampled.parquet` also exist.
- **GoEmotions** — `google-research-datasets/go_emotions`, simplified, 28 labels. Train **43,410**, validation **5,426**, test **5,427**. Full per-split class prevalence and labels-per-example distribution in `data/goemotions_data_quality.json` (e.g. train: neutral 14 219, admiration 4 130 … grief 77; 83.6 % of train rows carry exactly one label).
- Source-link URL: `https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv`, `https://huggingface.co/datasets/google-research-datasets/go_emotions`.

### Metrics
- Amazon (`reports/metrics/word2vec_bilstm_test_metrics.json`): baseline acc **0.53792**, macro F1 **0.5333**, weighted F1 **0.5332**, MAE **0.62986**; Word2Vec-initialised: acc **0.53574**, macro F1 **0.53368**, weighted F1 **0.53351**, MAE **0.62246**. Note: Word2Vec is *slightly worse* on accuracy and *better* on MAE — the UI must not claim it wins outright.
- GoEmotions (`reports/metrics/distilbert_goemotions_test_metrics.json`): test macro F1 **0.48395**, micro F1 **0.59172**, hamming **0.03609**, subset accuracy **0.41828**, threshold **0.30**, best val macro F1 **0.49604**. Per-label extremes worth surfacing honestly: gratitude 0.904, amusement 0.816, love 0.805 vs. grief **0.0**, relief **0.0**, pride 0.211, realization 0.254.
- Figures: `reports/figures/amazon_confusion_matrix.png`, `amazon_text_length_dist.png`, `goemotions_token_length_dist.png`.

### Model artefacts
- Amazon: `w2v_bilstm_best.pt` (66.9 MB), `baseline_bilstm_best.pt`, `embedding_matrix.npy` (64.0 MB, shape `(vocab, 200)`), `vocab.json`, Word2Vec Skip-gram model, `w2v_classification_report.json`.
- DistilBERT: `model.safetensors` (267.9 MB), `tokenizer.json`, `config.json` (6 layers, 12 heads, 30522 vocab, `multi_label_classification`), `thresholds.json`.
- ONNX parity exports for both models + `onnx_export_manifest.json` + parity JSONs.
- `artifacts/unified_model_manifest.json` with sha256 digests — **contains absolute Drive paths; redact before rendering** (N-13).

### What is *not* available
- No sample-preview files cleared for display (the `*_sampled.parquet` files are local copies of real reviews; they contain user text — treat as private unless the owner explicitly approves masked samples).
- No inference latency benchmarks, no epoch-level history beyond `*_history.json` (283 bytes each), no deployment topology evidence.
- `reports/research_report.md` has no content to cite (N-12).

---

## 9. Skill availability in this runtime

Requested by the prompt pack → actual status:

| Available and invocable | Available but gated | **Not installed** |
|---|---|---|
| `reference-driven-ui-engineering` (invoked, §10), `web-design-guidelines` (invoked), `sota-app-builder`, `unslop`, `hallmark`, `superdesign`, `emil-design-eng`, `animate`, `choreograph`, `animation-performance`, `mobile-native`, `break-ui`, `playwright-cli`, `auto-qa`, `browser-trace`, `opencode`, `report` | `review-animations` — explicit only, must be named as `@review-animations` | `modern-web-design`, `impeccable`, `typescript-setup`, `typescript-update`, `gsap-react`, `gsap-core`, `gsap-scrolltrigger`, `motion-framer` |
| | `browser` — registered but **denied** by every agent's `skill` and `browser` permissions | |

Consequence: phases 01–09 must not reference `modern-web-design`, `impeccable`, or the GSAP-specific skills as if they exist. The nearest real substitutes are `hallmark` + `unslop` + `emil-design-eng` (design), `animate` + `choreograph` (motion), `reference-driven-ui-engineering` (references), `web-design-guidelines` (a11y), `playwright-cli` (E2E). `browser` can only be used if its deny rule is lifted first.

---

## 10. Skill invocations this phase

| Skill | Result |
|---|---|
| `reference-driven-ui-engineering` | Loaded and applied to the reference audit. Its browser-first workflow could **not** be followed end-to-end: the 21st.dev component install requires an API key and the source is not in the repo. Recorded what was inspectable (reference description: three stations, one ScrollTrigger, authored WebGL dissolve, `gsap` + `@gsap/react`) and what was not (actual source, DOM, computed styles). |
| `web-design-guidelines` | Loaded; its checklist informed N-05, N-06, N-07 and the focus/label notes. Full guideline fetch deferred to phase 09. |
| `opencode` | Loaded earlier for skills/config work; used to confirm which skills are actually registered. |

Not invoked, and not claimed: `sota-app-builder`, `unslop`, `hallmark`, `playwright-cli`. No skill was reported as used without a recorded invocation.

---

## 11. Prioritised plan (ordered by what actually blocks progress)

| # | Work | Why first |
|---|---|---|
| **0** | **Initialise version control** (or take a filesystem snapshot) | 11 phases with no rollback is unacceptable (N-10) |
| **1** | **Fix integration: CORS + request helper + truthful status** | Without it nothing else can be tested end-to-end (N-01, N-02, F-11, F-12) |
| 2 | Stabilise the project: one lint config, manifest/lock sync, page titles, frontend Dockerfile/env, delete empty `app/` + `src/` | Phase 01's real content (N-03…N-05, N-11, F-18) |
| 3 | Global entry gate + preloader lifecycle: mount in `_app`, key on completion, storage guards, modal semantics, honest progress | F-01, F-02, F-14, F-15, N-06, N-07 |
| 4 | Motion system: declare GSAP properly, Ink Hero stations, circle route reveal, three distinct loaders | Phase 03; depends on #1 and #3 |
| 5 | Analyzers: abort/timeout/retry, stale-response guard, all 28 scores, threshold formatting | F-16, F-19, N-08, N-09 |
| 6 | Dataset Explorer from committed artefacts + optional `/datasets/summary` endpoint | All data exists (§8) |
| 7 | Model Lab pipelines from checkpoints, metrics, ONNX parity; redact Drive paths | Same |
| 8 | Documentation: verified contracts, training lifecycle, logical Drive map | Contracts now proven |
| 9 | Technology page, footer, nav, 404, metadata | F-08, N-05 |
| 10 | QA: install Playwright, viewport matrix, reduced-motion emulation, keyboard, stress data | F-19, F-20 |
| 11 | Final release gate | — |

Acceptance for phase 0/1 should be a browser capture showing: readiness badge reflecting `ready` from the live API, one successful sentiment prediction, and one successful emotion prediction — with the console clean.

---

## 12. Verification limits (explicit)

| Check | Result | Note |
|---|---|---|
| Source tree inspected | **PASS** | All 8 pages, 6 components, 2 libs, 2 stylesheets, 2 scripts, configs |
| `tsc --noEmit` | **PASS** | exit 0 |
| `next lint` | **PASS** | but only `.eslintrc.json` is active |
| `next build` | **PASS** | 8 routes, 88.9 kB shared JS |
| Backend unit tests | **PASS** | 5 passed |
| Live API contract | **PASS** | all 3 endpoints, exact shapes |
| Browser: preloader first visit | **PASS** | overlay + Skip present |
| Browser: same-session reload | **PASS** | overlay suppressed |
| Browser: skip button | **PASS** | dismissed < 120 ms, no duplicate |
| Browser: direct secondary route | **PASS** | no overlay (defect confirmed) |
| Browser: reduced motion | **BLOCKED** | no media emulation in this tooling; source-verified only |
| Browser: storage exception | **BLOCKED** | not simulated |
| Browser: responsive matrix | **BLOCKED** | no viewport control; Playwright absent |
| Browser: route transition during navigation | **SKIPPED** | needs scripted navigation timing; low value before F-03 is rebuilt |
| Visual comparison to the 21st.dev reference | **BLOCKED** | reference source gated behind a 21st API key; description only |
| Backend contract compatibility | **PASS** | resolved (was UNKNOWN) |
| Deployment (Docker) | **FAIL (static)** | frontend Dockerfile missing (N-04) |
| Version control history | **BLOCKED** | not a git repository |

---

## 13. Stop-gate statement

No source file, configuration file, or asset was modified in this phase. Three background processes were started only for verification (Next dev on `:3000`, Uvicorn on `:8000`, and a temporary Uvicorn on `:8001` with a corrected CORS allowlist) and were stopped afterwards. The only files written are this report and `reports/ISSUE_TRACKER.csv`.

The next phase can identify itself from the plan above; it must not begin until item 0 and item 1 are accepted, because every later acceptance test depends on a browser that can reach the API.
