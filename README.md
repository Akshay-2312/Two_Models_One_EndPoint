# NLP Lab

Production-grade Natural Language Processing research and deployment workspace.

## Structure

- `configs/`: Application, experiment, and environment configurations.
- `data/`: Dataset manifests, sample metadata, and schema definitions (no raw datasets committed).
- `ml/`: Model training, pipelines, and evaluation routines.
  - `common/`: Shared utilities, tokenizers, evaluation metrics, and base dataset handlers.
  - `amazon_rating/`: Amazon review sentiment and star rating prediction pipeline.
  - `go_emotions/`: Fine-grained emotion classification pipeline.
- `notebooks/`: Exploratory data analysis, prototyping, and experimentation notebooks.
- `backend/`: Fast/scalable serving API (FastAPI) and test suite.
- `frontend/`: Interactive web UI / demo client.
- `artifacts/`: Model cards, checksums, metadata, and export artifacts.
- `reports/`: Research outputs, metrics tables, confusion matrices, failure analysis, and figures.
  - `figures/`: Visualizations, plots, and architecture diagrams.
  - `metrics/`: Benchmark evaluation metrics and logs.
  - `failures/`: Error and failure mode analysis reports.
  - `research_report.md`: Consolidated scientific research report.
- `docs/`: Technical documentation, guides, and API specifications.
- `.github/workflows/`: CI/CD automation pipelines.

## Getting Started

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Docker Compose
Run all services with:
```bash
docker compose up --build
```
