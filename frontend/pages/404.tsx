import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReadiness, type ReadinessPhase } from "../components/ReadinessProvider";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  SectionHeader,
  type BadgeTone,
} from "../components/ui";

const STATUS_LABEL: Record<ReadinessPhase, string> = {
  checking: "Checking API",
  online: "API connected",
  degraded: "API degraded",
  offline: "API unreachable",
  unknown: "API state unclear",
};

const PHASE_TONE: Record<ReadinessPhase, BadgeTone> = {
  checking: "neutral",
  online: "success",
  degraded: "warning",
  offline: "danger",
  unknown: "warning",
};

const WORKSPACE_ROUTES = [
  {
    href: "/",
    label: "Dashboard",
    detail: "Overview, capabilities, model paths, and live readiness",
  },
  {
    href: "/analyze/sentiment",
    label: "Sentiment Analyzer",
    detail: "5-class Amazon review rating via Word2Vec + BiLSTM",
  },
  {
    href: "/analyze/emotions",
    label: "Emotion Analyzer",
    detail: "28-label GoEmotions multi-label scoring via DistilBERT",
  },
  {
    href: "/model-lab",
    label: "Model Lab",
    detail: "Training pipelines, evaluation reports, and ONNX parity",
  },
  {
    href: "/datasets",
    label: "Dataset Explorer",
    detail: "Split counts, label prevalence, and quality audits",
  },
  {
    href: "/documentation",
    label: "Documentation",
    detail: "Architecture map, inference sequence, and API contracts",
  },
  {
    href: "/technology",
    label: "Technology Used",
    detail: "Verified stack inventory and communication boundaries",
  },
] as const;

export default function NotFoundPage() {
  const { phase, response, error, refresh } = useReadiness();
  const models = response ? Object.values(response.models) : [];
  const readyCount = models.filter((model) => model.ready).length;
  const badgeLabel =
    phase === "online" && models.length > 0
      ? `${STATUS_LABEL.online} · ${readyCount}/${models.length}`
      : STATUS_LABEL[phase];

  return (
    <section className="page-section notfound-page">
      <SectionHeader
        description="The requested route is not part of the NLP Lab workbench. Use the active routes below to jump back into an analyzer, Model Lab, datasets, documentation, or technology audit."
        index="NLP-404 / NOT FOUND"
        title="Page not found"
      >
        <div className="notfound-actions">
          <ButtonLink href="/">Return to Dashboard</ButtonLink>
          <ButtonLink href="/technology" variant="secondary">
            Technology Used
          </ButtonLink>
        </div>
      </SectionHeader>

      <Card
        as="section"
        aria-label="Live backend readiness"
        className="notfound-status-card"
        kicker="Runtime status"
        tone="sunken"
      >
        <div className="notfound-status-card__row">
          <Badge
            data-phase={phase}
            dot
            role="status"
            title={error ?? "Readiness reported by the FastAPI service"}
            tone={PHASE_TONE[phase]}
          >
            <span className="badge__text">{badgeLabel}</span>
          </Badge>
          <Button onClick={refresh} type="button" variant="secondary">
            Check readiness
          </Button>
        </div>
        {error ? <p className="notfound-status-card__error">{error}</p> : null}
      </Card>

      <section aria-labelledby="notfound-routes-heading" className="notfound-routes">
        <h2 className="notfound-routes__title" id="notfound-routes-heading">
          Active workbench routes
        </h2>
        <nav aria-label="Active workbench routes" className="notfound-nav">
          {WORKSPACE_ROUTES.map((route) => (
            <Link className="notfound-route-link" href={route.href} key={route.href}>
              <div className="notfound-route-link__body">
                <span className="notfound-route-link__label">{route.label}</span>
                <span className="notfound-route-link__path">{route.href}</span>
                <p className="notfound-route-link__detail">{route.detail}</p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="notfound-route-link__arrow"
                size={16}
                strokeWidth={1.75}
              />
            </Link>
          ))}
        </nav>
      </section>
    </section>
  );
}
