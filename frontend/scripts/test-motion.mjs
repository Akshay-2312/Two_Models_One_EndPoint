import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const provider = await readFile(new URL("../components/MotionProvider.tsx", import.meta.url), "utf8");
const motion = await readFile(new URL("../lib/motion.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles/globals.css", import.meta.url), "utf8");

assert.match(motion, /prefers-reduced-motion/);
assert.match(motion, /addEventListener\("change"/);
assert.match(motion, /removeEventListener\("change"/);
assert.match(provider, /routeChangeStart/);
assert.match(provider, /routeChangeComplete/);
assert.match(provider, /routeChangeError/);
assert.match(provider, /router\.events\.off/);
assert.match(styles, /\.route-transition\[data-active\]/);
assert.match(styles, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(styles, /transition:\s*all/);

console.log("Motion contract tests passed.");
