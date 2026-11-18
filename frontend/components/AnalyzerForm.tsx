import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { classifyApiError } from "../lib/api";
import {
  AnalysisLoader,
  Button,
  Callout,
  SectionHeader,
  type AnalysisContextLabel,
} from "./ui";

const ANALYSIS_STALL_MS = 4_000;
const ANALYSIS_TIMEOUT_MS = 30_000;
const MAX_INPUT_CHARS = 10_000;

export type SamplePrompt = {
  label: string;
  text: string;
};

export type AnalysisRenderContext = {
  submittedText: string;
  isStale: boolean;
};

export type AnalysisRequestPhase =
  | "idle"
  | "pending"
  | "stalled"
  | "validation_error"
  | "offline"
  | "timeout"
  | "api_error"
  | "cancelled"
  | "success";

type Props<T> = {
  /** Mono specimen line, e.g. `NLP-02 / SENTIMENT`. */
  index: string;
  title: string;
  description: string;
  submitLabel: string;
  /** Context-aware status copy for AnalysisLoader (`Analyzing review…` or `Detecting emotions…`). */
  loadingLabel?: AnalysisContextLabel;
  /** Accessible label for the text input. */
  inputLabel?: string;
  /** Placeholder text for the textarea. */
  placeholder?: string;
  /** Optional quick-fill sample prompts (fills textarea without auto-submitting). */
  samples?: SamplePrompt[];
  onSubmit: (text: string, init?: RequestInit) => Promise<T>;
  renderResult: (result: T, context: AnalysisRenderContext) => ReactNode;
};

const ERROR_TITLE_BY_PHASE: Record<
  Extract<
    AnalysisRequestPhase,
    "validation_error" | "offline" | "timeout" | "api_error" | "cancelled"
  >,
  string
> = {
  validation_error: "Input required",
  offline: "API unreachable",
  timeout: "Request timed out",
  api_error: "Analysis failed",
  cancelled: "Analysis cancelled",
};

export function AnalyzerForm<T>({
  index,
  title,
  description,
  submitLabel,
  loadingLabel = "Analyzing review…",
  inputLabel = "Input text",
  placeholder = "Paste a review or short comment…",
  samples,
  onSubmit,
  renderResult,
}: Props<T>) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<T | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [resultKey, setResultKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [phase, setPhase] = useState<AnalysisRequestPhase>("idle");

  // Single source of truth for loading state + synchronous in-flight guard against double submits.
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const loading = phase === "pending" || phase === "stalled";
  const isStale = Boolean(result !== null && submittedText && text.trim() !== submittedText);

  const cancelAnalysis = useCallback(() => {
    if (!inFlightRef.current) return;
    inFlightRef.current = false;
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (mountedRef.current) {
      setPhase("cancelled");
      setErrorStatus(null);
      setError("Analysis cancelled. Your text was preserved so you can edit or retry.");
    }
  }, []);

  const runAnalysis = useCallback(
    async (rawInput: string) => {
      if (inFlightRef.current) return;

      const trimmed = rawInput.trim();
      if (!trimmed) {
        setPhase("validation_error");
        setErrorStatus(null);
        setError("Enter some text before running an analysis.");
        return;
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      controllerRef.current = controller;

      setPhase("pending");
      setError(null);
      setErrorStatus(null);

      let timedOut = false;
      const stallTimer = window.setTimeout(() => {
        if (mountedRef.current && inFlightRef.current) {
          setPhase((current) => (current === "pending" ? "stalled" : current));
        }
      }, ANALYSIS_STALL_MS);

      const timeoutTimer = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, ANALYSIS_TIMEOUT_MS);

      try {
        const nextResult = await onSubmit(trimmed, { signal: controller.signal });
        if (!mountedRef.current || controller.signal.aborted) return;

        setResult(nextResult);
        setSubmittedText(trimmed);
        setResultKey((current) => current + 1);
        setPhase("success");
      } catch (requestError) {
        if (!mountedRef.current) return;

        if (!timedOut && controller.signal.aborted) {
          return;
        }

        const classified = classifyApiError(requestError, {
          timedOut,
          timeoutMs: ANALYSIS_TIMEOUT_MS,
        });

        if (classified.kind === "cancelled") {
          setPhase("cancelled");
          setErrorStatus(null);
          setError("Analysis cancelled. Your text was preserved so you can edit or retry.");
          return;
        }

        if (classified.kind === "timeout") {
          setPhase("timeout");
          setErrorStatus(null);
          setError(classified.message);
          return;
        }

        if (classified.kind === "offline") {
          setPhase("offline");
          setErrorStatus(null);
          setError(classified.message);
          return;
        }

        setPhase("api_error");
        setErrorStatus(classified.status ?? null);
        setError(classified.message);
      } finally {
        window.clearTimeout(stallTimer);
        window.clearTimeout(timeoutTimer);
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          inFlightRef.current = false;
        }
      }
    },
    [onSubmit],
  );

  function handleTextChange(nextValue: string) {
    setText(nextValue);
    if (phase === "validation_error" && nextValue.trim().length > 0) {
      setError(null);
      setErrorStatus(null);
      setPhase(result !== null ? "success" : "idle");
    }
  }

  function handleSelectSample(sampleText: string) {
    if (loading) return;
    setText(sampleText);
    setError(null);
    setErrorStatus(null);
    setPhase(result !== null ? "success" : "idle");
  }

  function handleClear() {
    if (loading) return;
    setText("");
    setError(null);
    setErrorStatus(null);
    setPhase(result !== null ? "success" : "idle");
    textareaRef.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAnalysis(text);
  }

  const isErrorPhase =
    phase === "validation_error" ||
    phase === "offline" ||
    phase === "timeout" ||
    phase === "api_error" ||
    phase === "cancelled";

  const describedBy =
    phase === "validation_error" && error
      ? "analysis-count analysis-validation-error"
      : "analysis-count";

  const errorTone =
    phase === "validation_error" || phase === "cancelled" ? "warning" : "danger";

  const errorTitle = isErrorPhase
    ? phase === "api_error" && errorStatus !== null
      ? `API error (${errorStatus})`
      : ERROR_TITLE_BY_PHASE[phase]
    : undefined;

  return (
    <section className="page-section" data-phase={phase}>
      <SectionHeader index={index} title={title} description={description} />
      <form aria-busy={loading} className="analysis-form" noValidate onSubmit={submit}>
        {samples && samples.length > 0 ? (
          <div aria-labelledby="analysis-samples-label" className="sample-prompts" role="group">
            <span className="sample-prompts__label" id="analysis-samples-label">
              Sample prompts (click to fill draft)
            </span>
            <div className="sample-chip-row">
              {samples.map((sample) => (
                <button
                  className="sample-chip"
                  disabled={loading}
                  key={sample.label}
                  onClick={() => handleSelectSample(sample.text)}
                  type="button"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label htmlFor="analysis-text">{inputLabel}</label>
        <textarea
          aria-describedby={describedBy}
          aria-invalid={phase === "validation_error" ? true : undefined}
          disabled={loading}
          id="analysis-text"
          maxLength={MAX_INPUT_CHARS}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder={placeholder}
          ref={textareaRef}
          value={text}
        />

        <div className="form-footer">
          <span className="form-meta" id="analysis-count">
            {text.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} characters
          </span>
          <div className="analyzer-actions">
            <Button
              disabled={loading || (text.length === 0 && phase !== "validation_error")}
              onClick={handleClear}
              type="button"
              variant="secondary"
            >
              Clear
            </Button>
            <Button disabled={loading} type="submit">
              {loading ? loadingLabel : submitLabel}
            </Button>
          </div>
        </div>
      </form>

      {loading ? (
        <AnalysisLoader
          className="analysis-pending"
          label={loadingLabel}
          onCancel={cancelAnalysis}
          stalled={phase === "stalled"}
        />
      ) : null}

      {!loading && isErrorPhase && error ? (
        <Callout
          className="analysis-error"
          data-state={phase}
          id={phase === "validation_error" ? "analysis-validation-error" : undefined}
          role="alert"
          title={errorTitle}
          tone={errorTone}
        >
          <p>{error}</p>
          {phase !== "validation_error" && text.trim() ? (
            <div className="loader-actions">
              <Button onClick={() => void runAnalysis(text)} type="button" variant="secondary">
                Retry analysis
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}

      {!loading && result !== null && submittedText ? (
        <div
          aria-live="polite"
          className="result-card"
          data-stale={isStale ? "true" : "false"}
          key={resultKey}
        >
          {renderResult(result, { submittedText, isStale })}
        </div>
      ) : null}
    </section>
  );
}
