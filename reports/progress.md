# NLP Lab Progress Report

**Assessment date:** 2026-11-15  
**Reference contract:** `docs/NLP_Lab_Gemini_Colab_Agent_Execution_Spec.md`  
**Current milestone:** Day 5 — Export, inference modules and FastAPI

## Execution parts from the current checkpoint

The remaining work is grouped by dependency and verification boundary:

1. **Artifact bridge and reloadability** — connect the Drive/Colab artifacts,
   inventory both checkpoint bundles, and verify reloads outside training
   notebook state.
2. **Standalone inference** — implement Amazon and GoEmotions PyTorch
   inference modules with explicit readiness and error states.
3. **Export and parity** — attempt ONNX export and compare ONNX/PyTorch
   outputs where supported; retain PyTorch fallback.
4. **FastAPI serving** — add schemas, model routes, health/readiness/metadata,
   validation, CORS, logging, and exception handling.
5. **Verification and Day 5 gate** — add pytest coverage, run the API locally
   or in a Colab-compatible process, and update the status report.
6. **Day 6 frontend integration** — connect the React frontend to both API
   workflows and verify failure/loading states.
7. **Day 7 release** — complete Docker/deployment checks, documentation,
   presentation/demo materials, and the final factual execution report.

### Part 1 — Artifact bridge and reloadability

**Status: `PASS` — Drive artifacts downloaded and local reload verified.**

The authenticated Drive folder contains both required checkpoint bundles:

- Amazon folder: `checkpoints/word2vec_bilstm`
  - `w2v_bilstm_best.pt`
  - `amazon_word2vec_skipgram.model`
  - Word2Vec vector files
  - `embedding_matrix.npy`
  - baseline and final metrics/history files
- GoEmotions folder: `checkpoints/distilbert_goemotions`
  - `model.safetensors`
  - `config.json`
  - `tokenizer.json`
  - `tokenizer_config.json`
  - `thresholds.json`
  - final metrics

The shared export notebook visibly reloads GoEmotions from
`/content/drive/MyDrive/NLP_Lab/checkpoints/distilbert_goemotions` and records
a successful inference run. The downloaded Windows bundles now also reload
successfully through the standalone inference modules. The recorded SHA-256
hashes match the manifest for both model checkpoints.

### Part 2 — Standalone inference

**Status: `PASS` — artifact-backed inference verified locally.**

Added:

- `ml/amazon_rating/inference.py`
  - Faithful 200-dimensional Word2Vec embedding + 2-layer BiLSTM loader
  - 256-token preprocessing with PAD/UNK handling
  - Five-class rating probabilities and predicted rating
  - Explicit bundle validation and `ModelNotReadyError`
- `ml/go_emotions/inference.py`
  - Hugging Face tokenizer/model loader
  - 28-label sigmoid probabilities and thresholded emotion results
  - Threshold validation and explicit `ModelNotReadyError`
- Package exports in both model directories.

Verification:

- Both modules compile successfully.
- Both classes import successfully in the local Windows environment.
- Both models loaded successfully from the downloaded local bundles and
  produced predictions in a standalone Python process.
- Amazon returned a five-class rating prediction with probabilities.
- GoEmotions returned thresholded 28-label probabilities using threshold
  `0.30000000000000004`.

### Part 1/2 resolution — local artifact bridge

**Status: `PASS` — local artifact bridge and runtime verification complete.**

Added `configs/requirement.txt` with the API, PyTorch, NumPy, Gensim,
Transformers, safetensors, and test dependencies. The Amazon loader now uses
the same Gensim `simple_preprocess` tokenizer as the training notebook and
supports a separate `AMAZON_VOCAB_PATH`, because `vocab.json` is stored under
the Drive `processed_data/amazon_reviews` folder rather than the checkpoint
folder. `.env.example` now matches the loader environment variables and local
artifact directories.

The local reload path is now deterministic:

- `artifacts/models/word2vec_bilstm/w2v_bilstm_best.pt`
- `artifacts/models/word2vec_bilstm/embedding_matrix.npy`
- `artifacts/models/word2vec_bilstm/vocab.json`
- `artifacts/models/distilbert_goemotions/model.safetensors`
- `artifacts/models/distilbert_goemotions/config.json`
- `artifacts/models/distilbert_goemotions/tokenizer.json`
- `artifacts/models/distilbert_goemotions/tokenizer_config.json`
- `artifacts/models/distilbert_goemotions/thresholds.json`

Verification evidence:

- Amazon prediction succeeded: rating `5`.
- GoEmotions prediction succeeded: `excitement` and `joy` crossed the saved
  threshold for the supplied sample.
- The installed runtime contains the required NumPy, Gensim, Transformers,
  safetensors, tokenizers, PyTorch, and FastAPI packages.
- Local checkpoint SHA-256 values match
  `artifacts/unified_model_manifest.json`.

### Part 3 — Export and parity

**Status: `PASS` — both exports and ONNX Runtime parity checks succeeded.**

Added:

- `ml/common/onnx_export.py` with model validation, ONNX export, and
  PyTorch/ONNX logit comparison.
- `scripts/export_and_check_onnx.py` to export both local models and write
  parity manifests under `artifacts/models/onnx/`.
- `onnx`, `onnxruntime`, and `onnxscript` to `configs/requirement.txt`.

Verification:

- Export utility and runner compile successfully.
- Both local PyTorch model bundles loaded before export.
- Amazon ONNX export produced `amazon_bilstm.onnx` and its external data file.
- GoEmotions ONNX export produced `goemotions_distilbert.onnx` and its
  external data file.
- ONNX Runtime loaded both exports on the CPU execution provider.
- Amazon parity passed with maximum absolute logit error
  `1.1920928955078125e-07` against tolerance `1e-4`; both outputs have shape
  `[1, 5]`.
- GoEmotions parity passed with maximum absolute logit error
  `3.337860107421875e-06` against tolerance `1e-4`; both outputs have shape
  `[1, 28]`.
- The exporter emitted non-blocking warnings about dynamo dynamic axes,
  opset conversion, and optional torchvision registrations. These did not
  affect model validation or parity.

## Executive summary

The project has evidence of substantial progress through Days 1–4:

- The four planned notebooks exist and contain executed cells with saved
  outputs.
- Dataset schemas and quality metadata exist for Amazon Reviews and
  GoEmotions.
- Amazon BiLSTM and GoEmotions DistilBERT evaluation JSON files exist.
- Evaluation figures and a model manifest exist.

Day 5 is complete. Standalone inference, local reloadability, ONNX
export/parity, model-backed API routes, readiness/metadata endpoints,
validation/error handling, and API tests are verified. The backend suite
passes when the repository root is supplied on `PYTHONPATH`.

**Overall status: `PASS` — Parts 1–4 are verified and the Day 5 API gate is
met.**

## Status legend

- `PASS` — executed and verified with evidence
- `FAIL` — executed and failed; the failure is recorded
- `BLOCKED` — could not execute because a prerequisite is missing
- `SKIPPED` — intentionally not executed
- `UNKNOWN` — insufficient evidence
- `WARN` — passed with a material limitation or caveat

## Day-by-day assessment

### Day 1 — Workspace, datasets, audit

**Status: `PASS` with `WARN`**

Evidence found:

- `notebooks/00_environment_and_dataset_audit.ipynb` exists and has executed
  cells with outputs.
- `data/amazon_schema.json` and `data/amazon_data_quality.json` exist.
- `data/goemotions_schema.json`, `data/goemotions_label_mapping.json`, and
  `data/goemotions_data_quality.json` exist.
- `reports/environment.json` and
  `reports/environment_requirements.txt` exist.

Caveat:

- The recorded environment is a Colab/Linux/Tesla T4 environment, while the
  current workspace is Windows. Local verification completed on 2026-11-15:
  the local runtime is Python 3.13.15 on Windows 11 with PyTorch
  `2.15.0+cpu`, no CUDA device, and no local dataset or checkpoint files.
- The local virtual environment has the required inference/API and ONNX
  dependencies. The training notebooks still cannot be replayed locally
  because the original datasets are not present.
- The backend smoke test passes when invoked with the repository root on
  `PYTHONPATH`: `5 passed`. This covers the Day 5 API behavior; model
  reproducibility is separately evidenced by local reload and live inference.

### Day 2 — Amazon preprocessing and Word2Vec

**Status: `PASS` with `WARN`**

Evidence found:

- `notebooks/01_amazon_word2vec_bilstm.ipynb` exists with executed cells and
  outputs.
- `reports/figures/amazon_text_length_dist.png` exists.
- `reports/metrics/baseline_bilstm_history.json` and
  `reports/metrics/w2v_bilstm_history.json` exist.
- `artifacts/unified_model_manifest.json` records a
  Word2Vec Skip-gram + bidirectional LSTM architecture.

Caveat:

- The manifest points to a Google Drive checkpoint path
  (`/content/drive/...`), not a checkpoint present in this repository.
  Reloadability from this workspace is therefore not verified.

### Day 3 — BiLSTM training and Amazon evaluation

**Status: `PASS` with `WARN`**

Evidence found:

- `reports/metrics/word2vec_bilstm_test_metrics.json` exists.
- `reports/metrics/word2vec_classification_report.json` exists.
- `reports/figures/amazon_confusion_matrix.png` exists.
- Training history files for the baseline and Word2Vec models exist.

Caveat:

- The saved metrics are evidence of an evaluation artifact, but a fresh
  checkpoint reload and prediction from this repository has not been verified.

### Day 4 — GoEmotions DistilBERT

**Status: `PASS` with `WARN`**

Evidence found:

- `notebooks/02_goemotions_distilbert.ipynb` exists with executed cells and
  outputs.
- `reports/metrics/distilbert_goemotions_test_metrics.json` exists and
  includes multi-label test metrics and per-label results.
- `reports/figures/goemotions_token_length_dist.png` exists.
- `artifacts/goemotions_config.json` and
  `artifacts/goemotions_thresholds.json` exist.
- `artifacts/unified_model_manifest.json` records 28 classes and a validation
  threshold of `0.30000000000000004`.

Caveat:

- The manifest points to a Google Drive `model.safetensors` path. Model
  reloadability outside the original notebook/Drive environment is not
  verified here.

## Day 5 checklist

| Requirement | Status | Evidence / gap |
|---|---|---|
| Standalone Amazon inference module | `PASS` | Artifact-backed load and prediction verified locally. |
| Standalone GoEmotions inference module | `PASS` | Artifact-backed load and prediction verified locally. |
| Reload artifacts outside notebook state | `PASS` | Local checkpoint bundles reload successfully; checkpoint hashes match the manifest. |
| Attempt ONNX export | `PASS` | Amazon and GoEmotions exports are present under `artifacts/models/onnx/`. |
| ONNX parity tests | `PASS` | ONNX Runtime outputs match PyTorch within `1e-4` tolerance for both models. |
| PyTorch fallback | `PASS` | Both standalone modules remain available and verified independently of ONNX Runtime. |
| API schemas and model routes | `PASS` | Typed schemas and `/predict/amazon` and `/predict/go-emotions` routes are implemented. |
| Health endpoint | `PASS` | `GET /` returns `{"status":"ok","service":"nlp-lab-api"}`. |
| Readiness endpoint | `PASS` | `GET /readiness` reports per-model readiness and returns `not_ready` when a bundle cannot load. |
| Model metadata endpoint | `PASS` | `GET /metadata` returns task, architecture, class count, and runtime metadata. |
| Validation, CORS, logging and exceptions | `PASS` | Pydantic text constraints, configurable restricted CORS, API logging, structured validation errors, and model-not-ready responses are implemented. |
| Pytest coverage for Day 5 behavior | `PASS` | Full backend suite passes: `PYTHONPATH=<repo-root> .venv\Scripts\python.exe -m pytest backend\tests -q` → 5 passed. Tests cover health, metadata, readiness, prediction success, validation, and unavailable-model failure. |
| Local API execution with both models | `PASS` | Live Uvicorn requests returned Amazon rating `5` and GoEmotions `excitement`/`joy` from the downloaded bundles. |

## Day 5 gate

**Gate status: `PASS`.**

Both model services returned outputs through the live local API. Readiness,
validation, and model failure responses are covered by focused tests, and
health and metadata endpoints were verified over HTTP.

## Existing artifacts inventory

### Present and non-empty

- `data/amazon_schema.json`
- `data/amazon_data_quality.json`
- `data/goemotions_schema.json`
- `data/goemotions_label_mapping.json`
- `data/goemotions_data_quality.json`
- `reports/metrics/*.json`
- `reports/figures/*.png`
- `artifacts/unified_model_manifest.json`
- `artifacts/goemotions_config.json`
- `artifacts/goemotions_thresholds.json`
- `notebooks/00_environment_and_dataset_audit.ipynb`
- `notebooks/01_amazon_word2vec_bilstm.ipynb`
- `notebooks/02_goemotions_distilbert.ipynb`
- `notebooks/03_export_inference_and_release_checks.ipynb`

### Missing for Day 5

- Nothing required by the Day 5 contract; later release hardening remains
  tracked under Parts 5–7.

## Local reproducibility verification

**Status: `WARN` — partially verified, not equivalent to Colab.**

| Check | Result | Evidence |
|---|---|---|
| Windows virtual environment exists | `PASS` | `.venv` configured with Python 3.13.15 |
| Basic PyTorch import | `PASS` | PyTorch `2.15.0+cpu` imports successfully |
| CUDA/Tesla T4 availability | `FAIL` for parity | Local `cuda_available=False`, device count `0`; recorded Colab environment uses a Tesla T4 |
| FastAPI test harness | `PASS` | `PYTHONPATH=<repo-root> .venv\Scripts\python.exe -m pytest backend\tests -q` → 5 passed |
| ML dependency availability | `PASS` | Required local inference and ONNX dependencies are installed |
| Dataset availability | `BLOCKED` | No local CSV or Parquet dataset files found |
| Model checkpoint availability | `PASS` | Local `.pt`, `.safetensors`, and ONNX model bundles are present and reloadable |
| Notebook replay | `BLOCKED` | Training datasets are not present locally; model-backed inference and API replay are verified separately |

This resolves the uncertainty in the original caveat: local model reload,
inference, ONNX parity, and API serving are verified on Windows CPU. Full
training notebook replay remains unavailable because the original datasets and
Colab/Tesla T4 environment are not reproduced locally.

## Recommended next actions

1. Keep the two trained checkpoints available through a documented local or
   registry path without committing large model files.
2. Keep the verified test invocation documented, or add project packaging so
   the plain repository-root invocation also works without `PYTHONPATH`.
3. Continue with Day 6 frontend integration.
4. Update this report only from executed evidence.
