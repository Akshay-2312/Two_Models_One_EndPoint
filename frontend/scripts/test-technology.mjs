import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  API_BASE_URL,
  ApiError,
  classifyApiError,
  getTechnologyManifest,
  isNetworkError,
} from "../lib/api.ts";
import { API_ENDPOINTS } from "../lib/documentationData.ts";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const manifestRaw = await read("../../data/technology_manifest.json");
const manifest = JSON.parse(manifestRaw);

const sampleTechnologyFixture = {
  ...manifest,
  api_version: "0.1.0",
  readiness: {
    amazon_rating: { ready: true, error: null },
    go_emotions: { ready: true, error: null },
  },
  onnx_artifacts_present: manifest.onnx_artifact_paths.length,
  onnx_artifacts_expected: manifest.onnx_artifact_paths.length,
};

// ---- 1. Runtime fetch contract tests for getTechnologyManifest ----
const originalFetch = globalThis.fetch;

try {
  // 1a. 200 OK
  globalThis.fetch = async (url, init) => {
    assert.equal(url, `${API_BASE_URL}/technology`);
    assert.equal(new Headers(init?.headers).has("Content-Type"), false);
    return new Response(JSON.stringify(sampleTechnologyFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const payload = await getTechnologyManifest();
  assert.equal(payload.api_version, "0.1.0");
  assert.equal(payload.readiness.amazon_rating.ready, true);
  assert.equal(payload.readiness.go_emotions.ready, true);
  assert.equal(payload.onnx_artifacts_present, 2);
  assert.equal(payload.onnx_artifacts_expected, 2);
  assert.equal(payload.boundaries.length, 4);
  assert.equal(payload.technologies.length, manifest.technologies.length);
  assert.equal(payload.categories_summary.frontend.declared_unused, 6);

  // 1b. 503 technology_manifest_unavailable
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "technology_manifest_unavailable",
        detail: "Technology stack manifest artifact is missing or unreadable.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getTechnologyManifest(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 503);
    assert.equal(err.errorCode, "technology_manifest_unavailable");
    assert.equal(
      err.detail,
      "Technology stack manifest artifact is missing or unreadable.",
    );
    return true;
  });

  // 1c. Offline TypeError
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(getTechnologyManifest(), (err) => {
    assert.equal(isNetworkError(err), true);
    assert.equal(classifyApiError(err).kind, "offline");
    return true;
  });

  // 1d. 500 server error (JSON and plain text)
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ detail: "Corrupt technology manifest payload" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(getTechnologyManifest(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, "Corrupt technology manifest payload");
    assert.equal(classifyApiError(err).kind, "api_error");
    return true;
  });

  globalThis.fetch = async () =>
    new Response("Internal Server Error", { status: 500 });

  await assert.rejects(getTechnologyManifest(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.detail, null);
    return true;
  });

  // 1e. Empty technologies: []
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ...sampleTechnologyFixture,
        technologies: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const emptyPayload = await getTechnologyManifest();
  assert.deepEqual(emptyPayload.technologies, []);
} finally {
  globalThis.fetch = originalFetch;
}

// ---- 2. Leak, placeholder, href="#", vercel, and fake URL checks ----
const technologyPageSource = await read("../pages/technology.tsx");
const notFoundPageSource = await read("../pages/404.tsx");
const siteFooterSource = await read("../components/SiteFooter.tsx");
const hero3Source = await read("../components/ui/hero-3.tsx");
const layoutSource = await read("../components/Layout.tsx");
const appSource = await read("../pages/_app.tsx");
const useTechSource = await read("../lib/useTechnologyManifest.ts");
const globalsCss = await read("../styles/globals.css");

const leakTargets = [
  ["data/technology_manifest.json", manifestRaw],
  ["pages/technology.tsx", technologyPageSource],
  ["pages/404.tsx", notFoundPageSource],
  ["components/SiteFooter.tsx", siteFooterSource],
  ["components/ui/hero-3.tsx", hero3Source],
];

const forbiddenPatterns = [
  { name: "/content/drive path", pattern: /\/content\/drive/i },
  {
    name: "Google Drive folder/file ID",
    pattern: /1qvzdQ4ws5U9i93CIxr6H7ZoVA212uCto|1qvzd/i,
  },
  {
    name: "Google Drive URL",
    pattern: /drive\.google\.com|docs\.google\.com/i,
  },
  { name: "placeholder href=\"#\"", pattern: /href\s*=\s*["']#["']/i },
  { name: "vercel reference", pattern: /vercel/i },
  {
    name: "fake URL",
    pattern:
      /https?:\/\/(?:example\.(?:com|org|net)|placeholder\.|dummy\.|fake[.-])/i,
  },
  {
    name: "machine-local user directory path",
    pattern: /(?:[A-Za-z]:[\\/]+Users|\/Users\/)/i,
  },
];

for (const [label, source] of leakTargets) {
  for (const check of forbiddenPatterns) {
    assert.doesNotMatch(
      source,
      check.pattern,
      `${label} must not contain ${check.name}`,
    );
  }
}

// ---- 3. Every logo_path resolves to an existing .svg starting with <svg ----
assert.ok(Array.isArray(manifest.technologies) && manifest.technologies.length > 0);
let checkedSvgCount = 0;

for (const tech of manifest.technologies) {
  assert.ok(
    typeof tech.monogram === "string" &&
      tech.monogram.length >= 2 &&
      tech.monogram.length <= 4,
    `Technology ${tech.id} must define a 2-4 character monogram`,
  );

  if (tech.logo_path !== null) {
    assert.equal(
      typeof tech.logo_path,
      "string",
      `${tech.id} logo_path must be string or null`,
    );
    assert.ok(
      tech.logo_path.startsWith("/tech/") && tech.logo_path.endsWith(".svg"),
      `${tech.id} logo_path (${tech.logo_path}) must be under /tech/*.svg`,
    );
    const svgContent = await read(`../public${tech.logo_path}`);
    assert.ok(
      svgContent.trimStart().startsWith("<svg"),
      `public${tech.logo_path} must start with <svg`,
    );
    checkedSvgCount += 1;
  }
}

assert.ok(checkedSvgCount >= 20, "Manifest must verify local SVG assets");

// ---- 4. Layout.tsx, _app.tsx, documentationData.ts, and page contracts ----
assert.match(layoutSource, /href:\s*"\/technology",\s*label:\s*"Technology Used"/);
assert.match(
  layoutSource,
  /export function isRouteActive\(pathname:\s*string,\s*href:\s*string\):\s*boolean/,
);
assert.match(
  layoutSource,
  /pathname === href \|\| pathname\.startsWith\(`\$\{href\}\/`\)/,
);

// Verify nested-route matching logic identical to Layout.tsx & SiteFooter.tsx
const matchNestedRoute = (pathname, href) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

assert.equal(matchNestedRoute("/", "/"), true);
assert.equal(matchNestedRoute("/technology", "/"), false);
assert.equal(matchNestedRoute("/technology", "/technology"), true);
assert.equal(matchNestedRoute("/technology/details", "/technology"), true);
assert.equal(matchNestedRoute("/technology-extra", "/technology"), false);
assert.equal(matchNestedRoute("/analyze/sentiment", "/analyze"), true);

assert.match(appSource, /"\/technology":\s*"Technology Used"/);
assert.match(appSource, /"\/404":\s*"Page Not Found"/);
assert.match(appSource, /<title>\{`\$\{pageTitle\} — NLP Lab`\}<\/title>/);
assert.match(appSource, /viewport-fit=cover/);

const techEndpoint = API_ENDPOINTS.find((entry) => entry.path === "/technology");
assert.ok(techEndpoint, "API_ENDPOINTS must document GET /technology");
assert.equal(techEndpoint.method, "GET");
assert.equal(techEndpoint.responseSchema, "TechnologyManifestResponse");
assert.ok(
  techEndpoint.statusCodes.some((s) => s.code === 200) &&
    techEndpoint.statusCodes.some(
      (s) => s.code === 503 && /technology_manifest_unavailable/.test(s.meaning),
    ),
  "GET /technology endpoint docs must specify 200 and 503 technology_manifest_unavailable",
);

assert.match(useTechSource, /Array\.isArray\(response\.technologies\) && response\.technologies\.length > 0/);
assert.match(technologyPageSource, /id="stack-inventory"/);
assert.match(technologyPageSource, /id="communication-boundaries"/);
assert.match(technologyPageSource, /item\.status !== "declared_unused"/);
assert.match(technologyPageSource, /item\.status === "declared_unused"/);
assert.match(technologyPageSource, /Technology manifest unavailable/);
assert.match(technologyPageSource, /Failed to load technology manifest/);
assert.match(technologyPageSource, /No technology manifest entries available/);

assert.match(notFoundPageSource, /useReadiness\(\)/);
assert.match(notFoundPageSource, /href="\/technology"/);
assert.match(notFoundPageSource, /Page not found/);

// ---- 5. hero-3.tsx, SiteFooter.tsx, and globals.css motion/accessibility checks ----
assert.match(hero3Source, /Pause showcase/);
assert.match(hero3Source, /Resume showcase/);
assert.match(hero3Source, /tech-marquee__list--clone[\s\S]*?aria-hidden="true"/);
assert.match(hero3Source, /useGSAP\(/);
assert.match(hero3Source, /scope:\s*heroRef/);
assert.match(hero3Source, /revertOnUpdate:\s*true/);
assert.match(hero3Source, /useReducedMotion\(\)/);

assert.match(siteFooterSource, /useReadiness\(\)/);
assert.match(siteFooterSource, /Back to top/);
assert.match(siteFooterSource, /useGSAP\(/);
assert.match(siteFooterSource, /scope:\s*footerRef/);
assert.match(siteFooterSource, /revertOnUpdate:\s*true/);
assert.match(siteFooterSource, /useReducedMotion\(\)/);
assert.match(
  siteFooterSource,
  /router\.pathname === item\.href \|\|\s*router\.pathname\.startsWith\(`\$\{item\.href\}\/`\)/,
);
for (const footerHref of [
  "/",
  "/model-lab",
  "/datasets",
  "/documentation",
  "/technology",
  "/analyze/sentiment",
  "/analyze/emotions",
]) {
  assert.ok(
    siteFooterSource.includes(footerHref),
    `SiteFooter.tsx must link to ${footerHref}`,
  );
}

for (const [label, source] of [
  ["components/ui/hero-3.tsx", hero3Source],
  ["components/SiteFooter.tsx", siteFooterSource],
  ["pages/technology.tsx", technologyPageSource],
  ["pages/404.tsx", notFoundPageSource],
  ["styles/globals.css", globalsCss],
]) {
  assert.doesNotMatch(
    source,
    /scale\(\s*0\s*\)|scale:\s*0(?![.\d])/,
    `${label} must not animate from scale(0)`,
  );
  assert.doesNotMatch(
    source,
    /(?:^|[\s:,(])ease-in(?!-out)\b|power\d*\.in\b/,
    `${label} must not use ease-in for UI transitions`,
  );
}

assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\),\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.tech-marquee__track\s*\{\s*animation:\s*none;/,
);
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\),\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.tech-marquee__list--clone\s*\{\s*display:\s*none;\s*\}/,
);
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\),\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*\{[\s\S]*?\.tech-marquee__list\s*\{\s*display:\s*grid;/,
);
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.tech-hero__reveal,\s*[\r\n]+\s*\.site-footer__reveal\s*\{\s*opacity:\s*1\s*!important;\s*transform:\s*none\s*!important;\s*\}/,
);

console.log(
  `Technology, Footer, and 404 contract tests passed (${checkedSvgCount} local SVGs verified).`,
);
