import { AnalyzerForm } from "../../components/AnalyzerForm";
import { GoEmotionsPrediction, predictEmotions } from "../../lib/api";

export default function EmotionsPage() {
  return <AnalyzerForm title="Emotion Analyzer" description="Detect one or more emotions in a short comment. Multi-label output is preserved; the model does not force a single emotion." submitLabel="Analyze emotions" onSubmit={predictEmotions} renderResult={(result: GoEmotionsPrediction) => <><div className="eyebrow">Detected emotions</div><div className="chips">{result.emotions.length ? result.emotions.map((emotion) => <span className="chip" key={emotion.label}>{emotion.label} {(emotion.probability * 100).toFixed(0)}%</span>) : <span>No labels crossed the saved threshold.</span>}</div><p className="muted">Threshold: {result.threshold}</p></>} />;
}
