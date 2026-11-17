import type { AppProps } from "next/app";
import { Layout } from "../components/Layout";
import { MotionProvider } from "../components/MotionProvider";
import { ReadinessProvider } from "../components/ReadinessProvider";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ReadinessProvider>
      <MotionProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </MotionProvider>
    </ReadinessProvider>
  );
}
