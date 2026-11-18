import fs from "node:fs";
import path from "node:path";
import { chromium } from "file:///C:/Users/aksha/.gemini/config/skills/auto-qa/node_modules/playwright/index.mjs";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR =
  "C:/Users/aksha/.gemini/antigravity/brain/4c775dc3-76d8-4b42-a802-ca48e3deb1d8/prompt09_qa";
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");

const CHROME_CANDIDATES = [
  "C:\\Users\\aksha\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1254\\chrome-headless-shell-win64\\chrome-headless-shell.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const PRIMARY_ROUTES = [
  "/",
  "/analyze/sentiment",
  "/analyze/emotions",
  "/model-lab",
  "/datasets",
  "/documentation",
  "/technology",
];

const SWEEP_ROUTES = [...PRIMARY_ROUTES, "/does-not-exist-nlp-route"];

const SWEEP_VIEWPORTS = [
  { name: "360x800", width: 360, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

const GOEMOTIONS_28_LABELS = [
  "admiration",
  "amusement",
  "anger",
  "annoyance",
  "approval",
  "caring",
  "confusion",
  "curiosity",
  "desire",
  "disappointment",
  "disapproval",
  "disgust",
  "embarrassment",
  "excitement",
  "fear",
  "gratitude",
  "grief",
  "joy",
  "love",
  "nervousness",
  "optimism",
  "pride",
  "realization",
  "relief",
  "remorse",
  "sadness",
  "surprise",
  "neutral",
];

const HYDRATION_WARNING_RE =
  /hydration|did not match|text content does not match|there was an error while hydrating/i;

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

const report = {
  ok: false,
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  executablePath: "",
  outputDir: OUTPUT_DIR,
  reportPath: REPORT_PATH,
  summary: {
    totalAssertions: 0,
    passedAssertions: 0,
    failedAssertions: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    hydrationWarningCount: 0,
  },
  assertions: [],
  performanceMetrics: {},
  screenshots: [],
  consoleErrors: [],
  pageErrors: [],
  hydrationWarnings: [],
  fatalError: null,
};

function record(section, name, passed, details = "") {
  const entry = {
    section,
    name,
    passed: Boolean(passed),
    details: String(details ?? ""),
  };
  report.assertions.push(entry);
  return entry.passed;
}

async function runCheck(section, name, fn) {
  try {
    await fn();
  } catch (err) {
    record(section, name, false, `Unhandled error: ${err?.message || String(err)}`);
  }
}

function createExpectedConsoleFilter() {
  const state = {
    expectNotFound404: false,
    expectHttpFailure: false,
    expectNetworkAbort: false,
  };
  return {
    state,
    isExpectedConsoleError(text) {
      if (
        state.expectNotFound404 &&
        /^Failed to load resource: the server responded with a status of 404\b/.test(
          text,
        )
      ) {
        return true;
      }
      if (
        state.expectHttpFailure &&
        /^Failed to load resource: the server responded with a status of (500|503)\b/.test(
          text,
        )
      ) {
        return true;
      }
      if (
        state.expectNetworkAbort &&
        /^Failed to load resource: net::ERR_FAILED\b/.test(text)
      ) {
        return true;
      }
      return false;
    },
  };
}

function attachListeners(page, label, filter) {
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if ((type === "error" || type === "warning") && HYDRATION_WARNING_RE.test(text)) {
      report.hydrationWarnings.push({
        context: label,
        type,
        url: page.url(),
        text,
      });
    }
    if (type === "error") {
      if (filter?.isExpectedConsoleError?.(text)) {
        return;
      }
      report.consoleErrors.push({
        context: label,
        url: page.url(),
        text,
      });
    }
  });

  page.on("pageerror", (err) => {
    report.pageErrors.push({
      context: label,
      url: page.url(),
      message: err?.message || String(err),
    });
  });
}

async function saveScreenshot(page, filename) {
  const fullPath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  report.screenshots.push(fullPath);
  return fullPath;
}

async function preseedEntrySeen(context) {
  await context.addInitScript(() => {
    try {
      window.sessionStorage.setItem("nlp-lab-entry-seen", "1");
    } catch {
      // ignore storage errors in restricted contexts
    }
  });
}

async function dismissPreloaderIfVisible(page) {
  const preloader = page.locator(".entry-preloader-shell");
  const visible = await preloader.isVisible().catch(() => false);
  if (visible) {
    const skip = page.locator("button.entry-preloader-skip");
    await skip.waitFor({ state: "visible", timeout: 5000 });
    await skip.click();
    await preloader.waitFor({ state: "detached", timeout: 8000 });
  }
  return visible;
}

async function verifyRouteTransitionAndA11y(page, routeLabel, section) {
  const transition = page.locator(".route-transition");
  await page
    .locator('.route-transition[data-phase="idle"]')
    .waitFor({ state: "attached", timeout: 8000 });

  const transitionCount = await transition.count();
  const pointerEvents =
    transitionCount > 0
      ? await transition.first().evaluate((el) => getComputedStyle(el).pointerEvents)
      : "missing";

  await page
    .waitForFunction(
      () => {
        const main = document.querySelector("main");
        return Boolean(main && document.activeElement && main.contains(document.activeElement));
      },
      null,
      { timeout: 3000 },
    )
    .catch(() => false);

  const a11yMetrics = await page.evaluate(() => {
    const main = document.querySelector("main");
    const active = document.activeElement;
    return {
      focusInMain: Boolean(main && active && main.contains(active)),
      activeTag: active?.tagName ?? null,
      h1Count: document.querySelectorAll("h1").length,
    };
  });

  record(
    section,
    `Navigation (${routeLabel}): route-transition idle, pointer-events none, focus in main, single h1`,
    transitionCount === 1 &&
      pointerEvents === "none" &&
      a11yMetrics.focusInMain &&
      a11yMetrics.h1Count === 1,
    `transitionCount=${transitionCount}, pointerEvents=${pointerEvents}, focusInMain=${a11yMetrics.focusInMain} (${a11yMetrics.activeTag}), h1Count=${a11yMetrics.h1Count}`,
  );
}

async function waitForRouteSettled(page, route) {
  await page.locator("main h1").first().waitFor({ state: "visible", timeout: 15000 });
  if (route === "/") {
    await page
      .locator('.readiness-card[data-phase]:not([data-phase="checking"])')
      .waitFor({ state: "attached", timeout: 30000 })
      .catch(() => {});
  } else if (route === "/model-lab") {
    await page
      .locator("#track-amazon, .callout")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
  } else if (route === "/datasets") {
    await page
      .locator("#dataset-panel-amazon_reviews, .callout")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
  } else if (route === "/documentation") {
    await page
      .locator("#architecture-map")
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
  } else if (route === "/technology") {
    await page
      .locator(".tech-hero, .callout")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
  }
}

/* ============================================================================
 * 1. Functional & Navigation Workflows
 * ========================================================================== */
async function runFunctionalAndNavigationSuite(browser) {
  const section = "1-functional-navigation";

  // 1a. Fresh visit `/` -> EntryPreloader -> Skip -> reload skips repeat preloader
  await runCheck(section, "EntryPreloader fresh / + Skip + reload", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:preloader-home`, filter);
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      const preloader = page.locator(".entry-preloader-shell");
      await preloader.waitFor({ state: "visible", timeout: 8000 });
      const skipBtn = page.locator("button.entry-preloader-skip");
      await skipBtn.waitFor({ state: "visible", timeout: 5000 });
      await skipBtn.click();
      await preloader.waitFor({ state: "detached", timeout: 8000 });
      const afterSkipCount = await preloader.count();
      const sessionFlag = await page.evaluate(() =>
        window.sessionStorage.getItem("nlp-lab-entry-seen"),
      );

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const afterReloadCount = await preloader.count();

      record(
        section,
        "Fresh / shows EntryPreloader, Skip detaches cleanly, reload skips repeat preloader",
        afterSkipCount === 0 && sessionFlag === "1" && afterReloadCount === 0,
        `afterSkipCount=${afterSkipCount}, sessionFlag=${sessionFlag}, afterReloadCount=${afterReloadCount}`,
      );
    } finally {
      await context.close();
    }
  });

  // 1b. Fresh context opening secondary route `/datasets` directly -> EntryPreloader -> Skip -> reload skips
  await runCheck(section, "EntryPreloader fresh /datasets + Skip + reload", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:preloader-datasets`, filter);
    try {
      await page.goto(`${BASE_URL}/datasets`, { waitUntil: "domcontentloaded" });
      const preloader = page.locator(".entry-preloader-shell");
      await preloader.waitFor({ state: "visible", timeout: 8000 });
      await page.locator("button.entry-preloader-skip").click();
      await preloader.waitFor({ state: "detached", timeout: 8000 });
      const afterSkipCount = await preloader.count();

      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const afterReloadCount = await preloader.count();

      record(
        section,
        "Fresh /datasets shows EntryPreloader, Skip detaches cleanly, reload skips repeat preloader",
        afterSkipCount === 0 && afterReloadCount === 0,
        `afterSkipCount=${afterSkipCount}, afterReloadCount=${afterReloadCount}`,
      );
    } finally {
      await context.close();
    }
  });

  // 1c. Rapid navigation across all 7 primary routes + goBack / goForward
  await runCheck(section, "Rapid navigation + back/forward", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:rapid-nav`, filter);
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await waitForRouteSettled(page, "/");

      // Rapid burst clicks without waiting for transition animation between clicks
      await page.locator('#primary-nav a[href="/analyze/sentiment"]').click();
      await page.locator('#primary-nav a[href="/analyze/emotions"]').click();
      await page.locator('#primary-nav a[href="/model-lab"]').click();
      await page.waitForURL("**/model-lab", { timeout: 10000 });
      await waitForRouteSettled(page, "/model-lab");
      await verifyRouteTransitionAndA11y(page, "rapid-burst -> /model-lab", section);

      // Visit every primary route sequentially via #primary-nav (returning to / at end so all 7 are client-navigated)
      const routeSequence = [
        "/analyze/sentiment",
        "/analyze/emotions",
        "/model-lab",
        "/datasets",
        "/documentation",
        "/technology",
        "/",
      ];
      for (const route of routeSequence) {
        await page.locator(`#primary-nav a[href="${route}"]`).click();
        await page.waitForURL((url) => url.pathname === route, { timeout: 10000 });
        await waitForRouteSettled(page, route);
        await verifyRouteTransitionAndA11y(page, `nav -> ${route}`, section);
      }

      // History back & forward
      await page.goBack({ waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/technology", { timeout: 10000 });
      await waitForRouteSettled(page, "/technology");
      await verifyRouteTransitionAndA11y(page, "goBack -> /technology", section);

      await page.goForward({ waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
      await waitForRouteSettled(page, "/");
      await verifyRouteTransitionAndA11y(page, "goForward -> /", section);
    } finally {
      await context.close();
    }
  });

  // 1d. Readiness 4 states: live online, mocked degraded, mocked offline, mocked 500 -> unknown + API detail
  await runCheck(section, "Readiness 4 states", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:readiness`, filter);

    let mockMode = "live";
    try {
      await page.route("**/readiness", async (route) => {
        if (mockMode === "live") {
          await route.continue();
          return;
        }
        if (mockMode === "degraded") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              status: "degraded",
              models: {
                amazon_rating: { ready: true, error: null },
                go_emotions: {
                  ready: false,
                  error: "Mocked GoEmotions checkpoint unavailable",
                },
              },
            }),
          });
          return;
        }
        if (mockMode === "offline") {
          await route.abort("failed");
          return;
        }
        if (mockMode === "500") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              detail: "Mocked readiness backend failure",
            }),
          });
        }
      });

      // State 1: live online
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      const card = page.locator(".readiness-card");
      await page
        .locator('.readiness-card[data-phase="online"]')
        .waitFor({ state: "visible", timeout: 30000 });
      const onlineTitle = (await card.locator(".readiness-card__title").textContent()) ?? "";
      const readyLiCount = await card.locator('.status-list li[data-ready="true"]').count();
      record(
        section,
        "Readiness state 1/4: live online renders Both models ready",
        onlineTitle.includes("Both models ready") && readyLiCount === 2,
        `title="${onlineTitle.trim()}", readyLiCount=${readyLiCount}`,
      );

      // State 2: mocked degraded
      mockMode = "degraded";
      await card.getByRole("button", { name: "Check again" }).click();
      await page
        .locator('.readiness-card[data-phase="degraded"]')
        .waitFor({ state: "visible", timeout: 10000 });
      const degradedTitle = (await card.locator(".readiness-card__title").textContent()) ?? "";
      const degradedDetailVisible = await card
        .getByText("Mocked GoEmotions checkpoint unavailable")
        .isVisible();
      record(
        section,
        "Readiness state 2/4: mocked degraded renders Partly ready + model error",
        degradedTitle.includes("Partly ready") && degradedDetailVisible,
        `title="${degradedTitle.trim()}", detailVisible=${degradedDetailVisible}`,
      );

      // State 3: mocked offline (route.abort)
      mockMode = "offline";
      filter.state.expectNetworkAbort = true;
      try {
        await card.getByRole("button", { name: "Check again" }).click();
        await page
          .locator('.readiness-card[data-phase="offline"]')
          .waitFor({ state: "visible", timeout: 10000 });
      } finally {
        filter.state.expectNetworkAbort = false;
      }
      const offlineTitle = (await card.locator(".readiness-card__title").textContent()) ?? "";
      const offlineCalloutVisible = await card.locator('.status-error[role="alert"]').isVisible();
      record(
        section,
        "Readiness state 3/4: mocked offline (route.abort) renders API unreachable alert",
        offlineTitle.includes("API unreachable") && offlineCalloutVisible,
        `title="${offlineTitle.trim()}", alertVisible=${offlineCalloutVisible}`,
      );

      // State 4: mocked 500 JSON failure -> data-phase="unknown" + API error detail
      mockMode = "500";
      filter.state.expectHttpFailure = true;
      try {
        await card.getByRole("button", { name: "Check again" }).click();
        await page
          .locator('.readiness-card[data-phase="unknown"]')
          .waitFor({ state: "visible", timeout: 10000 });
      } finally {
        filter.state.expectHttpFailure = false;
      }
      const unknownTitle = (await card.locator(".readiness-card__title").textContent()) ?? "";
      const unknownText = (await card.locator('.status-error[role="status"]').textContent()) ?? "";
      record(
        section,
        'Readiness state 4/4: mocked 500 JSON renders data-phase="unknown" + API error detail',
        unknownTitle.includes("Readiness unclear") &&
          unknownText.includes("500") &&
          unknownText.includes("Mocked readiness backend failure"),
        `title="${unknownTitle.trim()}", detail="${unknownText.trim()}"`,
      );
    } finally {
      await context.close();
    }
  });

  // 1e. Sentiment workflows: live success, mocked 500 + Retry, mocked 4.3s stalled loader, malformed "not json"
  await runCheck(section, "Sentiment workflows", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:sentiment`, filter);

    let sentimentMode = "live";
    try {
      await page.route("**/predict/amazon", async (route) => {
        if (sentimentMode === "live") {
          await route.continue();
          return;
        }
        if (sentimentMode === "500_once") {
          sentimentMode = "live";
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              detail: "Mocked 500 sentiment inference error",
            }),
          });
          return;
        }
        if (sentimentMode === "slow_4300") {
          await new Promise((resolve) => setTimeout(resolve, 5200));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              rating: 5,
              probabilities: [0.01, 0.02, 0.04, 0.13, 0.8],
            }),
          });
          return;
        }
        if (sentimentMode === "malformed_json") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: "not json",
          });
        }
      });

      await page.goto(`${BASE_URL}/analyze/sentiment`, { waitUntil: "domcontentloaded" });
      await page.locator("#analysis-text").waitFor({ state: "visible", timeout: 10000 });

      // 1) Successful live prediction
      await page.getByRole("button", { name: "5-star positive" }).click();
      const inputValue = await page.locator("#analysis-text").inputValue();
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      const resultCard = page.locator(".result-card");
      await resultCard.waitFor({ state: "visible", timeout: 30000 });
      const ratingText = ((await resultCard.locator(".prediction").textContent()) ?? "").trim();
      const meterCount = await resultCard.locator("progress").count();
      record(
        section,
        "Sentiment live prediction succeeds with rating and 5 meters",
        /^[1-5]\s*\/\s*5$/.test(ratingText) && meterCount === 5,
        `rating=${ratingText}, meters=${meterCount}`,
      );

      // 2) Mocked 500 preserves input + clears .analysis-loader + Retry succeeds
      sentimentMode = "500_once";
      filter.state.expectHttpFailure = true;
      try {
        await page.getByRole("button", { name: "Analyze sentiment" }).click();
        await page
          .locator('.analysis-error[data-state="api_error"]')
          .waitFor({ state: "visible", timeout: 10000 });
      } finally {
        filter.state.expectHttpFailure = false;
      }
      const preservedInput = await page.locator("#analysis-text").inputValue();
      const loaderAfter500 = await page.locator(".analysis-loader").count();
      const error500Text =
        ((await page.locator(".analysis-error").textContent()) ?? "").trim();

      await page.getByRole("button", { name: "Retry analysis" }).click();
      await page.locator(".analysis-error").waitFor({ state: "detached", timeout: 30000 });
      await resultCard.waitFor({ state: "visible", timeout: 30000 });
      const errorAfterRetry = await page.locator(".analysis-error").count();
      const loaderAfterRetry = await page.locator(".analysis-loader").count();
      record(
        section,
        "Sentiment mocked 500 preserves input, clears .analysis-loader, and Retry succeeds",
        preservedInput === inputValue &&
          loaderAfter500 === 0 &&
          error500Text.includes("Mocked 500 sentiment inference error") &&
          errorAfterRetry === 0 &&
          loaderAfterRetry === 0,
        `preserved=${preservedInput === inputValue}, loaderAfter500=${loaderAfter500}, errorAfterRetry=${errorAfterRetry}, loaderAfterRetry=${loaderAfterRetry}`,
      );

      // 3) Mocked 4.3s slow response triggers stalled loader state
      sentimentMode = "slow_4300";
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      const stalledLoader = page.locator('.analysis-loader[data-stalled="true"]');
      await stalledLoader.waitFor({ state: "visible", timeout: 7000 });
      const stalledCopyVisible = await stalledLoader
        .getByText("Inference is taking longer than usual", { exact: false })
        .isVisible();
      await stalledLoader.waitFor({ state: "detached", timeout: 10000 });
      await resultCard.waitFor({ state: "visible", timeout: 10000 });
      const loaderAfterSlow = await page.locator(".analysis-loader").count();
      record(
        section,
        "Sentiment mocked 4.3s slow response triggers stalled loader state and resolves cleanly",
        stalledCopyVisible && loaderAfterSlow === 0,
        `stalledCopyVisible=${stalledCopyVisible}, loaderAfterSlow=${loaderAfterSlow}`,
      );

      // 4) Malformed "not json" response triggers clean error without crash
      sentimentMode = "malformed_json";
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      const malformedErr = page.locator('.analysis-error[data-state="api_error"]');
      await malformedErr.waitFor({ state: "visible", timeout: 10000 });
      const loaderAfterMalformed = await page.locator(".analysis-loader").count();
      const inputStillPreserved = (await page.locator("#analysis-text").inputValue()) === inputValue;
      record(
        section,
        'Sentiment malformed "not json" response triggers clean error without crash',
        (await malformedErr.isVisible()) && loaderAfterMalformed === 0 && inputStillPreserved,
        `loaderCount=${loaderAfterMalformed}, inputPreserved=${inputStillPreserved}`,
      );
    } finally {
      await context.close();
    }
  });

  // 1f. Emotions workflows: live success, mocked 0-threshold-crossing 28 probs, mocked 500 + Retry
  await runCheck(section, "Emotions workflows", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:emotions`, filter);

    let emotionsMode = "live";
    try {
      await page.route("**/predict/go-emotions", async (route) => {
        if (emotionsMode === "live") {
          await route.continue();
          return;
        }
        if (emotionsMode === "zero_cross") {
          const probabilities = {};
          GOEMOTIONS_28_LABELS.forEach((label, idx) => {
            probabilities[label] = Number((0.24 - idx * 0.007).toFixed(3));
          });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              emotions: [],
              probabilities,
              threshold: 0.3,
            }),
          });
          return;
        }
        if (emotionsMode === "500_once") {
          emotionsMode = "live";
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              detail: "Mocked 500 GoEmotions error",
            }),
          });
        }
      });

      await page.goto(`${BASE_URL}/analyze/emotions`, { waitUntil: "domcontentloaded" });
      await page.locator("#analysis-text").waitFor({ state: "visible", timeout: 10000 });

      // 1) Successful live prediction
      await page.getByRole("button", { name: "Admiration / gratitude" }).click();
      await page.getByRole("button", { name: "Analyze emotions" }).click();
      const resultCard = page.locator(".result-card");
      await resultCard.waitFor({ state: "visible", timeout: 30000 });
      const badgeCount = await resultCard
        .locator('[aria-label="Detected emotion labels"] .badge')
        .count();
      record(
        section,
        "Emotions live prediction renders detected emotion badges",
        badgeCount >= 1,
        `detectedBadges=${badgeCount}`,
      );

      // 2) Mocked 0-threshold-crossing prediction (threshold: 0.3, all 28 probs < 0.3)
      emotionsMode = "zero_cross";
      await page.getByRole("button", { name: "Neutral / dry" }).click();
      await page.getByRole("button", { name: "Analyze emotions" }).click();
      await resultCard
        .locator(".callout__title", { hasText: "No labels crossed the saved threshold" })
        .waitFor({ state: "visible", timeout: 10000 });
      const zeroDetectedCount = await resultCard
        .locator('[aria-label="Detected emotion labels"]')
        .count();
      const scoreRowsCount = await resultCard.locator(".emotion-row").count();
      const hasThreshold030 = await resultCard.getByText("Active threshold: 0.30").isVisible();
      record(
        section,
        "Emotions mocked 0-threshold-crossing (28 probs < 0.3) shows explicit empty threshold notice",
        zeroDetectedCount === 0 && scoreRowsCount === 28 && hasThreshold030,
        `detectedBadgeGroups=${zeroDetectedCount}, scoreRows=${scoreRowsCount}, threshold030=${hasThreshold030}`,
      );

      // 3) Mocked 500 + Retry succeeds with zero lingering loader
      emotionsMode = "500_once";
      filter.state.expectHttpFailure = true;
      try {
        await page.getByRole("button", { name: "Analyze emotions" }).click();
        await page
          .locator('.analysis-error[data-state="api_error"]')
          .waitFor({ state: "visible", timeout: 10000 });
      } finally {
        filter.state.expectHttpFailure = false;
      }
      const loaderAfter500 = await page.locator(".analysis-loader").count();
      await page.getByRole("button", { name: "Retry analysis" }).click();
      await page.locator(".analysis-error").waitFor({ state: "detached", timeout: 30000 });
      await resultCard.waitFor({ state: "visible", timeout: 30000 });
      const errorAfterRetry = await page.locator(".analysis-error").count();
      const loaderAfterRetry = await page.locator(".analysis-loader").count();
      record(
        section,
        "Emotions mocked 500 + Retry succeeds with zero lingering loader",
        loaderAfter500 === 0 && errorAfterRetry === 0 && loaderAfterRetry === 0,
        `loaderAfter500=${loaderAfter500}, errorAfterRetry=${errorAfterRetry}, loaderAfterRetry=${loaderAfterRetry}`,
      );
    } finally {
      await context.close();
    }
  });

  // 1g. Technology marquee: focus inside marquee + Pause showcase Space/Enter toggle
  await runCheck(section, "Technology marquee keyboard focus & toggle", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:marquee`, filter);

    try {
      await page.goto(`${BASE_URL}/technology`, { waitUntil: "domcontentloaded" });
      await page.locator(".tech-marquee").waitFor({ state: "visible", timeout: 15000 });

      const toggleBtn = page.locator("button.tech-hero__toggle");
      await toggleBtn.focus();
      const focusAndPlayState = await page.evaluate(() => {
        const marquee = document.querySelector(".tech-marquee");
        const track = document.querySelector(".tech-marquee__track");
        return {
          focusInsideMarquee: Boolean(marquee && marquee.contains(document.activeElement)),
          playStateOnFocus: track ? getComputedStyle(track).animationPlayState : null,
        };
      });

      await page.keyboard.press("Space");
      const afterSpacePressed = await toggleBtn.getAttribute("aria-pressed");
      const afterSpacePaused = await page.locator(".tech-marquee").getAttribute("data-paused");

      await page.keyboard.press("Enter");
      const afterEnterResumePressed = await toggleBtn.getAttribute("aria-pressed");
      const afterEnterResumePaused = await page
        .locator(".tech-marquee")
        .getAttribute("data-paused");

      await page.keyboard.press("Enter");
      const afterEnterPausePressed = await toggleBtn.getAttribute("aria-pressed");
      const afterEnterPausePaused = await page
        .locator(".tech-marquee")
        .getAttribute("data-paused");

      record(
        section,
        'Technology marquee focus-within pauses track and Space/Enter toggle aria-pressed="true" & data-paused="true"',
        focusAndPlayState.focusInsideMarquee &&
          focusAndPlayState.playStateOnFocus === "paused" &&
          afterSpacePressed === "true" &&
          afterSpacePaused === "true" &&
          afterEnterResumePressed === "false" &&
          afterEnterResumePaused === "false" &&
          afterEnterPausePressed === "true" &&
          afterEnterPausePaused === "true",
        `focusInside=${focusAndPlayState.focusInsideMarquee}, playStateOnFocus=${focusAndPlayState.playStateOnFocus}, space=${afterSpacePressed}/${afterSpacePaused}, enterResume=${afterEnterResumePressed}/${afterEnterResumePaused}, enterPause=${afterEnterPausePressed}/${afterEnterPausePaused}`,
      );
    } finally {
      await context.close();
    }
  });
}

/* ============================================================================
 * 2. Responsive 6-Viewport Sweep (48 viewport-route checks + screenshots)
 * ========================================================================== */
async function runResponsiveSweepSuite(browser) {
  const section = "2-responsive-sweep";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await preseedEntrySeen(context);
  const page = await context.newPage();
  const filter = createExpectedConsoleFilter();
  attachListeners(page, section, filter);

  try {
    for (const vp of SWEEP_VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of SWEEP_ROUTES) {
        const isNotFound = route === "/does-not-exist-nlp-route";
        filter.state.expectNotFound404 = isNotFound;
        try {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
          await waitForRouteSettled(page, route);
          await page.waitForTimeout(250);

          const footer = page.locator("#site-footer");
          await footer.scrollIntoViewIfNeeded();
          const footerVisible = await footer.isVisible();

          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);

          const layoutMetrics = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            h1Count: document.querySelectorAll("h1").length,
          }));

          record(
            section,
            `Sweep ${vp.name} ${route}: no horizontal overflow, single h1, visible footer`,
            layoutMetrics.scrollWidth <= layoutMetrics.innerWidth &&
              layoutMetrics.h1Count === 1 &&
              footerVisible,
            `scrollWidth=${layoutMetrics.scrollWidth}, innerWidth=${layoutMetrics.innerWidth}, h1Count=${layoutMetrics.h1Count}, footerVisible=${footerVisible}`,
          );

          if (vp.name === "1920x1080" && route === "/") {
            await page.waitForTimeout(350);
            await saveScreenshot(page, "desktop-1920-home.png");
          } else if (vp.name === "768x1024" && route === "/technology") {
            await page.waitForTimeout(350);
            await saveScreenshot(page, "tablet-768-technology.png");
          } else if (vp.name === "360x800" && route === "/analyze/sentiment") {
            await page.waitForTimeout(350);
            await saveScreenshot(page, "mobile-360-sentiment.png");
          }
        } catch (err) {
          record(
            section,
            `Sweep ${vp.name} ${route}: no horizontal overflow, single h1, visible footer`,
            false,
            `Error: ${err?.message || String(err)}`,
          );
        } finally {
          filter.state.expectNotFound404 = false;
        }
      }
    }
  } finally {
    await context.close();
  }
}

/* ============================================================================
 * 3. /break-ui & Stress Suite
 * ========================================================================== */
async function runBreakUiAndStressSuite(browser) {
  const section = "3-break-ui-stress";

  // 3a. 10,000-char prompt + whitespace-only blocked + long unbroken URL wrap on /analyze/sentiment
  await runCheck(section, "Sentiment 10k chars, whitespace block & long URL wrap", async () => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:sentiment-stress`, filter);

    let predictPostCount = 0;
    page.on("request", (req) => {
      if (req.url().includes("/predict/amazon") && req.method() === "POST") {
        predictPostCount += 1;
      }
    });

    try {
      await page.goto(`${BASE_URL}/analyze/sentiment`, { waitUntil: "domcontentloaded" });
      const textarea = page.locator("#analysis-text");
      await textarea.waitFor({ state: "visible", timeout: 10000 });

      // 1) Whitespace-only blocked cleanly without firing network request
      const requestsBeforeWhitespace = predictPostCount;
      await textarea.fill("   \n\t  ");
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      const validationAlert = page.locator('#analysis-validation-error[role="alert"]');
      await validationAlert.waitFor({ state: "visible", timeout: 5000 });
      const validationText = ((await validationAlert.textContent()) ?? "").trim();
      record(
        section,
        "Whitespace-only prompt blocked cleanly without network call",
        validationText.includes("Input required") && predictPostCount === requestsBeforeWhitespace,
        `alert="${validationText}", postCountDelta=${predictPostCount - requestsBeforeWhitespace}`,
      );

      // 2) Exact 10,000-character prompt -> counter 10,000 / 10,000 + prediction renders + no overflow
      const tenKPrompt = "Word ".repeat(2000).trim().padEnd(10000, "x");
      await textarea.fill(tenKPrompt);
      const countText = ((await page.locator("#analysis-count").textContent()) ?? "").trim();
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      const resultCard = page.locator(".result-card");
      await resultCard.waitFor({ state: "visible", timeout: 30000 });
      const tenKMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        hasPrediction: Boolean(document.querySelector(".result-card .prediction")?.textContent),
      }));
      record(
        section,
        "10,000-character prompt shows 10,000 / 10,000 counter, renders prediction, and has zero overflow",
        tenKPrompt.length === 10000 &&
          countText.includes("10,000 / 10,000") &&
          tenKMetrics.hasPrediction &&
          tenKMetrics.scrollWidth <= tenKMetrics.innerWidth,
        `len=${tenKPrompt.length}, counter="${countText}", scrollWidth=${tenKMetrics.scrollWidth}/${tenKMetrics.innerWidth}`,
      );

      // 3) Long unbroken URL prompt -> submitted review box stays scrollWidth <= innerWidth
      const longUrlPrompt =
        "https://northwind-industries-holdings.example.com/extremely-long-unbroken-segment-for-break-ui-wrap-verification";
      await textarea.fill(longUrlPrompt);
      await page.getByRole("button", { name: "Analyze sentiment" }).click();
      await resultCard
        .locator(".result-context__text")
        .getByText("northwind-industries-holdings", { exact: false })
        .waitFor({ state: "visible", timeout: 30000 });
      const urlWrapMetrics = await page.evaluate(() => {
        const ctxText = document.querySelector(".result-context__text");
        return {
          docScrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          boxScrollWidth: ctxText ? ctxText.scrollWidth : 0,
          boxClientWidth: ctxText ? ctxText.clientWidth : 0,
        };
      });
      record(
        section,
        "Long unbroken URL prompt wraps inside submitted review box without horizontal overflow",
        urlWrapMetrics.docScrollWidth <= urlWrapMetrics.innerWidth &&
          urlWrapMetrics.boxScrollWidth <= urlWrapMetrics.innerWidth,
        `doc=${urlWrapMetrics.docScrollWidth}/${urlWrapMetrics.innerWidth}, boxScroll=${urlWrapMetrics.boxScrollWidth}, boxClient=${urlWrapMetrics.boxClientWidth}`,
      );
    } finally {
      await context.close();
    }
  });

  // 3b. Mocked GoEmotions all-28-label output with very long hyphenated label key -> zero overflow
  await runCheck(section, "Emotions 28-label long hyphenated key wrap", async () => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:emotions-long-key`, filter);

    const longLabel =
      "extraordinarily-disappointed-and-overwhelmed-beyond-reasonable-expectations-for-break-ui-wrap-testing";

    try {
      await page.route("**/predict/go-emotions", async (route) => {
        const probabilities = { [longLabel]: 0.91 };
        const baseLabels = GOEMOTIONS_28_LABELS.slice(0, 27);
        baseLabels.forEach((label, idx) => {
          probabilities[label] = idx < 2 ? Number((0.72 - idx * 0.1).toFixed(2)) : Number((0.25 - idx * 0.008).toFixed(3));
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            emotions: [
              { label: longLabel, probability: 0.91 },
              { label: baseLabels[0], probability: 0.72 },
              { label: baseLabels[1], probability: 0.62 },
            ],
            probabilities,
            threshold: 0.3,
          }),
        });
      });

      await page.goto(`${BASE_URL}/analyze/emotions`, { waitUntil: "domcontentloaded" });
      await page.locator("#analysis-text").fill("Stress test 28 labels with long hyphenated key.");
      await page.getByRole("button", { name: "Analyze emotions" }).click();
      const resultCard = page.locator(".result-card");
      await resultCard.waitFor({ state: "visible", timeout: 15000 });
      await resultCard.getByText(longLabel, { exact: false }).first().waitFor({
        state: "visible",
        timeout: 5000,
      });

      const metrics = await page.evaluate(() => ({
        rowCount: document.querySelectorAll(".emotion-row").length,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      record(
        section,
        "Mocked GoEmotions all-28-label output with long hyphenated key has zero overflow",
        metrics.rowCount === 28 && metrics.scrollWidth <= metrics.innerWidth,
        `rows=${metrics.rowCount}, scrollWidth=${metrics.scrollWidth}/${metrics.innerWidth}`,
      );
    } finally {
      await context.close();
    }
  });

  // 3c. Aborted /tech/python.svg -> .tech-marquee__monogram fallback renders cleanly (PY) with 0 broken images
  await runCheck(section, "Aborted /tech/python.svg monogram fallback", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:svg-abort`, filter);

    try {
      await page.route("**/tech/python.svg", async (route) => {
        await route.abort("failed");
      });

      filter.state.expectNetworkAbort = true;
      await page.goto(`${BASE_URL}/technology`, { waitUntil: "domcontentloaded" });
      await page.locator(".tech-marquee").waitFor({ state: "visible", timeout: 15000 });

      // Force lazy-loaded images into view so python.svg attempts fetch and triggers onError fallback
      await page.evaluate(() => {
        for (const img of document.querySelectorAll('img[src="/tech/python.svg"]')) {
          img.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        }
      });
      await page
        .locator(".tech-marquee__monogram", { hasText: "PY" })
        .first()
        .waitFor({ state: "visible", timeout: 10000 });

      // Scroll stack inventory logos into view to confirm every remaining <img> loads cleanly
      const cardImgs = page.locator("#stack-inventory .tech-card__logo-img");
      const cardImgCount = await cardImgs.count();
      for (let i = 0; i < cardImgCount; i += 1) {
        await cardImgs.nth(i).scrollIntoViewIfNeeded();
      }
      await page.waitForTimeout(300);

      const imageAudit = await page.evaluate(() => {
        const monograms = Array.from(document.querySelectorAll(".tech-marquee__monogram")).map(
          (el) => el.textContent?.trim(),
        );
        const imgs = Array.from(document.querySelectorAll("img"));
        const broken = imgs
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.getAttribute("src"));
        return {
          hasPyMonogram: monograms.includes("PY"),
          totalImgs: imgs.length,
          brokenCount: broken.length,
          broken,
        };
      });

      record(
        section,
        "Aborted /tech/python.svg falls back to .tech-marquee__monogram (PY) with 0 broken images",
        imageAudit.hasPyMonogram && imageAudit.brokenCount === 0,
        `hasPyMonogram=${imageAudit.hasPyMonogram}, totalImgs=${imageAudit.totalImgs}, broken=${JSON.stringify(imageAudit.broken)}`,
      );
    } finally {
      filter.state.expectNetworkAbort = false;
      await context.close();
    }
  });

  // 3d. Zoom 200% (deviceScaleFactor: 2, viewport: 640x400 effective 1280x800@200%) across /, /analyze/sentiment, /technology
  await runCheck(section, "Zoom 200% effective layout", async () => {
    const context = await browser.newContext({
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: 2,
    });
    await preseedEntrySeen(context);
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:zoom200`, filter);

    try {
      // /
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await waitForRouteSettled(page, "/");
      const homePrimaryVisible = await page
        .locator('a[href="/analyze/sentiment"]')
        .first()
        .isVisible();
      const homeMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      record(
        section,
        "Zoom 200% (640x400 @2x) /: primary controls visible & zero horizontal overflow",
        homePrimaryVisible && homeMetrics.scrollWidth <= homeMetrics.innerWidth,
        `primaryVisible=${homePrimaryVisible}, scrollWidth=${homeMetrics.scrollWidth}/${homeMetrics.innerWidth}`,
      );

      // /analyze/sentiment
      await page.goto(`${BASE_URL}/analyze/sentiment`, { waitUntil: "domcontentloaded" });
      await waitForRouteSettled(page, "/analyze/sentiment");
      const textareaVisible = await page.locator("#analysis-text").isVisible();
      const submitVisible = await page
        .getByRole("button", { name: "Analyze sentiment" })
        .isVisible();
      const sentimentMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      await page.waitForTimeout(250);
      await saveScreenshot(page, "zoom200-analyzer.png");
      record(
        section,
        "Zoom 200% (640x400 @2x) /analyze/sentiment: primary controls visible & zero horizontal overflow",
        textareaVisible &&
          submitVisible &&
          sentimentMetrics.scrollWidth <= sentimentMetrics.innerWidth,
        `textarea=${textareaVisible}, submit=${submitVisible}, scrollWidth=${sentimentMetrics.scrollWidth}/${sentimentMetrics.innerWidth}`,
      );

      // /technology
      await page.goto(`${BASE_URL}/technology`, { waitUntil: "domcontentloaded" });
      await waitForRouteSettled(page, "/technology");
      const toggleVisible = await page.locator("button.tech-hero__toggle").isVisible();
      const allTabVisible = await page.locator("#tech-tab-all").isVisible();
      const techMetrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      record(
        section,
        "Zoom 200% (640x400 @2x) /technology: primary controls visible & zero horizontal overflow",
        toggleVisible && allTabVisible && techMetrics.scrollWidth <= techMetrics.innerWidth,
        `toggle=${toggleVisible}, allTab=${allTabVisible}, scrollWidth=${techMetrics.scrollWidth}/${techMetrics.innerWidth}`,
      );
    } finally {
      await context.close();
    }
  });
}

/* ============================================================================
 * 4. Motion, Hydration & Real Browser Performance / CDP Trace
 * ========================================================================== */
async function runMotionAndPerformanceSuite(browser) {
  const section = "4-motion-hydration-perf";

  // 4a. prefers-reduced-motion: reduce bypasses EntryPreloader and hides .tech-marquee__list--clone
  await runCheck(section, "Reduced motion bypasses preloader and hides marquee clone", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:reduced-motion`, filter);

    try {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page
        .locator('[data-reduced-motion="true"]')
        .waitFor({ state: "attached", timeout: 5000 });
      const preloaderCount = await page.locator(".entry-preloader-shell").count();

      await page.goto(`${BASE_URL}/technology`, { waitUntil: "networkidle" });
      await page.locator(".tech-marquee").waitFor({ state: "visible", timeout: 15000 });
      const cloneCount = await page.locator(".tech-marquee__list--clone").count();
      const cloneVisible =
        cloneCount > 0 ? await page.locator(".tech-marquee__list--clone").first().isVisible() : false;

      record(
        section,
        "prefers-reduced-motion: reduce bypasses EntryPreloader and hides .tech-marquee__list--clone",
        preloaderCount === 0 && !cloneVisible,
        `preloaderCount=${preloaderCount}, cloneCount=${cloneCount}, cloneVisible=${cloneVisible}`,
      );
    } finally {
      await context.close();
    }
  });

  // 4b. CDP Performance.getMetrics + Navigation Timing + FCP + CLS across /, /datasets, /technology
  await runCheck(section, "CDP metrics, navigation timings, FCP & CLS", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await preseedEntrySeen(context);
    await context.addInitScript(() => {
      window.__prompt09Cls = 0;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__prompt09Cls += entry.value;
            }
          }
        });
        observer.observe({ type: "layout-shift", buffered: true });
      } catch {
        // PerformanceObserver layout-shift unsupported fallback
      }
    });

    const page = await context.newPage();
    const filter = createExpectedConsoleFilter();
    attachListeners(page, `${section}:cdp-perf`, filter);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");

    try {
      for (const route of ["/", "/datasets", "/technology"]) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
        await waitForRouteSettled(page, route);
        await page.waitForTimeout(500);

        const cdpResponse = await cdp.send("Performance.getMetrics");
        const metricMap = Object.fromEntries(
          cdpResponse.metrics.map((m) => [m.name, m.value]),
        );

        const perfTiming = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const paints = performance.getEntriesByType("paint");
          const fcpEntry = paints.find((p) => p.name === "first-contentful-paint");
          return {
            domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
            loadEventEnd: nav ? Math.round(nav.loadEventEnd) : null,
            fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
            cls: Number((window.__prompt09Cls ?? 0).toFixed(5)),
          };
        });

        const entry = {
          cdp: {
            JSHeapUsedSize: metricMap.JSHeapUsedSize ?? null,
            Nodes: metricMap.Nodes ?? null,
            LayoutCount: metricMap.LayoutCount ?? null,
          },
          navigation: {
            domContentLoaded: perfTiming.domContentLoaded,
            loadEventEnd: perfTiming.loadEventEnd,
            fcp: perfTiming.fcp,
          },
          cls: perfTiming.cls,
        };
        report.performanceMetrics[route] = entry;

        record(
          section,
          `Performance & CLS (${route}): CLS < 0.1 and valid CDP/navigation metrics`,
          perfTiming.cls < 0.1 &&
            typeof entry.cdp.JSHeapUsedSize === "number" &&
            typeof entry.cdp.Nodes === "number" &&
            typeof entry.cdp.LayoutCount === "number" &&
            perfTiming.domContentLoaded !== null &&
            perfTiming.loadEventEnd !== null,
          `CLS=${perfTiming.cls}, DCL=${perfTiming.domContentLoaded}ms, load=${perfTiming.loadEventEnd}ms, FCP=${perfTiming.fcp}ms, JSHeap=${entry.cdp.JSHeapUsedSize}, Nodes=${entry.cdp.Nodes}, LayoutCount=${entry.cdp.LayoutCount}`,
        );
      }
    } finally {
      await cdp.detach().catch(() => {});
      await context.close();
    }
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const executablePath = resolveExecutablePath();
  report.executablePath = executablePath;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    await runFunctionalAndNavigationSuite(browser);
    await runResponsiveSweepSuite(browser);
    await runBreakUiAndStressSuite(browser);
    await runMotionAndPerformanceSuite(browser);
  } catch (err) {
    report.fatalError = err?.message || String(err);
  } finally {
    await browser.close();
  }

  record(
    "global",
    "Zero unexpected console errors, zero pageerror exceptions, and zero React hydration warnings",
    report.consoleErrors.length === 0 &&
      report.pageErrors.length === 0 &&
      report.hydrationWarnings.length === 0,
    `consoleErrors=${report.consoleErrors.length}, pageErrors=${report.pageErrors.length}, hydrationWarnings=${report.hydrationWarnings.length}`,
  );

  const passedAssertions = report.assertions.filter((item) => item.passed).length;
  const totalAssertions = report.assertions.length;
  const failedAssertions = totalAssertions - passedAssertions;

  report.summary = {
    totalAssertions,
    passedAssertions,
    failedAssertions,
    consoleErrorCount: report.consoleErrors.length,
    pageErrorCount: report.pageErrors.length,
    hydrationWarningCount: report.hydrationWarnings.length,
  };
  report.ok =
    !report.fatalError &&
    failedAssertions === 0 &&
    report.consoleErrors.length === 0 &&
    report.pageErrors.length === 0 &&
    report.hydrationWarnings.length === 0;

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n## Prompt 09 Browser QA Summary\n");
  console.log(
    `- Status: ${report.ok ? "PASSED" : "FAILED"} (${passedAssertions}/${totalAssertions} assertions)`,
  );
  console.log(`- Target: ${BASE_URL}`);
  console.log(`- Browser: ${executablePath}`);
  console.log(`- Report: ${REPORT_PATH}`);
  console.log(`- Console errors: ${report.consoleErrors.length}`);
  console.log(`- Page errors: ${report.pageErrors.length}`);
  console.log(`- Hydration warnings: ${report.hydrationWarnings.length}`);
  if (report.fatalError) {
    console.log(`- Fatal error: ${report.fatalError}`);
  }
  console.log("\n### Assertions");
  for (const item of report.assertions) {
    console.log(
      `- [${item.passed ? "PASS" : "FAIL"}] (${item.section}) ${item.name} — ${item.details}`,
    );
  }
  console.log("\n### Screenshots");
  for (const file of report.screenshots) {
    console.log(`- ${file}`);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
