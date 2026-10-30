import { cn } from "../utils";
import React from "react";
import { Section } from "./Section";

type GridLayoutVariant = "surface" | "bordered" | "body" | "empty";

interface GridLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  minWidth?: string;
  /**
   * Fixed column count. Collapses with the width of the grid's own container:
   * 1 column when narrow, at most 2 from a medium container, `columns` when wide.
   */
  columns?: number;
  /**
   * Column counts per container-width step (CSS container queries, not the
   * viewport): sm >= 36rem, md >= 48rem, lg >= 56rem, xl >= 64rem of the
   * container's own width.
   */
  responsive?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  variant?: GridLayoutVariant;
}

/*
 * Class names are spelled out in full so Tailwind can see them. The `@xl:`
 * style variants are container queries against the wrapper below.
 */
const BREAKPOINT_COLUMNS: Record<"base" | "sm" | "md" | "lg" | "xl", string[]> = {
  base: ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6", "grid-cols-7", "grid-cols-8", "grid-cols-9", "grid-cols-10", "grid-cols-11", "grid-cols-12"],
  sm: ["", "@xl:grid-cols-1", "@xl:grid-cols-2", "@xl:grid-cols-3", "@xl:grid-cols-4", "@xl:grid-cols-5", "@xl:grid-cols-6", "@xl:grid-cols-7", "@xl:grid-cols-8", "@xl:grid-cols-9", "@xl:grid-cols-10", "@xl:grid-cols-11", "@xl:grid-cols-12"],
  md: ["", "@3xl:grid-cols-1", "@3xl:grid-cols-2", "@3xl:grid-cols-3", "@3xl:grid-cols-4", "@3xl:grid-cols-5", "@3xl:grid-cols-6", "@3xl:grid-cols-7", "@3xl:grid-cols-8", "@3xl:grid-cols-9", "@3xl:grid-cols-10", "@3xl:grid-cols-11", "@3xl:grid-cols-12"],
  lg: ["", "@4xl:grid-cols-1", "@4xl:grid-cols-2", "@4xl:grid-cols-3", "@4xl:grid-cols-4", "@4xl:grid-cols-5", "@4xl:grid-cols-6", "@4xl:grid-cols-7", "@4xl:grid-cols-8", "@4xl:grid-cols-9", "@4xl:grid-cols-10", "@4xl:grid-cols-11", "@4xl:grid-cols-12"],
  xl: ["", "@5xl:grid-cols-1", "@5xl:grid-cols-2", "@5xl:grid-cols-3", "@5xl:grid-cols-4", "@5xl:grid-cols-5", "@5xl:grid-cols-6", "@5xl:grid-cols-7", "@5xl:grid-cols-8", "@5xl:grid-cols-9", "@5xl:grid-cols-10", "@5xl:grid-cols-11", "@5xl:grid-cols-12"],
};

/** Collapse steps for the fixed `columns` prop. */
const FIXED_NARROW = BREAKPOINT_COLUMNS.base;
const FIXED_MEDIUM = BREAKPOINT_COLUMNS.sm;
const FIXED_WIDE = BREAKPOINT_COLUMNS.md;

function clampColumns(n: number): number {
  return Math.min(12, Math.max(1, Math.floor(n)));
}

export function GridLayout({
  title,
  description,
  minWidth = "minmax(min(400px, 100%), 1fr)",
  columns = 0,
  responsive,
  variant = "bordered",
  className,
  children,
  ...props
}: GridLayoutProps) {
  let inlineStyle: React.CSSProperties | undefined = undefined;
  let responsiveClasses = "";

  if (responsive) {
    const entries = Object.entries({
      base: responsive.base ?? 1,
      ...("sm" in responsive ? { sm: responsive.sm } : {}),
      ...("md" in responsive ? { md: responsive.md } : {}),
      ...("lg" in responsive ? { lg: responsive.lg } : {}),
      ...("xl" in responsive ? { xl: responsive.xl } : {}),
    }) as [keyof typeof BREAKPOINT_COLUMNS, number | undefined][];

    responsiveClasses = entries
      .map(([bp, value]) => BREAKPOINT_COLUMNS[bp][clampColumns(value ?? 1)] ?? "")
      .join(" ");
  } else if (columns) {
    const n = clampColumns(columns);
    responsiveClasses = [
      FIXED_NARROW[1],
      FIXED_MEDIUM[Math.min(n, 2)],
      FIXED_WIDE[n],
    ].join(" ");
  } else {
    inlineStyle = {
      gridTemplateColumns: `repeat(auto-fit, ${minWidth})`,
    };
  }

  return (
    <Section
      title={title}
      description={description}
      variant={variant}
      {...props}
    >
      <div className="@container min-w-0">
        <div
          className={cn(
            "grid gap-4 min-w-0 overflow-x-hidden",
            "[&>*]:min-w-0",
            responsiveClasses,
            className,
          )}
          style={inlineStyle}
        >
          {children}
        </div>
      </div>
    </Section>
  );
}
