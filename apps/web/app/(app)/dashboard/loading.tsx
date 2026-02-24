import { Skeleton } from "@timeo/ui/web";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <Skeleton className="h-4 w-64 bg-white/[0.04]" />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 bg-white/[0.06]" />
                <Skeleton className="h-8 w-16 bg-white/[0.06]" />
                <Skeleton className="h-3 w-24 bg-white/[0.04]" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
        {/* Table header */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <Skeleton className="h-5 w-32 bg-white/[0.06]" />
        </div>
        {/* Table rows */}
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24 bg-white/[0.06]" />
              <Skeleton className="h-4 w-32 bg-white/[0.06]" />
              <Skeleton className="h-4 w-28 bg-white/[0.06]" />
              <Skeleton className="h-4 w-20 bg-white/[0.06]" />
              <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
              <Skeleton className="ml-auto h-7 w-20 bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <Skeleton className="h-10 w-10 rounded-lg bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 bg-white/[0.06]" />
              <Skeleton className="h-3 w-36 bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
