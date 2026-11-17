export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function getReducedMotionPreference(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function subscribeToReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches);
  mediaQuery.addEventListener("change", handleChange);

  return () => mediaQuery.removeEventListener("change", handleChange);
}
