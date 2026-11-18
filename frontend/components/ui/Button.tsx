import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";

function buttonClass(variant: ButtonVariant, className?: string) {
  return ["button", variant !== "primary" ? `button--${variant}` : null, className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/** Action button. Defaults to `type="button"` so a stray click can never submit a form. */
export function Button({ variant = "primary", className, type = "button", ...rest }: ButtonProps) {
  return <button className={buttonClass(variant, className)} type={type} {...rest} />;
}

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

/** Navigation that looks like an action. Uses a real anchor, not a button with a click handler. */
export function ButtonLink({ variant = "primary", className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
