import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  ApiError,
  getDatasetSamples,
  getDatasetSummary,
  isAbortError,
  type DatasetSamplesResponse,
  type DatasetSummaryResponse,
} from "./api";

export type DatasetSummaryPhase =
  | "loading"
  | "stalled"
  | "unavailable"
  | "failed"
  | "empty"
  | "ready";

export type DatasetSamplesState =
  | "idle"
  | "loading"
  | "stalled"
  | "ready"
  | "error";

export type UseDatasetSummaryResult = {
  phase: DatasetSummaryPhase;
  data: DatasetSummaryResponse | null;
  error: string | null;
  sourceUrl: string;
  activeDatasetId: string;
  setActiveDatasetId: (datasetId: string) => void;
  samplesState: DatasetSamplesState;
  samples: DatasetSamplesResponse | null;
  samplesError: string | null;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  refresh: () => void;
  refreshSamples: () => void;
};

const STALL_MS = 4_000;
const TIMEOUT_MS = 15_000;
const DEFAULT_PAGE_SIZE = 10;

function hasDatasets(response: DatasetSummaryResponse | null): boolean {
  if (!response || typeof response !== "object") return false;
  if (!response.datasets || typeof response.datasets !== "object") return false;
  return Object.keys(response.datasets).length > 0;
}

/**
 * Fetches dataset explorer summary metadata and governed sample previews.
 * Separates loading, stalled, unavailable (503 / offline), failed, empty, and ready states.
 */
export function useDatasetSummary(
  initialDatasetId = "amazon_reviews",
): UseDatasetSummaryResult {
  const summaryEndpoint = `${API_BASE_URL}/datasets/summary`;

  const [phase, setPhase] = useState<DatasetSummaryPhase>("loading");
  const [data, setData] = useState<DatasetSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeDatasetId, setActiveDatasetIdState] =
    useState<string>(initialDatasetId);
  const [page, setPageState] = useState<number>(1);
  const [samplesState, setSamplesState] = useState<DatasetSamplesState>("idle");
  const [samples, setSamples] = useState<DatasetSamplesResponse | null>(null);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [samplesRefreshTick, setSamplesRefreshTick] = useState<number>(0);

  const mountedRef = useRef(true);
  const summaryRequestIdRef = useRef(0);
  const summaryControllerRef = useRef<AbortController | null>(null);
  const samplesRequestIdRef = useRef(0);
  const samplesControllerRef = useRef<AbortController | null>(null);

  const loadSummary = useCallback(async () => {
    summaryControllerRef.current?.abort();
    const controller = new AbortController();
    summaryControllerRef.current = controller;

    const requestId = ++summaryRequestIdRef.current;
    const isCurrent = () =>
      mountedRef.current && requestId === summaryRequestIdRef.current;

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
      const response = await getDatasetSummary({ signal: controller.signal });
      if (!isCurrent()) return;

      if (!hasDatasets(response)) {
        setData(response);
        setPhase("empty");
        return;
      }

      const availableIds = Object.keys(response.datasets);
      setActiveDatasetIdState((current) =>
        availableIds.includes(current) ? current : availableIds[0],
      );
      setData(response);
      setPhase("ready");
    } catch (requestError) {
      if (!isCurrent()) return;

      setData(null);

      if (timedOut) {
        setPhase("failed");
        setError(
          `Dataset summary request to ${summaryEndpoint} timed out after ${TIMEOUT_MS / 1000} seconds.`,
        );
      } else if (isAbortError(requestError)) {
        return;
      } else if (requestError instanceof TypeError) {
        setPhase("unavailable");
        setError(
          `Cannot reach dataset summary endpoint at ${summaryEndpoint}. Start the FastAPI service to inspect committed dataset audit artifacts.`,
        );
      } else if (
        requestError instanceof ApiError &&
        (requestError.status === 503 ||
          requestError.errorCode === "dataset_summary_unavailable")
      ) {
        setPhase("unavailable");
        setError(
          requestError.detail ??
            `Dataset summary report (data/dataset_explorer_summary.json) is missing or unreadable at ${summaryEndpoint}.`,
        );
      } else if (requestError instanceof ApiError) {
        setPhase("failed");
        setError(
          `Source: ${summaryEndpoint} (HTTP ${requestError.status}) — ${requestError.detail ?? requestError.message}`,
        );
      } else {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "Failed to load dataset summary.";
        setPhase("failed");
        setError(`Source: ${summaryEndpoint} — ${message}`);
      }
    } finally {
      window.clearTimeout(stallTimer);
      window.clearTimeout(timeoutTimer);
    }
  }, [summaryEndpoint]);

  const loadSamples = useCallback(
    async (datasetId: string, requestedPage: number) => {
      samplesControllerRef.current?.abort();
      const controller = new AbortController();
      samplesControllerRef.current = controller;

      const requestId = ++samplesRequestIdRef.current;
      const isCurrent = () =>
        mountedRef.current && requestId === samplesRequestIdRef.current;

      setSamplesState("loading");
      setSamplesError(null);

      let timedOut = false;
      const stallTimer = window.setTimeout(() => {
        if (isCurrent()) {
          setSamplesState((current) =>
            current === "loading" ? "stalled" : current,
          );
        }
      }, STALL_MS);

      const timeoutTimer = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TIMEOUT_MS);

      const samplesEndpoint = `${API_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/samples`;

      try {
        const response = await getDatasetSamples(
          datasetId,
          requestedPage,
          DEFAULT_PAGE_SIZE,
          { signal: controller.signal },
        );
        if (!isCurrent()) return;

        setSamples(response);
        setSamplesState("ready");
      } catch (requestError) {
        if (!isCurrent()) return;

        setSamples(null);
        if (timedOut) {
          setSamplesState("error");
          setSamplesError(
            `Sample preview request to ${samplesEndpoint} timed out after ${TIMEOUT_MS / 1000} seconds.`,
          );
        } else if (isAbortError(requestError)) {
          return;
        } else if (requestError instanceof TypeError) {
          setSamplesState("error");
          setSamplesError(
            `Cannot reach sample preview endpoint at ${samplesEndpoint}.`,
          );
        } else if (requestError instanceof ApiError) {
          setSamplesState("error");
          setSamplesError(
            `Source: ${samplesEndpoint} (HTTP ${requestError.status}) — ${requestError.detail ?? requestError.message}`,
          );
        } else {
          const message =
            requestError instanceof Error && requestError.message
              ? requestError.message
              : "Failed to load dataset sample status.";
          setSamplesState("error");
          setSamplesError(`Source: ${samplesEndpoint} — ${message}`);
        }
      } finally {
        window.clearTimeout(stallTimer);
        window.clearTimeout(timeoutTimer);
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadSummary();
    return () => {
      mountedRef.current = false;
      summaryRequestIdRef.current += 1;
      samplesRequestIdRef.current += 1;
      summaryControllerRef.current?.abort();
      samplesControllerRef.current?.abort();
    };
  }, [loadSummary]);

  useEffect(() => {
    if (phase !== "ready" || !activeDatasetId) {
      samplesControllerRef.current?.abort();
      setSamplesState("idle");
      setSamples(null);
      setSamplesError(null);
      return;
    }

    void loadSamples(activeDatasetId, page);
  }, [phase, activeDatasetId, page, samplesRefreshTick, loadSamples]);

  const setActiveDatasetId = useCallback((datasetId: string) => {
    setActiveDatasetIdState((current) => {
      if (current !== datasetId) {
        setPageState(1);
      }
      return datasetId;
    });
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  }, []);

  const refresh = useCallback(() => {
    void loadSummary();
    setSamplesRefreshTick((tick) => tick + 1);
  }, [loadSummary]);

  const refreshSamples = useCallback(() => {
    setSamplesRefreshTick((tick) => tick + 1);
  }, []);

  return {
    phase,
    data,
    error,
    sourceUrl: summaryEndpoint,
    activeDatasetId,
    setActiveDatasetId,
    samplesState,
    samples,
    samplesError,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    setPage,
    refresh,
    refreshSamples,
  };
}
