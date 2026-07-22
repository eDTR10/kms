/**
 * Google Sheet service — shared KPI source for all project dashboards.
 *
 * Reads a publicly-shared Google Sheet via the GViz API endpoint:
 *   https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&sheet={TAB_NAME}
 *
 * One workbook, one tab per project (e.g. "eGov", "FreeWifi", "NBP", …).
 * Pass the tab name to `fetchSheetRows(tab)`.
 *
 * No service-account credentials are required — the sheet must be
 * "Anyone with the link can view" (or published).  The response is
 * consumed client-side, which is fine for non-sensitive KPI data.
 *
 * Swap this function body for an `axios.get` call against an internal
 * API endpoint if credentials become necessary later — the return type
 * (SheetRow[]) is the contract that downstream code depends on.
 */
import type { GVizResponse, SheetRow, SheetType } from "@/components/egov-dashboard/egovSheetTypes";
import { VALID_SHEET_TYPES } from "@/components/egov-dashboard/egovSheetTypes";

// ── Configuration ────────────────────────────────────────────────────────────

/** The published Google Sheet's document ID — one workbook for every project.
 *  Each project lives on its own tab (see `fetchSheetRows(tabin)`). */
const SHEET_ID = "1R4eMbx9P0oPpelsG_qbDSnKkZZIu7YnkH9PBKCDb_aM";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the GViz endpoint URL for a given tab gid. Empty gid → first tab. */
function buildUrl(gid: string | number, bustCache: boolean): string {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  const url = gid !== "" && gid !== null ? `${base}&gid=${gid}` : base;
  return bustCache ? `${url}&_=${Date.now()}` : url;
}

/** Parse a GViz cell value. Returns null for empty/null cells. */
function cellValue(cell: GVizResponse["table"]["rows"][number]["c"][number]): unknown {
  return cell?.v ?? null;
}

/** Parse a Date from a GViz cell that may be "Date(2026,0,15)", ISO, or MM/DD/YYYY. */
function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    // Serial number — unlikely but handle gracefully
    return null;
  }
  const str = String(v).trim();
  // GViz Date object: Date(2026,0,15)
  const gvMatch = str.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/);
  if (gvMatch) {
    const [, y, m, d] = gvMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }
  // ISO or common date string
  const d2 = new Date(str);
  if (!isNaN(d2.getTime())) return d2;
  return null;
}

/** Parse a number from a GViz cell value. Returns NaN for invalid/empty cells. */
function parseNumber(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? NaN : n;
}

/** Normalise a raw cell string into a SheetType, falling back to "Big Number Callout"
 *  if the value isn't in our controlled vocabulary. */
function parseType(v: unknown): SheetType {
  const str = String(v ?? "").trim() as SheetType;
  return VALID_SHEET_TYPES.includes(str) ? str : "Big Number Callout";
}

// ── Main export ─────────────────────────────────────────────────────────────

export interface FetchSheetOptions {
  /** Set to true to add a cache-busting timestamp, bypassing Google's CDN cache.
   *  Useful in dev or when the sheet data changes frequently. */
  bustCache?: boolean;
}

/** Fetch normalized `SheetRow[]` for a project gid. Throws on network/parse errors. */
export async function fetchSheetRows(
  gid: string | number,
  options: FetchSheetOptions = {}
): Promise<SheetRow[]> {
  const url = buildUrl(gid, options.bustCache ?? false);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`GViz fetch failed: ${resp.status} ${resp.statusText}`);
  }

  // GViz returns `google.visualization.Query.setResponse({…JSON…});` followed by
  // a trailing newline and (occasionally) extra junk in browser contexts. Strip
  // the JS envelope by taking everything between the outermost {…}, not just
  // from the first '{' — `JSON.parse` fails on stray `)`, `\n`, or `;` outside
  // the bracketed object.
  const raw = await resp.text();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("GViz response missing JSON envelope");
  }
  const json = raw.slice(start, end + 1);

  const data: GVizResponse = JSON.parse(json);

  if (data.table.rows.length === 0) return [];

  // First row is the header. Column indices (0-based):
  // 0=Title  1=Type  2=Count  3=Date  4=Units  5=Target  6=Group
  const rows: SheetRow[] = [];

  for (let i = 0; i < data.table.rows.length; i++) {
    const r = data.table.rows[i].c;
    const rawTitle = cellValue(r[0]);
    const rawType = cellValue(r[1]);
    const rawCount = cellValue(r[2]);
    const rawDate = cellValue(r[3]);
    const rawUnits = cellValue(r[4]);
    const rawTarget = cellValue(r[5]);
    const rawGroup = cellValue(r[6]);

    const title = String(rawTitle ?? "").trim();
    if (!title) continue; // skip rows with no title

    const count = parseNumber(rawCount);
    if (isNaN(count)) continue; // skip rows with non-numeric count

    const date = parseDate(rawDate);
    const type = parseType(rawType);
    const units = rawUnits !== null ? String(rawUnits).trim() || null : null;
    const target = parseNumber(rawTarget);
    const group = rawGroup !== null ? String(rawGroup).trim() || null : null;

    rows.push({
      title,
      type,
      count,
      date,
      units,
      target: isNaN(target) ? null : target,
      group,
    });
  }

  return rows;
}

// ── GID per project ────────────────────────────────────────────────────────────
/** Map of project → sheet gid (numeric tab ID). One workbook, one tab per project.
 *  Keep these in sync with the workbook's actual tab gids (see URL gid=...). */
export const PROJECT_GIDS = {
  egov: 0,
  freewifi: 1746879254,
  nbp: 1231886822,
  cybersecurity: 1482330105,
  elgu: 363031491,
  nippsb: 1242977005,
  iidb: 494910055,
  ilcdb: 518326122,
} as const;

export type ProjectGidKey = keyof typeof PROJECT_GIDS;