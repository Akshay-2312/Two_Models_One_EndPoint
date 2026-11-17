# NLP Lab — Gemini Agent Execution Specification

**Project:** Dual-Architecture NLP Classification Platform  
**Owner:** Solo student project  
**Primary notebook environment:** Google Colab  
**Primary coding assistant:** Gemini (inside Colab where available)  
**Application stack:** React + TypeScript + Vite, FastAPI, PyTorch, Hugging Face Transformers  
**Deployment target:** Free-tier hosting; deploy only after local end-to-end validation  
**Execution approach:** Evidence-first, checkpointed, reproducible, failure-logged

> **Agent instruction:** Treat this file as the project contract. Execute it in order. Do not silently change datasets, labels, splits, model families, evaluation methods, or deployment targets. If a detail cannot be verified, mark it `UNKNOWN` and ask for evidence or stop at the relevant gate. Never fill gaps with invented facts, metrics, file paths, package versions, training results, or deployment success claims.

---

# 0. Mission and non-negotiable rules

Build a complete, reproducible NLP application that demonstrates two distinct course principles on two distinct datasets:

1. **Kaggle dataset:** fine-grained Amazon review rating classification using **Word2Vec + BiLSTM**.
2. **Hugging Face dataset:** fine-grained multi-label emotion recognition using a **fine-tuned DistilBERT Transformer**.

The final system must contain:

- Two independently trained models, not two calls to pre-existing prediction APIs.
- Dataset acquisition and audit code.
- Reproducible training notebooks and reusable Python modules.
- Validation/test evaluation with saved metrics and plots.
- Model export and inference parity checks.
- FastAPI endpoints for both models.
- React frontend integrated with the API.
- Automated tests, Docker configuration, CI checks, setup documentation, research report, presentation and demo script.
- A final factual execution report that identifies every failure, unresolved issue, skipped step, warning and exact failure location.

## 0.1 Evidence-first operating rules

The agent MUST follow these rules throughout the task:

1. **Inspect before acting.** Before running a cell or editing a file, inspect the current notebook, repository state, mounted datasets, runtime hardware and existing artifacts.
2. **One verifiable step at a time.** Run a small step, inspect its output, then proceed. Do not create a large notebook and claim it works without executing it.
3. **No fabricated results.** Accuracy, loss, F1, training time, model size, GPU type, RAM, API response, deployment URL and test status must come from executed output or an authoritative source.
4. **No fabricated files.** Confirm every expected file exists and has non-zero size before adding it to a manifest or reporting it as generated.
5. **No assumed schemas.** Inspect actual dataset column names, feature types, class IDs, split sizes and missing values. If they differ from this specification, log the discrepancy and adapt only after explaining the evidence.
6. **No silent dataset substitution.** If either primary dataset cannot be obtained, stop and report the problem. Do not substitute IMDb, Sentiment140, Yelp, or another dataset without explicit approval.
7. **No test-set tuning.** Use train for fitting, validation for model selection and threshold/hyperparameter decisions, and test only for final evaluation.
8. **No data leakage.** Check duplicates across partitions, fit vocabulary and Word2Vec on training data only, and record all split logic.
9. **No fabricated citations.** Cite original dataset pages and research papers. If a citation is uncertain, label it unresolved rather than inventing bibliographic details.
10. **No hidden failures.** Every exception, failed assertion, unavailable accelerator, skipped experiment, incomplete export or deployment issue must be appended to the failure log immediately.
11. **No pretending the application is production-grade.** Report the real limits of free hosting, cold starts, resource caps, model uncertainty and untested conditions.
12. **Protect secrets and data.** Never print or commit API keys, Kaggle tokens, private environment variables or private user data. Do not publish raw dataset records unless the current license/terms explicitly permit redistribution.
13. **Do not install arbitrary packages blindly.** Inspect the existing runtime first. Avoid replacing the Colab-managed PyTorch/CUDA stack unless a specific verified incompatibility requires it.
14. **Do not fix errors by changing the task.** Fix the code or explain why the requested step is blocked. Preserve the two chosen principles and sources.
15. **Maintain checkpoints.** Save model/checkpoint artifacts and logs to persistent Google Drive after each epoch or meaningful stage. Colab runtimes can disconnect.

## 0.2 Required status labels

Every task in the final report must be one of:

- `PASS` — executed and verified with evidence.
- `FAIL` — executed and failed; include exact failure details.
- `BLOCKED` — could not execute because an external prerequisite is missing.
- `SKIPPED` — intentionally not executed; include the reason and impact.
- `UNKNOWN` — not enough evidence to determine status.
- `WARN` — passed but has a material limitation or caveat.

Never convert `BLOCKED`, `SKIPPED`, `UNKNOWN`, or `WARN` into `PASS`.

---

# 1. Project decisions — locked unless evidence requires a stop

| Area | Locked decision |
|---|---|
| Deadline constraint | Seven-day solo execution target |
| Primary notebook platform | Google Colab |
| Notebook assistant | Gemini in Colab when available; otherwise Gemini using the notebook/repository files supplied by the user |
| Dataset A | Kaggle Amazon Reviews for Sentiment Analysis — fine-grained, five classes |
| Principle A | Word2Vec embeddings + BiLSTM sequence classifier |
| Problem A | Predict a review's 1–5 star rating class from review text and title |
| Dataset B | Hugging Face `google-research-datasets/go_emotions`, `simplified` configuration |
| Principle B | Fine-tuned DistilBERT for multi-label text classification |
| Problem B | Predict one or more of 27 emotions or neutral in a short Reddit comment |
| ML framework | PyTorch |
| NLP/data tooling | Gensim, Hugging Face Datasets/Transformers, scikit-learn |
| Backend | FastAPI |
| Frontend | React + TypeScript + Vite |
| Inference export | ONNX Runtime is a target, not a reason to delay working PyTorch inference |
| Source control | GitHub monorepo |
| Target budget | ₹0; free tiers only; availability not guaranteed |

## 1.1 Correct interpretation of “low noise, high volume, many parameters”

These are three different things and must not be conflated:

- **Low label noise** is a property of dataset annotation/label construction and the relationship between the text and label.
- **High volume** is the number of usable labelled examples, after filtering and split creation.
- **Model parameters** describe model capacity. A larger parameter count does not automatically make a model better and can increase overfitting, memory use and training time.

The selected datasets provide a practical compromise:

- Amazon review dataset: large scale (3,000,000 train rows and 650,000 test rows are reported by its Hugging Face mirror) and five rating classes. The target is the customer's rating, not a perfectly objective semantic sentiment label. Some text/rating disagreement is possible. Do not call it noise-free.
- GoEmotions: 58,009 human-annotated Reddit comments, with a predefined agreement-filtered split of 43,410 train, 5,426 validation and 5,427 test rows. It has 27 fine-grained emotion categories plus neutral and supports multi-label prediction. Human annotation reduces some ambiguity but does not eliminate subjectivity, class imbalance or social-platform bias.
- DistilBERT base is a substantial pretrained Transformer (commonly described as approximately 67M parameters). The exact count must be measured from the loaded model and written to the report.
- Word2Vec vector table and BiLSTM parameter counts must likewise be calculated from the actual generated vocabulary and instantiated model. Never claim “many parameters” based on a guessed value.

**Important scope warning:** This is not a direct head-to-head accuracy contest between two architectures. The two datasets and tasks differ. Report each model against its own held-out test set. You may compare engineering characteristics (parameter count, training duration, inference latency and memory), but do not infer that one architecture is categorically better from cross-dataset accuracy values.

---

# 2. Dataset selection and authoritative links

## 2.1 Dataset A — Kaggle Amazon Reviews, fine-grained five-class

**Kaggle source:**  
https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv

**Hugging Face mirror/card for schema cross-check only:**  
https://huggingface.co/datasets/yassiracharki/Amazon_Reviews_for_Sentiment_Analysis_fine_grained_5_classes

The Hugging Face mirror reports:

- 3,000,000 training examples.
- 650,000 test examples.
- `class_index` with values 1–5.
- `review_title`.
- `review_text`.
- A 1M–10M dataset size category.
- Apache-2.0 license on that Hugging Face mirror.

**Important licensing rule:** The mirror's Apache-2.0 metadata must not automatically be assumed to apply to the Kaggle source or all underlying review content. Inspect the Kaggle dataset's current license/terms before use. Record the exact license shown on the Kaggle page at download time. Do not rehost raw reviews in the public application unless redistribution is explicitly permitted.

### Problem statement A

“Design and evaluate a Word2Vec-initialized Bidirectional LSTM model that predicts a five-level customer review rating (1–5 stars) from the review title and body, using a large-scale Amazon review corpus.”

Use the term **review rating classification** accurately. This is not identical to subjective positive/negative sentiment classification. For optional simplified sentiment display, map ratings 1–2 to negative, 3 to neutral and 4–5 to positive only as a post-processing presentation layer; the trained five-class task remains the research task.

### Why this dataset was selected

- Much larger labelled volume than a 50K IMDb set.
- Five target classes provide a richer output than binary sentiment.
- Title and body provide more context.
- The dataset is a strong fit for training word embeddings and sequence models.
- Existing train/test split is reported by the mirrored card; inspect the actual downloaded CSVs before relying on it.

### Known risks to investigate

- Rating/text disagreement: a one-star review may discuss a specific delivery problem while praising the product, or a five-star review may contain caveats.
- Class imbalance: never assume class balance; measure it.
- Duplicate or near-duplicate reviews.
- Empty or extremely short texts.
- Very long text and memory pressure.
- The Kaggle download may have different filenames or column order from the mirror.
- Dataset terms/license may restrict redistribution.

### Data columns expected, but must be verified

- `class_index`: integer label from 1 to 5.
- `review_title`: short title.
- `review_text`: review body.

If the actual CSV differs, print `df.columns`, `df.dtypes`, `df.head(3)`, row counts and null counts. Then update the parser using observed names; record that schema adaptation in `reports/run_log.md`.

## 2.2 Dataset B — Hugging Face GoEmotions, simplified configuration

**Hugging Face dataset:**  
https://huggingface.co/datasets/google-research-datasets/go_emotions

**Original research paper:**  
https://aclanthology.org/2020.acl-main.372/  
https://arxiv.org/abs/2005.00547

**Original Google Research repository:**  
https://github.com/google-research/google-research/tree/master/goemotions

Load the `simplified` configuration. The dataset card reports:

- 58K curated Reddit comments.
- 27 emotion categories plus neutral.
- 43,410 train, 5,426 validation and 5,427 test examples for the simplified split.
- Each record has `text`, `labels` and a comment ID.
- Some examples can have multiple emotion labels.
- The source annotations are produced by crowdworkers; the card notes Reddit/user-base bias and other limitations.
- Dataset card reports Apache License 2.0 for the research repository.

### Problem statement B

“Fine-tune a pretrained DistilBERT Transformer to perform multi-label emotion classification on short English Reddit comments, predicting any applicable emotion category from 27 emotions plus neutral.”

### Why this dataset was selected

- Human-labelled fine-grained emotion annotations.
- Predefined splits avoid inventing a random split for the main benchmark.
- Multi-label classification is more research-rich than a simple six-class softmax task.
- It has enough examples to fine-tune a DistilBERT-scale model within a notebook workflow, subject to accelerator availability.
- Dataset is directly hosted on Hugging Face and integrates with `datasets.load_dataset`.

### Known risks to investigate

- Label imbalance across 28 categories.
- Multiple labels can be valid for one comment.
- Neutral is a label and should not be confused with “no emotion labels” unless dataset documentation says so.
- Reddit is not representative of every population or writing style.
- Some comments may contain profanity or offensive content.
- Emotion labels are annotator judgements, not ground truth about the writer's internal psychological state.

### Critical modelling requirement

This is **multi-label**, not ordinary single-label multiclass classification. Use:

- 28 output logits.
- Sigmoid probabilities per label.
- `BCEWithLogitsLoss` (or a verified Trainer implementation with multi-label problem type).
- Per-label thresholding selected on validation data.
- Micro-F1, macro-F1, per-class precision/recall/F1 and average precision where feasible.

Do not use softmax or `CrossEntropyLoss` for this multi-label dataset. Do not force every example to exactly one emotion.

---

# 3. Choose Google Colab — not Kaggle Notebook — as the primary environment

## Decision: Google Colab is primary; Kaggle Notebook is fallback only.

Reasons:

1. Gemini assistance is integrated into the Colab environment where the feature is available, so the agent and notebook workflow are more naturally colocated.
2. Colab notebooks live in Google Drive and can also be loaded from GitHub.
3. Hugging Face Datasets/Transformers can be used directly.
4. The Kaggle dataset can be downloaded into Drive/Colab using a Kaggle download method.
5. Colab gives a familiar notebook runtime without requiring local CUDA setup.

**Do not assume free GPU access is guaranteed.** Google says free Colab resources, GPU types, runtime lifetimes and usage limits vary and are not guaranteed. Check the runtime actually assigned on the day. A Gemini/Google AI subscription may grant additional Colab benefits depending on the current plan and country rollout; do not assume a particular accelerator until the runtime reports it.

Kaggle Notebook remains a useful fallback because datasets can be attached directly and Kaggle documents preconfigured GPU notebook environments. However, free GPU availability can be queued/limited and weekly quotas may vary. Do not create two competing copies of the same project unless Colab is blocked.

### Colab links

- Colab: https://colab.research.google.com/
- Colab FAQ/resource limits: https://research.google.com/colaboratory/faq.html
- Colab developer page: https://developers.google.com/colab

### Kaggle fallback links

- Kaggle Notebooks: https://www.kaggle.com/code
- Kaggle Notebook docs: https://www.kaggle.com/docs/notebooks
- Kaggle GPU efficiency docs: https://www.kaggle.com/docs/efficient-gpu-usage

### Notebook strategy

Create four small notebooks rather than one enormous notebook. This improves restart/recovery and makes the execution history easier to audit.

1. `00_environment_and_dataset_audit.ipynb`
2. `01_amazon_word2vec_bilstm.ipynb`
3. `02_goemotions_distilbert.ipynb`
4. `03_export_inference_and_release_checks.ipynb`

The actual logic must also exist as reusable `.py` modules in the GitHub repository. Notebooks should orchestrate functions, document decisions, show outputs and link to artifacts. Avoid keeping the only copy of important code in notebook cells.

---

# 4. Google Drive, Colab and repository setup — step by step

## Step 4.1 — Create the Google Drive workspace

Create this folder structure in Google Drive:

```text
MyDrive/
└── NLP_Lab/
    ├── notebooks/
    ├── raw_data/
    │   ├── kaggle_amazon/
    │   └── huggingface_go_emotions/
    ├── processed_data/
    │   ├── amazon_reviews/
    │   └── go_emotions/
    ├── checkpoints/
    │   ├── word2vec_bilstm/
    │   └── distilbert_goemotions/
    ├── final_models/
    ├── logs/
    ├── reports/
    │   ├── figures/
    │   ├── metrics/
    │   └── failures/
    └── exports/
```

Do not store multiple redundant copies of the large Amazon CSV. Keep the raw download once, create cleaned/sharded Parquet files, and save manifests/checksums.

## Step 4.2 — Create/open Colab

1. Open https://colab.research.google.com/.
2. Sign in using the Google account where the project Drive is stored.
3. Create a notebook named `00_environment_and_dataset_audit.ipynb` inside `NLP_Lab/notebooks/` in Drive.
4. Select a GPU runtime if one is available.
5. Run the hardware inspection cell before installing anything.
6. Open the Gemini assistance panel in Colab if available. UI labels can change; do not invent UI instructions if the user's interface differs.
7. Provide Gemini with this Markdown specification and instruct it to work in the open notebook/repository, not merely write a generic tutorial.

## Step 4.3 — Hardware inspection cell

Run this before package installation:

```python
import os, sys, platform, subprocess, json
print("Python:", sys.version)
print("Platform:", platform.platform())
print("Working directory:", os.getcwd())

try:
    import torch
    print("PyTorch:", torch.__version__)
    print("CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("GPU:", torch.cuda.get_device_name(0))
        print("CUDA runtime:", torch.version.cuda)
        print("GPU memory (GB):", round(
            torch.cuda.get_device_properties(0).total_memory / 1024**3, 2
        ))
except Exception as exc:
    print("PyTorch inspection failed:", repr(exc))

try:
    print(subprocess.check_output(["nvidia-smi"], text=True))
except Exception as exc:
    print("nvidia-smi unavailable:", repr(exc))
```

Save the output to `reports/environment.json`. If GPU is unavailable, do not claim GPU training. Continue with Word2Vec/BiLSTM CPU only if the time estimate is feasible; otherwise stop and ask whether to use a different available accelerator or schedule.

## Step 4.4 — Mount Google Drive

```python
from google.colab import drive
drive.mount('/content/drive')

from pathlib import Path
ROOT = Path('/content/drive/MyDrive/NLP_Lab')
for name in [
    'notebooks', 'raw_data/kaggle_amazon',
    'raw_data/huggingface_go_emotions',
    'processed_data/amazon_reviews', 'processed_data/go_emotions',
    'checkpoints/word2vec_bilstm', 'checkpoints/distilbert_goemotions',
    'final_models', 'logs', 'reports/figures', 'reports/metrics',
    'reports/failures', 'exports'
]:
    (ROOT / name).mkdir(parents=True, exist_ok=True)
print(ROOT)
```

Before running the next step, assert `ROOT.exists()` and write/read a small temporary file. If Drive mounting fails, log it. Do not save the only model checkpoint to ephemeral `/content`.

## Step 4.5 — Install dependencies carefully

First inspect installed versions:

```python
import importlib.metadata as md
packages = ["torch", "numpy", "pandas", "transformers", "datasets", "gensim", "scikit-learn"]
for p in packages:
    try:
        print(p, md.version(p))
    except md.PackageNotFoundError:
        print(p, "NOT INSTALLED")
```

Install missing project libraries. Preserve the Colab-provided PyTorch/CUDA build unless there is a demonstrated incompatibility.

```python
%pip install -q -U "gensim" "datasets" "transformers" "accelerate" \
  "evaluate" "scikit-learn" "pandas" "pyarrow" "matplotlib" \
  "seaborn" "safetensors" "huggingface_hub" "kagglehub" \
  "onnx" "onnxruntime"
```

If an install causes a dependency conflict or runtime restart, capture the full pip output and versions before attempting a fix. Do not repeatedly upgrade unrelated packages.

After installation, run imports and `pip check`. Save `pip freeze` to `reports/environment_requirements.txt`. For final reproducibility, generate a tested lock/requirements file from the successful runtime rather than guessing version pins in advance.

## Step 4.6 — Create the GitHub repository

Suggested repository name: `nlp-lab-dual-model-classification`.

```text
nlp-lab/
├── configs/
├── data/                  # manifests/sample metadata only; no raw dataset commits
├── ml/
│   ├── common/
│   ├── amazon_rating/
│   └── go_emotions/
├── notebooks/
├── backend/
│   ├── app/
│   └── tests/
├── frontend/
├── artifacts/             # metadata, model cards, checksums; large models hosted separately
├── reports/
│   ├── figures/
│   ├── metrics/
│   ├── failures/
│   └── research_report.md
├── docs/
├── .github/workflows/
├── Dockerfile              # or backend/Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

`.gitignore` must exclude `.env`, Kaggle credentials, raw datasets, Drive mounts, notebook caches, checkpoints, large model artifacts, Python caches and local logs containing sensitive data.

Do not put a real `KAGGLE_KEY`, Hugging Face write token, or other secret in notebook source or Git history.

---

# 5. Dataset acquisition and audit

## 5.1 Kaggle credentials and download

Preferred secure route for a solo Colab workflow:

1. Download the dataset ZIP manually from the Kaggle link using the browser.
2. Read the current Kaggle terms/license before downloading and using it.
3. Upload the ZIP to `MyDrive/NLP_Lab/raw_data/kaggle_amazon/`.
4. Extract it once in Colab to a temporary path or directly into Drive if space permits.
5. Keep the original archive and record its SHA-256 checksum.

Optional automated route: use KaggleHub/Kaggle API after configuring credentials through Colab Secrets or another secret manager supported by the user's runtime. Do not write the token in a cell. If authentication fails, report the exact error and use manual download; do not loop through invalid credentials.

Example after credentials are configured securely:

```python
import kagglehub
path = kagglehub.dataset_download(
    "yacharki/amazon-reviews-for-sentianalysis-finegrained-csv"
)
print("Downloaded dataset directory:", path)
```

This API call must be tested. Do not claim it works until the directory and expected CSV files are found.

## 5.2 Identify actual files and schema

```python
from pathlib import Path
for p in Path('/content/drive/MyDrive/NLP_Lab/raw_data/kaggle_amazon').rglob('*'):
    if p.is_file():
        print(p, p.stat().st_size)
```

Identify the training and test CSVs from actual filenames. Inspect only the header and a few rows first. Do not load multiple GB into memory before confirming the schema.

```python
import pandas as pd
csv_path = "ACTUAL_PATH_FROM_FILE_INSPECTION.csv"
preview = pd.read_csv(csv_path, nrows=5)
print(preview.columns.tolist())
print(preview.dtypes)
print(preview.head(3).to_string())
```

Replace `ACTUAL_PATH_FROM_FILE_INSPECTION.csv` with an inspected path; never leave placeholder paths in a completed notebook.

## 5.3 Streaming/chunked preparation for the large Amazon dataset

The dataset can be large. Use chunked CSV reading or Parquet conversion to avoid loading the entire raw CSV into RAM. The agent should:

1. Read the exact observed columns.
2. Keep `class_index`, `review_title`, `review_text` and any stable review ID if one exists.
3. Validate labels are integers in `{1,2,3,4,5}`.
4. Concatenate title and body with a separator.
5. Remove null/empty review text only after recording counts.
6. Normalize HTML entities, remove actual HTML tags if present and normalize whitespace.
7. Preserve negation, meaningful punctuation and words; do not remove stopwords wholesale.
8. Create a deterministic normalized-text hash for exact duplicate detection.
9. Count duplicates within and across train/test. If duplicate text occurs across splits, remove the training copy and preserve the test copy; log the count.
10. Save cleaned data as Parquet shards.
11. Save a manifest with raw/clean row counts, dropped-row reasons, class distribution, split provenance, preprocessing version, seed and file checksums.

### Label handling

Original class values are expected to be 1–5. Convert to zero-indexed targets only for the model:

```python
label = class_index - 1  # 0..4
```

Do not reorder the labels. Keep this explicit mapping in `label_mapping.json`:

```json
{
  "original_to_model": {"1": 0, "2": 1, "3": 2, "4": 3, "5": 4},
  "model_to_display": ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"]
}
```

### Data split strategy

- If the downloaded Kaggle files include an official labelled `train.csv` and labelled `test.csv`, preserve that official boundary.
- Derive validation from the official train partition only, using stratification on `class_index` and a fixed seed (`42`). Use 90% train / 10% validation within the official training portion as the baseline.
- Never use the official test set for model selection, early stopping, threshold selection or hyperparameter decisions.
- For the seven-day resource budget, use a deterministic, stratified development sample from the training portion (start with up to 100,000 rows per class = up to 500,000 train examples, plus validation). Keep test evaluation separate. After the pipeline works, increase the training cap if runtime permits.
- If the official test has many rows, the primary final evaluation should use the full test set if time/compute permits. Otherwise use a deterministic stratified sample, report sample size and distribution, and label the result “sampled test evaluation,” not full-test evaluation.
- Report natural class distribution before sampling and sampled distribution after sampling. If using balanced sampling, do not report that balanced sample distribution as the natural distribution.

### Amazon audit outputs required

- `amazon_schema.json`
- `amazon_data_quality.json`
- `amazon_class_distribution.csv`
- `amazon_split_manifest.json`
- `amazon_duplicates_report.csv` or summary
- `amazon_cleaning_report.md`
- `amazon_data_hashes.json`

## 5.4 Hugging Face GoEmotions download

Use the official Hugging Face dataset repository and the simplified configuration:

```python
from datasets import load_dataset

emotion_ds = load_dataset(
    "google-research-datasets/go_emotions",
    "simplified"
)
print(emotion_ds)
print(emotion_ds["train"].features)
print(emotion_ds["train"][0])
```

If the load call fails, capture the full exception and inspect the dataset card/configuration names. Do not silently switch to a fork or another emotion dataset.

Expected splits (verify actual values): train 43,410; validation 5,426; test 5,427. The dataset card's split details are the source of truth if the live dataset has not changed.

### GoEmotions label inspection

Inspect:

```python
print(emotion_ds["train"].features["labels"])
print(emotion_ds["train"][0]["labels"])
```

Build the label name list from the dataset feature metadata where possible, not from a memorized list. Save the mapping to `goemotions_label_mapping.json`. Verify there are 28 output classes including neutral and that each example may contain one or more label IDs.

Create multi-hot label vectors of length 28. Validate each label ID is within range and no example has an empty or malformed label list without accounting for it.

### GoEmotions split policy

- Preserve the provided official train/validation/test splits.
- Do not randomly reshuffle or merge them.
- Do not rebalance the test set.
- Compute per-class positive counts and prevalence in each split.
- Audit exact duplicate texts across splits. If overlap exists, report it and follow the dataset's official benchmark split unless there is clear evidence of leakage requiring a documented correction. Never modify test examples invisibly.
- Preserve original IDs for traceability but do not expose author usernames or sensitive source metadata in the public app.

### GoEmotions audit outputs required

- `goemotions_schema.json`
- `goemotions_label_mapping.json`
- `goemotions_class_prevalence.csv`
- `goemotions_split_manifest.json`
- `goemotions_data_quality.json`
- `goemotions_cleaning_report.md`

---

# 6. Preprocessing policy

## 6.1 Amazon / Word2Vec + BiLSTM

Use restrained preprocessing:

- HTML unescape.
- Remove actual HTML tags if present.
- Normalize whitespace.
- Keep case handling consistent with the Word2Vec tokenizer (lowercase is acceptable and should be documented).
- Preserve contractions and negation (`not`, `never`, `don't`).
- Do not remove stopwords.
- Do not remove sentiment-bearing punctuation without testing.
- Do not lemmatize/stem by default; it can discard stylistic information.
- Concatenate title and body with a clear separator, e.g. `title [SEP] body`.
- Fit vocabulary on the training data only.
- Train Word2Vec using only the training corpus, never validation/test corpus.

Record counts before/after every cleaning operation. If a cleaning rule removes a large fraction of examples, inspect examples before continuing.

## 6.2 GoEmotions / DistilBERT

- Keep raw text as close to source as possible.
- Do not lowercase or manually stem before a cased/uncased model tokenizer; let the pretrained tokenizer handle its normalization.
- Do not remove stopwords, emojis or punctuation in advance.
- Use the matching tokenizer for `distilbert-base-uncased`.
- Truncate to a maximum token length chosen using the observed token-length distribution. Start at 128; verify what fraction of examples are truncated. If too many are truncated, compare 160/192 only if compute permits.
- Use dynamic padding per batch where practical.

---

# 7. Model A implementation — Word2Vec + BiLSTM

## 7.1 Architecture

```text
Review title + review body
        ↓
HTML cleanup + whitespace normalization
        ↓
Word tokenization
        ↓
Training-only vocabulary
        ↓
Word2Vec Skip-gram vectors
        ↓
Integer sequence IDs + truncation/padding
        ↓
Embedding layer initialized from Word2Vec
        ↓
Bidirectional LSTM
        ↓
Dropout
        ↓
Dense classifier
        ↓
5 logits (rating classes 1–5)
```

## 7.2 Starting configuration

These are starting hyperparameters, not guaranteed optimal values. Tune only with validation evidence.

| Parameter | Starting value |
|---|---:|
| Word2Vec architecture | Skip-gram (`sg=1`) |
| Vector dimension | 200 |
| Context window | 5 |
| Minimum word count | 2 or 3 (decide after vocabulary audit) |
| Negative samples | 10 |
| Word2Vec epochs | 5–10 |
| Maximum vocabulary | 80,000 (plus PAD/UNK) |
| Maximum sequence length | 256 tokens initially; inspect distribution |
| BiLSTM hidden size | 128 per direction |
| BiLSTM layers | 2 |
| Dropout | 0.3 |
| Batch size | Start 64 on a suitable GPU; lower if OOM |
| Classifier | Linear layer to 5 logits |
| Loss | CrossEntropyLoss |
| Optimizer | AdamW |
| Learning rate | Start `1e-3` for the BiLSTM head/embedding; validate |
| Early stopping | Validation macro-F1 or validation loss, patience 2–3 |
| Seed | 42 |

The agent must calculate and save:

- Word2Vec vector matrix shape.
- Vocabulary size.
- Number of BiLSTM parameters.
- Total model parameters.
- Trainable parameter count.
- Checkpoint file size.

Do not claim a specific parameter count before the model is instantiated.

## 7.3 Word2Vec training requirements

1. Tokenize the cleaned training reviews.
2. Ensure blank documents are accounted for.
3. Train Gensim `Word2Vec` with `sg=1` for Skip-gram.
4. Store the Word2Vec model and vocabulary.
5. Initialize the PyTorch embedding matrix from the learned vectors.
6. Create explicit `PAD=0` and `UNK=1` entries.
7. Initialize OOV/UNK deterministically (seeded random or documented vector average).
8. Verify padding rows remain zero and no index exceeds vocabulary size.
9. Do not train Word2Vec on validation or test text.

A fair ablation is required:

- **Baseline:** same BiLSTM architecture with randomly initialized embeddings.
- **Word2Vec:** same architecture initialized with Skip-gram Word2Vec.

Keep data splits, sequence length, optimizer, training budget and evaluation conditions identical as far as possible. Report any deviations.

## 7.4 BiLSTM implementation requirements

- `nn.Embedding` with correct `padding_idx`.
- `nn.LSTM(batch_first=True, bidirectional=True, num_layers=2, dropout=...)`.
- Correct extraction/concatenation of final forward/backward hidden states, or a documented masked pooling strategy.
- Dropout before classifier.
- Five output logits.
- `CrossEntropyLoss` on raw logits; do not apply softmax before the loss.
- Use `argmax` for predicted class and softmax only for displayed class probabilities.
- Clip gradients (e.g. max norm 1.0) if training is unstable.
- Save the best checkpoint based on validation metric.

## 7.5 Model A evaluation

Report:

- Accuracy.
- Macro precision, macro recall, macro F1.
- Weighted F1.
- Per-star precision/recall/F1/support.
- Confusion matrix (5 × 5).
- Normalized confusion matrix.
- Validation loss curve.
- Training duration and examples/second.
- Model parameter count and checkpoint size.
- Inference latency on a defined batch size and hardware.

Also calculate mean absolute rating error (MAE across 1–5 labels) as an interpretable ordinal error measure. Explain that cross-entropy treats classes categorically; MAE adds an ordinal view but does not make the model an ordinal-regression model.

## 7.6 Error analysis

Inspect a stratified sample of misclassified examples. Categorize error patterns such as:

- Mixed praise and criticism.
- Sarcasm.
- Rating/text mismatch.
- Short/low-context review.
- Domain-specific terms.
- Negation/contrast.
- OOV-heavy text.

Do not publish raw text examples if the license/terms do not allow it. In the report, use short redacted/paraphrased examples or aggregate categories where appropriate.

---

# 8. Model B implementation — DistilBERT + GoEmotions

## 8.1 Architecture

```text
Reddit comment
      ↓
DistilBERT tokenizer
      ↓
Input IDs + attention mask
      ↓
Pretrained DistilBERT encoder (~67M class of model; count actual parameters)
      ↓
Classification head
      ↓
28 independent logits
      ↓
Sigmoid probabilities
      ↓
Validation-selected per-label thresholds
      ↓
Zero or more predicted emotions
```

## 8.2 Base checkpoint

`distilbert/distilbert-base-uncased`

Model page: https://huggingface.co/distilbert/distilbert-base-uncased

Load `AutoModelForSequenceClassification` with `num_labels=28` and `problem_type="multi_label_classification"`. Use the dataset-derived label mapping as `id2label`/`label2id`. Verify the exact model repository name and available files at load time.

## 8.3 Starting training configuration

| Parameter | Starting value |
|---|---:|
| Base model | `distilbert/distilbert-base-uncased` |
| Output labels | 28 |
| Max sequence length | 128 |
| Batch size | 8 (reduce to 4 if OOM) |
| Gradient accumulation | 2–4 if needed |
| Epochs | 3 baseline |
| Learning rate | `2e-5` |
| Weight decay | `0.01` |
| Warmup | 5–10% of training steps |
| Optimizer | AdamW |
| Mixed precision | Use FP16/BF16 only if supported and verified |
| Loss | BCEWithLogitsLoss |
| Early stopping | Validation macro-F1 or a documented multi-label metric |
| Seed | 42 |

## 8.4 Multi-label target preparation

- Derive label names from dataset metadata.
- Verify 28 labels, including `neutral`.
- Convert the list of label IDs for each example into a multi-hot vector of length 28.
- Validate vector shape and values (only 0/1).
- Keep multiple positive labels in the same vector.
- Do not one-hot encode a multi-label example as if only one class can be true.

## 8.5 Training requirements

- Fine-tune the actual pretrained DistilBERT weights.
- Do not load a pre-finetuned GoEmotions classifier and call it the project model.
- Use the official train/validation/test split.
- Use `BCEWithLogitsLoss`.
- Do not apply sigmoid inside the loss function.
- Save the best checkpoint based on validation metrics.
- Log learning rate, train loss, validation loss and multi-label metrics every epoch.
- Save tokenizer files with the checkpoint.
- Save model config, label mapping, thresholds and training metadata.

## 8.6 Threshold tuning

The default threshold 0.5 is only a baseline. Search a threshold grid (for example 0.10 to 0.90) on validation predictions only.

Evaluate:

- One global threshold chosen for validation macro-F1.
- Optional per-label thresholds, only if enough validation positives exist per label and the approach is documented.

Store selected thresholds with the model artifact. Do not choose thresholds on test data.

## 8.7 Model B evaluation

Report:

- Micro precision/recall/F1.
- Macro precision/recall/F1.
- Per-label precision/recall/F1/support.
- Sample-based F1 if implemented correctly.
- Hamming loss.
- Subset accuracy (strict exact-set match; explain why it can be harsh).
- Mean average precision / average precision per label if feasible.
- Confusion-style per-label counts (TP/FP/FN/TN).
- Training/validation loss curves.
- Parameter count, model size and training time.
- Inference latency and memory.

For this imbalanced multi-label task, macro-F1 and per-label results are essential. Do not report only accuracy.

## 8.8 Error and limitation analysis

Inspect representative errors and aggregate them into:

- Emotion overlap (e.g. admiration/approval or sadness/grief).
- Context missing from a short comment.
- Sarcasm/irony.
- Rare-label underprediction.
- Multi-emotion combinations.
- Neutral/emotion boundary.
- Domain-specific Reddit language.

Add a visible disclaimer in the application: “This model predicts labels associated with text in the GoEmotions dataset. It does not infer a person's actual mental state and is not suitable for clinical, hiring, disciplinary or other high-stakes decisions.”

---

# 9. Research experiments and MLOps evidence

Minimum experiments that fit a seven-day solo timeline:

## Model A experiments

- A1: Random embeddings + BiLSTM.
- A2: Word2Vec Skip-gram initialization + BiLSTM.
- A3: Frozen vs trainable Word2Vec embeddings, only if time permits.
- A4: One sequence length comparison (e.g. 128 vs 256), only if time permits.

## Model B experiments

- B1: DistilBERT baseline fine-tuning.
- B2: Learning-rate comparison (e.g. `2e-5` vs `3e-5`) or max length comparison.
- B3: Default 0.5 vs validation-tuned threshold.

Do not run a combinatorial hyperparameter sweep. Use a small predeclared set and record every run.

## Reproducibility metadata required for every run

Each experiment must save a JSON record with:

- Run ID.
- UTC start/end timestamps.
- Git commit hash.
- Notebook filename and cell/stage name.
- Dataset source, version/revision if available, split hashes and sample counts.
- Preprocessing version.
- Random seeds.
- Python and package versions.
- Runtime hardware/accelerator.
- Model architecture/configuration.
- Hyperparameters.
- Training duration.
- Best checkpoint path and checksum.
- Validation metrics.
- Test metrics only for the final selected run.
- Warnings, exceptions and skipped operations.

Use JSON/CSV logs; do not rely only on notebook display output.

---

# 10. Artifact and export strategy

## 10.1 Artifacts to save

```text
artifacts/
├── amazon_rating/
│   ├── word2vec.model
│   ├── vocab.json
│   ├── label_mapping.json
│   ├── preprocessing_config.json
│   ├── best_model.pt
│   ├── metrics.json
│   ├── confusion_matrix.csv
│   └── model_manifest.json
└── go_emotions/
    ├── pytorch_model/
    ├── tokenizer/
    ├── label_mapping.json
    ├── thresholds.json
    ├── metrics.json
    └── model_manifest.json
```

## 10.2 ONNX export is a secondary gate

First prove that both models work in PyTorch. Then export and test ONNX. Do not sacrifice training/evaluation or the application integration to force ONNX export into the seven-day deadline.

For each model:

1. Load the selected best PyTorch checkpoint.
2. Set model to evaluation mode.
3. Export with correct input signature and dynamic batch dimension.
4. Load the ONNX artifact using ONNX Runtime CPU provider.
5. Run a deterministic set of validation examples through PyTorch and ONNX.
6. Compare raw logits/probabilities within a declared numerical tolerance.
7. Verify predicted classes/labels agree on the parity test set.
8. Measure CPU latency, memory and artifact size.
9. Save parity report.
10. If export fails or parity fails, retain working PyTorch inference and document ONNX as failed/blocked. Never report an unvalidated ONNX artifact as production-ready.

For GoEmotions, export must preserve 28 logits and apply the saved sigmoid/threshold logic identically in the API layer.

---

# 11. Application architecture and API contract

## 11.1 Architecture

```text
React + TypeScript + Vite
        |
        | HTTPS REST
        v
FastAPI backend
   |             |
   v             v
Word2Vec +      DistilBERT
BiLSTM          multi-label model
   |             |
   v             v
5 rating scores  28 emotion probabilities
        |
        v
Validated JSON responses
        |
        v
React charts, predictions, evaluation pages
```

## 11.2 Backend endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | API identity and version |
| `GET` | `/health` | Process health only |
| `GET` | `/ready` | Model loading/readiness per model |
| `GET` | `/api/v1/models` | Architecture, model version, labels and artifact availability |
| `POST` | `/api/v1/amazon-rating/predict` | Five-class review rating prediction |
| `POST` | `/api/v1/go-emotions/predict` | Multi-label emotion prediction |
| `POST` | `/api/v1/amazon-rating/batch` | Batch rating prediction, optional |
| `POST` | `/api/v1/go-emotions/batch` | Batch emotion prediction, optional |

### Amazon request

```json
{
  "title": "Worth the purchase",
  "text": "The build quality is excellent and it works as expected."
}
```

### Amazon response shape

```json
{
  "model": "word2vec-bilstm-amazon-rating",
  "model_version": "actual-version-from-manifest",
  "predicted_rating": 5,
  "class_probabilities": {
    "1": 0.01,
    "2": 0.02,
    "3": 0.04,
    "4": 0.13,
    "5": 0.80
  },
  "latency_ms": 0.0
}
```

The probability values above are illustrative only. Never hardcode them.

### GoEmotions request

```json
{
  "text": "I am really excited and grateful for this opportunity!"
}
```

### GoEmotions response shape

```json
{
  "model": "distilbert-goemotions-multilabel",
  "model_version": "actual-version-from-manifest",
  "predicted_labels": ["excitement", "gratitude", "optimism"],
  "probabilities": {
    "admiration": 0.0,
    "amusement": 0.0,
    "anger": 0.0
  },
  "thresholds_version": "actual-version-from-manifest",
  "latency_ms": 0.0
}
```

The list and scores above are illustrative only. Actual response must contain all 28 labels or a clearly documented top-k representation; do not omit labels silently.

## 11.3 API validation and safety

- Reject empty or whitespace-only text.
- Set documented maximum length and batch-size limits.
- Use Pydantic request/response schemas.
- Do not log raw user text by default.
- Add request IDs and structured logs.
- Return controlled error responses; do not leak stack traces or secrets.
- Set CORS to the exact deployed frontend origin.
- Load models once at startup or use a controlled lazy-loading policy.
- `/health` must not claim that models are loaded; `/ready` must report each model separately.
- Use one model process or lazy loading if both models cannot fit in the free service's memory.
- Do not run a public web server from Colab. Colab is for interactive computation, not hosting the application's production API.

---

# 12. React frontend specification

Use React + TypeScript + Vite. Build a clean, responsive research dashboard.

## Required pages

1. **Overview dashboard** — project description, dataset summary, model readiness and links to analysis pages.
2. **Amazon rating analyzer** — title/body input, predicted 1–5 rating, probabilities, uncertainty and latency.
3. **GoEmotions analyzer** — text input, all 28 emotion scores, predicted labels and uncertainty warning.
4. **Dataset explorer** — sample/split counts, class prevalence, missing data and text-length statistics (show aggregate metadata; do not expose raw licensed text).
5. **Model evaluation** — accuracy/F1 tables, per-class metrics, confusion matrix, training curves, parameter count, artifact size and measured inference latency.
6. **Architecture & methodology** — Word2Vec, BiLSTM, DistilBERT, loss functions and the two data pipelines.
7. **Documentation** — dataset attributions, model limitations, API documentation and deployment details.

## UI requirements

- Clear loading, success, no-result and error states.
- Empty-input validation.
- Disable duplicate submissions while requests are running.
- Handle backend cold starts and timeouts without crashing.
- Display API unavailable/model not ready distinctly.
- Display uncertainty; do not show a prediction as a fact.
- Responsive on laptop and mobile.
- Use the backend's `/api/v1/models` and `/ready` outputs rather than hardcoded readiness.
- Do not fabricate dataset or model metrics in the dashboard. Read them from versioned JSON metrics artifacts.

Suggested folders:

```text
frontend/src/
├── app/
├── pages/
│   ├── Dashboard.tsx
│   ├── AmazonRating.tsx
│   ├── GoEmotions.tsx
│   ├── DatasetExplorer.tsx
│   ├── Evaluation.tsx
│   └── Documentation.tsx
├── components/
│   ├── layout/
│   ├── charts/
│   ├── prediction/
│   └── ui/
├── services/api.ts
├── types/
├── hooks/
└── utils/
```

Do not build authentication, billing, user profiles, chatbot, database-backed history or unnecessary admin features in the seven-day MVP. Browser-local history is optional and must be clear that it is stored locally.

---

# 13. Deployment plan — free tier only

**Target topology:**

- Frontend: Cloudflare Pages (static Vite build).
- Backend: Render free web service only if current free resource limits can run the model artifact(s).
- Model artifacts: Hugging Face Hub public model repository, subject to license/redistribution checks.
- Code/CI: GitHub.
- Training: Colab only, not the deployed host.

Free services can sleep, have limited RAM/CPU, or change quotas. Do not guarantee persistent uptime. Before deployment, measure model RAM footprint and startup time locally.

## 13.1 Backend container

Create a CPU-only Docker image. Install only inference dependencies; do not install Jupyter, Gensim or training extras in production.

Requirements should be split:

- `requirements-train.txt`
- `backend/requirements.txt`

Docker process must bind to `0.0.0.0` and the hosting platform's supplied `PORT` environment variable. Add a `/health` check.

## 13.2 Model download

- Use a public, immutable model repository revision/tag for deployment where possible.
- Store a manifest with artifact filename, SHA-256, model version, label mapping version and preprocessing version.
- Verify checksum after download.
- Do not embed private Hub tokens in frontend bundles.
- If repository is public, use anonymous read/download where supported.

## 13.3 Deploy sequence

1. Run backend tests locally/Colab.
2. Run Docker build locally if possible.
3. Run API using CPU inference and verify both model endpoints.
4. Measure peak memory and cold-start duration.
5. Create Render Web Service from GitHub; select Docker or Python runtime according to the verified build setup.
6. Configure `PORT`, model repository/revision, allowed frontend origin and any required non-secret settings.
7. Deploy and inspect full logs.
8. Test `/health`, `/ready`, both predictions and a deliberately invalid request.
9. Deploy Vite static app to Cloudflare Pages.
10. Set `VITE_API_URL` at build time.
11. Update backend CORS allowlist to exact Pages origin.
12. Test a fresh browser session, mobile layout and cold-start behavior.
13. Save deployment URL and timestamp only after the URL is reachable and tested.

If Render memory is insufficient:

- First try ONNX Runtime CPU inference and validated dynamic quantization.
- Reduce process memory by loading one model lazily, if application behavior permits.
- Consider splitting the endpoints into separately hosted free services only if this does not exceed available quotas or complexity.
- If free hosting cannot support both, deploy frontend plus one live API and provide a verified local Docker demo for the second model only with clear disclosure; report deployment as partially complete. Do not fake a live endpoint.

---

# 14. Testing and release gates

## 14.1 Data tests

- Expected columns exist.
- Labels are in the expected domains.
- No unexplained null/empty texts.
- No invalid label IDs.
- Split sizes and class distributions recorded.
- Duplicates/overlaps checked.
- No vocabulary/Word2Vec fit on held-out data.
- Dataset source and version/URL recorded.

## 14.2 Model tests

- One forward pass returns correct output shape.
- Loss is finite.
- At least one tiny overfit test on a small batch confirms the training loop can learn (diagnostic only, not a benchmark result).
- Validation metric is calculated from correct prediction/target shapes.
- Best checkpoint reloads.
- Test metrics are generated once after model/threshold selection.
- Parameter count and checkpoint file size are measured.

## 14.3 Inference tests

- Tokenizer/preprocessing artifact matches the model.
- PyTorch predictions work on CPU.
- ONNX parity checked if exported.
- Repeated identical input gives stable output in eval mode, within numerical tolerance.
- Long text truncation is deliberate and reported.
- Empty/invalid input is rejected.

## 14.4 API tests

- `/health`.
- `/ready` per model.
- `/api/v1/models`.
- Valid Amazon request.
- Valid GoEmotions request.
- Empty text.
- Missing field.
- Incorrect type.
- Excessive input length.
- Model unavailable.
- CORS.
- Batch limits if batch endpoints are implemented.

## 14.5 Frontend tests

- Routes render and refresh correctly.
- Valid requests reach correct endpoints.
- Loading/error/cold-start states render.
- Probability values are displayed accurately.
- Metrics load from actual metric artifacts.
- No fake hardcoded performance values.
- Layout checked at desktop and mobile sizes.

## 14.6 Release-blocking conditions

Do not declare final release if any of these remain:

- A model was not actually trained/fine-tuned.
- Test data was used for model selection.
- Dataset schema or labels are unclear.
- Model/checkpoint cannot be reloaded.
- The model and tokenizer/preprocessor do not match.
- Public endpoint returns fabricated/hardcoded results.
- Secrets are exposed.
- A reported metric cannot be traced to an evaluation output.
- A deployment URL has not been smoke-tested.

A failed optional ONNX export or optional experiment can be reported as a limitation without blocking the core application if PyTorch inference is fully validated.

---

# 15. Seven-day execution plan

The order is intentionally model-first. The agent should not spend the first days polishing the UI.

## Day 1 — Workspace, datasets, audit

1. Create Drive folders and GitHub repository.
2. Create Colab notebook 00.
3. Record runtime details and package versions.
4. Download Kaggle Amazon dataset.
5. Inspect actual files/columns/license.
6. Load GoEmotions from Hugging Face.
7. Verify splits/feature labels.
8. Run data quality checks and class prevalence analysis.
9. Create immutable manifests/checksums.
10. Produce a short dataset audit report.

**Day 1 gate:** Both dataset sources are accessible; their schemas/labels are verified; no unexplained blocker is hidden.

## Day 2 — Amazon preprocessing and Word2Vec

1. Implement chunked reading.
2. Normalize title/body.
3. Audit nulls, short text, duplicates and class distribution.
4. Preserve official train/test partition; derive validation from train only.
5. Create a stratified development subset with fixed seed.
6. Tokenize and build training-only vocabulary.
7. Train Word2Vec Skip-gram.
8. Save Word2Vec model, vocabulary and preprocessing metadata.
9. Create a small unit test for PAD/UNK/token IDs.

**Day 2 gate:** Word2Vec artifacts exist; vocabulary built only on train; data splits and hashes recorded.

## Day 3 — BiLSTM training and Amazon evaluation

1. Build random-embedding baseline.
2. Build Word2Vec-initialized BiLSTM.
3. Test forward shape and loss.
4. Train using validation monitoring and early stopping.
5. Save best checkpoints after each epoch.
6. Compare baseline vs Word2Vec model.
7. Generate classification report and 5×5 confusion matrix.
8. Inspect errors.
9. Save metrics and experiment records.

**Day 3 gate:** At least one trained model can be reloaded and predicts correctly; metrics are real and reproducible.

## Day 4 — GoEmotions DistilBERT

1. Load `distilbert-base-uncased` tokenizer and base model.
2. Build multi-hot labels of length 28.
3. Check token-length distribution and truncation rate.
4. Tokenize with dynamic padding.
5. Fine-tune with BCEWithLogitsLoss.
6. Save checkpoints after each epoch.
7. Select checkpoint by validation multi-label metric.
8. Tune threshold(s) on validation only.
9. Evaluate once on held-out test.
10. Save per-label metrics, PR/F1 data and error analysis.

**Day 4 gate:** DistilBERT genuinely fine-tuned; multi-label output shape verified; test metrics generated without test tuning.

## Day 5 — Export, inference modules and FastAPI

1. Implement standalone Amazon inference.
2. Implement standalone GoEmotions inference.
3. Verify model artifacts reload outside training notebook state.
4. Attempt ONNX export and parity tests.
5. Keep PyTorch inference fallback.
6. Implement API schemas and routes.
7. Implement health/readiness/model metadata endpoints.
8. Add validation, CORS, logging and exceptions.
9. Write pytest tests.
10. Run API locally/within Colab-compatible local process where permitted, or on a local machine.

**Day 5 gate:** Both model services return outputs through the API; model readiness and failure responses work.

## Day 6 — React frontend and integration

1. Create Vite React TypeScript app.
2. Build responsive layout/sidebar/navigation.
3. Build Amazon rating analyzer.
4. Build GoEmotions analyzer.
5. Build model/dataset/evaluation pages.
6. Read metric JSON files; do not hardcode results.
7. Connect to FastAPI.
8. Test loading, API failures, timeouts and model-not-ready states.
9. Run frontend tests and production build.

**Day 6 gate:** Both model routes work through the frontend against the actual API.

## Day 7 — Deployment, documentation and submission

1. Freeze code and record Git commit.
2. Generate final manifests and metric bundle.
3. Build/test Docker image.
4. Deploy backend if free-tier resources allow.
5. Deploy frontend to Cloudflare Pages.
6. Configure exact CORS origin.
7. Test endpoints from the deployed frontend.
8. Capture screenshots and architecture diagrams.
9. Finish research report with measured metrics only.
10. Generate 12–14 slide presentation.
11. Prepare five-minute demo script.
12. Prepare Windows/Colab installation guide.
13. Create final agent execution report.
14. Verify GitHub repository has no secrets or raw restricted data.

**Day 7 gate:** Every deliverable has a status; live deployment is smoke-tested or clearly marked partially deployed; final report lists all failures and limitations.

---

# 16. Required notebooks and cell-by-cell plan

## Notebook 00 — `00_environment_and_dataset_audit.ipynb`

Cells in this order:

1. Markdown: purpose, date, owner, sources and expected outputs.
2. Runtime/hardware inspection.
3. Drive mount and workspace creation.
4. Dependency inspection and minimal installs.
5. Save package/runtime manifest.
6. Kaggle archive discovery and checksum.
7. Amazon CSV schema preview.
8. Amazon null/label/class distribution audit.
9. Amazon duplicate and text-length audit.
10. Load GoEmotions simplified config.
11. GoEmotions splits/features/sample audit.
12. GoEmotions class prevalence and multi-label count audit.
13. Verify official sources/terms and record citations.
14. Write dataset manifests.
15. Run assertions and produce PASS/FAIL/BLOCKED summary.

## Notebook 01 — `01_amazon_word2vec_bilstm.ipynb`

1. Markdown: problem statement and methodology.
2. Load manifest and cleaned dataset shards.
3. Verify exact split counts and hashes.
4. Visualize text lengths and classes.
5. Define preprocessing/tokenization functions.
6. Fit training-only vocabulary.
7. Train Word2Vec Skip-gram.
8. Build embedding matrix.
9. Unit-test PAD/UNK/OOV and sequence padding.
10. Define random embedding baseline.
11. Define BiLSTM model.
12. Count total/trainable parameters.
13. Overfit a tiny batch as a training-loop diagnostic.
14. Train random-embedding baseline.
15. Train Word2Vec-initialized model.
16. Save checkpoint per epoch.
17. Plot training/validation loss and macro-F1.
18. Select best model using validation only.
19. Evaluate final test once.
20. Generate per-class metrics and confusion matrix.
21. Run error analysis.
22. Save metadata, metrics, checksums and run logs.
23. Final notebook gate with status.

## Notebook 02 — `02_goemotions_distilbert.ipynb`

1. Markdown: task formulation and multi-label warning.
2. Load official dataset config/splits.
3. Derive/verify label mapping.
4. Convert label lists to multi-hot vectors.
5. Audit label frequency/co-occurrence.
6. Audit text lengths/truncation rate.
7. Load tokenizer/base DistilBERT.
8. Tokenize train/validation/test.
9. Verify label/input shapes.
10. Verify model output shape is `[batch_size, 28]`.
11. Count total/trainable parameters.
12. Define metric calculation including micro/macro-F1.
13. Train baseline model with checkpoints.
14. Evaluate validation metrics each epoch.
15. Select best checkpoint using validation only.
16. Tune global/per-label threshold on validation only.
17. Evaluate final test once.
18. Generate per-label metrics and error categories.
19. Save tokenizer, model, thresholds, config and checksums.
20. Record all warnings and unresolved issues.
21. Final notebook gate with status.

## Notebook 03 — `03_export_inference_and_release_checks.ipynb`

1. Load artifacts from persistent Drive (not in-memory notebook variables).
2. Recreate model/tokenizer from saved files.
3. Run PyTorch CPU inference for fixed test examples.
4. Measure model loading time, latency, memory and artifact size.
5. Export ONNX if compatible.
6. Compare PyTorch vs ONNX raw outputs.
7. Run parity test suite.
8. Build model manifest with SHA-256.
9. Create inference package and smoke tests.
10. Generate final metrics bundle for frontend.
11. Validate all expected files and non-zero sizes.
12. Produce release gate report.

---

# 17. Repository deliverables and documentation

The final GitHub repository must contain at least:

```text
nlp-lab/
├── configs/
│   ├── amazon.yaml
│   └── goemotions.yaml
├── ml/
│   ├── common/
│   ├── amazon_rating/
│   │   ├── preprocessing.py
│   │   ├── word2vec.py
│   │   ├── dataset.py
│   │   ├── model.py
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   └── inference.py
│   └── go_emotions/
│       ├── preprocessing.py
│       ├── model.py
│       ├── train.py
│       ├── evaluate.py
│       └── inference.py
├── notebooks/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
├── artifacts/
│   ├── model-manifests/
│   └── metrics/
├── reports/
│   ├── figures/
│   ├── failures/
│   ├── metrics/
│   └── research_report.md
├── docs/
│   ├── installation.md
│   ├── methodology.md
│   ├── architecture.md
│   ├── api.md
│   ├── deployment.md
│   └── demo_script.md
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Required docs:

- `README.md`: project overview, datasets, architecture, setup, screenshots, live URL (only when verified), metrics (only from artifacts), limitations and citations.
- `docs/installation.md`: Colab and local Windows setup, dependency install, data acquisition, notebook execution order, troubleshooting.
- `docs/methodology.md`: dataset description, split policy, preprocessing, Word2Vec, BiLSTM, DistilBERT, losses and metrics.
- `docs/architecture.md`: component diagram and data flow.
- `docs/api.md`: endpoints, schemas, example requests/responses, error responses.
- `docs/deployment.md`: Docker, backend, frontend, environment variables, smoke tests and free-tier constraints.
- `docs/demo_script.md`: five-minute demonstration, sample safe test inputs and fallback screenshots.
- `reports/research_report.md`: academic report with measured results and sources.

---

# 18. Automated testing and CI

Use GitHub Actions to verify code quality without retraining models on every push.

Minimum CI jobs:

1. Python syntax/import checks.
2. Backend pytest tests using mocked/lightweight inference dependencies where appropriate.
3. Frontend npm install/build/lint/test.
4. Secret scan or repository secret review.
5. Check that metric/model manifests conform to expected JSON schema.

Do not run full model training in CI. Training is performed in Colab and recorded with run metadata.

The final `ci.yml` must be executed at least once. Report the actual workflow result and commit SHA.

---

# 19. Failure handling and anti-hallucination audit system

This section is mandatory. Its purpose is to prevent the agent from masking uncertainty or inventing progress.

## 19.1 Every step must write a run log

Create `reports/run_log.md` with entries like:

```text
[YYYY-MM-DD HH:MM:SS UTC] [STEP-ID] [PASS/FAIL/BLOCKED/SKIPPED/WARN/UNKNOWN]
Action:
Input files/paths:
Command or notebook/cell:
Observed output:
Evidence path:
Error/exception:
Decision taken:
Next step:
```

## 19.2 Failure log schema

Append one JSON object per failed or blocked event to `reports/failures/failure_log.jsonl`:

```json
{
  "failure_id": "F-0001",
  "timestamp_utc": "actual timestamp",
  "step_id": "DATA-04",
  "stage": "dataset_acquisition",
  "status": "FAIL",
  "notebook": "00_environment_and_dataset_audit.ipynb",
  "cell_number": 7,
  "file_path": "actual/path/or/UNKNOWN",
  "command": "actual command or operation",
  "error_type": "actual exception class or UNKNOWN",
  "error_message": "exact shortened error message",
  "stack_trace_path": "reports/failures/F-0001.txt",
  "expected": "what should have happened",
  "observed": "what actually happened",
  "root_cause": "confirmed cause or UNKNOWN",
  "evidence": ["paths, logs, outputs, source URLs"],
  "attempted_fixes": ["only fixes actually attempted"],
  "result_of_fixes": ["actual outcome"],
  "workaround": "none or verified workaround",
  "remaining_risk": "actual risk",
  "resolved": false
}
```

Do not use placeholder text like `actual timestamp` in a real logged record. Those strings above describe the schema only.

## 19.3 Failure protocol

When any step fails:

1. Stop dependent steps; do not continue as if it passed.
2. Capture the full traceback/log output to a text file.
3. Record notebook name, cell number, function/file path and command.
4. Record expected versus observed behavior.
5. Classify root cause as `CONFIRMED`, `LIKELY` or `UNKNOWN`.
6. Inspect the error and relevant official documentation/source.
7. Propose one minimal fix at a time.
8. Apply the fix and rerun only the failed step plus necessary dependent tests.
9. Record each attempted fix and exact result.
10. If two reasonable attempts fail, stop and report the blocker rather than inventing a solution or making unrelated changes.
11. If a workaround changes the method, document its effect on research validity and disclose it in the final report.
12. A failure may only be marked resolved after a successful rerun and evidence artifact exist.

## 19.4 Anti-hallucination rules for metrics and claims

- A result must link to a file, notebook output, CI run or official source.
- A claim without evidence must be labelled `UNVERIFIED`.
- A metric is valid only if its evaluation script, split and checkpoint are identifiable.
- The report must identify whether a score is validation or test.
- Never convert a class score or model confidence into a claim of certainty.
- A model confidence of 0.95 is not proof of 95% correctness.
- Do not compare task scores across the two unrelated datasets as a fair model ranking.
- If the runtime disconnected and an epoch was not completed, report the interruption and resume from the last verified checkpoint.
- If a package install or dataset download was not verified, state that explicitly.
- If a hosted URL was not tested from an external browser/client, do not state that deployment succeeded.

## 19.5 Final execution report

At the end, produce `reports/FINAL_EXECUTION_REPORT.md` with:

1. Executive summary.
2. Exact environment and hardware used.
3. Dataset source links, versions/revisions, license notes, row counts and split counts.
4. Data quality findings and exclusions.
5. Models actually trained and parameter counts.
6. Experiment table with run IDs and configs.
7. Validation and test metrics, clearly separated.
8. Figures/artifact paths.
9. Model export and parity status.
10. API test results.
11. Frontend test/build result.
12. CI result and commit SHA.
13. Deployment URLs and smoke-test evidence, or explicit reason not deployed.
14. **Failures and exact locations:** step ID, notebook, cell, source file/line, error, root cause confidence, attempted fixes, resolution.
15. Blocked/skipped/unknown tasks and their impact.
16. Known limitations and risks.
17. Final status of every deliverable.
18. What remains to be done.

Also create `reports/FINAL_EXECUTION_REPORT.json` with machine-readable statuses and links to evidence files.

---

# 20. Agent self-review rubric — target 95/100 evidence score

The user requested an expert-level execution standard. Do not claim to be “95% expert”; expertise is not measurable from a self-assessment prompt. Instead, use this evidence-based quality rubric. The agent may report a score only after checking artifacts and tests.

| Category | Weight | Evidence required |
|---|---:|---|
| Dataset/source integrity | 15 | Actual links, license notes, inspected schema, row counts, hashes, split manifests |
| Data quality/leakage controls | 15 | Null/duplicate audit, split boundaries, training-only vocab/Word2Vec, no test tuning |
| ML correctness | 20 | Correct architectures/losses, real training, checkpoints, metrics, parameter counts |
| Experimental validity | 10 | Reproducible configs, validation selection, held-out test, error analysis |
| Reproducibility/MLOps | 10 | Run IDs, seeds, versions, manifests, artifact hashes, checkpoint recovery |
| Backend/API engineering | 10 | Schemas, model lifecycle, validation, errors, tests, readiness |
| Frontend/integration | 8 | Actual API integration, responsive UI, loading/error states, no hardcoded metrics |
| Deployment/reliability | 5 | Tested deployment or documented blocker, cold-start/resource checks, secrets hygiene |
| Documentation/reporting | 7 | Setup, methodology, citations, presentation, failure report |
| **Total** | **100** | |

### Iterative quality loop at every major gate

After each major stage (dataset audit, each model, API, frontend, deployment and final documentation), run this loop:

1. **Plan:** restate the stage objective, inputs, outputs and acceptance tests.
2. **Implement:** make the smallest coherent change.
3. **Execute:** run the exact notebook cell/script/test in the connected environment.
4. **Inspect:** inspect logs, shapes, counts, files and test output.
5. **Challenge:** try to falsify the result (e.g. wrong label map, empty file, test leakage, failed checkpoint reload, mismatched tokenizer, hardcoded dashboard metric).
6. **Score:** grade only the stage evidence using the rubric below; mark unknown evidence as unverified.
7. **Improve:** fix the highest-impact verified weakness and rerun the failed/affected checks.
8. **Freeze:** record the passing commit/artifact hashes and move to the next stage.

Run no more than two speculative repair attempts for the same issue without new evidence. After that, stop and mark it `BLOCKED` or `UNKNOWN`, with the evidence and required user decision. Do not endlessly rewrite code to chase a numerical score.

### Scoring rules

- Target: **95/100 or higher**.
- Do not award points for prose that merely promises an implementation.
- If core P0 gate fails (data leakage, model not trained, false metrics, secret exposure, fabricated deployment), overall certification is `NOT PASSED` regardless of score.
- If any evidence is missing, assign zero for that evidence item or mark it `UNKNOWN`; do not infer a pass.
- The final report must include category scores, evidence paths and deductions.
- A 95/100 score is a quality target for the deliverable, not a claim that the AI agent has 95% expertise.

---

# 21. Final optimized Gemini master prompt

Copy the prompt below into Gemini after opening the Colab project. Attach this entire Markdown file as project context. If Gemini cannot directly control the notebook, ask it to generate/import the notebook cells and then run them through the connected Colab interface. Do not claim to have executed anything unless Colab actually executed it.

---

## GEMINI AGENT PROMPT — START

You are the lead ML engineer, NLP researcher, MLOps engineer and full-stack implementation agent for the project specified in `NLP_Lab_Gemini_Colab_Agent_Execution_Spec.md`.

Your task is to execute the full project, not merely explain how to do it. Use Google Colab as the primary notebook environment. Use the connected Colab runtime and Google Drive if available. Build reusable source files and notebooks in the repository structure defined in the specification.

### Authority and source of truth

1. This specification is the project contract.
2. Dataset cards, original dataset pages, official library documentation and executed runtime outputs are the evidence sources.
3. If sources conflict, stop, show the conflict and ask for a decision. Do not select whichever source makes progress easiest.
4. Never invent dataset counts, labels, class balance, package versions, model scores, parameter counts, file paths, runtime properties, error causes or deployment status.
5. Use `UNKNOWN` when facts cannot be verified.

### Fixed project

- Kaggle Amazon Reviews for Sentiment Analysis, fine-grained five-class: https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv
- Hugging Face GoEmotions official repository, simplified config: https://huggingface.co/datasets/google-research-datasets/go_emotions
- Model A: Word2Vec Skip-gram + BiLSTM, five rating classes.
- Model B: fine-tuned DistilBERT, 28-label multi-label GoEmotions.
- Application: React + TypeScript + Vite frontend; FastAPI backend.
- Training: PyTorch; Gensim; Hugging Face Transformers/Datasets.
- Target: seven-day solo project, zero paid budget.

Do not substitute datasets or convert GoEmotions into a six-class single-label task.

### Execution loop

For each numbered step:

1. State the exact step ID and intended output.
2. Inspect runtime/files/schema before editing or running.
3. Create only the code needed for that step.
4. Execute it in the actual runtime.
5. Inspect and validate the output using assertions where practical.
6. Save evidence to Drive/repository.
7. Update `reports/run_log.md` with PASS/FAIL/BLOCKED/SKIPPED/WARN/UNKNOWN.
8. If any failure occurs, append a structured record to `reports/failures/failure_log.jsonl`, save the traceback, and follow the failure protocol in section 19.
9. Continue only when prerequisites pass.

Do not produce all code at once and assert that it works. Work incrementally and run every critical cell. Keep notebooks restartable and checkpoint models to Drive after each epoch. Do not rely on variables that exist only in RAM from an earlier session.

### Dataset and modelling requirements

- Audit the actual Amazon data files, license, columns, nulls, labels, duplicates, text lengths and split sizes before training.
- Use training-only Word2Vec vocabulary/embeddings. Preserve official train/test boundaries; derive validation from train only.
- Build a random-embedding BiLSTM baseline and a Word2Vec-initialized BiLSTM with identical evaluation conditions.
- Use five logits and CrossEntropyLoss for the five rating labels.
- Load GoEmotions `simplified`, inspect its feature metadata and label mapping, and preserve official splits.
- Build 28-dimensional multi-hot labels.
- Fine-tune the pretrained DistilBERT base weights. Use 28 output logits, BCEWithLogitsLoss, sigmoid inference and validation-selected thresholds.
- Never use softmax/CrossEntropyLoss for the multi-label GoEmotions task.
- Never tune against the test partition.
- Report macro/micro/per-class metrics appropriate to each task.

### Engineering requirements

- Create reusable Python modules; notebooks orchestrate them.
- Record seeds, run IDs, package versions, hardware, configs, checkpoint hashes and dataset manifests.
- Save metric JSON/CSV and plots from actual runs.
- Export ONNX only after PyTorch inference works; run PyTorch-vs-ONNX parity tests.
- Implement FastAPI validation, health/readiness, model metadata, structured errors, restricted CORS and safe logging.
- Implement React analyzers, dataset/model dashboards and truthful loading/error states.
- Do not hardcode scores or model readiness in the frontend.
- Test locally before free-tier deployment. Colab is not a production web host.
- Do not expose tokens or commit raw datasets.

### Time and prioritization

Follow the seven-day plan in section 15. Prioritize P0: both trained models, data validity, evaluation, API integration, working frontend and honest final report. Drop optional features before sacrificing test validity or the two model pipelines. If time/compute resources make a step infeasible, record it as BLOCKED/SKIPPED and explain the impact.

### Iterative self-audit

At the end of every major stage, compare the actual artifacts against its acceptance criteria. If the stage scores below 95% on the evidence rubric, identify the three highest-impact gaps, repair them one by one, rerun relevant tests and recalculate the score. If a gap is blocked by compute, platform limits, license uncertainty or missing access, do not fabricate a pass; document it and continue only if it does not violate a P0 release gate. The 95% target is a delivery-quality threshold, not a claim of model/agent expertise.

### Hallucination prevention

- Every factual result needs an evidence file, runtime output or official URL.
- No evidence means `UNVERIFIED`.
- Never state “completed”, “deployed”, “tested”, “trained” or “passed” without the corresponding execution evidence.
- Distinguish validation metrics from final test metrics.
- Distinguish measured latency from estimated latency.
- Distinguish a planned checkpoint path from a file that actually exists.
- Do not guess root causes; mark them `UNKNOWN` until supported by evidence.
- Do not conceal an unsuccessful attempt after a workaround succeeds; preserve the original failure and document the workaround.

### Mandatory final output

At completion, create and verify:

- All notebooks and source modules.
- Trained model checkpoints and tokenizer/vocabulary artifacts.
- Dataset and model manifests.
- Evaluation metrics and plots.
- API and frontend tests.
- Docker/deployment files.
- Installation/setup guide.
- Research report.
- 12–14 slide presentation source or slide-ready content.
- Five-minute demo script.
- `reports/FINAL_EXECUTION_REPORT.md`.
- `reports/FINAL_EXECUTION_REPORT.json`.
- `reports/failures/failure_log.jsonl` (even if empty, create it and state that no failures were recorded only if that is true).

Before finalizing, run the 100-point evidence rubric in section 20. A score of 95 or higher is allowed only when evidence supports it and all P0 release gates pass. Otherwise report the true score and list the exact deductions. Do not alter results to reach 95.

Start now with Section 4 / Day 1. Your first action is runtime inspection and project workspace verification. Do not start model training until dataset audits pass.

## GEMINI AGENT PROMPT — END

---

# 22. Final preflight checklist for the user

Before allowing the agent to train:

- [ ] Open Colab and create the four notebooks.
- [ ] Attach/make this Markdown specification available to Gemini.
- [ ] Confirm the Drive workspace exists.
- [ ] Download the Kaggle dataset and inspect its current terms/license.
- [ ] Confirm Colab has a usable GPU, or explicitly accept CPU-only/longer execution.
- [ ] Confirm the GoEmotions `simplified` config loads from Hugging Face.
- [ ] Confirm the agent created run and failure logs.
- [ ] Confirm no secrets are visible in notebook output.
- [ ] Confirm data audits passed before training.

**The first successful milestone is not a high accuracy score. It is a verified, reproducible data pipeline with correct labels, clean split boundaries, source attribution and an honest audit report.**
