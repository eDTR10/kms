import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import TrendAreaChart from "@/components/kpi/TrendAreaChart";
import EgovTargetsTable from "./EgovTargetsTable";
import kpiData from "@/data/egovKpiData.json";
import { describePeriod, resolvePeriodValue, QUARTER_MONTHS } from "@/lib/kpiPeriod";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import type { HistoryPoint, KpiDatum, ResolvedKpi } from "@/types/indicator";

const kpis = kpiData as KpiDatum[];
const kpiByName = new Map(kpis.map((k) => [k.indicatorName, k]));

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

export default function EgovIndicatorsDashboard() {
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

  const registeredUsersPoints = useMemo(() => {
    const registeredUsers = kpiByName.get("Number of Registered Users");
    return registeredUsers ? filterHistory(registeredUsers.history, filters) : [];
  }, [filters]);

  const targetRows = useMemo(
    () =>
      [
        kpiByName.get("Percentage of tickets resolved"),
        kpiByName.get("Number of eGovPh Promotional Activities"),
      ]
        .filter((k): k is KpiDatum => !!k)
        .map((k) => ({
          indicatorName: k.indicatorName,
          current: resolved[k.indicatorId]?.value ?? 0,
          target: k.target,
          units: k.units,
        })),
    [resolved]
  );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          eGov / NGP program KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-3 gap-4 lg:grid-cols-3"
      >
        {kpis.map((k) => (
          <motion.div key={k.indicatorId} variants={fadeUpItem}>
            <KpiCallout datum={resolved[k.indicatorId]} />
          </motion.div>
        ))}
      </motion.div>

      <TrendAreaChart
        title="Registered users"
        subtitle="Cumulative eGovPH registrations over time (placeholder values)"
        points={registeredUsersPoints}
      />

      <EgovTargetsTable rows={targetRows} periodLabel={describePeriod(scope)} />
    </section>
  );
}
