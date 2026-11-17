import Link from "next/link";
import { useRouter } from "next/router";
import { Activity, BookOpen, Database, FlaskConical, Gauge, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import { useReadiness, type ReadinessPhase } from "./ReadinessProvider";
import { Badge, type BadgeTone } from "./ui/Badge";

const STATUS_LABEL: Record<ReadinessPhase, string> = {
  loading: "Checking API",
  ready: "API connected",
  degraded: "API degraded",
  offline: "API unreachable",
};

const PHASE_TONE: Record<ReadinessPhase, BadgeTone> = {
  loading: "neutral",
  ready: "success",
  degraded: "warning",
  offline: "danger",
};

const links = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/analyze/sentiment", label: "Sentiment Analyzer", icon: Activity },
  { href: "/analyze/emotions", label: "Emotion Analyzer", icon: HeartPulse },
  { href: "/model-lab", label: "Model Lab", icon: FlaskConical },
  { href: "/datasets", label: "Dataset Explorer", icon: Database },
  { href: "/documentation", label: "Documentation", icon: BookOpen },
];

export function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { phase, response, error } = useReadiness();
  const models = response ? Object.values(response.models) : [];
  const readyCount = models.filter((model) => model.ready).length;
  const badgeLabel =
    phase === "ready" && models.length > 0
      ? `${STATUS_LABEL.ready} · ${readyCount}/${models.length}`
      : STATUS_LABEL[phase];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>
            NLP Lab
            <small>Language intelligence</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              aria-current={router.pathname === href ? "page" : undefined}
              className="nav-link"
              href={href}
              key={href}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Badge
            data-phase={phase}
            dot
            role="status"
            title={error ?? "Readiness reported by the FastAPI service"}
            tone={PHASE_TONE[phase]}
          >
            {badgeLabel}
          </Badge>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
