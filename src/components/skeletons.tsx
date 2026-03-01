export function LinesSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-3 animate-pulse rounded bg-slate-200"
          style={{ width: `${100 - index * 8}%` }}
        />
      ))}
    </div>
  );
}

export function GridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="h-30 animate-pulse rounded-2xl border border-slate-200 bg-white/80"
        />
      ))}
    </div>
  );
}
