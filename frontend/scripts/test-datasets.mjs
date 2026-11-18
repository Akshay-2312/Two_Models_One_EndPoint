import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  API_BASE_URL,
  ApiError,
  classifyApiError,
  getDatasetSamples,
  getDatasetSummary,
  isNetworkError,
} from "../lib/api.ts";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const KAGGLE_AMAZON_URL =
  "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv";
const HF_AMAZON_MIRROR_URL =
  "https://huggingface.co/datasets/yassiracharki/Amazon_Reviews_for_Sentiment_Analysis_fine_grained_5_classes";
const HF_GOEMOTIONS_URL =
  "https://huggingface.co/datasets/google-research-datasets/go_emotions";

const sampleSummaryFixture = {
  provenance: "Repository audit artifacts (Notebooks 00-02, data/*.json)",
  last_audit_date: "2026-11-13",
  datasets: {
    amazon_reviews: {
      name: "Amazon Reviews for Sentiment Analysis",
      task: "Five-class review rating classification (1–5 stars)",
      label_semantics: "5 ordinal star-rating classes (1–5).",
      source_url: KAGGLE_AMAZON_URL,
      mirror_url: HF_AMAZON_MIRROR_URL,
      status: "audited",
      last_audit_date: "2026-11-13",
      splits: {
        train: 3000000,
        test: 650000,
        sampled_train: 450000,
        sampled_validation: 50000,
        sampled_test: 50000,
      },
      schema: {
        "train.csv": {
          dtypes: {
            class_index: "int64",
            review_title: "str",
            review_text: "str",
          },
        },
      },
      class_distribution: {
        train: { 1: 600000, 2: 600000, 3: 600000, 4: 600000, 5: 600000 },
      },
      missing_values: {
        recorded: true,
        train: { review_title_nulls: 188, review_text_nulls: 0, total_rows: 3000000 },
        test: { review_title_nulls: 26, review_text_nulls: 0, total_rows: 650000 },
        note: "188 null review_title rows in train; 0 null review_text rows.",
      },
      text_length_stats: {
        recorded: true,
        unit: "words",
        p50: 74,
        mean: 82.07,
        max: 242,
        max_sequence_cap: 256,
      },
      duplicates_audit: {
        recorded: false,
        duplicate_count: null,
        near_duplicate_count: null,
        missing_reason: "Duplicate counts were not persisted.",
        note: "Duplicate counts were not persisted.",
      },
      imbalance_summary: "Class-balanced across 5 star classes.",
      quality_warnings: ["Raw Kaggle Amazon review records are restricted."],
      samples_policy: {
        approved: false,
        reason: "Raw Kaggle Amazon review records are excluded from public redistribution.",
      },
    },
    go_emotions: {
      name: "GoEmotions (Simplified)",
      task: "Multi-label emotion classification (27 emotions + neutral = 28 labels)",
      label_semantics: "28 independent binary/multi-label outputs.",
      source_url: HF_GOEMOTIONS_URL,
      paper_url: "https://aclanthology.org/2020.acl-main.372/",
      status: "audited",
      last_audit_date: "2026-11-13",
      splits: {
        train: 43410,
        validation: 5426,
        test: 5427,
      },
      schema: {
        features: {
          text: "Value('string')",
          labels: "List(ClassLabel)",
          id: "Value('string')",
        },
      },
      class_prevalence: {
        train: { neutral: 14219, admiration: 4130, grief: 77 },
      },
      labels_per_example: {
        train: { 1: 36308, 2: 6541, 3: 532, 4: 28, 5: 1 },
      },
      missing_values: {
        recorded: false,
        null_count: null,
        empty_text_count: null,
        missing_reason: "Not exported separately.",
        note: "Not exported separately.",
      },
      text_length_stats: {
        recorded: true,
        unit: "DistilBERT subword tokens",
        mean: 19.17,
        p95: 34,
        p99: 38,
        max: 316,
        max_sequence_cap: 128,
        exceeding_max_length: 1,
      },
      duplicates_audit: {
        recorded: false,
        duplicate_count: null,
        near_duplicate_count: null,
        missing_reason: "Duplicate counts were not persisted.",
        note: "Duplicate counts were not persisted.",
      },
      cooccurrence_audit: {
        recorded: false,
        matrix: null,
        missing_reason: "Pairwise emotion co-occurrence matrix was not exported.",
        note: "Pairwise emotion co-occurrence matrix was not exported.",
      },
      imbalance_summary: "Severe class imbalance across 28 labels.",
      quality_warnings: ["Severe class imbalance across 28 labels."],
      samples_policy: {
        approved: false,
        reason: "Raw Reddit comment samples are not committed in repository artifacts.",
      },
    },
  },
};

// ---- 1. Runtime fetch contract tests for getDatasetSummary & getDatasetSamples ----
const originalFetch = globalThis.fetch;

try {
  // 1a. Success payload (Amazon Reviews + GoEmotions, exact URLs, unrecorded duplicates)
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${API_BASE_URL}/datasets/summary`);
    assert.equal(new Headers(init?.headers).has("Content-Type"), false);
    return new Response(JSON.stringify(sampleSummaryFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const summary = await getDatasetSummary();
  assert.ok(summary.datasets.amazon_reviews);
  assert.ok(summary.datasets.go_emotions);
  assert.equal(summary.datasets.amazon_reviews.source_url, KAGGLE_AMAZON_URL);
  assert.equal(summary.datasets.amazon_reviews.mirror_url, HF_AMAZON_MIRROR_URL);
  assert.equal(summary.datasets.go_emotions.source_url, HF_GOEMOTIONS_URL);
  assert.equal(summary.datasets.amazon_reviews.splits.train, 3000000);
  assert.equal(summary.datasets.amazon_reviews.splits.test, 650000);
  assert.equal(summary.datasets.go_emotions.splits.train, 43410);
  assert.equal(summary.datasets.amazon_reviews.duplicates_audit.recorded, false);
  assert.equal(summary.datasets.go_emotions.duplicates_audit.recorded, false);

  // 1b. Unavailable: 503 dataset_summary_unavailable & TypeError network failure
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "dataset_summary_unavailable",
        detail: "Committed dataset summary report is missing.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getDatasetSummary(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 503);
    assert.equal(err.errorCode, "dataset_summary_unavailable");
    assert.equal(err.detail, "Committed dataset summary report is missing.");
    return true;
  });

  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(getDatasetSummary(), (err) => {
    assert.equal(isNetworkError(err), true);
    assert.equal(classifyApiError(err).kind, "offline");
    return true;
  });

  // 1c. Failed: 500 server error (JSON and plain text)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ detail: "Corrupt dataset summary payload" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getDatasetSummary(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, "Corrupt dataset summary payload");
    assert.equal(classifyApiError(err).kind, "api_error");
    return true;
  });

  globalThis.fetch = async () => new Response("Internal Server Error", { status: 500 });
  await assert.rejects(getDatasetSummary(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, null);
    return true;
  });

  // 1d. Empty summary (datasets: {})
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        provenance: "Repository audit artifacts",
        last_audit_date: "2026-11-13",
        datasets: {},
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const emptySummary = await getDatasetSummary();
  assert.deepEqual(emptySummary.datasets, {});

  // 1e. Samples governance: approved: false -> items: []
  globalThis.fetch = async (url) => {
    assert.equal(
      url,
      `${API_BASE_URL}/datasets/amazon_reviews/samples?page=1&page_size=10`,
    );
    return new Response(
      JSON.stringify({
        dataset_id: "amazon_reviews",
        approved: false,
        notice: "Raw Kaggle Amazon review records are excluded from public redistribution.",
        total_available: 0,
        page: 1,
        page_size: 10,
        items: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const gatedSamples = await getDatasetSamples("amazon_reviews");
  assert.equal(gatedSamples.approved, false);
  assert.deepEqual(gatedSamples.items, []);
  assert.equal(gatedSamples.total_available, 0);

  // 1f. Approved paginated samples (approved: true, items: [...])
  globalThis.fetch = async (url) => {
    assert.equal(
      url,
      `${API_BASE_URL}/datasets/go_emotions/samples?page=2&page_size=5`,
    );
    return new Response(
      JSON.stringify({
        dataset_id: "go_emotions",
        approved: true,
        notice: "Approved sanitized preview subset.",
        total_available: 12,
        page: 2,
        page_size: 5,
        items: [
          {
            id: "row-6",
            split: "train",
            text: "Thank you for documenting the label schema.",
            labels: ["gratitude", "admiration"],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const approvedSamples = await getDatasetSamples("go_emotions", 2, 5);
  assert.equal(approvedSamples.approved, true);
  assert.equal(approvedSamples.page, 2);
  assert.equal(approvedSamples.page_size, 5);
  assert.equal(approvedSamples.total_available, 12);
  assert.equal(approvedSamples.items.length, 1);
  assert.deepEqual(approvedSamples.items[0].labels, ["gratitude", "admiration"]);

  // 1g. Unknown dataset -> 404 ApiError
  globalThis.fetch = async (url) => {
    assert.equal(
      url,
      `${API_BASE_URL}/datasets/unknown_dataset/samples?page=1&page_size=10`,
    );
    return new Response(
      JSON.stringify({
        error: "dataset_not_found",
        detail: "Unknown dataset id: unknown_dataset",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  };

  await assert.rejects(getDatasetSamples("unknown_dataset"), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 404);
    assert.equal(err.errorCode, "dataset_not_found");
    return true;
  });
} finally {
  globalThis.fetch = originalFetch;
}

// ---- 2. Committed dataset summary & UI/CSS structural assertions ----
const committedSummaryRaw = await read("../../data/dataset_explorer_summary.json");
const committedSummary = JSON.parse(committedSummaryRaw);
const datasetsPage = await read("../pages/datasets.tsx");
const datasetCharts = await read("../components/DatasetCharts.tsx");
const useDatasetSummaryHook = await read("../lib/useDatasetSummary.ts");
const apiFile = await read("../lib/api.ts");
const globalsCss = await read("../styles/globals.css");

// 2a. Exact Kaggle & Hugging Face URLs present; zero /content/drive paths anywhere
assert.equal(committedSummary.datasets.amazon_reviews.source_url, KAGGLE_AMAZON_URL);
assert.equal(committedSummary.datasets.amazon_reviews.mirror_url, HF_AMAZON_MIRROR_URL);
assert.equal(committedSummary.datasets.go_emotions.source_url, HF_GOEMOTIONS_URL);
assert.equal(committedSummary.datasets.amazon_reviews.duplicates_audit.recorded, false);
assert.equal(committedSummary.datasets.go_emotions.duplicates_audit.recorded, false);

for (const [label, source] of [
  ["data/dataset_explorer_summary.json", committedSummaryRaw],
  ["pages/datasets.tsx", datasetsPage],
  ["components/DatasetCharts.tsx", datasetCharts],
  ["lib/useDatasetSummary.ts", useDatasetSummaryHook],
  ["lib/api.ts", apiFile],
  ["styles/globals.css", globalsCss],
]) {
  assert.doesNotMatch(
    source,
    /\/content\/drive/i,
    `${label} must not contain /content/drive paths`,
  );
}

// 2b. Loading/stalled StatisticsLoader & distinct unavailable/failed/empty states
assert.match(datasetsPage, /<StatisticsLoader/);
assert.match(datasetsPage, /phase === "loading" \|\| phase === "stalled"/);
assert.match(datasetsPage, /samplesState === "loading" \|\| samplesState === "stalled"/);
assert.match(datasetsPage, /phase === "unavailable"[\s\S]*?tone="warning"/);
assert.match(datasetsPage, /phase === "failed"[\s\S]*?tone="danger"/);
assert.match(datasetsPage, /phase === "empty"[\s\S]*?tone="info"/);
assert.match(datasetsPage, /onClick=\{refresh\}/);
assert.match(datasetsPage, /Unaudited \/ Missing/);
assert.match(datasetsPage, /Sample preview withheld under data-governance policy/);
assert.match(datasetsPage, /rel="noopener noreferrer"/);
assert.match(datasetsPage, /target="_blank"/);
assert.match(datasetsPage, /role="tablist"/);
assert.match(datasetsPage, /role="tab"/);
assert.match(datasetsPage, /role="tabpanel"/);
assert.match(datasetsPage, /tabular-nums/);

// 2c. Hook phase mapping & cancellation guards
for (const phase of ["loading", "stalled", "unavailable", "failed", "empty", "ready"]) {
  assert.match(
    useDatasetSummaryHook,
    new RegExp(`"${phase}"`),
    `useDatasetSummary.ts must define phase "${phase}"`,
  );
}
assert.match(useDatasetSummaryHook, /new AbortController\(\)/);
assert.match(useDatasetSummaryHook, /requestError\.status === 503/);
assert.match(useDatasetSummaryHook, /"dataset_summary_unavailable"/);
assert.match(useDatasetSummaryHook, /requestError instanceof TypeError/);

// 2d. Charts reduced-motion & truthful quantile profile
assert.match(datasetCharts, /useReducedMotion\(\)/);
assert.match(datasetCharts, /isAnimationActive=\{!reducedMotion\}/);
assert.match(datasetCharts, /lengthStats\?\.recorded && quantileData\.length > 0/);
assert.match(datasetCharts, /no fabricated histogram bins/);

// 2e. No console logging or dangerous HTML injection in dataset UI modules
for (const [name, source] of [
  ["pages/datasets.tsx", datasetsPage],
  ["components/DatasetCharts.tsx", datasetCharts],
  ["lib/useDatasetSummary.ts", useDatasetSummaryHook],
]) {
  assert.doesNotMatch(
    source,
    /\bconsole\.(log|info|debug|warn|error)\b/,
    `${name} must not log to console`,
  );
  assert.doesNotMatch(
    source,
    /dangerouslySetInnerHTML/,
    `${name} must not use dangerouslySetInnerHTML`,
  );
}

// 2f. Break-UI & responsive CSS guarantees in globals.css
assert.match(globalsCss, /\.tabular-nums\s*\{\s*font-variant-numeric:\s*tabular-nums;\s*\}/);

for (const selector of [
  ".datasets-content",
  ".dataset-provenance-bar",
  ".dataset-tab",
  ".dataset-panel",
  ".datasets-two-col",
  ".dataset-meta-list dd",
  ".dataset-table-wrap",
  ".datasets-charts-stack",
  ".dataset-chart-card",
  ".dataset-chart__frame",
  ".dataset-samples-table-block",
]) {
  const blockMatch = globalsCss.match(
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\}`),
  );
  assert.ok(blockMatch, `globals.css must define ${selector}`);
  assert.match(
    blockMatch[0],
    /min-width:\s*0/,
    `${selector} must declare min-width: 0 to prevent flex/grid blowout`,
  );
}

for (const selector of [
  ".dataset-endpoint-note",
  ".dataset-meta-list dd",
  ".dataset-external-link",
  ".dataset-table__text",
  ".dataset-schema-list dd",
  ".dataset-warning-list li",
]) {
  const blockMatch = globalsCss.match(
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\}`),
  );
  assert.ok(blockMatch, `globals.css must define ${selector}`);
  assert.match(
    blockMatch[0],
    /overflow-wrap:\s*anywhere/,
    `${selector} must declare overflow-wrap: anywhere for long URLs/tokens`,
  );
}

const media40Match = globalsCss.match(/@media\s*\(max-width:\s*40rem\)\s*\{[\s\S]*?\n\}/);
assert.ok(media40Match, "globals.css must define @media (max-width: 40rem)");
assert.match(media40Match[0], /\.datasets-two-col\s*\{\s*grid-template-columns:\s*1fr;/);
assert.match(media40Match[0], /\.dataset-meta-list\s*>\s*div\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
assert.match(media40Match[0], /\.dataset-chart__toolbar\s*\{[^}]*flex-direction:\s*column/);

const media30Match = globalsCss.match(/@media\s*\(max-width:\s*30rem\)\s*\{[\s\S]*?\n\}/);
assert.ok(media30Match, "globals.css must define @media (max-width: 30rem)");
assert.match(media30Match[0], /\.dataset-tab\s*\{\s*flex:\s*1 1 100%;/);
assert.match(media30Match[0], /\.dataset-pagination__actions\s*\{\s*width:\s*100%;/);

console.log("Dataset Explorer contract, break-ui, and accessibility tests passed.");
