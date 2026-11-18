import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  ApiError,
  getTechnologyManifest,
  isAbortError,
  isNetworkError,
  type TechnologyManifestResponse,
} from "./api";

export type TechnologyManifestPhase =
  | "loading"
  | "stalled"
  | "unavailable"
  | "failed"
  | "empty"
  | "ready";

export type UseTechnologyManifestResult = {
  phase: TechnologyManifestPhase;
  data: TechnologyManifestResponse | null;
  error: string | null;
  sourceUrl: string;
  refresh: () => void;
};

const STALL_MS = 4_000;
const TIMEOUT_MS = 15_000;

function hasTechnologies(response: TechnologyManifestResponse | null): boolean {
  if (!response || typeof response !== "object") return false;
  return Array.isArray(response.technologies) && response.technologies.length > 0;
}

/**
 * Fetches the verified technology stack manifest and boundary contracts from `/technology`.
 * Separates loading, stalled, unavailable (503 / offline), failed, empty, and ready states.
 */
export function useTechnologyManifest(): UseTechnologyManifestResult {
  const endpoint = `${API_BASE_URL}/technology`;

  const [phase, setPhase] = useState<TechnologyManifestPhase>("loading");
  const [data, setData] = useState<TechnologyManifestResponse | null>(null);
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
      const response = await getTechnologyManifest({ signal: controller.signal });
      if (!isCurrent()) return;

      if (!hasTechnologies(response)) {
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
          `Technology manifest request to ${endpoint} timed out after ${TIMEOUT_MS / 1000} seconds.`,
        );
      } else if (isAbortError(requestError)) {
        return;
      } else if (isNetworkError(requestError)) {
        setPhase("unavailable");
        setError(
          `Cannot reach technology manifest endpoint at ${endpoint}. Start the FastAPI service to inspect the verified stack inventory.`,
        );
      } else if (requestError instanceof ApiError && requestError.status === 503) {
        setPhase("unavailable");
        setError(
          requestError.detail ??
            `Technology manifest service is unavailable at ${endpoint}.`,
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
            : "Failed to load technology manifest.";
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
