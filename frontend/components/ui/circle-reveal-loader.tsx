"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "@/lib/motion";

export type CircleRevealRoutePhase = "idle" | "entering" | "revealing";

export interface CircleRevealLoaderProps {
  /** Current route transition phase driven by MotionProvider. */
  phase: CircleRevealRoutePhase;
  /** Monotonic transition counter so fast re-clicks retarget cleanly without duplicate overlays. */
  transitionId: number;
  /** Called when the reveal wave completes so the provider returns to `idle`. */
  onComplete?: () => void;
}

/**
 * Circle Reveal route transition (adapted from 21st.dev/@goodmotion/components/circle-reveal-loader).
 *
 * Uses three concentric ripple rings + a radial clip-path aperture that opens on route
 * completion. Strictly `pointer-events: none` and `aria-hidden="true"` so it never traps
 * keyboard or pointer input, and collapses to a fast non-spatial opacity pulse under
 * `prefers-reduced-motion: reduce`.
 */
export function CircleRevealLoader({
  phase,
  transitionId,
  onComplete,
}: CircleRevealLoaderProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Safety fallback timer: even if GSAP is delayed or interrupted, never leave
  // the transition in a non-idle state after completion.
  useEffect(() => {
    if (phase !== "revealing") return;
    const timeoutMs = reduced ? 120 : 520;
    const timer = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [phase, transitionId, reduced]);

  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      const rings = root.querySelectorAll<HTMLElement>(".circle-reveal__ring");
      gsap.killTweensOf(rings);
      gsap.killTweensOf(root);

      if (phase === "idle") {
        gsap.set(root, { autoAlpha: 0 });
        gsap.set(rings, { scale: 0.08, opacity: 0 });
        return;
      }

      if (reduced) {
        if (phase === "entering") {
          gsap.set(root, { autoAlpha: 0.18 });
        } else if (phase === "revealing") {
          gsap.to(root, {
            autoAlpha: 0,
            duration: 0.1,
            ease: "none",
            onComplete: () => onCompleteRef.current?.(),
          });
        }
        return;
      }

      if (phase === "entering") {
        gsap.set(root, { autoAlpha: 1 });
        gsap.fromTo(
          rings,
          { scale: 0.12, opacity: 0.55 },
          {
            scale: 1.15,
            opacity: 0.22,
            duration: 0.28,
            stagger: 0.045,
            ease: "power2.out",
            overwrite: "auto",
          },
        );
      } else if (phase === "revealing") {
        gsap.set(root, { autoAlpha: 1 });
        const tl = gsap.timeline({
          onComplete: () => {
            onCompleteRef.current?.();
          },
        });
        tl.to(rings, {
          scale: 2.35,
          opacity: 0,
          duration: 0.36,
          stagger: 0.04,
          ease: "power3.out",
          overwrite: "auto",
        }).to(
          root,
          {
            autoAlpha: 0,
            duration: 0.18,
            ease: "power2.out",
          },
          "-=0.18",
        );
      }
    },
    {
      scope: containerRef,
      dependencies: [phase, transitionId, reduced],
      revertOnUpdate: true,
    },
  );

  const isActive = phase !== "idle";

  return (
    <div
      aria-hidden="true"
      className="route-transition circle-reveal"
      data-active={isActive || undefined}
      data-phase={phase}
      ref={containerRef}
    >
      <span className="circle-reveal__ring circle-reveal__ring--outer" />
      <span className="circle-reveal__ring circle-reveal__ring--mid" />
      <span className="circle-reveal__ring circle-reveal__ring--core" />
    </div>
  );
}

export default CircleRevealLoader;
