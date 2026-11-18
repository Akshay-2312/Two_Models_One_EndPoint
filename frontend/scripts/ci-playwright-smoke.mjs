import fs from "node:fs";

const BASE_URL =
  process.env.CI_SMOKE_BASE_URL ||
  process.env.QA_BASE_URL ||
  "http://localhost:3000";

const PLAYWRIGHT_MODULE = process.env.PLAYWRIGHT_MODULE || "playwright";

function resolveOptionalExecutablePath() {
  const envPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  return undefined;
}

const results = {
  baseUrl: BASE_URL,
  playwrightModule: PLAYWRIGHT_MODULE,
  assertions: [],
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
};

function record(name, passed, details = "") {
  results.assertions.push({ name, passed: Boolean(passed), details });
  if (!passed) {
    throw new Error(`Assertion failed [${name}]: ${details}`);
  }
}

function attachErrorListeners(page, label) {
  let sawPredict503 = false;
  let expectingNotFound404 = false;

  page.on("response", (response) => {
    try {
      const url = response.url();
      const status = response.status();
      if (status === 503 && /\/predict\/(?:amazon|go-emotions)\b/.test(url)) {
        sawPredict503 = true;
        return;
      }
      if (
        expectingNotFound404 &&
        status === 404 &&
        new URL(url).pathname === "/does-not-exist-nlp-route"
      ) {
        return;
      }
      if (status >= 400) {
        results.httpErrors.push({
          context: label,
          pageUrl: page.url(),
          resourceUrl: url,
          status,
        });
      }
    } catch {
      // Ignore transient response inspection errors during page close.
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        sawPredict503 &&
        /^Failed to load resource: the server responded with a status of 503\b/.test(
          text,
        )
      ) {
        return;
      }
      if (
        expectingNotFound404 &&
        /^Failed to load resource: the server responded with a status of 404\b/.test(
          text,
        )
      ) {
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

  return {
    setExpectingNotFound404(value) {
      expectingNotFound404 = Boolean(value);
    },
  };
}

async function dismissPreloaderIfPresent(page, { requireVisible = false } = {}) {
  const preloader = page.locator(".entry-preloader-shell");
  if (requireVisible) {
    await preloader.waitFor({ state: "visible", timeout: 8000 });
  } else {
    await preloader.waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
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
    await page
      .locator('.route-transition[data-phase="idle"]')
      .waitFor({ state: "attached", timeout: 8000 });
    const pointerEvents = await transition.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    record(
      `route-transition pointer-events (${page.url()})`,
      pointerEvents === "none",
      `computed pointer-events=${pointerEvents}`,
    );
  }
}

async function checkNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  record(
    `no horizontal overflow (${label})`,
    metrics.scrollWidth <= metrics.innerWidth,
    `scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth}`,
  );
}

async function verifyDashboardReadiness(page, label) {
  const settledCard = page.locator(
    '.readiness-card[data-phase="online"], .readiness-card[data-phase="degraded"]',
  );
  await settledCard.waitFor({ state: "visible", timeout: 30000 });
  const phase = await settledCard.getAttribute("data-phase");
  const modelRows = await page.locator(".status-list li").count();
  record(
    `${label} / readiness reports live backend status (${phase})`,
    (phase === "online" || phase === "degraded") && modelRows === 2,
    `phase=${phase}, modelRows=${modelRows}`,
  );
}

async function runDesktopPass(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const errorControl = attachErrorListeners(page, "desktop");

  try {
    // 1. Dashboard `/`
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const sawPreloader = await dismissPreloaderIfPresent(page, {
      requireVisible: true,
    });
    record(
      "desktop / EntryPreloader renders & Skip dismisses cleanly",
      sawPreloader && (await page.locator(".entry-preloader-shell").count()) === 0,
      `sawPreloader=${sawPreloader}`,
    );
    await verifyDashboardReadiness(page, "desktop");
    await checkNoHorizontalOverflow(page, "desktop /");

    // 2. `/analyze/sentiment` (CI-safe: validation + sample prompt + Clear, no weights required)
    await page.locator('#primary-nav a[href="/analyze/sentiment"]').click();
    await page.waitForURL("**/analyze/sentiment", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const submitSentiment = page.getByRole("button", {
      name: "Analyze sentiment",
    });
    await submitSentiment.click();
    const sentimentAlert = page.locator('#analysis-validation-error[role="alert"]');
    await sentimentAlert.waitFor({ state: "visible", timeout: 5000 });
    const sentimentAlertText = (await sentimentAlert.textContent()) ?? "";
    record(
      "desktop /analyze/sentiment empty validation shows Input required",
      sentimentAlertText.includes("Input required"),
      `alert="${sentimentAlertText.trim()}"`,
    );

    await page.getByRole("button", { name: "5-star positive" }).click();
    const sentimentInput = page.locator("#analysis-text");
    const sentimentSample = await sentimentInput.inputValue();
    const sentimentPhase = await page.locator(".page-section").getAttribute("data-phase");
    record(
      "desktop /analyze/sentiment sample chip populates textarea without auto-submit",
      sentimentSample.length > 20 && sentimentPhase === "idle",
      `chars=${sentimentSample.length}, phase=${sentimentPhase}`,
    );
    await page.getByRole("button", { name: "Clear" }).click();
    record(
      "desktop /analyze/sentiment Clear empties textarea",
      (await sentimentInput.inputValue()) === "",
      "cleared",
    );
    await checkNoHorizontalOverflow(page, "desktop /analyze/sentiment");

    // 3. `/analyze/emotions` (CI-safe: validation + sample prompt + Clear)
    await page.locator('#primary-nav a[href="/analyze/emotions"]').click();
    await page.waitForURL("**/analyze/emotions", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const submitEmotions = page.getByRole("button", {
      name: "Analyze emotions",
    });
    await submitEmotions.click();
    const emotionsAlert = page.locator('#analysis-validation-error[role="alert"]');
    await emotionsAlert.waitFor({ state: "visible", timeout: 5000 });
    const emotionsAlertText = (await emotionsAlert.textContent()) ?? "";
    record(
      "desktop /analyze/emotions empty validation shows Input required",
      emotionsAlertText.includes("Input required"),
      `alert="${emotionsAlertText.trim()}"`,
    );

    await page.getByRole("button", { name: "Admiration / gratitude" }).click();
    const emotionsInput = page.locator("#analysis-text");
    const emotionsSample = await emotionsInput.inputValue();
    const emotionsPhase = await page.locator(".page-section").getAttribute("data-phase");
    record(
      "desktop /analyze/emotions sample chip populates textarea without auto-submit",
      emotionsSample.length > 20 && emotionsPhase === "idle",
      `chars=${emotionsSample.length}, phase=${emotionsPhase}`,
    );
    await page.getByRole("button", { name: "Clear" }).click();
    record(
      "desktop /analyze/emotions Clear empties textarea",
      (await emotionsInput.inputValue()) === "",
      "cleared",
    );
    await checkNoHorizontalOverflow(page, "desktop /analyze/emotions");

    // 4. `/model-lab` Track A & Track B
    await page.locator('#primary-nav a[href="/model-lab"]').click();
    await page.waitForURL("**/model-lab", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page
      .getByText("Artifact manifests loaded", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });

    const trackAmazon = page.locator("#track-amazon");
    await trackAmazon.waitFor({ state: "visible", timeout: 10000 });
    const hasW2v = await trackAmazon
      .getByText("Word2Vec + BiLSTM", { exact: true })
      .first()
      .isVisible();
    const hasParams = await trackAmazon
      .getByText("16,734,869", { exact: true })
      .first()
      .isVisible();
    await trackAmazon
      .locator("#pipeline-tab-amazon_rating-train_val_test_split")
      .click();
    const trackAStepTitle = (
      await trackAmazon
        .locator("#pipeline-panel-amazon_rating .pipeline-inspector__title")
        .textContent()
    )?.trim();
    const cmCells = await trackAmazon
      .locator(".modellab-cm-table tbody td.modellab-cm-cell")
      .count();

    record(
      "desktop /model-lab Track A renders BiLSTM, params, interactive step & 5x5 confusion matrix",
      hasW2v &&
        hasParams &&
        trackAStepTitle === "Train / validation / test split" &&
        cmCells === 25,
      `w2v=${hasW2v}, params=${hasParams}, step=${trackAStepTitle}, cmCells=${cmCells}`,
    );

    const trackGo = page.locator("#track-goemotions");
    await trackGo.waitFor({ state: "visible", timeout: 10000 });
    const hasDistilBert = await trackGo
      .getByText("Track B — GoEmotions DistilBERT", { exact: true })
      .isVisible();
    const hasThreshold = await trackGo
      .getByText("Optimal threshold: 0.30", { exact: true })
      .isVisible();
    const labelSearch = trackGo.locator("#label-search-go_emotions");
    await labelSearch.fill("gratitude");
    await trackGo
      .getByText("Showing 1 of 28 emotion labels", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await labelSearch.fill("");
    await trackGo
      .getByText("Showing 28 of 28 emotion labels", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });

    const comparisonRows = await page
      .locator("#model-comparison .modellab-comparison-table tbody tr")
      .count();

    record(
      "desktop /model-lab Track B & comparison table render cleanly",
      hasDistilBert && hasThreshold && comparisonRows === 8,
      `distilbert=${hasDistilBert}, threshold=${hasThreshold}, comparisonRows=${comparisonRows}`,
    );
    await checkNoHorizontalOverflow(page, "desktop /model-lab");

    // 5. `/datasets` SVGs
    await page.locator('#primary-nav a[href="/datasets"]').click();
    await page.waitForURL("**/datasets", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const amazonPanel = page.locator("#dataset-panel-amazon_reviews");
    await amazonPanel.waitFor({ state: "visible", timeout: 15000 });
    await amazonPanel
      .getByText("3,000,000")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    const amazonSvgs = amazonPanel.locator(".recharts-wrapper svg");
    await amazonSvgs.first().waitFor({ state: "visible", timeout: 10000 });
    const amazonSvgCount = await amazonSvgs.count();
    const amazonSvgBox = await amazonSvgs.first().boundingBox();
    const gatedPreviewVisible = await amazonPanel
      .getByText("Sample preview withheld under data-governance policy")
      .isVisible();

    record(
      "desktop /datasets Amazon Reviews renders splits, Recharts SVGs & gated preview",
      amazonSvgCount >= 2 &&
        Boolean(amazonSvgBox && amazonSvgBox.width > 0 && amazonSvgBox.height > 0) &&
        gatedPreviewVisible,
      `svgs=${amazonSvgCount}, width=${amazonSvgBox?.width ?? 0}, gated=${gatedPreviewVisible}`,
    );
    await checkNoHorizontalOverflow(page, "desktop /datasets (amazon)");

    await page.getByRole("tab", { name: /GoEmotions \(Simplified\)/ }).click();
    const goPanel = page.locator("#dataset-panel-go_emotions");
    await goPanel.waitFor({ state: "visible", timeout: 10000 });
    const goSvgs = goPanel.locator(".recharts-wrapper svg");
    await goSvgs.first().waitFor({ state: "visible", timeout: 10000 });
    const goSvgCount = await goSvgs.count();
    const goSvgBox = await goSvgs.first().boundingBox();

    record(
      "desktop /datasets GoEmotions renders Recharts SVGs cleanly",
      goSvgCount >= 2 && Boolean(goSvgBox && goSvgBox.width > 0 && goSvgBox.height > 0),
      `svgs=${goSvgCount}, width=${goSvgBox?.width ?? 0}`,
    );
    await checkNoHorizontalOverflow(page, "desktop /datasets (go_emotions)");

    // 6. `/documentation` interactive tabs + Storage sanitization
    await page.locator('#primary-nav a[href="/documentation"]').click();
    await page.waitForURL("**/documentation", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);

    const archMap = page.locator("#architecture-map");
    await archMap.waitFor({ state: "visible", timeout: 10000 });
    await archMap.locator("#doc-node-sys-fastapi").click();
    const inspectorTitle = (
      await archMap.locator(".doc-inspector__title").textContent()
    )?.trim();
    record(
      "desktop /documentation System tab node click updates inspector",
      inspectorTitle === "FastAPI Service (:8000)",
      `title=${inspectorTitle}`,
    );

    await archMap.locator("#doc-tab-inference").click();
    await archMap
      .locator("#doc-tabpanel-inference")
      .waitFor({ state: "visible", timeout: 5000 });
    await archMap.getByRole("radio", { name: "Sequence view" }).click();
    await archMap
      .locator(".doc-sequence-list")
      .waitFor({ state: "visible", timeout: 5000 });
    const sequenceCount = await archMap.locator(".doc-sequence-item").count();
    await archMap.getByRole("radio", { name: "Flowchart" }).click();
    const flowVisible = await archMap.locator(".doc-inference-flow").isVisible();

    record(
      "desktop /documentation Inference tab switches between Flowchart & Sequence view",
      sequenceCount >= 6 && flowVisible,
      `sequenceCount=${sequenceCount}, flowVisible=${flowVisible}`,
    );

    await archMap.locator("#doc-tab-training").click();
    await archMap
      .locator("#doc-tabpanel-training")
      .waitFor({ state: "visible", timeout: 5000 });
    const trainingTracksOk =
      (await archMap
        .locator('.doc-track-panel[data-track="amazon_rating"]')
        .isVisible()) &&
      (await archMap
        .locator('.doc-track-panel[data-track="go_emotions"]')
        .isVisible());
    record(
      "desktop /documentation Training tab separates Track A and Track B",
      trainingTracksOk,
      `trainingTracksOk=${trainingTracksOk}`,
    );

    await archMap.locator("#doc-tab-storage").click();
    const storagePanel = archMap.locator("#doc-tabpanel-storage");
    await storagePanel.waitFor({ state: "visible", timeout: 5000 });
    const hasWorkspace = await storagePanel
      .getByText("NLP Lab Workspace", { exact: false })
      .first()
      .isVisible();
    const hasPersistent = await storagePanel
      .locator(".badge", { hasText: "Persistent" })
      .first()
      .isVisible();
    const hasEphemeral = await storagePanel
      .locator(".badge", { hasText: "Ephemeral" })
      .first()
      .isVisible();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const sanitized =
      !/\/content\/drive/i.test(bodyText) &&
      !/1qvzd/i.test(bodyText) &&
      !/drive\.google\.com/i.test(bodyText);

    record(
      "desktop /documentation Storage tab renders sanitized workspace hierarchy",
      hasWorkspace && hasPersistent && hasEphemeral && sanitized,
      `workspace=${hasWorkspace}, persistent=${hasPersistent}, ephemeral=${hasEphemeral}, sanitized=${sanitized}`,
    );

    await archMap.locator("#doc-tab-deployment").click();
    const deploymentPanel = archMap.locator("#doc-tabpanel-deployment");
    await deploymentPanel.waitFor({ state: "visible", timeout: 5000 });
    const deploymentMention = await deploymentPanel
      .getByText("frontend/Dockerfile", { exact: false })
      .first()
      .isVisible();
    record(
      "desktop /documentation Deployment tab renders cleanly",
      deploymentMention,
      `deploymentMention=${deploymentMention}`,
    );

    await archMap.locator("#doc-tab-system").click();
    const stackMatrix = page.locator("#stack-matrix");
    const totalTools = await stackMatrix.locator(".doc-tool-card").count();
    await stackMatrix.locator("#doc-stack-tab-ml").click();
    const mlTools = await stackMatrix.locator(".doc-tool-card").count();
    await stackMatrix.locator("#doc-stack-tab-all").click();
    const restoredTools = await stackMatrix.locator(".doc-tool-card").count();
    record(
      "desktop /documentation Stack Matrix category filter works",
      totalTools > mlTools && mlTools > 0 && restoredTools === totalTools,
      `total=${totalTools}, ml=${mlTools}, restored=${restoredTools}`,
    );
    await checkNoHorizontalOverflow(page, "desktop /documentation");

    // 7. `/technology` & Footer
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

    await page.locator("#tech-tab-ml_nlp").click();
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
    const heroHasDeclaredUnused =
      (await techHero.getByText("Declared · Unused", { exact: true }).count()) > 0;

    record(
      "desktop /technology renders marquee toggle, loaded SVGs, category filter, boundaries & isolated Declared · Unused audit",
      initialToggleText.includes("Pause showcase") &&
        pausedAttr === "true" &&
        pausedToggleText.includes("Resume showcase") &&
        resumedAttr === "false" &&
        logoMetrics.total >= 15 &&
        logoMetrics.loaded === logoMetrics.total &&
        mlCardsOk &&
        boundaryCount >= 4 &&
        unusedBadgeVisible &&
        !heroHasDeclaredUnused,
      `logos=${logoMetrics.loaded}/${logoMetrics.total}, mlCards=${mlCardsOk}, boundaries=${boundaryCount}, unusedIsolated=${unusedBadgeVisible && !heroHasDeclaredUnused}`,
    );

    const footer = page.locator("#site-footer");
    await footer.scrollIntoViewIfNeeded();
    const hashLinkCount = await page.locator('a[href="#"]').count();
    const footerPhase = await footer
      .locator(".site-footer__status")
      .getAttribute("data-phase");
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
        (footerPhase === "online" || footerPhase === "degraded") &&
        footerLinksPresent &&
        footerActiveAttr === "page" &&
        scrollBeforeTop > 50 &&
        scrollAfterTop < 50,
      `hashLinks=${hashLinkCount}, phase=${footerPhase}, links=${footerLinksPresent}, active=${footerActiveAttr}, scroll=${scrollBeforeTop}->${scrollAfterTop}`,
    );
    await checkNoHorizontalOverflow(page, "desktop /technology");

    // 8. Dedicated `/404` route check
    errorControl.setExpectingNotFound404(true);
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
        .locator(
          '.notfound-status-card [role="status"][data-phase="online"], .notfound-status-card [role="status"][data-phase="degraded"]',
        )
        .waitFor({ state: "visible", timeout: 15000 });
      const hasTechLinkOn404 = await page
        .locator('.notfound-route-link[href="/technology"]')
        .isVisible();
      const hasFooterOn404 = await page.locator("#site-footer").isVisible();

      record(
        "desktop /404 renders HTTP 404, Page not found, title, live readiness, route links & footer",
        notFoundResponse?.status() === 404 &&
          pageTitle404.includes("Page Not Found") &&
          hasTechLinkOn404 &&
          hasFooterOn404,
        `status=${notFoundResponse?.status()}, title="${pageTitle404}", techLink=${hasTechLinkOn404}, footer=${hasFooterOn404}`,
      );
      await checkNoHorizontalOverflow(page, "desktop /404");
    } finally {
      errorControl.setExpectingNotFound404(false);
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
    // 1. Mobile `/`
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await dismissPreloaderIfPresent(page, { requireVisible: false });
    await verifyDashboardReadiness(page, "mobile");
    await checkNoHorizontalOverflow(page, "mobile /");

    // 2. Mobile `/analyze/sentiment`
    await page.locator('#primary-nav a[href="/analyze/sentiment"]').click();
    await page.waitForURL("**/analyze/sentiment", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.locator("#analysis-text").waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "mobile /analyze/sentiment");

    // 3. Mobile `/analyze/emotions`
    await page.locator('#primary-nav a[href="/analyze/emotions"]').click();
    await page.waitForURL("**/analyze/emotions", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page.locator("#analysis-text").waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "mobile /analyze/emotions");

    // 4. Mobile `/model-lab`
    await page.locator('#primary-nav a[href="/model-lab"]').click();
    await page.waitForURL("**/model-lab", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page
      .getByText("Artifact manifests loaded", { exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    const trackAOpacity = await page
      .locator("#track-amazon .pipeline-node")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
    const trackBOpacity = await page
      .locator("#track-goemotions .pipeline-node")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
    record(
      "mobile /model-lab static pipeline nodes visible",
      trackAOpacity === 1 && trackBOpacity === 1,
      `trackAOpacity=${trackAOpacity}, trackBOpacity=${trackBOpacity}`,
    );
    await checkNoHorizontalOverflow(page, "mobile /model-lab");

    // 5. Mobile `/datasets`
    await page.locator('#primary-nav a[href="/datasets"]').click();
    await page.waitForURL("**/datasets", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page
      .locator("#dataset-panel-amazon_reviews .recharts-wrapper svg")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await checkNoHorizontalOverflow(page, "mobile /datasets (amazon)");

    await page.getByRole("tab", { name: /GoEmotions \(Simplified\)/ }).click();
    await page
      .locator("#dataset-panel-go_emotions .recharts-wrapper svg")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await checkNoHorizontalOverflow(page, "mobile /datasets (go_emotions)");

    // 6. Mobile `/documentation`
    await page.locator('#primary-nav a[href="/documentation"]').click();
    await page.waitForURL("**/documentation", { timeout: 10000 });
    await waitForRouteTransitionIdle(page);
    await page
      .locator("#architecture-map .doc-node")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
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
      "mobile /documentation static diagram nodes visible",
      visibleDocNodeOpacities.length > 0 &&
        visibleDocNodeOpacities.every((opacity) => opacity === 1),
      `visibleCount=${visibleDocNodeOpacities.length}`,
    );
    await checkNoHorizontalOverflow(page, "mobile /documentation");

    // 7. Mobile `/technology` + Footer
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
        (mobileFooterPhase === "online" || mobileFooterPhase === "degraded"),
      `marqueeItems=${mobileMarqueeOpacities.length}, footerReveals=${mobileFooterRevealOpacities.length}, footerPhase=${mobileFooterPhase}`,
    );
    await checkNoHorizontalOverflow(page, "mobile /technology");
  } finally {
    await context.close();
  }
}

async function main() {
  const { chromium } = await import(PLAYWRIGHT_MODULE);
  const executablePath = resolveOptionalExecutablePath();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
  });

  let fatalError = null;
  try {
    await runDesktopPass(browser);
    await runMobilePass(browser);

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

  console.log(`\n## CI Playwright Smoke Summary (${passedCount}/${totalCount})\n`);
  console.log(`- Target: ${BASE_URL}`);
  console.log(`- Console errors: ${results.consoleErrors.length}`);
  console.log(`- Page errors: ${results.pageErrors.length}`);
  if (fatalError) {
    console.log(`- Fatal error: ${fatalError}`);
  }
  for (const item of results.assertions) {
    console.log(`- [${item.passed ? "PASS" : "FAIL"}] ${item.name} — ${item.details}`);
  }
  if (results.consoleErrors.length > 0) {
    console.error("\nConsole errors:", JSON.stringify(results.consoleErrors, null, 2));
  }
  if (results.httpErrors.length > 0) {
    console.error("\nHTTP errors:", JSON.stringify(results.httpErrors, null, 2));
  }
  if (results.pageErrors.length > 0) {
    console.error("\nPage errors:", JSON.stringify(results.pageErrors, null, 2));
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

main();
