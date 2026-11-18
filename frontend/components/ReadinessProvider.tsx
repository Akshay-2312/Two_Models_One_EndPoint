import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL, ApiError, getReadiness, type ReadinessResponse } from "../lib/api";

/**
 * `checking` is the only non-terminal phase. Every settled request lands on
 * `online`, `degraded`, `offline` or `unknown`, so the UI can never be stuck
 * showing "Checking" after the request has finished.
 */
export type ReadinessPhase = "checking" | "online" | "degraded" | "offline" | "unknown";

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

/** A 200 we cannot interpret is neither healthy nor unreachable. */
function readResponse(body: ReadinessResponse): { phase: ReadinessPhase; note: string | null } {
  const models = body?.models;
  if (!models || typeof models !== "object") {
    return { phase: "unknown", note: "The API replied without a model list." };
  }

  const entries = Object.values(models);
  if (entries.length === 0) {
    return { phase: "unknown", note: "The API reported no models." };
  }

  const notReady = entries.filter((model) => !model.ready);
  if (notReady.length === 0 && body.status === "ready") {
    return { phase: "online", note: null };
  }

  const firstError = notReady.map((model) => model.error).find(Boolean);
  return {
    phase: "degraded",
    note: firstError ?? "At least one model is loaded but not ready.",
  };
}

export function ReadinessProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<ReadinessPhase>("checking");
  const [response, setResponse] = useState<ReadinessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const phaseRef = useRef<ReadinessPhase>("checking");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const check = useCallback(async () => {
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    const isCurrent = () => mountedRef.current && requestId === requestRef.current;

    setPhase("checking");
    setError(null);

    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, READINESS_TIMEOUT_MS);

    try {
      const next = await getReadiness({ signal: controller.signal });
      if (!isCurrent()) return;

      const result = readResponse(next);
      setResponse(next);
      setPhase(result.phase);
      setError(result.note);
      setCheckedAt(Date.now());
    } catch (requestError) {
      if (!isCurrent()) return;

      setResponse(null);
      if (requestError instanceof ApiError) {
        setPhase("unknown");
        setError(`API readiness error (${requestError.status}): ${requestError.message}`);
      } else {
        setPhase("offline");
        setError(
          timedOut
            ? `The API at ${API_BASE_URL} did not respond within ${READINESS_TIMEOUT_MS / 1000} seconds.`
            : describeFailure(requestError),
        );
      }
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
      requestRef.current += 1;
    };
  }, [check]);

  // Recover automatically when the tab regains focus after an outage or error.
  useEffect(() => {
    const recheckWhenOffline = () => {
      if (phaseRef.current === "offline" || phaseRef.current === "unknown") {
        void check();
      }
    };
    window.addEventListener("focus", recheckWhenOffline);
    window.addEventListener("online", recheckWhenOffline);
    return () => {
      window.removeEventListener("focus", recheckWhenOffline);
      window.removeEventListener("online", recheckWhenOffline);
    };
  }, [check]);

  return (
    <ReadinessContext.Provider value={{ phase, response, error, checkedAt, refresh: check }}>
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
