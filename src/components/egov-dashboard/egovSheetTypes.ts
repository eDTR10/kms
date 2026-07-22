/**
 * eGov Sheet Dashboard — type definitions and controlled-vocabulary constants.
 *
 * Column contract for the backing Google Sheet:
 *   A – Title       (string)  – tile/chart display name
 *   B – Type        (string)  – dropdown: use SHEET_TYPE_OPTIONS below
 *   C – Count       (number)  – the metric value
 *   D – Date        (string)  – yyyy-MM-dd observation date
 *   E – Units       (string)  – "Number", "%", or free text; nullable
 *   F – Target      (number)  – goal value for progress/table tiles; nullable
 *   G – Group       (string)  – breakdown category for chart slices; nullable
 */

/** GViz JSON response shape (trimmed to what we consume). */
export interface GVizResponse {
  table: {
    cols: Array<{ id: string; label: string; type: string }>;
    rows: Array<{ c: Array<{ v: unknown; f?: string } | null> }>;
  };
}

/** Normalized sheet row after parsing + validation. */
export interface SheetRow {
  title: string;
  type: SheetType;
  count: number; // NaN rows are dropped at the service layer
  date: Date | null;
  units: string | null;
  target: number | null; // NaN rows become null
  group: string | null;
}

/** Valid Type dropdown values — mirrors `infographicStyle` strings used
 *  throughout the codebase's KPI data files. */
export type SheetType =
  | "Big Number Callout"
  | "Highlight Callout"
  | "Donut Progress"
  | "Map (Coverage)"
  | "Line Graph / Area Chart"
  | "Pie/Donut Chart"
  | "Ranked Bar Chart"
  | "Grouped Bar Chart"
  | "Target Table";

/** Array of all valid Type options, keyed by category.
 *  Use this as the source of truth for the sheet's Data Validation dropdown.
 *
 *  Copy the `value` strings below into Google Sheets → Data → Data validation
 *  → "Items from a list" for the Type column.
 *
 *  — Pass 1 (built now): Big Number Callout, Highlight Callout, Donut Progress, Map (Coverage)
 *  — Pass 2 (future):    Line Graph / Area Chart, Pie/Donut Chart,
 *                         Ranked Bar Chart, Grouped Bar Chart, Target Table
 */
export const SHEET_TYPE_OPTIONS: Record<SheetType, { category: string; note: string }> = {
  // ── Pass 1 — single-row tiles ──────────────────────────────────────────────
  "Big Number Callout": {
    category: "Single-row tile",
    note: "Animated big-number card (KpiCallout). Needs: Title, Count.",
  },
  "Highlight Callout": {
    category: "Single-row tile",
    note: "Spotlight card with star icon + optional confetti/live badge (HighlightKpiCallout). Needs: Title, Count, Date.",
  },
  "Donut Progress": {
    category: "Single-row tile",
    note: "Progress ring showing value vs. target (DonutProgressCard). Needs: Title, Count, Target.",
  },
  "Map (Coverage)": {
    category: "Single-row tile",
    note: "Headline number with region breakdown table (CoverageMapCard). Needs: Title, Count, Date.",
  },
  // ── Pass 2 — time-series / breakdown charts ────────────────────────────────
  "Line Graph / Area Chart": {
    category: "Chart — time series",
    note: "Area chart from rows sharing the same Title, sorted by Date. Needs: Title, Count, Date; 2+ rows per Title.",
  },
  "Pie/Donut Chart": {
    category: "Chart — breakdown",
    note: "Pie/donut from rows sharing the same Title + Date; slices by Group. Needs: Title, Count, Date, Group.",
  },
  "Ranked Bar Chart": {
    category: "Chart — ranked",
    note: "Horizontal ranked bars; rows sharing the same Title are ranked by Count. Needs: Title, Count, Group.",
  },
  "Grouped Bar Chart": {
    category: "Chart — grouped",
    note: "Grouped columns; rows sharing the same Date are grouped by Group. Needs: Title, Count, Date, Group.",
  },
  "Target Table": {
    category: "Table",
    note: "One row per sheet row; shows current vs. target with progress bar. Needs: Title, Count, Target.",
  },
};

/** All Type values as a flat list — use this for sheet data-validation "Items from a list". */
export const SHEET_TYPE_DROPDOWN_LIST = Object.keys(SHEET_TYPE_OPTIONS).join(", ");

/** All Type values as an array — use this to validate/normalise incoming sheet strings. */
export const VALID_SHEET_TYPES = Object.keys(SHEET_TYPE_OPTIONS) as SheetType[];