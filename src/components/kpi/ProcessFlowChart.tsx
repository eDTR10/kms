import { Check } from "lucide-react";

export interface ProcessFlowChartProps {
  title: string;
  subtitle: string;
  stages: string[];
  /** How many stages (from the start) are complete. Defaults to all — these
   * source rows are archived/inactive, read here as finished pipelines. */
  completedThrough?: number;
}

/** "Process Flow / Roadmap" infographic style — a sequence of stages, each marked done or pending. */
export default function ProcessFlowChart({ title, subtitle, stages, completedThrough }: ProcessFlowChartProps) {
  const doneCount = completedThrough ?? stages.length;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-border)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--viz-text-primary)" }}>
          {title}
        </h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: doneCount >= stages.length ? "var(--viz-status-good)" : "var(--viz-muted)",
            background: doneCount >= stages.length ? "rgba(12,163,12,0.12)" : "var(--viz-grid)",
          }}
        >
          {doneCount >= stages.length ? "Completed" : `${doneCount}/${stages.length} stages`}
        </span>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--viz-text-secondary)" }}>
        {subtitle}
      </p>

      <div className="flex items-start">
        {stages.map((stage, i) => {
          const isDone = i < doneCount;
          const isCurrent = i === doneCount;
          return (
            <div key={stage} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center gap-2" style={{ width: 96 }}>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                  style={{
                    borderColor: isDone
                      ? "var(--viz-status-good)"
                      : isCurrent
                        ? "var(--viz-series-1)"
                        : "var(--viz-baseline)",
                    background: isDone ? "var(--viz-status-good)" : "var(--viz-surface)",
                    color: isDone ? "#fff" : isCurrent ? "var(--viz-series-1)" : "var(--viz-muted)",
                  }}
                >
                  {isDone ? <Check size={15} /> : i + 1}
                </div>
                <span
                  className="text-center text-[11px] leading-tight"
                  style={{ color: isDone || isCurrent ? "var(--viz-text-primary)" : "var(--viz-muted)" }}
                >
                  {stage}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div
                  className="mt-4 h-0.5 flex-1"
                  style={{ background: i < doneCount - 1 ? "var(--viz-status-good)" : "var(--viz-grid)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
