from __future__ import annotations

import logging
import os
from typing import Any, Callable, TypeVar

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ml.amazon_rating import AmazonInference
from ml.amazon_rating.inference import ModelNotReadyError as AmazonModelNotReadyError
from ml.go_emotions import GoEmotionsInference
from ml.go_emotions.inference import ModelNotReadyError as GoEmotionsModelNotReadyError

from .schemas import (
    AmazonPrediction,
    ErrorResponse,
    GoEmotionsPrediction,
    MetadataResponse,
    ReadinessResponse,
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
