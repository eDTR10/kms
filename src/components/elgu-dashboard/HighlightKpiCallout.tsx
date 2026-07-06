import { Star, DatabaseZap } from "lucide-react";
import AnimatedNumber from "@/components/kpi/AnimatedNumber";
import type { ResolvedKpi } from "@/types/indicator";

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatValue(value: number, units: string | null): string {
  const formatted = compactFormatter.format(value);
  if (!units || units === "Number") return formatted;
  if (units === "%") return `${formatted}%`;
  return `${formatted} ${units}`;
}

/** Spotlight variant of KpiCallout — larger figure, accent frame, for the metrics that lead the page. */
export default function HighlightKpiCallout({ datum, label }: { datum: ResolvedKpi; label: string }) {
  return (
    <div className="relative rounded-xl border-2 border-primary/40 bg-primary/5 p-6 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
          <Star size={13} className="fill-primary" />
          {label}
        </span>
        {!datum.hasLiveData && (
          <span
            title="Placeholder value — will sync once the source database is linked"
            className="shrink-0 text-muted-foreground"
          >
            <DatabaseZap size={13} />
          </span>
        )}
      </div>

      <p className="text-5xl font-black text-foreground leading-none">
        <AnimatedNumber value={datum.value} formatter={(v) => formatValue(v, datum.units)} />
      </p>

      <p className="text-sm text-foreground/80 leading-snug font-medium">{datum.indicatorName}</p>
    </div>
  );
}
