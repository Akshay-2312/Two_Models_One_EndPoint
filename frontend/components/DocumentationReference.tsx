import Link from "next/link";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  API_ENDPOINTS,
  DATASET_SOURCES,
  ENV_VARS,
  OPERATIONAL_POLICIES,
  TOOL_INTEGRATIONS,
  TOOL_STATUS_LABELS,
  type ToolIntegrationItem,
  type ToolIntegrationStatus,
} from "@/lib/documentationData";
import { useReadiness, type ReadinessPhase } from "./ReadinessProvider";
import {
  Badge,
  Button,
  Callout,
  Card,
  SectionHeader,
  type BadgeTone,
  type CalloutTone,
} from "./ui";

type StackFilter = "all" | ToolIntegrationItem["category"];

const STACK_FILTER_TABS: Array<{ id: StackFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "ml", label: "ML & Training" },
  { id: "data", label: "Data" },
  { id: "infra", label: "Infra / CI" },
];

const CATEGORY_LABELS: Record<ToolIntegrationItem["category"], string> = {
  frontend: "Frontend",
  backend: "Backend",
  ml: "ML & Training",
  data: "Data",
  infra: "Infra / CI",
};

const TOOL_STATUS_TONE: Record<ToolIntegrationStatus, BadgeTone> = {
  active: "success",
  verified_artifact: "model",
  partial: "warning",
  installed_unused: "neutral",
  proposed: "neutral",
};

const READINESS_META: Record<
  ReadinessPhase,
  { label: string; badgeTone: BadgeTone; calloutTone: CalloutTone; summary: string }
> = {
  checking: {
    label: "Checking readiness",
    badgeTone: "neutral",
    calloutTone: "info",
    summary: "Probing GET /readiness (up to 60s allowed for lazy model bundle load).",
  },
  online: {
    label: "API & models ready",
    badgeTone: "success",
    calloutTone: "success",
    summary: "FastAPI service and both PyTorch inference bundles responded ready.",
  },
  degraded: {
    label: "API degraded",
    badgeTone: "warning",
    calloutTone: "warning",
    summary: "FastAPI responded, but at least one model bundle is not ready.",
  },
  offline: {
    label: "API offline",
    badgeTone: "danger",
    calloutTone: "danger",
    summary: "Could not reach the FastAPI service at the configured API base URL.",
  },
  unknown: {
    label: "Readiness unknown",
    badgeTone: "warning",
    calloutTone: "warning",
    summary: "The readiness payload did not match the expected ReadinessResponse contract.",
  },
};

function getHttpCodeTone(code: number): BadgeTone {
  if (code >= 200 && code < 300) return "success";
  if (code === 404 || code === 422 || code === 503) return "warning";
  return "danger";
}

/**
 * Ground-truth documentation reference sections: System Stack & Tool Matrix,
 * Verified Dataset Sources, and Operational Documentation (env vars, endpoints,
 * live readiness banner, and operational policies).
 */
export function DocumentationReference() {
  const { phase, response, error, checkedAt, refresh } = useReadiness();
  const [activeCategory, setActiveCategory] = useState<StackFilter>("all");
  const filterTabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const categoryCounts = useMemo(() => {
    const counts: Record<StackFilter, number> = {
      all: TOOL_INTEGRATIONS.length,
      frontend: 0,
      backend: 0,
      ml: 0,
      data: 0,
      infra: 0,
    };
    for (const item of TOOL_INTEGRATIONS) {
      counts[item.category] += 1;
    }
    return counts;
  }, []);

  const filteredTools = useMemo(() => {
    if (activeCategory === "all") return TOOL_INTEGRATIONS;
    return TOOL_INTEGRATIONS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  function handleFilterKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % STACK_FILTER_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (index - 1 + STACK_FILTER_TABS.length) % STACK_FILTER_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = STACK_FILTER_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveCategory(STACK_FILTER_TABS[nextIndex].id);
      filterTabRefs.current[nextIndex]?.focus();
    }
  }

  const readinessMeta = READINESS_META[phase];
  const checkedLabel = checkedAt
    ? new Date(checkedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="doc-reference">
      {/* Section A: System Stack & Tools Integration Matrix */}
      <section className="doc-section" id="stack-matrix">
        <SectionHeader
          description="Verified inventory of active runtimes, offline artifact tools, packaging discrepancies, unused declared motion dependencies, and proposed runtime targets."
          index="REF-01 / STACK"
          level={2}
          title="System Stack & Tools Integration Matrix"
        />

        <div
          aria-label="Filter tools by stack category"
          className="doc-filter-tabs"
          role="tablist"
        >
          {STACK_FILTER_TABS.map((tab, index) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                aria-controls="doc-stack-panel"
                aria-selected={isSelected}
                className="doc-filter-tab"
                id={`doc-stack-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                onKeyDown={(event) => handleFilterKeyDown(event, index)}
                ref={(el) => {
                  filterTabRefs.current[index] = el;
                }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                <span>{tab.label}</span>
                <span className="doc-filter-tab__count tabular-nums">
                  {categoryCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`doc-stack-tab-${activeCategory}`}
          className="doc-tool-grid"
          id="doc-stack-panel"
          role="tabpanel"
        >
          {filteredTools.map((tool) => (
            <Card
              className="doc-tool-card"
              key={tool.id}
              kicker={`${CATEGORY_LABELS[tool.category]} · ${tool.lifecycleStage}`}
              title={tool.name}
            >
              <div className="doc-tool-card__meta-row">
                <Badge tone={TOOL_STATUS_TONE[tool.status]}>
                  {TOOL_STATUS_LABELS[tool.status]}
                </Badge>
                <code className="doc-version-chip">{tool.versionOrSpec}</code>
              </div>

              <p className="doc-tool-card__purpose">{tool.purpose}</p>

              <dl className="doc-kv-list">
                <div>
                  <dt>Inputs</dt>
                  <dd>
                    <ul className="doc-code-list">
                      {tool.inputs.map((input) => (
                        <li key={input}>
                          <code>{input}</code>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>

                <div>
                  <dt>Outputs</dt>
                  <dd>
                    <ul className="doc-code-list">
                      {tool.outputs.map((output) => (
                        <li key={output}>
                          <code>{output}</code>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>

                <div>
                  <dt>Communicates with</dt>
                  <dd>{tool.communicatesWith.join(" · ")}</dd>
                </div>

                <div>
                  <dt>Status note</dt>
                  <dd className="doc-status-note">{tool.statusNote}</dd>
                </div>

                <div>
                  <dt>Source evidence</dt>
                  <dd>
                    <ul className="doc-code-list">
                      {tool.sourceEvidence.map((src) => (
                        <li key={src}>
                          <code>{src}</code>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      {/* Section B: Verified Dataset Sources */}
      <section className="doc-section" id="dataset-sources">
        <SectionHeader
          description="Upstream dataset origins, audited split counts, and repository raw-data redistribution rules."
          index="REF-02 / DATASETS"
          level={2}
          title="Verified Dataset Sources"
        />

        <div className="doc-two-col">
          {DATASET_SOURCES.map((dataset) => (
            <Card key={dataset.id} kicker={dataset.id} title={dataset.name}>
              <p className="doc-tool-card__purpose">{dataset.task}</p>

              <dl className="doc-kv-list">
                <div>
                  <dt>Splits summary</dt>
                  <dd>{dataset.splitsSummary}</dd>
                </div>
                <div>
                  <dt>Governance rule</dt>
                  <dd>{dataset.governanceNote}</dd>
                </div>
                <div>
                  <dt>Primary source</dt>
                  <dd>
                    <a
                      className="doc-external-link"
                      href={dataset.primaryUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>{dataset.primaryUrl}</span>
                      <ExternalLink aria-hidden="true" size={13} />
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>{dataset.secondaryLabel}</dt>
                  <dd>
                    <a
                      className="doc-external-link"
                      href={dataset.secondaryUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>{dataset.secondaryUrl}</span>
                      <ExternalLink aria-hidden="true" size={13} />
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="doc-card-footer">
                <Link className="doc-inline-link" href="/datasets">
                  Open Dataset Explorer distributions &amp; schemas
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section C: Operational Documentation */}
      <section className="doc-section" id="operational-docs">
        <SectionHeader
          description="Live API readiness diagnostics, environment configuration, FastAPI endpoint contracts, and runtime governance policies."
          index="REF-03 / OPERATIONS"
          level={2}
          title="Operational Documentation"
        />

        {/* Live Readiness Banner */}
        <Callout
          aria-live="polite"
          className="doc-readiness-banner"
          role="status"
          title={readinessMeta.label}
          tone={readinessMeta.calloutTone}
        >
          <div className="doc-readiness-banner__title">
            <Badge dot tone={readinessMeta.badgeTone}>
              {readinessMeta.label}
            </Badge>
            {checkedLabel ? (
              <span className="specimen tabular-nums">
                Last checked {checkedLabel}
              </span>
            ) : null}
          </div>
          <p>{readinessMeta.summary}</p>
          {error ? <p className="doc-readiness-banner__error">{error}</p> : null}

          {response?.models ? (
            <ul className="doc-readiness-models">
              {Object.entries(response.models).map(([modelKey, modelState]) => (
                <li className="doc-readiness-model" key={modelKey}>
                  <code>{modelKey}</code>
                  <Badge tone={modelState.ready ? "success" : "warning"}>
                    {modelState.ready ? "Ready" : "Not ready"}
                  </Badge>
                  {modelState.error ? (
                    <span className="muted">{modelState.error}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="doc-readiness-actions">
            <Button
              disabled={phase === "checking"}
              onClick={refresh}
              type="button"
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" size={14} />
              <span>{phase === "checking" ? "Checking…" : "Refresh readiness"}</span>
            </Button>
            <Link className="doc-inline-link" href="/model-lab">
              Check disk manifests in Model Lab
            </Link>
          </div>
        </Callout>

        {/* Environment Variables */}
        <Card
          kicker="CONFIG / SAFE DEFAULTS"
          title="Environment Variables"
        >
          <p className="doc-card-intro">
            All documented backend and frontend variables with safe example values
            and code-verified defaults (zero secrets or personal paths).
          </p>
          <div className="dataset-table-wrap">
            <table className="dataset-table doc-env-table">
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Safe example</th>
                  <th scope="col">Default / fallback</th>
                  <th scope="col">Runtime behavior &amp; source</th>
                </tr>
              </thead>
              <tbody>
                {ENV_VARS.map((envVar) => (
                  <tr key={envVar.name}>
                    <td>
                      <code>{envVar.name}</code>
                    </td>
                    <td>
                      <Badge
                        tone={envVar.scope === "Frontend" ? "model" : "neutral"}
                      >
                        {envVar.scope}
                      </Badge>
                    </td>
                    <td>
                      <code className="doc-wrap-code">{envVar.exampleValue}</code>
                    </td>
                    <td>
                      <code className="doc-wrap-code">
                        {envVar.defaultFallback}
                      </code>
                    </td>
                    <td>
                      <p className="doc-table-desc">{envVar.behavior}</p>
                      <span className="specimen">{envVar.sourceRef}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* FastAPI Endpoints & Pydantic Schemas */}
        <div className="doc-subsection">
          <div className="doc-subsection__head">
            <h3>FastAPI Endpoints &amp; Pydantic Schemas</h3>
            <p className="muted">
              Verified routes exposed by <code>backend/app/main.py</code> and
              typed against <code>backend/app/schemas.py</code>.
            </p>
          </div>

          <div className="doc-endpoint-grid">
            {API_ENDPOINTS.map((endpoint) => (
              <Card
                className="doc-endpoint-card"
                key={`${endpoint.method}-${endpoint.path}`}
                kicker={endpoint.sourceRef}
                title={
                  <span className="doc-endpoint-title">
                    <Badge
                      tone={endpoint.method === "POST" ? "model" : "success"}
                    >
                      {endpoint.method}
                    </Badge>
                    <code>{endpoint.path}</code>
                  </span>
                }
              >
                <p className="doc-tool-card__purpose">{endpoint.summary}</p>

                <dl className="doc-kv-list">
                  <div>
                    <dt>Request schema</dt>
                    <dd>
                      <code className="doc-wrap-code">
                        {endpoint.requestSchema}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Response schema</dt>
                    <dd>
                      <code className="doc-wrap-code">
                        {endpoint.responseSchema}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Response fields</dt>
                    <dd>
                      <ul className="doc-code-list">
                        {endpoint.responseFields.map((field) => (
                          <li key={field}>
                            <code>{field}</code>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Status codes</dt>
                    <dd>
                      <ul className="doc-status-codes">
                        {endpoint.statusCodes.map((statusEntry) => (
                          <li key={statusEntry.code}>
                            <Badge tone={getHttpCodeTone(statusEntry.code)}>
                              {statusEntry.code}
                            </Badge>
                            <span>{statusEntry.meaning}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </div>

        {/* Operational Policies */}
        <div className="doc-subsection">
          <div className="doc-subsection__head">
            <h3>Readiness, Resilience, Provenance &amp; Privacy Policies</h3>
            <p className="muted">
              Operational guarantees enforced across client fetch logic, model
              loaders, and dataset governance.
            </p>
          </div>

          <div className="doc-two-col">
            {OPERATIONAL_POLICIES.map((policy) => (
              <Card
                key={policy.id}
                kicker={policy.category}
                title={policy.title}
              >
                <p className="doc-tool-card__purpose">{policy.summary}</p>
                <ul className="doc-policy-list">
                  {policy.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <div className="doc-policy-sources">
                  <ul className="doc-code-list">
                    {policy.sourceRefs.map((src) => (
                      <li key={src}>
                        <code>{src}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
