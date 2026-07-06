import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import CategoryPieChart from "@/components/kpi/CategoryPieChart";
import GroupedBarChart from "@/components/kpi/GroupedBarChart";
import TargetsTable from "@/components/kpi/TargetsTable";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import kpiData from "@/data/iidbKpiData.json";
import bapdDsdapBreakdown from "@/data/iidbBapdDsdapBreakdown.json";
import ecosystemDevelopmentBreakdown from "@/data/iidbEcosystemDevelopmentBreakdown.json";
import ouiidActivitiesBreakdown from "@/data/iidbOuiidActivitiesBreakdown.json";
import digitalEcosystemBreakdown from "@/data/iidbDigitalEcosystemBreakdown.json";
import ictCouncilsBreakdown from "@/data/iidbIctCouncilsBreakdown.json";
import { describePeriod, resolvePeriodValue } from "@/lib/kpiPeriod";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import type { KpiDatum, ResolvedKpi } from "@/types/indicator";

const kpis = kpiData as KpiDatum[];
const kpiByName = new Map(kpis.map((k) => [k.indicatorName, k]));

// Every year present anywhere in the mock history — a real database swap-in
// would answer this with `SELECT DISTINCT year`, same downstream contract.
const years = Array.from(
  new Set(kpis.flatMap((k) => k.history.map((h) => String(h.year))))
).sort();

interface WeightEntry {
  label: string;
  weight: number;
}

function splitByWeights(total: number, weights: WeightEntry[]) {
  return weights.map((w) => ({ label: w.label, value: Math.round(total * w.weight) }));
}

export default function IIDBIndicatorsDashboard() {
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

  const kpiRows = kpis.filter((k) => k.infographicStyle === "Big Number Callout");
  const targetRows = kpis.filter((k) => k.infographicStyle === "Target Table");
  const donutRows = kpis.filter((k) => k.infographicStyle === "Pie/Donut Chart");

  const targetTableRows = targetRows.map((k) => ({
    indicatorName: k.indicatorName,
    current: resolved[k.indicatorId]?.value ?? 0,
    target: k.target,
    units: k.units,
  }));

  const donutBreakdowns: Record<string, WeightEntry[]> = {
    "BAPD-DSDAP": bapdDsdapBreakdown,
    "Ecosystem Development": ecosystemDevelopmentBreakdown,
    "OUIID Activities": ouiidActivitiesBreakdown,
    "Digital Ecosystem": digitalEcosystemBreakdown,
  };

  const activeTotal = ictCouncilsBreakdown.categories.reduce((sum, c) => sum + c.activeWeight, 0) || 1;
  const highlyActiveTotal =
    ictCouncilsBreakdown.categories.reduce((sum, c) => sum + c.highlyActiveWeight, 0) || 1;
  const resolvedActive = resolved[kpiByName.get("Number of Active ICT Councils")?.indicatorId ?? ""]?.value ?? 0;
  const resolvedHighlyActive =
    resolved[kpiByName.get("Number of Highly Active ICT Councils")?.indicatorId ?? ""]?.value ?? 0;

  const ictCouncilsData = ictCouncilsBreakdown.categories.map((c) => ({
    category: c.category,
    values: [
      Math.round(resolvedActive * (c.activeWeight / activeTotal)),
      Math.round(resolvedHighlyActive * (c.highlyActiveWeight / highlyActiveTotal)),
    ],
  }));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          IIDB program KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      {kpiRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {kpiRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <KpiCallout datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {targetTableRows.length > 0 && (
        <TargetsTable rows={targetTableRows} periodLabel={describePeriod(scope)} />
      )}

      {donutRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {donutRows.map((k) => {
            const breakdown = donutBreakdowns[k.indicatorName];
            const resolvedValue = resolved[k.indicatorId]?.value ?? 0;
            const data = breakdown ? splitByWeights(resolvedValue, breakdown) : [];
            return (
              <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
                <CategoryPieChart
                  title={k.indicatorName}
                  subtitle="By province (placeholder split)"
                  data={data}
                  variant="donut"
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <GroupedBarChart
        title="ICT Councils"
        subtitle="Active vs. Highly Active, by province (placeholder split)"
        seriesNames={ictCouncilsBreakdown.seriesNames}
        data={ictCouncilsData}
      />
    </section>
  );
}
