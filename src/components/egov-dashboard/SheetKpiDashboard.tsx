import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import DonutProgressCard from "@/components/kpi/DonutProgressCard";
import CoverageMapCard from "@/components/kpi/CoverageMapCard";
import TrendAreaChart from "@/components/kpi/TrendAreaChart";
import CategoryPieChart, { type CategoryDatum } from "@/components/kpi/CategoryPieChart";
import RankedBarChart, { type RankedBarDatum } from "@/components/kpi/RankedBarChart";
import GroupedBarChart, { type GroupedBarDatum } from "@/components/kpi/GroupedBarChart";
import TargetsTable, { type TargetRow } from "@/components/kpi/TargetsTable";
import HighlightKpiCallout from "@/components/elgu-dashboard/HighlightKpiCallout";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import { fetchSheetRows } from "@/services/sheetKpi";
import type { SheetRow, SheetType } from "@/components/egov-dashboard/egovSheetTypes";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import { describePeriod, QUARTER_MONTHS } from "@/lib/kpiPeriod";
import type { ResolvedKpi, HistoryPoint } from "@/types/indicator";

// ── Pass 1 & 2 ─────────────────────────────────────────────────────────────────
// Pass 1 covers single-row tiles:
//   - Big Number Callout    → KpiCallout
//   - Highlight Callout     → HighlightKpiCallout (with date-aware label)
//   - Donut Progress        → DonutProgressCard (skipped if Target is missing)
//   - Map (Coverage)        → CoverageMapCard
//
// Pass 2 covers multi-row charts (each chart type aggregates rows by a key):
//   - Line Graph / Area Chart  → TrendAreaChart (grouped by Title, sorted by Date)
//   - Pie/Donut Chart          → CategoryPieChart (grouped by Title+Date, slices by Group)
//   - Ranked Bar Chart         → RankedBarChart (grouped by Title, bars by Group)
//   - Grouped Bar Chart        → GroupedBarChart (grouped by Date, series by Group)
//   - Target Table             → TargetsTable (one row per sheet row with Target)

const PASS_1_TILES: readonly SheetType[] = [
  "Big Number Callout",
  "Highlight Callout",
  "Donut Progress",
  "Map (Coverage)",
];

const PASS_2_CHART_TYPES: readonly SheetType[] = [
  "Line Graph / Area Chart",
  "Pie/Donut Chart",
  "Ranked Bar Chart",
  "Grouped Bar Chart",
  "Target Table",
];

type TileGroup = {
  /** Stable key for keyed renders */
  key: string;
  /** Title from sheet */
  title: string;
  /** Single Type string for the tile */
  type: SheetType;
  /** The ResolvedKpi that the tile consumes */
  datum: ResolvedKpi;
};

interface SheetKpiDashboardProps {
  /** Sheet tab gid (numeric ID from URL) — e.g. 1746879254. */
  gid: string | number;
  /** Section heading (eyebrow). */
  heading: string;
  /** One-line description shown under the heading. */
  description?: string;
  /** Poll interval in ms. Set to 0 or undefined to disable auto-refresh. */
  pollIntervalMs?: number;
}

/** Bucket sheet rows by (Title, Type). Row count or duplicate dates inside a
 *  bucket do not matter for single-row tiles — we just take the latest row. */
function buildTileGroups(rows: SheetRow[]): TileGroup[] {
  const buckets = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (!PASS_1_TILES.includes(r.type)) continue;
    const key = `${r.type}::${r.title}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(r);
    else buckets.set(key, [r]);
  }

  const groups: TileGroup[] = [];
  for (const [key, list] of buckets) {
    // Take the most recent dated row; if undated, take whatever came first.
    list.sort((a, b) => {
      const ad = a.date?.getTime() ?? 0;
      const bd = b.date?.getTime() ?? 0;
      return bd - ad;
    });
    const row = list[0];
    groups.push({
      key,
      title: row.title,
      type: row.type,
      datum: {
        indicatorId: key,
        indicatorName: row.title,
        groupTag: row.group ?? "",
        units: row.units,
        value: row.count,
        target: row.target ?? 0,
        hasLiveData: true, // sheet is live
      },
    });
  }
  return groups;
}

/** Filter rows by the selected Year / Quarter scope. Rows with no date are
 *  kept regardless of scope for tiles, but CHART rows with no date are dropped
 *  (charts need dates for time-series / breakdown). */
function rowsWithinPeriod(rows: SheetRow[], filters: PeriodFilters): SheetRow[] {
  const year = filters.year !== "All" ? Number(filters.year) : null;
  const quarterMonths = filters.quarter !== "All" ? QUARTER_MONTHS[filters.quarter] : null;
  return rows.filter((r) => {
    // Chart types always need a date
    const isChartType = PASS_2_CHART_TYPES.includes(r.type);
    if (!r.date) return !isChartType;
    if (year !== null && r.date.getFullYear() !== year) return false;
    if (quarterMonths) return quarterMonths.includes(r.date.getMonth() + 1);
    return true;
  });
}

function asOfLabel(row: SheetRow): string {
  if (!row.date) return "Latest";
  return row.date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Chart data builders (Pass 2) ──────────────────────────────────────────────

/** TrendAreaChart: group by Title, sort by Date ascending, produce HistoryPoint[]. */
function buildTrendSeries(rows: SheetRow[]): Map<string, HistoryPoint[]> {
  const byTitle = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (r.type !== "Line Graph / Area Chart") continue;
    if (!r.date) continue;
    const list = byTitle.get(r.title) ?? [];
    list.push(r);
    byTitle.set(r.title, list);
  }
  const out = new Map<string, HistoryPoint[]>();
  for (const [title, list] of byTitle) {
    list.sort((a, b) => (a.date!.getTime() - b.date!.getTime()));
    out.set(title, list.map((r) => ({ year: r.date!.getFullYear(), month: r.date!.getMonth() + 1, value: r.count })));
  }
  return out;
}

/** CategoryPieChart: group by Title+Date, slices by Group. */
function buildPieSeries(rows: SheetRow[]): Map<string, CategoryDatum[]> {
  const byTitleDate = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (r.type !== "Pie/Donut Chart") continue;
    if (!r.date || !r.group) continue;
    const key = `${r.title}::${r.date.toISOString().slice(0, 10)}`;
    const list = byTitleDate.get(key) ?? [];
    list.push(r);
    byTitleDate.set(key, list);
  }
  const out = new Map<string, CategoryDatum[]>();
  for (const [key, list] of byTitleDate) {
    out.set(key, list.map((r) => ({ label: r.group!, value: r.count })));
  }
  return out;
}

/** RankedBarChart: group by Title, bars by Group. */
function buildRankedSeries(rows: SheetRow[]): Map<string, RankedBarDatum[]> {
  const byTitle = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (r.type !== "Ranked Bar Chart") continue;
    if (!r.group) continue;
    const list = byTitle.get(r.title) ?? [];
    list.push(r);
    byTitle.set(r.title, list);
  }
  const out = new Map<string, RankedBarDatum[]>();
  for (const [title, list] of byTitle) {
    list.sort((a, b) => b.count - a.count);
    out.set(title, list.map((r) => ({ label: r.group!, value: r.count, units: r.units ?? undefined })));
  }
  return out;
}

/** GroupedBarChart: group by Date, series by Group, categories by Title (or single Title). */
function buildGroupedSeries(rows: SheetRow[]): Map<string, { seriesNames: string[]; data: GroupedBarDatum[] }> {
  const byDate = new Map<string, SheetRow[]>();
  for (const r of rows) {
    if (r.type !== "Grouped Bar Chart") continue;
    if (!r.date || !r.group) continue;
    const key = r.date.toISOString().slice(0, 10);
    const list = byDate.get(key) ?? [];
    list.push(r);
    byDate.set(key, list);
  }
  const out = new Map<string, { seriesNames: string[]; data: GroupedBarDatum[] }>();
  for (const [dateKey, list] of byDate) {
    // Collect unique groups as series
    const groups = Array.from(new Set(list.map((r) => r.group!))).sort();
    // Collect unique titles as categories
    const titles = Array.from(new Set(list.map((r) => r.title))).sort();
    const data: GroupedBarDatum[] = titles.map((title) => ({
      category: title,
      values: groups.map((g) => {
        const row = list.find((r) => r.title === title && r.group === g);
        return row?.count ?? 0;
      }),
    }));
    out.set(dateKey, { seriesNames: groups, data });
  }
  return out;
}

/** TargetsTable: one row per sheet row with a Target. */
function buildTargetRows(rows: SheetRow[]): TargetRow[] {
  return rows
    .filter((r) => r.type === "Target Table" && r.target != null)
    .map((r) => ({
      indicatorName: r.title,
      current: r.count,
      target: r.target!,
      units: r.units,
    }));
}

export default function SheetKpiDashboard({ gid, heading, description, pollIntervalMs = 0 }: SheetKpiDashboardProps) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<PeriodFilters>(DEFAULT_PERIOD_FILTERS);
  const [refreshing, setRefreshing] = useState(false);

  const doFetch = useCallback(async (bustCache = false) => {
    if (bustCache) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchSheetRows(gid, { bustCache });
      setRows(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gid]);

  // Initial load
  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Optional auto-poll
  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs < 5000) return;
    const id = setInterval(() => doFetch(true), pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, doFetch]);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => r.date?.getFullYear()).filter((y): y is number => !!y))).map(String).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => rowsWithinPeriod(rows, filters), [rows, filters]);
  const groups = useMemo(() => buildTileGroups(filteredRows), [filteredRows]);

  const bigNumbers = useMemo(() => groups.filter((g) => g.type === "Big Number Callout"), [groups]);
  const highlights = useMemo(() => groups.filter((g) => g.type === "Highlight Callout"), [groups]);
  const donuts = useMemo(() => groups.filter((g) => g.type === "Donut Progress" && (g.datum.target ?? 0) > 0), [groups]);
  const maps = useMemo(() => groups.filter((g) => g.type === "Map (Coverage)"), [groups]);

  // Pass 2 chart data
  const trendSeries = useMemo(() => buildTrendSeries(filteredRows), [filteredRows]);
  const pieSeries = useMemo(() => buildPieSeries(filteredRows), [filteredRows]);
  const rankedSeries = useMemo(() => buildRankedSeries(filteredRows), [filteredRows]);
  const groupedSeries = useMemo(() => buildGroupedSeries(filteredRows), [filteredRows]);
  const targetRows = useMemo(() => buildTargetRows(filteredRows), [filteredRows]);

  const periodLabel = describePeriod({ year: filters.year, quarter: filters.quarter, month: "All" });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{heading}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">
                {description} ·{" "}
                <span className="font-medium text-foreground">{periodLabel}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => doFetch(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title="Refresh data from sheet (bypasses cache)"
          >
            <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pulled from the published Google Sheet (drop new rows to add tiles).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading sheet…</p>
      ) : errorMessage ? (
        <p className="text-sm text-destructive">
          Couldn't load the sheet: {errorMessage}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The "{gid}" tab is empty. Add a row with the Title / Type / Count / Date
          columns to render the first tile.
        </p>
      ) : (
        <>
          <PeriodFilterBar filters={filters} onChange={setFilters} years={years.length ? years : ["All"]} />

          {highlights.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4 lg:grid-cols-2 sm:grid-cols-1"
            >
              {highlights.map((g) => {
                const row = filteredRows.find(
                  (r) => r.title === g.title && r.type === g.type
                );
                return (
                  <motion.div key={g.key} variants={fadeUpItem} className="h-full">
                    <HighlightKpiCallout
                      datum={g.datum}
                      label={row ? asOfLabel(row) : g.title}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {(bigNumbers.length > 0 || donuts.length > 0) && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-3 gap-4 lg:grid-cols-3 sm:grid-cols-1"
            >
              {[...bigNumbers, ...donuts].map((g) => (
                <motion.div key={g.key} variants={fadeUpItem} className="h-full">
                  {g.type === "Big Number Callout" && <KpiCallout datum={g.datum} />}
                  {g.type === "Donut Progress" && <DonutProgressCard datum={g.datum} />}
                </motion.div>
              ))}
            </motion.div>
          )}

          {maps.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {maps.map((g) => (
                <motion.div key={g.key} variants={fadeUpItem}>
                  <CoverageMapCard datum={g.datum} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pass 2: Chart sections */}
          {trendSeries.size > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {Array.from(trendSeries.entries()).map(([title, points]) => (
                <TrendAreaChart
                  key={title}
                  title={title}
                  subtitle={`Trend over time · ${periodLabel}`}
                  points={points}
                />
              ))}
            </motion.div>
          )}

          {pieSeries.size > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {Array.from(pieSeries.entries()).map(([key, data]) => {
                const [title, dateStr] = key.split("::");
                return (
                  <CategoryPieChart
                    key={key}
                    title={title}
                    subtitle={`Breakdown as of ${dateStr} · ${periodLabel}`}
                    data={data}
                    variant="donut"
                  />
                );
              })}
            </motion.div>
          )}

          {rankedSeries.size > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {Array.from(rankedSeries.entries()).map(([title, data]) => (
                <RankedBarChart
                  key={title}
                  title={title}
                  subtitle={`Ranked comparison · ${periodLabel}`}
                  data={data}
                />
              ))}
            </motion.div>
          )}

          {groupedSeries.size > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {Array.from(groupedSeries.entries()).map(([dateKey, { seriesNames, data }]) => (
                <GroupedBarChart
                  key={dateKey}
                  title={`Grouped Comparison — ${dateKey}`}
                  subtitle={`${periodLabel}`}
                  seriesNames={seriesNames}
                  data={data}
                />
              ))}
            </motion.div>
          )}

          {targetRows.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              <TargetsTable rows={targetRows} periodLabel={periodLabel} />
            </motion.div>
          )}
        </>
      )}
    </section>
  );
}