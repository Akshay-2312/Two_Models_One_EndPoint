import dynamic from "next/dynamic";
import { useMemo, type KeyboardEvent } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  SectionHeader,
  StatisticsLoader,
} from "../components/ui";
import type { DatasetSummaryItem } from "../lib/api";
import { useDatasetSummary } from "../lib/useDatasetSummary";

const DatasetCharts = dynamic(
  () => import("../components/DatasetCharts").then((mod) => mod.DatasetCharts),
  {
    ssr: false,
    loading: () => (
      <div className="dataset-chart-skeleton" role="status">
        Loading charts…
      </div>
    ),
  },
);

const integerFormatter = new Intl.NumberFormat("en-US");

const DATASET_ORDER = ["amazon_reviews", "go_emotions"];

const DATASET_TAB_LABEL: Record<string, string> = {
  amazon_reviews: "Amazon Reviews",
  go_emotions: "GoEmotions (Simplified)",
};

const SPLIT_LABEL: Record<string, string> = {
  train: "Train",
  validation: "Validation",
  test: "Test",
  sampled_train: "Sampled train (<256 words)",
  sampled_validation: "Sampled validation",
  sampled_test: "Sampled test",
};

function formatInt(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return integerFormatter.format(value);
}

function getTabLabel(id: string, item?: DatasetSummaryItem): string {
  if (DATASET_TAB_LABEL[id]) return DATASET_TAB_LABEL[id];
  return item?.name ?? id;
}

function getPrimaryTotalRows(dataset: DatasetSummaryItem): number {
  const { splits } = dataset;
  const baseSplits = ["train", "validation", "test"].filter(
    (key) => typeof splits[key] === "number",
  );
  if (baseSplits.length > 0) {
    return baseSplits.reduce((sum, key) => sum + (splits[key] ?? 0), 0);
  }
  return Object.values(splits).reduce((sum, count) => sum + count, 0);
}

type SchemaPreviewEntry = {
  group: string;
  items: Array<{ name: string; type: string }>;
};

function extractSchemaEntries(
  schema: Record<string, unknown>,
): SchemaPreviewEntry[] {
  const entries: SchemaPreviewEntry[] = [];

  for (const [key, value] of Object.entries(schema)) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;

    if (
      record.dtypes &&
      typeof record.dtypes === "object" &&
      !Array.isArray(record.dtypes)
    ) {
      const items = Object.entries(record.dtypes as Record<string, unknown>).map(
        ([col, dtype]) => ({
          name: col,
          type: String(dtype),
        }),
      );
      if (items.length > 0) {
        entries.push({ group: key, items });
      }
      continue;
    }

    if (key === "features") {
      const items = Object.entries(record).map(([col, desc]) => ({
        name: col,
        type: String(desc),
      }));
      if (items.length > 0) {
        entries.push({ group: "Hugging Face features", items });
      }
    }
  }

  return entries;
}

export default function Datasets() {
  const {
    phase,
    data,
    error,
    sourceUrl,
    activeDatasetId,
    setActiveDatasetId,
    samplesState,
    samples,
    samplesError,
    page,
    pageSize,
    setPage,
    refresh,
    refreshSamples,
  } = useDatasetSummary();

  const datasetIds = useMemo(() => {
    if (!data?.datasets) return [];
    const keys = Object.keys(data.datasets);
    return [...keys].sort((a, b) => {
      const idxA = DATASET_ORDER.indexOf(a);
      const idxB = DATASET_ORDER.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [data?.datasets]);

  const activeDataset: DatasetSummaryItem | null =
    data?.datasets?.[activeDatasetId] ??
    (datasetIds[0] ? data?.datasets?.[datasetIds[0]] ?? null : null);

  const resolvedDatasetId =
    data?.datasets?.[activeDatasetId] !== undefined
      ? activeDatasetId
      : datasetIds[0] ?? activeDatasetId;

  const schemaEntries = useMemo(
    () => (activeDataset ? extractSchemaEntries(activeDataset.schema) : []),
    [activeDataset],
  );

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (datasetIds.length < 2) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % datasetIds.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + datasetIds.length) % datasetIds.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = datasetIds.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      setActiveDatasetId(datasetIds[nextIndex]);
    }
  }

  const isSamplesRestricted =
    samples !== null
      ? !samples.approved
      : activeDataset
        ? !activeDataset.samples_policy.approved
        : false;

  const totalPages = samples
    ? Math.max(1, Math.ceil(samples.total_available / pageSize))
    : 1;

  return (
    <section className="page-section datasets-page">
      <SectionHeader
        description="Committed corpus audits, class distributions, sequence length quantiles, and sample governance for the two NLP Lab tracks."
        index="NLP-05 / DATASETS"
        title="Dataset Explorer"
      />

      {phase === "loading" || phase === "stalled" ? (
        <div className="page-loading-stage">
          <StatisticsLoader
            error={error}
            label="Loading dataset statistics…"
            onRetry={refresh}
            status={phase}
          />
        </div>
      ) : null}

      {phase === "unavailable" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="Dataset summary report or API endpoint unavailable"
          tone="warning"
        >
          <p>
            {error ??
              "The committed summary artifact (data/dataset_explorer_summary.json) or backend endpoint (/datasets/summary) could not be reached."}
          </p>
          <p className="dataset-endpoint-note">
            Endpoint: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "failed" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="Failed to load dataset summary"
          tone="danger"
        >
          <p>{error ?? "An unexpected error occurred while fetching dataset metadata."}</p>
          <p className="dataset-endpoint-note">
            Source URL: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "empty" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="No dataset summary report available"
          tone="info"
        >
          <p>
            The summary endpoint (<code>{sourceUrl}</code>) returned no dataset entries.
            Ensure <code>data/dataset_explorer_summary.json</code> contains audited corpus records.
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "ready" && data && activeDataset ? (
        <div className="datasets-content">
          {/* Provenance & Audit Metadata Strip */}
          <div className="dataset-provenance-bar">
            <div className="dataset-provenance-bar__meta">
              <Badge dot tone="success">
                Audited manifests loaded
              </Badge>
              <span className="specimen">
                Provenance: {data.provenance}
              </span>
              <span className="specimen tabular-nums">
                Last audit: {data.last_audit_date}
              </span>
            </div>
            <Button onClick={refresh} type="button" variant="secondary">
              Refresh audits
            </Button>
          </div>

          {/* Summary Comparison Cards */}
          <div className="card-grid">
            {datasetIds.map((id) => {
              const item = data.datasets[id];
              if (!item) return null;
              const isSelected = id === resolvedDatasetId;
              const primaryRows = getPrimaryTotalRows(item);
              const labelCount =
                id === "amazon_reviews"
                  ? "5 rating classes"
                  : "28 multi-label outputs";

              return (
                <Card
                  className={
                    isSelected
                      ? "dataset-compare-card dataset-compare-card--active"
                      : "dataset-compare-card"
                  }
                  key={id}
                  kicker={
                    id === "amazon_reviews"
                      ? "Corpus A / Rating classification"
                      : "Corpus B / Multi-label emotion"
                  }
                  title={item.name}
                >
                  <div className="dataset-compare-card__badges">
                    <Badge tone={item.status === "audited" ? "success" : "warning"}>
                      {item.status}
                    </Badge>
                    <Badge tone="model">{labelCount}</Badge>
                  </div>
                  <p>{item.task}</p>
                  <dl className="stat-grid">
                    <div>
                      <dt>Full corpus rows</dt>
                      <dd className="tabular-nums">{formatInt(primaryRows)}</dd>
                    </div>
                    <div>
                      <dt>Train rows</dt>
                      <dd className="tabular-nums">{formatInt(item.splits.train)}</dd>
                    </div>
                    <div>
                      <dt>Test rows</dt>
                      <dd className="tabular-nums">{formatInt(item.splits.test)}</dd>
                    </div>
                  </dl>
                  <div className="dataset-compare-card__footer">
                    <Button
                      aria-pressed={isSelected}
                      onClick={() => setActiveDatasetId(id)}
                      type="button"
                      variant={isSelected ? "primary" : "secondary"}
                    >
                      {isSelected ? "Inspecting corpus" : `Inspect ${getTabLabel(id, item)}`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Methodological Principle Callout */}
          <Callout title="Analytical principle: volume and balance are not label quality" tone="info">
            <p>
              <strong>High sample count and class balance are not proof of low label noise.</strong>{" "}
              A 3.65M-row corpus balanced at 20% per star still contains rating/text disagreement,
              while a multi-label Reddit corpus reflects crowdworker judgment and severe tail sparsity.
            </p>
          </Callout>

          {/* Interactive Dataset Selector Tabs */}
          <div className="dataset-tabs-shell">
            <div
              aria-label="Select dataset corpus to inspect"
              className="dataset-tabs"
              role="tablist"
            >
              {datasetIds.map((id, idx) => {
                const item = data.datasets[id];
                const isSelected = id === resolvedDatasetId;
                return (
                  <button
                    aria-controls={`dataset-panel-${id}`}
                    aria-selected={isSelected}
                    className="dataset-tab"
                    id={`dataset-tab-${id}`}
                    key={id}
                    onClick={() => setActiveDatasetId(id)}
                    onKeyDown={(event) => handleTabKeyDown(event, idx)}
                    role="tab"
                    tabIndex={isSelected ? 0 : -1}
                    type="button"
                  >
                    <span>{getTabLabel(id, item)}</span>
                    <span className="dataset-tab__meta tabular-nums">
                      {formatInt(item?.splits?.train)} train
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Dataset Tabpanel */}
          <div
            aria-labelledby={`dataset-tab-${resolvedDatasetId}`}
            className="dataset-panel"
            id={`dataset-panel-${resolvedDatasetId}`}
            role="tabpanel"
          >
            {/* Active Corpus Overview & Sources */}
            <Card
              kicker={`Corpus overview · ${resolvedDatasetId}`}
              title={activeDataset.name}
            >
              <div className="dataset-audit-head">
                <div className="chip-row">
                  <Badge
                    tone={activeDataset.status === "audited" ? "success" : "warning"}
                  >
                    Status: {activeDataset.status}
                  </Badge>
                  <Badge tone="neutral">
                    Last audit: {activeDataset.last_audit_date}
                  </Badge>
                </div>
              </div>

              <dl className="dataset-meta-list">
                <div>
                  <dt>Task</dt>
                  <dd>{activeDataset.task}</dd>
                </div>
                <div>
                  <dt>Label semantics</dt>
                  <dd>{activeDataset.label_semantics}</dd>
                </div>
                <div>
                  <dt>Provenance</dt>
                  <dd>{data.provenance}</dd>
                </div>
                <div>
                  <dt>Primary source</dt>
                  <dd>
                    <a
                      className="dataset-external-link"
                      href={activeDataset.source_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {activeDataset.source_url}
                    </a>
                  </dd>
                </div>
                {activeDataset.mirror_url ? (
                  <div>
                    <dt>Hugging Face mirror</dt>
                    <dd>
                      <a
                        className="dataset-external-link"
                        href={activeDataset.mirror_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {activeDataset.mirror_url}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {activeDataset.paper_url ? (
                  <div>
                    <dt>ACL reference paper</dt>
                    <dd>
                      <a
                        className="dataset-external-link"
                        href={activeDataset.paper_url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {activeDataset.paper_url}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            {/* Split Counts & Schema */}
            <div className="datasets-two-col">
              <Card kicker="Split inventory" title="Recorded split counts">
                <div className="dataset-table-wrap">
                  <table className="dataset-table">
                    <thead>
                      <tr>
                        <th scope="col">Split</th>
                        <th className="dataset-table__num" scope="col">
                          Rows
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(activeDataset.splits).map(([split, count]) => (
                        <tr key={split}>
                          <td>{SPLIT_LABEL[split] ?? split}</td>
                          <td className="dataset-table__num tabular-nums">
                            {formatInt(count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card kicker="Dataset schema" title="Columns and dtypes">
                {schemaEntries.length > 0 ? (
                  <div className="dataset-schema-groups">
                    {schemaEntries.map((entry) => (
                      <div className="dataset-schema-group" key={entry.group}>
                        <h3 className="dataset-schema-group__title">
                          {entry.group}
                        </h3>
                        <dl className="dataset-schema-list">
                          {entry.items.map((col) => (
                            <div key={`${entry.group}-${col.name}`}>
                              <dt>{col.name}</dt>
                              <dd>{col.type}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No schema fields recorded.</p>
                )}
              </Card>
            </div>

            {/* Interactive Recharts Visualizations */}
            <DatasetCharts dataset={activeDataset} datasetId={resolvedDatasetId} />

            {/* Missing Values, Duplicates & Co-occurrence Audits */}
            <div className="card-grid">
              {/* Missing / Null Values Audit */}
              <Card kicker="Audit 01 / Completeness" title="Missing & null values">
                <div className="dataset-audit-head">
                  {activeDataset.missing_values.recorded ? (
                    <Badge tone="success">Recorded</Badge>
                  ) : (
                    <Badge tone="warning">Unaudited / Missing</Badge>
                  )}
                </div>

                {activeDataset.missing_values.recorded ? (
                  <div className="dataset-audit-body">
                    <dl className="stat-grid">
                      {activeDataset.missing_values.train ? (
                        <>
                          <div>
                            <dt>Train title nulls</dt>
                            <dd className="tabular-nums">
                              {formatInt(
                                activeDataset.missing_values.train
                                  .review_title_nulls,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Train text nulls</dt>
                            <dd className="tabular-nums">
                              {formatInt(
                                activeDataset.missing_values.train
                                  .review_text_nulls,
                              )}
                            </dd>
                          </div>
                        </>
                      ) : null}
                      {activeDataset.missing_values.test ? (
                        <>
                          <div>
                            <dt>Test title nulls</dt>
                            <dd className="tabular-nums">
                              {formatInt(
                                activeDataset.missing_values.test
                                  .review_title_nulls,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Test text nulls</dt>
                            <dd className="tabular-nums">
                              {formatInt(
                                activeDataset.missing_values.test
                                  .review_text_nulls,
                              )}
                            </dd>
                          </div>
                        </>
                      ) : null}
                    </dl>
                    {activeDataset.missing_values.note ? (
                      <p>{activeDataset.missing_values.note}</p>
                    ) : null}
                  </div>
                ) : (
                  <p>
                    {activeDataset.missing_values.missing_reason ??
                      activeDataset.missing_values.note ??
                      "Missing/null value counts were not recorded in committed artifacts."}
                  </p>
                )}
              </Card>

              {/* Duplicates Audit */}
              <Card kicker="Audit 02 / Redundancy" title="Duplicates & near-duplicates">
                <div className="dataset-audit-head">
                  {activeDataset.duplicates_audit.recorded ? (
                    <Badge tone="success">Recorded</Badge>
                  ) : (
                    <Badge tone="warning">Unaudited / Missing</Badge>
                  )}
                </div>

                {activeDataset.duplicates_audit.recorded ? (
                  <div className="dataset-audit-body">
                    <dl className="stat-grid">
                      <div>
                        <dt>Exact duplicates</dt>
                        <dd className="tabular-nums">
                          {formatInt(activeDataset.duplicates_audit.duplicate_count)}
                        </dd>
                      </div>
                      <div>
                        <dt>Near duplicates</dt>
                        <dd className="tabular-nums">
                          {formatInt(
                            activeDataset.duplicates_audit.near_duplicate_count,
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p>{activeDataset.duplicates_audit.note}</p>
                  </div>
                ) : (
                  <p>
                    {activeDataset.duplicates_audit.missing_reason ??
                      activeDataset.duplicates_audit.note}
                  </p>
                )}
              </Card>

              {/* Co-occurrence Audit (when applicable) */}
              {activeDataset.cooccurrence_audit ? (
                <Card kicker="Audit 03 / Label coupling" title="Co-occurrence matrix">
                  <div className="dataset-audit-head">
                    {activeDataset.cooccurrence_audit.recorded ? (
                      <Badge tone="success">Recorded</Badge>
                    ) : (
                      <Badge tone="warning">Unaudited / Missing</Badge>
                    )}
                  </div>
                  <p>
                    {activeDataset.cooccurrence_audit.recorded
                      ? activeDataset.cooccurrence_audit.note
                      : activeDataset.cooccurrence_audit.missing_reason ??
                        activeDataset.cooccurrence_audit.note}
                  </p>
                </Card>
              ) : null}
            </div>

            {/* Imbalance Summary & Quality Warnings */}
            <Card
              kicker="Audit summary / Label distribution & caveats"
              title="Imbalance summary & quality warnings"
            >
              <div className="dataset-imbalance-block">
                <h3 className="dataset-imbalance-block__heading">
                  Label imbalance assessment
                </h3>
                <p>{activeDataset.imbalance_summary}</p>
              </div>

              <div className="dataset-warnings-block">
                <h3 className="dataset-imbalance-block__heading">
                  Recorded quality warnings ({activeDataset.quality_warnings.length})
                </h3>
                <ul className="dataset-warning-list">
                  {activeDataset.quality_warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Sample Explorer */}
            <Card
              kicker="Governance-gated preview / GET /datasets/{id}/samples"
              title="Sample Explorer"
            >
              <div className="dataset-sample-scope">
                <Badge tone={isSamplesRestricted ? "warning" : "success"}>
                  {isSamplesRestricted
                    ? "Preview restricted"
                    : "Approved preview rows"}
                </Badge>
                <span className="specimen tabular-nums">
                  Full corpus: {formatInt(getPrimaryTotalRows(activeDataset))} rows ·
                  Preview available: {formatInt(samples?.total_available ?? 0)} rows
                </span>
              </div>

              <p className="muted">
                The Sample Explorer only exposes explicitly governance-approved preview
                records, distinct from the full training and evaluation corpus.
              </p>

              {samplesState === "loading" || samplesState === "stalled" ? (
                <StatisticsLoader
                  label="Checking dataset sample governance…"
                  onRetry={refreshSamples}
                  status={samplesState}
                />
              ) : null}

              {samplesState === "error" ? (
                <Callout
                  role="status"
                  title="Sample preview request failed"
                  tone="danger"
                >
                  <p>{samplesError ?? "Unable to fetch dataset sample policy."}</p>
                  <div className="loader-actions">
                    <Button
                      onClick={refreshSamples}
                      type="button"
                      variant="secondary"
                    >
                      Retry samples
                    </Button>
                  </div>
                </Callout>
              ) : null}

              {samplesState === "ready" && samples ? (
                !samples.approved ? (
                  <Callout
                    title="Sample preview withheld under data-governance policy"
                    tone="info"
                  >
                    <p>{samples.notice}</p>
                    {activeDataset.samples_policy.reason &&
                    activeDataset.samples_policy.reason !== samples.notice ? (
                      <p>{activeDataset.samples_policy.reason}</p>
                    ) : null}
                  </Callout>
                ) : samples.items.length === 0 ? (
                  <Callout title="No preview rows returned" tone="info">
                    <p>{samples.notice}</p>
                  </Callout>
                ) : (
                  <div className="dataset-samples-table-block">
                    <Callout title="Masked PII & preview scope" tone="info">
                      <p>{samples.notice}</p>
                    </Callout>

                    <div className="dataset-table-wrap">
                      <table className="dataset-table">
                        <thead>
                          <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Split</th>
                            <th scope="col">Text</th>
                            <th scope="col">Target labels</th>
                          </tr>
                        </thead>
                        <tbody>
                          {samples.items.map((row, idx) => (
                            <tr key={row.id ?? `sample-${page}-${idx}`}>
                              <td className="dataset-table__mono tabular-nums">
                                {row.id ?? "—"}
                              </td>
                              <td className="dataset-table__mono">
                                {row.split ?? "—"}
                              </td>
                              <td className="dataset-table__text">
                                {row.title ? (
                                  <strong className="dataset-sample-title">
                                    {row.title}{" "}
                                  </strong>
                                ) : null}
                                <span>{row.text ?? "—"}</span>
                              </td>
                              <td>
                                <div className="chip-row">
                                  {row.labels.length > 0 ? (
                                    row.labels.map((label) => (
                                      <Badge key={label} tone="model">
                                        {label}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="muted">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="dataset-pagination">
                      <span className="specimen tabular-nums">
                        Page {samples.page} of {totalPages} (
                        {formatInt(samples.total_available)} preview rows)
                      </span>
                      <div className="dataset-pagination__actions">
                        <Button
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                          type="button"
                          variant="secondary"
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={page >= totalPages}
                          onClick={() => setPage(page + 1)}
                          type="button"
                          variant="secondary"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}
