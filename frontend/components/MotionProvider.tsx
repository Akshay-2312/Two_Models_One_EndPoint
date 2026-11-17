import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import {
  getReducedMotionPreference,
  subscribeToReducedMotion,
} from "../lib/motion";

export function MotionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [routeChanging, setRouteChanging] = useState(false);

  useEffect(() => {
    setReducedMotion(getReducedMotionPreference());
    return subscribeToReducedMotion(setReducedMotion);
  }, []);

  useEffect(() => {
    const handleStart = () => setRouteChanging(true);
    const handleComplete = () => setRouteChanging(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router.events]);

  return (
    <div data-reduced-motion={reducedMotion || undefined}>
      <div
        aria-hidden="true"
        className="route-transition"
        data-active={routeChanging || undefined}
      />
      {children}
    </div>
  );
}
