import { forwardRef } from "react";
import { cn } from "../utils";
import { Spinner } from "./Spinner";

/**
 * Button
 *
 * Variants: primary (inverted solid), secondary (sidebar fill, no border),
 * outline (transparent + border), ghost (hover overlay), danger (error text,
 * tinted hover; `solid` makes it a saturated destructive confirm),
 * text / link (accent text).
 *
 * Sizes: xs 24px, sm 28px, md 32px, lg 40px. `icon` is a 32px square;
 * `icon-xs|icon-sm|icon-lg` are squares matching xs/sm/lg.
 *
 * Deprecated (accepted and mapped, will be removed):
 *  - variant "accent"  -> "primary"
 *  - variant "success" -> "ghost" with success text
 *  - size "xl" | "2xl" -> "lg"
 *  - `palette` prop: "secondary" | "neutral" | "light" render the primary
 *    variant as "secondary"; "primary" | "accent" are ignored.
 */
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "outline"
    | "text"
    | "link"
    | "danger"
    /** @deprecated use "primary" */
    | "accent"
    /** @deprecated use "ghost" */
    | "success";
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "icon"
    | "icon-xs"
    | "icon-sm"
    | "icon-lg"
    /** @deprecated use "lg" */
    | "xl"
    /** @deprecated use "lg" */
    | "2xl";
  isLoading?: boolean;
  /** Saturated fill; only meaningful with variant="danger" (destructive confirm). */
  solid?: boolean;
  /** @deprecated ignored except "secondary" | "neutral" | "light" (see above). */
  palette?: "primary" | "secondary" | "accent" | "neutral" | "light";
  /** @deprecated no longer has any effect. */
  textAlign?: "center" | "bottom";
};

const sizeClasses: Record<string, string> = {
  xs: "h-6 px-2 text-xs gap-1.5",
  sm: "h-7 px-2.5 text-[13px] gap-1.5",
  md: "h-8 px-3 text-[13px] gap-1.5",
  lg: "h-10 px-4 text-sm gap-1.5",
  icon: "size-8 p-0 text-[13px]",
  "icon-xs": "size-6 p-0 text-xs",
  "icon-sm": "size-7 p-0 text-[13px]",
  "icon-lg": "size-10 p-0 text-sm",
};

const variantClasses = {
  primary: "bg-solid text-on-solid hover:bg-solid-hover border border-transparent",
  secondary: "bg-sidebar text-text border border-transparent hover:bg-selected",
  outline: "bg-transparent text-text border border-line-strong hover:bg-hover",
  ghost: "bg-transparent text-text border border-transparent hover:bg-hover",
  danger:
    "bg-transparent text-text-error border border-transparent hover:bg-error/10",
  dangerSolid:
    "bg-error text-white border border-transparent hover:bg-error-600",
  text: "bg-transparent text-link border border-transparent hover:underline underline-offset-2 px-1",
  success:
    "bg-transparent text-text-success border border-transparent hover:bg-success/10",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      palette,
      solid = false,
      isLoading = false,
      textAlign: _textAlign,
      children,
      type,
      disabled,
      ...props
    },
    ref,
  ) => {
    void _textAlign;
    let resolved: keyof typeof variantClasses;
    switch (variant) {
      case "accent":
        resolved = "primary";
        break;
      case "link":
        resolved = "text";
        break;
      case "danger":
        resolved = solid ? "dangerSolid" : "danger";
        break;
      default:
        resolved = variant;
    }
    if (
      resolved === "primary" &&
      (palette === "secondary" || palette === "neutral" || palette === "light")
    ) {
      resolved = "secondary";
    }

    const resolvedSize =
      size === "xl" || size === "2xl" ? "lg" : size;
    const isText = resolved === "text";
    const isIcon = resolvedSize.startsWith("icon");

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-medium",
          "transition-colors duration-100",
          "disabled:pointer-events-none disabled:opacity-50",
          isText ? "h-auto text-[13px]" : sizeClasses[resolvedSize],
          variantClasses[resolved],
          className,
        )}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Spinner size="xs" />}
        {isIcon && isLoading ? null : children}
      </button>
    );
  },
);
Button.displayName = "Button";
