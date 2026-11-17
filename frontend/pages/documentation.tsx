import { Card, SectionHeader } from "../components/ui";

export default function Documentation() {
  return (
    <section className="page-section">
      <SectionHeader
        description="NLP Lab connects a Next.js interface to the FastAPI inference service."
        index="NLP-06 / REFERENCE"
        title="Documentation"
      />
      <Card kicker="Contract" title="Truthful outputs">
        <p>
          Predictions, thresholds, readiness, and model metadata come from the backend. The frontend does not invent
          metrics or status.
        </p>
      </Card>
    </section>
  );
}
