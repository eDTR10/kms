import { DatabaseZap } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
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

/** Big Number Callout — eyebrow label, hero figure, description. Shared across every project dashboard. */
export default function KpiCallout({ datum }: { datum: ResolvedKpi }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-2 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {datum.indicatorName}
        </p>
        {!datum.hasLiveData && (
          <span
            title="Placeholder value — will sync once the source database is linked"
            className="shrink-0 text-muted-foreground"
          >
            <DatabaseZap size={13} />
          </span>
        )}
      </div>

      <p className="text-4xl font-black text-foreground leading-none">
        <AnimatedNumber value={datum.value} formatter={(v) => formatValue(v, datum.units)} />
      </p>
    </div>
  );
}
