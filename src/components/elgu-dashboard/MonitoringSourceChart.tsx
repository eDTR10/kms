import { useState } from "react";

interface BarDatum {
  label: string;
  count: number;
}

const CATEGORICAL = [
  "var(--viz-series-1)",
  "var(--viz-series-2)",
  "var(--viz-series-3)",
  "var(--viz-series-5)",
];

/**
 * Horizontal bar chart, categorical hue per named monitoring source (identity),
 * fixed hue order + legend since there are 2+ series.
 */
export default function MonitoringSourceChart({ data }: { data: BarDatum[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--viz-text-primary)" }}>
          Portal KPIs by monitoring source
        </h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--viz-text-secondary)" }}>
        Where the values behind each KM Portal KPI are maintained
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--viz-text-secondary)" }}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: CATEGORICAL[i % CATEGORICAL.length] }}
            />
            {d.label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {data.map((d, i) => {
          const widthPct = Math.max(4, (d.count / max) * 100);
          const isHovered = hovered === i;
          return (
            <div
              key={d.label}
              className="relative h-6 rounded-sm"
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
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${widthPct}%`,
                  background: CATEGORICAL[i % CATEGORICAL.length],
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
                  style={{ background: "var(--viz-text-primary)", color: "var(--viz-surface)" }}
                >
                  <strong>{d.count}</strong> KPIs from {d.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
