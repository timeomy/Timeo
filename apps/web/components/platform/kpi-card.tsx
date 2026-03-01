import { Card, CardContent, Skeleton, cn } from "@timeo/ui/web";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  index?: number;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  loading,
  index = 0,
}: KpiCardProps) {
  const hasDelta = delta !== undefined;
  const isPositive = (delta ?? 0) >= 0;

  return (
    <Card
      className="glass-card"
      style={
        index > 0
          ? { animationDelay: `${index * 60}ms` }
          : undefined
      }
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-8 w-24" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-glow">{value}</p>
            )}
            {hasDelta && !loading && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  isPositive ? "text-emerald-400" : "text-red-400",
                )}
              >
                {isPositive ? "+" : ""}
                {delta}
                {deltaLabel ? ` ${deltaLabel}` : ""}
              </p>
            )}
          </div>
          <div className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
