import { ReactNode } from "react";
import { cn } from "../utils";

type TypographyVariant =
  | "hero"
  | "lead"
  | "page"
  | "cardTitle"
  | "cardSubtitle"
  | "footerTitle"
  | "footerText"
  | "sectionTitle"
  | "subsectionTitle"
  | "body"
  | "status"
  | "muted"
  | "caption";

type TypographyProps = {
  children: ReactNode;
  className?: string;
  variant?: TypographyVariant;

  id?: string;
};

export function H1({ children, className, variant }: TypographyProps) {
  return (
    <h1
      className={cn(
        "text-text",
        variant === "hero"
          ? "text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
          : variant === "sectionTitle"
            ? "text-3xl font-display font-semibold tracking-tight"
            : variant === "page"
              ? "text-xl font-semibold tracking-tight"
              : "text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function H2({ children, className, variant }: TypographyProps) {
  return (
    <h2
      className={cn(
        "font-semibold text-text",
        variant === "footerTitle"
          ? "text-base"
          : variant === "sectionTitle"
            ? "text-2xl font-display tracking-tight"
            : "text-lg tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function H3({ children, className, variant, id }: TypographyProps) {
  return (
    <h3
      id={id}
      className={cn(
        "text-text",
        variant === "subsectionTitle"
          ? "text-base font-semibold tracking-tight"
          : "text-base font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function P({ children, className, variant }: TypographyProps) {
  return (
    <p
      className={cn(
        "text-text",
        variant === "lead"
          ? "text-base leading-relaxed text-text-muted"
          : variant === "cardSubtitle"
            ? "text-sm text-text-muted"
            : variant === "footerText"
              ? "text-sm text-text-muted"
              : variant === "body"
                ? "text-base"
                : variant === "muted"
                  ? "text-text-muted"
                  : variant === "caption"
                    ? "text-xs text-text-muted"
                    : "text-base",
        variant === "status"
          ? cn("text-[11px] font-medium tracking-[0.02em] text-text-muted", className)
          : className,
      )}
    >
      {children}
    </p>
  );
}

export function Small({ children, className }: TypographyProps) {
  return (
    <p className={cn("text-sm text-text-muted", className)}>
      {children}
    </p>
  );
}

export function Span({
  children,
  className,
  variant,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        {
          "text-[11px] font-medium tracking-[0.02em] text-text-muted":
            variant === "status",
          "text-sm text-text-muted":
            variant === "muted",
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Blockquote({ children, className }: TypographyProps) {
  return (
    <blockquote
      className={cn(
        "border-l-2 border-line-strong pl-4 text-text",
        className,
      )}
    >
      {children}
    </blockquote>
  );
}
