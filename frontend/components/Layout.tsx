import Link from "next/link";
import { useRouter } from "next/router";
import { Activity, BookOpen, Database, FlaskConical, Gauge, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">N</span>
          <span>NLP Lab<small>Language intelligence</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              aria-current={router.pathname === href ? "page" : undefined}
              className="nav-link"
              href={href}
              key={href}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-badge">API-connected workspace</span>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
