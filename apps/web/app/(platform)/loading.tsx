import { Skeleton } from "@timeo/ui/web";

export default function PlatformLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 bg-white/[0.06]" />
        <Skeleton className="h-4 w-60 bg-white/[0.04]" />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-white/[0.06]" />
                <Skeleton className="h-8 w-16 bg-white/[0.06]" />
                <Skeleton className="h-3 w-28 bg-white/[0.04]" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>

      {/* Tenants Table Card */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <Skeleton className="h-5 w-28 bg-white/[0.06]" />
          <Skeleton className="h-8 w-24 rounded-lg bg-white/[0.06]" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-md bg-white/[0.06]" />
              <Skeleton className="h-4 w-32 bg-white/[0.06]" />
              <Skeleton className="h-4 w-24 bg-white/[0.06]" />
              <Skeleton className="h-5 w-14 rounded-full bg-white/[0.06]" />
              <Skeleton className="h-4 w-20 bg-white/[0.06]" />
              <Skeleton className="ml-auto h-7 w-16 bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
