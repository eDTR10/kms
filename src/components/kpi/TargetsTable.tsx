import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import AnimatedNumber from "@/components/kpi/AnimatedNumber";
import { useMountedIn } from "@/lib/useMountedIn";

interface TargetRow {
  indicatorName: string;
  current: number;
  target: number;
  units: string | null;
}

function formatWithUnits(value: number, units: string | null): string {
  const formatted = new Intl.NumberFormat("en-US").format(value);
  if (units === "%") return `${formatted}%`;
  return formatted;
}

/** Indicator vs. target, with a progress bar — shared across every project dashboard. */
export default function TargetsTable({ rows, periodLabel }: { rows: TargetRow[]; periodLabel: string }) {
  const mounted = useMountedIn();

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Target activities &middot; {periodLabel}</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const progressPct = r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0;
            return (
              <TableRow key={r.indicatorName} className="hover:bg-accent/50 transition-colors">
                <TableCell className="font-medium text-foreground p-4">{r.indicatorName}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-2 h-[30px]">
                    <span>
                      <AnimatedNumber value={r.current} formatter={(v) => formatWithUnits(v, r.units)} />
                    </span>
                    <div className="h-1.5 w-16 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--viz-series-1)] transition-[width] duration-700 ease-out"
                        style={{ width: `${mounted ? Math.max(4, progressPct) : 0}%` }}
                      />
                    </div>
                    <span className="text-[11px]">{progressPct}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatWithUnits(r.target, r.units)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
