import { Card, SectionHeader } from "../components/ui";

export default function Datasets() {
  return (
    <section className="page-section">
      <SectionHeader
        description="Dataset schemas, label mappings, and quality reports are maintained as repository artifacts."
        index="NLP-05 / DATASETS"
        title="Dataset Explorer"
      />
      <Card kicker="Source of truth" title="Repository artifacts">
        <p>
          Use the project reports and manifests as the source of truth. No fabricated sample counts or distributions are
          displayed here.
        </p>
      </Card>
    </section>
  );
}
