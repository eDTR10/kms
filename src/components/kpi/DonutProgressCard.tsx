import { useEffect, useState } from "react";
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

const SIZE = 160;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** "Pie/Donut Chart" infographic style — a single indicator's progress against target, as a ring. */
export default function DonutProgressCard({ datum }: { datum: ResolvedKpi }) {
  const [drawn, setDrawn] = useState(false);

  // Re-plays the draw-in whenever the resolved value changes (e.g. a period filter swap).
  useEffect(() => {
    setDrawn(false);
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [datum.value, datum.target]);

  const pct = datum.target > 0 ? Math.min(100, Math.round((datum.value / datum.target) * 100)) : 0;
  const offset = CIRCUMFERENCE * (1 - (drawn ? pct : 0) / 100);

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

      <div className="flex items-center justify-center py-2">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={datum.indicatorName}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--viz-grid)" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--viz-series-1)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-foreground leading-none">
              <AnimatedNumber value={datum.value} formatter={(v) => formatValue(v, datum.units)} />
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">{pct}% of target</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center -mt-2">
        Target: {formatValue(datum.target, datum.units)}
      </p>
    </div>
  );
}
