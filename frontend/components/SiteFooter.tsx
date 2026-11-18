"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRef } from "react";
import { useReducedMotion } from "@/lib/motion";
import { useReadiness, type ReadinessPhase } from "./ReadinessProvider";
import { Badge, Button, ButtonLink, type BadgeTone } from "./ui";

const AMBIENT_PHRASES = [
  "Sentiment Analysis",
  "Emotion Detection",
  "Word2Vec + BiLSTM",
  "DistilBERT",
  "Explainable Evaluation",
] as const;

const FOOTER_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/model-lab", label: "Model Lab" },
  { href: "/datasets", label: "Datasets" },
  { href: "/documentation", label: "Documentation" },
  { href: "/technology", label: "Technology" },
] as const;

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

/**
 * Shared footer mounted once in `Layout.tsx`.
 * Exposes verified workspace navigation, live API readiness, and a reduced-motion-safe reveal.
 */
export function SiteFooter() {
  const footerRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { phase, response, error } = useReadiness();

  const models = response ? Object.values(response.models) : [];
  const readyCount = models.filter((model) => model.ready).length;
  const statusLabel =
    phase === "online" && models.length > 0
      ? `${STATUS_LABEL.online} · ${readyCount}/${models.length}`
      : STATUS_LABEL[phase];

  useGSAP(
    () => {
      if (reducedMotion || !footerRef.current) return;

      gsap.registerPlugin(useGSAP, ScrollTrigger);

      const revealNodes = gsap.utils.toArray<HTMLElement>(".site-footer__reveal");
      if (revealNodes.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        gsap.fromTo(
          revealNodes,
          { opacity: 0.88, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.05,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: footerRef.current,
              start: "top 92%",
              once: true,
            },
          },
        );
      });

      return () => mm.revert();
    },
    {
      scope: footerRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  );

  function scrollToTop() {
    if (typeof window === "undefined") return;
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <footer
      ref={footerRef}
      aria-label="Site footer"
      className="site-footer"
      id="site-footer"
    >
      <div className="site-footer__watermark" aria-hidden="true">
        NLP LAB
      </div>

      <div className="site-footer__inner">
        <div className="site-footer__phrases" aria-hidden="true">
          {AMBIENT_PHRASES.map((phrase) => (
            <span key={phrase} className="site-footer__phrase">
              {phrase}
            </span>
          ))}
        </div>

        <div className="site-footer__main">
          <div className="site-footer__lead site-footer__reveal">
            <h2 className="site-footer__heading">
              Explore language. Understand emotion.
            </h2>
            <div className="site-footer__actions">
              <ButtonLink href="/analyze/sentiment" className="site-footer__cta">
                Try Sentiment Analyzer
              </ButtonLink>
              <ButtonLink
                href="/analyze/emotions"
                variant="secondary"
                className="site-footer__cta site-footer__cta--secondary"
              >
                Try Emotion Analyzer
              </ButtonLink>
            </div>
          </div>

          <div className="site-footer__meta site-footer__reveal">
            <nav aria-label="Footer navigation" className="site-footer__nav">
              {FOOTER_LINKS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? router.pathname === "/"
                    : router.pathname === item.href ||
                      router.pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="site-footer__link"
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="site-footer__readiness">
              <Badge
                className="site-footer__status"
                data-phase={phase}
                dot
                role="status"
                title={error ?? "Readiness reported by the FastAPI service"}
                tone={PHASE_TONE[phase]}
              >
                <span className="badge__text">{statusLabel}</span>
              </Badge>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom site-footer__reveal">
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} NLP Lab. Built for NLP research and experimentation.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="site-footer__top"
            onClick={scrollToTop}
          >
            <ArrowUp size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Back to top</span>
          </Button>
        </div>
      </div>
    </footer>
  );
}
