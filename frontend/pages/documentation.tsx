import Head from "next/head";
import { ArchitectureMap } from "../components/ArchitectureMap";
import { DocumentationReference } from "../components/DocumentationReference";
import { SectionHeader } from "../components/ui";

export default function Documentation() {
  return (
    <>
      <Head>
        <title>Documentation — NLP Lab</title>
      </Head>

      <section className="page-section doc-page">
        <SectionHeader
          description="Interactive system architecture, inference sequence flow, dual-track training pipelines, sanitized storage layout, tool matrix, and verified FastAPI contracts."
          index="NLP-06 / REFERENCE"
          title="Documentation"
        >
          <nav aria-label="Documentation sections" className="modellab-anchors">
            <a className="modellab-anchor" href="#architecture-map">
              Architecture Map
            </a>
            <a className="modellab-anchor" href="#stack-matrix">
              Stack Matrix
            </a>
            <a className="modellab-anchor" href="#dataset-sources">
              Dataset Sources
            </a>
            <a className="modellab-anchor" href="#operational-docs">
              Operational Docs
            </a>
          </nav>
        </SectionHeader>

        <div className="doc-content">
          <ArchitectureMap />
          <DocumentationReference />
        </div>
      </section>
    </>
  );
}
