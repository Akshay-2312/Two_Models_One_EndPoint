import fs from "node:fs";
import path from "node:path";
import { chromium } from "file:///C:/Users/aksha/.gemini/config/skills/auto-qa/node_modules/playwright/index.mjs";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR =
  "C:/Users/aksha/.gemini/antigravity/brain/4c775dc3-76d8-4b42-a802-ca48e3deb1d8/qa_screenshots";

const CHROME_CANDIDATES = [
  "C:\\Users\\aksha\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1254\\chrome-headless-shell-win64\\chrome-headless-shell.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function resolveExecutablePath() {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `No Chromium executable found at expected paths:\n${CHROME_CANDIDATES.join("\n")}`,
  );
}

const results = {
  baseUrl: BASE_URL,
  executablePath: "",
  screenshotDir: SCREENSHOT_DIR,
  assertions: [],
  screenshots: [],
  consoleErrors: [],
  pageErrors: [],
};

function record(name, passed, details = "") {
  results.assertions.push({ name, passed: Boolean(passed), details });
  if (!passed) {
    throw new Error(`Assertion failed [${name}]: ${details}`);
  }
}

function attachErrorListeners(page, label, { isExpectedConsoleError } = {}) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (isExpectedConsoleError?.(text)) {
        return;
      }
      results.consoleErrors.push({
        context: label,
        url: page.url(),
        text,
      });
    }
  });
  page.on("pageerror", (err) => {
    results.pageErrors.push({
      context: label,
      url: page.url(),
      message: err?.message || String(err),
    });
  });
}

async function saveScreenshot(page, filename) {
  const fullPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  results.screenshots.push(fullPath);
  return fullPath;
}

async function dismissPreloaderIfPresent(page, { requireVisible = false } = {}) {
  const preloader = page.locator(".entry-preloader-shell");
  if (requireVisible) {
    await preloader.waitFor({ state: "visible", timeout: 8000 });
  }
  const visible = await preloader.isVisible().catch(() => false);
  if (visible) {
    const skipButton = page.locator("button.entry-preloader-skip");
    await skipButton.waitFor({ state: "visible", timeout: 5000 });
    await skipButton.click();
    await preloader.waitFor({ state: "detached", timeout: 8000 });
  }
  return visible;
}

async function waitForRouteTransitionIdle(page) {
  const transition = page.locator(".route-transition");
  if ((await transition.count()) > 0) {
    const pointerEvents = await transition.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    record(
      `route-transition pointer-events (${page.url()})`,
      pointerEvents === "none",
      `computed pointer-events=${pointerEvents}`,
    );
    await page
      .locator('.route-transition[data-phase="idle"]')
      .waitFor({ state: "attached", timeout: 8000 });
  }
}

async function checkNoHorizontalOverflow(page, routeLabel) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  record(
    `mobile no horizontal overflow (${routeLabel})`,
    metrics.scrollWidth <= metrics.innerWidth,
    `scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth}`,
  );
}

async function runDesktopPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  let expectingNotFound404 = false;
  attachErrorListeners(page, "desktop", {
    isExpectedConsoleError: (text) =>
      expectingNotFound404 &&
      /^Failed to load resource: the server responded with a status of 404\b/.test(
        text,
      ),
  });

  try {
    // a) Dashboard `/`
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const sawPreloader = await dismissPreloaderIfPresent(page, {
      requireVisible: true,
    });
    record(
      "desktop / EntryPreloader renders & Skip dismisses cleanly",
      sawPreloader && (await page.locator(".entry-preloader-shell").count()) === 0,
      "EntryPreloader appeared on fresh session and detached after clicking Skip",
    );

    await page.getByText("Both models ready").waitFor({
      state: "visible",
      timeout: 30000,
    });
    const readyCount = await page.locator('.status-list li[data-ready="true"]').count();
    record(
      "desktop / readiness reports Both models ready",
      readyCount === 2,
      `ready models count=${readyCount}`,
    );

    // Trigger ScrollReveal blocks into view before screenshot if needed
    await page.waitForTimeout(350);
    await page.waitForTimeout(900);
    await saveScreenshot(page, "01-dashboard-desktop.png");

    // b) Circle Reveal navigation to `/analyze/sentiment`
    await page.locator('#primary-nav a[href="/analyze/sentiment"]').click();
    await page.waitForURL("**/analyze/sentiment", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    // c) `/analyze/sentiment`
    const submitSentimentBtn = page.getByRole("button", {
      name: "Analyze sentiment",
    });
    await submitSentimentBtn.click();
    const emptySentimentAlert = page.locator('#analysis-validation-error[role="alert"]');
    await emptySentimentAlert.waitFor({ state: "visible", timeout: 5000 });
    const emptyAlertText = await emptySentimentAlert.textContent();
    record(
      "desktop /analyze/sentiment empty validation shows Input required",
      Boolean(emptyAlertText?.includes("Input required")),
      `alert="${emptyAlertText?.trim()}"`,
    );

    const positiveChip = page.getByRole("button", { name: "5-star positive" });
    await positiveChip.click();
    const sentimentTextarea = page.locator("#analysis-text");
    const filledSample = await sentimentTextarea.inputValue();
    const phaseAfterChip = await page
      .locator(".page-section")
      .getAttribute("data-phase");
    const resultCountAfterChip = await page.locator(".result-card").count();
    record(
      "desktop /analyze/sentiment sample chip populates textarea without auto-submit",
      filledSample.length > 20 &&
        phaseAfterChip === "idle" &&
        resultCountAfterChip === 0,
      `chars=${filledSample.length}, phase=${phaseAfterChip}, results=${resultCountAfterChip}`,
    );

    const loadingPromise = page
      .getByText("Analyzing review…")
      .first()
      .waitFor({ state: "visible", timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    await submitSentimentBtn.click();
    const sawLoadingLabel = await loadingPromise;

    const sentimentResult = page.locator(".result-card");
    await sentimentResult.waitFor({ state: "visible", timeout: 30000 });
    await sentimentResult.getByText("Analyzed review").waitFor({
      state: "visible",
      timeout: 5000,
    });
    const predictionText = (
      await sentimentResult.locator(".prediction").textContent()
    )?.trim();
    const meterCount = await sentimentResult.locator("progress").count();
    const starLabelsPresent = await Promise.all(
      ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"].map((label) =>
        sentimentResult.getByText(label, { exact: true }).isVisible(),
      ),
    );
    const hasSumNote = await sentimentResult
      .getByText("Class probabilities sum to")
      .isVisible();

    record(
      "desktop /analyze/sentiment live prediction renders rating, 5 meters & sum note",
      Boolean(predictionText && /^[1-5]\s*\/\s*5$/.test(predictionText)) &&
        meterCount === 5 &&
        starLabelsPresent.every(Boolean) &&
        hasSumNote,
      `prediction=${predictionText}, meters=${meterCount}, sawLoading=${sawLoadingLabel}, hasSumNote=${hasSumNote}`,
    );
    await saveScreenshot(page, "02-sentiment-desktop.png");

    // Edit textarea -> verify stale badge appears
    await sentimentTextarea.fill(`${filledSample}!`);
    const staleBadge = page.locator(".result-card .stale-indicator");
    await staleBadge.waitFor({ state: "visible", timeout: 5000 });
    const staleText = (await staleBadge.textContent())?.trim();
    record(
      "desktop /analyze/sentiment editing draft shows Draft edited since run",
      staleText === "Draft edited since run",
      `staleBadge="${staleText}"`,
    );

    // Click Clear -> verify textarea clears cleanly
    await page.getByRole("button", { name: "Clear" }).click();
    const clearedSentimentVal = await sentimentTextarea.inputValue();
    record(
      "desktop /analyze/sentiment Clear empties textarea",
      clearedSentimentVal === "",
      `valueLength=${clearedSentimentVal.length}`,
    );

    // d) `/analyze/emotions`
    await page.locator('#primary-nav a[href="/analyze/emotions"]').click();
    await page.waitForURL("**/analyze/emotions", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    await page.getByRole("button", { name: "Admiration / gratitude" }).click();
    const submitEmotionsBtn = page.getByRole("button", {
      name: "Analyze emotions",
    });
    await submitEmotionsBtn.click();

    const emotionsResult = page.locator(".result-card");
    await emotionsResult.waitFor({ state: "visible", timeout: 30000 });
    await emotionsResult
      .getByText("Selected multi-label detections")
      .waitFor({ state: "visible", timeout: 5000 });

    const detectedBadgeCount = await emotionsResult
      .locator('[aria-label="Detected emotion labels"] .badge')
      .count();
    const hasThreshold = await emotionsResult
      .getByText("Active threshold: 0.30")
      .isVisible();
    const hasAllScoresHeading = await emotionsResult
      .getByText("All returned label scores")
      .isVisible();
    const hasBelowThreshold = await emotionsResult
      .getByText("Below threshold", { exact: false })
      .isVisible();
    const hasDisclaimer = await emotionsResult
      .getByText("Research tool notice:", { exact: false })
      .isVisible();

    record(
      "desktop /analyze/emotions Admiration/gratitude renders badges, threshold 0.30, all scores, below threshold & disclaimer",
      detectedBadgeCount >= 1 &&
        hasThreshold &&
        hasAllScoresHeading &&
        hasBelowThreshold &&
        hasDisclaimer,
      `badges=${detectedBadgeCount}, threshold030=${hasThreshold}, allScores=${hasAllScoresHeading}, belowThreshold=${hasBelowThreshold}, disclaimer=${hasDisclaimer}`,
    );
    await saveScreenshot(page, "03-emotions-desktop.png");

    // Neutral / dry sample test
    await page.getByRole("button", { name: "Neutral / dry" }).click();
    await submitEmotionsBtn.click();
    await emotionsResult
      .locator(".result-context__text")
      .getByText("weekly review", { exact: false })
      .waitFor({ state: "visible", timeout: 30000 });
    const neutralCalloutVisible = await emotionsResult
      .getByText("No labels crossed the saved threshold")
      .isVisible()
      .catch(() => false);
    const neutralBadgeCount = await emotionsResult
      .locator('[aria-label="Detected emotion labels"] .badge')
      .count();
    record(
      "desktop /analyze/emotions Neutral/dry settles with valid threshold state",
      neutralCalloutVisible || neutralBadgeCount >= 1,
      `neutralZeroCrossCallout=${neutralCalloutVisible}, detectedBadges=${neutralBadgeCount}`,
    );

    // Clear + empty validation on emotions
    await page.getByRole("button", { name: "Clear" }).click();
    const emotionsTextarea = page.locator("#analysis-text");
    const clearedEmotionsVal = await emotionsTextarea.inputValue();
    await submitEmotionsBtn.click();
    const emptyEmotionsAlert = page.locator('#analysis-validation-error[role="alert"]');
    await emptyEmotionsAlert.waitFor({ state: "visible", timeout: 5000 });
    const emptyEmotionsText = await emptyEmotionsAlert.textContent();
    record(
      "desktop /analyze/emotions Clear + empty validation shows Input required",
      clearedEmotionsVal === "" &&
        Boolean(emptyEmotionsText?.includes("Input required")),
      `cleared=${clearedEmotionsVal === ""}, alert="${emptyEmotionsText?.trim()}"`,
    );

    // e) `/model-lab`, `/datasets`, `/documentation`
    await page.locator('#primary-nav a[href="/model-lab"]').click();
    await page.waitForURL("**/model-lab", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page
      .getByText("Artifact manifests loaded", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });

    const trackAmazon = page.locator("#track-amazon");
    await trackAmazon.waitFor({ state: "visible", timeout: 10000 });
    const hasW2vHeading = await trackAmazon
      .getByText("Word2Vec + BiLSTM", { exact: true })
      .first()
      .isVisible();
    const hasParamCount = await trackAmazon
      .getByText("16,734,869", { exact: true })
      .first()
      .isVisible();

    const dedupTab = trackAmazon.locator(
      "#pipeline-tab-amazon_rating-dataset_audit_deduplication",
    );
    const hasDedupTitle = await dedupTab
      .getByText("Dataset audit / deduplication", { exact: true })
      .isVisible();
    const hasDedupStatus =
      (await dedupTab.getAttribute("data-status")) === "not_available" &&
      (await dedupTab.getByText("Not available", { exact: true }).isVisible());

    const amazonInspectorTitle = trackAmazon.locator(
      "#pipeline-panel-amazon_rating .pipeline-inspector__title",
    );
    const initialStepTitle = (await amazonInspectorTitle.textContent())?.trim();
    await trackAmazon
      .locator("#pipeline-tab-amazon_rating-raw_amazon_reviews")
      .focus();
    await page.keyboard.press("ArrowRight");
    await amazonInspectorTitle
      .getByText("Dataset audit / deduplication", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    const arrowStepTitle = (await amazonInspectorTitle.textContent())?.trim();
    await trackAmazon
      .locator("#pipeline-tab-amazon_rating-train_val_test_split")
      .click();
    await amazonInspectorTitle
      .getByText("Train / validation / test split", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    const clickStepTitle = (await amazonInspectorTitle.textContent())?.trim();

    const cmRows = await trackAmazon.locator(".modellab-cm-table tbody tr").count();
    const cmCells = await trackAmazon
      .locator(".modellab-cm-table tbody td.modellab-cm-cell")
      .count();
    const hasAmazonOnnx =
      (await trackAmazon
        .getByText("ONNX numerical parity", { exact: true })
        .isVisible()) &&
      (await trackAmazon
        .getByText("Within tolerance", { exact: true })
        .first()
        .isVisible()) &&
      (await trackAmazon
        .locator(".modellab-artifact-path", {
          hasText: "artifacts/models/onnx/amazon_bilstm.onnx",
        })
        .first()
        .isVisible());

    record(
      "desktop /model-lab Track A verifies BiLSTM, 16,734,869 params, not_available dedup badge, ArrowRight/click Inspector, 5x5 confusion matrix & ONNX parity",
      hasW2vHeading &&
        hasParamCount &&
        hasDedupTitle &&
        hasDedupStatus &&
        initialStepTitle === "Raw Amazon Reviews" &&
        arrowStepTitle === "Dataset audit / deduplication" &&
        clickStepTitle === "Train / validation / test split" &&
        cmRows === 5 &&
        cmCells === 25 &&
        hasAmazonOnnx,
      `w2v=${hasW2vHeading}, params=${hasParamCount}, dedupNotAvail=${hasDedupTitle && hasDedupStatus}, steps=${initialStepTitle}->${arrowStepTitle}->${clickStepTitle}, cm=${cmRows}x${cmCells}, onnx=${hasAmazonOnnx}`,
    );

    const trackGo = page.locator("#track-goemotions");
    await trackGo.waitFor({ state: "visible", timeout: 10000 });
    const hasDistilBert = await trackGo
      .getByText("Track B — GoEmotions DistilBERT", { exact: true })
      .isVisible();
    const hasThreshold030 =
      (await trackGo
        .getByText("Optimal threshold: 0.30", { exact: true })
        .isVisible()) &&
      (await trackGo
        .getByText("Threshold 0.3 (optimal)", { exact: true })
        .isVisible());
    const hasGoOnnx = await trackGo
      .locator(".modellab-artifact-path", {
        hasText: "artifacts/models/onnx/goemotions_distilbert.onnx",
      })
      .first()
      .isVisible();

    const labelSort = trackGo.locator("#label-sort-go_emotions");
    await labelSort.selectOption("support-asc");
    const lowestSupportFirstLabel = (
      await trackGo
        .locator(".dataset-table")
        .last()
        .locator("tbody tr")
        .first()
        .locator("td")
        .first()
        .textContent()
    )?.trim();

    const precisionSortBtn = trackGo.getByRole("button", {
      name: /^Sort by Precision /,
    });
    await precisionSortBtn.click();
    const precisionDescValue = await labelSort.inputValue();
    await precisionSortBtn.click();
    const precisionAscValue = await labelSort.inputValue();

    const recallSortBtn = trackGo.getByRole("button", {
      name: /^Sort by Recall /,
    });
    await recallSortBtn.click();
    const recallDescValue = await labelSort.inputValue();

    await labelSort.selectOption("f1-desc");

    const labelSearch = trackGo.locator("#label-search-go_emotions");
    await labelSearch.fill("gratitude");
    await trackGo
      .getByText("Showing 1 of 28 emotion labels", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    const filteredRowVisible = await trackGo
      .locator(".dataset-table tbody td", { hasText: "gratitude" })
      .first()
      .isVisible();
    await labelSearch.fill("");
    await trackGo
      .getByText("Showing 28 of 28 emotion labels", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });

    const comparisonSection = page.locator("#model-comparison");
    await comparisonSection.waitFor({ state: "visible", timeout: 10000 });
    const comparisonRows = await comparisonSection
      .locator(".modellab-comparison-table tbody tr")
      .count();

    record(
      "desktop /model-lab Track B verifies DistilBERT, threshold 0.30, 28-label header/select sort (support-asc -> grief, precision, recall) & filter, ONNX parity & Model Comparison table",
      hasDistilBert &&
        hasThreshold030 &&
        hasGoOnnx &&
        lowestSupportFirstLabel === "grief" &&
        precisionDescValue === "precision-desc" &&
        precisionAscValue === "precision-asc" &&
        recallDescValue === "recall-desc" &&
        filteredRowVisible &&
        comparisonRows === 8,
      `distilbert=${hasDistilBert}, threshold030=${hasThreshold030}, onnx=${hasGoOnnx}, lowestSupport=${lowestSupportFirstLabel}, precision=${precisionDescValue}->${precisionAscValue}, recall=${recallDescValue}, filteredGratitude=${filteredRowVisible}, comparisonRows=${comparisonRows}`,
    );

    await page.waitForTimeout(450);
    await saveScreenshot(page, "04-model-lab-desktop.png");

    await page.locator('#primary-nav a[href="/datasets"]').click();
    await page.waitForURL("**/datasets", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const amazonPanel = page.locator("#dataset-panel-amazon_reviews");
    await amazonPanel.waitFor({ state: "visible", timeout: 15000 });
    const kaggleUrl =
      "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv";
    const kaggleLinkVisible = await amazonPanel
      .locator(`a[href="${kaggleUrl}"]`)
      .isVisible();
    await amazonPanel.getByText("3,000,000").first().waitFor({ state: "visible", timeout: 10000 });
    await amazonPanel.getByText("650,000").first().waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("43,410").first().waitFor({ state: "visible", timeout: 5000 });

    const amazonChartSvgs = amazonPanel.locator(".recharts-wrapper svg");
    await amazonChartSvgs.first().waitFor({ state: "visible", timeout: 10000 });
    const amazonSvgCount = await amazonChartSvgs.count();
    const amazonSvgBox = await amazonChartSvgs.first().boundingBox();

    const duplicatesNoteVisible = await amazonPanel
      .getByText("Duplicate and near-duplicate review counts were not persisted", { exact: false })
      .isVisible();
    const unauditedBadgeVisible = await amazonPanel
      .getByText("Unaudited / Missing", { exact: true })
      .first()
      .isVisible();
    await amazonPanel
      .getByText("Sample preview withheld under data-governance policy")
      .waitFor({ state: "visible", timeout: 10000 });
    const restrictedBadgeVisible = await amazonPanel
      .getByText("Preview restricted", { exact: true })
      .isVisible();

    record(
      "desktop /datasets Amazon Reviews verifies Kaggle URL, splits, Recharts SVG, unaudited duplicates & gated Sample Explorer",
      kaggleLinkVisible &&
        amazonSvgCount >= 2 &&
        Boolean(amazonSvgBox && amazonSvgBox.width > 0 && amazonSvgBox.height > 0) &&
        duplicatesNoteVisible &&
        unauditedBadgeVisible &&
        restrictedBadgeVisible,
      `kaggleLink=${kaggleLinkVisible}, svgs=${amazonSvgCount}, svgWidth=${amazonSvgBox?.width ?? 0}, unaudited=${unauditedBadgeVisible}, duplicatesNote=${duplicatesNoteVisible}, restricted=${restrictedBadgeVisible}`,
    );
    await page.waitForTimeout(450);
    await saveScreenshot(page, "05-datasets-desktop.png");

    // Click GoEmotions (Simplified) tab
    await page.getByRole("tab", { name: /GoEmotions \(Simplified\)/ }).click();
    const goPanel = page.locator("#dataset-panel-go_emotions");
    await goPanel.waitFor({ state: "visible", timeout: 10000 });
    const hfUrl = "https://huggingface.co/datasets/google-research-datasets/go_emotions";
    const hfLinkVisible = await goPanel.locator(`a[href="${hfUrl}"]`).isVisible();
    const goSplitsVisible = (
      await Promise.all([
        goPanel.getByText("43,410").first().isVisible(),
        goPanel.getByText("5,426").first().isVisible(),
        goPanel.getByText("5,427").first().isVisible(),
      ])
    ).every(Boolean);

    await goPanel.getByRole("button", { name: "All 28 Ranked" }).click();
    const goChartSvgs = goPanel.locator(".recharts-wrapper svg");
    await goChartSvgs.first().waitFor({ state: "visible", timeout: 10000 });
    const goSvgCount = await goChartSvgs.count();
    const hasPrevalenceTitle = await goPanel
      .getByText("Emotion label prevalence across splits")
      .isVisible();
    const hasCardinalityTitle = await goPanel
      .getByText("Labels per comment across splits")
      .isVisible();
    const hasGriefTick = await goPanel
      .locator(".recharts-wrapper svg text")
      .filter({ hasText: "grief" })
      .first()
      .isVisible();
    await goPanel
      .getByText("Sample preview withheld under data-governance policy")
      .waitFor({ state: "visible", timeout: 10000 });

    record(
      "desktop /datasets GoEmotions verifies HF URL, splits (43,410/5,426/5,427), 28-class prevalence & multi-label cardinality SVGs",
      hfLinkVisible &&
        goSplitsVisible &&
        goSvgCount >= 2 &&
        hasPrevalenceTitle &&
        hasCardinalityTitle &&
        hasGriefTick,
      `hfLink=${hfLinkVisible}, splits=${goSplitsVisible}, svgs=${goSvgCount}, prevalence=${hasPrevalenceTitle}, cardinality=${hasCardinalityTitle}, grief28=${hasGriefTick}`,
    );
    await page.waitForTimeout(450);
    await saveScreenshot(page, "09-datasets-goemotions-desktop.png");

    await page.locator('#primary-nav a[href="/documentation"]').click();
    await page.waitForURL("**/documentation", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const archMap = page.locator("#architecture-map");
    await archMap.waitFor({ state: "visible", timeout: 10000 });

    const legendCategoriesOk = (
      await Promise.all(
        [
          "API request",
          "Model processing",
          "Dataset artifact",
          "Saved artifact",
          "External service",
        ].map((label) =>
          archMap.locator(".doc-legend").getByText(label, { exact: true }).isVisible(),
        ),
      )
    ).every(Boolean);

    const legendStatusesOk = (
      await Promise.all(
        ["Implemented", "Partial", "Proposed"].map((label) =>
          archMap.locator(".doc-legend").getByText(label, { exact: true }).isVisible(),
        ),
      )
    ).every(Boolean);

    // Verify Node Inspector updates on Next button & clicking a node
    const inspectorTitle = archMap.locator(".doc-inspector__title");
    const initialInspectorTitle = (await inspectorTitle.textContent())?.trim();
    await archMap.getByRole("button", { name: "Next architecture node" }).click();
    const nextInspectorTitle = (await inspectorTitle.textContent())?.trim();
    await archMap.locator("#doc-node-sys-fastapi").click();
    const clickedInspectorTitle = (await inspectorTitle.textContent())?.trim();

    record(
      "desktop /documentation renders all 5 legend categories, 3 status badges, and updates Node Inspector via Next and node click",
      legendCategoriesOk &&
        legendStatusesOk &&
        initialInspectorTitle === "Browser UI (Next.js Pages Router)" &&
        nextInspectorTitle === "Frontend API Client (lib/api.ts)" &&
        clickedInspectorTitle === "FastAPI Service (:8000)",
      `categories=${legendCategoriesOk}, statuses=${legendStatusesOk}, initial=${initialInspectorTitle}, next=${nextInspectorTitle}, clicked=${clickedInspectorTitle}`,
    );

    // Tab: Inference (Flowchart <-> Sequence view)
    await archMap.locator("#doc-tab-inference").click();
    await archMap.locator("#doc-tabpanel-inference").waitFor({ state: "visible", timeout: 5000 });
    const inferenceFlowVisible = await archMap.locator(".doc-inference-flow").isVisible();
    await archMap.getByRole("radio", { name: "Sequence view" }).click();
    await archMap.locator(".doc-sequence-list").waitFor({ state: "visible", timeout: 5000 });
    const sequenceItemsCount = await archMap.locator(".doc-sequence-item").count();
    await archMap.getByRole("radio", { name: "Flowchart" }).click();
    const inferenceFlowRestored = await archMap.locator(".doc-inference-flow").isVisible();

    record(
      "desktop /documentation Inference tab switches cleanly between Flowchart and Sequence view",
      inferenceFlowVisible && sequenceItemsCount >= 6 && inferenceFlowRestored,
      `flowVisible=${inferenceFlowVisible}, sequenceItems=${sequenceItemsCount}, flowRestored=${inferenceFlowRestored}`,
    );

    // Tab: Training (separated Track A & Track B)
    await archMap.locator("#doc-tab-training").click();
    await archMap.locator("#doc-tabpanel-training").waitFor({ state: "visible", timeout: 5000 });
    const trackAPanelVisible = await archMap
      .locator('.doc-track-panel[data-track="amazon_rating"]')
      .isVisible();
    const trackBPanelVisible = await archMap
      .locator('.doc-track-panel[data-track="go_emotions"]')
      .isVisible();
    record(
      "desktop /documentation Training tab separates Track A (amazon_rating) and Track B (go_emotions)",
      trackAPanelVisible && trackBPanelVisible,
      `trackA=${trackAPanelVisible}, trackB=${trackBPanelVisible}`,
    );

    // Tab: Storage (NLP Lab Workspace, Persistent/Ephemeral, zero Drive path/ID leaks)
    await archMap.locator("#doc-tab-storage").click();
    const storagePanel = archMap.locator("#doc-tabpanel-storage");
    await storagePanel.waitFor({ state: "visible", timeout: 5000 });
    const hasWorkspaceLabel = await storagePanel
      .getByText("NLP Lab Workspace", { exact: false })
      .first()
      .isVisible();
    const hasPersistentBadge = await storagePanel
      .locator(".badge", { hasText: "Persistent" })
      .first()
      .isVisible();
    const hasEphemeralBadge = await storagePanel
      .locator(".badge", { hasText: "Ephemeral" })
      .first()
      .isVisible();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasNoDriveLeak =
      !/\/content\/drive/i.test(bodyText) && !/1qvzd/i.test(bodyText);

    record(
      "desktop /documentation Storage tab renders NLP Lab Workspace, Persistent/Ephemeral badges, and zero Drive leaks",
      hasWorkspaceLabel && hasPersistentBadge && hasEphemeralBadge && hasNoDriveLeak,
      `workspace=${hasWorkspaceLabel}, persistent=${hasPersistentBadge}, ephemeral=${hasEphemeralBadge}, noDriveLeak=${hasNoDriveLeak}`,
    );

    // Tab: Deployment (frontend/Dockerfile & CI jobs Implemented; live ONNX serving Proposed)
    await archMap.locator("#doc-tab-deployment").click();
    const deploymentPanel = archMap.locator("#doc-tabpanel-deployment");
    await deploymentPanel.waitFor({ state: "visible", timeout: 5000 });
    const composeFeStatus = await deploymentPanel
      .locator("#doc-node-dep-compose-fe")
      .getAttribute("data-status");
    const ghCiStatus = await deploymentPanel
      .locator("#doc-node-dep-gh-ci")
      .getAttribute("data-status");
    const feCiStatus = await deploymentPanel
      .locator("#doc-node-dep-fe-ci")
      .getAttribute("data-status");
    const playwrightCiStatus = await deploymentPanel
      .locator("#doc-node-dep-playwright-ci")
      .getAttribute("data-status");
    const onnxServingProposedStatus = await deploymentPanel
      .locator("#doc-node-dep-onnx-serving-proposed")
      .getAttribute("data-status");
    const dockerfileMentionVisible = await deploymentPanel
      .getByText("frontend/Dockerfile", { exact: false })
      .first()
      .isVisible();

    record(
      "desktop /documentation Deployment tab marks frontend/Dockerfile & CI jobs as Implemented and live ONNX serving as Proposed",
      composeFeStatus === "implemented" &&
        ghCiStatus === "implemented" &&
        feCiStatus === "implemented" &&
        playwrightCiStatus === "implemented" &&
        onnxServingProposedStatus === "proposed" &&
        dockerfileMentionVisible,
      `composeFeStatus=${composeFeStatus}, ghCiStatus=${ghCiStatus}, feCiStatus=${feCiStatus}, playwrightCiStatus=${playwrightCiStatus}, onnxServingProposedStatus=${onnxServingProposedStatus}, dockerfileMention=${dockerfileMentionVisible}`,
    );

    // Return to System tab for overview screenshot after checking reference sections
    await archMap.locator("#doc-tab-system").click();
    await archMap.locator("#doc-tabpanel-system").waitFor({ state: "visible", timeout: 5000 });

    // Stack Matrix filter, exact Dataset URLs, ENV_VARS table, API_ENDPOINTS
    const stackMatrix = page.locator("#stack-matrix");
    const totalToolsCount = await stackMatrix.locator(".doc-tool-card").count();
    await stackMatrix.locator("#doc-stack-tab-ml").click();
    const mlToolsCount = await stackMatrix.locator(".doc-tool-card").count();
    await stackMatrix.locator("#doc-stack-tab-all").click();
    const restoredToolsCount = await stackMatrix.locator(".doc-tool-card").count();

    const datasetSources = page.locator("#dataset-sources");
    const docKaggleLinkVisible = await datasetSources
      .locator(
        'a[href="https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv"]',
      )
      .isVisible();
    const docHfLinkVisible = await datasetSources
      .locator(
        'a[href="https://huggingface.co/datasets/google-research-datasets/go_emotions"]',
      )
      .isVisible();

    const envTable = page.locator(".doc-env-table");
    const envRowCount = await envTable.locator("tbody tr").count();
    const hasNextPublicApiUrl = await envTable
      .getByText("NEXT_PUBLIC_API_URL", { exact: true })
      .isVisible();

    const endpointGrid = page.locator(".doc-endpoint-grid");
    const endpointsOk = (
      await Promise.all(
        [
          "/readiness",
          "/predict/amazon",
          "/predict/go-emotions",
          "/datasets/summary",
          "/models/lab",
        ].map((ep) => endpointGrid.getByText(ep, { exact: true }).first().isVisible()),
      )
    ).every(Boolean);

    record(
      "desktop /documentation Stack Matrix filter, dataset URLs, ENV_VARS table, and API_ENDPOINTS render cleanly",
      totalToolsCount > mlToolsCount &&
        mlToolsCount > 0 &&
        restoredToolsCount === totalToolsCount &&
        docKaggleLinkVisible &&
        docHfLinkVisible &&
        envRowCount >= 9 &&
        hasNextPublicApiUrl &&
        endpointsOk,
      `tools=${totalToolsCount}->ml:${mlToolsCount}->all:${restoredToolsCount}, kaggle=${docKaggleLinkVisible}, hf=${docHfLinkVisible}, envRows=${envRowCount}, nextPublicApiUrl=${hasNextPublicApiUrl}, endpoints=${endpointsOk}`,
    );

    await page.waitForTimeout(450);
    await saveScreenshot(page, "06-documentation-desktop.png");

    // g) `/technology`, Footer, and `/404`
    await page.locator('#primary-nav a[href="/technology"]').click();
    await page.waitForURL("**/technology", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const techHero = page.locator(".tech-hero");
    await techHero.waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#stack-inventory .tech-card").first().waitFor({
      state: "visible",
      timeout: 15000,
    });

    const marqueeToggle = techHero.locator("button.tech-hero__toggle");
    const initialToggleText = (await marqueeToggle.textContent())?.trim() ?? "";
    await marqueeToggle.click();
    const pausedAttr = await techHero
      .locator(".tech-marquee")
      .getAttribute("data-paused");
    const pausedToggleText = (await marqueeToggle.textContent())?.trim() ?? "";
    await marqueeToggle.click();
    const resumedAttr = await techHero
      .locator(".tech-marquee")
      .getAttribute("data-paused");

    record(
      "desktop /technology AnimatedMarqueeHero renders & Pause/Resume toggle works",
      initialToggleText.includes("Pause showcase") &&
        pausedAttr === "true" &&
        pausedToggleText.includes("Resume showcase") &&
        resumedAttr === "false",
      `toggle=${initialToggleText}->${pausedToggleText}, pausedAttr=${pausedAttr}->${resumedAttr}`,
    );

    // Scroll lazy-loaded card logos into view and verify every SVG <img> loaded cleanly
    const cardLogos = page.locator("#stack-inventory .tech-card__logo-img");
    const logoCount = await cardLogos.count();
    for (let i = 0; i < logoCount; i += 1) {
      await cardLogos.nth(i).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() => {
      const imgs = Array.from(
        document.querySelectorAll("#stack-inventory .tech-card__logo-img"),
      );
      return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0);
    }, null, { timeout: 10000 });
    const logoMetrics = await cardLogos.evaluateAll((imgs) => ({
      total: imgs.length,
      loaded: imgs.filter((img) => img.complete && img.naturalWidth > 0).length,
    }));

    record(
      "desktop /technology SVG logo images load cleanly",
      logoMetrics.total >= 15 && logoMetrics.loaded === logoMetrics.total,
      `loaded=${logoMetrics.loaded}/${logoMetrics.total}`,
    );

    // Category filter tablist switching
    await page.locator("#tech-tab-ml_nlp").click();
    const mlTabSelected = await page
      .locator("#tech-tab-ml_nlp")
      .getAttribute("aria-selected");
    const mlPanel = page.locator("#tech-stack-panel");
    const mlCardsOk = (
      await Promise.all(
        ["PyTorch", "Gensim", "ONNX & ONNX Runtime"].map((name) =>
          mlPanel.getByRole("heading", { name, exact: true }).isVisible(),
        ),
      )
    ).every(Boolean);
    await page.locator("#tech-tab-all").click();

    const boundaryCount = await page
      .locator("#communication-boundaries .tech-boundary-card")
      .count();

    const unusedAudit = page.locator(".tech-unused-audit");
    await unusedAudit.waitFor({ state: "visible", timeout: 5000 });
    await unusedAudit.locator("summary.tech-unused-disclosure__summary").click();
    const unusedBadgeVisible = await unusedAudit
      .getByText("Declared · Unused", { exact: true })
      .first()
      .isVisible();
    const unusedTailwindVisible = await unusedAudit
      .getByText("Tailwind CSS", { exact: true })
      .isVisible();
    const heroHasDeclaredUnused =
      (await techHero.getByText("Declared · Unused", { exact: true }).count()) > 0;

    record(
      "desktop /technology category filter, #communication-boundaries, and isolated Declared · Unused audit work",
      mlTabSelected === "true" &&
        mlCardsOk &&
        boundaryCount >= 4 &&
        unusedBadgeVisible &&
        unusedTailwindVisible &&
        !heroHasDeclaredUnused,
      `mlTab=${mlTabSelected}, mlCards=${mlCardsOk}, boundaries=${boundaryCount}, unusedIsolated=${unusedBadgeVisible && unusedTailwindVisible && !heroHasDeclaredUnused}`,
    );

    // `#site-footer` checks
    const footer = page.locator("#site-footer");
    await footer.scrollIntoViewIfNeeded();
    const hashLinkCount = await page.locator('a[href="#"]').count();
    const footerPhase = await footer
      .locator(".site-footer__status")
      .getAttribute("data-phase");
    const footerStatusText = (
      await footer.locator(".site-footer__status").textContent()
    )?.trim();
    const footerLinksPresent = (
      await Promise.all(
        [
          "/model-lab",
          "/datasets",
          "/documentation",
          "/technology",
          "/analyze/sentiment",
          "/analyze/emotions",
        ].map((href) => footer.locator(`a[href="${href}"]`).isVisible()),
      )
    ).every(Boolean);
    const footerActiveAttr = await footer
      .locator('a[href="/technology"]')
      .getAttribute("aria-current");
    const scrollBeforeTop = await page.evaluate(() => window.scrollY);
    await footer.getByRole("button", { name: "Back to top" }).click();
    await page.waitForFunction(() => window.scrollY < 50, null, { timeout: 5000 });
    const scrollAfterTop = await page.evaluate(() => window.scrollY);

    record(
      "desktop #site-footer verifies zero href=#, live readiness, working links, active link & Back to top",
      hashLinkCount === 0 &&
        footerPhase === "online" &&
        Boolean(footerStatusText?.includes("API connected")) &&
        footerLinksPresent &&
        footerActiveAttr === "page" &&
        scrollBeforeTop > 50 &&
        scrollAfterTop < 50,
      `hashLinks=${hashLinkCount}, phase=${footerPhase}, status="${footerStatusText}", links=${footerLinksPresent}, active=${footerActiveAttr}, scroll=${scrollBeforeTop}->${scrollAfterTop}`,
    );

    await checkNoHorizontalOverflow(page, "desktop /technology");
    await page.waitForTimeout(350);
    await saveScreenshot(page, "13-technology-desktop.png");

    // Dedicated `/404` check (scoped 404 console exception ONLY for this unknown route)
    expectingNotFound404 = true;
    try {
      const notFoundResponse = await page.goto(
        `${BASE_URL}/does-not-exist-nlp-route`,
        { waitUntil: "domcontentloaded" },
      );
      await page
        .getByRole("heading", { name: "Page not found" })
        .waitFor({ state: "visible", timeout: 10000 });
      const pageTitle404 = await page.title();
      await page
        .locator('.notfound-status-card [role="status"][data-phase="online"]')
        .waitFor({ state: "visible", timeout: 15000 });
      const hasTechLinkOn404 = await page
        .locator('.notfound-route-link[href="/technology"]')
        .isVisible();
      const hasFooterOn404 = await page.locator("#site-footer").isVisible();
      const hashLinksOn404 = await page.locator('a[href="#"]').count();

      record(
        "desktop /404 renders HTTP 404, Page not found, title, live readiness, route links & footer",
        notFoundResponse?.status() === 404 &&
          pageTitle404.includes("Page Not Found") &&
          hasTechLinkOn404 &&
          hasFooterOn404 &&
          hashLinksOn404 === 0,
        `status=${notFoundResponse?.status()}, title="${pageTitle404}", techLink=${hasTechLinkOn404}, footer=${hasFooterOn404}`,
      );
      await checkNoHorizontalOverflow(page, "desktop /404");
    } finally {
      expectingNotFound404 = false;
    }
  } finally {
    await context.close();
  }
}

async function runMobilePass(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  attachErrorListeners(page, "mobile");

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await dismissPreloaderIfPresent(page, { requireVisible: false });
    await page.getByText("Both models ready").waitFor({
      state: "visible",
      timeout: 30000,
    });
    await checkNoHorizontalOverflow(page, "/");

    // Mobile /analyze/sentiment with live prediction
    await page.locator('#primary-nav a[href="/analyze/sentiment"]').click();
    await page.waitForURL("**/analyze/sentiment", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.getByRole("button", { name: "5-star positive" }).click();
    await page.getByRole("button", { name: "Analyze sentiment" }).click();
    await page.locator(".result-card").getByText("Analyzed review").waitFor({
      state: "visible",
      timeout: 30000,
    });
    await checkNoHorizontalOverflow(page, "/analyze/sentiment");
    await saveScreenshot(page, "07-sentiment-mobile.png");

    // Mobile /analyze/emotions with live prediction
    await page.locator('#primary-nav a[href="/analyze/emotions"]').click();
    await page.waitForURL("**/analyze/emotions", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.getByRole("button", { name: "Admiration / gratitude" }).click();
    await page.getByRole("button", { name: "Analyze emotions" }).click();
    await page
      .locator(".result-card")
      .getByText("Selected multi-label detections")
      .waitFor({ state: "visible", timeout: 30000 });
    await checkNoHorizontalOverflow(page, "/analyze/emotions");
    await saveScreenshot(page, "08-emotions-mobile.png");

    // Mobile /datasets check
    await page.locator('#primary-nav a[href="/datasets"]').click();
    await page.waitForURL("**/datasets", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.locator("#dataset-panel-amazon_reviews").waitFor({ state: "visible", timeout: 15000 });
    await page
      .locator("#dataset-panel-amazon_reviews .recharts-wrapper svg")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page
      .locator("#dataset-panel-amazon_reviews")
      .getByText("Sample preview withheld under data-governance policy")
      .waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "/datasets");
    await saveScreenshot(page, "10-datasets-mobile.png");

    await page.getByRole("tab", { name: /GoEmotions \(Simplified\)/ }).click();
    await page.locator("#dataset-panel-go_emotions").waitFor({ state: "visible", timeout: 10000 });
    await page
      .locator("#dataset-panel-go_emotions .recharts-wrapper svg")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "/datasets#go_emotions");

    // Mobile /model-lab check
    await page.locator('#primary-nav a[href="/model-lab"]').click();
    await page.waitForURL("**/model-lab", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.getByText("Artifact manifests loaded", { exact: true }).waitFor({
      state: "visible",
      timeout: 15000,
    });
    const mobileTrackANodeOpacity = await page
      .locator("#track-amazon .pipeline-node")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
    const mobileTrackBNodeOpacity = await page
      .locator("#track-goemotions .pipeline-node")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
    record(
      "mobile /model-lab renders static diagram fallback with visible pipeline nodes",
      mobileTrackANodeOpacity === 1 && mobileTrackBNodeOpacity === 1,
      `trackAOpacity=${mobileTrackANodeOpacity}, trackBOpacity=${mobileTrackBNodeOpacity}`,
    );
    await page.locator("#track-amazon .modellab-cm-table").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.locator("#track-goemotions").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.locator("#model-comparison .modellab-comparison-table").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await checkNoHorizontalOverflow(page, "/model-lab");
    await saveScreenshot(page, "11-model-lab-mobile.png");

    // Mobile /documentation check
    await page.locator('#primary-nav a[href="/documentation"]').click();
    await page.waitForURL("**/documentation", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.locator("#architecture-map .doc-node").first().waitFor({
      state: "visible",
      timeout: 10000,
    });
    const visibleDocNodeOpacities = await page
      .locator("#architecture-map .doc-node")
      .evaluateAll((els) =>
        els
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((el) => Number.parseFloat(getComputedStyle(el).opacity)),
      );
    record(
      "mobile /documentation renders static diagram fallback with visible doc nodes",
      visibleDocNodeOpacities.length > 0 &&
        visibleDocNodeOpacities.every((opacity) => opacity === 1),
      `visibleCount=${visibleDocNodeOpacities.length}, opacities=${JSON.stringify(visibleDocNodeOpacities)}`,
    );
    await checkNoHorizontalOverflow(page, "/documentation");
    await saveScreenshot(page, "12-documentation-mobile.png");

    // Mobile /technology + Footer check
    await page.locator('#primary-nav a[href="/technology"]').click();
    await page.waitForURL("**/technology", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.locator(".tech-hero").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#stack-inventory .tech-card").first().waitFor({
      state: "visible",
      timeout: 15000,
    });
    const mobileMarqueeOpacities = await page
      .locator(".tech-marquee__list:not(.tech-marquee__list--clone) .tech-marquee__item")
      .evaluateAll((els) =>
        els.map((el) => Number.parseFloat(getComputedStyle(el).opacity)),
      );
    const mobileFooter = page.locator("#site-footer");
    await mobileFooter.scrollIntoViewIfNeeded();
    const mobileFooterRevealOpacities = await mobileFooter
      .locator(".site-footer__reveal")
      .evaluateAll((els) =>
        els.map((el) => Number.parseFloat(getComputedStyle(el).opacity)),
      );
    const mobileFooterPhase = await mobileFooter
      .locator(".site-footer__status")
      .getAttribute("data-phase");

    record(
      "mobile /technology & Footer render visible static items with live readiness",
      mobileMarqueeOpacities.length > 0 &&
        mobileMarqueeOpacities.every((opacity) => opacity === 1) &&
        mobileFooterRevealOpacities.length > 0 &&
        mobileFooterRevealOpacities.every((opacity) => opacity === 1) &&
        mobileFooterPhase === "online",
      `marqueeItems=${mobileMarqueeOpacities.length}, footerReveals=${mobileFooterRevealOpacities.length}, footerPhase=${mobileFooterPhase}`,
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await checkNoHorizontalOverflow(page, "/technology");
    await saveScreenshot(page, "14-technology-mobile.png");
  } finally {
    await context.close();
  }
}

async function runDatasetsStressPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let mockMode = "503";
  let expectHttpErrorLog = true;

  attachErrorListeners(page, "datasets-stress", {
    isExpectedConsoleError: (text) =>
      expectHttpErrorLog &&
      /^Failed to load resource: the server responded with a status of (503|500)\b/.test(
        text,
      ),
  });

  const breakUiWorstCasePayload = {
    provenance:
      "Break-UI Stress Fixture (extremely-long-unbroken-provenance-identifier-for-wrap-check)",
    last_audit_date: "2026-11-18",
    datasets: {
      amazon_reviews: {
        name: "Amazon Reviews — Worst-Case Billion-Scale Corpus Stress Fixture",
        task: "Five-class review rating classification (1–5 stars) with zero and billion-scale counts",
        label_semantics: "5 ordinal star-rating classes (1–5).",
        source_url:
          "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv-extremely-long-unbroken-repository-slug-for-break-ui-stress-testing",
        mirror_url:
          "https://huggingface.co/datasets/very-long-organization-namespace-without-spaces/extremely-long-dataset-repository-name-for-sentiment-and-emotion-classification-benchmark-v2",
        status: "audited",
        last_audit_date: "2026-11-18",
        splits: {
          train: 1234567890,
          test: 0,
          sampled_train: 1,
          sampled_validation: 0,
        },
        schema: {
          "train.csv": {
            dtypes: {
              class_index: "int64",
              review_text: "string_with_extremely_long_type_annotation_without_spaces_v2",
            },
          },
        },
        class_distribution: {
          train: {
            1: 1234567890,
            2: 0,
            3: 1,
            4: 42,
            5: 987654321,
          },
        },
        missing_values: {
          recorded: true,
          train: {
            review_title_nulls: 1234567890,
            review_text_nulls: 0,
            total_rows: 1234567890,
          },
          test: {
            review_title_nulls: 0,
            review_text_nulls: 0,
            total_rows: 0,
          },
          note: "Zero counts and billion-scale counts rendered together.",
        },
        text_length_stats: {
          recorded: true,
          unit: "words",
          p50: 0,
          mean: 1234.56,
          max: 99999,
          max_sequence_cap: 256,
        },
        duplicates_audit: {
          recorded: false,
          duplicate_count: null,
          near_duplicate_count: null,
          missing_reason: "Unaudited in break-ui stress fixture.",
          note: "Unaudited in break-ui stress fixture.",
        },
        imbalance_summary:
          "Extreme 1,234,567,890 vs 0 split count stress test for tabular-nums and responsive wrapping.",
        quality_warnings: [
          "https://example.com/unbroken-long-warning-url/that-must-wrap-at-375px-without-horizontal-overflow",
        ],
        samples_policy: {
          approved: true,
          reason: "Break-UI approved preview stress fixture.",
        },
      },
      go_emotions: {
        name: "GoEmotions (Simplified) — Worst-Case Long Label Stress Fixture",
        task: "Multi-label emotion classification with long hyphenated labels and 0 counts",
        label_semantics: "28 multi-label outputs including edge-case label names.",
        source_url:
          "https://huggingface.co/datasets/google-research-datasets/extremely-long-unbroken-go-emotions-simplified-multi-label-stress-test-dataset-identifier",
        status: "audited",
        last_audit_date: "2026-11-18",
        splits: {
          train: 1234567890,
          validation: 0,
          test: 1,
        },
        schema: {
          features: {
            text: "Value('string')",
            labels: "List(ClassLabel)",
          },
        },
        class_prevalence: {
          train: {
            neutral: 1234567890,
            "extraordinarily-disappointed-and-overwhelmed": 42,
            "cautiously-optimistic-yet-skeptical": 1,
            zero_count_emotion: 0,
          },
        },
        labels_per_example: {
          train: {
            1: 1234567890,
            2: 0,
            3: 1,
          },
        },
        missing_values: {
          recorded: false,
          null_count: null,
          empty_text_count: null,
          missing_reason: "Not recorded.",
          note: "Not recorded.",
        },
        text_length_stats: {
          recorded: true,
          unit: "DistilBERT subword tokens",
          mean: 0,
          p95: 128,
          p99: 256,
          max: 12345,
          max_sequence_cap: 128,
          exceeding_max_length: 0,
        },
        duplicates_audit: {
          recorded: false,
          duplicate_count: null,
          near_duplicate_count: null,
          missing_reason: "Not recorded.",
          note: "Not recorded.",
        },
        cooccurrence_audit: {
          recorded: false,
          matrix: null,
          missing_reason: "Not recorded.",
          note: "Not recorded.",
        },
        imbalance_summary:
          "Tests extraordinarily-disappointed-and-overwhelmed alongside 1,234,567,890 and 0 counts.",
        quality_warnings: [
          "Label extraordinarily-disappointed-and-overwhelmed with 0-count sibling classes.",
        ],
        samples_policy: {
          approved: true,
          reason: "Break-UI approved preview stress fixture.",
        },
      },
    },
  };

  try {
    await page.route("**/datasets/summary", async (route) => {
      if (mockMode === "503") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "dataset_summary_unavailable",
            detail: "Dataset summary report missing (mocked 503).",
          }),
        });
        return;
      }
      if (mockMode === "500") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Internal server error loading dataset summary (mocked 500).",
          }),
        });
        return;
      }
      if (mockMode === "empty") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            provenance: "Mocked empty audit",
            last_audit_date: "2026-11-18",
            datasets: {},
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(breakUiWorstCasePayload),
      });
    });

    await page.route("**/datasets/*/samples*", async (route) => {
      const requestUrl = route.request().url();
      const datasetId = requestUrl.includes("/go_emotions/")
        ? "go_emotions"
        : "amazon_reviews";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          dataset_id: datasetId,
          approved: true,
          notice: "Mocked approved break-ui sample rows.",
          total_available: 1234567890,
          page: 1,
          page_size: 10,
          items: [
            {
              id: "worst-case-0000000001",
              split: "train",
              title: "Unusually-long-hyphenated-review-title-without-spaces",
              text: "Stress testing unbroken URL https://example.com/very/long/path/without/spaces/that/must/wrap/inside/mobile/cells and 1,234,567,890 count.",
              labels: [
                "extraordinarily-disappointed-and-overwhelmed",
                "neutral",
              ],
            },
          ],
        }),
      });
    });

    // 1. Mocked 503 -> unavailable callout + Retry
    await page.goto(`${BASE_URL}/datasets?entry=off`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByText("Dataset summary report or API endpoint unavailable")
      .waitFor({ state: "visible", timeout: 10000 });
    const retry503Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "datasets mocked 503 renders unavailable callout + Retry",
      retry503Visible,
      `retryVisible=${retry503Visible}`,
    );

    // 2. Mocked 500 -> failed callout + Retry
    mockMode = "500";
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("Failed to load dataset summary")
      .waitFor({ state: "visible", timeout: 10000 });
    const retry500Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "datasets mocked 500 renders error callout + Retry",
      retry500Visible,
      `retryVisible=${retry500Visible}`,
    );

    // 3. Mocked empty datasets: {} -> empty callout
    mockMode = "empty";
    expectHttpErrorLog = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("No dataset summary report available")
      .waitFor({ state: "visible", timeout: 10000 });
    const retryEmptyVisible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "datasets mocked empty datasets: {} renders empty callout + Retry",
      retryEmptyVisible,
      `retryVisible=${retryEmptyVisible}`,
    );

    // 4. Mocked /break-ui worst-case payload at 375x812
    await page.setViewportSize({ width: 375, height: 812 });
    mockMode = "worst_case";
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .locator("#dataset-panel-amazon_reviews")
      .getByText("1,234,567,890")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page
      .locator("#dataset-panel-amazon_reviews .recharts-wrapper svg")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "/datasets break-ui amazon_reviews 375x812");

    await page.getByRole("tab", { name: /GoEmotions \(Simplified\)/ }).click();
    const goStressPanel = page.locator("#dataset-panel-go_emotions");
    await goStressPanel.waitFor({ state: "visible", timeout: 10000 });
    await goStressPanel
      .getByText("extraordinarily-disappointed-and-overwhelmed")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "/datasets break-ui go_emotions 375x812");
  } finally {
    await context.close();
  }
}

async function runModelLabErrorPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let mockMode = "503";
  let expectHttpErrorLog = true;

  attachErrorListeners(page, "modellab-errors", {
    isExpectedConsoleError: (text) =>
      expectHttpErrorLog &&
      /^Failed to load resource: the server responded with a status of (503|500)\b/.test(
        text,
      ),
  });

  try {
    await page.route("**/models/lab", async (route) => {
      if (mockMode === "503") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "model_lab_unavailable",
            detail: "Model Lab artifacts missing (mocked 503).",
          }),
        });
        return;
      }
      if (mockMode === "500") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Internal server error loading Model Lab (mocked 500).",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provenance: "Mocked empty Model Lab",
          run_timestamp_note: "Not available",
          comparison: [],
          tracks: {},
        }),
      });
    });

    // 1. Mocked 503 -> unavailable callout + Retry
    await page.goto(`${BASE_URL}/model-lab?entry=off`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByText("Model Lab artifacts or API endpoint unavailable", {
        exact: true,
      })
      .waitFor({ state: "visible", timeout: 10000 });
    const retry503Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "model-lab mocked 503 renders unavailable callout + Retry",
      retry503Visible,
      `retryVisible=${retry503Visible}`,
    );

    // 2. Mocked 500 -> failed callout + Retry
    mockMode = "500";
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("Failed to load Model Lab metadata", { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const retry500Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "model-lab mocked 500 renders error callout + Retry",
      retry500Visible,
      `retryVisible=${retry500Visible}`,
    );

    // 3. Mocked empty tracks: {} -> empty callout + Retry
    mockMode = "empty";
    expectHttpErrorLog = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("No Model Lab track metadata available", { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const retryEmptyVisible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "model-lab mocked empty tracks: {} renders empty callout + Retry",
      retryEmptyVisible,
      `retryVisible=${retryEmptyVisible}`,
    );
  } finally {
    await context.close();
  }
}

async function runTechnologyErrorPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let mockMode = "503";
  let expectHttpErrorLog = true;

  attachErrorListeners(page, "technology-errors", {
    isExpectedConsoleError: (text) =>
      expectHttpErrorLog &&
      /^Failed to load resource: the server responded with a status of (503|500)\b/.test(
        text,
      ),
  });

  try {
    await page.route("**/technology", async (route) => {
      if (route.request().resourceType() === "document") {
        await route.continue();
        return;
      }
      if (mockMode === "503") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "technology_manifest_unavailable",
            detail: "Technology manifest missing (mocked 503).",
          }),
        });
        return;
      }
      if (mockMode === "500") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Internal server error loading technology manifest (mocked 500).",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provenance: "Mocked empty technology manifest",
          generated_from: [],
          onnx_artifact_paths: [],
          api_version: "0.1.0",
          readiness: {
            amazon_rating: { ready: false, error: "Not checked" },
            go_emotions: { ready: false, error: "Not checked" },
          },
          onnx_artifacts_present: 0,
          onnx_artifacts_expected: 2,
          categories_summary: {},
          boundaries: [],
          technologies: [],
        }),
      });
    });

    // 1. Mocked 503 -> unavailable callout + Retry
    await page.goto(`${BASE_URL}/technology?entry=off`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByText("Technology manifest unavailable", { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const retry503Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "technology mocked 503 renders unavailable callout + Retry",
      retry503Visible,
      `retryVisible=${retry503Visible}`,
    );

    // 2. Mocked 500 -> failed callout + Retry
    mockMode = "500";
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("Failed to load technology manifest", { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const retry500Visible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "technology mocked 500 renders error callout + Retry",
      retry500Visible,
      `retryVisible=${retry500Visible}`,
    );

    // 3. Mocked empty technologies: [] -> empty callout + Retry
    mockMode = "empty";
    expectHttpErrorLog = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await page
      .getByText("No technology manifest entries available", { exact: true })
      .waitFor({ state: "visible", timeout: 10000 });
    const retryEmptyVisible = await page
      .getByRole("button", { name: "Retry" })
      .isVisible();
    record(
      "technology mocked empty technologies: [] renders empty callout + Retry",
      retryEmptyVisible,
      `retryVisible=${retryEmptyVisible}`,
    );
  } finally {
    await context.close();
  }
}

async function runReducedMotionPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  attachErrorListeners(page, "reduced-motion");

  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "networkidle" });

    await page
      .locator('[data-reduced-motion="true"]')
      .waitFor({ state: "attached", timeout: 5000 });
    const preloaderCount = await page.locator(".entry-preloader-shell").count();
    const reducedAttrCount = await page
      .locator('[data-reduced-motion="true"]')
      .count();

    record(
      "reduced-motion bypasses EntryPreloader and sets data-reduced-motion=true",
      preloaderCount === 0 && reducedAttrCount >= 1,
      `preloaderCount=${preloaderCount}, reducedAttrCount=${reducedAttrCount}`,
    );
  } finally {
    await context.close();
  }
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const executablePath = resolveExecutablePath();
  results.executablePath = executablePath;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  let fatalError = null;
  try {
    await runDesktopPass(browser);
    await runMobilePass(browser);
    await runReducedMotionPass(browser);
    await runDatasetsStressPass(browser);
    await runModelLabErrorPass(browser);
    await runTechnologyErrorPass(browser);

    record(
      "zero console errors and pageerror exceptions",
      results.consoleErrors.length === 0 && results.pageErrors.length === 0,
      `consoleErrors=${results.consoleErrors.length}, pageErrors=${results.pageErrors.length}`,
    );
  } catch (err) {
    fatalError = err?.message || String(err);
  } finally {
    await browser.close();
  }

  const passedCount = results.assertions.filter((a) => a.passed).length;
  const totalCount = results.assertions.length;
  const ok =
    !fatalError &&
    passedCount === totalCount &&
    results.consoleErrors.length === 0 &&
    results.pageErrors.length === 0;

  console.log("\n## Browser QA Summary\n");
  console.log(`- Status: ${ok ? "PASSED" : "FAILED"} (${passedCount}/${totalCount} assertions)`);
  console.log(`- Target: ${BASE_URL}`);
  console.log(`- Browser: ${executablePath}`);
  console.log(`- Console errors: ${results.consoleErrors.length}`);
  console.log(`- Page errors: ${results.pageErrors.length}`);
  if (fatalError) {
    console.log(`- Fatal error: ${fatalError}`);
  }
  console.log("\n### Assertions");
  for (const item of results.assertions) {
    console.log(`- [${item.passed ? "PASS" : "FAIL"}] ${item.name} — ${item.details}`);
  }
  console.log("\n### Screenshots");
  for (const file of results.screenshots) {
    console.log(`- ${file}`);
  }
  console.log("\n### JSON Report");
  console.log(JSON.stringify({ ok, fatalError, ...results }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
}

main();
