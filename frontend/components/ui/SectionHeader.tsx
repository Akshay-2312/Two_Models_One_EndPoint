import type { ReactNode } from "react";

type SectionHeaderProps = {
  /** Mono specimen line, e.g. `NLP-03 / SENTIMENT`. */
  index: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

/** Page opening: specimen index, one h1, optional lede and actions. */
export function SectionHeader({ index, title, description, children }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <p className="specimen">{index}</p>
      <h1>{title}</h1>
      {description ? <p className="lede">{description}</p> : null}
      {children}
    </header>
  );
}
