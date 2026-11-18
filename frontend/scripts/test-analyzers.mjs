import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  API_BASE_URL,
  ApiError,
  classifyApiError,
  isAbortError,
  isNetworkError,
  predictAmazon,
  predictEmotions,
} from "../lib/api.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

// ---- 1. Runtime tests for lib/api.ts analyzer & error contracts ----------
const originalFetch = globalThis.fetch;

try {
  // 1a. Successful Amazon rating prediction preserves raw probabilities & rating
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${API_BASE_URL}/predict/amazon`);
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), { text: "Solid battery life." });
    return new Response(
      JSON.stringify({
        rating: 4,
        probabilities: [0.02, 0.04, 0.14, 0.52, 0.281],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const amazonRes = await predictAmazon("Solid battery life.");
  assert.equal(amazonRes.rating, 4);
  assert.deepEqual(amazonRes.probabilities, [0.02, 0.04, 0.14, 0.52, 0.281]);

  // 1b. Successful GoEmotions prediction (multi-label + subset probabilities)
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${API_BASE_URL}/predict/go-emotions`);
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { text: "Thank you for the clear walkthrough!" });
    return new Response(
      JSON.stringify({
        emotions: [
          { label: "admiration", probability: 0.42 },
          { label: "gratitude", probability: 0.89 },
        ],
        probabilities: {
          gratitude: 0.89,
          admiration: 0.42,
          approval: 0.21,
          neutral: 0.05,
        },
        threshold: 0.3,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const emotionsRes = await predictEmotions("Thank you for the clear walkthrough!");
  assert.equal(emotionsRes.threshold, 0.3);
  assert.equal(emotionsRes.emotions.length, 2);
  assert.equal(Object.keys(emotionsRes.probabilities).length, 4);

  // 1c. Empty GoEmotions result (zero labels crossing threshold)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        emotions: [],
        probabilities: { neutral: 0.24, curiosity: 0.18 },
        threshold: 0.3,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const emptyEmotionsRes = await predictEmotions("Tuesday meeting moved to Wednesday.");
  assert.deepEqual(emptyEmotionsRes.emotions, []);
  assert.deepEqual(emptyEmotionsRes.probabilities, { neutral: 0.24, curiosity: 0.18 });

  // 1d. HTTP API error -> ApiError + classifyApiError("api_error")
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: "model_not_ready", detail: "Amazon checkpoint missing" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(
    predictAmazon("Will fail with 503"),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.ok(err instanceof Error);
      assert.equal(err.status, 503);
      assert.equal(err.detail, "Amazon checkpoint missing");
      assert.equal(err.errorCode, "model_not_ready");

      const classified = classifyApiError(err);
      assert.deepEqual(classified, {
        kind: "api_error",
        message: "Amazon checkpoint missing",
        status: 503,
        detail: "Amazon checkpoint missing",
        errorCode: "model_not_ready",
      });
      return true;
    },
  );

  // 1e. HTTP error with non-JSON body still yields structured ApiError
  globalThis.fetch = async () => new Response("Bad Gateway", { status: 502 });
  await assert.rejects(
    predictEmotions("Bad gateway test"),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 502);
      assert.equal(err.detail, null);
      const classified = classifyApiError(err);
      assert.equal(classified.kind, "api_error");
      assert.equal(classified.status, 502);
      assert.match(classified.message, /502/);
      return true;
    },
  );

  // 1f. Offline / network TypeError -> classifyApiError("offline")
  const networkFailure = new TypeError("Failed to fetch");
  globalThis.fetch = async () => {
    throw networkFailure;
  };

  await assert.rejects(predictAmazon("Offline check"), (err) => {
    assert.equal(isNetworkError(err), true);
    const classified = classifyApiError(err);
    assert.equal(classified.kind, "offline");
    assert.ok(classified.message.includes(API_BASE_URL));
    return true;
  });

  // 1g. AbortController cancellation vs timeout classification
  globalThis.fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });

  const cancelController = new AbortController();
  const pendingCancel = predictEmotions("Cancel me", { signal: cancelController.signal });
  cancelController.abort();

  await assert.rejects(pendingCancel, (err) => {
    assert.equal(isAbortError(err), true);
    assert.deepEqual(classifyApiError(err), {
      kind: "cancelled",
      message: "Analysis cancelled.",
    });
    assert.deepEqual(classifyApiError(err, { timedOut: true, timeoutMs: 30_000 }), {
      kind: "timeout",
      message:
        "Analysis timed out after 30 seconds. Check that the backend model is loaded and try again.",
    });
    return true;
  });
} finally {
  globalThis.fetch = originalFetch;
}

// ---- 2. AnalyzerForm, pages, and stylesheet contract assertions -----------
const analyzerForm = await read("../components/AnalyzerForm.tsx");
const apiFile = await read("../lib/api.ts");
const sentimentPage = await read("../pages/analyze/sentiment.tsx");
const emotionsPage = await read("../pages/analyze/emotions.tsx");
const globalsCss = await read("../styles/globals.css");

// 2a. AnalyzerForm workspace controls & validation
assert.match(analyzerForm, /export type SamplePrompt =/);
assert.match(analyzerForm, /export type AnalysisRenderContext =/);
assert.match(analyzerForm, /export type AnalysisRequestPhase =/);
assert.match(analyzerForm, /<label htmlFor="analysis-text">\{inputLabel\}<\/label>/);
assert.match(analyzerForm, /id="analysis-text"/);
assert.match(analyzerForm, /maxLength=\{MAX_INPUT_CHARS\}/);
assert.match(analyzerForm, /id="analysis-count"/);
assert.match(analyzerForm, /onClick=\{handleClear\}/);
assert.match(analyzerForm, />[\s\n]*Clear[\s\n]*<\/Button>/);
assert.match(analyzerForm, /className="sample-chip"/);
assert.match(analyzerForm, /onClick=\{\(\) => handleSelectSample\(sample\.text\)\}/);
assert.doesNotMatch(
  analyzerForm.match(/function handleSelectSample[\s\S]*?\n  \}/)?.[0] ?? "",
  /runAnalysis|onSubmit/,
  "Sample chips must fill draft without auto-submitting",
);

// 2b. Duplicate submit guard, empty/whitespace validation, timeout, abort, retry, text preservation
assert.match(analyzerForm, /if \(inFlightRef\.current\) return;/);
assert.match(analyzerForm, /const trimmed = rawInput\.trim\(\);/);
assert.match(analyzerForm, /setPhase\("validation_error"\)/);
assert.match(analyzerForm, /ANALYSIS_TIMEOUT_MS = 30_000/);
assert.match(analyzerForm, /new AbortController\(\)/);
assert.match(analyzerForm, /onCancel=\{cancelAnalysis\}/);
assert.match(analyzerForm, /Retry analysis/);
assert.match(analyzerForm, /data-phase=\{phase\}/);
assert.match(analyzerForm, /data-state=\{phase\}/);

for (const phase of [
  "idle",
  "pending",
  "stalled",
  "validation_error",
  "offline",
  "timeout",
  "api_error",
  "cancelled",
  "success",
]) {
  assert.match(
    analyzerForm,
    new RegExp(`"${phase}"`),
    `AnalyzerForm must define phase "${phase}"`,
  );
}

// Clear must reset draft + validation error, while error/cancel paths preserve user text
assert.match(analyzerForm, /function handleClear\(\)[\s\S]*?setText\(""\)/);
const runAnalysisBody = analyzerForm.match(/const runAnalysis = useCallback\([\s\S]*?\[onSubmit\],/)?.[0] ?? "";
assert.doesNotMatch(
  runAnalysisBody,
  /setText\(""\)/,
  "runAnalysis must preserve user text on failure, timeout, or cancel",
);

// 2c. Submitted text context & stale indicator
assert.match(analyzerForm, /const isStale = Boolean\(result !== null && submittedText && text\.trim\(\) !== submittedText\)/);
assert.match(analyzerForm, /setSubmittedText\(trimmed\)/);
assert.match(analyzerForm, /data-stale=\{isStale \? "true" : "false"\}/);
assert.match(analyzerForm, /renderResult\(result, \{ submittedText, isStale \}\)/);

// 2d. Zero console logging or storage persistence of user input text
for (const [name, source] of [
  ["AnalyzerForm.tsx", analyzerForm],
  ["lib/api.ts", apiFile],
  ["sentiment.tsx", sentimentPage],
  ["emotions.tsx", emotionsPage],
]) {
  assert.doesNotMatch(source, /\bconsole\.(log|info|debug|warn|error)\b/, `${name} must not log to console`);
  assert.doesNotMatch(
    source,
    /\b(localStorage|sessionStorage|writeStored|readStored)\b/,
    `${name} must not persist user text to browser storage`,
  );
}

// 2e. Sentiment Analyzer page contract
assert.match(sentimentPage, /index="NLP-02 \/ SENTIMENT"/);
assert.match(sentimentPage, /loadingLabel="Analyzing review…"/);
assert.match(sentimentPage, /onSubmit=\{predictAmazon\}/);
assert.match(sentimentPage, /samples=\{SENTIMENT_SAMPLES\}/);
assert.match(sentimentPage, /context\?\.submittedText/);
assert.match(sentimentPage, /context\.isStale/);
assert.match(sentimentPage, /\{result\.rating\} \/ 5/);
assert.match(sentimentPage, /not an objective\s+measure of emotional state/);
assert.match(sentimentPage, /STAR_CLASS_INDICES = \[0, 1, 2, 3, 4\]/);
assert.match(sentimentPage, /<Meter/);
assert.match(sentimentPage, /\$\{\(value \* 100\)\.toFixed\(1\)\}%/);
assert.match(sentimentPage, /probabilitySum/);
assert.match(sentimentPage, /Word2Vec \+ BiLSTM softmax head/);

// 2f. Emotion Analyzer page contract
assert.match(emotionsPage, /index="NLP-03 \/ EMOTIONS"/);
assert.match(emotionsPage, /loadingLabel="Detecting emotions…"/);
assert.match(emotionsPage, /onSubmit=\{predictEmotions\}/);
assert.match(emotionsPage, /samples=\{SAMPLE_PROMPTS\}/);
assert.match(emotionsPage, /context\?\.submittedText/);
assert.match(emotionsPage, /context\.isStale/);
assert.match(emotionsPage, /formatThreshold\(result\.threshold\)/);
assert.match(emotionsPage, /\[\.\.\.result\.emotions\]\.sort/);
assert.match(emotionsPage, /Object\.entries\(result\.probabilities \?\? \{\}\)\.sort/);
assert.match(emotionsPage, /No labels crossed the saved threshold/);
assert.match(emotionsPage, /<Callout tone="info"/);
assert.match(emotionsPage, /emotion-row--selected/);
assert.match(emotionsPage, /emotion-threshold-divider/);
assert.match(emotionsPage, /emotion-row--below/);
assert.match(emotionsPage, /not definitive psychological facts/);
assert.doesNotMatch(emotionsPage, /"admiration".*"neutral"/s, "emotions.tsx must not fabricate missing 28 keys");

// 2g. Stylesheet analyzer workspace classes & reduced-motion support
for (const selector of [
  ".sample-prompts",
  ".sample-chip-row",
  ".sample-chip",
  ".analyzer-actions",
  ".result-card",
  "@keyframes result-card-enter",
  ".result-context",
  ".stale-indicator",
  ".sentiment-summary",
  ".result-note",
  ".emotion-summary",
  ".emotion-row--selected",
  ".emotion-row--below",
  ".emotion-threshold-divider",
]) {
  assert.ok(globalsCss.includes(selector), `globals.css must define ${selector}`);
}
assert.match(globalsCss, /\.result-card\s*\{\s*animation:\s*none;/);

console.log("Analyzer workspace and error-state contract tests passed.");
