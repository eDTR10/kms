import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import KpiCallout from "@/components/kpi/KpiCallout";
import HighlightKpiCallout from "./HighlightKpiCallout";
import IndicatorFilterBar, { DEFAULT_FILTERS } from "./IndicatorFilterBar";
import CategoryPieChart from "@/components/kpi/CategoryPieChart";
import catalogData from "@/data/elguIndicators.json";
import kpiData from "@/data/elguKpiData.json";
import { describePeriod, resolvePeriodValue } from "@/lib/kpiPeriod";
import { staggerContainer, fadeUpItem } from "@/lib/motionVariants";
import type { IndicatorCatalogEntry, IndicatorFilters, KpiDatum, ResolvedKpi } from "@/types/indicator";

const catalog = catalogData as IndicatorCatalogEntry[];
const kpis = kpiData as KpiDatum[];
const kpiById = new Map(kpis.map((k) => [k.indicatorId, k]));

// Only indicators flagged "Show in the KM Portal" ever reach this dashboard.
const portalCatalog = catalog.filter((r) => r.showInPortal);

// Every year present anywhere in the mock history — a real database swap-in
// would answer this with `SELECT DISTINCT year`, same downstream contract.
const years = Array.from(
  new Set(kpis.flatMap((k) => k.history.map((h) => String(h.year))))
).sort();

const LGU_MODULE_PREFIX = "Number of LGUs operational with ";

// Online Payment channels aren't a "system module" — leave them out of the pie.
const PIE_EXCLUDED_NAMES = new Set([
  "Number of LGUs operational with Online Payment integrated (Linkbiz)",
  "Number of LGUs operational with Online Payment integrated (eGovPay)",
]);

// Left column: four flagship metrics stacked narrow, top to bottom.
const LEFT_COLUMN_ORDERED = [
  "Number of LGUs operational with eLGU v2 system",
  "Number of LGUs operational with eLGU v1 system",
  "Number of LGUs operational with eLGU BPCO system",
  "Number of LGUs operational with eLGU Working Permit",
];
const LEFT_COLUMN_NAMES = new Set(LEFT_COLUMN_ORDERED);

// Right column: two milestone metrics, each twice the height of a left card.
const RIGHT_COLUMN_ORDERED = ["Number of eLGU Go Live", "Number of eLGU Launching"];
const RIGHT_COLUMN_NAMES = new Set(RIGHT_COLUMN_ORDERED);

// "Number of LGUs operational with eLGU v1 system" -> "eLGU V1"
// "Number of eLGU Launching" -> "eLGU Launching"
function deriveModuleLabel(indicatorName: string): string {
  if (indicatorName.startsWith(LGU_MODULE_PREFIX)) {
    return indicatorName
      .replace(LGU_MODULE_PREFIX, "")
      .replace(/ system$/i, "")
      .replace(/\bv(\d)\b/i, (_match, n: string) => `V${n}`)
      .trim();
  }
  return indicatorName.replace(/^Number of /i, "").trim();
}

function deriveVariant(indicatorName: string): "default" | "confetti" | "live" {
  if (indicatorName === "Number of eLGU Launching") return "confetti";
  if (indicatorName === "Number of eLGU Go Live") return "live";
  return "default";
}

export default function ELGUIndicatorsDashboard() {
  const [filters, setFilters] = useState<IndicatorFilters>(DEFAULT_FILTERS);

  const filteredCatalog = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return portalCatalog.filter((r) => {
      if (q && !r.indicatorName.toLowerCase().includes(q)) return false;
      if (filters.status !== "All" && r.status !== filters.status) return false;
      if (
        filters.monitoringSource !== "All" &&
        r.monitoringSource !== filters.monitoringSource
      )
        return false;
      if (filters.dimension !== "All" && !r.dimensions.includes(filters.dimension))
        return false;
      return true;
    });
  }, [filters]);

  const kpiRows = useMemo<ResolvedKpi[]>(
    () =>
      filteredCatalog
        .map((r) => kpiById.get(r.id))
        .filter((d): d is KpiDatum => !!d)
        .map((d) => ({
          indicatorId: d.indicatorId,
          indicatorName: d.indicatorName,
          groupTag: d.groupTag,
          units: d.units,
          value: resolvePeriodValue(d.history, filters, d.aggregation),
          target: d.target,
          hasLiveData: d.hasLiveData,
        })),
    [filteredCatalog, filters]
  );

  const lguModuleData = useMemo(
    () =>
      kpiRows
        .filter(
          (k) => k.indicatorName.startsWith(LGU_MODULE_PREFIX) && !PIE_EXCLUDED_NAMES.has(k.indicatorName)
        )
        .map((k) => ({ label: k.indicatorName.replace(LGU_MODULE_PREFIX, "").trim(), value: k.value })),
    [kpiRows]
  );

  const leftColumnRows = useMemo(() => {
    const byName = new Map(kpiRows.map((k) => [k.indicatorName, k]));
    return LEFT_COLUMN_ORDERED.map((name) => byName.get(name)).filter(
      (k): k is ResolvedKpi => !!k
    );
  }, [kpiRows]);

  const rightColumnRows = useMemo(() => {
    const byName = new Map(kpiRows.map((k) => [k.indicatorName, k]));
    return RIGHT_COLUMN_ORDERED.map((name) => byName.get(name)).filter(
      (k): k is ResolvedKpi => !!k
    );
  }, [kpiRows]);

  const gridRows = useMemo(
    () =>
      kpiRows.filter(
        (k) => !LEFT_COLUMN_NAMES.has(k.indicatorName) && !RIGHT_COLUMN_NAMES.has(k.indicatorName)
      ),
    [kpiRows]
  );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Key indicators</h2>
        <p className="text-sm text-muted-foreground">
          KPIs flagged &ldquo;Show in the KM Portal&rdquo; in the eLGU indicator catalog &middot;{" "}
          <span className="font-medium text-foreground">{describePeriod(filters)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Values are placeholders until each indicator&apos;s source database is linked.
        </p>
      </div>

      <IndicatorFilterBar
        filters={filters}
        onChange={setFilters}
        years={years}
        resultCount={filteredCatalog.length}
      />

      {(leftColumnRows.length > 0 || rightColumnRows.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {leftColumnRows.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {leftColumnRows.map((k) => (
                <motion.div key={k.indicatorId} variants={fadeUpItem}>
                  <HighlightKpiCallout datum={k} label={deriveModuleLabel(k.indicatorName)} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {rightColumnRows.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-col gap-4"
            >
              {rightColumnRows.map((k) => (
                <motion.div key={k.indicatorId} variants={fadeUpItem} className="flex-1">
                  <HighlightKpiCallout
                    datum={k}
                    label={deriveModuleLabel(k.indicatorName)}
                    variant={deriveVariant(k.indicatorName)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {lguModuleData.length >= 2 && (
        <CategoryPieChart
          title="LGUs operational by system module"
          subtitle="Share of operational LGU count across each eLGU module (placeholder values)"
          data={lguModuleData}
        />
      )}

      {gridRows.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {gridRows.map((k) => (
            <motion.div key={k.indicatorId} variants={fadeUpItem} className="h-full">
              <KpiCallout datum={k} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        leftColumnRows.length === 0 &&
        rightColumnRows.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
            No portal-visible KPIs match the current filters.
          </p>
        )
      )}
    </section>
  );
}
