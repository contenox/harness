import { cn } from "../utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("text-[13px] font-medium text-text", className)}
      {...props}
    />
  );
}
