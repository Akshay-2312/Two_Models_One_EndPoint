import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const provider = await read("../components/MotionProvider.tsx");
const motion = await read("../lib/motion.ts");
const styles = await read("../styles/globals.css");
const circleReveal = await read("../components/ui/circle-reveal-loader.tsx");
const liquidLoader = await read("../components/ui/liquid-loader.tsx");
const analysisLoader = await read("../components/ui/loader-10.tsx");
const modelInitLoader = await read("../components/ui/model-init-loader.tsx");
const analyzerForm = await read("../components/AnalyzerForm.tsx");
const sentimentPage = await read("../pages/analyze/sentiment.tsx");
const emotionsPage = await read("../pages/analyze/emotions.tsx");
const datasetsPage = await read("../pages/datasets.tsx");
const modelLabPage = await read("../pages/model-lab.tsx");
const useStatistics = await read("../lib/useStatistics.ts");

// ---- 1. Shared motion & reduced-motion contract ------------------------
assert.match(motion, /prefers-reduced-motion/);
assert.match(motion, /addEventListener\("change"/);
assert.match(motion, /removeEventListener\("change"/);
assert.match(motion, /export function useReducedMotion/);
assert.match(motion, /export function normalizeRoutePath/);
assert.match(motion, /export function useScopedGSAP/);
assert.match(motion, /revertOnUpdate:\s*true/);

// ---- 2. Circle Reveal route transition --------------------------------
assert.match(provider, /routeChangeStart/);
assert.match(provider, /routeChangeComplete/);
assert.match(provider, /routeChangeError/);
assert.match(provider, /router\.events\.off/);
assert.match(provider, /options\?\.shallow/);
assert.match(provider, /normalizeRoutePath/);
assert.match(provider, /focusMainHeadingAfterNavigation/);
assert.match(provider, /<CircleRevealLoader/);

assert.match(circleReveal, /useGSAP/);
assert.match(circleReveal, /revertOnUpdate:\s*true/);
assert.match(circleReveal, /aria-hidden="true"/);
assert.match(circleReveal, /circle-reveal__ring/);
assert.match(styles, /\.route-transition\[data-active\]/);
assert.match(styles, /clip-path:\s*circle\(/);
assert.match(styles, /pointer-events:\s*none/);
assert.match(styles, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(styles, /transition:\s*all/);

// ---- 3. StatisticsLoader (liquid-loader) -------------------------------
assert.match(liquidLoader, /export function StatisticsLoader/);
assert.match(liquidLoader, /Loading dataset statistics…/);
assert.match(liquidLoader, /role="status"/);
assert.match(liquidLoader, /status === "failed" \|\| status === "unavailable"/);
assert.match(liquidLoader, /status === "empty"/);
assert.doesNotMatch(liquidLoader, /%/); // No fabricated percentages

assert.match(useStatistics, /AbortController/);
assert.match(useStatistics, /"loading" \| "stalled" \| "failed" \| "unavailable" \| "empty" \| "ready"|StatisticsPhase/);
assert.match(datasetsPage, /<StatisticsLoader/);
assert.match(modelLabPage, /<StatisticsLoader/);

// ---- 4. AnalysisLoader (loader-10) & AnalyzerForm ----------------------
assert.match(analysisLoader, /export function AnalysisLoader/);
assert.match(analysisLoader, /role="status"/);
assert.match(analysisLoader, /loader-10__orb/);
assert.match(analysisLoader, /onCancel/);

assert.match(analyzerForm, /<AnalysisLoader/);
assert.match(analyzerForm, /inFlightRef\.current/);
assert.match(analyzerForm, /AbortController/);
assert.match(analyzerForm, /ANALYSIS_TIMEOUT_MS/);
assert.match(analyzerForm, /Retry analysis/);
assert.match(sentimentPage, /loadingLabel="Analyzing review…"/);
assert.match(emotionsPage, /loadingLabel="Detecting emotions…"/);

// ---- 5. ModelInitLoader ------------------------------------------------
assert.match(modelInitLoader, /export function ModelInitLoader/);
assert.match(modelInitLoader, /role="status"/);
assert.match(modelInitLoader, /21st\.dev\/@shailendrakumar19999\/components\/loding/);

console.log("Motion contract tests passed.");
