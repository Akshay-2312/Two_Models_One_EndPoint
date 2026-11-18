import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { InkHero } from "../components/InkHero";
import { Reveal } from "../components/Reveal";
import { useReadiness, type ReadinessPhase } from "../components/ReadinessProvider";
import { Button, ButtonLink, Callout, Card, ModelInitLoader, SectionHeader } from "../components/ui";

const MODEL_LABELS: Record<string, string> = {
  amazon_rating: "Amazon rating model",
  go_emotions: "GoEmotions model",
};

const PHASE_TITLE: Record<ReadinessPhase, string> = {
  checking: "Checking models",
  online: "Both models ready",
  degraded: "Partly ready",
  offline: "API unreachable",
  unknown: "Readiness unclear",
};

const HERO_WORDS = ["Understand", "what", "language", "expresses."];

const ANALYZERS = [
  {
    detail: "Word2Vec + BiLSTM / 5 classes",
    href: "/analyze/sentiment",
    link: "Open the sentiment analyzer",
    body: "Embeddings feed a two-layer bidirectional LSTM that predicts one of five rating classes.",
    title: "Amazon rating",
  },
  {
    detail: "Fine-tuned DistilBERT / 28 labels",
    href: "/analyze/emotions",
    link: "Open the emotion analyzer",
    body: "A fine-tuned transformer scores 28 emotion labels independently, so several can apply at once.",
    title: "GoEmotions",
  },
];

export default function Dashboard() {
  const { phase, response, error, checkedAt, refresh } = useReadiness();
  const models = response ? Object.entries(response.models) : [];
  const checking = phase === "checking";
  // The provider's degraded note is the first model error, which the list below
  // already prints on its own row. Show the note only when it adds something.
  const degradedNote = error && !models.some(([, model]) => model.error === error) ? error : null;

  return (
    <section className="page-section landing-page">
      <div className="hero">
        <div className="hero__copy">
          <p className="specimen">NLP-01 / WORKBENCH</p>
          <h1 className="hero__title">
            {HERO_WORDS.map((word, index) => (
              <Fragment key={word}>
                <span className="hero-word">
                  <span style={{ "--word-index": String(index) } as CSSProperties}>{word}</span>
                </span>
                {index < HERO_WORDS.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="hero__statement">
            Two trained models run behind this page. Word2Vec and a BiLSTM turn a review into one of five Amazon
            rating classes; a fine-tuned DistilBERT tags a sentence with up to 28 GoEmotions labels. Both analyzers
            send your text to the FastAPI service and show what the model returns.
          </p>
          <div className="hero__actions">
            <ButtonLink href="/analyze/sentiment">Analyze sentiment</ButtonLink>
            <ButtonLink href="/analyze/emotions" variant="secondary">
              Analyze emotions
            </ButtonLink>
          </div>
          <p className="hero__support">
            Architecture and training notes live in the <Link href="/model-lab">Model Lab</Link>.
          </p>
        </div>

        <InkHero
          lanes={[
            { detail: "5 classes", label: "Amazon rating" },
            { detail: "28 labels", label: "GoEmotions" },
          ]}
          note="An illustration of example input, not a model output. Live results appear in the analyzers."
          phrase="The plot lost me halfway, but the last chapter was worth it."
        />
      </div>

      <Reveal>
        <section className="landing-section">
          <SectionHeader
            description="Three jobs, all answered from one API."
            level={2}
            title="What the workbench does"
          />
          <ol className="capability-list">
            <li>
              <span className="capability__index">01 / Classify</span>
              <h3>Score a review</h3>
              <p>Send review text to the rating model and read the probability it assigns to each of the five stars.</p>
            </li>
            <li>
              <span className="capability__index">02 / Tag</span>
              <h3>Read the emotions</h3>
              <p>
                Map a sentence to the 28 GoEmotions labels, using the decision threshold the backend reports for this
                checkpoint.
              </p>
            </li>
            <li>
              <span className="capability__index">03 / Inspect</span>
              <h3>Check the system first</h3>
              <p>
                Readiness reports each model separately, including the load error when one of them cannot be served.
              </p>
            </li>
          </ol>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section">
          <SectionHeader
            description="Separate training tracks, separate artefacts, one readiness endpoint."
            level={2}
            title="Two model paths"
          />
          <div className="path-grid">
            {ANALYZERS.map((analyzer) => (
              <Card kicker={analyzer.detail} key={analyzer.href} title={analyzer.title}>
                <p>{analyzer.body}</p>
                <Link href={analyzer.href}>{analyzer.link}</Link>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section">
          <SectionHeader
            description="Reported by the FastAPI service on every check, not inferred by this page."
            level={2}
            title="API readiness"
          />
          <Card
            className="readiness-card"
            data-phase={phase}
            kicker="Live / readiness"
            title={
              <span className="readiness-card__title">
                {PHASE_TITLE[phase]}
                {phase === "online" && models.length > 0 ? (
                  <span className="readiness-card__count">
                    {models.filter(([, model]) => model.ready).length}/{models.length}
                  </span>
                ) : null}
              </span>
            }
          >
            {models.length > 0 ? (
              <ul className="status-list">
                {models.map(([id, model]) => (
                  <li data-ready={model.ready} key={id}>
                    <span className="status-list__name">{MODEL_LABELS[id] ?? id}</span>
                    <span className="status-list__state">{model.ready ? "ready" : model.error ?? "not ready"}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {checking ? (
              <ModelInitLoader
                label="Initializing model checkpoints…"
                note="Requesting readiness from the service. The first check loads both model bundles, so it can take several seconds."
              />
            ) : null}

            {phase === "online" ? (
              <p className="readiness-card__note">Every reported model is loaded and ready to answer requests.</p>
            ) : null}

            {phase === "degraded" && degradedNote ? (
              <p className="readiness-card__note">{degradedNote}</p>
            ) : null}

            {phase === "offline" ? (
              <Callout className="status-error" role="alert" tone="danger">
                {error ?? "The readiness check could not reach the API."}
              </Callout>
            ) : null}

            {phase === "unknown" ? (
              <Callout className="status-error" role="status" tone="warning">
                {error ?? "The API replied, but its model list could not be read."}
              </Callout>
            ) : null}

            <div className="readiness-card__footer">
              <p className="status-checked">
                {checkedAt !== null ? `Checked ${new Date(checkedAt).toLocaleTimeString()}` : "No check has completed yet"}
              </p>
              <Button disabled={checking} onClick={refresh} variant="secondary">
                {checking ? "Checking…" : "Check again"}
              </Button>
            </div>
          </Card>
        </section>
      </Reveal>

      <Reveal>
        <section className="landing-section">
          <SectionHeader level={2} title="What this project is" />
          <div className="project-note">
            <p>
              NLP Lab is the interface for a two-track language project. The Amazon track predicts a star rating; the
              GoEmotions track tags a sentence with a set of emotions rather than a single one.
            </p>
            <p>
              Training work lives in the notebooks, inference wrappers in <code>ml/</code>, and exported models with
              their thresholds under <code>artifacts/</code>. The Next.js frontend calls the FastAPI service and renders
              the response; it does not compute predictions on its own.
            </p>
            <p>
              Prediction values, model readiness, thresholds and error messages come from the backend. The plate above
              is the only illustration on this page, and it is labelled as one.
            </p>
          </div>
        </section>
      </Reveal>
    </section>
  );
}
