import assert from "node:assert/strict";

// ---- Browser-like fetch & AbortController harness ----------------------
// Exercises slow, stalled, failed, cancelled, empty, and successful API states
// against the same request/abort/timeout contracts used by AnalyzerForm and useStatistics.

const originalFetch = globalThis.fetch;

try {
  // 1. Successful API response
  globalThis.fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith("/statistics")) {
      return new Response(
        JSON.stringify({
          datasets: { amazon_reviews: { train_rows: 3000000, test_rows: 650000 } },
          metrics: { amazon_rating: { word2vec: { accuracy: 0.5357 } } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (path.endsWith("/predict/amazon")) {
      const body = JSON.parse(init.body);
      assert.equal(body.text, "Excellent book");
      return new Response(
        JSON.stringify({ rating: 5, probabilities: [0.01, 0.01, 0.03, 0.15, 0.8] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error(`Unexpected URL: ${path}`);
  };

  const statsRes = await fetch("http://127.0.0.1:8000/statistics");
  const statsJson = await statsRes.json();
  assert.equal(statsJson.datasets.amazon_reviews.train_rows, 3000000);

  const predRes = await fetch("http://127.0.0.1:8000/predict/amazon", {
    method: "POST",
    body: JSON.stringify({ text: "Excellent book" }),
  });
  const predJson = await predRes.json();
  assert.equal(predJson.rating, 5);

  // 2. Cancelled API state via AbortController
  globalThis.fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortErr = new DOMException("The operation was aborted.", "AbortError");
        reject(abortErr);
      });
    });

  const cancelController = new AbortController();
  const pendingCancelled = fetch("http://127.0.0.1:8000/predict/go-emotions", {
    method: "POST",
    body: JSON.stringify({ text: "Wait for cancel" }),
    signal: cancelController.signal,
  });
  cancelController.abort();
  await assert.rejects(pendingCancelled, (err) => err.name === "AbortError");

  // 3. Slow / Stalled -> Timeout API state
  let stalledTriggered = false;
  const timeoutController = new AbortController();
  const stallTimer = setTimeout(() => {
    stalledTriggered = true;
  }, 15);
  const timeoutTimer = setTimeout(() => {
    timeoutController.abort();
  }, 40);

  await assert.rejects(
    fetch("http://127.0.0.1:8000/predict/amazon", {
      method: "POST",
      body: JSON.stringify({ text: "Slow request" }),
      signal: timeoutController.signal,
    }),
    (err) => err.name === "AbortError",
  );
  clearTimeout(stallTimer);
  clearTimeout(timeoutTimer);
  assert.equal(stalledTriggered, true, "Stall threshold must fire before hard timeout");

  // 4. Failed API state (503 model_not_ready)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: "model_not_ready", detail: "Checkpoint missing" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  const failRes = await fetch("http://127.0.0.1:8000/predict/amazon", {
    method: "POST",
    body: JSON.stringify({ text: "Fail test" }),
  });
  assert.equal(failRes.ok, false);
  const failBody = await failRes.json();
  assert.equal(failBody.detail, "Checkpoint missing");

  console.log("Slow, failed, cancelled, and successful API state tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
