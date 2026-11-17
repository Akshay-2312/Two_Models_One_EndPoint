import { Card, SectionHeader } from "../components/ui";

export default function ModelLab() {
  return (
    <section className="page-section">
      <SectionHeader
        description="Two independent model tracks, trained and served with explicit artifacts."
        index="NLP-04 / MODELS"
        title="Model Lab"
      />
      <div className="card-grid">
        <Card kicker="Track A / Sequence classification" title="Word2Vec + BiLSTM">
          <p>200-dimensional embeddings feed a two-layer bidirectional LSTM with five output classes.</p>
        </Card>
        <Card kicker="Track B / Multi-label" title="DistilBERT">
          <p>Fine-tuned sequence classification with sigmoid probabilities across 28 GoEmotions labels.</p>
        </Card>
      </div>
    </section>
  );
}
