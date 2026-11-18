import { useEffect, useState, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function getReducedMotionPreference(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function subscribeToReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches);
  mediaQuery.addEventListener("change", handleChange);

  return () => mediaQuery.removeEventListener("change", handleChange);
}

/**
 * Shared React hook that tracks `prefers-reduced-motion: reduce` live while the
 * application is open. Defaults to `false` on SSR and syncs on mount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    setReduced(getReducedMotionPreference());
    return subscribeToReducedMotion(setReduced);
  }, []);

  return reduced;
}

/**
 * Normalizes a Next.js Pages Router URL down to its pathname, stripping query
 * strings and hashes so query-only changes never replay full-route transitions.
 */
export function normalizeRoutePath(url: string): string {
  const base = url.split("#")[0]?.split("?")[0] ?? "/";
  return base || "/";
}

/**
 * Scoped GSAP helper that automatically respects `useReducedMotion` and cleans
 * up all tweens/timelines when the component unmounts or dependencies change.
 */
export function useScopedGSAP(
  callback: (context: gsap.Context) => void,
  options: {
    scope: RefObject<Element | null>;
    dependencies?: unknown[];
    enabled?: boolean;
  },
) {
  const reduced = useReducedMotion();
  const isEnabled = (options.enabled ?? true) && !reduced;

  useGSAP(
    (context) => {
      if (!isEnabled) return;
      callback(context);
    },
    {
      scope: options.scope,
      dependencies: [isEnabled, ...(options.dependencies ?? [])],
      revertOnUpdate: true,
    },
  );
}
