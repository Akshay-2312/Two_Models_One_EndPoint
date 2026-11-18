import { useCallback, useEffect, useRef, useState } from "react";
import { getReducedMotionPreference } from "../lib/motion";
import { readStored, writeStored } from "../lib/storage";
import AnimatorTitlePreloader from "./ui/animator-title-preloader";

/**
 * Session key that records "this tab has already shown the title card".
 * Reset it from the console to see the card again:
 *   sessionStorage.removeItem("nlp-lab-entry-seen")
 */
export const ENTRY_SESSION_KEY = "nlp-lab-entry-seen";

/**
 * Presentation-only override, read from the query string:
 *   ?entry=force  show the card even if this tab has seen it
 *   ?entry=off    never show it in this tab
 * It changes what is drawn and nothing else: no data, auth or routing path is
 * affected, so it is safe to leave available in a production build.
 */
export const ENTRY_OVERRIDE_PARAM = "entry";

type GateState = "deciding" | "showing" | "dismissed";

const PALETTE = {
  stage: "#070b13",
  ink: "#f2f1ec",
  muted: "#7b8698",
  rough: "#5fd3e0",
  ghost: "#a394f8",
  word0: "#e8eef8",
  word1: "#f2f1ec",
  word2: "#ffffff",
};

/**
 * First-entry title card. Mounted once by `_app`, so it covers the first route
 * a visitor lands on rather than the dashboard only.
 *
 * The session is only marked as seen when the sequence finishes or the visitor
 * skips it. A bypass (reduced motion, `?entry=off`) writes nothing, so the
 * preference keeps working on the next load.
 *
 * Deliberately not tied to API readiness: the app renders underneath and
 * reports its own state. The card never claims to be loading anything.
 */
export function EntryPreloader() {
  const [state, setState] = useState<GateState>("deciding");
  const settledRef = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    // Skip and the animation's own completion both land here, so this guard is
    // what stops a double write or a second `setState`.
    if (settledRef.current) return;
    settledRef.current = true;
    writeStored("session", ENTRY_SESSION_KEY, "1");
    setState("dismissed");
  }, []);

  useEffect(() => {
    if (settledRef.current) return;

    const override = new URLSearchParams(window.location.search).get(ENTRY_OVERRIDE_PARAM);
    if (override === "off") {
      setState("dismissed");
      return;
    }

    // Reduced motion opts out of the whole sequence: no card, no delay.
    if (getReducedMotionPreference()) {
      setState("dismissed");
      return;
    }

    // An unreadable store returns null, which shows the card again rather than
    // blocking entry. The worst case is one extra title card per reload.
    if (override !== "force" && readStored("session", ENTRY_SESSION_KEY)) {
      setState("dismissed");
      return;
    }

    setState("showing");
  }, []);

  useEffect(() => {
    if (state !== "showing") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      // Skip is the only control on the card, so Tab stays on it rather than
      // reaching the page that is waiting underneath.
      if (event.key === "Tab") {
        event.preventDefault();
        skipRef.current?.focus();
      }
    };

    // Move focus off the page behind the card. `Skip` is the only control that
    // must work from the keyboard, so it takes focus and Escape mirrors it.
    skipRef.current?.focus();
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state, dismiss]);

  if (state !== "showing") return null;

  return (
    <div
      aria-label="NLP Major Project title card"
      aria-modal="true"
      className="entry-preloader-shell"
      role="dialog"
    >
      <AnimatorTitlePreloader
        announceProgress={false}
        connector="Language intelligence, made inspectable."
        durationMs={2600}
        hands={false}
        hud
        kicker="NLP LAB / TITLE CARD"
        label="Entry title card"
        mascot={false}
        meta="ENTRY"
        name=""
        palette={PALETTE}
        preset="dusk"
        rough
        scene="NLP-01 / WORKBENCH"
        title="NLP Major Project"
        onComplete={dismiss}
      />
      <button className="entry-preloader-skip" ref={skipRef} type="button" onClick={dismiss}>
        Skip
      </button>
    </div>
  );
}
