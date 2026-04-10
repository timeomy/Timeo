import { Skeleton } from "@timeo/ui/web";

export default function GymPaymentsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/70 bg-card/70 p-4"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-8 w-12" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/70 bg-card/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 w-full sm:flex-1" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
        <div className="grid grid-cols-6 gap-2 border-b border-border/70 px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid min-h-12 grid-cols-6 items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
