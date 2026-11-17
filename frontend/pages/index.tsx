import Link from "next/link";
import { useCallback, useState } from "react";
import { EntryPreloader } from "../components/EntryPreloader";
import { InkHero } from "../components/InkHero";
import { useReadiness } from "../components/ReadinessProvider";

const MODEL_LABELS: Record<string, string> = {
  amazon_rating: "Amazon ratings",
  go_emotions: "GoEmotions",
};

const STATUS_HEADLINE = {
  loading: "Checking models",
  ready: "Both models ready",
  degraded: "Partly ready",
  offline: "API unreachable",
} as const;

export default function Dashboard() {
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  const { phase, response, error, checkedAt, refresh } = useReadiness();
  const completePreloader = useCallback(() => setPreloaderVisible(false), []);
  const models = response ? Object.entries(response.models) : [];

  return (
    <>
      {preloaderVisible && <EntryPreloader onComplete={completePreloader} />}
      <section className="page-section landing-page">
        <div className="landing-hero">
          <div className="landing-hero__copy">
            <div className="eyebrow">NLP Major Project</div>
            <h1>Inspect sentiment and emotion from the same workspace.</h1>
            <p className="lede">Run a review through the trained Amazon rating model or map its language to 28 GoEmotions labels.</p>
            <div className="hero-actions">
              <Link className="button" href="/analyze/sentiment">Analyze a review</Link>
              <Link className="button secondary" href="/analyze/emotions">Explore emotions</Link>
            </div>
          </div>
          <InkHero>
            <div className="inference-preview" aria-label="Example inference trace" role="img">
              <div className="inference-preview__header">
                <span>Inference trace</span>
                <span>sample / 014</span>
              </div>
              <p className="inference-preview__quote">“Clear writing and a thoughtful result.”</p>
              <div className="inference-preview__tokens" aria-hidden="true">
                <span>clear</span><span>writing</span><span>thoughtful</span><span>result</span>
              </div>
              <div className="inference-preview__outputs">
                <div>
                  <span className="inference-preview__label">Amazon rating</span>
                  <strong>4 / 5</strong>
                  <span className="inference-preview__meter"><i style={{ width: "82%" }} /></span>
                </div>
                <div>
                  <span className="inference-preview__label">GoEmotions</span>
                  <strong>admiration</strong>
                  <span className="inference-preview__meter"><i style={{ width: "68%" }} /></span>
                </div>
              </div>
            </div>
          </InkHero>
        </div>
        <div className="card-grid" data-gap="models">
          <article className="info-card"><span className="card-kicker">Model A</span><h2>Amazon ratings</h2><p>Word2Vec-initialized BiLSTM predicting five rating classes.</p><Link href="/analyze/sentiment">Open analyzer →</Link></article>
          <article className="info-card"><span className="card-kicker">Model B</span><h2>GoEmotions</h2><p>Fine-tuned DistilBERT for 28-label multi-label emotion output.</p><Link href="/analyze/emotions">Open analyzer →</Link></article>
          <article className="info-card">
            <span className="card-kicker">System status</span>
            <h2>{STATUS_HEADLINE[phase]}</h2>
            {models.length > 0 && (
              <ul className="status-list">
                {models.map(([id, model]) => (
                  <li data-ready={model.ready} key={id}>
                    <span className="status-list__name">{MODEL_LABELS[id] ?? id}</span>
                    <span className="status-list__state">{model.ready ? "ready" : model.error ?? "not ready"}</span>
                  </li>
                ))}
              </ul>
            )}
            {phase === "loading" && <p>Requesting readiness from the FastAPI service. A cold start loads both models, so the first check can take several seconds.</p>}
            {phase === "degraded" && <p>{error ?? "At least one model reported that it is not ready. Check the backend log for the load error."}</p>}
            {phase === "offline" && <p className="status-error">{error}</p>}
            {phase !== "loading" && checkedAt !== null && (
              <p className="muted status-checked">Checked {new Date(checkedAt).toLocaleTimeString()}</p>
            )}
            <button
              className="button secondary status-retry"
              disabled={phase === "loading"}
              onClick={refresh}
              type="button"
            >
              {phase === "loading" ? "Checking…" : "Check again"}
            </button>
          </article>
        </div>
      </section>
    </>
  );
}
