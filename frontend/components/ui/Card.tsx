import type { HTMLAttributes, ReactNode } from "react";

export type CardTone = "default" | "sunken";

type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  as?: "article" | "div" | "section";
  tone?: CardTone;
  kicker?: ReactNode;
  title?: ReactNode;
};

/** The one content container. Kicker is a mono specimen label, title is the card heading. */
export function Card({ as: Tag = "article", tone = "default", kicker, title, className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={["card", tone !== "default" ? `card--${tone}` : null, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {kicker ? <span className="card__kicker">{kicker}</span> : null}
      {title ? <h2 className="card__title">{title}</h2> : null}
      {children}
    </Tag>
  );
}
