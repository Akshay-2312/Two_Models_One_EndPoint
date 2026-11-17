import { FormEvent, ReactNode, useState } from "react";

type Props<T> = {
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<T>;
  renderResult: (result: T) => ReactNode;
};

export function AnalyzerForm<T>({
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
      <div className="eyebrow">Model-powered analysis</div>
      <h1>{title}</h1>
      <p className="lede">{description}</p>
      <form className="analysis-form" onSubmit={submit}>
        <label htmlFor="analysis-text">Input text</label>
        <textarea
          id="analysis-text"
          maxLength={10000}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste a review or short comment..."
          value={text}
        />
        <div className="form-footer">
          <span>{text.length.toLocaleString()} / 10,000 characters</span>
          <button disabled={loading} type="submit">
            {loading ? "Analyzing..." : submitLabel}
          </button>
        </div>
      </form>
      {error && <p className="error-box" role="alert">{error}</p>}
      {result && <div className="result-card" aria-live="polite">{renderResult(result)}</div>}
    </section>
  );
}
