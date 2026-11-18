# NLP Lab

Research workbench for two text-classification models: a Word2Vec-initialized BiLSTM
that predicts Amazon review ratings, and a fine-tuned DistilBERT model that predicts
28 GoEmotions labels. A FastAPI service serves both models; a Next.js (Pages Router)
client runs them, reports real readiness, and shows the model output unchanged.

## Structure

- `configs/`: Application, experiment, and environment configurations.
- `data/`: Dataset manifests, sample metadata, and schema definitions (no raw datasets committed).
- `ml/`: Model training, pipelines, and evaluation routines.
  - `common/`: Shared utilities, tokenizers, evaluation metrics, and base dataset handlers.
  - `amazon_rating/`: Amazon review sentiment and star rating prediction pipeline.
  - `go_emotions/`: Fine-grained emotion classification pipeline.
- `notebooks/`: Exploratory data analysis, prototyping, and experimentation notebooks.
- `backend/`: FastAPI serving layer and test suite.
- `frontend/`: Next.js Pages Router client. This is the only Node project in the repository.
- `artifacts/`: Model cards, checksums, metadata, and export artifacts.
- `reports/`: Research outputs, metrics tables, confusion matrices, failure analysis, and figures.
  - `figures/`: Visualizations, plots, and architecture diagrams.
  - `metrics/`: Benchmark evaluation metrics and logs.
  - `failures/`: Error and failure mode analysis reports.
  - `research_report.md`: Consolidated scientific research report.
- `docs/`: Technical documentation, guides, and API specifications.
- `.github/workflows/`: CI/CD automation pipelines.

## Getting Started

### 1. Environment

Every backend variable has a code default, so a local file is optional:

```bash
cp .env.example .env   # optional: override defaults
```

`CORS_ORIGINS` defaults to the two local Next.js origins, so the browser client works
without extra setup.

### 2. Backend

```bash
python -m venv .venv
.venv/Scripts/activate            # Windows; use source .venv/bin/activate elsewhere
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Readiness: <http://127.0.0.1:8000/readiness>. A cold start loads both model bundles and
takes several seconds.

### 3. Frontend (local development)

Requires Node.js 18+. Start the backend first, then:

```bash
cd frontend
npm ci
npm run dev
```

Open <http://localhost:3000>. The client calls `http://127.0.0.1:8000` by default.
To point it elsewhere, copy `frontend/.env.example` to `frontend/.env.local` and set
`NEXT_PUBLIC_API_URL`. The value is inlined at build time, so restart `npm run dev` or
rebuild after changing it.

### 4. Docker Compose

```bash
docker compose up --build
```

This builds and starts both containers:
- `backend` (`Dockerfile`, FastAPI + Uvicorn on `:8000`)
- `frontend` (`frontend/Dockerfile`, Node 20 Alpine + Next.js production server on `:3000`)

`frontend/Dockerfile` accepts build-time `ARG NEXT_PUBLIC_API_URL=http://localhost:8000`
(inlined during `next build`). To point the containerized client at a different API URL,
pass `--build-arg NEXT_PUBLIC_API_URL=<url>` when building the `frontend` image.

## Checks

Frontend, from `frontend/`:

```bash
npm run lint        # next lint, single .eslintrc.json config
npm run typecheck   # tsc --noEmit
npm test            # motion, storage, entry, design-system, api-states, analyzers, datasets, model-lab & documentation contract tests
npm run build       # next build
npm run verify      # all four, in order
```

Headless Playwright browser smoke check (works without trained weights in `artifacts/models/`):

```bash
node scripts/ci-playwright-smoke.mjs
```

`next build` and `next dev` share `.next/`. Stop the dev server before running `verify` or
`build`, otherwise the running dev server starts failing to resolve its own chunks.

Backend, from the repository root:

```bash
python -m pytest backend/tests -q
python scripts/export_openapi.py --check   # verifies docs/openapi.json matches FastAPI app.openapi()
```

Continuous Integration (`.github/workflows/ci.yml`) runs three jobs on pushes and pull requests to `main`/`master`:
- `test-backend`: runs `pytest backend/tests` and `python scripts/export_openapi.py --check`.
- `test-frontend`: runs `cd frontend && npm run verify`.
- `playwright-smoke`: boots Uvicorn (`127.0.0.1:8000`) and Next.js (`localhost:3000`) and runs `cd frontend && node scripts/ci-playwright-smoke.mjs`.

## Frontend design system

Tokens, primitives and usage rules live in `frontend/DESIGN_SYSTEM.md`.
