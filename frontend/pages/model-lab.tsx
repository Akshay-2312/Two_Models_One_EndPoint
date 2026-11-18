import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ModelEvaluationPanel } from "../components/ModelEvaluationPanel";
import { PipelineTrack } from "../components/PipelineTrack";
import {
  Badge,
  Button,
  Callout,
  Card,
  SectionHeader,
  StatisticsLoader,
} from "../components/ui";
import { useReducedMotion } from "../lib/motion";
import { useModelLab } from "../lib/useModelLab";

export default function ModelLab() {
  const { phase, data, error, sourceUrl, refresh } = useModelLab();
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion || !heroRef.current) return;

      gsap.registerPlugin(useGSAP, ScrollTrigger);

      const media = gsap.matchMedia();
      media.add("(min-width: 64rem)", () => {
        const backLayer = heroRef.current?.querySelector(
          ".modellab-hero__layer--back",
        );
        const frontLayer = heroRef.current?.querySelector(
          ".modellab-hero__layer--front",
        );

        if (backLayer) {
          gsap.to(backLayer, {
            y: 28,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        if (frontLayer) {
          gsap.to(frontLayer, {
            y: -18,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      });

      return () => media.revert();
    },
    {
      scope: heroRef,
      dependencies: [reducedMotion],
      revertOnUpdate: true,
    },
  );

  const amazonTrack = data?.tracks?.amazon_rating ?? null;
  const goEmotionsTrack = data?.tracks?.go_emotions ?? null;

  return (
    <section className="page-section modellab-page">
      <div className="modellab-hero" ref={heroRef}>
        <div
          aria-hidden="true"
          className="modellab-hero__layers"
        >
          <div className="modellab-hero__layer modellab-hero__layer--back">
            <span className="modellab-hero__mark">01 // W2V-BILSTM · 16.7M</span>
            <span className="modellab-hero__mark">02 // DISTILBERT-28 · 67.0M</span>
          </div>
          <div className="modellab-hero__layer modellab-hero__layer--front">
            <span className="modellab-hero__mark">ONNX PARITY &lt;= 1e-4</span>
          </div>
        </div>

        <div className="modellab-hero__content">
          <SectionHeader
            description="Interactive training-to-inference pipelines, verified evaluation artifacts, ONNX numerical parity checks, and disk manifest verification for two independent NLP tracks."
            index="NLP-04 / MODELS"
            title="Model Lab"
          >
            <nav aria-label="Model Lab sections" className="modellab-anchors">
              <a className="modellab-anchor" href="#track-amazon">
                Track A: Amazon BiLSTM
              </a>
              <a className="modellab-anchor" href="#track-goemotions">
                Track B: DistilBERT
              </a>
              <a className="modellab-anchor" href="#model-comparison">
                Model Comparison
              </a>
            </nav>
          </SectionHeader>
        </div>
      </div>

      {phase === "loading" || phase === "stalled" ? (
        <StatisticsLoader
          error={error}
          label="Loading model lab artifacts…"
          onRetry={refresh}
          status={phase}
        />
      ) : null}

      {phase === "unavailable" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="Model Lab artifacts or API endpoint unavailable"
          tone="warning"
        >
          <p>
            {error ??
              "The committed Model Lab metadata (data/model_lab_artifacts.json) or backend endpoint (/models/lab) could not be reached."}
          </p>
          <p className="dataset-endpoint-note">
            Endpoint: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "failed" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="Failed to load Model Lab metadata"
          tone="danger"
        >
          <p>
            {error ??
              "An unexpected error occurred while fetching Model Lab metadata."}
          </p>
          <p className="dataset-endpoint-note">
            Source URL: <code>{sourceUrl}</code>
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "empty" ? (
        <Callout
          aria-live="polite"
          role="status"
          title="No Model Lab track metadata available"
          tone="info"
        >
          <p>
            The endpoint (<code>{sourceUrl}</code>) returned no pipeline track
            records. Verify <code>data/model_lab_artifacts.json</code> contains
            model metadata.
          </p>
          <div className="loader-actions">
            <Button onClick={refresh} type="button" variant="secondary">
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      {phase === "ready" && data ? (
        <div className="modellab-content">
          <div className="dataset-provenance-bar">
            <div className="dataset-provenance-bar__meta">
              <Badge dot tone="success">
                Artifact manifests loaded
              </Badge>
              <span className="specimen">Provenance: {data.provenance}</span>
              <span className="specimen">{data.run_timestamp_note}</span>
            </div>
            <Button onClick={refresh} type="button" variant="secondary">
              Refresh artifacts
            </Button>
          </div>

          {amazonTrack ? (
            <section
              aria-label="Track A: Amazon BiLSTM"
              className="modellab-section"
              id="track-amazon"
            >
              <SectionHeader
                description={`${amazonTrack.task} · ${amazonTrack.architecture}`}
                level={2}
                title={`Track A — ${amazonTrack.name}`}
              />
              <PipelineTrack
                accent="primary"
                endpoint={amazonTrack.endpoint}
                runtime={amazonTrack.runtime}
                steps={amazonTrack.pipeline_steps}
                subtitle={amazonTrack.task}
                title="Training-to-inference pipeline"
                trackCode="Track A / Word2Vec + BiLSTM"
                trackId={amazonTrack.id}
              />
              <ModelEvaluationPanel kind="amazon_rating" track={amazonTrack} />
            </section>
          ) : null}

          {goEmotionsTrack ? (
            <section
              aria-label="Track B: DistilBERT"
              className="modellab-section"
              id="track-goemotions"
            >
              <SectionHeader
                description={`${goEmotionsTrack.task} · ${goEmotionsTrack.architecture}`}
                level={2}
                title={`Track B — ${goEmotionsTrack.name}`}
              />
              <PipelineTrack
                accent="model"
                endpoint={goEmotionsTrack.endpoint}
                runtime={goEmotionsTrack.runtime}
                steps={goEmotionsTrack.pipeline_steps}
                subtitle={goEmotionsTrack.task}
                title="Training-to-inference pipeline"
                trackCode="Track B / DistilBERT Multi-label"
                trackId={goEmotionsTrack.id}
              />
              <ModelEvaluationPanel
                kind="go_emotions"
                track={goEmotionsTrack}
              />
            </section>
          ) : null}

          {data.comparison.length > 0 ? (
            <section
              aria-label="Model Comparison"
              className="modellab-section"
              id="model-comparison"
            >
              <SectionHeader
                description="Side-by-side architectural, training, inference, and ONNX parity summary across the two independent tracks."
                level={2}
                title="Model Comparison"
              />
              <Card
                kicker="Architecture & serving matrix"
                title="Track A vs Track B specification"
              >
                <div className="dataset-table-wrap">
                  <table className="dataset-table modellab-comparison-table">
                    <thead>
                      <tr>
                        <th scope="col">Dimension</th>
                        <th scope="col">Track A · Amazon BiLSTM</th>
                        <th scope="col">Track B · GoEmotions DistilBERT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.comparison.map((row) => (
                        <tr key={row.dimension}>
                          <th scope="row">{row.dimension}</th>
                          <td>{row.amazon_rating}</td>
                          <td>{row.go_emotions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
