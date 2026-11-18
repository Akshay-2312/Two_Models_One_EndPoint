"""Standalone inference for the fine-tuned GoEmotions DistilBERT model."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class ModelNotReadyError(RuntimeError):
    """Raised when the GoEmotions model bundle is unavailable or invalid."""


LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization", "relief",
    "remorse", "sadness", "surprise", "neutral",
]


def _default_bundle_path() -> Path:
    return Path(
        os.environ.get(
            "GOEMOTIONS_MODEL_DIR",
            Path(__file__).resolve().parents[2]
            / "artifacts"
            / "models"
            / "distilbert_goemotions",
        )
    )


class GoEmotionsInference:
    """Loads and serves the saved 28-label GoEmotions model."""

    def __init__(
        self,
        bundle_dir: str | Path | None = None,
        threshold: float | None = None,
    ) -> None:
        self.bundle_dir = Path(bundle_dir) if bundle_dir else _default_bundle_path()
        self.threshold = threshold
        self.tokenizer: Any = None
        self.model: Any = None
        self.ready = False
        self.load_error: str | None = None

    def load(self) -> None:
        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
        except ImportError as exc:
            self.load_error = "Transformers is required for GoEmotions inference."
            raise ModelNotReadyError(self.load_error) from exc
        try:
            config_path = self.bundle_dir / "config.json"
            threshold_path = self.bundle_dir / "thresholds.json"
            if not self.bundle_dir.is_dir() or not config_path.is_file():
                raise ModelNotReadyError(
                    f"GoEmotions model directory is unavailable: {self.bundle_dir}"
                )
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.bundle_dir))
            self.model = AutoModelForSequenceClassification.from_pretrained(
                str(self.bundle_dir)
            )
            if self.threshold is None:
                if not threshold_path.is_file():
                    raise ModelNotReadyError(
                        f"Missing threshold configuration: {threshold_path}"
                    )
                config = json.loads(threshold_path.read_text(encoding="utf-8"))
                self.threshold = float(config["global_threshold"])
            if not 0.0 < self.threshold < 1.0:
                raise ModelNotReadyError("GoEmotions threshold must be between 0 and 1.")
            if len(LABELS) != int(self.model.config.num_labels):
                raise ModelNotReadyError(
                    f"Expected 28 labels, got {self.model.config.num_labels}."
                )
            self.model.eval()
            self.ready = True
            self.load_error = None
        except ModelNotReadyError as exc:
            self.ready = False
            self.load_error = str(exc)
            raise
        except Exception as exc:
            self.ready = False
            self.load_error = f"{type(exc).__name__}: {exc}"
            raise ModelNotReadyError(self.load_error) from exc

    def predict(self, text: str) -> dict[str, Any]:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("text must be a non-empty string")
        if not self.ready or self.model is None or self.tokenizer is None:
            raise ModelNotReadyError(
                self.load_error or "GoEmotions model is not loaded."
            )
        import torch

        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, max_length=128
        )
        with torch.no_grad():
            probabilities = torch.sigmoid(self.model(**inputs).logits)[0].tolist()
        predicted = [
            {"label": label, "probability": probabilities[index]}
            for index, label in enumerate(LABELS)
            if probabilities[index] >= self.threshold
        ]
        return {
            "emotions": predicted,
            "probabilities": dict(zip(LABELS, probabilities)),
            "threshold": self.threshold,
        }
