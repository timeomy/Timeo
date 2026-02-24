import { Skeleton } from "@timeo/ui/web";

export default function StoreLoading() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-40 bg-white/[0.06]" />
        <Skeleton className="h-4 w-72 bg-white/[0.04]" />
      </div>

      {/* Search Bar */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg bg-white/[0.06]" />

      {/* Service/Product Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]"
          >
            {/* Image placeholder */}
            <Skeleton className="h-48 w-full bg-white/[0.06]" />
            {/* Card content */}
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4 bg-white/[0.06]" />
              <Skeleton className="h-4 w-full bg-white/[0.04]" />
              <Skeleton className="h-4 w-2/3 bg-white/[0.04]" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-20 bg-white/[0.06]" />
                <Skeleton className="h-9 w-24 rounded-lg bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
