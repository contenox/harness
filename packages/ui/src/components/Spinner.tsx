import { cn } from "../utils";

type SpinnerProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin text-current",
        {
          "size-3.5": size === "xs",
          "size-4": size === "sm",
          "size-5": size === "md",
          "size-6": size === "lg",
        },
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
