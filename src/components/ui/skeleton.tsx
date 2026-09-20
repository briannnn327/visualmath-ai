import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div role="status" aria-label="memuat" className={cn("rounded-xl bg-shimmer", className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container/60 p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
