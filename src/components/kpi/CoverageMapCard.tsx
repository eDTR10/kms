import { DatabaseZap } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import regionAreas from "@/data/region10Areas.json";
import type { ResolvedKpi } from "@/types/indicator";

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const wholeFormatter = new Intl.NumberFormat("en-US");

function formatValue(value: number, units: string | null): string {
  const formatted = compactFormatter.format(value);
  if (!units || units === "Number") return formatted;
  if (units === "%") return `${formatted}%`;
  return `${formatted} ${units}`;
}

const avgWeight = 1 / regionAreas.length;

/**
 * "Map" infographic style — modeled on the real Free Wi-Fi Looker Studio
 * report: a SUMMARY badge, an "as of" stamp, a headline number, and a
 * province-by-province breakdown table with a grand total row.
 */
export default function CoverageMapCard({ datum }: { datum: ResolvedKpi }) {
  const isPercentage = datum.units === "%";

  const areaRows = regionAreas
    .map((area) => {
      const value = isPercentage
        ? Math.max(0, Math.min(100, Math.round((datum.value + (area.weight - avgWeight) * 120) * 10) / 10))
        : Math.round(datum.value * area.weight);
      return { name: area.name, value };
    })
    .sort((a, b) => b.value - a.value);

  const grandTotal = isPercentage
    ? Math.round(datum.value * 10) / 10
    : areaRows.reduce((sum, a) => sum + a.value, 0);

  const asOfLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="h-full bg-card border border-border rounded-xl p-6 flex flex-col gap-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{datum.indicatorName}</p>
        {!datum.hasLiveData && (
          <span
            title="Placeholder value — will sync once the source database is linked"
            className="shrink-0 text-muted-foreground"
          >
            <DatabaseZap size={13} />
          </span>
        )}
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center rounded-full border border-destructive/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
          Summary
        </span>
        <span className="text-[11px] text-muted-foreground">as of {asOfLabel}</span>
      </div>

      <p className="text-4xl font-black text-foreground leading-none">
        <AnimatedNumber value={datum.value} formatter={(v) => formatValue(v, datum.units)} />
      </p>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Province / City</TableHead>
              <TableHead className="text-right">{isPercentage ? "Rate" : "Value"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areaRows.map((area, i) => (
              <TableRow key={area.name} className={i === 0 ? "bg-accent/60" : undefined}>
                <TableCell className="py-2 text-foreground">{area.name}</TableCell>
                <TableCell className="py-2 text-right font-medium text-foreground">
                  {isPercentage ? `${area.value}%` : wholeFormatter.format(area.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="py-2 font-bold text-foreground">Grand total</TableCell>
              <TableCell className="py-2 text-right font-bold text-foreground">
                {isPercentage ? `${grandTotal}%` : wholeFormatter.format(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Placeholder split — not measured per-province data.
      </p>
    </div>
  );
}
