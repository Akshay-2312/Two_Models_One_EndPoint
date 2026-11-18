"use client";

import { useReducedMotion } from "@/lib/motion";

export interface ModelInitLoaderProps {
  /** Accessible status label during backend cold start / checkpoint loading. */
  label?: string;
  /** Optional secondary note explaining why cold-start takes several seconds. */
  note?: string;
  /** True when cold start is taking longer than expected. */
  stalled?: boolean;
  className?: string;
}

/**
 * ModelInitLoader — Branded model cold-start / initialization status.
 *
 * Reference audit note (`21st.dev/@shailendrakumar19999/components/loding`):
 * The public `loding` entry is a generic CSS spinner without model-specific
 * stage semantics, and using a generic spinner would duplicate `AnalysisLoader`
 * (`loader-10`). Per spec §5, we record that finding and provide this distinct,
 * branded two-track initialization status restricted strictly to model cold-start
 * and readiness verification (`ReadinessProvider` checking phase).
 */
export function ModelInitLoader({
  label = "Initializing model checkpoints…",
  note = "Requesting readiness from the service. The first check loads both model bundles, so it can take several seconds.",
  stalled = false,
  className = "",
}: ModelInitLoaderProps) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={["model-init-loader", className].filter(Boolean).join(" ")}
      data-reduced-motion={reduced || undefined}
      data-stalled={stalled || undefined}
      role="status"
    >
      <div aria-hidden="true" className="model-init-loader__tracks">
        <span className="model-init-loader__node model-init-loader__node--a">BiLSTM</span>
        <span className="model-init-loader__bridge" />
        <span className="model-init-loader__node model-init-loader__node--b">DistilBERT</span>
      </div>
      <div className="model-init-loader__copy">
        <p className="model-init-loader__label">{label}</p>
        <p className="readiness-card__note">{note}</p>
      </div>
    </div>
  );
}

export default ModelInitLoader;
