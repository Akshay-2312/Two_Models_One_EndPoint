import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../pages/index.tsx", import.meta.url), "utf8");
const preloader = await readFile(new URL("../components/EntryPreloader.tsx", import.meta.url), "utf8");
const motion = await readFile(new URL("../lib/motion.ts", import.meta.url), "utf8");
const api = await readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
const readiness = await readFile(new URL("../components/ReadinessProvider.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../components/Layout.tsx", import.meta.url), "utf8");

assert.match(preloader, /NLP Major Project/);
assert.match(preloader, /sessionStorage\.getItem\(SESSION_KEY\)/);
assert.match(preloader, /sessionStorage\.setItem\(SESSION_KEY, "true"\)/);
assert.match(motion, /prefers-reduced-motion/);
assert.match(preloader, /durationMs=\{2600\}/);
assert.match(preloader, /Skip/);
assert.match(page, /href="\/analyze\/sentiment"/);
assert.match(page, /href="\/analyze\/emotions"/);
assert.match(page, /Example trace/);
assert.match(page, /Amazon rating/);
assert.match(page, /GoEmotions/);

// Readiness state must come from the API, never from a hard-coded badge.
assert.match(readiness, /export function useReadiness/);
assert.match(readiness, /AbortController/);
assert.match(readiness, /setPhase\("offline"\)/);
assert.match(layout, /data-phase=\{phase\}/);
assert.doesNotMatch(layout, /API-connected workspace/);
assert.match(page, /status-error/);
assert.doesNotMatch(page, /Checking\.\.\./);
// GET requests must not send a JSON Content-Type, or every poll is preflighted.
assert.match(api, /init\?\.body != null/);
assert.doesNotMatch(api, /headers: \{ "Content-Type": "application\/json"/);

console.log("Entry experience contract tests passed.");
