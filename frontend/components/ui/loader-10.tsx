"use client";

import { useReducedMotion } from "@/lib/motion";
import { Button } from "./Button";

export type AnalysisContextLabel = "Analyzing review…" | "Detecting emotions…" | string;

export interface AnalysisLoaderProps {
  /** Context-aware status copy: `Analyzing review…` or `Detecting emotions…`. */
  label?: AnalysisContextLabel;
  /** True when the request is still running past the slow-request threshold. */
  stalled?: boolean;
  /** Optional cancellation handler wired to an AbortController. */
  onCancel?: () => void;
  className?: string;
}

/**
 * Reusable AnalysisLoader (adapted from 21st.dev/@ravikatiyar162/components/loader-10).
 *
 * Mounted only while an analysis request is actively pending. Uses composite-only
 * `transform` and `opacity` keyframes, announces state with `role="status"`, and
 * exposes an explicit Cancel control linked to the active `AbortController`.
 */
export function AnalysisLoader({
  label = "Analyzing review…",
  stalled = false,
  onCancel,
  className = "",
}: AnalysisLoaderProps) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={["analysis-loader", className].filter(Boolean).join(" ")}
      data-reduced-motion={reduced || undefined}
      data-stalled={stalled || undefined}
      role="status"
    >
      <div aria-hidden="true" className="loader-10">
        <span className="loader-10__orb loader-10__orb--1" />
        <span className="loader-10__orb loader-10__orb--2" />
        <span className="loader-10__orb loader-10__orb--3" />
        <span className="loader-10__ring" />
      </div>
      <div className="analysis-loader__copy">
        <p className="analysis-loader__label">{label}</p>
        <p className="analysis-loader__detail">
          {stalled
            ? "Inference is taking longer than usual (cold model weights may be loading)…"
            : "Running forward pass on the FastAPI inference service."}
        </p>
      </div>
      {onCancel ? (
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

export default AnalysisLoader;
