import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  ApiError,
  getModelLab,
  isAbortError,
  type ModelLabResponse,
} from "./api";

export type ModelLabPhase =
  | "loading"
  | "stalled"
  | "unavailable"
  | "failed"
  | "empty"
  | "ready";

export type UseModelLabResult = {
  phase: ModelLabPhase;
  data: ModelLabResponse | null;
  error: string | null;
  sourceUrl: string;
  refresh: () => void;
};

const STALL_MS = 4_000;
const TIMEOUT_MS = 15_000;

function hasTracks(response: ModelLabResponse | null): boolean {
  if (!response || typeof response !== "object") return false;
  if (!response.tracks || typeof response.tracks !== "object") return false;
  const amazonSteps = response.tracks.amazon_rating?.pipeline_steps;
  const goSteps = response.tracks.go_emotions?.pipeline_steps;
  return (
    (Array.isArray(amazonSteps) && amazonSteps.length > 0) ||
    (Array.isArray(goSteps) && goSteps.length > 0)
  );
}

/**
 * Fetches Model Lab pipeline metadata, evaluation metrics, ONNX parity, and artifact checks.
 * Separates loading, stalled, unavailable (503 / offline), failed, empty, and ready states.
 */
export function useModelLab(): UseModelLabResult {
  const endpoint = `${API_BASE_URL}/models/lab`;

  const [phase, setPhase] = useState<ModelLabPhase>("loading");
  const [data, setData] = useState<ModelLabResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

    setPhase("loading");
    setError(null);

    let timedOut = false;
    const stallTimer = window.setTimeout(() => {
      if (isCurrent()) {
        setPhase((current) => (current === "loading" ? "stalled" : current));
      }
    }, STALL_MS);

    const timeoutTimer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await getModelLab({ signal: controller.signal });
      if (!isCurrent()) return;

      if (!hasTracks(response)) {
        setData(response);
        setPhase("empty");
        return;
      }

      setData(response);
      setPhase("ready");
    } catch (requestError) {
      if (!isCurrent()) return;

      setData(null);

      if (timedOut) {
        setPhase("failed");
        setError(
          `Model Lab request to ${endpoint} timed out after ${TIMEOUT_MS / 1000} seconds.`,
        );
      } else if (isAbortError(requestError)) {
        return;
      } else if (requestError instanceof TypeError) {
        setPhase("unavailable");
        setError(
          `Cannot reach Model Lab endpoint at ${endpoint}. Start the FastAPI service to inspect verified model artifacts and pipelines.`,
        );
      } else if (
        requestError instanceof ApiError &&
        (requestError.status === 503 ||
          requestError.errorCode === "model_lab_unavailable")
      ) {
        setPhase("unavailable");
        setError(
          requestError.detail ??
            `Model Lab metadata artifact (data/model_lab_artifacts.json) is missing or unreadable at ${endpoint}.`,
        );
      } else if (requestError instanceof ApiError) {
        setPhase("failed");
        setError(
          `Source: ${endpoint} (HTTP ${requestError.status}) — ${requestError.detail ?? requestError.message}`,
        );
      } else {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "Failed to load Model Lab metadata.";
        setPhase("failed");
        setError(`Source: ${endpoint} — ${message}`);
      }
    } finally {
      window.clearTimeout(stallTimer);
      window.clearTimeout(timeoutTimer);
    }
  }, [endpoint]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load]);

  return {
    phase,
    data,
    error,
    sourceUrl: endpoint,
    refresh: load,
  };
}
