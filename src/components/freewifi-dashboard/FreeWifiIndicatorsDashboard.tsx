import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import CoverageMapCard from "@/components/kpi/CoverageMapCard";
import TrendAreaChart from "@/components/kpi/TrendAreaChart";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import kpiData from "@/data/freewifiKpiData.json";
import { describePeriod, resolvePeriodValue, QUARTER_MONTHS } from "@/lib/kpiPeriod";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import type { HistoryPoint, KpiDatum, ResolvedKpi } from "@/types/indicator";

const kpis = kpiData as KpiDatum[];

// Every year present anywhere in the mock history — a real database swap-in
// would answer this with `SELECT DISTINCT year`, same downstream contract.
const years = Array.from(
  new Set(kpis.flatMap((k) => k.history.map((h) => String(h.year))))
).sort();

function filterHistory(history: HistoryPoint[], filters: PeriodFilters): HistoryPoint[] {
  const year = filters.year !== "All" ? Number(filters.year) : null;
  const quarterMonths = filters.quarter !== "All" ? QUARTER_MONTHS[filters.quarter] : null;
  return history.filter((h) => {
    if (year !== null && h.year !== year) return false;
    if (quarterMonths) return quarterMonths.includes(h.month);
    return true;
  });
}

export default function FreeWifiIndicatorsDashboard() {
  const [filters, setFilters] = useState<PeriodFilters>(DEFAULT_PERIOD_FILTERS);
  const scope = { year: filters.year, quarter: filters.quarter, month: "All" };

  const resolved = useMemo(() => {
    const out: Record<string, ResolvedKpi> = {};
    kpis.forEach((k) => {
      out[k.indicatorId] = {
        indicatorId: k.indicatorId,
        indicatorName: k.indicatorName,
        groupTag: k.groupTag,
        units: k.units,
        value: resolvePeriodValue(k.history, scope, k.aggregation),
        target: k.target,
        hasLiveData: k.hasLiveData,
      };
    });
    return out;
  }, [filters]);

  const trendPoints = useMemo(() => {
    const out: Record<string, HistoryPoint[]> = {};
    kpis
      .filter((k) => k.infographicStyle === "Line Graph / Area Chart")
      .forEach((k) => {
        out[k.indicatorId] = filterHistory(k.history, filters);
      });
    return out;
  }, [filters]);

  // Preferred Infographic Style, straight from the indicator catalog, decides
  // which visual component renders each KPI.
  const bigNumberRows = kpis.filter((k) => k.infographicStyle === "Big Number Callout");
  const mapRows = kpis.filter((k) => k.infographicStyle === "Map");
  const trendRows = kpis.filter((k) => k.infographicStyle === "Line Graph / Area Chart");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          Free Wi-Fi program KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      {bigNumberRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-4 gap-4 lg:grid-cols-2 sm:grid-cols-1"
        >
          {bigNumberRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem}>
              <KpiCallout datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {trendRows.map((k) => (
        <TrendAreaChart
          key={k.indicatorId}
          title={k.indicatorName}
          subtitle="Cumulative reach over time (placeholder values)"
          points={trendPoints[k.indicatorId] ?? []}
        />
      ))}

      {mapRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-4 lg:grid-cols-1"
        >
          {mapRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem}>
              <CoverageMapCard datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
