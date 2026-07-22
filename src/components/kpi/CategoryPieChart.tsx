import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { useMountedIn } from "@/lib/useMountedIn";

export interface CategoryDatum {
  label: string;
  value: number;
}

const CATEGORICAL = [
  "var(--viz-series-1)",
  "var(--viz-series-2)",
  "var(--viz-series-3)",
  "var(--viz-series-4)",
  "var(--viz-series-5)",
  "var(--viz-series-6)",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // A full-circle slice (single category) can't be drawn as one arc — pull in slightly.
  const clampedEnd = endAngle - startAngle >= 360 ? startAngle + 359.99 : endAngle;
  const start = polarToCartesian(cx, cy, r, clampedEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function donutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const clampedEnd = endAngle - startAngle >= 360 ? startAngle + 359.99 : endAngle;
  const outerAtEnd = polarToCartesian(cx, cy, outerR, clampedEnd);
  const outerAtStart = polarToCartesian(cx, cy, outerR, startAngle);
  const innerAtStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerAtEnd = polarToCartesian(cx, cy, innerR, clampedEnd);
  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerAtEnd.x} ${outerAtEnd.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerAtStart.x} ${outerAtStart.y}`,
    `L ${innerAtStart.x} ${innerAtStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerAtEnd.x} ${innerAtEnd.y}`,
    "Z",
  ].join(" ");
}

interface CategoryPieChartProps {
  title: string;
  subtitle: string;
  data: CategoryDatum[];
  /** "donut" opens a hole in the middle with the running total centered in it. */
  variant?: "pie" | "donut";
}

/**
 * Part-to-whole pie/donut: categorical hue per slice (fixed order) + legend +
 * direct value/percent labels. Reusable across any project's category breakdown.
 */
export default function CategoryPieChart({ title, subtitle, data, variant = "pie" }: CategoryPieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const mounted = useMountedIn();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const size = 200;
  const r = size / 2;
  const innerR = variant === "donut" ? r * 0.55 : 0;

  let cumulativeAngle = 0;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;
    return { ...d, startAngle, endAngle, color: CATEGORICAL[i % CATEGORICAL.length] };
  });

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

      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
            {slices.map((s, i) => (
              <path
                key={s.label}
                d={
                  variant === "donut"
                    ? donutSlicePath(r, r, r - 4, innerR, s.startAngle, s.endAngle)
                    : pieSlicePath(r, r, r - 4, s.startAngle, s.endAngle)
                }
                fill={s.color}
                stroke="var(--viz-surface)"
                strokeWidth={2}
                opacity={hovered === null || hovered === i ? 1 : 0.45}
                className="cursor-pointer transition-[opacity,transform] duration-500 ease-out"
                style={{
                  transformOrigin: `${r}px ${r}px`,
                  transform: mounted ? "scale(1)" : "scale(0)",
                  transitionDelay: `${i * 90}ms`,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                <title>
                  {s.label}: {s.value} ({Math.round((s.value / total) * 1000) / 10}%)
                </title>
              </path>
            ))}
          </svg>

          {variant === "donut" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-black" style={{ color: "var(--viz-text-primary)" }}>
                <AnimatedNumber value={total} />
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-[190px]">
          {slices.map((s, i) => {
            const pct = Math.round((s.value / total) * 1000) / 10;
            const isHovered = hovered === i;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2 text-xs cursor-default"
                style={{ color: isHovered ? "var(--viz-text-primary)" : "var(--viz-text-secondary)" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: s.color }}
                />
                <span className="flex-1 truncate" title={s.label}>
                  {s.label}
                </span>
                <strong style={{ color: "var(--viz-text-primary)" }}>
                  {new Intl.NumberFormat("en-US").format(s.value)}
                </strong>
                <span className="text-[10px]" style={{ color: "var(--viz-text-secondary)" }}>({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
