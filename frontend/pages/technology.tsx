import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";
import {
  AnimatedMarqueeHero,
  Badge,
  Button,
  Callout,
  Card,
  SectionHeader,
  StatisticsLoader,
  type BadgeTone,
  type HeroMarqueeTile,
} from "../components/ui";
import type {
  TechnologyCategory,
  TechnologyItem,
  TechnologyStatus,
} from "../lib/api";
import { useTechnologyManifest } from "../lib/useTechnologyManifest";

type CategoryFilter = "all" | TechnologyCategory;

const CATEGORY_ORDER: TechnologyCategory[] = [
  "frontend",
  "backend",
  "ml_nlp",
  "data",
  "testing",
  "deployment",
];

const FALLBACK_CATEGORY_LABELS: Record<TechnologyCategory, string> = {
  frontend: "Frontend & Visualization",
  backend: "Backend API & Schemas",
  ml_nlp: "ML / NLP & Parity Export",
  data: "Data Ingestion & Sync",
  testing: "Testing & Quality Gates",
  deployment: "Containers & CI/CD",
};

const MODEL_DISPLAY_LABELS: Record<string, string> = {
  amazon_rating: "Amazon Rating (Word2Vec + BiLSTM)",
  go_emotions: "GoEmotions (DistilBERT)",
};

const CARD_STATUS_META: Record<
  TechnologyStatus,
  { label: string; tone: BadgeTone }
> = {
  verified_used: { label: "Verified used", tone: "success" },
  verified_export_only: { label: "Export / offline only", tone: "model" },
  partial: { label: "Partial packaging", tone: "warning" },
  declared_unused: { label: "Declared · Unused", tone: "neutral" },
};

function TechLogo({
  logoPath,
  monogram,
}: {
  logoPath: string | null;
  monogram: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (logoPath && !hasError) {
    return (
      <span className="tech-card__logo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt=""
          width={36}
          height={36}
          className="tech-card__logo-img"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      </span>
    );
  }

  return (
    <span className="tech-card__monogram" aria-hidden="true">
      {monogram}
    </span>
  );
}

function TechnologyCard({
  item,
  categoryLabel,
}: {
  item: TechnologyItem;
  categoryLabel: string;
}) {
  const statusMeta = CARD_STATUS_META[item.status];

  return (
    <Card as="article" className="tech-card" data-status={item.status} kicker={categoryLabel}>
      <div className="tech-card__head">
        <div className="tech-card__identity">
          <TechLogo
            key={`${item.id}-${item.logo_path ?? "monogram"}`}
            logoPath={item.logo_path}
            monogram={item.monogram}
          />
          <div className="tech-card__title-group">
            <h3 className="tech-card__title">{item.name}</h3>
            <span className="tech-card__version">{item.version}</span>
          </div>
        </div>
        <Badge className="tech-card__badge" tone={statusMeta.tone}>
          {statusMeta.label}
        </Badge>
      </div>

      <p className="tech-card__role">{item.role}</p>

      {item.status !== "verified_used" ? (
        <p className="tech-card__status-note">{item.status_note}</p>
      ) : null}

      <dl className="tech-card__details">
        <div>
          <dt>Boundary</dt>
          <dd>{item.communication_boundary}</dd>
        </div>
        <div>
          <dt>Icon license</dt>
          <dd>{item.logo_license}</dd>
        </div>
      </dl>

      <div className="tech-card__sources">
        <span className="tech-card__sources-label">Verified in</span>
        <ul className="tech-source-list">
          {item.verification_sources.map((src) => (
            <li key={src}>
              <code className="tech-source-chip">{src}</code>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default function TechnologyPage() {
  const { phase, data, error, sourceUrl, refresh } = useTechnologyManifest();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { coreTechnologies, unusedTechnologies, heroTiles } = useMemo(() => {
    const items = data?.technologies ?? [];
    const core = items.filter((item) => item.status !== "declared_unused");
    const unused = items.filter((item) => item.status === "declared_unused");
    const tiles: HeroMarqueeTile[] = core.map((item) => ({
      id: item.id,
      name: item.name,
      monogram: item.monogram,
      version: item.version,
      categoryLabel:
        data?.categories_summary[item.category]?.label ??
        FALLBACK_CATEGORY_LABELS[item.category],
      status: item.status,
      logoPath: item.logo_path,
      logoLicense: item.logo_license,
    }));
    return {
      coreTechnologies: core,
      unusedTechnologies: unused,
      heroTiles: tiles,
    };
  }, [data]);

  const categoryTabs = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: coreTechnologies.length,
      frontend: 0,
      backend: 0,
      ml_nlp: 0,
      data: 0,
      testing: 0,
      deployment: 0,
    };
    for (const item of coreTechnologies) {
      counts[item.category] += 1;
    }

    return [
      { id: "all" as CategoryFilter, label: "All", count: counts.all },
      ...CATEGORY_ORDER.map((category) => ({
        id: category as CategoryFilter,
        label:
          data?.categories_summary[category]?.label ??
          FALLBACK_CATEGORY_LABELS[category],
        count: counts[category],
      })),
    ];
  }, [coreTechnologies, data]);

  const filteredTechnologies = useMemo(() => {
    if (activeCategory === "all") return coreTechnologies;
    return coreTechnologies.filter((item) => item.category === activeCategory);
  }, [activeCategory, coreTechnologies]);

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % categoryTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + categoryTabs.length) % categoryTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = categoryTabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const target = categoryTabs[nextIndex];
      if (target) {
        setActiveCategory(target.id);
        tabRefs.current[nextIndex]?.focus();
      }
    }
  }

  const heroProps = {
    ctaHref: "#stack-inventory",
    ctaLabel: "Explore stack inventory",
    description:
      "Every runtime, framework, export tool, and CI workflow listed below is programmatically audited from repository manifests, lockfiles, Docker definitions, and ONNX parity checks.",
    kicker: "NLP-07 / STACK",
    secondaryCtaHref: "#communication-boundaries",
    secondaryCtaLabel: "Communication boundaries",
    tagline: "Verified Stack Audit",
    title: "Verified stack across UI, inference, and training",
  };

  if (phase === "loading" || phase === "stalled") {
    return (
      <section className="page-section tech-page">
        <AnimatedMarqueeHero {...heroProps} tiles={[]} />
        <div className="page-loading-stage">
          <div aria-hidden="true" className="tech-marquee-skeleton" />
          <StatisticsLoader
            error={error}
            label="Loading verified technology manifest…"
            onRetry={refresh}
            status={phase}
          />
        </div>
      </section>
    );
  }

  if (phase === "unavailable") {
    return (
      <section className="page-section tech-page">
        <SectionHeader
          description="Verified inventory of active runtimes, offline export tools, packaging notes, and inter-layer communication boundaries."
          index="NLP-07 / STACK"
          title="Technology Used"
        />
        <Callout
          aria-live="polite"
          role="status"
          title="Technology manifest unavailable"
          tone="warning"
        >
          <p>
            {error ??
              "Cannot reach the FastAPI technology manifest endpoint (/technology). Start the backend service to inspect the verified stack."}
          </p>
          <p className="dataset-endpoint-note">
            Endpoint: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      </section>
    );
  }

  if (phase === "failed") {
    return (
      <section className="page-section tech-page">
        <SectionHeader
          description="Verified inventory of active runtimes, offline export tools, packaging notes, and inter-layer communication boundaries."
          index="NLP-07 / STACK"
          title="Technology Used"
        />
        <Callout
          aria-live="polite"
          role="status"
          title="Failed to load technology manifest"
          tone="danger"
        >
          <p>
            {error ??
              "An unexpected error occurred while fetching the verified technology manifest."}
          </p>
          <p className="dataset-endpoint-note">
            Source URL: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      </section>
    );
  }

  if (phase === "empty" || !data) {
    return (
      <section className="page-section tech-page">
        <SectionHeader
          description="Verified inventory of active runtimes, offline export tools, packaging notes, and inter-layer communication boundaries."
          index="NLP-07 / STACK"
          title="Technology Used"
        />
        <Callout
          aria-live="polite"
          role="status"
          title="No technology manifest entries available"
          tone="info"
        >
          <p>
            The endpoint (<code>{sourceUrl}</code>) returned no technology
            entries. Regenerate <code>data/technology_manifest.json</code> and
            retry.
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      </section>
    );
  }

  const readinessEntries = Object.entries(data.readiness);

  return (
    <section className="page-section tech-page">
      <AnimatedMarqueeHero {...heroProps} tiles={heroTiles} />

      <div className="dataset-provenance-bar">
        <div className="dataset-provenance-bar__meta">
          <Badge dot tone="success">
            Manifest verified
          </Badge>
          <span className="specimen">API v{data.api_version}</span>
          <span className="specimen">{data.provenance}</span>
        </div>
        <Button onClick={refresh} type="button" variant="secondary">
          Refresh manifest
        </Button>
      </div>

      <section
        aria-labelledby="tech-inventory-heading"
        className="tech-section"
        id="stack-inventory"
      >
        <header className="section-header section-header--sub">
          <p className="specimen">STACK-01 / INVENTORY</p>
          <h2 id="tech-inventory-heading">Verified stack inventory</h2>
          <p className="lede">
            Filter active runtimes, offline parity/ingestion tools, and
            packaging notes across all six engineering layers. Unused declared
            dependencies are audited separately below.
          </p>
        </header>

        <div
          aria-label="Filter verified technologies by layer"
          className="tech-tablist"
          role="tablist"
        >
          {categoryTabs.map((tab, index) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                aria-controls="tech-stack-panel"
                aria-selected={isSelected}
                className="tech-tab"
                id={`tech-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                type="button"
              >
                <span>{tab.label}</span>
                <span className="tech-tab__count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`tech-tab-${activeCategory}`}
          className="tech-tabpanel"
          id="tech-stack-panel"
          role="tabpanel"
        >
          {filteredTechnologies.length > 0 ? (
            <div className="tech-grid">
              {filteredTechnologies.map((item) => (
                <TechnologyCard
                  categoryLabel={
                    data.categories_summary[item.category]?.label ??
                    FALLBACK_CATEGORY_LABELS[item.category]
                  }
                  item={item}
                  key={item.id}
                />
              ))}
            </div>
          ) : (
            <Callout title="No active entries in this category" tone="info">
              <p>
                All entries in this category are currently listed under the
                declared-unused audit below.
              </p>
            </Callout>
          )}
        </div>

        {unusedTechnologies.length > 0 ? (
          <div className="tech-unused-audit">
            <Callout
              title={`Package.json audit: ${unusedTechnologies.length} declared dependencies excluded from active stack`}
              tone="info"
            >
              <p>
                Packages such as <code>tailwindcss</code>,{" "}
                <code>framer-motion</code>, <code>motion</code>,{" "}
                <code>lenis</code>, <code>lottie-react</code>, and{" "}
                <code>@rive-app/react-canvas</code> appear in{" "}
                <code>frontend/package.json</code> but are not used by active
                pages or CSS styling. They are isolated here so they are never
                misrepresented as active core stack.
              </p>
              <details className="tech-unused-disclosure">
                <summary className="tech-unused-disclosure__summary">
                  Inspect {unusedTechnologies.length} declared-unused packages
                </summary>
                <ul className="tech-unused-list">
                  {unusedTechnologies.map((item) => (
                    <li className="tech-unused-item" key={item.id}>
                      <div className="tech-unused-item__head">
                        <div className="tech-unused-item__title-wrap">
                          <span
                            className="tech-card__monogram tech-card__monogram--sm"
                            aria-hidden="true"
                          >
                            {item.monogram}
                          </span>
                          <span className="tech-unused-item__name">
                            {item.name}
                          </span>
                          <code className="tech-source-chip">
                            {item.version}
                          </code>
                        </div>
                        <Badge tone="neutral">
                          {CARD_STATUS_META[item.status].label}
                        </Badge>
                      </div>
                      <p className="tech-unused-item__note">
                        {item.status_note}
                      </p>
                      <div className="tech-unused-item__sources">
                        {item.verification_sources.map((src) => (
                          <code className="tech-source-chip" key={src}>
                            {src}
                          </code>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            </Callout>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="tech-boundaries-heading"
        className="tech-section"
        id="communication-boundaries"
      >
        <header className="section-header section-header--sub">
          <p className="specimen">STACK-02 / BOUNDARIES</p>
          <h2 id="tech-boundaries-heading">
            Communication boundaries &amp; live runtime readiness
          </h2>
          <p className="lede">
            Verified data contracts, transport protocols, resilience safeguards,
            and live backend readiness reported by the FastAPI service.
          </p>
        </header>

        <Card
          as="section"
          aria-label="Live runtime readiness summary"
          className="tech-readiness-summary"
          kicker="Runtime telemetry · GET /technology"
          tone="sunken"
        >
          <div className="tech-readiness-row">
            <div className="tech-readiness-group">
              <span className="tech-readiness-group__label">
                Live inference models
              </span>
              <div className="tech-readiness-badges">
                {readinessEntries.map(([modelId, status]) => (
                  <div className="tech-readiness-item" key={modelId}>
                    <Badge dot tone={status.ready ? "success" : "warning"}>
                      {MODEL_DISPLAY_LABELS[modelId] ?? modelId}:{" "}
                      {status.ready ? "Ready" : "Not ready"}
                    </Badge>
                    {status.error ? (
                      <span className="tech-readiness-item__error">
                        {status.error}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="tech-readiness-group">
              <span className="tech-readiness-group__label">
                ONNX parity exports (offline)
              </span>
              <div className="tech-readiness-badges">
                <Badge
                  tone={
                    data.onnx_artifacts_present === data.onnx_artifacts_expected
                      ? "model"
                      : "warning"
                  }
                >
                  {data.onnx_artifacts_present} / {data.onnx_artifacts_expected}{" "}
                  ONNX artifacts present
                </Badge>
                <Badge tone="neutral">API v{data.api_version}</Badge>
              </div>
              {data.onnx_artifact_paths.length > 0 ? (
                <ul className="tech-source-list">
                  {data.onnx_artifact_paths.map((artifactPath) => (
                    <li key={artifactPath}>
                      <code className="tech-source-chip">{artifactPath}</code>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="tech-boundaries-grid">
          {data.boundaries.map((boundary) => (
            <Card
              as="article"
              className="tech-boundary-card"
              key={boundary.id}
              kicker={boundary.protocol_or_format}
            >
              <div className="tech-boundary-card__head">
                <h3 className="tech-boundary-card__title">{boundary.title}</h3>
                <div className="tech-boundary-route">
                  <span className="tech-boundary-layer">
                    {boundary.source_layer}
                  </span>
                  <ArrowLeftRight
                    aria-hidden="true"
                    className="tech-boundary-arrow"
                    size={14}
                    strokeWidth={1.75}
                  />
                  <span className="tech-boundary-layer tech-boundary-layer--target">
                    {boundary.target_layer}
                  </span>
                </div>
              </div>

              <div className="tech-boundary-io">
                <div className="tech-boundary-io__col">
                  <h4>Inputs</h4>
                  <ul>
                    {boundary.inputs.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
                <div className="tech-boundary-io__col">
                  <h4>Outputs</h4>
                  <ul>
                    {boundary.outputs.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="tech-boundary-resilience">
                <ShieldCheck
                  aria-hidden="true"
                  className="tech-boundary-resilience__icon"
                  size={16}
                  strokeWidth={1.75}
                />
                <p>{boundary.security_and_resilience}</p>
              </div>

              <div className="tech-card__sources">
                <span className="tech-card__sources-label">Verified in</span>
                <ul className="tech-source-list">
                  {boundary.verification_sources.map((src) => (
                    <li key={src}>
                      <code className="tech-source-chip">{src}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
