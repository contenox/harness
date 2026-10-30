import { cn } from "../utils";
import { Panel } from "./Panel";
import { H2, P } from "./Typography";

type SectionVariant = "surface" | "bordered" | "body" | "empty";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  className?: string;
  children: React.ReactNode;
  description?: string;
  variant?: SectionVariant;
}

export function Section({
  title,
  description,
  className,
  children,
  variant = "bordered",
  ...props
}: SectionProps) {
  return (
    <Panel variant={variant} className={cn(className)} {...props}>
      {(title || description) && (
        <div className="mb-3 space-y-0.5">
          {title && <H2 className="text-base">{title}</H2>}
          {description && <P variant="muted" className="text-[13px]">{description}</P>}
        </div>
      )}
      <section>{children}</section>
    </Panel>
  );
}
