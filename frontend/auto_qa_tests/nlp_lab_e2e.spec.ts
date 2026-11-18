import { test, expect } from '@playwright/test';

test.describe("NLP Lab Sentiment and Emotion Analyzer E2E Flow", () => {
  test("NLP Lab Sentiment and Emotion Analyzer E2E Flow", async ({ page }) => {
    // Base URL navigation
    await page.goto("http://localhost:3000");

    await test.step("navigate to http://localhost:3000/", async () => {
      await page.goto("http://localhost:3000/");
    });

    await test.step("click 'Skip'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Skip", "i") })
        .or(page.getByRole('link', { name: new RegExp("Skip", "i") }))
        .or(page.getByText("Skip"));
      await clickTarget.first().click();
    });

    await test.step("verify 'Both models ready' is visible", async () => {
      await expect(page.getByText("Both models ready").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("click 'Sentiment Analyzer'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Sentiment Analyzer", "i") })
        .or(page.getByRole('link', { name: new RegExp("Sentiment Analyzer", "i") }))
        .or(page.getByText("Sentiment Analyzer"));
      await clickTarget.first().click();
    });

    await test.step("verify URL contains '/analyze/sentiment'", async () => {
      await expect(page).toHaveURL(new RegExp("\\/analyze\\/sentiment", ""));
    });

    await test.step("click 'Analyze sentiment'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Analyze sentiment", "i") })
        .or(page.getByRole('link', { name: new RegExp("Analyze sentiment", "i") }))
        .or(page.getByText("Analyze sentiment"));
      await clickTarget.first().click();
    });

    await test.step("verify 'Input required' is visible", async () => {
      await expect(page.getByText("Input required").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("click '5-star positive'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("5-star positive", "i") })
        .or(page.getByRole('link', { name: new RegExp("5-star positive", "i") }))
        .or(page.getByText("5-star positive"));
      await clickTarget.first().click();
    });

    await test.step("click 'Analyze sentiment'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Analyze sentiment", "i") })
        .or(page.getByRole('link', { name: new RegExp("Analyze sentiment", "i") }))
        .or(page.getByText("Analyze sentiment"));
      await clickTarget.first().click();
    });

    await test.step("verify 'Analyzed review' is visible", async () => {
      await expect(page.getByText("Analyzed review").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify '1 star' is visible", async () => {
      await expect(page.getByText("1 star").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify '2 stars' is visible", async () => {
      await expect(page.getByText("2 stars").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify '3 stars' is visible", async () => {
      await expect(page.getByText("3 stars").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify '4 stars' is visible", async () => {
      await expect(page.getByText("4 stars").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify '5 stars' is visible", async () => {
      await expect(page.getByText("5 stars").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("click 'Emotion Analyzer'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Emotion Analyzer", "i") })
        .or(page.getByRole('link', { name: new RegExp("Emotion Analyzer", "i") }))
        .or(page.getByText("Emotion Analyzer"));
      await clickTarget.first().click();
    });

    await test.step("verify URL contains '/analyze/emotions'", async () => {
      await expect(page).toHaveURL(new RegExp("\\/analyze\\/emotions", ""));
    });

    await test.step("click 'Admiration / gratitude'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Admiration \\/ gratitude", "i") })
        .or(page.getByRole('link', { name: new RegExp("Admiration \\/ gratitude", "i") }))
        .or(page.getByText("Admiration / gratitude"));
      await clickTarget.first().click();
    });

    await test.step("click 'Analyze emotions'", async () => {
      const clickTarget = page.getByRole('button', { name: new RegExp("Analyze emotions", "i") })
        .or(page.getByRole('link', { name: new RegExp("Analyze emotions", "i") }))
        .or(page.getByText("Analyze emotions"));
      await clickTarget.first().click();
    });

    await test.step("verify 'Selected multi-label detections' is visible", async () => {
      await expect(page.getByText("Selected multi-label detections").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("verify 'Active threshold' is visible", async () => {
      await expect(page.getByText("Active threshold").first()).toBeVisible({ timeout: 5000 });
    });

  });
});
