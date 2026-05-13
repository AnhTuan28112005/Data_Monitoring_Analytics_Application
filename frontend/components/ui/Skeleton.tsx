import { cls } from "@/lib/utils";

export function Skeleton({ className = "", ...props }: { className?: string; [key: string]: any }) {
  return (
    <div
      className={cls("animate-pulse bg-gradient-to-r from-bg-elev to-bg-panel", className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, ...props }: { lines?: number; [key: string]: any }) {
  return (
    <div className="space-y-2" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 rounded ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass p-4 space-y-4">
      <Skeleton className="h-6 w-32 rounded" />
      <div className="space-y-3">
        <Skeleton className="h-32 rounded" />
        <Skeleton className="h-12 rounded" />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 420 }: { height?: number }) {
  return <Skeleton className="w-full rounded" style={{ height }} />;
}
