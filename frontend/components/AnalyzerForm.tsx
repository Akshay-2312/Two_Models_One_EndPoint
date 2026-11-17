import { FormEvent, ReactNode, useState } from "react";
import { Button, Callout, SectionHeader } from "./ui";

type Props<T> = {
  /** Mono specimen line, e.g. `NLP-03 / SENTIMENT`. */
  index: string;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<T>;
  renderResult: (result: T) => ReactNode;
};

export function AnalyzerForm<T>({
  index,
  title,
  description,
  submitLabel,
  onSubmit,
  renderResult,
}: Props<T>) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Enter some text before running an analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await onSubmit(text.trim()));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-section">
      <SectionHeader index={index} title={title} description={description} />
      <form className="analysis-form" onSubmit={submit}>
        <label htmlFor="analysis-text">Input text</label>
        <textarea
          aria-describedby="analysis-count"
          id="analysis-text"
          maxLength={10000}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste a review or short comment…"
          value={text}
        />
        <div className="form-footer">
          <span id="analysis-count">{text.length.toLocaleString()} / 10,000 characters</span>
          <Button disabled={loading} type="submit">
            {loading ? "Analyzing…" : submitLabel}
          </Button>
        </div>
      </form>
      {error && (
        <Callout className="analysis-error" role="alert" tone="danger">
          {error}
        </Callout>
      )}
      {result && (
        <div aria-live="polite" className="result-card">
          {renderResult(result)}
        </div>
      )}
    </section>
  );
}
