"use client";

import { useMemo, useState } from "react";
import type {
  AmazonTrackMetadata,
  ClassificationReportEntry,
  GoEmotionsTrackMetadata,
} from "@/lib/api";
import { Badge, Button, Callout, Card, Meter } from "./ui";

export type ModelEvaluationPanelProps =
  | {
      kind: "amazon_rating";
      track: AmazonTrackMetadata;
    }
  | {
      kind: "go_emotions";
      track: GoEmotionsTrackMetadata;
    };

type SortColumn = "label" | "precision" | "recall" | "f1" | "support";
type SortDirection = "asc" | "desc";
type SortMode =
  | "label-asc"
  | "label-desc"
  | "precision-desc"
  | "precision-asc"
  | "recall-desc"
  | "recall-asc"
  | "f1-desc"
  | "f1-asc"
  | "support-desc"
  | "support-asc";

const SORT_COLUMNS: ReadonlyArray<{
  column: SortColumn;
  label: string;
  defaultDirection: SortDirection;
  numeric: boolean;
}> = [
  { column: "label", label: "Emotion", defaultDirection: "asc", numeric: false },
  { column: "precision", label: "Precision", defaultDirection: "desc", numeric: true },
  { column: "recall", label: "Recall", defaultDirection: "desc", numeric: true },
  { column: "f1", label: "F1-score", defaultDirection: "desc", numeric: true },
  { column: "support", label: "Support", defaultDirection: "desc", numeric: true },
];

function parseSortMode(mode: SortMode): {
  column: SortColumn;
  direction: SortDirection;
} {
  const [column, direction] = mode.split("-") as [SortColumn, SortDirection];
  return { column, direction };
}

function getNumericMetric(
  entry: ClassificationReportEntry,
  column: Exclude<SortColumn, "label">,
): number {
  if (column === "precision") return entry.precision;
  if (column === "recall") return entry.recall;
  if (column === "f1") return getF1(entry);
  return entry.support;
}

const integerFormatter = new Intl.NumberFormat("en-US");

const AGGREGATE_REPORT_KEYS = new Set([
  "accuracy",
  "micro avg",
  "macro avg",
  "weighted avg",
  "samples avg",
]);

function formatInt(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return integerFormatter.format(value);
}

function formatFloat(value: number | null | undefined, digits = 4): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatScientific(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  return value.toExponential(2);
}

function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || Number.isNaN(bytes) || bytes < 0) {
    return "Missing on disk";
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return integerFormatter.format(value);
    if (Math.abs(value) < 0.001) return value.toExponential(1);
    return String(Number(value.toPrecision(6)));
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function getF1(entry: ClassificationReportEntry): number {
  return typeof entry["f1-score"] === "number"
    ? entry["f1-score"]
    : (entry.f1_score ?? 0);
}

function isReportEntry(value: unknown): value is ClassificationReportEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "precision" in value &&
    "recall" in value &&
    "support" in value
  );
}

function getConfusionHeatTier(count: number, rowTotal: number): string {
  if (rowTotal <= 0 || count <= 0) return "0";
  const ratio = count / rowTotal;
  if (ratio >= 0.5) return "4";
  if (ratio >= 0.25) return "3";
  if (ratio >= 0.1) return "2";
  return "1";
}

function isNestedHyperparamGroup(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Renders verified artifact metadata, hyperparameters, epoch histories,
 * held-out test metrics, confusion matrix / 28-label table, ONNX parity,
 * and on-disk artifact checks for one model track.
 */
export function ModelEvaluationPanel(props: ModelEvaluationPanelProps) {
  const { kind, track } = props;
  const [labelQuery, setLabelQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("f1-desc");

  const hyperparamGroups = useMemo(() => {
    const entries = Object.entries(track.hyperparameters ?? {});
    const nested = entries.filter(([, v]) => isNestedHyperparamGroup(v));
    if (nested.length > 0 && nested.length === entries.length) {
      return nested.map(([groupName, groupValue]) => ({
        groupName,
        items: Object.entries(groupValue as Record<string, unknown>),
      }));
    }
    return [{ groupName: "Verified parameters", items: entries }];
  }, [track.hyperparameters]);

  const goEmotionsReport = useMemo(() => {
    if (kind !== "go_emotions") {
      return { labels: [], aggregates: [] };
    }
    const allEntries = Object.entries(track.per_label_report ?? {});
    const labels: Array<{ label: string; entry: ClassificationReportEntry }> = [];
    const aggregates: Array<{ label: string; entry: ClassificationReportEntry }> = [];

    for (const [label, entry] of allEntries) {
      if (!isReportEntry(entry)) continue;
      if (AGGREGATE_REPORT_KEYS.has(label)) {
        aggregates.push({ label, entry });
      } else {
        labels.push({ label, entry });
      }
    }

    return { labels, aggregates };
  }, [kind, track]);

  const filteredGoEmotionsLabels = useMemo(() => {
    const query = labelQuery.trim().toLowerCase();
    const filtered = query
      ? goEmotionsReport.labels.filter((item) =>
          item.label.toLowerCase().includes(query),
        )
      : [...goEmotionsReport.labels];

    const { column, direction } = parseSortMode(sortMode);
    const factor = direction === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      if (column === "label") {
        return a.label.localeCompare(b.label) * factor;
      }
      const delta =
        getNumericMetric(a.entry, column) - getNumericMetric(b.entry, column);
      if (delta !== 0) {
        return delta * factor;
      }
      return a.label.localeCompare(b.label);
    });

    return filtered;
  }, [goEmotionsReport.labels, labelQuery, sortMode]);

  const activeSort = parseSortMode(sortMode);

  function handleToggleColumnSort(column: SortColumn) {
    const config = SORT_COLUMNS.find((item) => item.column === column);
    const fallbackDirection = config?.defaultDirection ?? "desc";
    if (activeSort.column === column) {
      const nextDirection: SortDirection =
        activeSort.direction === "asc" ? "desc" : "asc";
      setSortMode(`${column}-${nextDirection}` as SortMode);
      return;
    }
    setSortMode(`${column}-${fallbackDirection}` as SortMode);
  }

  const presentArtifactsCount = track.artifact_files.filter(
    (item) => item.exists,
  ).length;
  const missingArtifactsCount =
    track.artifact_files.length - presentArtifactsCount;

  const timestampDisplay =
    track.run_timestamp ?? "Not available in supplied metric JSONs";

  return (
    <div className="modellab-eval">
      {/* 1. Readiness, Checksum & Checkpoint Metadata */}
      <Card
        kicker="Runtime & verification"
        title="Readiness, SHA-256 checksum & provenance"
      >
        <div className="modellab-status-row">
          <Badge dot tone={track.readiness.ready ? "success" : "warning"}>
            {track.readiness.ready
              ? "Ready for inference"
              : "Model not ready"}
          </Badge>
          <Badge tone={track.onnx_parity.within_tolerance ? "success" : "danger"}>
            ONNX parity:{" "}
            {track.onnx_parity.within_tolerance
              ? "Within tolerance"
              : "Out of tolerance"}
          </Badge>
          <Badge tone={missingArtifactsCount === 0 ? "success" : "warning"}>
            Artifacts: {presentArtifactsCount}/{track.artifact_files.length} on disk
          </Badge>
        </div>

        {track.readiness.error ? (
          <Callout title="Readiness notice" tone="warning">
            <p>{track.readiness.error}</p>
          </Callout>
        ) : null}

        <dl className="modellab-meta-list">
          <div>
            <dt>Endpoint</dt>
            <dd>
              <code>{track.endpoint}</code>
            </dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>{track.runtime}</dd>
          </div>
          <div>
            <dt>Checkpoint SHA-256</dt>
            <dd>
              <code className="modellab-sha" title={track.sha256}>
                {track.sha256}
              </code>
            </dd>
          </div>
          <div>
            <dt>Run timestamp</dt>
            <dd>
              <span className="modellab-timestamp">{timestampDisplay}</span>
              <p className="modellab-meta-note">{track.run_timestamp_note}</p>
            </dd>
          </div>
        </dl>
      </Card>

      {/* 2. Verified Hyperparameters */}
      <Card kicker="Configuration" title="Verified hyperparameters">
        <div className="modellab-hyperparam-groups">
          {hyperparamGroups.map((group) => (
            <div className="modellab-hyperparam-group" key={group.groupName}>
              {hyperparamGroups.length > 1 ? (
                <h3 className="modellab-subheading">{group.groupName}</h3>
              ) : null}
              <dl className="modellab-kv-grid">
                {group.items.map(([key, value]) => (
                  <div className="modellab-kv-item" key={`${group.groupName}-${key}`}>
                    <dt>{key}</dt>
                    <dd className="tabular-nums">{formatParamValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Training Epochs (+ Threshold Sweep for GoEmotions) */}
      {kind === "amazon_rating" ? (
        <Card kicker="Training history" title="Training epochs (Word2Vec vs baseline)">
          <p className="modellab-caption">
            Provenance: <code>{track.epochs.provenance}</code>
          </p>
          <div className="modellab-status-row">
            <Badge tone="model">
              Word2Vec best checkpoint: Epoch {track.epochs.word2vec_best_epoch}
            </Badge>
            <Badge tone="neutral">
              Baseline best checkpoint: Epoch {track.epochs.baseline_best_epoch}
            </Badge>
          </div>

          <div className="modellab-two-col">
            <div className="modellab-table-block">
              <h3 className="modellab-subheading">Word2Vec + BiLSTM</h3>
              <div className="dataset-table-wrap">
                <table className="dataset-table">
                  <thead>
                    <tr>
                      <th scope="col">Epoch</th>
                      <th className="dataset-table__num" scope="col">Train loss</th>
                      <th className="dataset-table__num" scope="col">Val loss</th>
                      <th className="dataset-table__num" scope="col">Val Macro-F1</th>
                      <th className="dataset-table__num" scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {track.epochs.word2vec.map((row) => {
                      const isBest =
                        row.epoch === track.epochs.word2vec_best_epoch;
                      return (
                        <tr
                          className={isBest ? "modellab-row--best" : undefined}
                          key={`w2v-${row.epoch}`}
                        >
                          <td className="dataset-table__mono tabular-nums">
                            {row.epoch}
                            {isBest ? (
                              <span className="modellab-inline-tag">best</span>
                            ) : null}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.train_loss)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.val_loss)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.val_macro_f1)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {row.duration_seconds != null
                              ? `${row.duration_seconds}s`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modellab-table-block">
              <h3 className="modellab-subheading">Random-init baseline</h3>
              <div className="dataset-table-wrap">
                <table className="dataset-table">
                  <thead>
                    <tr>
                      <th scope="col">Epoch</th>
                      <th className="dataset-table__num" scope="col">Train loss</th>
                      <th className="dataset-table__num" scope="col">Val loss</th>
                      <th className="dataset-table__num" scope="col">Val Macro-F1</th>
                      <th className="dataset-table__num" scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {track.epochs.baseline.map((row) => {
                      const isBest =
                        row.epoch === track.epochs.baseline_best_epoch;
                      return (
                        <tr
                          className={isBest ? "modellab-row--best" : undefined}
                          key={`base-${row.epoch}`}
                        >
                          <td className="dataset-table__mono tabular-nums">
                            {row.epoch}
                            {isBest ? (
                              <span className="modellab-inline-tag">best</span>
                            ) : null}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.train_loss)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.val_loss)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {formatFloat(row.val_macro_f1)}
                          </td>
                          <td className="dataset-table__num tabular-nums">
                            {row.duration_seconds != null
                              ? `${row.duration_seconds}s`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="modellab-two-col">
          <Card kicker="Training history" title="Fine-tuning epochs (NB02 Cell 6)">
            <p className="modellab-caption">
              Provenance: <code>{track.epochs.provenance}</code>
            </p>
            <Callout
              title={`history_json_exported: ${String(track.epochs.history_json_exported)}`}
              tone="info"
            >
              <p>{track.epochs.note}</p>
            </Callout>
            <div className="dataset-table-wrap">
              <table className="dataset-table">
                <thead>
                  <tr>
                    <th scope="col">Epoch</th>
                    <th className="dataset-table__num" scope="col">Train loss</th>
                    <th className="dataset-table__num" scope="col">Val loss</th>
                    <th className="dataset-table__num" scope="col">Val Macro-F1</th>
                    <th className="dataset-table__num" scope="col">Val Micro-F1</th>
                    <th className="dataset-table__num" scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {track.epochs.items.map((row) => (
                    <tr key={`go-epoch-${row.epoch}`}>
                      <td className="dataset-table__mono tabular-nums">
                        {row.epoch}
                      </td>
                      <td className="dataset-table__num tabular-nums">
                        {formatFloat(row.train_loss)}
                      </td>
                      <td className="dataset-table__num tabular-nums">
                        {formatFloat(row.val_loss)}
                      </td>
                      <td className="dataset-table__num tabular-nums">
                        {formatFloat(row.val_macro_f1)}
                      </td>
                      <td className="dataset-table__num tabular-nums">
                        {formatFloat(row.val_micro_f1)}
                      </td>
                      <td className="dataset-table__num tabular-nums">
                        {row.duration_seconds != null
                          ? `${row.duration_seconds}s`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            kicker="Calibration"
            title="Validation threshold sweep (0.1–0.9)"
          >
            <p className="modellab-caption">
              Provenance: <code>{track.threshold_sweep.provenance}</code>
            </p>
            <div className="modellab-status-row">
              <Badge tone="model">
                Optimal threshold:{" "}
                {track.threshold_sweep.optimal_threshold.toFixed(2)}
              </Badge>
              <Badge tone="success">
                Best Val Macro-F1:{" "}
                {formatFloat(track.threshold_sweep.best_val_macro_f1)}
              </Badge>
            </div>
            <div className="modellab-sweep-list">
              {track.threshold_sweep.points.map((point) => {
                const isOptimal =
                  Math.abs(
                    point.threshold - track.threshold_sweep.optimal_threshold,
                  ) < 0.001;
                return (
                  <div
                    className={
                      isOptimal
                        ? "modellab-sweep-row modellab-sweep-row--optimal"
                        : "modellab-sweep-row"
                    }
                    key={point.threshold}
                  >
                    <Meter
                      label={
                        isOptimal
                          ? `Threshold ${point.threshold.toFixed(1)} (optimal)`
                          : `Threshold ${point.threshold.toFixed(1)}`
                      }
                      max={0.6}
                      tone={isOptimal ? "model" : "primary"}
                      value={point.val_macro_f1}
                      valueLabel={formatFloat(point.val_macro_f1)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* 4. Held-out Test Evaluation */}
      {kind === "amazon_rating" ? (
        <div className="modellab-stack">
          <Card
            kicker="Held-out evaluation (50,000 test reviews)"
            title="Test metrics & baseline comparison"
          >
            <div className="modellab-two-col">
              <div className="modellab-metric-group">
                <h3 className="modellab-subheading">Word2Vec + BiLSTM (served)</h3>
                <div className="probability-list">
                  <Meter
                    label="Accuracy"
                    tone="model"
                    value={track.test_metrics.word2vec.accuracy}
                    valueLabel={`${(track.test_metrics.word2vec.accuracy * 100).toFixed(2)}%`}
                  />
                  <Meter
                    label="Macro F1"
                    tone="model"
                    value={track.test_metrics.word2vec.macro_f1}
                    valueLabel={`${(track.test_metrics.word2vec.macro_f1 * 100).toFixed(2)}%`}
                  />
                  <Meter
                    label="Weighted F1"
                    tone="model"
                    value={track.test_metrics.word2vec.weighted_f1}
                    valueLabel={`${(track.test_metrics.word2vec.weighted_f1 * 100).toFixed(2)}%`}
                  />
                </div>
                <dl className="stat-grid">
                  <div>
                    <dt>Mean Absolute Error (MAE)</dt>
                    <dd className="tabular-nums">
                      {formatFloat(track.test_metrics.word2vec.mae)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="modellab-metric-group">
                <h3 className="modellab-subheading">Random-init baseline</h3>
                <div className="probability-list">
                  <Meter
                    label="Accuracy"
                    tone="primary"
                    value={track.test_metrics.baseline.accuracy}
                    valueLabel={`${(track.test_metrics.baseline.accuracy * 100).toFixed(2)}%`}
                  />
                  <Meter
                    label="Macro F1"
                    tone="primary"
                    value={track.test_metrics.baseline.macro_f1}
                    valueLabel={`${(track.test_metrics.baseline.macro_f1 * 100).toFixed(2)}%`}
                  />
                  <Meter
                    label="Weighted F1"
                    tone="primary"
                    value={track.test_metrics.baseline.weighted_f1}
                    valueLabel={`${(track.test_metrics.baseline.weighted_f1 * 100).toFixed(2)}%`}
                  />
                </div>
                <dl className="stat-grid">
                  <div>
                    <dt>Mean Absolute Error (MAE)</dt>
                    <dd className="tabular-nums">
                      {formatFloat(track.test_metrics.baseline.mae)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>

          <Card
            kicker="Error structure"
            title="5×5 confusion matrix & per-class report"
          >
            <p className="modellab-caption">
              Source: <code>{track.confusion_matrix.source}</code>. Rows are true
              ratings; columns are predicted ratings.
            </p>

            {track.confusion_matrix.matrix ? (
              <div className="dataset-table-wrap">
                <table className="modellab-cm-table">
                  <thead>
                    <tr>
                      <th scope="col">True \ Pred</th>
                      {track.confusion_matrix.labels.map((colLabel) => (
                        <th key={`cm-col-${colLabel}`} scope="col">
                          {colLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {track.confusion_matrix.matrix.map((rowCounts, rowIdx) => {
                      const rowLabel =
                        track.confusion_matrix.labels[rowIdx] ??
                        `Class ${rowIdx + 1}`;
                      const rowTotal = rowCounts.reduce((sum, n) => sum + n, 0);

                      return (
                        <tr key={`cm-row-${rowLabel}`}>
                          <th scope="row">{rowLabel}</th>
                          {rowCounts.map((count, colIdx) => {
                            const isDiagonal = rowIdx === colIdx;
                            const rowPct =
                              rowTotal > 0 ? (count / rowTotal) * 100 : 0;
                            const heat = getConfusionHeatTier(count, rowTotal);

                            return (
                              <td
                                className="modellab-cm-cell tabular-nums"
                                data-diagonal={isDiagonal ? "true" : "false"}
                                data-heat={heat}
                                key={`cm-${rowIdx}-${colIdx}`}
                              >
                                <span className="modellab-cm-cell__count">
                                  {formatInt(count)}
                                </span>
                                <span className="modellab-cm-cell__pct">
                                  {rowPct.toFixed(1)}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Callout title="Confusion matrix counts not serialized" tone="info">
                <p>
                  Reference figure: <code>{track.confusion_matrix.confusion_matrix_figure}</code>
                </p>
              </Callout>
            )}

            <div className="dataset-table-wrap">
              <table className="dataset-table">
                <thead>
                  <tr>
                    <th scope="col">Class / Aggregate</th>
                    <th className="dataset-table__num" scope="col">Precision</th>
                    <th className="dataset-table__num" scope="col">Recall</th>
                    <th className="dataset-table__num" scope="col">F1-score</th>
                    <th className="dataset-table__num" scope="col">Support</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(track.per_class_report).map(([label, val]) => {
                    if (!isReportEntry(val)) return null;
                    return (
                      <tr key={`amazon-report-${label}`}>
                        <td>{label}</td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(val.precision)}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(val.recall)}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(getF1(val))}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatInt(val.support)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="modellab-stack">
          <Card
            kicker="Held-out evaluation (5,427 test comments)"
            title="Multi-label test metrics"
          >
            <div className="modellab-two-col">
              <div className="probability-list">
                <Meter
                  label="Test Macro F1"
                  tone="model"
                  value={track.test_metrics.test_macro_f1}
                  valueLabel={`${(track.test_metrics.test_macro_f1 * 100).toFixed(2)}%`}
                />
                <Meter
                  label="Test Micro F1"
                  tone="model"
                  value={track.test_metrics.test_micro_f1}
                  valueLabel={`${(track.test_metrics.test_micro_f1 * 100).toFixed(2)}%`}
                />
                <Meter
                  label="Subset accuracy (exact match)"
                  tone="model"
                  value={track.test_metrics.subset_accuracy}
                  valueLabel={`${(track.test_metrics.subset_accuracy * 100).toFixed(2)}%`}
                />
              </div>

              <dl className="stat-grid">
                <div>
                  <dt>Hamming loss</dt>
                  <dd className="tabular-nums">
                    {formatFloat(track.test_metrics.hamming_loss)}
                  </dd>
                </div>
                <div>
                  <dt>Optimal threshold</dt>
                  <dd className="tabular-nums">
                    {track.test_metrics.optimal_threshold.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card
            kicker="Per-label breakdown (28 GoEmotions labels)"
            title="28-label classification report"
          >
            {goEmotionsReport.aggregates.length > 0 ? (
              <dl className="stat-grid">
                {goEmotionsReport.aggregates.map(({ label, entry }) => (
                  <div key={`agg-${label}`}>
                    <dt>{label} F1</dt>
                    <dd className="tabular-nums">{formatFloat(getF1(entry))}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="modellab-filter-bar">
              <div className="modellab-filter-field">
                <label htmlFor={`label-search-${track.id}`}>
                  Filter emotion label
                </label>
                <input
                  className="modellab-input"
                  id={`label-search-${track.id}`}
                  onChange={(event) => setLabelQuery(event.target.value)}
                  placeholder="e.g. gratitude, grief, neutral"
                  type="search"
                  value={labelQuery}
                />
              </div>

              <div className="modellab-filter-field">
                <label htmlFor={`label-sort-${track.id}`}>Sort order</label>
                <select
                  className="modellab-select"
                  id={`label-sort-${track.id}`}
                  onChange={(event) =>
                    setSortMode(event.target.value as SortMode)
                  }
                  value={sortMode}
                >
                  <option value="f1-desc">F1-score (high to low)</option>
                  <option value="f1-asc">F1-score (low to high)</option>
                  <option value="precision-desc">Precision (high to low)</option>
                  <option value="precision-asc">Precision (low to high)</option>
                  <option value="recall-desc">Recall (high to low)</option>
                  <option value="recall-asc">Recall (low to high)</option>
                  <option value="support-desc">Support (high to low)</option>
                  <option value="support-asc">Support (low to high)</option>
                  <option value="label-asc">Emotion name (A–Z)</option>
                  <option value="label-desc">Emotion name (Z–A)</option>
                </select>
              </div>
            </div>

            <p className="specimen tabular-nums">
              Showing {filteredGoEmotionsLabels.length} of{" "}
              {goEmotionsReport.labels.length} emotion labels
            </p>

            {filteredGoEmotionsLabels.length > 0 ? (
              <div className="dataset-table-wrap">
                <table className="dataset-table">
                  <thead>
                    <tr>
                      {SORT_COLUMNS.map((col) => {
                        const isActive = activeSort.column === col.column;
                        const ariaSort = isActive
                          ? activeSort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none";
                        const nextDirection: SortDirection = isActive
                          ? activeSort.direction === "asc"
                            ? "desc"
                            : "asc"
                          : col.defaultDirection;
                        const directionLabel =
                          col.column === "label"
                            ? nextDirection === "asc"
                              ? "A to Z"
                              : "Z to A"
                            : nextDirection === "asc"
                              ? "low to high"
                              : "high to low";

                        return (
                          <th
                            aria-sort={ariaSort}
                            className={col.numeric ? "dataset-table__num" : undefined}
                            key={col.column}
                            scope="col"
                          >
                            <button
                              aria-label={`Sort by ${col.label} (${directionLabel})`}
                              className={
                                isActive
                                  ? "dataset-table__sort dataset-table__sort--active"
                                  : "dataset-table__sort"
                              }
                              onClick={() => handleToggleColumnSort(col.column)}
                              type="button"
                            >
                              <span>{col.label}</span>
                              <span
                                aria-hidden="true"
                                className="dataset-table__sort-indicator"
                              >
                                {isActive
                                  ? activeSort.direction === "asc"
                                    ? "↑"
                                    : "↓"
                                  : "↕"}
                              </span>
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGoEmotionsLabels.map(({ label, entry }) => (
                      <tr key={`go-label-${label}`}>
                        <td>{label}</td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(entry.precision)}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(entry.recall)}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatFloat(getF1(entry))}
                        </td>
                        <td className="dataset-table__num tabular-nums">
                          {formatInt(entry.support)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Callout title="No matching emotion labels" tone="info">
                <p>No emotion label matched &ldquo;{labelQuery}&rdquo;.</p>
                <div className="loader-actions">
                  <Button
                    onClick={() => setLabelQuery("")}
                    type="button"
                    variant="secondary"
                  >
                    Clear filter
                  </Button>
                </div>
              </Callout>
            )}
          </Card>
        </div>
      )}

      {/* 5. ONNX Parity & Artifact File Presence Checklist */}
      <div className="modellab-two-col">
        <Card kicker="Export verification" title="ONNX numerical parity">
          <div className="modellab-status-row">
            <Badge
              tone={track.onnx_parity.within_tolerance ? "success" : "danger"}
            >
              {track.onnx_parity.within_tolerance
                ? "Within tolerance"
                : "Tolerance exceeded"}
            </Badge>
          </div>
          <dl className="modellab-meta-list">
            <div>
              <dt>ONNX file</dt>
              <dd>
                <code>{track.onnx_parity.onnx_path}</code>
              </dd>
            </div>
            <div>
              <dt>Max absolute error</dt>
              <dd className="tabular-nums">
                <code>{formatScientific(track.onnx_parity.max_absolute_error)}</code>
              </dd>
            </div>
            <div>
              <dt>Tolerance</dt>
              <dd className="tabular-nums">
                <code>{formatScientific(track.onnx_parity.tolerance)}</code>
              </dd>
            </div>
            <div>
              <dt>Tensor shapes</dt>
              <dd className="tabular-nums">
                <code>
                  PyTorch [{track.onnx_parity.pytorch_shape.join(", ")}] · ONNX [
                  {track.onnx_parity.onnx_shape.join(", ")}]
                </code>
              </dd>
            </div>
          </dl>
        </Card>

        <Card kicker="Disk manifest" title="Artifact file presence">
          <ul className="modellab-artifact-list">
            {track.artifact_files.map((file) => (
              <li className="modellab-artifact-row" key={file.path}>
                <code className="modellab-artifact-path">{file.path}</code>
                <div className="modellab-artifact-meta">
                  <Badge tone={file.exists ? "success" : "warning"}>
                    {file.exists ? "Present" : "Missing on disk"}
                  </Badge>
                  <span className="modellab-artifact-size tabular-nums">
                    {file.exists ? formatBytes(file.size_bytes) : "Missing on disk"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
