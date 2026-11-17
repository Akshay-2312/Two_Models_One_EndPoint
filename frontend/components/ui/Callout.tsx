import type { HTMLAttributes, ReactNode } from "react";

export type CalloutTone = "info" | "success" | "warning" | "danger";

type CalloutProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CalloutTone;
  title?: ReactNode;
};

/** Inline message for errors, warnings and empty results. Always carries text, never colour alone. */
export function Callout({ tone = "info", title, className, children, ...rest }: CalloutProps) {
  return (
    <div className={["callout", `callout--${tone}`, className].filter(Boolean).join(" ")} {...rest}>
      {title ? <p className="callout__title">{title}</p> : null}
      {children}
    </div>
  );
}
