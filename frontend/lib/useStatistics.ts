import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  getStatistics,
  type StatisticsResponse,
} from "./api";
import type { StatisticsLoaderStatus } from "../components/ui/liquid-loader";

export type StatisticsPhase = StatisticsLoaderStatus | "ready";

export type UseStatisticsResult = {
  phase: StatisticsPhase;
  data: StatisticsResponse | null;
  error: string | null;
  refresh: () => void;
};

const STALL_MS = 4_000;
const TIMEOUT_MS = 15_000;

function hasAnyContent(body: StatisticsResponse | null): boolean {
  if (!body || typeof body !== "object") return false;
  const datasets = body.datasets ? Object.values(body.datasets) : [];
  const metrics = body.metrics ? Object.values(body.metrics) : [];
  return [...datasets, ...metrics].some(
    (entry) => entry && typeof entry === "object" && Object.keys(entry).length > 0,
  );
}

/**
 * Single source of truth for fetching real dataset & model evaluation statistics.
 * Separates `loading`, `stalled`, `ready`, `empty`, `unavailable`, and `failed` states.
 */
export function useStatistics(): UseStatisticsResult {
  const [phase, setPhase] = useState<StatisticsPhase>("loading");
  const [data, setData] = useState<StatisticsResponse | null>(null);
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
      const response = await getStatistics({ signal: controller.signal });
      if (!isCurrent()) return;

      if (!hasAnyContent(response)) {
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
          `Statistics request to ${API_BASE_URL} timed out after ${TIMEOUT_MS / 1000} seconds.`,
        );
      } else if (requestError instanceof TypeError) {
        setPhase("unavailable");
        setError(
          `Cannot reach the API at ${API_BASE_URL}. Start the FastAPI service to inspect repository statistics.`,
        );
      } else {
        setPhase("failed");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load statistics.",
        );
      }
    } finally {
      window.clearTimeout(stallTimer);
      window.clearTimeout(timeoutTimer);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load]);

  return { phase, data, error, refresh: load };
}
