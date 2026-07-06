import type { HistoryPoint } from "@/types/indicator";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const QUARTER_MONTHS: Record<string, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
};

export type Aggregation = "sum" | "average" | "latest";

export interface PeriodScope {
  year: string; // "All" or e.g. "2026"
  quarter: string; // "All" | "Q1".."Q4"
  month: string; // "All" | "1".."12"
}

/**
 * Collapses a KPI's dated history down to whatever Year/Quarter/Month scope is
 * selected. `aggregation` picks how multiple matching months combine:
 *  - "sum": flow metrics (transactions, activities conducted this period)
 *  - "average": rates/percentages, which don't sum meaningfully
 *  - "latest": running totals/stocks (registered users to date) — take the
 *    most recent matching point rather than combining them
 */
export function resolvePeriodValue(
  history: HistoryPoint[],
  scope: PeriodScope,
  aggregation: Aggregation = "sum"
): number {
  const year = scope.year !== "All" ? Number(scope.year) : null;
  const month = scope.month !== "All" ? Number(scope.month) : null;
  const quarterMonths = scope.quarter !== "All" ? QUARTER_MONTHS[scope.quarter] : null;

  const matching = history.filter((h) => {
    if (year !== null && h.year !== year) return false;
    if (month !== null) return h.month === month;
    if (quarterMonths) return quarterMonths.includes(h.month);
    return true;
  });

  if (matching.length === 0) return 0;

  if (aggregation === "latest") {
    return matching[matching.length - 1].value;
  }
  const total = matching.reduce((sum, h) => sum + h.value, 0);
  return aggregation === "average" ? Math.round((total / matching.length) * 10) / 10 : total;
}

export function describePeriod(scope: PeriodScope): string {
  if (scope.year === "All") return "All-time totals";
  if (scope.month !== "All") return `${MONTHS[Number(scope.month) - 1]} ${scope.year}`;
  if (scope.quarter !== "All") return `${scope.quarter} ${scope.year}`;
  return `Full year ${scope.year}`;
}
