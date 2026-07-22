import { useState } from "react";
import { useMountedIn } from "@/lib/useMountedIn";

export interface GroupedBarDatum {
  category: string;
  /** One value per series, same order as `seriesNames`. */
  values: number[];
}

interface GroupedBarChartProps {
  title: string;
  subtitle: string;
  seriesNames: string[];
  data: GroupedBarDatum[];
}

const CATEGORICAL = [
  "var(--viz-series-1)",
  "var(--viz-series-2)",
  "var(--viz-series-3)",
  "var(--viz-series-4)",
];

const VIEW_W = 640;
const VIEW_H = 260;
const MARGIN = { top: 24, right: 16, bottom: 40, left: 40 };

/** Grouped columns: multiple named series compared side by side per category, categorical hue per series. */
export default function GroupedBarChart({ title, subtitle, seriesNames, data }: GroupedBarChartProps) {
  const mounted = useMountedIn();
  const [hovered, setHovered] = useState<{ categoryIndex: number; seriesIndex: number } | null>(null);

  const plotW = VIEW_W - MARGIN.left - MARGIN.right;
  const plotH = VIEW_H - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(...data.flatMap((d) => d.values), 1);

  const groupWidth = plotW / data.length;
  const barGap = 4;
  const barWidth = Math.min(24, (groupWidth - barGap * (seriesNames.length + 1)) / seriesNames.length);

  const yAt = (v: number) => MARGIN.top + (1 - v / maxValue) * plotH;
  const baselineY = MARGIN.top + plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t));

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)" }}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--viz-text-primary)" }}>
        {title}
      </h3>
      <p className="text-xs mb-3" style={{ color: "var(--viz-text-secondary)" }}>
        {subtitle}
      </p>

      <div className="flex items-center gap-4 mb-3">
        {seriesNames.map((name, i) => (
          <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--viz-text-secondary)" }}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: CATEGORICAL[i % CATEGORICAL.length] }}
            />
            {name}
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={VIEW_W - MARGIN.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={yAt(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--viz-text-secondary)">
              {t}
            </text>
          </g>
        ))}

        {data.map((d, ci) => {
          const groupStartX = MARGIN.left + ci * groupWidth;
          const seriesBlockWidth = barWidth * seriesNames.length + barGap * (seriesNames.length - 1);
          const blockStartX = groupStartX + (groupWidth - seriesBlockWidth) / 2;

          return (
            <g key={d.category}>
              <text
                x={groupStartX + groupWidth / 2}
                y={VIEW_H - MARGIN.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--viz-text-secondary)"
              >
                {d.category}
              </text>

              {d.values.map((v, si) => {
                const barH = mounted ? (v / maxValue) * plotH : 0;
                const x = blockStartX + si * (barWidth + barGap);
                const isHovered = hovered?.categoryIndex === ci && hovered?.seriesIndex === si;
                return (
                  <g key={si}>
                    <rect
                      x={x}
                      y={baselineY - barH}
                      width={barWidth}
                      height={barH}
                      rx={3}
                      fill={CATEGORICAL[si % CATEGORICAL.length]}
                      opacity={isHovered ? 0.85 : 1}
                      className="transition-[height,y,opacity] duration-700 ease-out cursor-pointer"
                      onMouseEnter={() => setHovered({ categoryIndex: ci, seriesIndex: si })}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered({ categoryIndex: ci, seriesIndex: si })}
                      onBlur={() => setHovered(null)}
                      tabIndex={0}
                    >
                      <title>
                        {d.category} — {seriesNames[si]}: {v}
                      </title>
                    </rect>
                    {v > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={baselineY - barH - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="var(--viz-text-primary)"
                        opacity={mounted ? 1 : 0}
                        className="transition-opacity duration-300"
                      >
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        <line
          x1={MARGIN.left}
          x2={VIEW_W - MARGIN.right}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--viz-baseline)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
