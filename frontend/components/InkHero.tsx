import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type InkHeroProps = {
  children: ReactNode;
};

type InkStyle = CSSProperties & {
  "--ink-x": string;
  "--ink-y": string;
  "--ink-progress": string;
};

export function InkHero({ children }: InkHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 58, y: 42 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const hero = heroRef.current;
    const update = () => {
      const bounds = hero?.getBoundingClientRect();
      if (!bounds) return;

      const viewportProgress = (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height);
      setProgress(Math.max(0, Math.min(1, viewportProgress)));
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = hero?.getBoundingClientRect();
      if (!bounds) return;
      setPointer({
        x: ((event.clientX - bounds.left) / bounds.width) * 100,
        y: ((event.clientY - bounds.top) / bounds.height) * 100,
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    hero?.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      hero?.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  const style: InkStyle = {
    "--ink-x": `${pointer.x}%`,
    "--ink-y": `${pointer.y}%`,
    "--ink-progress": `${progress}`,
  };

  return (
    <div className="ink-hero" ref={heroRef} style={style}>
      <div className="ink-hero__grain" aria-hidden="true" />
      <div className="ink-hero__wash" aria-hidden="true" />
      <div className="ink-hero__landscape" aria-hidden="true">
        <span className="ink-hero__ridge ink-hero__ridge--back" />
        <span className="ink-hero__ridge ink-hero__ridge--front" />
        <span className="ink-hero__pool" />
      </div>
      <div className="ink-hero__paper">{children}</div>
      <div className="ink-hero__caption" aria-hidden="true">
        <span>Signal / 01</span>
        <span>Scroll to develop</span>
      </div>
    </div>
  );
}
