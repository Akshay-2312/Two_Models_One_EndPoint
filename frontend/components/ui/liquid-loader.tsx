"use client";

import { useReducedMotion } from "@/lib/motion";
import { Button } from "./Button";
import { Callout } from "./Callout";

export type StatisticsLoaderStatus =
  | "loading"
  | "stalled"
  | "failed"
  | "unavailable"
  | "empty";

export interface StatisticsLoaderProps {
  /** Current fetch phase from useStatistics. */
  status?: StatisticsLoaderStatus;
  /** Accessible status label while loading or stalled. */
  label?: string;
  /** Error detail returned by the statistics request, when available. */
  error?: string | null;
  /** Callback wired to re-request statistics from the API. */
  onRetry?: () => void;
  className?: string;
}

/**
 * StatisticsLoader — Accessible, token-driven statistics status panel.
 *
 * Separates `loading`, `stalled`, `failed`, `unavailable`, and `empty` phases,
 * connects to `useReducedMotion()`, and never displays fabricated progress figures.
 */
export function StatisticsLoader({
  status = "loading",
  label = "Loading dataset statistics…",
  error = null,
  onRetry,
  className = "",
}: StatisticsLoaderProps) {
  const reduced = useReducedMotion();

  if (status === "failed" || status === "unavailable") {
    const isUnavailable = status === "unavailable";
    const title = isUnavailable ? "Statistics API unavailable" : "Failed to load statistics";
    const fallbackDetail = isUnavailable
      ? "Cannot reach the FastAPI service. Start the backend server to inspect repository statistics."
      : "The statistics request could not be completed.";

    return (
      <Callout
        aria-busy="false"
        aria-live="polite"
        className={className}
        role="status"
        title={title}
        tone={isUnavailable ? "warning" : "danger"}
      >
        <p>{error || fallbackDetail}</p>
        {onRetry ? (
          <div className="loader-actions">
            <Button onClick={onRetry} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
      </Callout>
    );
  }

  if (status === "empty") {
    return (
      <Callout
        aria-busy="false"
        aria-live="polite"
        className={className}
        role="status"
        title="No statistics recorded yet"
        tone="info"
      >
        <p>
          The API responded without dataset or evaluation entries. Verify repository artifacts or try refreshing.
        </p>
        {onRetry ? (
          <div className="loader-actions">
            <Button onClick={onRetry} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        ) : null}
      </Callout>
    );
  }

  const isStalled = status === "stalled";

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={["statistics-loader", className].filter(Boolean).join(" ")}
      data-reduced-motion={reduced || undefined}
      data-status={status}
      role="status"
    >
      <div aria-hidden="true" className="liquid-loader">
        <span className="liquid-loader__bar liquid-loader__bar--1" />
        <span className="liquid-loader__bar liquid-loader__bar--2" />
        <span className="liquid-loader__bar liquid-loader__bar--3" />
        <span className="liquid-loader__bar liquid-loader__bar--4" />
        <span className="liquid-loader__bar liquid-loader__bar--5" />
      </div>
      <div className="statistics-loader__copy">
        <p className="statistics-loader__label">{label}</p>
        <p className="statistics-loader__detail">
          {isStalled
            ? "Request is taking longer than expected. Waiting for the FastAPI service response…"
            : "Fetching dataset manifests and evaluation metrics from the FastAPI service."}
        </p>
      </div>
      {isStalled && onRetry ? (
        <div className="loader-actions">
          <Button onClick={onRetry} type="button" variant="secondary">
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default StatisticsLoader;
