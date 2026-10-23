import { cn } from "../utils";
import React from "react";
import { Section } from "./Section";

type GridLayoutVariant = "surface" | "bordered" | "body" | "empty";

interface GridLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  minWidth?: string;
  columns?: number;
  responsive?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  variant?: GridLayoutVariant;
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
    const breakpoints: Record<string, string[]> = {
      base: ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5", "grid-cols-6", "grid-cols-7", "grid-cols-8", "grid-cols-9", "grid-cols-10", "grid-cols-11", "grid-cols-12"],
      sm: ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5", "sm:grid-cols-6", "sm:grid-cols-7", "sm:grid-cols-8", "sm:grid-cols-9", "sm:grid-cols-10", "sm:grid-cols-11", "sm:grid-cols-12"],
      md: ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5", "md:grid-cols-6", "md:grid-cols-7", "md:grid-cols-8", "md:grid-cols-9", "md:grid-cols-10", "md:grid-cols-11", "md:grid-cols-12"],
      lg: ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6", "lg:grid-cols-7", "lg:grid-cols-8", "lg:grid-cols-9", "lg:grid-cols-10", "lg:grid-cols-11", "lg:grid-cols-12"],
      xl: ["", "xl:grid-cols-1", "xl:grid-cols-2", "xl:grid-cols-3", "xl:grid-cols-4", "xl:grid-cols-5", "xl:grid-cols-6", "xl:grid-cols-7", "xl:grid-cols-8", "xl:grid-cols-9", "xl:grid-cols-10", "xl:grid-cols-11", "xl:grid-cols-12"],
    };

    const entries = Object.entries({
      base: responsive.base ?? 1,
      ...("sm" in responsive ? { sm: responsive.sm } : {}),
      ...("md" in responsive ? { md: responsive.md } : {}),
      ...("lg" in responsive ? { lg: responsive.lg } : {}),
      ...("xl" in responsive ? { xl: responsive.xl } : {}),
    });

    responsiveClasses = entries
      .map(([bp, value]) => breakpoints[bp][value ?? 1] ?? "")
      .join(" ");
  } else {
    inlineStyle = {
      gridTemplateColumns: columns
        ? `repeat(${columns}, 1fr)`
        : `repeat(auto-fit, ${minWidth})`,
    };
  }

  return (
    <Section
      title={title}
      description={description}
      variant={variant}
      {...props}
    >
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
    </Section>
  );
}
