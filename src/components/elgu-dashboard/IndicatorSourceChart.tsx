import { useState } from "react";

interface BarDatum {
  label: string;
  count: number;
}

const SEQ_STEPS = ["var(--viz-seq-450)", "var(--viz-seq-400)", "var(--viz-seq-250)", "var(--viz-seq-100)"];

/**
 * Horizontal bar chart, one sequential hue, more-is-darker.
 * Job: compare magnitude of portal KPIs across their reporting source.
 */
export default function IndicatorSourceChart({ data }: { data: BarDatum[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((d) => d.count), 1);

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)" }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--viz-text-primary)" }}>
        Portal KPIs by reporting source
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--viz-text-secondary)" }}>
        Which report each KM Portal KPI is drawn from
      </p>

      <div className="flex flex-col gap-3">
        {sorted.map((d, i) => {
          const widthPct = Math.max(4, (d.count / max) * 100);
          const isHovered = hovered === i;
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span
                className="w-40 shrink-0 text-xs text-right truncate"
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
                aria-label={`${d.label}: ${d.count} KPIs`}
              >
                <div
                  className="h-full rounded-r-[4px] transition-opacity"
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
                  {d.count}
                </span>
                {isHovered && (
                  <div
                    className="absolute -top-9 left-0 z-10 rounded-md px-2 py-1 text-xs shadow-md whitespace-nowrap"
                    style={{
                      background: "var(--viz-text-primary)",
                      color: "var(--viz-surface)",
                    }}
                  >
                    <strong>{d.count}</strong> KPIs from {d.label}
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
