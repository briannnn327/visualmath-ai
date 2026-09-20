import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  color?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "error" | "info";
  className?: string;
  showLabel?: boolean;
}

const colors = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  tertiary: "bg-tertiary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
};

export function Progress({ value, max = 100, color = "primary", className, showLabel }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular text-on-surface-variant">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}