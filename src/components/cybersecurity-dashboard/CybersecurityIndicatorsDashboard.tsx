import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import CoverageMapCard from "@/components/kpi/CoverageMapCard";
import DonutProgressCard from "@/components/kpi/DonutProgressCard";
import TrendAreaChart from "@/components/kpi/TrendAreaChart";
import PeriodFilterBar, { DEFAULT_PERIOD_FILTERS, type PeriodFilters } from "@/components/kpi/PeriodFilterBar";
import kpiData from "@/data/cybersecurityKpiData.json";
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

interface ProgramSectionProps {
  title: string;
  programKpis: KpiDatum[];
  resolved: Record<string, ResolvedKpi>;
  trendPoints: Record<string, HistoryPoint[]>;
}

// Equal-width columns sized to how many cards are actually in the row — never
// more columns than cards, so the row always fills edge to edge.
function evenGridClass(count: number): string {
  switch (Math.min(count, 4)) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 sm:grid-cols-2";
    case 3:
      return "grid-cols-1 sm:grid-cols-3";
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }
}

/** Renders one program's KPIs, dispatching each to its Preferred Infographic Style. */
function ProgramSection({ title, programKpis, resolved, trendPoints }: ProgramSectionProps) {
  if (programKpis.length === 0) return null;

  const bigNumberRows = programKpis.filter((k) => k.infographicStyle === "Big Number Callout");
  const donutRows = programKpis.filter((k) => k.infographicStyle === "Pie/Donut Chart");
  const mapRows = programKpis.filter((k) => k.infographicStyle === "Map");
  const trendRows = programKpis.filter((k) => k.infographicStyle === "Line Graph / Area Chart");

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-bold text-foreground">{title}</h3>

      {bigNumberRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className={`grid gap-4 ${evenGridClass(bigNumberRows.length)}`}
        >
          {bigNumberRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <KpiCallout datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {donutRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className={`grid gap-4 ${evenGridClass(donutRows.length)}`}
        >
          {donutRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <DonutProgressCard datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Map cards carry a wide province table, so each gets its own full-width row. */}
      {mapRows.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4"
        >
          {mapRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem}>
              <CoverageMapCard datum={resolved[k.indicatorId]} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {trendRows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {trendRows.map((k) => (
            <TrendAreaChart
              key={k.indicatorId}
              title={k.indicatorName}
              subtitle="Trend over time (placeholder values)"
              points={trendPoints[k.indicatorId] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CybersecurityIndicatorsDashboard() {
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

  const pnpkiKpis = kpis.filter((k) => k.program === "PNPKI");
  const cybersecurityKpis = kpis.filter((k) => k.program === "Cybersecurity");

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          Cybersecurity / PNPKI program KPIs &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(scope)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <PeriodFilterBar filters={filters} onChange={setFilters} years={years} />

      <ProgramSection
        title="Cybersecurity"
        programKpis={cybersecurityKpis}
        resolved={resolved}
        trendPoints={trendPoints}
      />

      <ProgramSection title="PNPKI" programKpis={pnpkiKpis} resolved={resolved} trendPoints={trendPoints} />


    </section>
  );
}
