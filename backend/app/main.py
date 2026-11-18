from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Callable, TypeVar

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ml.amazon_rating import AmazonInference
from ml.amazon_rating.inference import ModelNotReadyError as AmazonModelNotReadyError
from ml.go_emotions import GoEmotionsInference
from ml.go_emotions.inference import ModelNotReadyError as GoEmotionsModelNotReadyError

from .schemas import (
    AmazonPrediction,
    DatasetSamplesResponse,
    DatasetSummaryResponse,
    ErrorResponse,
    GoEmotionsPrediction,
    MetadataResponse,
    ModelLabResponse,
    ReadinessResponse,
    StatisticsResponse,
    TechnologyManifestResponse,
    TextRequest,
)

logger = logging.getLogger("nlp_lab_api")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="NLP Lab API",
    description="Inference and evaluation API for NLP models",
    version="0.1.0",
)

# The Next.js client is served from :3000. :5173 stays in the list for the
# legacy Vite preview so older local setups keep working.
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173"
)

configured_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
logger.info("CORS allowlist: %s", ", ".join(configured_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

amazon_model = AmazonInference()
go_emotions_model = GoEmotionsInference()
ModelError = (AmazonModelNotReadyError, GoEmotionsModelNotReadyError)
T = TypeVar("T")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    logger.info("Validation failed for %s", request.url.path)
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "detail": "; ".join(
                f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}"
                for error in exc.errors()
            ),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception("Unhandled API error for %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "detail": "Internal server error."},
    )


def _load_model(model: T) -> T:
    if not getattr(model, "ready", False):
        model.load()  # type: ignore[attr-defined]
    return model


def _model_status(model: Any) -> dict[str, Any]:
    try:
        _load_model(model)
    except ModelError:
        return {
            "ready": False,
            "error": getattr(model, "load_error", "Model is unavailable."),
        }
    return {"ready": True, "error": None}


@app.get("/", response_model=dict[str, str])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "nlp-lab-api"}


@app.get("/health", response_model=dict[str, str])
def health() -> dict[str, str]:
    return health_check()


@app.get("/readiness", response_model=ReadinessResponse)
def readiness() -> ReadinessResponse:
    models = {
        "amazon_rating": _model_status(amazon_model),
        "go_emotions": _model_status(go_emotions_model),
    }
    ready = all(model_status["ready"] for model_status in models.values())
    return ReadinessResponse(
        status="ready" if ready else "not_ready", models=models
    )


@app.get("/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    return MetadataResponse(
        service="nlp-lab-api",
        version=app.version,
        models={
            "amazon_rating": {
                "task": "five-class rating classification",
                "architecture": "Word2Vec-initialized two-layer bidirectional LSTM",
                "classes": 5,
                "runtime": "PyTorch with ONNX parity export",
            },
            "go_emotions": {
                "task": "multi-label emotion classification",
                "architecture": "fine-tuned DistilBERT",
                "classes": 28,
                "runtime": "PyTorch with ONNX parity export",
            },
        },
    )


REPO_ROOT = Path(__file__).resolve().parents[2]
DATASET_SUMMARY_PATH = "data/dataset_explorer_summary.json"
MODEL_LAB_PATH = "data/model_lab_artifacts.json"
TECHNOLOGY_MANIFEST_PATH = "data/technology_manifest.json"
VALID_DATASET_IDS = ("amazon_reviews", "go_emotions")
DEFAULT_SAMPLE_NOTICES = {
    "amazon_reviews": (
        "Raw Kaggle Amazon review records are excluded from public redistribution "
        "under repository licensing and data-governance rules."
    ),
    "go_emotions": (
        "Raw Reddit comment samples are not committed in repository artifacts "
        "(data/README.md prohibits raw dataset commits)."
    ),
}


def _read_json_artifact(rel_path: str) -> dict[str, Any]:
    target = REPO_ROOT / rel_path
    if not target.exists():
        return {}
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _load_dataset_summary() -> dict[str, Any] | None:
    target = REPO_ROOT / DATASET_SUMMARY_PATH
    if not target.is_file():
        return None
    try:
        summary = json.loads(target.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Failed to parse %s", target)
        return None

    if not isinstance(summary, dict) or not isinstance(summary.get("datasets"), dict):
        return None

    datasets = summary["datasets"]

    # Cross-check live split numbers and distributions from committed quality artifacts when present.
    amazon_quality = _read_json_artifact("data/amazon_data_quality.json")
    amazon_entry = datasets.get("amazon_reviews")
    if amazon_quality and isinstance(amazon_entry, dict):
        splits = dict(amazon_entry.get("splits") or {})
        if isinstance(amazon_quality.get("train_rows"), int):
            splits["train"] = amazon_quality["train_rows"]
        if isinstance(amazon_quality.get("test_rows"), int):
            splits["test"] = amazon_quality["test_rows"]
        amazon_entry["splits"] = splits

        class_dist = dict(amazon_entry.get("class_distribution") or {})
        if isinstance(amazon_quality.get("train_class_distribution"), dict):
            class_dist["train"] = amazon_quality["train_class_distribution"]
        if isinstance(amazon_quality.get("test_class_distribution"), dict):
            class_dist["test"] = amazon_quality["test_class_distribution"]
        amazon_entry["class_distribution"] = class_dist

    go_quality = _read_json_artifact("data/goemotions_data_quality.json")
    go_entry = datasets.get("go_emotions")
    if go_quality and isinstance(go_entry, dict):
        splits = dict(go_entry.get("splits") or {})
        class_prevalence = dict(go_entry.get("class_prevalence") or {})
        labels_per_example = dict(go_entry.get("labels_per_example") or {})
        for split_name in ("train", "validation", "test"):
            split_stats = go_quality.get(split_name)
            if not isinstance(split_stats, dict):
                continue
            if isinstance(split_stats.get("total_rows"), int):
                splits[split_name] = split_stats["total_rows"]
            if isinstance(split_stats.get("class_prevalence"), dict):
                class_prevalence[split_name] = split_stats["class_prevalence"]
            if isinstance(split_stats.get("labels_per_example_distribution"), dict):
                labels_per_example[split_name] = split_stats[
                    "labels_per_example_distribution"
                ]
        go_entry["splits"] = splits
        go_entry["class_prevalence"] = class_prevalence
        go_entry["labels_per_example"] = labels_per_example

    return summary


def _inspect_artifact_file(rel_path: str) -> dict[str, Any]:
    path_obj = Path(rel_path)
    if path_obj.is_absolute():
        return {"path": rel_path, "exists": False, "size_bytes": None}
    repo_root_resolved = REPO_ROOT.resolve()
    target = (REPO_ROOT / path_obj).resolve()
    if not target.is_relative_to(repo_root_resolved):
        return {"path": rel_path, "exists": False, "size_bytes": None}
    if target.is_file():
        return {"path": rel_path, "exists": True, "size_bytes": target.stat().st_size}
    return {"path": rel_path, "exists": False, "size_bytes": None}


def _load_model_lab() -> dict[str, Any] | None:
    target = REPO_ROOT / MODEL_LAB_PATH
    if not target.is_file():
        return None
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Failed to parse %s", target)
        return None

    if not isinstance(payload, dict) or not isinstance(payload.get("tracks"), dict):
        return None

    tracks = payload["tracks"]
    model_instances = {
        "amazon_rating": amazon_model,
        "go_emotions": go_emotions_model,
    }
    for track_id, model_instance in model_instances.items():
        track = tracks.get(track_id)
        if not isinstance(track, dict):
            continue
        raw_files = track.get("artifact_files") or []
        inspected_files = []
        for entry in raw_files:
            rel_path = entry.get("path") if isinstance(entry, dict) else entry
            if isinstance(rel_path, str):
                inspected_files.append(_inspect_artifact_file(rel_path))
        track["artifact_files"] = inspected_files
        track["readiness"] = _model_status(model_instance)

    return payload


def _load_technology_manifest() -> dict[str, Any] | None:
    target = REPO_ROOT / TECHNOLOGY_MANIFEST_PATH
    if not target.is_file():
        return None
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Failed to parse %s", target)
        return None

    if (
        not isinstance(payload, dict)
        or not isinstance(payload.get("technologies"), list)
        or not isinstance(payload.get("boundaries"), list)
        or not isinstance(payload.get("categories_summary"), dict)
    ):
        return None

    raw_onnx_paths = payload.get("onnx_artifact_paths")
    if not isinstance(raw_onnx_paths, list):
        raw_onnx_paths = [
            "artifacts/models/onnx/amazon_bilstm.onnx",
            "artifacts/models/onnx/goemotions_distilbert.onnx",
        ]
    onnx_paths = [
        rel_path.replace("\\", "/")
        for rel_path in raw_onnx_paths
        if isinstance(rel_path, str)
    ]

    payload["onnx_artifact_paths"] = onnx_paths
    payload["onnx_artifacts_expected"] = len(onnx_paths)
    payload["onnx_artifacts_present"] = sum(
        1 for rel_path in onnx_paths if _inspect_artifact_file(rel_path)["exists"]
    )
    payload["api_version"] = app.version
    payload["readiness"] = {
        "amazon_rating": _model_status(amazon_model),
        "go_emotions": _model_status(go_emotions_model),
    }
    return payload


@app.get("/statistics", response_model=StatisticsResponse)
def statistics() -> StatisticsResponse:
    return StatisticsResponse(
        datasets={
            "amazon_reviews": _read_json_artifact("data/amazon_data_quality.json"),
            "go_emotions": _read_json_artifact("data/goemotions_data_quality.json"),
        },
        metrics={
            "amazon_rating": _read_json_artifact(
                "reports/metrics/word2vec_bilstm_test_metrics.json"
            ),
            "go_emotions": _read_json_artifact(
                "reports/metrics/distilbert_goemotions_test_metrics.json"
            ),
        },
    )


@app.get(
    "/datasets/summary",
    response_model=DatasetSummaryResponse,
    responses={503: {"model": ErrorResponse}},
)
def datasets_summary() -> Any:
    summary = _load_dataset_summary()
    if summary is None:
        return JSONResponse(
            status_code=503,
            content={
                "error": "dataset_summary_unavailable",
                "detail": "Dataset explorer summary artifact is missing or unreadable.",
            },
        )
    return DatasetSummaryResponse.model_validate(summary)


@app.get(
    "/models/lab",
    response_model=ModelLabResponse,
    responses={503: {"model": ErrorResponse}},
)
def models_lab() -> Any:
    payload = _load_model_lab()
    if payload is None:
        return JSONResponse(
            status_code=503,
            content={
                "error": "model_lab_unavailable",
                "detail": "Model lab metadata artifact is missing or unreadable.",
            },
        )
    return ModelLabResponse.model_validate(payload)


@app.get(
    "/technology",
    response_model=TechnologyManifestResponse,
    responses={503: {"model": ErrorResponse}},
)
def technology_stack() -> Any:
    payload = _load_technology_manifest()
    if payload is None:
        return JSONResponse(
            status_code=503,
            content={
                "error": "technology_manifest_unavailable",
                "detail": "Technology stack manifest artifact is missing or unreadable.",
            },
        )
    return TechnologyManifestResponse.model_validate(payload)


@app.get(
    "/datasets/{dataset_id}/samples",
    response_model=DatasetSamplesResponse,
    responses={404: {"model": ErrorResponse}},
)
def dataset_samples(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> Any:
    if dataset_id not in VALID_DATASET_IDS:
        return JSONResponse(
            status_code=404,
            content={
                "error": "dataset_not_found",
                "detail": (
                    f"Unknown dataset '{dataset_id}'. "
                    f"Expected one of: {', '.join(VALID_DATASET_IDS)}."
                ),
            },
        )

    notice = DEFAULT_SAMPLE_NOTICES[dataset_id]
    summary = _load_dataset_summary()
    if summary is not None:
        policy = (
            summary.get("datasets", {})
            .get(dataset_id, {})
            .get("samples_policy", {})
        )
        if isinstance(policy.get("reason"), str) and policy["reason"].strip():
            notice = policy["reason"]

    # Raw dataset records are never approved for public redistribution in this API.
    return DatasetSamplesResponse(
        dataset_id=dataset_id,
        approved=False,
        notice=notice,
        total_available=0,
        page=page,
        page_size=page_size,
        items=[],
    )



@app.post(
    "/predict/amazon",
    response_model=AmazonPrediction,
    responses={503: {"model": ErrorResponse}},
)
def predict_amazon(request: TextRequest) -> AmazonPrediction:
    try:
        return AmazonPrediction(**_load_model(amazon_model).predict(request.text))
    except ModelError as exc:
        logger.warning("Amazon model unavailable: %s", exc)
        return _unavailable_response(str(exc))


@app.post(
    "/predict/go-emotions",
    response_model=GoEmotionsPrediction,
    responses={503: {"model": ErrorResponse}},
)
def predict_go_emotions(request: TextRequest) -> GoEmotionsPrediction:
    try:
        return GoEmotionsPrediction(
            **_load_model(go_emotions_model).predict(request.text)
        )
    except ModelError as exc:
        logger.warning("GoEmotions model unavailable: %s", exc)
        return _unavailable_response(str(exc))


def _unavailable_response(detail: str) -> Any:
    return JSONResponse(
        status_code=503,
        content={"error": "model_not_ready", "detail": detail},
    )
