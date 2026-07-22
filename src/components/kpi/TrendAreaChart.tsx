import { useEffect, useRef, useState } from "react";
import { MONTHS } from "@/lib/kpiPeriod";
import type { HistoryPoint } from "@/types/indicator";

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const range = max - min;
  const rawStep = range / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = residual >= 5 ? 5 * magnitude : residual >= 2 ? 2 * magnitude : magnitude;
  const niceMin = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= max + step * 0.5; v += step) ticks.push(Math.round(v));
  return ticks;
}

const VIEW_W = 640;
const VIEW_H = 240;
const MARGIN = { top: 24, right: 16, bottom: 28, left: 56 };

const defaultFormatter = new Intl.NumberFormat("en-US").format;

interface TrendAreaChartProps {
  title: string;
  subtitle: string;
  points: HistoryPoint[];
  formatter?: (n: number) => string;
}

/** Trend over time: one series, sequential blue, area wash, hairline gridlines, end-label + hover crosshair. */
export default function TrendAreaChart({
  title,
  subtitle,
  points,
  formatter = defaultFormatter,
}: TrendAreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);

  // Re-plays the draw-in whenever the data changes (e.g. a period filter swap).
  useEffect(() => {
    setDrawn(false);
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [points]);

  if (points.length < 2) {
    return (
      <div
        className="rounded-xl p-5 border flex items-center justify-center text-sm"
        style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)", color: "var(--viz-text-secondary)", minHeight: 200 }}
      >
        Not enough history in this period to plot a trend.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || max * 0.05 || 1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;

  const plotW = VIEW_W - MARGIN.left - MARGIN.right;
  const plotH = VIEW_H - MARGIN.top - MARGIN.bottom;
  const baselineY = MARGIN.top + plotH;

  const xAt = (i: number) => MARGIN.left + (i / (points.length - 1)) * plotW;
  const yAt = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M${xAt(0).toFixed(1)},${baselineY} ` +
    points.map((p, i) => `L${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ") +
    ` L${xAt(points.length - 1).toFixed(1)},${baselineY} Z`;

  // Straight-segment polyline length, used to drive the stroke-dashoffset draw-in.
  const pathLength = points.reduce((sum, p, i) => {
    if (i === 0) return sum;
    const dx = xAt(i) - xAt(i - 1);
    const dy = yAt(p.value) - yAt(points[i - 1].value);
    return sum + Math.hypot(dx, dy);
  }, 0);

  const ticks = niceTicks(yMin, yMax, 4);

  // Sparse x-axis labels — never one per point once there are more than a handful.
  const maxLabels = 7;
  const labelStride = Math.max(1, Math.ceil(points.length / maxLabels));

  const lastIndex = points.length - 1;
  const active = hovered ?? lastIndex;
  const activePoint = points[active];

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const i = Math.round(((relX - MARGIN.left) / plotW) * (points.length - 1));
    setHovered(Math.min(points.length - 1, Math.max(0, i)));
  }

  const tooltipX = Math.min(VIEW_W - 130, Math.max(MARGIN.left, xAt(active) - 60));

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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={title}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
      >
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
              {formatter(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % labelStride === 0 || i === lastIndex ? (
            <text
              key={`${p.year}-${p.month}`}
              x={xAt(i)}
              y={VIEW_H - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--viz-text-secondary)"
            >
              {MONTHS[p.month - 1].slice(0, 3)} {String(p.year).slice(2)}
            </text>
          ) : null
        )}

        {/* Area wash — the series hue at ~10% opacity, never a saturated block */}
        <path
          d={areaPath}
          fill="var(--viz-series-1)"
          opacity={drawn ? 0.1 : 0}
          style={{ transition: "opacity 0.6s ease-out" }}
        />

        <path
          d={linePath}
          fill="none"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={drawn ? 0 : pathLength}
          style={{ transition: "stroke-dashoffset 1.1s ease-out" }}
        />

        {/* End label — the current/latest value, fades in once the line finishes drawing */}
        <g style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.3s ease-out 0.9s" }}>
          <circle cx={xAt(lastIndex)} cy={yAt(points[lastIndex].value)} r={4} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
          <text x={xAt(lastIndex)} y={yAt(points[lastIndex].value) - 10} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--viz-text-primary)">
            {formatter(points[lastIndex].value)}
          </text>
        </g>

        {hovered !== null && (
          <>
            <line x1={xAt(hovered)} x2={xAt(hovered)} y1={MARGIN.top} y2={VIEW_H - MARGIN.bottom} stroke="var(--viz-baseline)" strokeWidth={1} />
            <circle cx={xAt(hovered)} cy={yAt(points[hovered].value)} r={4} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
          </>
        )}

        {hovered !== null && (
          <g transform={`translate(${tooltipX}, ${MARGIN.top - 4})`}>
            <rect width={120} height={36} rx={6} fill="var(--viz-text-primary)" opacity={0.92} />
            <text x={8} y={15} fontSize={11} fontWeight={700} fill="var(--viz-surface)">
              {formatter(activePoint.value)}
            </text>
            <text x={8} y={28} fontSize={9} fill="var(--viz-surface)" opacity={0.75}>
              {MONTHS[activePoint.month - 1]} {activePoint.year}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
