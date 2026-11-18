import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  HeartPulse,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import { readStored, writeStored } from "../lib/storage";
import { useReadiness, type ReadinessPhase } from "./ReadinessProvider";
import { SiteFooter } from "./SiteFooter";
import { Badge, type BadgeTone } from "./ui/Badge";

const SIDEBAR_KEY = "nlp-lab-sidebar-collapsed";

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

const links = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/analyze/sentiment", label: "Sentiment Analyzer", icon: Activity },
  { href: "/analyze/emotions", label: "Emotion Analyzer", icon: HeartPulse },
  { href: "/model-lab", label: "Model Lab", icon: FlaskConical },
  { href: "/datasets", label: "Dataset Explorer", icon: Database },
  { href: "/documentation", label: "Documentation", icon: BookOpen },
  { href: "/technology", label: "Technology Used", icon: Cpu },
];

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { phase, response, error } = useReadiness();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readStored("local", SIDEBAR_KEY) === "1");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      writeStored("local", SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  const models = response ? Object.values(response.models) : [];
  const readyCount = models.filter((model) => model.ready).length;
  const badgeLabel =
    phase === "online" && models.length > 0
      ? `${STATUS_LABEL.online} · ${readyCount}/${models.length}`
      : STATUS_LABEL[phase];

  return (
    <div className="app-shell" data-sidebar={collapsed ? "collapsed" : "expanded"}>
      <aside className="sidebar">
        <div className="sidebar__head">
          <Link className="brand" href="/" title="NLP Lab">
            <span className="brand-mark" aria-hidden="true">
              N
            </span>
            <span className="brand__text">
              NLP Lab
              <small>Language intelligence</small>
            </span>
          </Link>
          <button
            aria-controls="primary-nav"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <nav aria-label="Primary navigation" id="primary-nav">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              aria-current={isRouteActive(router.pathname, href) ? "page" : undefined}
              className="nav-link"
              href={href}
              key={href}
              title={label}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">{label}</span>
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
            <span className="badge__text">{badgeLabel}</span>
          </Badge>
        </div>
      </aside>

      <div className="app-main">
        <main className="main-content">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
