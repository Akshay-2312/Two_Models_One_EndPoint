import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  API_BASE_URL,
  ApiError,
  classifyApiError,
  getModelLab,
  isNetworkError,
} from "../lib/api.ts";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const committedArtifactsRaw = await read("../../data/model_lab_artifacts.json");
const committedArtifacts = JSON.parse(committedArtifactsRaw);

const sampleModelLabFixture = {
  ...committedArtifacts,
  tracks: {
    amazon_rating: {
      ...committedArtifacts.tracks.amazon_rating,
      artifact_files: committedArtifacts.tracks.amazon_rating.artifact_files.map(
        (path, index) => ({
          path,
          exists: index % 2 === 0,
          size_bytes: index % 2 === 0 ? 1024 * (index + 1) : null,
        }),
      ),
      readiness: { ready: true, error: null },
    },
    go_emotions: {
      ...committedArtifacts.tracks.go_emotions,
      artifact_files: committedArtifacts.tracks.go_emotions.artifact_files.map(
        (path) => ({
          path,
          exists: true,
          size_bytes: 2048,
        }),
      ),
      readiness: { ready: true, error: null },
    },
  },
};

// ---- 1. Runtime fetch contract tests for getModelLab ----
const originalFetch = globalThis.fetch;

try {
  // 1a. Success payload (tracks.amazon_rating, tracks.go_emotions, comparison, readiness)
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${API_BASE_URL}/models/lab`);
    assert.equal(new Headers(init?.headers).has("Content-Type"), false);
    return new Response(JSON.stringify(sampleModelLabFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const modelLab = await getModelLab();
  assert.ok(modelLab.tracks.amazon_rating);
  assert.ok(modelLab.tracks.go_emotions);
  assert.ok(Array.isArray(modelLab.comparison));
  assert.equal(modelLab.comparison.length, 8);
  assert.equal(modelLab.tracks.amazon_rating.pipeline_steps.length, 11);
  assert.equal(modelLab.tracks.go_emotions.pipeline_steps.length, 10);
  assert.equal(modelLab.tracks.amazon_rating.readiness.ready, true);
  assert.equal(modelLab.tracks.amazon_rating.readiness.error, null);
  assert.equal(modelLab.tracks.go_emotions.readiness.ready, true);
  assert.equal(modelLab.tracks.go_emotions.readiness.error, null);
  assert.equal(
    modelLab.tracks.amazon_rating.hyperparameters.classifier.total_parameters,
    16734869,
  );
  assert.equal(
    modelLab.tracks.go_emotions.threshold_sweep.optimal_threshold.toFixed(2),
    "0.30",
  );

  // 1b. Unavailable: 503 model_lab_unavailable & TypeError network failure
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "model_lab_unavailable",
        detail: "Committed Model Lab artifacts JSON is missing.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getModelLab(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 503);
    assert.equal(err.errorCode, "model_lab_unavailable");
    assert.equal(err.detail, "Committed Model Lab artifacts JSON is missing.");
    return true;
  });

  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(getModelLab(), (err) => {
    assert.equal(isNetworkError(err), true);
    assert.equal(classifyApiError(err).kind, "offline");
    return true;
  });

  // 1c. Failed: 500 server error (JSON and plain text)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ detail: "Corrupt model lab artifacts payload" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getModelLab(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, "Corrupt model lab artifacts payload");
    assert.equal(classifyApiError(err).kind, "api_error");
    return true;
  });

  globalThis.fetch = async () =>
    new Response("Internal Server Error", { status: 500 });

  await assert.rejects(getModelLab(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, null);
    return true;
  });

  // 1d. Empty tracks (tracks missing / empty)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        provenance: "Repository audit artifacts",
        run_timestamp_note: "Not available",
        comparison: [],
        tracks: {},
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const emptyTracks = await getModelLab();
  assert.deepEqual(emptyTracks.tracks, {});

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        provenance: "Repository audit artifacts",
        run_timestamp_note: "Not available",
        comparison: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const missingTracks = await getModelLab();
  assert.equal(missingTracks.tracks, undefined);
} finally {
  globalThis.fetch = originalFetch;
}

// ---- 2. Structural & animation-review contract assertions ----
const pipelineTrackSource = await read("../components/PipelineTrack.tsx");
const modelEvalPanelSource = await read("../components/ModelEvaluationPanel.tsx");
const modelLabPageSource = await read("../pages/model-lab.tsx");
const useModelLabSource = await read("../lib/useModelLab.ts");
const apiFileSource = await read("../lib/api.ts");
const globalsCss = await read("../styles/globals.css");

// 2a. Zero /content/drive paths leaked anywhere
for (const [label, source] of [
  ["data/model_lab_artifacts.json", committedArtifactsRaw],
  ["components/PipelineTrack.tsx", pipelineTrackSource],
  ["components/ModelEvaluationPanel.tsx", modelEvalPanelSource],
  ["pages/model-lab.tsx", modelLabPageSource],
  ["lib/useModelLab.ts", useModelLabSource],
  ["lib/api.ts", apiFileSource],
  ["styles/globals.css", globalsCss],
]) {
  assert.doesNotMatch(
    source,
    /\/content\/drive/i,
    `${label} must not contain /content/drive paths`,
  );
}

// 2b. Both tracks stay independent with exact step counts (11 vs 10)
const amazonArtifact = committedArtifacts.tracks.amazon_rating;
const goEmotionsArtifact = committedArtifacts.tracks.go_emotions;

assert.ok(amazonArtifact, "amazon_rating track must exist");
assert.ok(goEmotionsArtifact, "go_emotions track must exist");
assert.equal(amazonArtifact.pipeline_steps.length, 11);
assert.equal(goEmotionsArtifact.pipeline_steps.length, 10);
assert.equal(
  amazonArtifact.pipeline_steps.find((step) => step.order === 2)?.status,
  "not_available",
);
assert.match(modelLabPageSource, /id="track-amazon"/);
assert.match(modelLabPageSource, /id="track-goemotions"/);
assert.match(modelLabPageSource, /id="model-comparison"/);
assert.match(modelLabPageSource, /<PipelineTrack[\s\S]*trackId=\{amazonTrack\.id\}/);
assert.match(modelLabPageSource, /<PipelineTrack[\s\S]*trackId=\{goEmotionsTrack\.id\}/);
assert.match(modelLabPageSource, /<ModelEvaluationPanel kind="amazon_rating" track=\{amazonTrack\}/);
assert.match(modelLabPageSource, /<ModelEvaluationPanel[\s\S]*kind="go_emotions"[\s\S]*track=\{goEmotionsTrack\}/);

// 2c. PipelineTrack status support, GSAP ScrollTrigger, reduced-motion, keyboard nav, zero scale(0) or ease-in
for (const status of [
  "completed",
  "not_available",
  "planned",
  "skipped",
  "failed",
  "unknown",
]) {
  assert.match(
    pipelineTrackSource,
    new RegExp(`\\b${status}\\s*:`),
    `PipelineTrack.tsx must handle status "${status}"`,
  );
  assert.match(
    apiFileSource,
    new RegExp(`"${status}"`),
    `api.ts PipelineStepStatus must include "${status}"`,
  );
}

assert.match(pipelineTrackSource, /useGSAP\(/);
assert.match(pipelineTrackSource, /scope:\s*containerRef/);
assert.match(pipelineTrackSource, /revertOnUpdate:\s*true/);
assert.match(pipelineTrackSource, /ScrollTrigger/);
assert.match(pipelineTrackSource, /useReducedMotion\(\)/);
assert.match(pipelineTrackSource, /event\.key === "ArrowRight"/);
assert.match(pipelineTrackSource, /event\.key === "ArrowLeft"/);
assert.match(pipelineTrackSource, /event\.key === "Home"/);
assert.match(pipelineTrackSource, /event\.key === "End"/);
assert.match(pipelineTrackSource, /aria-current=\{isSelected \? "step" : undefined\}/);

assert.match(modelLabPageSource, /useGSAP\(/);
assert.match(modelLabPageSource, /scope:\s*heroRef/);
assert.match(modelLabPageSource, /revertOnUpdate:\s*true/);
assert.match(modelLabPageSource, /ScrollTrigger/);
assert.match(modelLabPageSource, /useReducedMotion\(\)/);

for (const [label, source] of [
  ["components/PipelineTrack.tsx", pipelineTrackSource],
  ["components/ModelEvaluationPanel.tsx", modelEvalPanelSource],
  ["pages/model-lab.tsx", modelLabPageSource],
  ["styles/globals.css", globalsCss],
]) {
  assert.doesNotMatch(
    source,
    /scale\(\s*0\s*\)|scale:\s*0(?![.\d])/,
    `${label} must not animate from scale(0)`,
  );
  assert.doesNotMatch(
    source,
    /(?:^|[\s:,(])ease-in(?!-out)\b|power\d*\.in\b/,
    `${label} must not use ease-in for UI transitions`,
  );
}

// 2d. Hyperparameters, epoch history, confusion matrix, 28-label report, ONNX parity, and Not available timestamp note
assert.equal(amazonArtifact.hyperparameters.classifier.total_parameters, 16734869);
assert.equal(goEmotionsArtifact.hyperparameters.total_parameters, 66975004);
assert.equal(amazonArtifact.epochs.word2vec.length, 3);
assert.equal(amazonArtifact.epochs.baseline.length, 3);
assert.equal(goEmotionsArtifact.epochs.items.length, 3);
assert.equal(goEmotionsArtifact.epochs.history_json_exported, false);
assert.equal(amazonArtifact.confusion_matrix.labels.length, 5);
assert.equal(amazonArtifact.confusion_matrix.matrix.length, 5);
for (const row of amazonArtifact.confusion_matrix.matrix) {
  assert.equal(row.length, 5);
}
const goLabelKeys = Object.keys(goEmotionsArtifact.per_label_report).filter(
  (key) => !["micro avg", "macro avg", "weighted avg", "samples avg"].includes(key),
);
assert.equal(goLabelKeys.length, 28);
assert.equal(amazonArtifact.onnx_parity.within_tolerance, true);
assert.equal(goEmotionsArtifact.onnx_parity.within_tolerance, true);
assert.equal(amazonArtifact.run_timestamp, null);
assert.equal(goEmotionsArtifact.run_timestamp, null);
assert.match(amazonArtifact.run_timestamp_note, /not serialized/i);
assert.match(goEmotionsArtifact.run_timestamp_note, /not serialized/i);

assert.match(modelEvalPanelSource, /Verified hyperparameters/);
assert.match(modelEvalPanelSource, /Training epochs \(Word2Vec vs baseline\)/);
assert.match(modelEvalPanelSource, /Fine-tuning epochs \(NB02 Cell 6\)/);
assert.match(modelEvalPanelSource, /5×5 confusion matrix & per-class report/);
assert.match(modelEvalPanelSource, /28-label classification report/);
assert.match(modelEvalPanelSource, /id=\{`label-sort-\$\{track\.id\}`\}/);
assert.match(modelEvalPanelSource, /"support-asc"/);
assert.match(modelEvalPanelSource, /precision-desc/);
assert.match(modelEvalPanelSource, /recall-desc/);
assert.match(modelEvalPanelSource, /aria-sort=\{ariaSort\}/);
assert.match(modelEvalPanelSource, /dataset-table__sort/);
assert.match(modelEvalPanelSource, /ONNX numerical parity/);
assert.match(modelEvalPanelSource, /Not available in supplied metric JSONs/);
assert.match(modelEvalPanelSource, /Missing on disk/);

// 2e. Hook phase states, AbortController, and loading/error/empty page states
for (const phase of ["loading", "stalled", "unavailable", "failed", "empty", "ready"]) {
  assert.match(
    useModelLabSource,
    new RegExp(`"${phase}"`),
    `useModelLab.ts must define phase "${phase}"`,
  );
}
assert.match(useModelLabSource, /new AbortController\(\)/);
assert.match(useModelLabSource, /requestError\.status === 503/);
assert.match(useModelLabSource, /"model_lab_unavailable"/);
assert.match(useModelLabSource, /requestError instanceof TypeError/);

assert.match(modelLabPageSource, /<StatisticsLoader/);
assert.match(modelLabPageSource, /phase === "loading" \|\| phase === "stalled"/);
assert.match(modelLabPageSource, /phase === "unavailable"[\s\S]*?tone="warning"/);
assert.match(modelLabPageSource, /phase === "failed"[\s\S]*?tone="danger"/);
assert.match(modelLabPageSource, /phase === "empty"[\s\S]*?tone="info"/);
assert.match(modelLabPageSource, /onClick=\{refresh\}/);

for (const [name, source] of [
  ["pages/model-lab.tsx", modelLabPageSource],
  ["components/PipelineTrack.tsx", pipelineTrackSource],
  ["components/ModelEvaluationPanel.tsx", modelEvalPanelSource],
  ["lib/useModelLab.ts", useModelLabSource],
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

// 2f. Responsive & reduced-motion CSS guards in globals.css
assert.match(globalsCss, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);
assert.match(globalsCss, /@media\s*\(max-width:\s*40rem\)\s*\{[\s\S]*?\.pipeline-nodes\s*\{\s*grid-template-columns:\s*1fr;/);
assert.match(globalsCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pipeline-node\s*\{\s*opacity:\s*1\s*!important;\s*transform:\s*none\s*!important;\s*\}/);
assert.match(globalsCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.pipeline-edge__path\s*\{\s*stroke-dashoffset:\s*0\s*!important;\s*\}/);

console.log("Model Lab contract, pipeline, and animation-review tests passed.");
