/**
 * Analytics helper functions for date calculations and data aggregation.
 */

export type AnalyticsPeriod = "day" | "week" | "month" | "year";

interface PeriodRange {
  start: number; // unix ms
  end: number; // unix ms
}

/** Get the start and end timestamps for the current period. */
export function getPeriodRange(period: AnalyticsPeriod): PeriodRange {
  const now = new Date();
  let start: Date;

  switch (period) {
    case "day":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const day = now.getDay(); // 0=Sun
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      break;
    }
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { start: start.getTime(), end: now.getTime() };
}

/** Get the previous period range for comparison (e.g. last week vs this week). */
export function getPreviousPeriodRange(period: AnalyticsPeriod): PeriodRange {
  const current = getPeriodRange(period);
  const duration = current.end - current.start;

  // For proper comparison, use the same duration ending at current.start
  return {
    start: current.start - duration,
    end: current.start,
  };
}

/** Group items by calendar date (YYYY-MM-DD) and return daily sums. */
export function groupByDay<T>(
  items: T[],
  dateField: (item: T) => number,
  valueField?: (item: T) => number
): Array<{ date: string; count: number; total: number }> {
  const map = new Map<string, { count: number; total: number }>();

  for (const item of items) {
    const d = new Date(dateField(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = map.get(key) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += valueField ? valueField(item) : 0;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}

/** Group items by hour of day (0-23) and return counts. */
export function groupByHour<T>(
  items: T[],
  dateField: (item: T) => number
): Array<{ hour: number; count: number }> {
  const counts = new Array(24).fill(0) as number[];
  for (const item of items) {
    const hour = new Date(dateField(item)).getHours();
    counts[hour]++;
  }
  return counts.map((count, hour) => ({ hour, count }));
}

/** Calculate percentage change between current and previous values. */
export function calculatePercentChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Fill missing days in a date range with zero values. */
export function fillDailyGaps(
  data: Array<{ date: string; count: number; total: number }>,
  start: number,
  end: number
): Array<{ date: string; count: number; total: number }> {
  const dataMap = new Map(data.map((d) => [d.date, d]));
  const result: Array<{ date: string; count: number; total: number }> = [];

  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    result.push(dataMap.get(key) ?? { date: key, count: 0, total: 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
