import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "model";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  /** Adds the leading state dot. Use it for live status, never for decoration. */
  dot?: boolean;
};

export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={["badge", `badge--${tone}`, dot ? "badge--dot" : null, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
