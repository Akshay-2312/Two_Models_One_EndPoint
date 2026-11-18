from __future__ import annotations

from typing import Any, Dict, List, Literal

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


class StatisticsResponse(BaseModel):
    datasets: Dict[str, Dict[str, object]]
    metrics: Dict[str, Dict[str, object]]


class DatasetSamplesPolicy(BaseModel):
    approved: bool
    reason: str


class DatasetDuplicatesAudit(BaseModel):
    recorded: bool
    duplicate_count: int | None = None
    near_duplicate_count: int | None = None
    missing_reason: str | None = None
    note: str


class DatasetCooccurrenceAudit(BaseModel):
    recorded: bool
    matrix: Dict[str, Dict[str, int]] | None = None
    missing_reason: str | None = None
    note: str


class DatasetSummaryItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    task: str
    label_semantics: str
    source_url: str
    mirror_url: str | None = None
    paper_url: str | None = None
    status: str
    last_audit_date: str
    splits: Dict[str, int]
    schema_definition: Dict[str, Any] = Field(alias="schema")
    class_distribution: Dict[str, Dict[str, int]] | None = None
    class_prevalence: Dict[str, Dict[str, int]] | None = None
    labels_per_example: Dict[str, Dict[str, int]] | None = None
    missing_values: Dict[str, Any]
    text_length_stats: Dict[str, Any]
    duplicates_audit: DatasetDuplicatesAudit
    cooccurrence_audit: DatasetCooccurrenceAudit | None = None
    imbalance_summary: str
    quality_warnings: List[str]
    samples_policy: DatasetSamplesPolicy


class DatasetSummaryResponse(BaseModel):
    provenance: str
    last_audit_date: str
    datasets: Dict[str, DatasetSummaryItem]


class DatasetSampleItem(BaseModel):
    id: str | None = None
    text: str | None = None
    title: str | None = None
    labels: List[str] = Field(default_factory=list)
    split: str | None = None


class DatasetSamplesResponse(BaseModel):
    dataset_id: str
    approved: bool
    notice: str
    total_available: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    items: List[DatasetSampleItem]


class ErrorResponse(BaseModel):
    error: str
    detail: str


PipelineStepStatus = Literal[
    "planned",
    "completed",
    "skipped",
    "failed",
    "unknown",
    "not_available",
]


class ModelComparisonRow(BaseModel):
    dimension: str
    amazon_rating: str
    go_emotions: str


class PipelineStep(BaseModel):
    id: str
    order: int = Field(ge=1)
    title: str
    status: PipelineStepStatus
    description: str
    inputs: List[str]
    output_artifact: str
    provenance: str


class ArtifactFileStatus(BaseModel):
    path: str
    exists: bool
    size_bytes: int | None = None


class OnnxParityStatus(BaseModel):
    onnx_path: str
    max_absolute_error: float
    tolerance: float
    within_tolerance: bool
    pytorch_shape: List[int]
    onnx_shape: List[int]


class ClassificationReportEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    precision: float
    recall: float
    f1_score: float = Field(alias="f1-score")
    support: float


class AmazonEpochEntry(BaseModel):
    epoch: int = Field(ge=1)
    train_loss: float
    val_loss: float
    val_macro_f1: float
    duration_seconds: int | None = None


class AmazonEpochHistory(BaseModel):
    provenance: str
    word2vec_best_epoch: int
    baseline_best_epoch: int
    word2vec: List[AmazonEpochEntry]
    baseline: List[AmazonEpochEntry]


class AmazonTestMetricsGroup(BaseModel):
    accuracy: float
    macro_f1: float
    weighted_f1: float
    mae: float


class AmazonTestMetrics(BaseModel):
    baseline: AmazonTestMetricsGroup
    word2vec: AmazonTestMetricsGroup


class AmazonConfusionMatrix(BaseModel):
    labels: List[str]
    matrix: List[List[int]] | None = None
    source: str
    confusion_matrix_figure: str


class AmazonTrackMetadata(BaseModel):
    id: str
    name: str
    task: str
    architecture: str
    endpoint: str
    runtime: str
    pipeline_steps: List[PipelineStep]
    hyperparameters: Dict[str, Any]
    run_timestamp: str | None = None
    run_timestamp_note: str
    epochs: AmazonEpochHistory
    test_metrics: AmazonTestMetrics
    per_class_report: Dict[str, ClassificationReportEntry | float]
    confusion_matrix: AmazonConfusionMatrix
    onnx_parity: OnnxParityStatus
    sha256: str
    artifact_files: List[ArtifactFileStatus]
    readiness: ModelReadiness


class GoEmotionsEpochEntry(BaseModel):
    epoch: int = Field(ge=1)
    train_loss: float
    val_loss: float
    val_macro_f1: float
    val_micro_f1: float
    duration_seconds: int | None = None


class GoEmotionsEpochHistory(BaseModel):
    history_json_exported: bool
    provenance: str
    note: str
    items: List[GoEmotionsEpochEntry]


class ThresholdSweepPoint(BaseModel):
    threshold: float
    val_macro_f1: float


class GoEmotionsThresholdSweep(BaseModel):
    provenance: str
    optimal_threshold: float
    best_val_macro_f1: float
    points: List[ThresholdSweepPoint]


class GoEmotionsTestMetrics(BaseModel):
    test_macro_f1: float
    test_micro_f1: float
    hamming_loss: float
    subset_accuracy: float
    optimal_threshold: float


class GoEmotionsTrackMetadata(BaseModel):
    id: str
    name: str
    task: str
    architecture: str
    endpoint: str
    runtime: str
    pipeline_steps: List[PipelineStep]
    hyperparameters: Dict[str, Any]
    run_timestamp: str | None = None
    run_timestamp_note: str
    epochs: GoEmotionsEpochHistory
    threshold_sweep: GoEmotionsThresholdSweep
    test_metrics: GoEmotionsTestMetrics
    per_label_report: Dict[str, ClassificationReportEntry]
    onnx_parity: OnnxParityStatus
    sha256: str
    artifact_files: List[ArtifactFileStatus]
    readiness: ModelReadiness


class ModelLabTracks(BaseModel):
    amazon_rating: AmazonTrackMetadata
    go_emotions: GoEmotionsTrackMetadata


class ModelLabResponse(BaseModel):
    provenance: str
    run_timestamp_note: str
    comparison: List[ModelComparisonRow]
    tracks: ModelLabTracks


TechnologyCategory = Literal[
    "frontend",
    "backend",
    "ml_nlp",
    "data",
    "testing",
    "deployment",
]

TechnologyStatus = Literal[
    "verified_used",
    "verified_export_only",
    "partial",
    "declared_unused",
]

TechnologyLogoLicense = Literal[
    "MIT (Devicon)",
    "CC0-1.0 (Simple Icons)",
    "Custom monogram / text tile",
]


class TechnologyItem(BaseModel):
    id: str
    name: str
    category: TechnologyCategory
    status: TechnologyStatus
    status_note: str
    version: str
    role: str
    communication_boundary: str
    verification_sources: List[str]
    logo_path: str | None = None
    logo_license: TechnologyLogoLicense
    monogram: str = Field(min_length=2, max_length=4)


class TechnologyBoundary(BaseModel):
    id: str
    title: str
    source_layer: str
    target_layer: str
    protocol_or_format: str
    inputs: List[str]
    outputs: List[str]
    security_and_resilience: str
    verification_sources: List[str]


class TechnologyCategorySummary(BaseModel):
    category: TechnologyCategory
    label: str
    total: int = Field(ge=0)
    verified_used: int = Field(ge=0)
    verified_export_only: int = Field(ge=0)
    partial: int = Field(ge=0)
    declared_unused: int = Field(ge=0)


class TechnologyManifestResponse(BaseModel):
    provenance: str
    generated_from: List[str]
    onnx_artifact_paths: List[str]
    api_version: str
    readiness: Dict[str, ModelReadiness]
    onnx_artifacts_present: int = Field(ge=0)
    onnx_artifacts_expected: int = Field(ge=0)
    categories_summary: Dict[TechnologyCategory, TechnologyCategorySummary]
    boundaries: List[TechnologyBoundary]
    technologies: List[TechnologyItem]

