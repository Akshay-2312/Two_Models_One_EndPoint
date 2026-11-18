import {
  AnalyzerForm,
  type AnalysisRenderContext,
  type SamplePrompt,
} from "../../components/AnalyzerForm";
import { Badge, Card, Meter } from "../../components/ui";
import { AmazonPrediction, predictAmazon } from "../../lib/api";

const SENTIMENT_SAMPLES: SamplePrompt[] = [
  {
    label: "1-star negative",
    text: "The power adapter stopped charging after three days and the plastic housing cracked around the port. Returning it immediately.",
  },
  {
    label: "3-star mixed",
    text: "The keyboard layout is comfortable and battery life is solid, though the backlight flickers on low brightness and the keys feel slightly loose.",
  },
  {
    label: "5-star positive",
    text: "Quiet motor, sturdy stainless steel jar, and effortless cleanup after daily smoothies. Easily the most reliable kitchen appliance I have bought this year.",
  },
];

const STAR_CLASS_INDICES = [0, 1, 2, 3, 4] as const;

function renderSentimentResult(
  result: AmazonPrediction,
  context?: AnalysisRenderContext,
) {
  const probabilities = STAR_CLASS_INDICES.map((idx) => {
    const raw = result.probabilities?.[idx];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  });
  const probabilitySum = probabilities.reduce((total, value) => total + value, 0);

  return (
    <Card
      kicker="Output / Amazon rating"
      title={<span className="prediction">{result.rating} / 5</span>}
    >
      {context?.submittedText ? (
        <div className="result-context">
          <div className="result-context__head">
            <span className="result-context__label">Analyzed review</span>
            {context.isStale ? (
              <Badge className="stale-indicator" tone="warning">
                Draft edited since run
              </Badge>
            ) : null}
          </div>
          <p className="result-context__text">{context.submittedText}</p>
          {context.isStale ? (
            <p className="result-meta">
              The draft changed after this prediction ran. Submit again to score the updated text.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="sentiment-summary">
        <p className="sentiment-summary__note">
          5-class review rating prediction based on product review phrasing — not an objective
          measure of emotional state.
        </p>
        <Badge tone="model">Softmax 5-class</Badge>
      </div>

      <div aria-label="Class probabilities (1 to 5 stars)" className="probability-list" role="group">
        {probabilities.map((value, idx) => {
          const stars = idx + 1;
          return (
            <Meter
              key={stars}
              label={`${stars} star${stars === 1 ? "" : "s"}`}
              tone="model"
              value={value}
              valueLabel={`${(value * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>

      <p className="result-note">
        Class probabilities sum to{" "}
        <span className="result-meta">{(probabilitySum * 100).toFixed(1)}%</span> (
        <span className="result-meta">{probabilitySum.toFixed(4)}</span>). Values come directly
        from the Word2Vec + BiLSTM softmax head and may differ slightly from 100.0% due to
        floating-point rounding or backend serialization.
      </p>
    </Card>
  );
}

export default function SentimentPage() {
  return (
    <AnalyzerForm
      description="Predict a five-class customer rating (1 to 5 stars) from product review text. Scores are returned directly from the backend model."
      index="NLP-02 / SENTIMENT"
      inputLabel="Product review text"
      loadingLabel="Analyzing review…"
      onSubmit={predictAmazon}
      placeholder="Paste or type a product review to score across 1 to 5 stars…"
      renderResult={renderSentimentResult}
      samples={SENTIMENT_SAMPLES}
      submitLabel="Analyze sentiment"
      title="Sentiment Analyzer"
    />
  );
}
