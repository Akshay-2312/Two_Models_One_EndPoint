import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <meta content="dark" name="color-scheme" />
        {/* Browser chrome colour; meta tags cannot read a CSS custom property. */}
        <meta content="#070b13" name="theme-color" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
