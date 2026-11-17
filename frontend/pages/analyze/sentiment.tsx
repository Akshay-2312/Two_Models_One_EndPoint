import { AnalyzerForm } from "../../components/AnalyzerForm";
import { AmazonPrediction, predictAmazon } from "../../lib/api";

export default function SentimentPage() {
  return <AnalyzerForm title="Sentiment Analyzer" description="Predict a five-class customer rating from review text. The model output is shown as returned by the backend." submitLabel="Analyze sentiment" onSubmit={predictAmazon} renderResult={(result: AmazonPrediction) => <><div className="eyebrow">Predicted rating</div><div className="prediction">{result.rating} / 5 stars</div><div className="probability-list">{result.probabilities.map((value, index) => <div key={index}><span>{index + 1} star{index ? "s" : ""}</span><strong>{(value * 100).toFixed(1)}%</strong><progress max="1" value={value} /></div>)}</div></>} />;
}
