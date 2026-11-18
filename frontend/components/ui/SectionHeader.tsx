import type { ReactNode } from "react";

type SectionHeaderProps = {
  /** Mono specimen line, e.g. `NLP-03 / SENTIMENT`. Omitted inside a page. */
  index?: string;
  title: string;
  /** Page opening (1) or a section inside a page (2). */
  level?: 1 | 2;
  description?: ReactNode;
  children?: ReactNode;
};

/** Page opening: specimen index, one heading, optional lede and actions. */
export function SectionHeader({
  index,
  title,
  level = 1,
  description,
  children,
}: SectionHeaderProps) {
  const Heading = level === 2 ? "h2" : "h1";

  return (
    <header className={level === 2 ? "section-header section-header--sub" : "section-header"}>
      {index ? <p className="specimen">{index}</p> : null}
      <Heading>{title}</Heading>
      {description ? <p className="lede">{description}</p> : null}
      {children}
    </header>
  );
}
