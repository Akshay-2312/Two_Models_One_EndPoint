import type { AppProps } from "next/app";
import { Layout } from "../components/Layout";
import { MotionProvider } from "../components/MotionProvider";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MotionProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </MotionProvider>
  );
}
