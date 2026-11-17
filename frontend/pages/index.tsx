import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EntryPreloader } from "../components/EntryPreloader";
import { InkHero } from "../components/InkHero";
import { getReadiness, ReadinessResponse } from "../lib/api";

export default function Dashboard() {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  useEffect(() => { getReadiness().then(setReadiness).catch(() => setReadiness(null)); }, []);
  const completePreloader = useCallback(() => setPreloaderVisible(false), []);
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
          <article className="info-card"><span className="card-kicker">System status</span><h2>{readiness?.status ?? "Checking..."}</h2><p>Availability is read from the FastAPI readiness endpoint.</p></article>
        </div>
      </section>
    </>
  );
}
