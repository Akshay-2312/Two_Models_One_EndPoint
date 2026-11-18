"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { PipelineStep, PipelineStepStatus } from "@/lib/api";
import { useReducedMotion } from "@/lib/motion";
import { Badge, type BadgeTone, Button, Card } from "./ui";

export type PipelineTrackProps = {
  trackId: string;
  trackCode: string;
  title: string;
  subtitle: string;
  endpoint: string;
  runtime: string;
  steps: PipelineStep[];
  accent?: "primary" | "model";
};

const STATUS_META: Record<
  PipelineStepStatus,
  { label: string; tone: BadgeTone }
> = {
  completed: { label: "Completed", tone: "success" },
  not_available: { label: "Not available", tone: "warning" },
  planned: { label: "Planned", tone: "neutral" },
  skipped: { label: "Skipped", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  unknown: { label: "Unknown", tone: "neutral" },
};

function getStatusMeta(status: PipelineStepStatus): {
  label: string;
  tone: BadgeTone;
} {
  return STATUS_META[status] ?? { label: "Unknown", tone: "neutral" };
}

function formatStepNumber(order: number): string {
  return String(order).padStart(2, "0");
}

/**
 * Reusable, accessible node-and-edge training-to-inference pipeline explainer
 * for a single model track. Supports keyboard navigation, step inspection,
 * Play/Pause walkthrough, and reduced-motion-safe GSAP ScrollTrigger choreography.
 */
export function PipelineTrack({
  trackId,
  trackCode,
  title,
  subtitle,
  endpoint,
  runtime,
  steps,
  accent = "model",
}: PipelineTrackProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const safeIndex =
    orderedSteps.length > 0
      ? Math.min(selectedIndex, orderedSteps.length - 1)
      : 0;
  const activeStep = orderedSteps[safeIndex] ?? null;

  useEffect(() => {
    if (!isPlaying || orderedSteps.length <= 1) return;

    const timer = window.setInterval(() => {
      setSelectedIndex((current) => {
        if (current >= orderedSteps.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isPlaying, orderedSteps.length]);

  useGSAP(
    () => {
      if (reducedMotion || !graphRef.current || orderedSteps.length === 0) {
        return;
      }

      gsap.registerPlugin(useGSAP, ScrollTrigger);

      const nodes = gsap.utils.toArray<HTMLElement>(".pipeline-node");
      const edges = gsap.utils.toArray<SVGPathElement>(".pipeline-edge__path");
      if (nodes.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: graphRef.current,
            start: "top 92%",
            once: true,
          },
        });

        const lastIdx = Math.max(1, nodes.length - 1);

        nodes.forEach((node, index) => {
          const progress = index / lastIdx;
          // Non-uniform quadratic ease-out wave: gaps shrink smoothly as stages progress.
          const waveDelay = 0.24 * (1 - Math.pow(1 - progress, 2));
          const riseDistance = index === 0 ? 12 : Math.max(6, 10 - index * 0.4);

          timeline.fromTo(
            node,
            { opacity: 0, y: riseDistance, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.24,
              ease: "power2.out",
              clearProps: "transform,opacity",
            },
            waveDelay,
          );

          const edge = edges[index];
          if (edge) {
            timeline.fromTo(
              edge,
              { strokeDashoffset: 100 },
              {
                strokeDashoffset: 0,
                duration: 0.22,
                ease: "power2.out",
                clearProps: "strokeDashoffset",
              },
              waveDelay + 0.06,
            );
          }
        });
      });

      return () => mm.revert();
    },
    {
      scope: containerRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  );

  function selectStep(index: number, focusTab = false) {
    if (orderedSteps.length === 0) return;
    const bounded = Math.max(0, Math.min(orderedSteps.length - 1, index));
    setIsPlaying(false);
    setSelectedIndex(bounded);
    if (focusTab) {
      tabRefs.current[bounded]?.focus();
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (orderedSteps.length <= 1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % orderedSteps.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + orderedSteps.length) % orderedSteps.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = orderedSteps.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectStep(nextIndex, true);
    }
  }

  function handleToggleWalkthrough() {
    if (orderedSteps.length <= 1) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (safeIndex >= orderedSteps.length - 1) {
      setSelectedIndex(0);
    }
    setIsPlaying(true);
  }

  if (orderedSteps.length === 0) {
    return (
      <Card kicker={trackCode} title={title}>
        <p className="muted">No pipeline stages recorded for this track.</p>
      </Card>
    );
  }

  return (
    <div
      className={`pipeline-track pipeline-track--${accent}`}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      ref={containerRef}
    >
      <Card kicker={trackCode} title={title}>
        <div className="pipeline-track__header">
          <div className="pipeline-track__intro">
            <p className="pipeline-track__subtitle">{subtitle}</p>
            <div className="pipeline-track__facts">
              <span className="specimen">Endpoint: {endpoint}</span>
              <span className="specimen">Runtime: {runtime}</span>
              <span className="specimen tabular-nums">
                Stage {formatStepNumber(activeStep?.order ?? 1)} /{" "}
                {formatStepNumber(orderedSteps.length)}
              </span>
            </div>
          </div>

          <div className="pipeline-track__controls">
            <Button
              aria-pressed={isPlaying}
              onClick={handleToggleWalkthrough}
              type="button"
              variant="secondary"
            >
              {isPlaying ? (
                <>
                  <Pause aria-hidden="true" size={15} />
                  <span>Pause walkthrough</span>
                </>
              ) : (
                <>
                  <Play aria-hidden="true" size={15} />
                  <span>Play walkthrough</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="pipeline-graph" ref={graphRef}>
          <div
            aria-label={`${title} pipeline stages`}
            className="pipeline-nodes"
            role="tablist"
          >
            {orderedSteps.map((step, index) => {
              const isSelected = index === safeIndex;
              const statusMeta = getStatusMeta(step.status);
              const hasNext = index < orderedSteps.length - 1;

              return (
                <div className="pipeline-item" key={step.id}>
                  <button
                    aria-controls={`pipeline-panel-${trackId}`}
                    aria-current={isSelected ? "step" : undefined}
                    aria-selected={isSelected}
                    className="pipeline-node"
                    data-active={isSelected ? "true" : "false"}
                    data-status={step.status}
                    id={`pipeline-tab-${trackId}-${step.id}`}
                    onClick={() => selectStep(index)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    role="tab"
                    tabIndex={isSelected ? 0 : -1}
                    type="button"
                  >
                    <div className="pipeline-node__top">
                      <span className="pipeline-node__order tabular-nums">
                        {formatStepNumber(step.order)}
                      </span>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <span className="pipeline-node__title">{step.title}</span>
                    <span className="pipeline-node__artifact">
                      {step.output_artifact}
                    </span>
                  </button>

                  {hasNext ? (
                    <div aria-hidden="true" className="pipeline-connector">
                      <svg
                        className="pipeline-edge pipeline-edge--horizontal"
                        fill="none"
                        viewBox="0 0 36 16"
                      >
                        <path
                          className="pipeline-edge__path"
                          d="M2 8 H31"
                          pathLength={100}
                          strokeDasharray="100"
                        />
                        <path
                          className="pipeline-edge__arrow"
                          d="M27 4 L32 8 L27 12"
                        />
                      </svg>
                      <svg
                        className="pipeline-edge pipeline-edge--vertical"
                        fill="none"
                        viewBox="0 0 16 28"
                      >
                        <path
                          className="pipeline-edge__path"
                          d="M8 2 V23"
                          pathLength={100}
                          strokeDasharray="100"
                        />
                        <path
                          className="pipeline-edge__arrow"
                          d="M4 19 L8 24 L12 19"
                        />
                      </svg>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {activeStep ? (
          <div
            aria-labelledby={`pipeline-tab-${trackId}-${activeStep.id}`}
            className="pipeline-inspector"
            id={`pipeline-panel-${trackId}`}
            role="tabpanel"
          >
            <div className="pipeline-inspector__head">
              <div className="pipeline-inspector__title-group">
                <span className="specimen tabular-nums">
                  Step {formatStepNumber(activeStep.order)} of{" "}
                  {formatStepNumber(orderedSteps.length)}
                </span>
                <h3 className="pipeline-inspector__title">
                  {activeStep.title}
                </h3>
              </div>

              <div className="pipeline-inspector__nav">
                <Badge tone={getStatusMeta(activeStep.status).tone}>
                  {getStatusMeta(activeStep.status).label}
                </Badge>
                <div className="pipeline-inspector__step-buttons">
                  <Button
                    aria-label="Previous pipeline step"
                    disabled={safeIndex <= 0}
                    onClick={() => selectStep(safeIndex - 1)}
                    type="button"
                    variant="secondary"
                  >
                    <ChevronLeft aria-hidden="true" size={15} />
                    <span>Prev</span>
                  </Button>
                  <Button
                    aria-label="Next pipeline step"
                    disabled={safeIndex >= orderedSteps.length - 1}
                    onClick={() => selectStep(safeIndex + 1)}
                    type="button"
                    variant="secondary"
                  >
                    <span>Next</span>
                    <ChevronRight aria-hidden="true" size={15} />
                  </Button>
                </div>
              </div>
            </div>

            <p className="pipeline-inspector__desc">{activeStep.description}</p>

            <dl className="pipeline-inspector__meta">
              <div>
                <dt>Inputs</dt>
                <dd>
                  {activeStep.inputs.length > 0 ? (
                    <ul className="pipeline-inspector__inputs">
                      {activeStep.inputs.map((inputItem) => (
                        <li key={inputItem}>
                          <code>{inputItem}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">None recorded</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Output artifact</dt>
                <dd>
                  <code>{activeStep.output_artifact}</code>
                </dd>
              </div>
              <div>
                <dt>Provenance</dt>
                <dd className="pipeline-inspector__provenance">
                  {activeStep.provenance}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
