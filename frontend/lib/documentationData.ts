/**
 * Sanitized, verified architectural single-source-of-truth data model for `/documentation`.
 *
 * Every version, endpoint, Pydantic schema field, environment variable, metric, and
 * operational policy in this module is grounded in committed repository files and
 * intentionally omits personal paths, Drive folder/file IDs, user IDs, or secrets.
 */

/** Lifecycle status for tools, libraries, and integrations across the repository. */
export type ToolIntegrationStatus =
  | "active"
  | "verified_artifact"
  | "partial"
  | "installed_unused"
  | "proposed";

/** Human-readable labels for each tool integration status badge. */
export const TOOL_STATUS_LABELS: Record<ToolIntegrationStatus, string> = {
  active: "Active",
  verified_artifact: "Verified Artifact",
  partial: "Partial / Discrepancy",
  installed_unused: "Installed (Unused)",
  proposed: "Proposed",
};

/** Verified inventory entry describing a framework, runtime, or CLI tool in NLP Lab. */
export interface ToolIntegrationItem {
  id: string;
  name: string;
  category: "frontend" | "backend" | "ml" | "data" | "infra";
  versionOrSpec: string;
  purpose: string;
  lifecycleStage: string;
  inputs: string[];
  outputs: string[];
  communicatesWith: string[];
  status: ToolIntegrationStatus;
  statusNote: string;
  sourceEvidence: string[];
}

/** Canonical five node categories displayed in the architecture diagram legend. */
export type NodeCategory = "api" | "model" | "dataset" | "saved" | "external";

/** Metadata for each architecture diagram legend category. */
export interface NodeCategoryMeta {
  label: string;
  description: string;
}

/** Exact five legend kinds required across all interactive architecture diagrams. */
export const NODE_CATEGORY_META: Record<NodeCategory, NodeCategoryMeta> = {
  api: {
    label: "API request",
    description: "Browser HTTP client, CORS boundary, or FastAPI route handler.",
  },
  model: {
    label: "Model processing",
    description: "Tokenization, embedding lookup, neural forward pass, or thresholding.",
  },
  dataset: {
    label: "Dataset artifact",
    description: "Dataset ingestion, quality audit manifest, or split metadata.",
  },
  saved: {
    label: "Saved artifact",
    description: "Persisted model weights, vocabularies, ONNX exports, or evaluation JSONs.",
  },
  external: {
    label: "External service",
    description: "Upstream corpus host, Colab compute runtime, Drive sync, or container/CI host.",
  },
};

/** Implementation status badge shown on interactive diagram nodes. */
export type NodeStatus = "implemented" | "partial" | "proposed";

/** Human-readable labels for interactive diagram node lifecycle status. */
export const NODE_STATUS_LABELS: Record<NodeStatus, string> = {
  implemented: "Implemented",
  partial: "Partial",
  proposed: "Proposed",
};

/** Identifiers for the five interactive architecture diagram tabs. */
export type DiagramTabId =
  | "system"
  | "inference"
  | "training"
  | "storage"
  | "deployment";

/** Persistence behavior classification for nodes, particularly in the storage map. */
export type PersistenceBehavior =
  | "Persistent"
  | "Ephemeral"
  | "Excluded from Git"
  | "Runtime Memory"
  | "Build / CI";

/** Clickable node inside an architecture, pipeline, storage, or deployment diagram. */
export interface DiagramNodeSpec {
  id: string;
  label: string;
  subtitle?: string;
  category: NodeCategory;
  status: NodeStatus;
  column?: number;
  group?: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  persistence?: PersistenceBehavior;
  sourceRef: string;
}

/** Directed connection between two nodes inside a diagram tab or training track. */
export interface DiagramEdgeSpec {
  id: string;
  from: string;
  to: string;
  label: string;
  protocolOrFormat?: string;
  status?: NodeStatus;
}

/** Ordered request/response lifecycle step for the live inference sequence view. */
export interface SequenceStepSpec {
  step: number;
  from: string;
  to: string;
  message: string;
  payloadOrDetail: string;
  status: string;
}

/** Independent training-to-serving track shown side-by-side in the training diagram tab. */
export interface TrainingTrackDiagramSpec {
  id: "amazon_rating" | "go_emotions";
  title: string;
  subtitle: string;
  sourceUrl: string;
  nodes: DiagramNodeSpec[];
  edges: DiagramEdgeSpec[];
}

/** Specification for one interactive tab in the `/documentation` architecture explorer. */
export interface DiagramTabSpec {
  id: DiagramTabId;
  label: string;
  kicker: string;
  description: string;
  layout: "flow" | "inference" | "dual_track" | "storage_tree" | "deployment";
  nodes: DiagramNodeSpec[];
  edges: DiagramEdgeSpec[];
  tracks?: TrainingTrackDiagramSpec[];
  sequenceSteps?: SequenceStepSpec[];
}

/** Verified external dataset source and governance summary. */
export interface DatasetSourceSpec {
  id: "amazon_reviews" | "go_emotions";
  name: string;
  task: string;
  primaryUrl: string;
  secondaryUrl: string;
  secondaryLabel: string;
  splitsSummary: string;
  governanceNote: string;
}

/** Verified environment variable specification. */
export interface EnvVarSpec {
  name: string;
  scope: "Backend" | "Frontend";
  exampleValue: string;
  defaultFallback: string;
  behavior: string;
  sourceRef: string;
}

/** Verified FastAPI endpoint contract specification. */
export interface ApiEndpointSpec {
  method: "GET" | "POST";
  path: string;
  summary: string;
  requestSchema: string;
  responseSchema: string;
  responseFields: string[];
  statusCodes: { code: number; meaning: string }[];
  sourceRef: string;
}

/** Verified operational, runtime, and privacy/governance policy entry. */
export interface OperationalPolicySpec {
  id: string;
  title: string;
  category: "Readiness" | "Client Resilience" | "Artifact Provenance" | "Privacy & Governance";
  summary: string;
  details: string[];
  sourceRefs: string[];
}

/** Verified system stack and tool integration matrix. */
export const TOOL_INTEGRATIONS: ToolIntegrationItem[] = [
  {
    id: "nextjs-react-ts",
    name: "Next.js (Pages Router) + React + TypeScript",
    category: "frontend",
    versionOrSpec: "next ^14.2.5 (runtime 14.2.35), react ^18.3.1, typescript ^5.5.3",
    purpose:
      "Serves the web workbench UI across `/`, `/analyze/sentiment`, `/analyze/emotions`, `/model-lab`, `/datasets`, and `/documentation`.",
    lifecycleStage: "Presentation & client state",
    inputs: ["User text input", "NEXT_PUBLIC_API_URL", "FastAPI JSON responses"],
    outputs: ["Accessible SSR/CSR pages", "Interactive charts & analyzers"],
    communicatesWith: ["Browser fetch + AbortController", "GSAP", "Recharts"],
    status: "active",
    statusNote: "Implemented and running in `frontend/` with strict TypeScript enabled.",
    sourceEvidence: ["frontend/package.json", "frontend/package-lock.json", "frontend/tsconfig.json"],
  },
  {
    id: "fetch-abort-client",
    name: "Browser fetch + AbortController",
    category: "frontend",
    versionOrSpec: "Web Fetch API + AbortController (4s stall / 30s analyzer timeout)",
    purpose:
      "Typed HTTP/JSON client handling readiness polling (60s timeout), analyzer submissions (4s stall warning, 30s abort), and summary/lab fetches (4s stall, 15s timeout) while omitting `Content-Type` on GETs to prevent CORS preflights.",
    lifecycleStage: "Client-to-API transport",
    inputs: ["RequestInit { signal }", "Trimmed prompt text", "API_BASE_URL"],
    outputs: ["Typed JSON payloads", "Structured ApiError / offline / timeout / cancelled states"],
    communicatesWith: ["FastAPI + Uvicorn + Pydantic", "AnalyzerForm", "ReadinessProvider"],
    status: "active",
    statusNote: "Active across `lib/api.ts`, `AnalyzerForm.tsx`, `ReadinessProvider.tsx`, `useDatasetSummary.ts`, and `useModelLab.ts`.",
    sourceEvidence: [
      "frontend/lib/api.ts",
      "frontend/components/AnalyzerForm.tsx",
      "frontend/components/ReadinessProvider.tsx",
    ],
  },
  {
    id: "gsap-scrolltrigger",
    name: "GSAP + @gsap/react + ScrollTrigger",
    category: "frontend",
    versionOrSpec: "gsap ^3.15.1, @gsap/react ^2.1.2, ScrollTrigger",
    purpose:
      "Drives desktop (`min-width: 768px`) pipeline node/edge wave animations and subtle hero parallax with `prefers-reduced-motion: reduce` static fallbacks.",
    lifecycleStage: "Desktop motion choreography",
    inputs: ["useReducedMotion()", "Component scope ref", "ScrollTrigger viewport triggers"],
    outputs: ["GPU-composited transform/opacity & SVG strokeDashoffset animations"],
    communicatesWith: ["PipelineTrack", "Model Lab hero", "MotionProvider"],
    status: "active",
    statusNote: "Active with `useScopedGSAP` and `revertOnUpdate: true`; automatically disabled under reduced motion.",
    sourceEvidence: [
      "frontend/package.json",
      "frontend/lib/motion.ts",
      "frontend/components/PipelineTrack.tsx",
      "frontend/pages/model-lab.tsx",
    ],
  },
  {
    id: "recharts",
    name: "Recharts",
    category: "frontend",
    versionOrSpec: "recharts ^3.11.0",
    purpose:
      "Renders responsive dataset class distribution, 28-emotion prevalence, multi-label cardinality, and verified sequence length quantile charts on `/datasets`.",
    lifecycleStage: "Dataset visualization",
    inputs: ["DatasetSummaryResponse splits, distributions, and text_length_stats"],
    outputs: ["Responsive SVG bar charts with token-styled tooltips"],
    communicatesWith: ["DatasetCharts", "pages/datasets.tsx"],
    status: "active",
    statusNote: "Active on `/datasets` with client-mount SSR guards and reduced-motion support.",
    sourceEvidence: ["frontend/package.json", "frontend/components/DatasetCharts.tsx"],
  },
  {
    id: "unused-motion-runtimes",
    name: "framer-motion / motion, lenis, lottie-react, @rive-app/react-canvas",
    category: "frontend",
    versionOrSpec:
      "framer-motion ^14.14.0, motion ^14.14.0, lenis ^1.3.27, lottie-react ^3.1.2, @rive-app/react-canvas ^4.39.0",
    purpose:
      "Declared in `frontend/package.json`; `framer-motion` is imported only inside `components/ui/hero-parallax.tsx`, while `motion`, `lenis`, `lottie-react`, and `@rive-app/react-canvas` are unused across active pages. GSAP and CSS own active application motion.",
    lifecycleStage: "Declared frontend dependencies",
    inputs: ["frontend/package.json manifest entries"],
    outputs: ["None in active analyzers, Dataset Explorer, or Model Lab"],
    communicatesWith: ["components/ui/hero-parallax.tsx (framer-motion only)"],
    status: "installed_unused",
    statusNote:
      "Present in `frontend/package.json` but excluded from active motion paths where GSAP + CSS govern transitions and animations.",
    sourceEvidence: ["frontend/package.json", "frontend/components/ui/hero-parallax.tsx"],
  },
  {
    id: "fastapi-uvicorn-pydantic",
    name: "FastAPI + Uvicorn + Pydantic",
    category: "backend",
    versionOrSpec: "fastapi >=0.110.0, uvicorn[standard] >=0.28.0, pydantic >=2.6.0",
    purpose:
      "Exposes the HTTP inference, readiness, metadata, dataset summary, and Model Lab API on `:8000` with `CORSMiddleware` and global 422/500 exception handlers.",
    lifecycleStage: "Live API serving",
    inputs: ["HTTP GET/POST requests", "TextRequest JSON (`min_length=1`, `max_length=10,000`)", "Repo JSON artifacts"],
    outputs: ["Typed JSON responses (`200`, `404`, `422`, `500`, `503`)"],
    communicatesWith: ["Browser fetch client", "AmazonInference", "GoEmotionsInference", "data/*.json"],
    status: "active",
    statusNote: "Active serving layer with strict request validation (`extra='forbid'`) and CORS allowlist.",
    sourceEvidence: ["backend/requirements.txt", "backend/app/main.py", "backend/app/schemas.py"],
  },
  {
    id: "pytorch",
    name: "PyTorch",
    category: "ml",
    versionOrSpec: "torch >=2.2.0 (runtime); 2.14.1+cu130 on Tesla T4 in Colab",
    purpose:
      "Trains both neural architectures in Colab and executes live inference for Word2Vec BiLSTM (`w2v_bilstm_best.pt`) and DistilBERT (`model.safetensors`) on `MODEL_DEVICE` (`cpu` default).",
    lifecycleStage: "Training & live CPU/GPU inference",
    inputs: ["Token ID tensors", "Trained weights (`w2v_bilstm_best.pt`, `model.safetensors`)"],
    outputs: ["5-class softmax probabilities", "28-label sigmoid probabilities"],
    communicatesWith: ["AmazonInference", "GoEmotionsInference", "onnx_export.py"],
    status: "active",
    statusNote: "Active runtime for both prediction endpoints; Colab training used CUDA T4 while local serving defaults to `cpu`.",
    sourceEvidence: [
      "backend/requirements.txt",
      "reports/environment.json",
      "ml/amazon_rating/inference.py",
      "ml/go_emotions/inference.py",
    ],
  },
  {
    id: "gensim",
    name: "Gensim",
    category: "ml",
    versionOrSpec: "gensim >=4.3,<5",
    purpose:
      "Trains Word2Vec Skip-gram embeddings (`vector_size=200`, `window=5`, `min_count=3`, `negative=10`, `epochs=5`) and tokenizes Amazon reviews at inference via `gensim.utils.simple_preprocess(..., deacc=True)`.",
    lifecycleStage: "Track A tokenization & embedding training",
    inputs: ["Raw review text", "Sampled training corpus"],
    outputs: ["Normalized word tokens", "200-d Skip-gram vectors (`amazon_word2vec_skipgram.model`)"],
    communicatesWith: ["ml/amazon_rating/inference.py", "Notebooks 01"],
    status: "partial",
    statusNote:
      "Required at runtime by `ml/amazon_rating/inference.py` and pinned in `configs/requirement.txt`, but omitted from `backend/requirements.txt` (install via `configs/requirement.txt` or separately so Amazon inference loads cleanly).",
    sourceEvidence: [
      "configs/requirement.txt",
      "backend/requirements.txt",
      "ml/amazon_rating/inference.py",
    ],
  },
  {
    id: "hf-transformers",
    name: "Hugging Face Transformers + safetensors + tokenizers",
    category: "ml",
    versionOrSpec: "transformers >=4.38.0 (with safetensors >=0.4,<1 & tokenizers >=0.15,<1)",
    purpose:
      "Tokenizes comments (`max_length=128`, `truncation=True`) with `AutoTokenizer` and serves the fine-tuned 28-label `distilbert-base-uncased` sequence classifier.",
    lifecycleStage: "Track B tokenization & inference",
    inputs: ["Comment string", "artifacts/models/distilbert_goemotions/*"],
    outputs: ["WordPiece input tensors", "28-label classification logits"],
    communicatesWith: ["GoEmotionsInference", "PyTorch"],
    status: "active",
    statusNote: "Active in `POST /predict/go-emotions`; `safetensors` and `tokenizers` are pinned explicitly in `configs/requirement.txt`.",
    sourceEvidence: [
      "backend/requirements.txt",
      "configs/requirement.txt",
      "ml/go_emotions/inference.py",
    ],
  },
  {
    id: "datasets-kagglehub",
    name: "Hugging Face Datasets (`load_dataset`) & KaggleHub (`kagglehub`)",
    category: "data",
    versionOrSpec: "datasets + kagglehub (Notebook 00 ingestion)",
    purpose:
      "Ingests Hugging Face `google-research-datasets/go_emotions` (`simplified`) and Kaggle `yacharki/amazon-reviews-for-sentianalysis-finegrained-csv` during Colab dataset audit and training.",
    lifecycleStage: "Offline dataset ingestion & audit",
    inputs: ["External Kaggle & Hugging Face Hub dataset identifiers"],
    outputs: ["Audited split schemas & quality manifests (`data/*.json`)"],
    communicatesWith: ["Notebook 00", "Notebook 01", "Notebook 02"],
    status: "verified_artifact",
    statusNote: "Verified in notebooks and committed audit artifacts; not invoked by the live FastAPI server.",
    sourceEvidence: [
      "notebooks/00_environment_and_dataset_audit.ipynb",
      "data/dataset_explorer_summary.json",
    ],
  },
  {
    id: "onnx-onnxruntime",
    name: "ONNX (`opset_version=17`) + ONNX Runtime (`CPUExecutionProvider`)",
    category: "ml",
    versionOrSpec: "onnx >=1.16,<2, onnxruntime >=1.18,<2, opset_version=17",
    purpose:
      "Exports both PyTorch models to `.onnx` graphs and verifies CPU logit parity against PyTorch (`max_absolute_error <= 1e-4`: `1.19e-7` Amazon, `3.34e-6` GoEmotions).",
    lifecycleStage: "Offline export & parity verification",
    inputs: ["Trained PyTorch models & sample tensors"],
    outputs: ["amazon_bilstm.onnx", "goemotions_distilbert.onnx", "onnx_export_manifest.json"],
    communicatesWith: ["ml/common/onnx_export.py", "scripts/export_and_check_onnx.py"],
    status: "verified_artifact",
    statusNote:
      "Verified for offline export and parity validation; NOT active in FastAPI live prediction endpoints, which run PyTorch directly.",
    sourceEvidence: [
      "ml/common/onnx_export.py",
      "configs/requirement.txt",
      "artifacts/models/onnx/onnx_export_manifest.json",
    ],
  },
  {
    id: "docker-compose",
    name: "Docker & Docker Compose",
    category: "infra",
    versionOrSpec: "Dockerfile (python:3.11-slim) + frontend/Dockerfile (node:20-alpine) + docker-compose.yml",
    purpose:
      "Containerizes both the FastAPI backend on `:8000` and the Next.js frontend on `:3000` with `NEXT_PUBLIC_API_URL=http://localhost:8000`, excluding build caches via `frontend/.dockerignore`.",
    lifecycleStage: "Container orchestration",
    inputs: [
      "Dockerfile",
      "frontend/Dockerfile",
      "frontend/.dockerignore",
      "docker-compose.yml",
      "backend/requirements.txt",
    ],
    outputs: ["nlp-lab-backend container (`:8000`)", "nlp-lab-frontend container (`:3000`)"],
    communicatesWith: ["FastAPI + Uvicorn", "Next.js Pages Router", "Local workspace bind mounts"],
    status: "active",
    statusNote:
      "Active container stack: both root `Dockerfile` (`python:3.11-slim`) and `frontend/Dockerfile` (`node:20-alpine`) exist and wire into `docker-compose.yml`, with `frontend/.dockerignore` excluding `node_modules` and `.next` build caches.",
    sourceEvidence: [
      "Dockerfile",
      "frontend/Dockerfile",
      "frontend/.dockerignore",
      "docker-compose.yml",
      "README.md",
    ],
  },
  {
    id: "github-actions-ci",
    name: "GitHub Actions CI",
    category: "infra",
    versionOrSpec: "ubuntu-latest · test-backend (Python 3.11) + test-frontend (Node 20) + playwright-smoke",
    purpose:
      "Runs `test-backend` (`pytest backend/tests` + `python scripts/export_openapi.py --check`), `test-frontend` (`cd frontend && npm ci && npm run verify`), and `playwright-smoke` (`frontend/scripts/ci-playwright-smoke.mjs`) on pushes and pull requests targeting `main` or `master`.",
    lifecycleStage: "Continuous integration",
    inputs: [
      ".github/workflows/ci.yml",
      "backend/tests/test_main.py",
      "scripts/export_openapi.py",
      "frontend/package.json",
      "frontend/scripts/ci-playwright-smoke.mjs",
    ],
    outputs: [
      "Backend pytest & OpenAPI schema check",
      "Frontend verify gate (lint, typecheck, test, build)",
      "Playwright end-to-end smoke status",
    ],
    communicatesWith: ["GitHub repository workflow", "FastAPI TestClient", "Next.js + Playwright Chromium"],
    status: "active",
    statusNote:
      "Active 3-job workflow in `.github/workflows/ci.yml`: `test-backend` (`pytest backend/tests` + `python scripts/export_openapi.py --check`), `test-frontend` (`cd frontend && npm ci && npm run verify`), and `playwright-smoke` (`frontend/scripts/ci-playwright-smoke.mjs`).",
    sourceEvidence: [
      ".github/workflows/ci.yml",
      "backend/tests/test_main.py",
      "scripts/export_openapi.py",
      "frontend/package.json",
      "frontend/scripts/ci-playwright-smoke.mjs",
    ],
  },
  {
    id: "openapi-schema-export",
    name: "OpenAPI Schema Export (docs/openapi.json)",
    category: "backend",
    versionOrSpec: "scripts/export_openapi.py --check + docs/openapi.json",
    purpose:
      "Exports deterministic FastAPI OpenAPI JSON to `docs/openapi.json` and guards against undocumented API contract drift in both `pytest` and GitHub Actions CI.",
    lifecycleStage: "API contract verification",
    inputs: ["backend/app/main.py", "backend/app/schemas.py", "scripts/export_openapi.py"],
    outputs: ["docs/openapi.json", "CI & pytest schema drift check"],
    communicatesWith: ["FastAPI + Uvicorn + Pydantic", "GitHub Actions CI"],
    status: "active",
    statusNote:
      "Active and verified: `scripts/export_openapi.py --check` runs in `test-backend` CI and `test_openapi_schema_matches_committed_export` in `backend/tests/test_main.py`.",
    sourceEvidence: ["docs/openapi.json", "scripts/export_openapi.py", "backend/tests/test_main.py", ".github/workflows/ci.yml"],
  },
  {
    id: "onnx-runtime-api-serving",
    name: "ONNX Runtime API Serving",
    category: "ml",
    versionOrSpec: "onnxruntime CPUExecutionProvider (proposed FastAPI backend)",
    purpose:
      "Would swap live FastAPI `/predict/amazon` and `/predict/go-emotions` execution from PyTorch model wrappers to the parity-verified `.onnx` graphs.",
    lifecycleStage: "Proposed runtime optimization",
    inputs: ["artifacts/models/onnx/amazon_bilstm.onnx", "artifacts/models/onnx/goemotions_distilbert.onnx"],
    outputs: ["Proposed low-overhead CPU inference runtime in FastAPI"],
    communicatesWith: ["FastAPI + Uvicorn + Pydantic", "ONNX (`opset_version=17`) + ONNX Runtime (`CPUExecutionProvider`)"],
    status: "proposed",
    statusNote:
      "Proposed only: ONNX logit parity is verified offline (`ml/common/onnx_export.py`), while live FastAPI `/predict/*` endpoints still execute PyTorch checkpoints (`AmazonInference` and `GoEmotionsInference`).",
    sourceEvidence: [
      "ml/common/onnx_export.py",
      "artifacts/models/onnx/onnx_export_manifest.json",
      "backend/app/main.py",
    ],
  },
  {
    id: "sync-drive-cli",
    name: "sync_drive.py",
    category: "data",
    versionOrSpec: "Python CLI wrapping `gdrive` readonly downloads",
    purpose:
      "Optional repository sync utility that pulls sanitized manifests, notebooks, figures, evaluation reports, and model weights from the remote Drive workspace into local repo directories.",
    lifecycleStage: "Artifact synchronization",
    inputs: ["Remote Drive workspace artifact references", "--notebooks / --weights / --model flags"],
    outputs: ["Synced manifests, reports, notebooks, figures, and weight files"],
    communicatesWith: ["Google Drive NLP Lab Workspace", "Local Repository"],
    status: "verified_artifact",
    statusNote: "Verified utility script for manual artifact syncing; never invoked by the live API or frontend.",
    sourceEvidence: ["sync_drive.py"],
  },
];

/** Five interactive diagram tabs powering the `/documentation` architecture explorer. */
export const DIAGRAM_TABS: DiagramTabSpec[] = [
  {
    id: "system",
    label: "System Architecture",
    kicker: "DIAG-01 / SYSTEM TOPOLOGY",
    description:
      "End-to-end view connecting the Next.js Pages Router client, typed fetch boundary, FastAPI service, PyTorch inference loaders, JSON manifests, and external data/compute sources.",
    layout: "flow",
    nodes: [
      {
        id: "sys-browser-ui",
        label: "Browser UI (Next.js Pages Router)",
        subtitle: "/, /analyze/*, /model-lab, /datasets, /documentation",
        category: "api",
        status: "implemented",
        column: 1,
        summary:
          "Client application served on `:3000` providing sentiment & emotion analyzers, Model Lab, Dataset Explorer, and this Architecture Reference.",
        inputs: ["User text & navigation", "NEXT_PUBLIC_API_URL"],
        outputs: ["Typed API requests", "Accessible charts & meters"],
        persistence: "Runtime Memory",
        sourceRef: "frontend/pages/*",
      },
      {
        id: "sys-api-client",
        label: "Frontend API Client (lib/api.ts)",
        subtitle: "fetch + AbortController (4s stall / 30s abort)",
        category: "api",
        status: "implemented",
        column: 2,
        summary:
          "Centralized fetch wrapper handling readiness checks, prediction POSTs, summary/lab GETs, and structured error classification.",
        inputs: ["RequestInit { signal }", "JSON payloads"],
        outputs: ["ApiError | StructuredApiError", "Validated TS DTOs"],
        persistence: "Runtime Memory",
        sourceRef: "frontend/lib/api.ts",
      },
      {
        id: "sys-fastapi",
        label: "FastAPI Service (:8000)",
        subtitle: "CORSMiddleware + global 422/500 handlers",
        category: "api",
        status: "implemented",
        column: 3,
        summary:
          "Python API serving health/readiness probes, dataset/model metadata endpoints, and live prediction routes with Pydantic validation.",
        inputs: ["HTTP GET/POST", "CORS_ORIGINS"],
        outputs: ["JSON responses (200/404/422/500/503)"],
        persistence: "Runtime Memory",
        sourceRef: "backend/app/main.py",
      },
      {
        id: "sys-model-loaders",
        label: "Inference Loaders (PyTorch)",
        subtitle: "AmazonInference & GoEmotionsInference",
        category: "model",
        status: "implemented",
        column: 4,
        summary:
          "Lazy-loaded PyTorch inference wrappers reading `vocab.json` + `embedding_matrix.npy` + `w2v_bilstm_best.pt` and `model.safetensors` + `thresholds.json`.",
        inputs: ["AMAZON_MODEL_DIR", "GOEMOTIONS_MODEL_DIR", "MODEL_DEVICE"],
        outputs: ["Rating softmax [5]", "28 sigmoid scores >= 0.30"],
        persistence: "Runtime Memory",
        sourceRef: "ml/amazon_rating/inference.py, ml/go_emotions/inference.py",
      },
      {
        id: "sys-json-manifests",
        label: "JSON Manifest Loaders",
        subtitle: "data/*.json & reports/metrics/*.json",
        category: "dataset",
        status: "implemented",
        column: 4,
        summary:
          "Reads committed dataset quality audits, dataset explorer summaries, Model Lab pipeline manifests, and evaluation reports directly from `REPO_ROOT`.",
        inputs: ["data/dataset_explorer_summary.json", "data/model_lab_artifacts.json"],
        outputs: ["/statistics, /datasets/summary, /models/lab payloads"],
        persistence: "Persistent",
        sourceRef: "backend/app/main.py",
      },
      {
        id: "sys-external-corpora",
        label: "External Corpus Hosts",
        subtitle: "Kaggle Amazon Reviews & HF GoEmotions",
        category: "external",
        status: "implemented",
        column: 5,
        summary:
          "Upstream public benchmarks ingested offline in Colab Notebook 00; raw records are never redistributed by the FastAPI service.",
        inputs: ["kagglehub & datasets.load_dataset"],
        outputs: ["Offline training splits & audited manifests"],
        persistence: "Excluded from Git",
        sourceRef: "notebooks/00_environment_and_dataset_audit.ipynb",
      },
      {
        id: "sys-colab-drive",
        label: "Colab + Drive Workspace Sync",
        subtitle: "NLP Lab Workspace -> sync_drive.py",
        category: "external",
        status: "implemented",
        column: 5,
        summary:
          "Colab T4 training persists weights, figures, and reports into the logical Google Drive workspace; `sync_drive.py` pulls sanitized artifacts locally.",
        inputs: ["Colab training outputs", "sync_drive.py CLI"],
        outputs: ["artifacts/*, reports/*, data/*.json, notebooks/*"],
        persistence: "Persistent",
        sourceRef: "sync_drive.py",
      },
      {
        id: "sys-frontend-dockerfile",
        label: "frontend/Dockerfile (Compose UI)",
        subtitle: "node:20-alpine + .dockerignore",
        category: "external",
        status: "implemented",
        column: 5,
        summary:
          "Production Node 20 Alpine container definition (`frontend/Dockerfile`) wired into `docker-compose.yml` with `frontend/.dockerignore` excluding build caches.",
        inputs: ["frontend/package.json", "frontend/package-lock.json", "frontend/.dockerignore"],
        outputs: ["nlp-lab-frontend container (:3000)"],
        persistence: "Build / CI",
        sourceRef: "frontend/Dockerfile, frontend/.dockerignore, docker-compose.yml",
      },
      {
        id: "sys-github-actions-ci",
        label: "GitHub Actions CI",
        subtitle: "test-backend + test-frontend + playwright-smoke",
        category: "external",
        status: "implemented",
        column: 5,
        summary:
          "Runs `test-backend` (`pytest backend/tests` + `python scripts/export_openapi.py --check`), `test-frontend` (`cd frontend && npm ci && npm run verify`), and `playwright-smoke` (`frontend/scripts/ci-playwright-smoke.mjs`).",
        inputs: [".github/workflows/ci.yml", "backend/tests/test_main.py", "frontend/package.json"],
        outputs: ["CI status & docs/openapi.json schema verification"],
        persistence: "Build / CI",
        sourceRef: ".github/workflows/ci.yml, scripts/export_openapi.py, docs/openapi.json",
      },
      {
        id: "sys-onnx-serving-proposed",
        label: "Live ONNX Runtime Serving (Proposed)",
        subtitle: "onnxruntime CPUExecutionProvider (offline parity only)",
        category: "model",
        status: "proposed",
        column: 4,
        summary:
          "ONNX exports (`opset_version=17`) pass offline CPU logit parity checks, while live FastAPI `/predict/*` endpoints still execute PyTorch checkpoints directly.",
        inputs: ["artifacts/models/onnx/*.onnx", "ml/common/onnx_export.py"],
        outputs: ["Proposed low-overhead CPU inference runtime"],
        persistence: "Runtime Memory",
        sourceRef: "ml/common/onnx_export.py, artifacts/models/onnx/onnx_export_manifest.json",
      },
    ],
    edges: [
      {
        id: "sys-e1",
        from: "sys-browser-ui",
        to: "sys-api-client",
        label: "Hooks & form submits",
        protocolOrFormat: "TypeScript calls",
      },
      {
        id: "sys-e2",
        from: "sys-api-client",
        to: "sys-fastapi",
        label: "HTTP/JSON over CORS",
        protocolOrFormat: "GET / POST",
      },
      {
        id: "sys-e3",
        from: "sys-fastapi",
        to: "sys-model-loaders",
        label: "Lazy _load_model() & predict()",
        protocolOrFormat: "PyTorch CPU/CUDA",
      },
      {
        id: "sys-e4",
        from: "sys-fastapi",
        to: "sys-json-manifests",
        label: "Reads committed manifests",
        protocolOrFormat: "UTF-8 JSON",
      },
      {
        id: "sys-e5",
        from: "sys-external-corpora",
        to: "sys-colab-drive",
        label: "Offline Notebook 00 ingestion",
        protocolOrFormat: "KaggleHub / HF Datasets",
      },
      {
        id: "sys-e6",
        from: "sys-colab-drive",
        to: "sys-json-manifests",
        label: "sync_drive.py pulls manifests & weights",
        protocolOrFormat: "Sanitized repo files",
      },
      {
        id: "sys-e7",
        from: "sys-frontend-dockerfile",
        to: "sys-browser-ui",
        label: "Builds Compose frontend (:3000)",
        protocolOrFormat: "Docker Compose",
      },
      {
        id: "sys-e8",
        from: "sys-github-actions-ci",
        to: "sys-fastapi",
        label: "Verifies API, OpenAPI & UI",
        protocolOrFormat: "GitHub Actions",
      },
      {
        id: "sys-e9",
        from: "sys-fastapi",
        to: "sys-onnx-serving-proposed",
        label: "Proposed live runtime swap",
        protocolOrFormat: "ONNX Runtime",
        status: "proposed",
      },
    ],
  },
  {
    id: "inference",
    label: "Live Inference Flow",
    kicker: "DIAG-02 / REQUEST LIFECYCLE",
    description:
      "Request path from browser submission through CORS, Pydantic TextRequest validation, lazy model loading, PyTorch inference, and client-side stall/timeout recovery.",
    layout: "inference",
    nodes: [
      {
        id: "inf-browser",
        label: "Analyzer / Readiness UI",
        subtitle: "AnalyzerForm.tsx & ReadinessProvider.tsx",
        category: "api",
        status: "implemented",
        summary:
          "Trims input, blocks empty submissions locally, guards against concurrent submits, and starts 4s stall + 30s abort timers.",
        inputs: ["User review or comment text"],
        outputs: ["Trimmed string (<= 10,000 chars)", "AbortSignal"],
        sourceRef: "frontend/components/AnalyzerForm.tsx",
      },
      {
        id: "inf-fetch",
        label: "lib/api.ts Fetch Wrapper",
        subtitle: "Preflight-safe GETs & JSON POSTs",
        category: "api",
        status: "implemented",
        summary:
          "Attaches `Content-Type: application/json` only when a request body exists, preserving simple CORS GETs for `/readiness`.",
        inputs: ["Endpoint path", "RequestInit"],
        outputs: ["HTTP request", "Classified ApiError / timeout / offline"],
        sourceRef: "frontend/lib/api.ts",
      },
      {
        id: "inf-cors",
        label: "CORSMiddleware",
        subtitle: "Allowlisted localhost:3000 / 127.0.0.1:3000",
        category: "api",
        status: "implemented",
        summary:
          "Permits `GET` and `POST` methods with `Content-Type` and `Authorization` headers from origins listed in `CORS_ORIGINS`.",
        inputs: ["Origin header", "CORS_ORIGINS env var"],
        outputs: ["CORS response headers"],
        sourceRef: "backend/app/main.py",
      },
      {
        id: "inf-routes",
        label: "FastAPI Validation & Routing",
        subtitle: "GET /readiness | POST /predict/*",
        category: "api",
        status: "implemented",
        summary:
          "Validates `TextRequest` (`min_length=1`, `max_length=10,000`, `extra='forbid'`), returning 422 on invalid input or 503 on unready weights.",
        inputs: ["TextRequest JSON"],
        outputs: ["Validated text", "422 / 503 / 500 JSON errors"],
        sourceRef: "backend/app/main.py, backend/app/schemas.py",
      },
      {
        id: "inf-amazon-loader",
        label: "AmazonInference (BiLSTM)",
        subtitle: "vocab.json + embedding_matrix.npy + w2v_bilstm_best.pt",
        category: "model",
        status: "implemented",
        summary:
          "Tokenizes via Gensim `simple_preprocess(..., deacc=True)` up to 256 tokens, maps IDs with `<PAD>=0`/`<UNK>=1`, and applies softmax over 5 star classes.",
        inputs: ["Validated text string"],
        outputs: ["{ rating: 1..5, probabilities: float[5] }"],
        sourceRef: "ml/amazon_rating/inference.py",
      },
      {
        id: "inf-goemotions-loader",
        label: "GoEmotionsInference (DistilBERT)",
        subtitle: "AutoTokenizer + model.safetensors + thresholds.json",
        category: "model",
        status: "implemented",
        summary:
          "Tokenizes with `max_length=128`, computes 28 independent sigmoid scores, and filters active emotions at `global_threshold=0.30`.",
        inputs: ["Validated text string"],
        outputs: ["{ emotions, probabilities, threshold }"],
        sourceRef: "ml/go_emotions/inference.py",
      },
      {
        id: "inf-ui-render",
        label: "Meter & Chart Result UI",
        subtitle: "Unmodified backend probabilities",
        category: "saved",
        status: "implemented",
        summary:
          "Renders exact backend `rating`, `emotions`, `probabilities`, and `threshold` values with stale-input banners when text changes post-submit.",
        inputs: ["AmazonPrediction | GoEmotionsPrediction"],
        outputs: ["Star rating breakdown / multi-label emotion list"],
        sourceRef: "frontend/pages/analyze/sentiment.tsx, emotions.tsx",
      },
    ],
    edges: [
      { id: "inf-e1", from: "inf-browser", to: "inf-fetch", label: "Submit with AbortSignal" },
      { id: "inf-e2", from: "inf-fetch", to: "inf-cors", label: "HTTP GET / POST" },
      { id: "inf-e3", from: "inf-cors", to: "inf-routes", label: "Origin verified" },
      { id: "inf-e4", from: "inf-routes", to: "inf-amazon-loader", label: "POST /predict/amazon" },
      { id: "inf-e5", from: "inf-routes", to: "inf-goemotions-loader", label: "POST /predict/go-emotions" },
      { id: "inf-e6", from: "inf-amazon-loader", to: "inf-ui-render", label: "AmazonPrediction JSON" },
      { id: "inf-e7", from: "inf-goemotions-loader", to: "inf-ui-render", label: "GoEmotionsPrediction JSON" },
    ],
    sequenceSteps: [
      {
        step: 1,
        from: "ReadinessProvider",
        to: "FastAPI GET /readiness",
        message: "Poll backend & trigger lazy bundle load",
        payloadOrDetail: "GET /readiness (no Content-Type header to avoid CORS preflight; 60s cold-start timeout)",
        status: "200 OK",
      },
      {
        step: 2,
        from: "AnalyzerForm",
        to: "lib/api.ts",
        message: "Validate non-empty input & arm timers",
        payloadOrDetail: "Trimmed text (<= 10,000 chars), AbortController signal, 4s stall timer, 30s abort timer",
        status: "Pending",
      },
      {
        step: 3,
        from: "AnalyzerForm (4s timer)",
        to: "UI Callout / Loader",
        message: "Warn user if cold start or CPU inference exceeds 4s",
        payloadOrDetail: "Phase transitions pending -> stalled; Cancel button aborts in-flight fetch cleanly",
        status: "4s Stall Notice",
      },
      {
        step: 4,
        from: "AnalyzerForm (30s timer)",
        to: "AbortController",
        message: "Abort hung prediction request",
        payloadOrDetail: "controller.abort() triggers AbortError classified as kind: 'timeout'",
        status: "30s Timeout",
      },
      {
        step: 5,
        from: "FastAPI RequestValidationError",
        to: "lib/api.ts",
        message: "Reject empty, >10,000-char, or extra-field payloads",
        payloadOrDetail: "{ error: 'validation_error', detail: '<field>: <msg>' } (TextRequest extra='forbid')",
        status: "422 Validation",
      },
      {
        step: 6,
        from: "_load_model()",
        to: "FastAPI /predict/*",
        message: "Report missing weights, vocab, thresholds, or Gensim dependency",
        payloadOrDetail: "{ error: 'model_not_ready', detail: '<missing artifact or dependency>' }",
        status: "503 Unavailable",
      },
      {
        step: 7,
        from: "Global Exception Handler",
        to: "lib/api.ts",
        message: "Catch unexpected runtime exceptions safely",
        payloadOrDetail: "{ error: 'internal_error', detail: 'Internal server error.' }",
        status: "500 Error",
      },
      {
        step: 8,
        from: "PyTorch Inference Loader",
        to: "Result UI",
        message: "Return raw probabilities & predictions",
        payloadOrDetail: "AmazonPrediction { rating, probabilities[5] } or GoEmotionsPrediction { emotions, probabilities, threshold: 0.30 }",
        status: "200 OK",
      },
    ],
  },
  {
    id: "training",
    label: "Training & Export Tracks",
    kicker: "DIAG-03 / DUAL-TRACK PIPELINES",
    description:
      "Two strictly independent model tracks: Word2Vec Skip-gram + BiLSTM for 5-star Amazon ratings (Track A) and fine-tuned DistilBERT for 28-label GoEmotions (Track B).",
    layout: "dual_track",
    nodes: [],
    edges: [],
    tracks: [
      {
        id: "amazon_rating",
        title: "Track A: Word2Vec + 2-Layer BiLSTM",
        subtitle: "Five-class ordinal review rating classification (1–5 stars)",
        sourceUrl:
          "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv",
        nodes: [
          {
            id: "tr-a-kaggle",
            label: "Kaggle Amazon Reviews",
            subtitle: "3,000,000 train / 650,000 test",
            category: "external",
            status: "implemented",
            summary:
              "Balanced 5-class review corpus (`class_index`, `review_title`, `review_text`) ingested in Notebook 00.",
            inputs: ["kagglehub dataset slug"],
            outputs: ["Full corpus parquet chunks"],
            sourceRef: "data/dataset_explorer_summary.json",
          },
          {
            id: "tr-a-split",
            label: "NB00 Audit & <256w Sampled Splits",
            subtitle: "450k train / 50k val / 50k test",
            category: "dataset",
            status: "partial",
            summary:
              "Audited 188/26 null titles and 0 null texts; sampled 100k per class (<256 words). Marked partial because duplicate counts were not persisted.",
            inputs: ["Full train/test chunks"],
            outputs: ["train_sampled, val_sampled, test_sampled parquets"],
            sourceRef: "notebooks/00_environment_and_dataset_audit.ipynb, 01_amazon_word2vec_bilstm.ipynb",
          },
          {
            id: "tr-a-w2v",
            label: "Gensim Preprocess & Word2Vec",
            subtitle: "Skip-gram 200d (train split only)",
            category: "model",
            status: "implemented",
            summary:
              "Applies `simple_preprocess(deacc=True)`, builds 80,002-token vocab (`min_count=3`), and trains Skip-gram (`window=5`, `negative=10`, `epochs=5`).",
            inputs: ["train_sampled tokens"],
            outputs: ["vocab.json", "embedding_matrix.npy (80002x200)"],
            sourceRef: "notebooks/01_amazon_word2vec_bilstm.ipynb",
          },
          {
            id: "tr-a-bilstm",
            label: "2-Layer BiLSTM Classifier",
            subtitle: "16,734,869 params, 3 epochs",
            category: "model",
            status: "implemented",
            summary:
              "200-d trainable embeddings -> 2-layer BiLSTM (`hidden_size=128`, `dropout=0.3`) -> `Linear(256, 5)` trained with `CrossEntropyLoss` & `AdamW(lr=1e-3)`.",
            inputs: ["embedding_matrix.npy", "450k train / 50k val"],
            outputs: ["w2v_bilstm_best.pt (epoch 2 best)"],
            sourceRef: "notebooks/01_amazon_word2vec_bilstm.ipynb, ml/amazon_rating/inference.py",
          },
          {
            id: "tr-a-artifacts",
            label: "Saved Weights, Metrics & ONNX",
            subtitle: "Acc 0.5357, F1 0.5337 | ONNX err 1.19e-7",
            category: "saved",
            status: "implemented",
            summary:
              "Saves PyTorch checkpoint, evaluation JSONs, confusion matrix figure, and opset-17 ONNX export (`amazon_bilstm.onnx`, parity `1.19e-7 <= 1e-4`).",
            inputs: ["w2v_bilstm_best.pt", "50k test split"],
            outputs: ["artifacts/models/word2vec_bilstm/*", "amazon_bilstm.onnx"],
            sourceRef: "data/model_lab_artifacts.json, artifacts/models/onnx/onnx_export_manifest.json",
          },
          {
            id: "tr-a-api",
            label: "AmazonInference in FastAPI",
            subtitle: "POST /predict/amazon (live PyTorch)",
            category: "api",
            status: "implemented",
            summary:
              "Serves live rating predictions via PyTorch (`max_len=256`, softmax over 1–5 stars). ONNX remains an offline parity artifact.",
            inputs: ["TextRequest { text }"],
            outputs: ["AmazonPrediction { rating, probabilities }"],
            sourceRef: "backend/app/main.py, ml/amazon_rating/inference.py",
          },
        ],
        edges: [
          { id: "tr-a-e1", from: "tr-a-kaggle", to: "tr-a-split", label: "NB00 ingest & sample" },
          { id: "tr-a-e2", from: "tr-a-split", to: "tr-a-w2v", label: "Train split only" },
          { id: "tr-a-e3", from: "tr-a-w2v", to: "tr-a-bilstm", label: "(80002, 200) init" },
          { id: "tr-a-e4", from: "tr-a-bilstm", to: "tr-a-artifacts", label: "Eval & ONNX export" },
          { id: "tr-a-e5", from: "tr-a-artifacts", to: "tr-a-api", label: "Loads PyTorch bundle" },
        ],
      },
      {
        id: "go_emotions",
        title: "Track B: GoEmotions DistilBERT",
        subtitle: "Multi-label emotion classification (27 emotions + neutral = 28 labels)",
        sourceUrl: "https://huggingface.co/datasets/google-research-datasets/go_emotions",
        nodes: [
          {
            id: "tr-b-hf",
            label: "HF GoEmotions (Simplified)",
            subtitle: "43,410 train / 5,426 val / 5,427 test",
            category: "external",
            status: "implemented",
            summary:
              "Official Reddit multi-label emotion benchmark (`google-research-datasets/go_emotions`, 54,263 total examples).",
            inputs: ["datasets.load_dataset('go_emotions', 'simplified')"],
            outputs: ["Train, validation, and test DatasetDict"],
            sourceRef: "data/dataset_explorer_summary.json",
          },
          {
            id: "tr-b-map",
            label: "NB00 Audit & 28-Label Mapping",
            subtitle: "27 emotions + neutral (184.7:1 imbalance)",
            category: "dataset",
            status: "partial",
            summary:
              "Maps 28 labels to multi-hot vectors and audits class prevalence; marked partial because duplicate/empty rates and co-occurrence matrix were not exported.",
            inputs: ["Raw labels list"],
            outputs: ["data/goemotions_label_mapping.json", "artifacts/goemotions_config.json"],
            sourceRef: "data/goemotions_label_mapping.json, data/dataset_explorer_summary.json",
          },
          {
            id: "tr-b-tok",
            label: "AutoTokenizer (distilbert-base-uncased)",
            subtitle: "WordPiece vocab 30,522, max_length=128",
            category: "model",
            status: "implemented",
            summary:
              "Lowercase WordPiece tokenization with `truncation=True` and `max_length=128` (only 1 train comment exceeded 128 tokens).",
            inputs: ["Comment text"],
            outputs: ["input_ids, attention_mask (<= 128)"],
            sourceRef: "notebooks/02_goemotions_distilbert.ipynb, ml/go_emotions/inference.py",
          },
          {
            id: "tr-b-ft",
            label: "DistilBERT Fine-Tuning",
            subtitle: "66,975,004 params | BCEWithLogitsLoss, lr=2e-5, 3 epochs",
            category: "model",
            status: "implemented",
            summary:
              "6-layer, 12-head transformer fine-tuned with `AdamW(lr=2e-5, weight_decay=0.01)` and `batch_size=16` over 3 epochs.",
            inputs: ["Tokenized train & val loaders"],
            outputs: ["Fine-tuned weights & 28 raw logits"],
            sourceRef: "notebooks/02_goemotions_distilbert.ipynb, data/model_lab_artifacts.json",
          },
          {
            id: "tr-b-thresh",
            label: "Validation Threshold Sweep",
            subtitle: "0.1–0.9 sweep -> optimal 0.30",
            category: "model",
            status: "implemented",
            summary:
              "Sweeps independent sigmoid thresholds on validation set; `0.30` maximizes Val Macro-F1 at `0.4960` (up from `0.4531` at `0.50`).",
            inputs: ["Validation sigmoid probabilities"],
            outputs: ["thresholds.json (global_threshold: 0.30)"],
            sourceRef: "artifacts/goemotions_thresholds.json, data/model_lab_artifacts.json",
          },
          {
            id: "tr-b-artifacts",
            label: "Saved SafeTensors, Metrics & ONNX",
            subtitle: "Macro-F1 0.4839, Micro-F1 0.5917 | ONNX err 3.34e-6",
            category: "saved",
            status: "implemented",
            summary:
              "Persists `model.safetensors`, tokenizer files, `thresholds.json`, test metrics, and opset-17 ONNX export (`goemotions_distilbert.onnx`).",
            inputs: ["Fine-tuned model & 5,427 test rows"],
            outputs: ["artifacts/models/distilbert_goemotions/*", "goemotions_distilbert.onnx"],
            sourceRef: "data/model_lab_artifacts.json, artifacts/models/onnx/onnx_export_manifest.json",
          },
          {
            id: "tr-b-api",
            label: "GoEmotionsInference in FastAPI",
            subtitle: "POST /predict/go-emotions (live PyTorch)",
            category: "api",
            status: "implemented",
            summary:
              "Serves live 28-emotion probabilities and `>= 0.30` active selections via PyTorch. ONNX remains an offline parity check.",
            inputs: ["TextRequest { text }"],
            outputs: ["GoEmotionsPrediction { emotions, probabilities, threshold }"],
            sourceRef: "backend/app/main.py, ml/go_emotions/inference.py",
          },
        ],
        edges: [
          { id: "tr-b-e1", from: "tr-b-hf", to: "tr-b-map", label: "Official splits" },
          { id: "tr-b-e2", from: "tr-b-map", to: "tr-b-tok", label: "28-label vectors" },
          { id: "tr-b-e3", from: "tr-b-tok", to: "tr-b-ft", label: "128-token tensors" },
          { id: "tr-b-e4", from: "tr-b-ft", to: "tr-b-thresh", label: "Val logits" },
          { id: "tr-b-e5", from: "tr-b-thresh", to: "tr-b-artifacts", label: "Eval & ONNX export" },
          { id: "tr-b-e6", from: "tr-b-artifacts", to: "tr-b-api", label: "Loads SafeTensors + 0.30" },
        ],
      },
    ],
  },
  {
    id: "storage",
    label: "Storage & Drive Map",
    kicker: "DIAG-04 / SANITIZED STORAGE TOPOLOGY",
    description:
      "Conceptual storage layout across the ephemeral Colab VM, logical Google Drive workspace (`NLP Lab Workspace`), and local Git repository. Click any node to inspect persistence behavior.",
    layout: "storage_tree",
    nodes: [
      {
        id: "st-colab-vm",
        label: "Colab Ephemeral VM",
        subtitle: "Runtime container & /tmp scratch",
        category: "external",
        status: "implemented",
        group: "Colab Runtime",
        persistence: "Ephemeral",
        summary:
          "Temporary GPU/CPU compute container used during notebook execution. Any dataset cache or checkpoint not copied to Drive is lost on runtime disconnect.",
        inputs: ["KaggleHub / Hugging Face downloads"],
        outputs: ["Temporary scratch files & stdout logs"],
        sourceRef: "reports/environment.json",
      },
      {
        id: "st-drive-root",
        label: "Google Drive -> NLP Lab Workspace",
        subtitle: "Logical persistent workspace root",
        category: "external",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Logical remote storage root organizing notebooks, processed corpus references, checkpoints, exported weights, reports, and figures without exposing folder IDs.",
        inputs: ["Mounted Colab notebook outputs"],
        outputs: ["Persistent cloud backups synced via sync_drive.py"],
        sourceRef: "sync_drive.py",
      },
      {
        id: "st-drive-notebooks",
        label: "Source & Notebooks",
        subtitle: "Notebooks 00, 01, 02, 03",
        category: "saved",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Stores the four Colab execution notebooks (`00_environment_and_dataset_audit` through `03_export_inference_and_release_checks`) with preserved cell outputs.",
        inputs: ["Colab notebook saves"],
        outputs: ["notebooks/*.ipynb (synced locally)"],
        sourceRef: "sync_drive.py",
      },
      {
        id: "st-drive-datasets",
        label: "Raw / Processed Dataset References",
        subtitle: "Amazon & GoEmotions parquet references",
        category: "dataset",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Excluded from Git",
        summary:
          "Holds processed parquet splits (`train_sampled`, `val_sampled`, `test_sampled`) and corpus caches that are excluded from Git commits per `data/README.md`.",
        inputs: ["Notebook 00 & 01 split processing"],
        outputs: ["Training inputs (never committed raw to Git)"],
        sourceRef: "data/README.md, sync_drive.py",
      },
      {
        id: "st-drive-checkpoints",
        label: "Checkpoints",
        subtitle: "Word2Vec BiLSTM & DistilBERT checkpoints",
        category: "saved",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Intermediate and best epoch model checkpoints saved during Colab T4 training runs before final packaging.",
        inputs: ["PyTorch training loops"],
        outputs: ["Best validation checkpoints"],
        sourceRef: "artifacts/unified_model_manifest.json, sync_drive.py",
      },
      {
        id: "st-drive-artifacts",
        label: "Model Artifacts",
        subtitle: "Weights, vocab.json, embedding_matrix.npy, thresholds.json",
        category: "saved",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Packaged serving bundles (`w2v_bilstm_best.pt`, `model.safetensors`, tokenizers, thresholds) consumed by local inference loaders.",
        inputs: ["Best checkpoints & tokenizer configs"],
        outputs: ["artifacts/models/*"],
        sourceRef: "sync_drive.py, ml/amazon_rating/inference.py",
      },
      {
        id: "st-drive-reports",
        label: "Evaluation Reports",
        subtitle: "Metrics JSONs & environment snapshots",
        category: "saved",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Stores `environment.json`, training histories, classification reports, and held-out test metrics JSONs.",
        inputs: ["Evaluation scripts & notebook cells"],
        outputs: ["reports/metrics/*.json, reports/environment.json"],
        sourceRef: "sync_drive.py, reports/metrics/*",
      },
      {
        id: "st-drive-logs",
        label: "Logs [ephemeral stdout unless exported]",
        subtitle: "Notebook cell stdout (e.g. NB02 epoch table)",
        category: "dataset",
        status: "partial",
        group: "Logical Google Drive Tree",
        persistence: "Ephemeral",
        summary:
          "Training stdout logs live ephemerally in Colab session memory unless captured inside saved `.ipynb` outputs or exported to JSON (NB02 epoch table was captured in Cell 6 stdout without a standalone history JSON).",
        inputs: ["Notebook training stdout"],
        outputs: ["Preserved only when saved in .ipynb or exported JSON"],
        sourceRef: "data/model_lab_artifacts.json",
      },
      {
        id: "st-drive-figures",
        label: "Figures",
        subtitle: "Confusion matrix & length plots",
        category: "saved",
        status: "implemented",
        group: "Logical Google Drive Tree",
        persistence: "Persistent",
        summary:
          "Rendered PNG evaluation figures (`amazon_confusion_matrix.png`, `amazon_text_length_dist.png`, `goemotions_token_length_dist.png`).",
        inputs: ["Matplotlib / Seaborn notebook plots"],
        outputs: ["reports/figures/*.png"],
        sourceRef: "sync_drive.py, reports/figures/*",
      },
      {
        id: "st-local-repo",
        label: "Local Repository (Git + Synced Bundles)",
        subtitle: "sync_drive.py -> data/, reports/, artifacts/",
        category: "saved",
        status: "implemented",
        group: "Local Workspace",
        persistence: "Persistent",
        summary:
          "Pulls sanitized manifests, notebooks, reports, figures, and serving weights via `sync_drive.py`, while `data/README.md` excludes raw Amazon/GoEmotions records from Git commits.",
        inputs: ["sync_drive.py downloads", "Git-tracked manifests & code"],
        outputs: ["Local FastAPI serving & Model Lab / Dataset Explorer data"],
        sourceRef: "sync_drive.py, data/README.md",
      },
    ],
    edges: [
      { id: "st-e1", from: "st-colab-vm", to: "st-drive-root", label: "Persist outputs before disconnect" },
      { id: "st-e2", from: "st-drive-root", to: "st-drive-notebooks", label: "Contains" },
      { id: "st-e3", from: "st-drive-root", to: "st-drive-datasets", label: "Contains (non-Git)" },
      { id: "st-e4", from: "st-drive-root", to: "st-drive-checkpoints", label: "Contains" },
      { id: "st-e5", from: "st-drive-root", to: "st-drive-artifacts", label: "Contains" },
      { id: "st-e6", from: "st-drive-root", to: "st-drive-reports", label: "Contains" },
      { id: "st-e7", from: "st-drive-root", to: "st-drive-logs", label: "Ephemeral unless exported" },
      { id: "st-e8", from: "st-drive-root", to: "st-drive-figures", label: "Contains" },
      { id: "st-e9", from: "st-drive-root", to: "st-local-repo", label: "sync_drive.py (sanitized artifacts)" },
    ],
  },
  {
    id: "deployment",
    label: "Deployment & CI",
    kicker: "DIAG-05 / LOCAL, DOCKER & CI",
    description:
      "Verified local development, Docker Compose backend & frontend containers (`Dockerfile` + `frontend/Dockerfile`), 3-job GitHub Actions CI (`test-backend`, `test-frontend`, `playwright-smoke`), and proposed live ONNX Runtime serving.",
    layout: "deployment",
    nodes: [
      {
        id: "dep-local-fe",
        label: "Local Frontend (Next.js :3000)",
        subtitle: "npm run dev / npm run verify",
        category: "api",
        status: "implemented",
        group: "Local Development (:3000 + :8000)",
        summary:
          "Runs locally on Node.js 18+ at `http://localhost:3000`, defaulting `NEXT_PUBLIC_API_URL` to `http://127.0.0.1:8000`.",
        inputs: ["frontend/.env.local (optional)", "Node.js 18+"],
        outputs: ["Pages Router dev server & static build"],
        persistence: "Runtime Memory",
        sourceRef: "README.md, frontend/.env.example",
      },
      {
        id: "dep-local-be",
        label: "Local Backend (Uvicorn :8000)",
        subtitle: "uvicorn backend.app.main:app --reload --port 8000",
        category: "api",
        status: "implemented",
        group: "Local Development (:3000 + :8000)",
        summary:
          "Runs FastAPI inside Python `.venv` on `:8000` with optional `.env` overrides and default localhost CORS allowlist.",
        inputs: ["backend/requirements.txt + gensim", "artifacts/models/*"],
        outputs: ["FastAPI HTTP endpoints on :8000"],
        persistence: "Runtime Memory",
        sourceRef: "README.md, .env.example",
      },
      {
        id: "dep-compose-be",
        label: "Docker Compose: backend",
        subtitle: "Dockerfile (python:3.11-slim, :8000)",
        category: "external",
        status: "implemented",
        group: "Docker Compose Stack",
        summary:
          "Builds from root `Dockerfile`, installs `backend/requirements.txt`, exposes `:8000`, and mounts `./backend`, `./ml`, `./artifacts`, and `./configs`.",
        inputs: ["Dockerfile", "docker-compose.yml"],
        outputs: ["nlp-lab-backend container"],
        persistence: "Build / CI",
        sourceRef: "Dockerfile, docker-compose.yml",
      },
      {
        id: "dep-compose-fe",
        label: "Docker Compose: frontend",
        subtitle: "frontend/Dockerfile (node:20-alpine, :3000)",
        category: "external",
        status: "implemented",
        group: "Docker Compose Stack",
        summary:
          "Builds from `frontend/Dockerfile` (`node:20-alpine`) with `frontend/.dockerignore` excluding build caches, runs `npm run build`, and serves `:3000` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.",
        inputs: ["frontend/Dockerfile", "frontend/.dockerignore", "docker-compose.yml"],
        outputs: ["nlp-lab-frontend container (:3000)"],
        persistence: "Build / CI",
        sourceRef: "frontend/Dockerfile, frontend/.dockerignore, docker-compose.yml",
      },
      {
        id: "dep-gh-ci",
        label: "GitHub Actions: test-backend",
        subtitle: "pytest backend/tests + export_openapi.py --check",
        category: "external",
        status: "implemented",
        group: "GitHub Actions CI",
        summary:
          "Executes `pip install -r backend/requirements.txt`, `pytest backend/tests`, and `python scripts/export_openapi.py --check` on `ubuntu-latest` for pushes and PRs on `main`/`master`.",
        inputs: ["backend/requirements.txt", "backend/tests/test_main.py", "scripts/export_openapi.py"],
        outputs: ["Automated backend test & docs/openapi.json gate"],
        persistence: "Build / CI",
        sourceRef: ".github/workflows/ci.yml, scripts/export_openapi.py, docs/openapi.json",
      },
      {
        id: "dep-fe-ci",
        label: "GitHub Actions: test-frontend",
        subtitle: "cd frontend && npm ci && npm run verify",
        category: "external",
        status: "implemented",
        group: "GitHub Actions CI",
        summary:
          "Runs Node.js 20 in `.github/workflows/ci.yml` executing `cd frontend && npm ci && npm run verify` (`lint`, `typecheck`, `test`, `build`).",
        inputs: ["frontend/package.json", "frontend/package-lock.json", "frontend/scripts/test-*.mjs"],
        outputs: ["Automated frontend lint, typecheck, contract tests & build gate"],
        persistence: "Build / CI",
        sourceRef: ".github/workflows/ci.yml, frontend/package.json",
      },
      {
        id: "dep-playwright-ci",
        label: "GitHub Actions: playwright-smoke",
        subtitle: "frontend/scripts/ci-playwright-smoke.mjs",
        category: "external",
        status: "implemented",
        group: "GitHub Actions CI",
        summary:
          "Needs `test-backend` and `test-frontend`; boots Uvicorn (`:8000`) and Next.js (`:3000`) and executes `frontend/scripts/ci-playwright-smoke.mjs` on Chromium.",
        inputs: [".github/workflows/ci.yml", "frontend/scripts/ci-playwright-smoke.mjs"],
        outputs: ["Full-stack desktop & mobile Playwright smoke verification"],
        persistence: "Build / CI",
        sourceRef: ".github/workflows/ci.yml, frontend/scripts/ci-playwright-smoke.mjs",
      },
      {
        id: "dep-onnx-serving-proposed",
        label: "Live ONNX Runtime Serving (Proposed)",
        subtitle: "onnxruntime CPUExecutionProvider (offline parity verified)",
        category: "model",
        status: "proposed",
        group: "Proposed Runtime Optimization",
        summary:
          "ONNX graphs (`amazon_bilstm.onnx`, `goemotions_distilbert.onnx`) pass offline CPU parity checks, while live FastAPI `/predict/*` routes still run PyTorch checkpoints directly.",
        inputs: ["artifacts/models/onnx/onnx_export_manifest.json", "ml/common/onnx_export.py"],
        outputs: ["Proposed ONNX Runtime FastAPI inference backend"],
        persistence: "Runtime Memory",
        sourceRef: "ml/common/onnx_export.py, artifacts/models/onnx/onnx_export_manifest.json",
      },
    ],
    edges: [
      { id: "dep-e1", from: "dep-local-fe", to: "dep-local-be", label: "http://127.0.0.1:8000" },
      { id: "dep-e2", from: "dep-compose-fe", to: "dep-compose-be", label: "depends_on backend" },
      { id: "dep-e3", from: "dep-gh-ci", to: "dep-fe-ci", label: "Parallel CI gate" },
      {
        id: "dep-e4",
        from: "dep-fe-ci",
        to: "dep-playwright-ci",
        label: "needs: [test-backend, test-frontend]",
      },
      {
        id: "dep-e5",
        from: "dep-onnx-serving-proposed",
        to: "dep-local-be",
        label: "Proposed FastAPI runtime swap",
        status: "proposed",
      },
    ],
  },
];

/** Verified external dataset sources and governance rules. */
export const DATASET_SOURCES: DatasetSourceSpec[] = [
  {
    id: "amazon_reviews",
    name: "Amazon Reviews for Sentiment Analysis",
    task: "Five-class review rating classification (1–5 stars)",
    primaryUrl:
      "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv",
    secondaryUrl:
      "https://huggingface.co/datasets/yassiracharki/Amazon_Reviews_for_Sentiment_Analysis_fine_grained_5_classes",
    secondaryLabel: "Hugging Face Mirror",
    splitsSummary:
      "Full corpus: 3,000,000 train / 650,000 test. Modeled <256-word subset: 450,000 train / 50,000 validation / 50,000 test.",
    governanceNote:
      "Raw Kaggle Amazon review records are excluded from Git and public API sample redistribution (`approved: false`).",
  },
  {
    id: "go_emotions",
    name: "GoEmotions (Simplified)",
    task: "Multi-label emotion classification (27 emotions + neutral = 28 labels)",
    primaryUrl: "https://huggingface.co/datasets/google-research-datasets/go_emotions",
    secondaryUrl: "https://aclanthology.org/2020.acl-main.372/",
    secondaryLabel: "ACL 2020 Paper",
    splitsSummary:
      "Official simplified splits: 43,410 train / 5,426 validation / 5,427 test (54,263 total Reddit comments; 184.7:1 train imbalance).",
    governanceNote:
      "Raw Reddit comment samples are not committed in repository artifacts (`data/README.md` prohibits raw dataset commits; API returns `approved: false`).",
  },
];

/** All nine verified backend and frontend environment variables. */
export const ENV_VARS: EnvVarSpec[] = [
  {
    name: "ENVIRONMENT",
    scope: "Backend",
    exampleValue: "development",
    defaultFallback: "Optional / unset",
    behavior: "Identifies runtime environment in `.env.example` and `docker-compose.yml`.",
    sourceRef: ".env.example, docker-compose.yml",
  },
  {
    name: "LOG_LEVEL",
    scope: "Backend",
    exampleValue: "info",
    defaultFallback: '"INFO"',
    behavior: "Configures Python root logger verbosity in `logging.basicConfig(level=...)`.",
    sourceRef: ".env.example, backend/app/main.py",
  },
  {
    name: "API_PORT",
    scope: "Backend",
    exampleValue: "8000",
    defaultFallback: "8000",
    behavior: "Documented FastAPI/Uvicorn service port in `.env.example` and `docker-compose.yml`.",
    sourceRef: ".env.example, docker-compose.yml",
  },
  {
    name: "CORS_ORIGINS",
    scope: "Backend",
    exampleValue: "http://localhost:3000,http://127.0.0.1:3000",
    defaultFallback:
      "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    behavior: "Comma-separated browser origins allowed by FastAPI `CORSMiddleware`.",
    sourceRef: ".env.example, backend/app/main.py",
  },
  {
    name: "AMAZON_MODEL_DIR",
    scope: "Backend",
    exampleValue: "artifacts/models/word2vec_bilstm",
    defaultFallback: "<repo_root>/artifacts/models/word2vec_bilstm",
    behavior:
      "Directory containing `embedding_matrix.npy`, `w2v_bilstm_best.pt`, and default `vocab.json` for `AmazonInference`.",
    sourceRef: ".env.example, ml/amazon_rating/inference.py",
  },
  {
    name: "AMAZON_VOCAB_PATH",
    scope: "Backend",
    exampleValue: "artifacts/models/word2vec_bilstm/vocab.json",
    defaultFallback: "<AMAZON_MODEL_DIR>/vocab.json",
    behavior: "Optional explicit path override to the Amazon Word2Vec vocabulary JSON file.",
    sourceRef: ".env.example, ml/amazon_rating/inference.py",
  },
  {
    name: "GOEMOTIONS_MODEL_DIR",
    scope: "Backend",
    exampleValue: "artifacts/models/distilbert_goemotions",
    defaultFallback: "<repo_root>/artifacts/models/distilbert_goemotions",
    behavior:
      "Directory containing `config.json`, `model.safetensors`, `thresholds.json`, and DistilBERT tokenizer files.",
    sourceRef: ".env.example, ml/go_emotions/inference.py",
  },
  {
    name: "MODEL_DEVICE",
    scope: "Backend",
    exampleValue: "cpu",
    defaultFallback: '"cpu"',
    behavior:
      "PyTorch execution device used by `AmazonInference` (mapped via `map_location='cpu'` then `.to(device_name)`).",
    sourceRef: ".env.example, ml/amazon_rating/inference.py",
  },
  {
    name: "NEXT_PUBLIC_API_URL",
    scope: "Frontend",
    exampleValue: "http://127.0.0.1:8000",
    defaultFallback: '"http://127.0.0.1:8000"',
    behavior:
      "Build-time inlined API base URL read by `frontend/lib/api.ts`; restart `npm run dev` or rebuild after changing.",
    sourceRef: "frontend/.env.example, frontend/lib/api.ts, README.md",
  },
];

/** Exact FastAPI endpoint contracts verified against `backend/app/main.py` and `schemas.py`. */
export const API_ENDPOINTS: ApiEndpointSpec[] = [
  {
    method: "GET",
    path: "/",
    summary: "Root health probe",
    requestSchema: "None",
    responseSchema: "dict[str, str]",
    responseFields: ["status", "service"],
    statusCodes: [{ code: 200, meaning: 'Returns `{"status": "ok", "service": "nlp-lab-api"}`.' }],
    sourceRef: "backend/app/main.py",
  },
  {
    method: "GET",
    path: "/health",
    summary: "Explicit health probe alias",
    requestSchema: "None",
    responseSchema: "dict[str, str]",
    responseFields: ["status", "service"],
    statusCodes: [{ code: 200, meaning: "Same payload as `GET /`." }],
    sourceRef: "backend/app/main.py",
  },
  {
    method: "GET",
    path: "/readiness",
    summary: "Lazy-loads both model bundles and reports live readiness",
    requestSchema: "None",
    responseSchema: "ReadinessResponse",
    responseFields: ["status ('ready' | 'not_ready')", "models.{amazon_rating, go_emotions}.{ready, error}"],
    statusCodes: [
      { code: 200, meaning: "Returns per-model readiness flags and load error strings if unavailable." },
      { code: 500, meaning: "Unhandled server error." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/metadata",
    summary: "Static service version and model architecture summary",
    requestSchema: "None",
    responseSchema: "MetadataResponse",
    responseFields: ["service", "version", "models.{amazon_rating, go_emotions}.{task, architecture, classes, runtime}"],
    statusCodes: [{ code: 200, meaning: "Returns API version and model metadata." }],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/statistics",
    summary: "Raw quality and test metrics JSON snapshots",
    requestSchema: "None",
    responseSchema: "StatisticsResponse",
    responseFields: ["datasets.{amazon_reviews, go_emotions}", "metrics.{amazon_rating, go_emotions}"],
    statusCodes: [{ code: 200, meaning: "Returns committed `data/*_data_quality.json` and `reports/metrics/*_test_metrics.json`." }],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/datasets/summary",
    summary: "Audited dataset explorer summary cross-checked against quality manifests",
    requestSchema: "None",
    responseSchema: "DatasetSummaryResponse",
    responseFields: [
      "provenance",
      "last_audit_date",
      "datasets.{amazon_reviews, go_emotions}.{name, task, label_semantics, source_url, mirror_url, paper_url, status, last_audit_date, splits, schema, class_distribution, class_prevalence, labels_per_example, missing_values, text_length_stats, duplicates_audit, cooccurrence_audit, imbalance_summary, quality_warnings, samples_policy}",
    ],
    statusCodes: [
      { code: 200, meaning: "Returns sanitized dataset audit summary." },
      { code: 503, meaning: "`dataset_summary_unavailable` when `data/dataset_explorer_summary.json` is missing or unreadable." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/datasets/{dataset_id}/samples",
    summary: "Governance-gated sample preview endpoint",
    requestSchema: "Path: dataset_id ('amazon_reviews' | 'go_emotions'); Query: page (>= 1), page_size (1..100)",
    responseSchema: "DatasetSamplesResponse",
    responseFields: ["dataset_id", "approved", "notice", "total_available", "page", "page_size", "items"],
    statusCodes: [
      { code: 200, meaning: "Returns `approved: false`, `total_available: 0`, `items: []`, and governance notice." },
      { code: 404, meaning: "`dataset_not_found` for unknown `dataset_id`." },
      { code: 422, meaning: "`validation_error` when `page < 1` or `page_size` is outside `1..100`." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/models/lab",
    summary: "Dual-track pipeline steps, hyperparameters, metrics, ONNX parity, and live file checks",
    requestSchema: "None",
    responseSchema: "ModelLabResponse",
    responseFields: [
      "provenance",
      "run_timestamp_note",
      "comparison[]",
      "tracks.{amazon_rating, go_emotions}.{id, name, task, architecture, endpoint, runtime, pipeline_steps, hyperparameters, run_timestamp, run_timestamp_note, epochs, test_metrics, onnx_parity, sha256, artifact_files, readiness}",
    ],
    statusCodes: [
      { code: 200, meaning: "Returns verified Model Lab payload with live `readiness` and on-disk `artifact_files` inspection." },
      { code: 503, meaning: "`model_lab_unavailable` when `data/model_lab_artifacts.json` is missing or unreadable." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "GET",
    path: "/technology",
    summary: "Verified technology stack manifest, ONNX artifact status, and communication boundaries",
    requestSchema: "None",
    responseSchema: "TechnologyManifestResponse",
    responseFields: [
      "provenance",
      "generated_from[]",
      "onnx_artifact_paths[]",
      "api_version",
      "readiness.{amazon_rating, go_emotions}.{ready, error}",
      "onnx_artifacts_present",
      "onnx_artifacts_expected",
      "categories_summary.{frontend, backend, ml_nlp, data, testing, deployment}",
      "boundaries[]",
      "technologies[]",
    ],
    statusCodes: [
      { code: 200, meaning: "Returns audited technology manifest with live `readiness`, `api_version`, and on-disk ONNX artifact counts." },
      { code: 503, meaning: "`technology_manifest_unavailable` when `data/technology_manifest.json` is missing or unreadable." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "POST",
    path: "/predict/amazon",
    summary: "Predict 1–5 star Amazon review rating via Word2Vec BiLSTM",
    requestSchema: "TextRequest { text: str (min_length=1, max_length=10_000, extra='forbid') }",
    responseSchema: "AmazonPrediction",
    responseFields: ["rating (int 1..5)", "probabilities (float[5])"],
    statusCodes: [
      { code: 200, meaning: "Returns predicted star rating and 5 softmax probabilities." },
      { code: 422, meaning: "`validation_error` on empty/oversized text or extra JSON fields." },
      { code: 503, meaning: "`model_not_ready` when weights, vocab, matrix, or Gensim are missing." },
      { code: 500, meaning: "`internal_error` on unexpected runtime failure." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
  {
    method: "POST",
    path: "/predict/go-emotions",
    summary: "Predict 28 GoEmotions labels via fine-tuned DistilBERT",
    requestSchema: "TextRequest { text: str (min_length=1, max_length=10_000, extra='forbid') }",
    responseSchema: "GoEmotionsPrediction",
    responseFields: ["emotions[{label, probability}]", "probabilities (Record<string, float>)", "threshold (0.30)"],
    statusCodes: [
      { code: 200, meaning: "Returns active emotions `>= threshold` plus all 28 sigmoid probabilities." },
      { code: 422, meaning: "`validation_error` on empty/oversized text or extra JSON fields." },
      { code: 503, meaning: "`model_not_ready` when model directory, config, or `thresholds.json` is unavailable." },
      { code: 500, meaning: "`internal_error` on unexpected runtime failure." },
    ],
    sourceRef: "backend/app/main.py, backend/app/schemas.py",
  },
];

/** Core runtime, resilience, provenance, and privacy policies governing NLP Lab. */
export const OPERATIONAL_POLICIES: OperationalPolicySpec[] = [
  {
    id: "policy-cold-start",
    title: "Lazy Model Loading & Cold-Start Readiness",
    category: "Readiness",
    summary:
      "Model bundles are loaded lazily via `_load_model(model)` on first `/readiness`, `/models/lab`, or `/predict/*` request rather than at module import time.",
    details: [
      "Cold start loads both `AmazonInference` (`vocab.json`, `embedding_matrix.npy`, `w2v_bilstm_best.pt`) and `GoEmotionsInference` (`model.safetensors`, `AutoTokenizer`, `thresholds.json`), which takes several seconds.",
      "`ReadinessProvider` allows up to 60 seconds (`READINESS_TIMEOUT_MS = 60_000`) for initial cold-start completion and re-checks automatically on window `focus` or `online` events when offline.",
      "If any required weight, config, threshold, or dependency (such as Gensim) is absent, `/readiness` marks that model `ready: false` and `/predict/*` returns HTTP `503 model_not_ready`.",
    ],
    sourceRefs: ["backend/app/main.py", "frontend/components/ReadinessProvider.tsx", "README.md"],
  },
  {
    id: "policy-client-resilience",
    title: "Stall Notice (4s), Abort Timeout (30s) & CORS GET Rule",
    category: "Client Resilience",
    summary:
      "Client requests separate slow responses, hard timeouts, user cancellations, offline network errors, and HTTP API errors without false successes.",
    details: [
      "`AnalyzerForm` raises a non-blocking stall notice after `4,000 ms`, aborts via `AbortController` at `30,000 ms`, and preserves user textarea input across cancel/error retries.",
      "`useDatasetSummary` and `useModelLab` enforce a `4,000 ms` stall threshold and `15,000 ms` timeout, distinguishing `503` / offline (`unavailable`) from other HTTP failures (`failed`) and empty payloads (`empty`).",
      "`lib/api.ts` only sets `Content-Type: application/json` when `init?.body != null` so `GET` requests (including `/readiness`) remain simple CORS requests without preflight `OPTIONS` overhead.",
    ],
    sourceRefs: [
      "frontend/lib/api.ts",
      "frontend/components/AnalyzerForm.tsx",
      "frontend/lib/useDatasetSummary.ts",
      "frontend/lib/useModelLab.ts",
    ],
  },
  {
    id: "policy-artifact-provenance",
    title: "Artifact Provenance & ONNX Parity vs Live PyTorch Runtime",
    category: "Artifact Provenance",
    summary:
      "FastAPI executes PyTorch models live while ONNX exports serve as offline parity-verified release artifacts.",
    details: [
      "`ml/common/onnx_export.py` exports both models with `opset_version=17` and checks CPU logits via `onnxruntime` (`CPUExecutionProvider`) against PyTorch within `tolerance = 1e-4`.",
      "Verified max absolute logit errors: `1.19e-7` for `amazon_bilstm.onnx` and `3.34e-6` for `goemotions_distilbert.onnx`.",
      "Live `POST /predict/amazon` and `POST /predict/go-emotions` endpoints invoke `AmazonInference` and `GoEmotionsInference` in PyTorch rather than `onnxruntime`.",
    ],
    sourceRefs: [
      "ml/common/onnx_export.py",
      "artifacts/models/onnx/onnx_export_manifest.json",
      "backend/app/main.py",
    ],
  },
  {
    id: "policy-privacy-governance",
    title: "Privacy, Input Bounds & Sanitized Storage Governance",
    category: "Privacy & Governance",
    summary:
      "User prompts are bounded and never logged to disk or console; raw dataset records and personal storage paths are excluded from repository APIs and docs.",
    details: [
      "`TextRequest` enforces `min_length=1`, `max_length=10_000`, and `extra='forbid'` (`ConfigDict`) on prediction endpoints; `backend/app/main.py` logs paths and exception types without logging submitted user text.",
      "`GET /datasets/{dataset_id}/samples` enforces `approved: false` and `items: []` for both `amazon_reviews` and `go_emotions`, respecting Kaggle redistribution rules and `data/README.md` raw-data exclusions.",
      "Frontend documentation and backend summary/lab APIs represent remote cloud storage exclusively through logical folder labels (`NLP Lab Workspace`) with zero mounted Colab Drive paths, Drive IDs, or machine-local user paths.",
    ],
    sourceRefs: [
      "backend/app/schemas.py",
      "backend/app/main.py",
      "data/README.md",
      "backend/tests/test_main.py",
    ],
  },
];
