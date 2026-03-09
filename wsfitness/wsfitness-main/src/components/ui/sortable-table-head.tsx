import * as React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  children: React.ReactNode;
}

export function SortableTableHead({
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  children,
  className,
  ...props
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}

// Helper hook for sorting logic
export function useSortableTable<T>(
  data: T[],
  defaultSortKey: string | null = null,
  defaultDirection: SortDirection = null
) {
  const [sortKey, setSortKey] = React.useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(defaultDirection);

  const handleSort = React.useCallback((key: string) => {
    if (sortKey === key) {
      // Toggle: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey, sortDirection]);

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      // Support nested keys like "profiles.name"
      const getValue = (obj: any, path: string): any => {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
      };

      const aVal = getValue(a, sortKey);
      const bVal = getValue(b, sortKey);

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      // String comparison (case-insensitive)
      if (typeof aVal === "string" && typeof bVal === "string") {
        const cmp = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === "asc" ? cmp : -cmp;
      }

      // Number/Date comparison
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  return {
    sortKey,
    sortDirection,
    handleSort,
    sortedData,
  };
}
