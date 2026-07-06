import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { useMountedIn } from "@/lib/useMountedIn";

export interface RankedBarDatum {
  label: string;
  value: number;
  units?: string | null;
}

const SEQ_STEPS = ["var(--viz-seq-450)", "var(--viz-seq-400)", "var(--viz-seq-250)", "var(--viz-seq-100)"];

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
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span
                className="w-48 shrink-0 text-xs text-right truncate"
                title={d.label}
                style={{ color: "var(--viz-text-secondary)" }}
              >
                {d.label}
              </span>
              <div
                className="relative flex-1 h-6 rounded-sm"
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
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-medium"
                  style={{ left: `calc(${widthPct}% + 8px)`, color: "var(--viz-text-primary)" }}
                >
                  <AnimatedNumber value={d.value} formatter={(v) => formatValue(v, d.units)} />
                </span>
                {isHovered && (
                  <div
                    className="absolute -top-9 left-0 z-10 rounded-md px-2 py-1 text-xs shadow-md whitespace-nowrap"
                    style={{
                      background: "var(--viz-text-primary)",
                      color: "var(--viz-surface)",
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
