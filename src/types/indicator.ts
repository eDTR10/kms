export type IndicatorStatus = "Active" | "Inactive" | "Archived";

export interface IndicatorCatalogEntry {
  id: string;
  project: string | null;
  indicatorSource: string[];
  indicatorName: string;
  dimensions: string[];
  measure: string | null;
  units: string | null;
  monitoringSource: string | null;
  status: IndicatorStatus | string;
  showInPortal: boolean;
  infographicStyle: string | null;
  linkToDatabase: string | null;
}

/** One dated observation. Mirrors the shape a real date-partitioned database query would return. */
export interface HistoryPoint {
  year: number;
  month: number; // 1-12
  value: number;
}

export interface KpiDatum {
  indicatorId: string;
  indicatorName: string;
  /** Sub-program grouping, for project pages that bundle more than one program (e.g. "PNPKI" vs "Cybersecurity"). */
  program?: string;
  groupTag: string;
  monitoringSource: string | null;
  units: string | null;
  infographicStyle: string | null;
  history: HistoryPoint[];
  /** How multiple months combine when a Quarter/Year scope spans more than one. Defaults to "sum". */
  aggregation?: "sum" | "average" | "latest";
  target: number;
  hasLiveData: boolean;
  dataSourceUrl: string | null;
}

/** A KpiDatum's history collapsed to the currently selected Year/Quarter/Month scope. */
export interface ResolvedKpi {
  indicatorId: string;
  indicatorName: string;
  groupTag: string;
  units: string | null;
  value: number;
  target: number;
  hasLiveData: boolean;
}

export interface IndicatorFilters {
  search: string;
  status: string;
  monitoringSource: string;
  dimension: string;
  year: string; // "All" or e.g. "2026"
  quarter: string; // "All" | "Q1" | "Q2" | "Q3" | "Q4"
  month: string; // "All" | "1".."12"
}
