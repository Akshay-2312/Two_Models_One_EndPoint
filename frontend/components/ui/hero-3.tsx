"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Pause, Play } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import type { TechnologyLogoLicense, TechnologyStatus } from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";
import { Badge, type BadgeTone } from "./Badge";
import { Button, ButtonLink } from "./Button";

gsap.registerPlugin(useGSAP);

export type HeroMarqueeTile = {
  id: string;
  name: string;
  monogram: string;
  version: string;
  categoryLabel: string;
  status: TechnologyStatus;
  logoPath?: string | null;
  logoLicense?: TechnologyLogoLicense;
};

export type AnimatedMarqueeHeroProps = {
  kicker?: string;
  tagline: string;
  title: ReactNode;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  tiles: HeroMarqueeTile[];
};

const STATUS_META: Record<TechnologyStatus, { label: string; tone: BadgeTone }> = {
  verified_used: { label: "Verified · In use", tone: "success" },
  verified_export_only: { label: "Verified · Export", tone: "model" },
  partial: { label: "Partial", tone: "warning" },
  declared_unused: { label: "Declared · Unused", tone: "neutral" },
};

function TileLogo({
  logoPath,
  monogram,
}: {
  logoPath?: string | null;
  monogram: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (logoPath && !hasError) {
    return (
      <span className="tech-marquee__logo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt=""
          width={28}
          height={28}
          className="tech-marquee__logo-img"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      </span>
    );
  }

  return (
    <span className="tech-marquee__monogram" aria-hidden="true">
      {monogram}
    </span>
  );
}

function MarqueeTileCard({ tile }: { tile: HeroMarqueeTile }) {
  const statusMeta = STATUS_META[tile.status];

  return (
    <article
      className="tech-marquee__card"
      data-status={tile.status}
      title={tile.logoLicense ? `${tile.name} (${tile.logoLicense})` : tile.name}
    >
      <div className="tech-marquee__card-head">
        <TileLogo
          key={`${tile.id}-${tile.logoPath ?? "monogram"}`}
          logoPath={tile.logoPath}
          monogram={tile.monogram}
        />
        <Badge tone={statusMeta.tone} className="tech-marquee__status">
          {statusMeta.label}
        </Badge>
      </div>
      <div className="tech-marquee__card-body">
        <span className="tech-marquee__name">{tile.name}</span>
        <span className="tech-marquee__meta">
          {tile.categoryLabel} · {tile.version}
        </span>
      </div>
    </article>
  );
}

/**
 * Hero showcase adapted from `@ravikatiyar162/components/hero-3` (`AnimatedMarqueeHero`)
 * for NLP Lab's token system, accessibility rules, and reduced-motion contract.
 */
export function AnimatedMarqueeHero({
  kicker,
  tagline,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  tiles,
}: AnimatedMarqueeHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  const hasPrimaryCta = Boolean(ctaLabel && ctaHref);
  const hasSecondaryCta = Boolean(secondaryCtaLabel && secondaryCtaHref);
  const effectivePaused = paused || reducedMotion;

  useGSAP(
    () => {
      if (reducedMotion || !heroRef.current) return;

      const revealNodes = gsap.utils.toArray<HTMLElement>(".tech-hero__reveal");
      if (revealNodes.length === 0) return;

      gsap.fromTo(
        revealNodes,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "transform,opacity",
        },
      );
    },
    {
      scope: heroRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={heroRef}
      className="tech-hero"
      aria-labelledby={titleId}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <div className="tech-hero__copy">
        <div className="tech-hero__eyebrow tech-hero__reveal">
          {kicker ? <p className="specimen tech-hero__kicker">{kicker}</p> : null}
          <Badge tone="model" className="tech-hero__tagline">
            {tagline}
          </Badge>
        </div>

        <h1 id={titleId} className="tech-hero__title tech-hero__reveal">
          {title}
        </h1>

        <p className="tech-hero__description tech-hero__reveal">{description}</p>

        {hasPrimaryCta || hasSecondaryCta ? (
          <div className="tech-hero__actions tech-hero__reveal">
            {ctaLabel && ctaHref ? (
              <ButtonLink href={ctaHref} className="tech-hero__cta">
                {ctaLabel}
              </ButtonLink>
            ) : null}
            {secondaryCtaLabel && secondaryCtaHref ? (
              <ButtonLink
                href={secondaryCtaHref}
                variant="secondary"
                className="tech-hero__cta tech-hero__cta--secondary"
              >
                {secondaryCtaLabel}
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {tiles.length > 0 ? (
        <div
          className="tech-marquee"
          data-paused={effectivePaused ? "true" : "false"}
        >
          <div className="tech-marquee__toolbar">
            <span className="tech-marquee__summary">
              {tiles.length} audited stack {tiles.length === 1 ? "component" : "components"}
            </span>
            {!reducedMotion ? (
              <Button
                type="button"
                variant="secondary"
                className="tech-hero__toggle"
                aria-pressed={paused}
                onClick={() => setPaused((current) => !current)}
              >
                {paused ? (
                  <>
                    <Play size={14} strokeWidth={1.75} aria-hidden="true" />
                    <span>Resume showcase</span>
                  </>
                ) : (
                  <>
                    <Pause size={14} strokeWidth={1.75} aria-hidden="true" />
                    <span>Pause showcase</span>
                  </>
                )}
              </Button>
            ) : null}
          </div>

          <div className="tech-marquee__viewport">
            <div className="tech-marquee__track">
              <ul className="tech-marquee__list" aria-label="Technology stack showcase">
                {tiles.map((tile) => (
                  <li key={tile.id} className="tech-marquee__item">
                    <MarqueeTileCard tile={tile} />
                  </li>
                ))}
              </ul>

              {!reducedMotion ? (
                <div
                  className="tech-marquee__list tech-marquee__list--clone"
                  aria-hidden="true"
                >
                  {tiles.map((tile) => (
                    <div key={`${tile.id}-clone`} className="tech-marquee__item">
                      <MarqueeTileCard tile={tile} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
