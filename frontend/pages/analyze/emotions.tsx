import {
  AnalyzerForm,
  type AnalysisRenderContext,
  type SamplePrompt,
} from "../../components/AnalyzerForm";
import { Badge, Callout, Card, Meter } from "../../components/ui";
import { GoEmotionsPrediction, predictEmotions } from "../../lib/api";

const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    label: "Admiration / gratitude",
    text: "Thank you for walking through every edge case so clearly. Your notes saved our team hours of debugging.",
  },
  {
    label: "Mixed / curiosity",
    text: "Interesting approach, though I am not sure how it handles noisy inputs. Have you tested it on shorter fragments?",
  },
  {
    label: "Neutral / dry",
    text: "The updated schedule moves the weekly review from Tuesday afternoon to Wednesday morning starting next month.",
  },
];

function formatPercent(probability: number): string {
  if (!Number.isFinite(probability)) return "0.0%";
  return `${(probability * 100).toFixed(1)}%`;
}

function formatThreshold(threshold: number): string {
  if (!Number.isFinite(threshold)) return "0.00";
  return threshold.toFixed(2);
}

export default function EmotionsPage() {
  return (
    <AnalyzerForm
      description="Detect one or more emotions in a short comment using 28 independent sigmoid heads. Multi-label output is preserved; the model never forces a single emotion."
      index="NLP-03 / EMOTIONS"
      inputLabel="Comment or short text"
      loadingLabel="Detecting emotions…"
      onSubmit={predictEmotions}
      placeholder="Paste a short comment, message, or note to score across GoEmotions labels…"
      renderResult={(result: GoEmotionsPrediction, context?: AnalysisRenderContext) => {
        const thresholdLabel = formatThreshold(result.threshold);
        const rankedEmotions = [...result.emotions].sort(
          (a, b) => b.probability - a.probability || a.label.localeCompare(b.label),
        );
        const rankedProbabilities = Object.entries(result.probabilities ?? {}).sort(
          ([labelA, probA], [labelB, probB]) => probB - probA || labelA.localeCompare(labelB),
        );
        const aboveThreshold = rankedProbabilities.filter(
          ([, probability]) => probability >= result.threshold,
        );
        const belowThreshold = rankedProbabilities.filter(
          ([, probability]) => probability < result.threshold,
        );

        const cardTitle =
          rankedEmotions.length > 0
            ? `${rankedEmotions.length} ${rankedEmotions.length === 1 ? "emotion" : "emotions"} detected`
            : "No emotions crossed threshold";

        return (
          <Card kicker="Output / GoEmotions" title={cardTitle}>
            {context?.submittedText ? (
              <div className="result-context">
                <div className="result-context__head">
                  <span className="result-context__label">Submitted text</span>
                  {context.isStale ? (
                    <Badge className="stale-indicator" tone="warning">
                      Draft edited since run
                    </Badge>
                  ) : null}
                </div>
                <div className="result-context__text">{context.submittedText}</div>
              </div>
            ) : null}

            <div className="emotion-summary">
              <span className="result-meta">
                Detected labels: {rankedEmotions.length} of {rankedProbabilities.length}
              </span>
              <span className="result-meta">Active threshold: {thresholdLabel}</span>
            </div>

            <div className="emotion-section">
              <div className="emotion-section__header">
                <h3 className="emotion-section__title">Selected multi-label detections</h3>
                <span className="result-meta">≥ {thresholdLabel}</span>
              </div>

              {rankedEmotions.length > 0 ? (
                <div aria-label="Detected emotion labels" className="chip-row">
                  {rankedEmotions.map((emotion) => (
                    <Badge key={emotion.label} tone="model">
                      {emotion.label} · {formatPercent(emotion.probability)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Callout tone="info" title="No labels crossed the saved threshold">
                  <p>
                    No labels crossed the saved threshold ({thresholdLabel}) for this input. Review
                    the ranked probability scores below to inspect the closest candidates.
                  </p>
                </Callout>
              )}
            </div>

            <div className="emotion-section">
              <div className="emotion-section__header">
                <h3 className="emotion-section__title">All returned label scores</h3>
                <span className="result-meta">
                  {rankedProbabilities.length} returned · ranked descending
                </span>
              </div>

              {rankedProbabilities.length > 0 ? (
                <div className="emotion-list">
                  {aboveThreshold.map(([label, probability]) => (
                    <div className="emotion-row emotion-row--selected" key={label}>
                      <Meter
                        label={label}
                        tone="model"
                        value={probability}
                        valueLabel={formatPercent(probability)}
                      />
                    </div>
                  ))}

                  {belowThreshold.length > 0 ? (
                    <div className="emotion-threshold-divider" role="separator">
                      <span>Below threshold (&lt; {thresholdLabel})</span>
                    </div>
                  ) : null}

                  {belowThreshold.map(([label, probability]) => (
                    <div className="emotion-row emotion-row--below" key={label}>
                      <Meter
                        label={label}
                        tone="primary"
                        value={probability}
                        valueLabel={formatPercent(probability)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No per-label probability scores were returned.</p>
              )}
            </div>

            <p className="result-note">
              Research tool notice: labels are independent multi-label DistilBERT sigmoid
              predictions (scores do not sum to 100%) trained on GoEmotions comments. Treat them as
              probabilistic text signals, not definitive psychological facts.
            </p>
          </Card>
        );
      }}
      samples={SAMPLE_PROMPTS}
      submitLabel="Analyze emotions"
      title="Emotion Analyzer"
    />
  );
}
