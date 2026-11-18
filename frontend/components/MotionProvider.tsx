import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getReducedMotionPreference,
  normalizeRoutePath,
  subscribeToReducedMotion,
} from "../lib/motion";
import {
  CircleRevealLoader,
  type CircleRevealRoutePhase,
} from "./ui/circle-reveal-loader";

type MotionContextValue = {
  reducedMotion: boolean;
  routeChanging: boolean;
  routePhase: CircleRevealRoutePhase;
};

const MotionContext = createContext<MotionContextValue>({
  reducedMotion: false,
  routeChanging: false,
  routePhase: "idle",
});

export function useMotion(): MotionContextValue {
  return useContext(MotionContext);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [routePhase, setRoutePhase] = useState<CircleRevealRoutePhase>("idle");
  const [transitionId, setTransitionId] = useState(0);

  const activePathRef = useRef<string>(normalizeRoutePath(router.asPath || router.pathname));
  const targetPathRef = useRef<string | null>(null);

  useEffect(() => {
    setReducedMotion(getReducedMotionPreference());
    return subscribeToReducedMotion(setReducedMotion);
  }, []);

  useEffect(() => {
    activePathRef.current = normalizeRoutePath(router.asPath || router.pathname);
  }, [router.asPath, router.pathname]);

  const handleRevealComplete = useCallback(() => {
    setRoutePhase("idle");
  }, []);

  useEffect(() => {
    const focusMainHeadingAfterNavigation = () => {
      if (typeof document === "undefined") return;
      window.requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          if (!heading.hasAttribute("tabindex")) {
            heading.setAttribute("tabindex", "-1");
          }
          heading.focus({ preventScroll: true });
        }
      });
    };

    const handleStart = (url: string, options?: { shallow?: boolean }) => {
      if (options?.shallow) return;
      const nextPath = normalizeRoutePath(url);
      // Query-only or same-pathname updates must not replay the route reveal.
      if (nextPath === activePathRef.current && targetPathRef.current === null) {
        return;
      }
      targetPathRef.current = nextPath;
      setTransitionId((id) => id + 1);
      setRoutePhase("entering");
    };

    const handleComplete = (url: string) => {
      const completedPath = normalizeRoutePath(url);
      const wasMeaningfulChange =
        targetPathRef.current !== null || completedPath !== activePathRef.current;
      activePathRef.current = completedPath;
      targetPathRef.current = null;

      if (!wasMeaningfulChange) {
        setRoutePhase("idle");
        return;
      }

      setRoutePhase("revealing");
      focusMainHeadingAfterNavigation();
    };

    const handleError = () => {
      targetPathRef.current = null;
      setRoutePhase("idle");
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleError);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleError);
    };
  }, [router.events]);

  const routeChanging = routePhase !== "idle";

  return (
    <MotionContext.Provider value={{ reducedMotion, routeChanging, routePhase }}>
      <div data-reduced-motion={reducedMotion || undefined}>
        <CircleRevealLoader
          onComplete={handleRevealComplete}
          phase={routePhase}
          transitionId={transitionId}
        />
        {children}
      </div>
    </MotionContext.Provider>
  );
}
