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

// Falling confetti pieces, cycling through the categorical palette. Kept
// well inside the card's horizontal edges (18-82%) so none of them sit under
// the rounded corners, where overflow clipping would slice them into odd
// shapes; each starts just above the card and loops as it falls through.
const CONFETTI_PIECES = [
  { color: "var(--viz-series-1)", left: "22%", size: 8, duration: 4.2, delay: 0 },
  { color: "var(--viz-series-3)", left: "34%", size: 7, duration: 3.6, delay: 0.6 },
  { color: "var(--viz-series-6)", left: "48%", size: 7, duration: 4.8, delay: 1.4 },
  { color: "var(--viz-series-2)", left: "62%", size: 7, duration: 3.9, delay: 0.3 },
  { color: "var(--viz-series-5)", left: "74%", size: 6, duration: 4.5, delay: 2.0 },
  { color: "var(--viz-series-4)", left: "28%", size: 6, duration: 5.1, delay: 2.4 },
  { color: "var(--viz-series-3)", left: "56%", size: 8, duration: 3.3, delay: 1.7 },
  { color: "var(--viz-series-1)", left: "80%", size: 6, duration: 4.0, delay: 1.0 },
];

function ConfettiBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none" aria-hidden="true">
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-sm animate-confetti-fall"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
      <span className="h-2 w-2 rounded-full bg-destructive animate-live-blink" />
      Live
    </span>
  );
}

interface HighlightKpiCalloutProps {
  datum: ResolvedKpi;
  label: string;
  /** "confetti" for launch/milestone metrics, "live" for a red on-air indicator. */
  variant?: "default" | "confetti" | "live";
}

/** Spotlight variant of KpiCallout — larger figure, accent frame, for the metrics that lead the page. */
export default function HighlightKpiCallout({ datum, label, variant = "default" }: HighlightKpiCalloutProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border-2 border-primary/40 bg-primary/5 p-6 flex flex-col gap-2">
      {variant === "confetti" && <ConfettiBackground />}

      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
          <Star size={13} className="fill-primary" />
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {variant === "live" && <LiveBadge />}
          {!datum.hasLiveData && (
            <span
              title="Placeholder value — will sync once the source database is linked"
              className="text-muted-foreground"
            >
              <DatabaseZap size={13} />
            </span>
          )}
        </div>
      </div>

      <p className="relative z-10 text-5xl font-black text-foreground leading-none">
        <AnimatedNumber value={datum.value} formatter={(v) => formatValue(v, datum.units)} />
      </p>

      <p className="relative z-10 text-sm text-foreground/80 leading-snug font-medium">{datum.indicatorName}</p>
    </div>
  );
}
