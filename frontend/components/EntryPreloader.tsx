import { useEffect, useState } from "react";
import { getReducedMotionPreference } from "../lib/motion";
import AnimatorTitlePreloader from "./ui/animator-title-preloader";

const SESSION_KEY = "nlp-lab-entry-seen";

type Props = {
  onComplete: () => void;
};

export function EntryPreloader({ onComplete }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getReducedMotionPreference() || sessionStorage.getItem(SESSION_KEY)) {
      onComplete();
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "true");
    setVisible(true);
    return undefined;
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="entry-preloader-shell">
      <AnimatorTitlePreloader
        title="NLP Major Project"
        kicker="NLP LAB / TITLE CARD"
        connector="Language intelligence, made inspectable."
        meta="NLP-01 / READY"
        scene="SCENE 01 / RESEARCH"
        preset="dusk"
        durationMs={2600}
        hands
        rough
        mascot
        hud
        onComplete={onComplete}
      />
      <button className="entry-preloader-skip" type="button" onClick={onComplete}>
        Skip
      </button>
    </div>
  );
}
