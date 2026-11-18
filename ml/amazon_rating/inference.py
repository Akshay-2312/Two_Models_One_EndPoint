"""Standalone inference for the Word2Vec-initialized Amazon BiLSTM."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class ModelNotReadyError(RuntimeError):
    """Raised when the Amazon model bundle is unavailable or invalid."""


def _require_torch() -> tuple[Any, Any]:
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise ModelNotReadyError(
            "PyTorch is required for Amazon inference."
        ) from exc
    return torch, nn


def _tokenize(text: str) -> list[str]:
    try:
        from gensim.utils import simple_preprocess
    except ImportError as exc:
        raise ModelNotReadyError(
            "Gensim is required for Amazon tokenization."
        ) from exc
    return simple_preprocess(text, deacc=True)


def _default_bundle_path() -> Path:
    return Path(
        os.environ.get(
            "AMAZON_MODEL_DIR",
            Path(__file__).resolve().parents[2]
            / "artifacts"
            / "models"
            / "word2vec_bilstm",
        )
    )


def _default_vocab_path(bundle_dir: Path) -> Path:
    configured = os.environ.get("AMAZON_VOCAB_PATH")
    if configured:
        return Path(configured)
    return bundle_dir / "vocab.json"


def build_model(vocab_size: int, embedding_matrix: Any) -> Any:
    torch, nn = _require_torch()

    class AmazonBiLSTM(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.embedding = nn.Embedding(
                vocab_size, 200, padding_idx=0
            )
            self.embedding.weight.data.copy_(
                torch.from_numpy(embedding_matrix)
            )
            self.lstm = nn.LSTM(
                input_size=200,
                hidden_size=128,
                num_layers=2,
                batch_first=True,
                bidirectional=True,
                dropout=0.3,
            )
            self.dropout = nn.Dropout(0.3)
            self.classifier = nn.Linear(256, 5)

        def forward(self, input_ids: Any) -> Any:
            embedded = self.embedding(input_ids)
            _, (hidden, _) = self.lstm(embedded)
            hidden_concat = torch.cat((hidden[-2], hidden[-1]), dim=1)
            return self.classifier(self.dropout(hidden_concat))

    return AmazonBiLSTM()


class AmazonInference:
    """Loads and serves the saved Amazon rating model."""

    def __init__(
        self,
        bundle_dir: str | Path | None = None,
        device: str | None = None,
    ) -> None:
        self.bundle_dir = Path(bundle_dir) if bundle_dir else _default_bundle_path()
        self.device_name = device or os.environ.get("MODEL_DEVICE", "cpu")
        self.model: Any = None
        self.vocab: dict[str, int] | None = None
        self.ready = False
        self.load_error: str | None = None

    def load(self) -> None:
        torch, _ = _require_torch()
        try:
            import numpy as np

            vocab_path = _default_vocab_path(self.bundle_dir)
            matrix_path = self.bundle_dir / "embedding_matrix.npy"
            checkpoint_path = self.bundle_dir / "w2v_bilstm_best.pt"
            missing = [
                str(path)
                for path in (vocab_path, matrix_path, checkpoint_path)
                if not path.is_file()
            ]
            if missing:
                raise ModelNotReadyError(
                    "Amazon model bundle is missing: " + ", ".join(missing)
                )
            self.vocab = json.loads(vocab_path.read_text(encoding="utf-8"))
            embedding_matrix = np.load(matrix_path)
            if embedding_matrix.ndim != 2 or embedding_matrix.shape[1] != 200:
                raise ModelNotReadyError(
                    "Amazon embedding_matrix.npy must have shape (vocab_size, 200)."
                )
            self.model = build_model(len(self.vocab), embedding_matrix)
            state = torch.load(checkpoint_path, map_location="cpu")
            self.model.load_state_dict(state)
            self.model.to(self.device_name)
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
        if not self.ready or self.model is None or self.vocab is None:
            raise ModelNotReadyError(self.load_error or "Amazon model is not loaded.")
        torch, _ = _require_torch()
        max_len = 256
        unk = self.vocab["<UNK>"]
        pad = self.vocab["<PAD>"]
        ids = [self.vocab.get(token, unk) for token in _tokenize(text)[:max_len]]
        ids.extend([pad] * (max_len - len(ids)))
        with torch.no_grad():
            logits = self.model(
                torch.tensor([ids], dtype=torch.long, device=self.device_name)
            )
            probabilities = torch.softmax(logits, dim=1)[0].cpu().tolist()
        index = max(range(len(probabilities)), key=probabilities.__getitem__)
        return {
            "rating": index + 1,
            "probabilities": probabilities,
        }
