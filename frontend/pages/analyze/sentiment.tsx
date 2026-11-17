import { AnalyzerForm } from "../../components/AnalyzerForm";
import { Card, Meter } from "../../components/ui";
import { AmazonPrediction, predictAmazon } from "../../lib/api";

export default function SentimentPage() {
  return (
    <AnalyzerForm
      description="Predict a five-class customer rating from review text. The model output is shown as returned by the backend."
      index="NLP-02 / SENTIMENT"
      onSubmit={predictAmazon}
      renderResult={(result: AmazonPrediction) => (
        <Card kicker="Output / Amazon rating" title={<span className="prediction">{result.rating} / 5 stars</span>}>
          <div className="probability-list">
            {result.probabilities.map((value, index) => (
              <Meter
                key={index}
                label={`${index + 1} star${index ? "s" : ""}`}
                value={value}
                valueLabel={`${(value * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        </Card>
      )}
      submitLabel="Analyze sentiment"
      title="Sentiment Analyzer"
    />
  );
}
