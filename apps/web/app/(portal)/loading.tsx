import { Skeleton } from "@timeo/ui/web";

export default function PortalLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-white/[0.06]" />
        <Skeleton className="h-4 w-44 bg-white/[0.04]" />
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-6 w-12 bg-white/[0.06]" />
              <Skeleton className="h-3 w-20 bg-white/[0.04]" />
            </div>
            <Skeleton className="h-4 w-4 bg-white/[0.04]" />
          </div>
        ))}
      </div>

      {/* Upcoming Bookings Card */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <Skeleton className="h-5 w-40 bg-white/[0.06]" />
        </div>
        <div className="p-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40 bg-white/[0.06]" />
                <Skeleton className="h-3 w-28 bg-white/[0.04]" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
