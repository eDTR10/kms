import { Search, FilterX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MONTHS } from "@/lib/kpiPeriod";
import type { IndicatorFilters } from "@/types/indicator";

interface IndicatorFilterBarProps {
  filters: IndicatorFilters;
  onChange: (filters: IndicatorFilters) => void;
  years: string[];
  resultCount: number;
}

const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const DEFAULT_FILTERS: IndicatorFilters = {
  search: "",
  status: "All",
  monitoringSource: "All",
  dimension: "All",
  year: "All",
  quarter: "All",
  month: "All",
};

export default function IndicatorFilterBar({
  filters,
  onChange,
  years,
  resultCount,
}: IndicatorFilterBarProps) {
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search indicators..."
          className="pl-9"
        />
      </div>

      {/* Date scope — Year always applies; Quarter and Month are mutually exclusive,
          picking one clears the other so the scope never conflicts. */}
      <div className="flex items-center gap-2 pl-2 border-l border-border">
        <select
          className={selectClass}
          value={filters.month}
          onChange={(e) => onChange({ ...filters, month: e.target.value, quarter: "All" })}
          aria-label="Filter by month"
        >
          <option value="All">All months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
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
          onChange={(e) => onChange({ ...filters, quarter: e.target.value, month: "All" })}
          aria-label="Filter by quarter"
        >
          <option value="All">All quarters</option>
          {QUARTERS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        disabled={!isFiltered}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <FilterX size={15} />
        Clear filters
      </button>

      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
        {resultCount} indicator{resultCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
