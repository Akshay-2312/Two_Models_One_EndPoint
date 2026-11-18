import { useEffect, useRef, useState, type ReactNode } from "react";
import { getReducedMotionPreference } from "../lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * One-shot scroll reveal for below-the-fold marketing sections.
 *
 * The markup is visible by default. Only after mount, and only when the block
 * is still below the viewport, does it arm the hidden state and wait for a
 * single intersection. No JavaScript, no IntersectionObserver or reduced
 * motion means the content simply stays visible.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (getReducedMotionPreference() || typeof IntersectionObserver === "undefined") return;

    // Already on screen: leave it alone rather than hiding it for one frame.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={["reveal", className].filter(Boolean).join(" ")}
      data-reveal={armed ? "armed" : undefined}
      data-visible={visible ? "true" : undefined}
      ref={ref}
    >
      {children}
    </div>
  );
}
