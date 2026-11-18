import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const app = await read("../pages/_app.tsx");
const page = await read("../pages/index.tsx");
const preloader = await read("../components/EntryPreloader.tsx");
const titleCard = await read("../components/ui/animator-title-preloader.tsx");
const storage = await read("../lib/storage.ts");
const motion = await read("../lib/motion.ts");
const api = await read("../lib/api.ts");
const readiness = await read("../components/ReadinessProvider.tsx");
const layout = await read("../components/Layout.tsx");
const reveal = await read("../components/Reveal.tsx");
const inkHero = await read("../components/InkHero.tsx");

// ---- Entry gate -------------------------------------------------------
// Global first entry: mounted once in the shared shell, never in a page.
assert.match(app, /<EntryPreloader \/>/);
assert.equal((app.match(/<EntryPreloader/g) ?? []).length, 1);
assert.doesNotMatch(page, /EntryPreloader/);

assert.match(preloader, /title="NLP Major Project"/);
assert.match(preloader, /ENTRY_SESSION_KEY = "nlp-lab-entry-seen"/);
assert.match(preloader, /ENTRY_OVERRIDE_PARAM = "entry"/);
assert.match(preloader, /override === "off"/);
assert.match(preloader, /override !== "force"/);
assert.match(preloader, /getReducedMotionPreference\(\)/);
assert.match(motion, /prefers-reduced-motion/);

// Storage access is defensive and the gate never writes before it settles.
assert.match(storage, /try \{/);
assert.match(storage, /export function readStored/);
assert.match(preloader, /readStored\("session", ENTRY_SESSION_KEY\)/);
assert.equal((preloader.match(/writeStored\(/g) ?? []).length, 1);
assert.doesNotMatch(preloader, /sessionStorage\.(getItem|setItem)/);
assert.doesNotMatch(preloader, /localStorage\.(getItem|setItem)/);

// One settlement only, and Skip is a real control.
assert.match(preloader, /settledRef\.current/);
assert.match(preloader, /role="dialog"/);
assert.match(preloader, /Skip/);
assert.match(preloader, /onClick=\{dismiss\}/);

// Modal contract: announced as modal, focus moved onto Skip, Tab cannot escape.
assert.match(preloader, /aria-modal="true"/);
assert.match(preloader, /event\.key === "Tab"/);
assert.match(preloader, /skipRef\.current\?\.focus\(\)/);

// The card is decorative for assistive tech: no invented progress.
assert.match(preloader, /announceProgress=\{false\}/);
assert.match(titleCard, /announceProgress \? "progressbar" : "group"/);
assert.match(titleCard, /\. Entering\./);

// Ornament: hands and mascot are out; rough and HUD stay.
assert.match(preloader, /hands=\{false\}/);
assert.match(preloader, /mascot=\{false\}/);
assert.match(preloader, /\n\s+rough\n/);
assert.match(preloader, /\n\s+hud\n/);

// ---- Landing hero -----------------------------------------------------
assert.match(page, /"Understand", "what", "language", "expresses\."/);
assert.match(page, /href="\/analyze\/sentiment"/);
assert.match(page, /href="\/analyze\/emotions"/);
assert.match(page, /href="\/model-lab"/);
assert.match(page, /InkHero/);

// No illustrative result may look like a live inference.
assert.doesNotMatch(page, /4 \/ 5/);
assert.doesNotMatch(page, /admiration/);
assert.doesNotMatch(page, /82%/);
assert.doesNotMatch(page, /68%/);
assert.doesNotMatch(page, /Example trace/);
assert.match(page, /not a model output/);

// Static-first: the hero plate carries no client JavaScript.
assert.doesNotMatch(inkHero, /useState|useEffect|useRef/);
assert.doesNotMatch(inkHero, /"use client"/);

// Scroll reveal is one-shot and the markup is visible before it arms.
assert.match(reveal, /IntersectionObserver/);
assert.match(reveal, /getReducedMotionPreference|reduced/);
assert.match(reveal, /data-reveal=\{armed \? "armed" : undefined\}/);
assert.match(reveal, /observer\.disconnect\(\)/);

// ---- Truthful readiness ----------------------------------------------
assert.match(readiness, /export function useReadiness/);
assert.match(readiness, /"checking" \| "online" \| "degraded" \| "offline" \| "unknown"/);
assert.match(readiness, /AbortController/);
assert.match(readiness, /setCheckedAt\(Date\.now\(\)\)/);
assert.match(readiness, /requestId === requestRef\.current/);

// Every settled request reaches a terminal phase.
assert.match(readiness, /setPhase\("offline"\)/);
assert.match(readiness, /setPhase\(result\.phase\)/);
assert.match(readiness, /phase: "unknown"/);

assert.match(layout, /data-phase=\{phase\}/);
assert.match(layout, /STATUS_LABEL: Record<ReadinessPhase, string>/);
assert.doesNotMatch(layout, /API-connected workspace/);
assert.doesNotMatch(page, /API-connected workspace/);

// The landing handles all five phases, including offline and unknown.
for (const phase of ["online", "degraded", "offline", "unknown", "checking"]) {
  assert.match(page, new RegExp(`phase === "${phase}"`), `landing must render the ${phase} phase`);
}
assert.match(page, /status-error/);
assert.doesNotMatch(page, /Checking\.\.\./);

// A degraded row already prints that model's error, so the note cannot repeat it.
assert.match(page, /const degradedNote = error && !models\.some/);
assert.match(page, /phase === "degraded" && degradedNote/);

// ---- Collapsible sidebar ---------------------------------------------
assert.match(layout, /data-sidebar=\{collapsed \? "collapsed" : "expanded"\}/);
assert.match(layout, /aria-expanded=\{!collapsed\}/);
assert.match(layout, /aria-controls="primary-nav"/);
assert.match(layout, /readStored\("local", SIDEBAR_KEY\)/);
assert.match(layout, /writeStored\("local", SIDEBAR_KEY/);

// GET requests must not send a JSON Content-Type, or every poll is preflighted.
assert.match(api, /init\?\.body != null/);
assert.doesNotMatch(api, /headers: \{ "Content-Type": "application\/json"/);

console.log("Entry experience contract tests passed.");
