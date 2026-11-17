import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../pages/index.tsx", import.meta.url), "utf8");
const preloader = await readFile(new URL("../components/EntryPreloader.tsx", import.meta.url), "utf8");
const motion = await readFile(new URL("../lib/motion.ts", import.meta.url), "utf8");

assert.match(preloader, /NLP Major Project/);
assert.match(preloader, /sessionStorage\.getItem\(SESSION_KEY\)/);
assert.match(preloader, /sessionStorage\.setItem\(SESSION_KEY, "true"\)/);
assert.match(motion, /prefers-reduced-motion/);
assert.match(preloader, /durationMs=\{2600\}/);
assert.match(preloader, /Skip/);
assert.match(page, /href="\/analyze\/sentiment"/);
assert.match(page, /href="\/analyze\/emotions"/);
assert.match(page, /Inference trace/);
assert.match(page, /Amazon rating/);
assert.match(page, /GoEmotions/);

console.log("Entry experience contract tests passed.");
