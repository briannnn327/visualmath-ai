import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/** Logo VisualMath AI — aman dipakai dari Server & Client Component. */
export function Logo({
  size = 40,
  className,
  compact = false,
}: {
  size?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="grid shrink-0 place-items-center rounded-2xl bg-brand-gradient text-on-primary shadow-soft"
        style={{ width: size, height: size }}
      >
        <Icon name="functions" size={size * 0.55} />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-extrabold tracking-tight text-on-surface">
            VisualMath
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Kalkulus AI
          </span>
        </span>
      )}
    </div>
  );
}