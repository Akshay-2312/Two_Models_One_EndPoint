import Head from "next/head";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { EntryPreloader } from "../components/EntryPreloader";
import { Layout } from "../components/Layout";
import { MotionProvider } from "../components/MotionProvider";
import { ReadinessProvider } from "../components/ReadinessProvider";
import "../styles/globals.css";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/analyze/sentiment": "Sentiment Analyzer",
  "/analyze/emotions": "Emotion Analyzer",
  "/model-lab": "Model Lab",
  "/datasets": "Dataset Explorer",
  "/documentation": "Documentation",
  "/technology": "Technology Used",
  "/404": "Page Not Found",
};

const DEFAULT_DESCRIPTION =
  "Inspect a Word2Vec + BiLSTM rating model and a fine-tuned DistilBERT emotion model from one workbench.";

const DESCRIPTIONS: Record<string, string> = {
  "/": DEFAULT_DESCRIPTION,
  "/analyze/sentiment":
    "Score Amazon product reviews across five star classes using a trained Word2Vec + BiLSTM classifier.",
  "/analyze/emotions":
    "Detect up to 28 GoEmotions labels independently from text using a fine-tuned DistilBERT model.",
  "/model-lab":
    "Inspect training-to-inference pipelines, verified evaluation artifacts, and ONNX parity checks across both NLP tracks.",
  "/datasets":
    "Explore audited dataset split sizes, label distributions, sequence lengths, and quality checks.",
  "/documentation":
    "Browse interactive architecture diagrams, inference sequences, storage layout, API contracts, and operational policies.",
  "/technology":
    "Inspect the verified technology manifest, package audit, SVG stack showcase, and inter-layer communication boundaries.",
  "/404":
    "The requested NLP Lab route could not be found. Return to the workbench or inspect live readiness.",
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pageTitle = TITLES[router.pathname] ?? "Workbench";
  const pageDescription = DESCRIPTIONS[router.pathname] ?? DEFAULT_DESCRIPTION;

  return (
    <ReadinessProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{`${pageTitle} — NLP Lab`}</title>
        <meta content={pageDescription} name="description" />
      </Head>
      <MotionProvider>
        {/* Mounted once for the whole app, so a visitor who lands on any route
            sees the title card, and client-side navigation cannot mount a
            second one. */}
        <EntryPreloader />
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </MotionProvider>
    </ReadinessProvider>
  );
}
