import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import RankedBarChart from "@/components/kpi/RankedBarChart";
import CategoryPieChart from "@/components/kpi/CategoryPieChart";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import kpiData from "@/data/nbpKpiData.json";
import districtBreakdown from "@/data/nbpDistrictBreakdown.json";
import officeClassificationBreakdown from "@/data/nbpOfficeClassificationBreakdown.json";
import { describePeriod, resolvePeriodValue } from "@/lib/kpiPeriod";
import { fadeUpItem } from "@/lib/motionVariants";
import type { KpiDatum, ResolvedKpi } from "@/types/indicator";

const kpis = kpiData as KpiDatum[];
const headline = kpis[0];

// Every year present anywhere in the mock history — a real database swap-in
// would answer this with `SELECT DISTINCT year`, same downstream contract.
const years = Array.from(
  new Set(kpis.flatMap((k) => k.history.map((h) => String(h.year))))
).sort();

export default function NBPIndicatorsDashboard() {
  const [filters, setFilters] = useState<PeriodFilters>(DEFAULT_PERIOD_FILTERS);
  const scope = { year: filters.year, quarter: filters.quarter, month: "All" };

  const resolvedHeadline = useMemo<ResolvedKpi>(
    () => ({
      indicatorId: headline.indicatorId,
      indicatorName: headline.indicatorName,
      groupTag: headline.groupTag,
      units: headline.units,
      value: resolvePeriodValue(headline.history, scope, headline.aggregation),
      target: headline.target,
      hasLiveData: headline.hasLiveData,
    }),
    [filters]
  );

  // Both breakdowns are a fixed proportional split of the headline total — the
  // catalog only tracks one number, not real per-district/per-classification
  // figures, so this mirrors the real report's proportions as a placeholder.
  const districtData = districtBreakdown.map((d) => ({
    label: d.label,
    value: Math.round(resolvedHeadline.value * d.weight),
  }));

  const officeClassificationData = officeClassificationBreakdown.map((d) => ({
    label: d.label,
    value: Math.round(resolvedHeadline.value * d.weight),
  }));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          NBP / CDO GovNet KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      <motion.div initial="hidden" animate="show" variants={fadeUpItem}>
        <div className="grid grid-cols-1 gap-4">
          <KpiCallout datum={resolvedHeadline} />
        </div>

      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedBarChart
          title="Number of locations per district"
          subtitle="Interconnected agencies by district (placeholder split)"
          data={districtData}
        />
        <CategoryPieChart
          title="Number of locations per office classification"
          subtitle="Interconnected agencies by office type (placeholder split)"
          data={officeClassificationData}
          variant="donut"
        />
      </div>
    </section>
  );
}
