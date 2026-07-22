import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { useMountedIn } from "@/lib/useMountedIn";

export interface RankedBarDatum {
  label: string;
  value: number;
  units?: string | null;
}

const SEQ_STEPS = ["#facc15", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];

const wholeFormatter = new Intl.NumberFormat("en-US");

function formatValue(value: number, units?: string | null): string {
  const formatted = wholeFormatter.format(Math.round(value));
  return units === "%" ? `${formatted}%` : formatted;
}

/**
 * "Ranked Bar Chart" infographic style: several related indicators compared
 * on one sequential-hue scale, ranked highest to lowest, bars growing in on
 * mount.
 */
export default function RankedBarChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: RankedBarDatum[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const mounted = useMountedIn();
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)" }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--viz-text-primary)" }}>
        {title}
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--viz-text-secondary)" }}>
        {subtitle}
      </p>

      <div className="flex flex-col gap-3">
        {sorted.map((d, i) => {
          const widthPct = mounted ? Math.max(4, (d.value / max) * 100) : 0;
          const isHovered = hovered === i;
          // If bar is wide enough (>50%), show number inside at right edge; else outside to the right
          const showInside = widthPct > 50;
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span
                className="max-w-[14rem] min-w-0 text-xs text-right truncate"
                title={d.label}
                style={{ color: "var(--viz-text-secondary)" }}
              >
                {d.label}
              </span>
              <div
                className="relative flex-1 h-6 rounded-sm overflow-hidden"
                style={{ background: "var(--viz-grid)" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${formatValue(d.value, d.units)}`}
              >
                <div
                  className="h-full rounded-r-[4px] transition-[width,opacity] duration-700 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    background: SEQ_STEPS[i % SEQ_STEPS.length],
                    opacity: isHovered ? 0.85 : 1,
                  }}
                />
                {showInside ? (
                  // Number inside bar, right-aligned with padding — fixed white on amber
                  <span
                    className="absolute top-1/2 -translate-y-1/2 right-2 text-xs font-medium truncate max-w-[80%]"
                    style={{ color: "var(--viz-text-primary)" }}
                  >
                    <AnimatedNumber value={d.value} formatter={(v) => formatValue(v, d.units)} />
                  </span>
                ) : (
                  // Number outside to the right of the track
                  <span
                    className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+8px)] text-xs font-medium whitespace-nowrap"
                    style={{ color: "var(--viz-text-primary)" }}
                  >
                    <AnimatedNumber value={d.value} formatter={(v) => formatValue(v, d.units)} />
                  </span>
                )}
                {isHovered && (
                  <div
                    className="absolute -top-9 left-0 z-10 rounded-md px-2 py-1 text-xs shadow-md whitespace-nowrap"
                    style={{
                      background: "var(--viz-text-primary)",
                      color: "var(--viz-surface)",
                      maxWidth: 'calc(100% - 16px)',
                    }}
                  >
                    <strong>{formatValue(d.value, d.units)}</strong> — {d.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
