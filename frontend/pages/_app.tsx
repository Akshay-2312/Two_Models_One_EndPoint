import Head from "next/head";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
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
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pageTitle = TITLES[router.pathname] ?? "Workbench";

  return (
    <ReadinessProvider>
      <Head>
        <title>{`${pageTitle} — NLP Lab`}</title>
        <meta
          content="Inspect a Word2Vec + BiLSTM rating model and a fine-tuned DistilBERT emotion model from one workbench."
          name="description"
        />
      </Head>
      <MotionProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </MotionProvider>
    </ReadinessProvider>
  );
}
