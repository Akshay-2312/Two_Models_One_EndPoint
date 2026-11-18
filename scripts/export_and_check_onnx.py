"""Export both local models to ONNX and record PyTorch parity results."""

from __future__ import annotations

import json
import os
from pathlib import Path

import torch

from ml.amazon_rating import AmazonInference
from ml.go_emotions import GoEmotionsInference
from ml.common.onnx_export import (
    compare_logits,
    export_amazon,
    export_goemotions,
    write_result,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "models" / "onnx"


def main() -> None:
    os.environ.setdefault(
        "AMAZON_MODEL_DIR",
        str(ROOT / "artifacts" / "models" / "word2vec_bilstm"),
    )
    os.environ.setdefault(
        "AMAZON_VOCAB_PATH",
        str(ROOT / "artifacts" / "models" / "word2vec_bilstm" / "vocab.json"),
    )
    os.environ.setdefault(
        "GOEMOTIONS_MODEL_DIR",
        str(ROOT / "artifacts" / "models" / "distilbert_goemotions"),
    )
    OUTPUT.mkdir(parents=True, exist_ok=True)

    amazon = AmazonInference()
    amazon.load()
    amazon_inputs = {"input_ids": torch.zeros((1, 256), dtype=torch.long)}
    with torch.no_grad():
        amazon_logits = amazon.model(amazon_inputs["input_ids"])
    amazon_path = export_amazon(amazon.model, OUTPUT / "amazon_bilstm.onnx")
    amazon_result = compare_logits(
        amazon_path, amazon_inputs, amazon_logits
    )
    write_result(OUTPUT / "amazon_parity.json", amazon_result)

    emotions = GoEmotionsInference()
    emotions.load()
    encoded = emotions.tokenizer(
        "I am excited and grateful.",
        return_tensors="pt",
        truncation=True,
        max_length=128,
    )
    with torch.no_grad():
        emotions_logits = emotions.model(**encoded).logits
    emotions_path = export_goemotions(
        emotions.model, emotions.tokenizer, OUTPUT / "goemotions_distilbert.onnx"
    )
    emotions_result = compare_logits(
        emotions_path,
        {
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
        },
        emotions_logits,
    )
    write_result(OUTPUT / "goemotions_parity.json", emotions_result)

    manifest = {
        "amazon_onnx": str(amazon_path.relative_to(ROOT)),
        "goemotions_onnx": str(emotions_path.relative_to(ROOT)),
        "amazon_parity": amazon_result,
        "goemotions_parity": emotions_result,
    }
    (OUTPUT / "onnx_export_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
