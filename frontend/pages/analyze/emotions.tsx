import { AnalyzerForm } from "../../components/AnalyzerForm";
import { Badge, Card, Callout } from "../../components/ui";
import { GoEmotionsPrediction, predictEmotions } from "../../lib/api";

export default function EmotionsPage() {
  return (
    <AnalyzerForm
      description="Detect one or more emotions in a short comment. Multi-label output is preserved; the model does not force a single emotion."
      index="NLP-03 / EMOTIONS"
      onSubmit={predictEmotions}
      renderResult={(result: GoEmotionsPrediction) => (
        <Card kicker="Output / GoEmotions">
          {result.emotions.length ? (
            <div className="chip-row">
              {result.emotions.map((emotion) => (
                <Badge key={emotion.label} tone="model">
                  {emotion.label} {(emotion.probability * 100).toFixed(0)}%
                </Badge>
              ))}
            </div>
          ) : (
            <Callout tone="info">No labels crossed the saved threshold.</Callout>
          )}
          <p className="result-meta">Threshold: {result.threshold}</p>
        </Card>
      )}
      submitLabel="Analyze emotions"
      title="Emotion Analyzer"
    />
  );
}
