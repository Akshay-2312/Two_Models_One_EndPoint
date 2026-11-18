export type Readiness = {
  ready: boolean;
  error: string | null;
};

export type ReadinessResponse = {
  status: string;
  models: Record<string, Readiness>;
};

export type AmazonPrediction = {
  rating: number;
  probabilities: number[];
};

export type Emotion = {
  label: string;
  probability: number;
};

export type GoEmotionsPrediction = {
  emotions: Emotion[];
  probabilities: Record<string, number>;
  threshold: number;
};

export type MetadataModelInfo = {
  task?: string;
  architecture?: string;
  classes?: number;
  runtime?: string;
};

export type MetadataResponse = {
  service: string;
  version: string;
  models: Record<string, MetadataModelInfo>;
};

export type AmazonDatasetQuality = {
  train_rows?: number;
  test_rows?: number;
  train_class_distribution?: Record<string, number>;
  test_class_distribution?: Record<string, number>;
  train_chunks?: string[];
  test_chunks?: string[];
};

export type GoEmotionsSplitSummary = {
  total_rows?: number;
  labels_per_example_distribution?: Record<string, number>;
  class_prevalence?: Record<string, number>;
};

export type GoEmotionsDatasetQuality = {
  train?: GoEmotionsSplitSummary;
  validation?: GoEmotionsSplitSummary;
  test?: GoEmotionsSplitSummary;
};

export type AmazonModelMetrics = {
  baseline?: {
    accuracy?: number;
    macro_f1?: number;
    weighted_f1?: number;
    mae?: number;
  };
  word2vec?: {
    accuracy?: number;
    macro_f1?: number;
    weighted_f1?: number;
    mae?: number;
  };
};

export type GoEmotionsModelMetrics = {
  test_macro_f1?: number;
  test_micro_f1?: number;
  hamming_loss?: number;
  subset_accuracy?: number;
  optimal_threshold?: number;
};

export type StatisticsResponse = {
  datasets: {
    amazon_reviews?: AmazonDatasetQuality;
    go_emotions?: GoEmotionsDatasetQuality;
  };
  metrics: {
    amazon_rating?: AmazonModelMetrics;
    go_emotions?: GoEmotionsModelMetrics;
  };
};

export type DatasetSamplesPolicy = {
  approved: boolean;
  reason: string;
};

export type DatasetDuplicatesAudit = {
  recorded: boolean;
  duplicate_count: number | null;
  near_duplicate_count: number | null;
  missing_reason?: string | null;
  note: string;
};

export type DatasetCooccurrenceAudit = {
  recorded: boolean;
  matrix: Record<string, Record<string, number>> | null;
  missing_reason?: string | null;
  note: string;
};

export type DatasetMissingValuesSplit = {
  review_title_nulls?: number;
  review_text_nulls?: number;
  total_rows?: number;
};

export type DatasetMissingValuesAudit = {
  recorded: boolean;
  train?: DatasetMissingValuesSplit;
  test?: DatasetMissingValuesSplit;
  null_count?: number | null;
  empty_text_count?: number | null;
  missing_reason?: string | null;
  note?: string;
  [key: string]: unknown;
};

export type DatasetTextLengthStats = {
  recorded: boolean;
  unit?: string;
  scope?: string;
  min?: number;
  p50?: number;
  mean?: number;
  std?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  max?: number;
  max_sequence_cap?: number;
  exceeding_max_length?: number;
  missing_reason?: string | null;
  note?: string;
  [key: string]: unknown;
};

export type DatasetSummaryItem = {
  name: string;
  task: string;
  label_semantics: string;
  source_url: string;
  mirror_url?: string | null;
  paper_url?: string | null;
  status: string;
  last_audit_date: string;
  splits: Record<string, number>;
  schema: Record<string, unknown>;
  class_distribution?: Record<string, Record<string, number>> | null;
  class_prevalence?: Record<string, Record<string, number>> | null;
  labels_per_example?: Record<string, Record<string, number>> | null;
  missing_values: DatasetMissingValuesAudit;
  text_length_stats: DatasetTextLengthStats;
  duplicates_audit: DatasetDuplicatesAudit;
  cooccurrence_audit?: DatasetCooccurrenceAudit | null;
  imbalance_summary: string;
  quality_warnings: string[];
  samples_policy: DatasetSamplesPolicy;
};

export type DatasetSummaryResponse = {
  provenance: string;
  last_audit_date: string;
  datasets: Record<string, DatasetSummaryItem>;
};

export type DatasetSampleItem = {
  id?: string | null;
  text?: string | null;
  title?: string | null;
  labels: string[];
  split?: string | null;
};

export type DatasetSamplesResponse = {
  dataset_id: string;
  approved: boolean;
  notice: string;
  total_available: number;
  page: number;
  page_size: number;
  items: DatasetSampleItem[];
};

export type PipelineStepStatus =
  | "planned"
  | "completed"
  | "skipped"
  | "failed"
  | "unknown"
  | "not_available";

export type ModelComparisonRow = {
  dimension: string;
  amazon_rating: string;
  go_emotions: string;
};

export type PipelineStep = {
  id: string;
  order: number;
  title: string;
  status: PipelineStepStatus;
  description: string;
  inputs: string[];
  output_artifact: string;
  provenance: string;
};

export type ArtifactFileStatus = {
  path: string;
  exists: boolean;
  size_bytes: number | null;
};

export type OnnxParityStatus = {
  onnx_path: string;
  max_absolute_error: number;
  tolerance: number;
  within_tolerance: boolean;
  pytorch_shape: number[];
  onnx_shape: number[];
};

export type ClassificationReportEntry = {
  precision: number;
  recall: number;
  "f1-score": number;
  f1_score?: number;
  support: number;
};

export type AmazonEpochEntry = {
  epoch: number;
  train_loss: number;
  val_loss: number;
  val_macro_f1: number;
  duration_seconds: number | null;
};

export type AmazonEpochHistory = {
  provenance: string;
  word2vec_best_epoch: number;
  baseline_best_epoch: number;
  word2vec: AmazonEpochEntry[];
  baseline: AmazonEpochEntry[];
};

export type AmazonTestMetricsGroup = {
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  mae: number;
};

export type AmazonTestMetrics = {
  baseline: AmazonTestMetricsGroup;
  word2vec: AmazonTestMetricsGroup;
};

export type AmazonConfusionMatrix = {
  labels: string[];
  matrix: number[][] | null;
  source: string;
  confusion_matrix_figure: string;
};

export type AmazonTrackMetadata = {
  id: string;
  name: string;
  task: string;
  architecture: string;
  endpoint: string;
  runtime: string;
  pipeline_steps: PipelineStep[];
  hyperparameters: Record<string, unknown>;
  run_timestamp: string | null;
  run_timestamp_note: string;
  epochs: AmazonEpochHistory;
  test_metrics: AmazonTestMetrics;
  per_class_report: Record<string, ClassificationReportEntry | number>;
  confusion_matrix: AmazonConfusionMatrix;
  onnx_parity: OnnxParityStatus;
  sha256: string;
  artifact_files: ArtifactFileStatus[];
  readiness: Readiness;
};

export type GoEmotionsEpochEntry = {
  epoch: number;
  train_loss: number;
  val_loss: number;
  val_macro_f1: number;
  val_micro_f1: number;
  duration_seconds: number | null;
};

export type GoEmotionsEpochHistory = {
  history_json_exported: boolean;
  provenance: string;
  note: string;
  items: GoEmotionsEpochEntry[];
};

export type ThresholdSweepPoint = {
  threshold: number;
  val_macro_f1: number;
};

export type GoEmotionsThresholdSweep = {
  provenance: string;
  optimal_threshold: number;
  best_val_macro_f1: number;
  points: ThresholdSweepPoint[];
};

export type GoEmotionsTestMetrics = {
  test_macro_f1: number;
  test_micro_f1: number;
  hamming_loss: number;
  subset_accuracy: number;
  optimal_threshold: number;
};

export type GoEmotionsTrackMetadata = {
  id: string;
  name: string;
  task: string;
  architecture: string;
  endpoint: string;
  runtime: string;
  pipeline_steps: PipelineStep[];
  hyperparameters: Record<string, unknown>;
  run_timestamp: string | null;
  run_timestamp_note: string;
  epochs: GoEmotionsEpochHistory;
  threshold_sweep: GoEmotionsThresholdSweep;
  test_metrics: GoEmotionsTestMetrics;
  per_label_report: Record<string, ClassificationReportEntry>;
  onnx_parity: OnnxParityStatus;
  sha256: string;
  artifact_files: ArtifactFileStatus[];
  readiness: Readiness;
};

export type ModelLabTracks = {
  amazon_rating: AmazonTrackMetadata;
  go_emotions: GoEmotionsTrackMetadata;
};

export type ModelLabResponse = {
  provenance: string;
  run_timestamp_note: string;
  comparison: ModelComparisonRow[];
  tracks: ModelLabTracks;
};

export type TechnologyCategory =
  | "frontend"
  | "backend"
  | "ml_nlp"
  | "data"
  | "testing"
  | "deployment";

export type TechnologyStatus =
  | "verified_used"
  | "verified_export_only"
  | "partial"
  | "declared_unused";

export type TechnologyLogoLicense =
  | "MIT (Devicon)"
  | "CC0-1.0 (Simple Icons)"
  | "Custom monogram / text tile";

export type TechnologyItem = {
  id: string;
  name: string;
  category: TechnologyCategory;
  status: TechnologyStatus;
  status_note: string;
  version: string;
  role: string;
  communication_boundary: string;
  verification_sources: string[];
  logo_path: string | null;
  logo_license: TechnologyLogoLicense;
  monogram: string;
};

export type TechnologyBoundary = {
  id: string;
  title: string;
  source_layer: string;
  target_layer: string;
  protocol_or_format: string;
  inputs: string[];
  outputs: string[];
  security_and_resilience: string;
  verification_sources: string[];
};

export type TechnologyCategorySummary = {
  category: TechnologyCategory;
  label: string;
  total: number;
  verified_used: number;
  verified_export_only: number;
  partial: number;
  declared_unused: number;
};

export type TechnologyManifestResponse = {
  provenance: string;
  generated_from: string[];
  onnx_artifact_paths: string[];
  api_version: string;
  readiness: Record<string, Readiness>;
  onnx_artifacts_present: number;
  onnx_artifacts_expected: number;
  categories_summary: Record<TechnologyCategory, TechnologyCategorySummary>;
  boundaries: TechnologyBoundary[];
  technologies: TechnologyItem[];
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiErrorKind = "offline" | "timeout" | "cancelled" | "api_error";

export type StructuredApiError = {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  detail?: string;
  errorCode?: string;
};

/**
 * Structured HTTP error returned when the FastAPI backend responds with a non-2xx status.
 * Extends Error so existing `error instanceof Error` checks remain backward-compatible.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;
  readonly errorCode: string | null;

  constructor(
    message: string,
    status: number,
    detail: string | null = null,
    errorCode: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.errorCode = errorCode;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

export function classifyApiError(
  error: unknown,
  options?: { timedOut?: boolean; timeoutMs?: number },
): StructuredApiError {
  if (options?.timedOut) {
    const seconds = Math.round((options.timeoutMs ?? 30_000) / 1000);
    return {
      kind: "timeout",
      message: `Analysis timed out after ${seconds} seconds. Check that the backend model is loaded and try again.`,
    };
  }

  if (isAbortError(error)) {
    return {
      kind: "cancelled",
      message: "Analysis cancelled.",
    };
  }

  if (isNetworkError(error)) {
    return {
      kind: "offline",
      message: `Cannot reach the inference API at ${API_BASE_URL}. Confirm the backend server is running and you are online, then retry.`,
    };
  }

  if (error instanceof ApiError) {
    return {
      kind: "api_error",
      message: error.detail ?? error.message,
      status: error.status,
      detail: error.detail ?? undefined,
      errorCode: error.errorCode ?? undefined,
    };
  }

  return {
    kind: "api_error",
    message: error instanceof Error && error.message ? error.message : "Analysis failed.",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  // Only advertise a JSON body when one is sent: a Content-Type header on a
  // GET turns every readiness poll into a preflighted CORS request.
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: unknown; error?: unknown }
      | null;
    const detail =
      typeof body?.detail === "string" && body.detail.trim() ? body.detail.trim() : null;
    const errorCode =
      typeof body?.error === "string" && body.error.trim() ? body.error.trim() : null;
    throw new ApiError(
      detail ?? `Request failed with status ${response.status}`,
      response.status,
      detail,
      errorCode,
    );
  }
  return response.json() as Promise<T>;
}

export const getReadiness = (init?: RequestInit) =>
  request<ReadinessResponse>("/readiness", init);

export const getMetadata = (init?: RequestInit) =>
  request<MetadataResponse>("/metadata", init);

export const getStatistics = (init?: RequestInit) =>
  request<StatisticsResponse>("/statistics", init);

export const getDatasetSummary = (init?: RequestInit) =>
  request<DatasetSummaryResponse>("/datasets/summary", init);

export const getModelLab = (init?: RequestInit) =>
  request<ModelLabResponse>("/models/lab", init);

export const getTechnologyManifest = (init?: RequestInit) =>
  request<TechnologyManifestResponse>("/technology", init);

export const getDatasetSamples = (
  datasetId: string,
  page = 1,
  pageSize = 10,
  init?: RequestInit,
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return request<DatasetSamplesResponse>(
    `/datasets/${encodeURIComponent(datasetId)}/samples?${params.toString()}`,
    init,
  );
};

export const predictAmazon = (text: string, init?: RequestInit) =>
  request<AmazonPrediction>("/predict/amazon", {
    ...init,
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const predictEmotions = (text: string, init?: RequestInit) =>
  request<GoEmotionsPrediction>("/predict/go-emotions", {
    ...init,
    method: "POST",
    body: JSON.stringify({ text }),
  });
