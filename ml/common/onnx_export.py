"""ONNX export and PyTorch parity checks for the two inference models."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class OnnxUnavailableError(RuntimeError):
    """Raised when ONNX export or runtime dependencies are unavailable."""


def _require_onnx() -> Any:
    try:
        import onnx
        import onnxruntime
    except ImportError as exc:
        raise OnnxUnavailableError(
            "Install onnx and onnxruntime before running export/parity checks."
        ) from exc
    return onnx, onnxruntime


def export_amazon(model: Any, output_path: str | Path) -> Path:
    torch, _ = _require_torch()
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    model.eval()
    sample = torch.zeros((1, 256), dtype=torch.long)
    torch.onnx.export(
        model,
        (sample,),
        str(output),
        input_names=["input_ids"],
        output_names=["logits"],
        dynamic_axes={"input_ids": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    _validate_model(output)
    return output


def export_goemotions(model: Any, tokenizer: Any, output_path: str | Path) -> Path:
    torch, _ = _require_torch()
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    encoded = tokenizer(
        "I am excited and grateful.",
        return_tensors="pt",
        truncation=True,
        max_length=128,
    )

    class LogitWrapper(torch.nn.Module):
        def __init__(self, wrapped: Any) -> None:
            super().__init__()
            self.wrapped = wrapped

        def forward(self, input_ids: Any, attention_mask: Any) -> Any:
            return self.wrapped(
                input_ids=input_ids, attention_mask=attention_mask
            ).logits

    wrapped = LogitWrapper(model).eval()
    torch.onnx.export(
        wrapped,
        (encoded["input_ids"], encoded["attention_mask"]),
        str(output),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "logits": {0: "batch"},
        },
        opset_version=17,
    )
    _validate_model(output)
    return output


def compare_logits(
    model_path: str | Path,
    inputs: dict[str, Any],
    pytorch_logits: Any,
    tolerance: float = 1e-4,
) -> dict[str, Any]:
    _, onnxruntime = _require_onnx()
    session = onnxruntime.InferenceSession(
        str(model_path), providers=["CPUExecutionProvider"]
    )
    feed = {
        name: value.detach().cpu().numpy()
        for name, value in inputs.items()
    }
    onnx_logits = session.run(["logits"], feed)[0]
    reference = pytorch_logits.detach().cpu().numpy()
    max_abs_error = float(abs(reference - onnx_logits).max())
    return {
        "max_absolute_error": max_abs_error,
        "tolerance": tolerance,
        "within_tolerance": max_abs_error <= tolerance,
        "pytorch_shape": list(reference.shape),
        "onnx_shape": list(onnx_logits.shape),
    }


def write_result(result_path: str | Path, result: dict[str, Any]) -> None:
    Path(result_path).write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )


def _validate_model(path: Path) -> None:
    onnx, _ = _require_onnx()
    onnx.checker.check_model(onnx.load(str(path)))


def _require_torch() -> tuple[Any, Any]:
    try:
        import torch
    except ImportError as exc:
        raise OnnxUnavailableError("PyTorch is required for ONNX export.") from exc
    return torch, torch.nn
