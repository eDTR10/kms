import { FilterX } from "lucide-react";

export interface PeriodFilters {
  year: string; // "All" or e.g. "2026"
  quarter: string; // "All" | "Q1".."Q4"
}

export const DEFAULT_PERIOD_FILTERS: PeriodFilters = { year: "All", quarter: "All" };

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

interface PeriodFilterBarProps {
  filters: PeriodFilters;
  onChange: (filters: PeriodFilters) => void;
  years: string[];
}

/** Year + Quarter + Clear — the shared date-scope control for every project dashboard. */
export default function PeriodFilterBar({ filters, onChange, years }: PeriodFilterBarProps) {
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_PERIOD_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select
        className={selectClass}
        value={filters.year}
        onChange={(e) => onChange({ ...filters, year: e.target.value })}
        aria-label="Filter by year"
      >
        <option value="All">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.quarter}
        onChange={(e) => onChange({ ...filters, quarter: e.target.value })}
        aria-label="Filter by quarter"
      >
        <option value="All">All quarters</option>
        {QUARTERS.map((q) => (
          <option key={q} value={q}>
            {q}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_PERIOD_FILTERS)}
        disabled={!isFiltered}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <FilterX size={15} />
        Clear filters
      </button>
    </div>
  );
}
