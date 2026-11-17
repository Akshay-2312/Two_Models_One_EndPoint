from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field


class TextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=10_000)


class AmazonPrediction(BaseModel):
    rating: int = Field(ge=1, le=5)
    probabilities: List[float] = Field(min_length=5, max_length=5)


class EmotionPrediction(BaseModel):
    label: str
    probability: float = Field(ge=0, le=1)


class GoEmotionsPrediction(BaseModel):
    emotions: List[EmotionPrediction]
    probabilities: Dict[str, float]
    threshold: float = Field(gt=0, lt=1)


class ModelReadiness(BaseModel):
    ready: bool
    error: str | None = None


class ReadinessResponse(BaseModel):
    status: str
    models: Dict[str, ModelReadiness]


class MetadataResponse(BaseModel):
    service: str
    version: str
    models: Dict[str, Dict[str, object]]


class ErrorResponse(BaseModel):
    error: str
    detail: str
