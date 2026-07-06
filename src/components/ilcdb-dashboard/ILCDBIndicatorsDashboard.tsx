import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import CoverageMapCard from "@/components/kpi/CoverageMapCard";
import RankedBarChart from "@/components/kpi/RankedBarChart";
import DonutProgressCard from "@/components/kpi/DonutProgressCard";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import kpiData from "@/data/ilcdbKpiData.json";
import { describePeriod, resolvePeriodValue } from "@/lib/kpiPeriod";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import type { KpiDatum, ResolvedKpi } from "@/types/indicator";

const kpis = kpiData as KpiDatum[];

// Every year present anywhere in the mock history — a real database swap-in
// would answer this with `SELECT DISTINCT year`, same downstream contract.
const years = Array.from(
  new Set(kpis.flatMap((k) => k.history.map((h) => String(h.year))))
).sort();

export default function ILCDBIndicatorsDashboard() {
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

  // Preferred Infographic Style, straight from the indicator catalog, decides
  // which visual component renders each KPI.
  const bigNumberRows = kpis.filter((k) => k.infographicStyle === "Big Number Callout");
  const mapRows = kpis.filter((k) => k.infographicStyle === "Map");
  const rankedRows = kpis.filter((k) => k.infographicStyle === "Ranked Bar Chart");
  const donutRows = kpis.filter((k) => k.infographicStyle === "Pie/Donut Chart");

  const rankedData = rankedRows.map((k) => ({
    label: k.indicatorName,
    value: resolved[k.indicatorId]?.value ?? 0,
    units: k.units,
  }));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          ILCDB program KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      {(rankedData.length > 0 || donutRows.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          {rankedData.length > 0 && (
            <RankedBarChart
              title="Trainings & engagement, ranked"
              subtitle="ILCDB program activities compared by volume"
              data={rankedData}
            />
          )}
          {donutRows.map((k) => (
            <DonutProgressCard key={k.indicatorId} datum={resolved[k.indicatorId]} />
          ))}
        </div>
      )}

      {bigNumberRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {bigNumberRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <KpiCallout datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {mapRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {mapRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <CoverageMapCard datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
