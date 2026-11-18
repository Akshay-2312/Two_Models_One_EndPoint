import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  API_ENDPOINTS,
  DATASET_SOURCES,
  DIAGRAM_TABS,
  ENV_VARS,
  NODE_CATEGORY_META,
  NODE_STATUS_LABELS,
  OPERATIONAL_POLICIES,
  TOOL_INTEGRATIONS,
  TOOL_STATUS_LABELS,
} from "../lib/documentationData.ts";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const docDataSource = await read("../lib/documentationData.ts");
const architectureMapSource = await read("../components/ArchitectureMap.tsx");
const docReferenceSource = await read("../components/DocumentationReference.tsx");
const docPageSource = await read("../pages/documentation.tsx");
const globalsCss = await read("../styles/globals.css");
const rootEnvExample = await read("../../.env.example");
const frontendEnvExample = await read("../.env.example");

// ---- 1. Zero secret, personal path, Drive ID, or /content/drive leaks ----
const serializedData = JSON.stringify({
  TOOL_INTEGRATIONS,
  DIAGRAM_TABS,
  DATASET_SOURCES,
  ENV_VARS,
  API_ENDPOINTS,
  OPERATIONAL_POLICIES,
});

const leakTargets = [
  ["lib/documentationData.ts", docDataSource],
  ["components/ArchitectureMap.tsx", architectureMapSource],
  ["components/DocumentationReference.tsx", docReferenceSource],
  ["pages/documentation.tsx", docPageSource],
  ["serialized documentationData exports", serializedData],
];

const leakChecks = [
  {
    name: "/content/drive path",
    pattern: /\/content\/drive/i,
  },
  {
    name: "Google Drive folder/file ID (1qvzd...)",
    pattern: /1qvzdQ4ws5U9i93CIxr6H7ZoVA212uCto|1qvzd/i,
  },
  {
    name: "Google Drive URL",
    pattern: /drive\.google\.com|docs\.google\.com/i,
  },
  {
    name: "machine-local user directory path",
    pattern: /(?:[A-Za-z]:[\\/]+Users|\/Users\/)/i,
  },
  {
    name: "email address",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  },
  {
    name: "API token or credential pattern",
    pattern:
      /\b(?:AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|hf_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,}|AKIA[0-9A-Z]{16})\b|Bearer\s+[A-Za-z0-9._-]+/,
  },
];

for (const [label, source] of leakTargets) {
  for (const check of leakChecks) {
    assert.doesNotMatch(
      source,
      check.pattern,
      `${label} must not leak ${check.name}`,
    );
  }
}

// ---- 2. Five tabs, five legend categories, three node statuses ----
assert.deepEqual(
  DIAGRAM_TABS.map((tab) => tab.id),
  ["system", "inference", "training", "storage", "deployment"],
  "DIAGRAM_TABS must define all 5 architecture views in order",
);

assert.deepEqual(NODE_CATEGORY_META, {
  api: {
    label: "API request",
    description: NODE_CATEGORY_META.api.description,
  },
  model: {
    label: "Model processing",
    description: NODE_CATEGORY_META.model.description,
  },
  dataset: {
    label: "Dataset artifact",
    description: NODE_CATEGORY_META.dataset.description,
  },
  saved: {
    label: "Saved artifact",
    description: NODE_CATEGORY_META.saved.description,
  },
  external: {
    label: "External service",
    description: NODE_CATEGORY_META.external.description,
  },
});

assert.deepEqual(NODE_STATUS_LABELS, {
  implemented: "Implemented",
  partial: "Partial",
  proposed: "Proposed",
});

function assertNodesAndEdgesValid(nodes, edges, scopeLabel) {
  assert.ok(nodes.length > 0, `${scopeLabel} must contain nodes`);
  const nodeIds = new Set();
  for (const node of nodes) {
    assert.ok(node.id, `${scopeLabel} node must have id`);
    assert.ok(!nodeIds.has(node.id), `${scopeLabel} duplicate node id: ${node.id}`);
    nodeIds.add(node.id);
    assert.ok(
      Object.hasOwn(NODE_CATEGORY_META, node.category),
      `${scopeLabel} node ${node.id} has invalid category ${node.category}`,
    );
    assert.ok(
      Object.hasOwn(NODE_STATUS_LABELS, node.status),
      `${scopeLabel} node ${node.id} has invalid status ${node.status}`,
    );
    assert.ok(node.label.trim().length > 0, `${scopeLabel} node ${node.id} label required`);
    assert.ok(node.summary.trim().length > 0, `${scopeLabel} node ${node.id} summary required`);
    assert.ok(node.sourceRef.trim().length > 0, `${scopeLabel} node ${node.id} sourceRef required`);
    assert.ok(Array.isArray(node.inputs), `${scopeLabel} node ${node.id} inputs must be array`);
    assert.ok(Array.isArray(node.outputs), `${scopeLabel} node ${node.id} outputs must be array`);
  }
  for (const edge of edges) {
    assert.ok(
      nodeIds.has(edge.from),
      `${scopeLabel} edge ${edge.id} references unknown 'from' node ${edge.from}`,
    );
    assert.ok(
      nodeIds.has(edge.to),
      `${scopeLabel} edge ${edge.id} references unknown 'to' node ${edge.to}`,
    );
  }
}

for (const tab of DIAGRAM_TABS) {
  assert.ok(tab.label.trim().length > 0, `Tab ${tab.id} must have a label`);
  assert.ok(tab.kicker.trim().length > 0, `Tab ${tab.id} must have a kicker`);
  assert.ok(tab.description.trim().length > 0, `Tab ${tab.id} must have a description`);
  if (tab.layout === "dual_track") {
    assert.equal(tab.nodes.length, 0);
    assert.equal(tab.edges.length, 0);
    assert.ok(Array.isArray(tab.tracks) && tab.tracks.length === 2);
  } else {
    assertNodesAndEdgesValid(tab.nodes, tab.edges, `tab:${tab.id}`);
  }
}

// ---- 3. Inference sequenceSteps, separated Training tracks, Storage, Deployment ----
const inferenceTab = DIAGRAM_TABS.find((t) => t.id === "inference");
assert.ok(inferenceTab);
assert.equal(inferenceTab.layout, "inference");
assert.ok(
  Array.isArray(inferenceTab.sequenceSteps) && inferenceTab.sequenceSteps.length >= 6,
  "inference tab must provide ordered sequenceSteps",
);
inferenceTab.sequenceSteps.forEach((step, idx) => {
  assert.equal(step.step, idx + 1, "sequenceSteps must be numbered sequentially from 1");
  assert.ok(step.from && step.to && step.message && step.payloadOrDetail && step.status);
});
const sequenceStatuses = inferenceTab.sequenceSteps.map((s) => s.status).join(" ");
assert.match(sequenceStatuses, /200 OK/);
assert.match(sequenceStatuses, /4s/);
assert.match(sequenceStatuses, /30s/);
assert.match(sequenceStatuses, /422/);
assert.match(sequenceStatuses, /503/);
assert.match(sequenceStatuses, /500/);

const trainingTab = DIAGRAM_TABS.find((t) => t.id === "training");
assert.ok(trainingTab?.tracks);
assert.deepEqual(
  trainingTab.tracks.map((track) => track.id),
  ["amazon_rating", "go_emotions"],
  "training tab must separate Track A (amazon_rating) and Track B (go_emotions)",
);

const trackA = trainingTab.tracks[0];
const trackB = trainingTab.tracks[1];
assertNodesAndEdgesValid(trackA.nodes, trackA.edges, "track:amazon_rating");
assertNodesAndEdgesValid(trackB.nodes, trackB.edges, "track:go_emotions");

const trackANodeIds = new Set(trackA.nodes.map((n) => n.id));
for (const node of trackB.nodes) {
  assert.ok(!trackANodeIds.has(node.id), `Track A and Track B must not share node id ${node.id}`);
}
assert.equal(
  trackA.sourceUrl,
  "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv",
);
assert.equal(
  trackB.sourceUrl,
  "https://huggingface.co/datasets/google-research-datasets/go_emotions",
);

const storageTab = DIAGRAM_TABS.find((t) => t.id === "storage");
assert.ok(storageTab);
assert.equal(storageTab.layout, "storage_tree");
const storageLabels = storageTab.nodes.map((n) => n.label);
for (const expectedFolder of [
  "Google Drive -> NLP Lab Workspace",
  "Source & Notebooks",
  "Raw / Processed Dataset References",
  "Checkpoints",
  "Model Artifacts",
  "Evaluation Reports",
  "Logs [ephemeral stdout unless exported]",
  "Figures",
]) {
  assert.ok(
    storageLabels.includes(expectedFolder),
    `storage tab must include logical folder "${expectedFolder}"`,
  );
}
const persistenceSet = new Set(storageTab.nodes.map((n) => n.persistence).filter(Boolean));
assert.ok(persistenceSet.has("Persistent"), "storage tab must include Persistent behavior");
assert.ok(persistenceSet.has("Ephemeral"), "storage tab must include Ephemeral behavior");
assert.ok(
  persistenceSet.has("Excluded from Git"),
  "storage tab must include Excluded from Git behavior",
);

const systemTab = DIAGRAM_TABS.find((t) => t.id === "system");
assert.ok(systemTab);
const sysDockerfileNode = systemTab.nodes.find((n) => n.id === "sys-frontend-dockerfile");
const sysCiNode = systemTab.nodes.find((n) => n.id === "sys-github-actions-ci");
const sysOnnxNode = systemTab.nodes.find((n) => n.id === "sys-onnx-serving-proposed");
assert.equal(sysDockerfileNode?.status, "implemented");
assert.match(sysDockerfileNode?.label ?? "", /frontend\/Dockerfile/);
assert.equal(sysCiNode?.status, "implemented");
assert.match(sysCiNode?.summary ?? "", /test-frontend/);
assert.match(sysCiNode?.summary ?? "", /playwright-smoke/);
assert.equal(sysOnnxNode?.status, "proposed");

const deploymentTab = DIAGRAM_TABS.find((t) => t.id === "deployment");
assert.ok(deploymentTab);
const composeFeNode = deploymentTab.nodes.find((n) => n.id === "dep-compose-fe");
const ghCiNode = deploymentTab.nodes.find((n) => n.id === "dep-gh-ci");
const feCiNode = deploymentTab.nodes.find((n) => n.id === "dep-fe-ci");
const playwrightCiNode = deploymentTab.nodes.find((n) => n.id === "dep-playwright-ci");
const onnxServingNode = deploymentTab.nodes.find((n) => n.id === "dep-onnx-serving-proposed");
assert.equal(composeFeNode?.status, "implemented");
assert.match(composeFeNode?.summary ?? "", /frontend\/Dockerfile/);
assert.equal(ghCiNode?.status, "implemented");
assert.match(ghCiNode?.summary ?? "", /scripts\/export_openapi\.py --check/);
assert.equal(feCiNode?.status, "implemented");
assert.match(feCiNode?.summary ?? "", /npm run verify/);
assert.equal(playwrightCiNode?.status, "implemented");
assert.match(playwrightCiNode?.summary ?? "", /ci-playwright-smoke\.mjs/);
assert.equal(onnxServingNode?.status, "proposed");
for (const node of deploymentTab.nodes) {
  assert.ok(node.group && node.group.trim().length > 0, `Deployment node ${node.id} must define group`);
}

// ---- 4. Exact dataset URLs, safe ENV_VARS, API_ENDPOINTS & discrepancies ----
const amazonDataset = DATASET_SOURCES.find((d) => d.id === "amazon_reviews");
const goDataset = DATASET_SOURCES.find((d) => d.id === "go_emotions");
assert.equal(
  amazonDataset?.primaryUrl,
  "https://www.kaggle.com/datasets/yacharki/amazon-reviews-for-sentianalysis-finegrained-csv",
);
assert.equal(
  goDataset?.primaryUrl,
  "https://huggingface.co/datasets/google-research-datasets/go_emotions",
);

function extractEnvNames(envText) {
  const names = [];
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^(?:#\s*)?([A-Z][A-Z0-9_]+)=/);
    if (match) {
      names.push(match[1]);
    }
  }
  return names;
}

const expectedEnvNames = [
  ...extractEnvNames(rootEnvExample),
  ...extractEnvNames(frontendEnvExample),
];
assert.deepEqual(
  ENV_VARS.map((v) => v.name),
  expectedEnvNames,
  "ENV_VARS must match all variables in .env.example plus NEXT_PUBLIC_API_URL",
);
assert.equal(
  ENV_VARS.find((v) => v.name === "NEXT_PUBLIC_API_URL")?.scope,
  "Frontend",
);

const endpointPaths = API_ENDPOINTS.map((e) => e.path);
for (const requiredPath of [
  "/readiness",
  "/predict/amazon",
  "/predict/go-emotions",
  "/datasets/summary",
  "/models/lab",
]) {
  assert.ok(
    endpointPaths.includes(requiredPath),
    `API_ENDPOINTS must document ${requiredPath}`,
  );
}
assert.equal(
  API_ENDPOINTS.find((e) => e.path === "/predict/amazon")?.method,
  "POST",
);
assert.equal(
  API_ENDPOINTS.find((e) => e.path === "/predict/go-emotions")?.method,
  "POST",
);
assert.equal(
  API_ENDPOINTS.find((e) => e.path === "/readiness")?.method,
  "GET",
);
assert.equal(
  API_ENDPOINTS.find((e) => e.path === "/datasets/summary")?.method,
  "GET",
);
assert.equal(
  API_ENDPOINTS.find((e) => e.path === "/models/lab")?.method,
  "GET",
);

// Discrepancies: Gensim, ONNX, Docker, unused motion packages
const gensimTool = TOOL_INTEGRATIONS.find((t) => t.id === "gensim");
assert.equal(gensimTool?.status, "partial");
assert.match(gensimTool?.statusNote ?? "", /configs\/requirement\.txt/);
assert.match(gensimTool?.statusNote ?? "", /omitted from `backend\/requirements\.txt`/);
assert.match(gensimTool?.statusNote ?? "", /ml\/amazon_rating\/inference\.py/);

const onnxTool = TOOL_INTEGRATIONS.find((t) => t.id === "onnx-onnxruntime");
assert.equal(onnxTool?.status, "verified_artifact");
assert.match(onnxTool?.versionOrSpec ?? "", /opset_version=17/);
assert.match(onnxTool?.statusNote ?? "", /NOT active in FastAPI live prediction endpoints/i);
assert.match(onnxTool?.statusNote ?? "", /PyTorch directly/i);

const dockerTool = TOOL_INTEGRATIONS.find((t) => t.id === "docker-compose");
assert.equal(dockerTool?.status, "active");
assert.match(dockerTool?.statusNote ?? "", /Dockerfile/);
assert.match(dockerTool?.statusNote ?? "", /frontend\/Dockerfile/);
assert.match(dockerTool?.statusNote ?? "", /frontend\/\.dockerignore/);

const ciTool = TOOL_INTEGRATIONS.find((t) => t.id === "github-actions-ci");
assert.equal(ciTool?.status, "active");
assert.match(ciTool?.statusNote ?? "", /test-backend/);
assert.match(ciTool?.statusNote ?? "", /test-frontend/);
assert.match(ciTool?.statusNote ?? "", /playwright-smoke/);
assert.match(ciTool?.statusNote ?? "", /scripts\/export_openapi\.py --check/);

const openApiTool = TOOL_INTEGRATIONS.find((t) => t.id === "openapi-schema-export");
assert.equal(openApiTool?.status, "active");
assert.match(openApiTool?.name ?? "", /docs\/openapi\.json/);
assert.match(openApiTool?.statusNote ?? "", /scripts\/export_openapi\.py --check/);
assert.match(openApiTool?.statusNote ?? "", /backend\/tests\/test_main\.py/);

const onnxServingTool = TOOL_INTEGRATIONS.find((t) => t.id === "onnx-runtime-api-serving");
assert.equal(onnxServingTool?.status, "proposed");
assert.match(onnxServingTool?.statusNote ?? "", /PyTorch/i);

for (const tool of TOOL_INTEGRATIONS) {
  assert.ok(
    Object.hasOwn(TOOL_STATUS_LABELS, tool.status),
    `Tool ${tool.id} has unknown status ${tool.status}`,
  );
}

// ---- 5. Component, animation & reduced-motion CSS safety ----
assert.match(architectureMapSource, /useGSAP\(/);
assert.match(architectureMapSource, /scope:\s*containerRef/);
assert.match(architectureMapSource, /revertOnUpdate:\s*true/);
assert.match(architectureMapSource, /gsap\.matchMedia\(\)/);
assert.match(architectureMapSource, /useReducedMotion\(\)/);
assert.match(architectureMapSource, /data-reduced-motion=\{reducedMotion \? "true" : undefined\}/);
assert.match(architectureMapSource, /event\.key === "ArrowRight"/);
assert.match(architectureMapSource, /event\.key === "ArrowLeft"/);
assert.match(architectureMapSource, /event\.key === "Home"/);
assert.match(architectureMapSource, /event\.key === "End"/);
assert.match(architectureMapSource, /Flowchart/);
assert.match(architectureMapSource, /Sequence view/);
assert.match(architectureMapSource, /data-track=\{track\.id\}/);
assert.match(architectureMapSource, /aria-label="Selected node details"/);

assert.match(docReferenceSource, /STACK_FILTER_TABS/);
assert.match(docReferenceSource, /DATASET_SOURCES/);
assert.match(docReferenceSource, /ENV_VARS/);
assert.match(docReferenceSource, /API_ENDPOINTS/);
assert.match(docReferenceSource, /OPERATIONAL_POLICIES/);
assert.match(docReferenceSource, /useReadiness\(\)/);

assert.match(docPageSource, /<ArchitectureMap\s*\/>/);
assert.match(docPageSource, /<DocumentationReference\s*\/>/);
assert.doesNotMatch(docPageSource, /HeroParallax|Truthful outputs/);

for (const [label, source] of [
  ["components/ArchitectureMap.tsx", architectureMapSource],
  ["components/DocumentationReference.tsx", docReferenceSource],
  ["pages/documentation.tsx", docPageSource],
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

for (const [label, source] of [
  ["components/ArchitectureMap.tsx", architectureMapSource],
  ["components/DocumentationReference.tsx", docReferenceSource],
  ["pages/documentation.tsx", docPageSource],
]) {
  assert.doesNotMatch(
    source,
    /\bconsole\.(log|info|debug|warn|error)\b/,
    `${label} must not log to console`,
  );
  assert.doesNotMatch(
    source,
    /dangerouslySetInnerHTML/,
    `${label} must not use dangerouslySetInnerHTML`,
  );
}

assert.match(
  globalsCss,
  /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.doc-node\s*\{/,
);
assert.match(
  globalsCss,
  /@media\s*\(max-width:\s*47\.9375rem\)\s*\{[\s\S]*?\.doc-node\s*\{\s*opacity:\s*1\s*!important;\s*transform:\s*none\s*!important;\s*\}/,
);
assert.match(
  globalsCss,
  /@media\s*\(max-width:\s*47\.9375rem\)\s*\{[\s\S]*?\.doc-edge__path\s*\{\s*stroke-dashoffset:\s*0\s*!important;\s*\}/,
);
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.doc-node\s*\{\s*opacity:\s*1\s*!important;\s*transform:\s*none\s*!important;\s*\}/,
);
assert.match(
  globalsCss,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.doc-edge__path\s*\{\s*stroke-dashoffset:\s*0\s*!important;\s*\}/,
);

console.log("Documentation contract, sanitization, and animation-review tests passed.");
