import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL, getReadiness, type ReadinessResponse } from "../lib/api";

export type ReadinessPhase = "loading" | "ready" | "degraded" | "offline";

export type ReadinessState = {
  phase: ReadinessPhase;
  response: ReadinessResponse | null;
  error: string | null;
  checkedAt: number | null;
  refresh: () => void;
};

// A cold start loads both model bundles, measured at ~8.5 s on this machine.
const READINESS_TIMEOUT_MS = 60_000;

const ReadinessContext = createContext<ReadinessState | null>(null);

function describeFailure(error: unknown): string {
  if (error instanceof TypeError) {
    return `Cannot reach the API at ${API_BASE_URL}. Start the backend, then retry.`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "The readiness check failed.";
}

export function ReadinessProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<ReadinessPhase>("loading");
  const [response, setResponse] = useState<ReadinessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timedOutRef = useRef(false);
  const phaseRef = useRef<ReadinessPhase>("loading");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const check = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    timedOutRef.current = false;
    setPhase("loading");
    setError(null);

    const timeout = window.setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, READINESS_TIMEOUT_MS);

    try {
      const next = await getReadiness({ signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;

      const models = Object.values(next.models ?? {});
      const allReady =
        next.status === "ready" &&
        models.length > 0 &&
        models.every((model) => model.ready);

      setResponse(next);
      setPhase(allReady ? "ready" : "degraded");
      setCheckedAt(Date.now());
    } catch (requestError) {
      if (!mountedRef.current || (controller.signal.aborted && !timedOutRef.current)) {
        return;
      }
      setResponse(null);
      setPhase("offline");
      setError(
        timedOutRef.current
          ? `The API at ${API_BASE_URL} did not respond within ${
              READINESS_TIMEOUT_MS / 1000
            } seconds.`
          : describeFailure(requestError),
      );
      setCheckedAt(Date.now());
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void check();
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [check]);

  // Recover automatically when the tab regains focus after an outage.
  useEffect(() => {
    const recheckWhenOffline = () => {
      if (phaseRef.current === "offline") void check();
    };
    window.addEventListener("focus", recheckWhenOffline);
    window.addEventListener("online", recheckWhenOffline);
    return () => {
      window.removeEventListener("focus", recheckWhenOffline);
      window.removeEventListener("online", recheckWhenOffline);
    };
  }, [check]);

  return (
    <ReadinessContext.Provider
      value={{ phase, response, error, checkedAt, refresh: check }}
    >
      {children}
    </ReadinessContext.Provider>
  );
}

export function useReadiness(): ReadinessState {
  const context = useContext(ReadinessContext);
  if (!context) {
    throw new Error("useReadiness must be used inside ReadinessProvider.");
  }
  return context;
}
