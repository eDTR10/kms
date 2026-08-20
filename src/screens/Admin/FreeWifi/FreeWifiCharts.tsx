// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import {
  Save, BarChart3, TrendingUp, MapPin, Wifi, ChevronDown, ChevronRight, Search, ChevronLeft, GripVertical,
  Plus, Trash2, X, Eye, EyeOff, Edit2, Database, Star, Palette, Link2, Upload,
} from 'lucide-react';
import { MARKER_ICON_OPTIONS } from '../../../lib/markerIcons';
import { getFreeWifiSummary } from '../../../services/freewifi';
import {
  getFreeWifiLiveData, getFreeWifiMainData, getFreeWifiTargetData, getFreeWifiMasterlistData,
  getFreeWifiChartConfigs, createFreeWifiChartConfig, updateFreeWifiChartConfig, deleteFreeWifiChartConfig,
} from '../../../services/freewifiData';
import { getKmsSettings, updateKmsSettings } from '../../../services/settings';
import Select from 'react-select';
import FreeWifiMap, { selectStyles } from '../../../components/FreeWifiMap';
import {
  getProjectOfficeId, getProjectDatasets, updateProjectDataset,
  getProjectChartConfigs, createProjectChartConfig, updateProjectChartConfig, deleteProjectChartConfig,
  reorderProjectChartConfigs, getProjectChartSource, updateProjectChartSource, uploadProjectChartSourceMarkerIcon,
  uploadProjectChartConfigCardImage,
  getProjectBuiltinWidgets, createProjectBuiltinWidget, updateProjectBuiltinWidget, deleteProjectBuiltinWidget,
} from '../../../services/projects';

export const PROVINCE_COLORS = {
  'Bukidnon': '#2563eb',
  'Camiguin': '#059669',
  'Cagayan de Oro City': '#d97706',
  'Iligan City': '#7c3aed',
  'Lanao del Norte': '#dc2626',
  'Misamis Occidental': '#0891b2',
  'Misamis Oriental': '#db2777',
};

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

// Single source of truth for chart types: metadata + picker preview in one place
const CHART_TYPES = [
  { id: 'bar-horizontal', label: 'Horizontal Bar', needsSecondary: false, minItems: 2, maxItems: 10, category: 'bar', preview: () => (
    <div className="space-y-1.5 w-full">{[100, 75, 55, 40].map((w, i) => (
      <div key={i} className="flex items-center gap-1"><div className="w-6 h-1.5 bg-gray-200 dark:bg-gray-600 rounded" /><div className="flex-1 h-3 rounded" style={{ width: `${w}%`, backgroundColor: COLORS[i] }} /></div>
    ))}</div>
  ) },
  { id: 'bar-vertical', label: 'Vertical Bar', needsSecondary: false, minItems: 2, maxItems: 8, category: 'bar', preview: () => (
    <div className="flex items-end gap-1 h-16 w-full">{[80, 60, 45, 35, 25].map((h, i) => (
      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: COLORS[i] }} />
    ))}</div>
  ) },
  { id: 'bar-stacked', label: 'Stacked Bar', needsSecondary: true, minItems: 2, maxItems: 6, category: 'bar', preview: () => (
    <div className="space-y-1.5 w-full">{[0, 1, 2].map((r) => (
      <div key={r} className="flex h-3"><div className="rounded-l" style={{ width: '40%', backgroundColor: COLORS[0] }} /><div style={{ width: '25%', backgroundColor: COLORS[1] }} /><div className="rounded-r" style={{ width: '15%', backgroundColor: COLORS[2] }} /></div>
    ))}</div>
  ) },
  { id: 'bar-grouped', label: 'Grouped Bar', needsSecondary: true, minItems: 2, maxItems: 6, category: 'bar', preview: () => (
    <div className="flex items-end gap-2 h-16 w-full">{[0, 1, 2].map((g) => (
      <div key={g} className="flex-1 flex items-end gap-0.5"><div className="flex-1 rounded-t" style={{ height: `${60 + g * 10}%`, backgroundColor: COLORS[0] }} /><div className="flex-1 rounded-t" style={{ height: `${40 + g * 15}%`, backgroundColor: COLORS[1] }} /></div>
    ))}</div>
  ) },
  // Only meaningful for a field whose values are actual dates — plotting arbitrary
  // categories left-to-right implies a trend/sequence that isn't there. Gated by
  // requiresDateField (see getChartFit) and sorted chronologically, not by count, in
  // CustomChartRenderer's 'line'/'area' cases.
  { id: 'line', label: 'Line Graph', needsSecondary: false, minItems: 3, maxItems: 8, category: 'trend', requiresDateField: true, preview: () => (
    <svg viewBox="0 0 100 40" className="w-full h-16"><polyline points="5,35 25,20 45,28 65,10 85,18 95,8" fill="none" stroke={COLORS[0]} strokeWidth="2" />{[5,25,45,65,85,95].map((x, i) => <circle key={i} cx={x} cy={[35,20,28,10,18,8][i]} r="2" fill={COLORS[0]} />)}</svg>
  ) },
  { id: 'area', label: 'Area Chart', needsSecondary: false, minItems: 3, maxItems: 8, category: 'trend', requiresDateField: true, preview: () => (
    <svg viewBox="0 0 100 40" className="w-full h-16"><path d="M5,35 L25,20 L45,28 L65,10 L85,18 L95,8 L95,40 L5,40 Z" fill={`${COLORS[0]}40`} /><polyline points="5,35 25,20 45,28 65,10 85,18 95,8" fill="none" stroke={COLORS[0]} strokeWidth="2" /></svg>
  ) },
  { id: 'pie', label: 'Pie Chart', needsSecondary: false, minItems: 2, maxItems: 8, category: 'distribution', preview: () => (
    <div className="w-16 h-16 rounded-full" style={{ background: `conic-gradient(${COLORS[0]} 0% 40%, ${COLORS[1]} 40% 65%, ${COLORS[2]} 65% 85%, ${COLORS[3]} 85% 100%)` }} />
  ) },
  { id: 'donut', label: 'Donut Chart', needsSecondary: false, minItems: 2, maxItems: 8, category: 'distribution', preview: () => (
    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${COLORS[0]} 0% 40%, ${COLORS[1]} 40% 65%, ${COLORS[2]} 65% 85%, ${COLORS[3]} 85% 100%)` }}><div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800" /></div>
  ) },
  { id: 'radar', label: 'Radar Chart', needsSecondary: false, minItems: 3, maxItems: 8, category: 'comparison', preview: () => (
    <svg viewBox="0 0 100 100" className="w-16 h-16"><polygon points="50,10 90,35 80,75 20,75 10,35" fill="none" stroke="#ddd" strokeWidth="1" /><polygon points="50,20 75,38 68,65 32,65 25,38" fill={`${COLORS[0]}40`} stroke={COLORS[0]} strokeWidth="1.5" /></svg>
  ) },
  { id: 'table', label: 'Data Table', needsSecondary: false, minItems: 1, maxItems: 8, category: 'data', preview: () => (
    <div className="space-y-1 w-full">{[1, 2, 3].map(i => <div key={i} className="flex gap-1"><div className="w-4 h-2 bg-gray-200 dark:bg-gray-600 rounded" /><div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded" /><div className="w-6 h-2 bg-gray-200 dark:bg-gray-600 rounded" /></div>)}</div>
  ) },
  { id: 'cards', label: 'Stat Cards', needsSecondary: false, minItems: 1, maxItems: 4, category: 'summary', preview: () => (
    <div className="grid grid-cols-2 gap-1.5 w-full">{[0, 1, 2, 3].map(i => <div key={i} className="rounded p-1.5 text-center" style={{ backgroundColor: `${COLORS[i]}15` }}><div className="text-sm font-bold" style={{ color: COLORS[i] }}>100</div><div className="text-[6px] text-gray-400">Label</div></div>)}</div>
  ) },
  // Unlike every other type above, this doesn't group/count `field`'s distinct values —
  // it aggregates `field` via `agg` (sum/average/count/distinct/count-equals) into one
  // number. minItems: 0 so it's never disabled by field-cardinality fit checks, which
  // don't apply to it (see getChartFit) — an aggregate cares about the field's VALUES,
  // not how many distinct ones there are.
  { id: 'aggregate-cards', label: 'Value Card', needsSecondary: false, minItems: 0, category: 'summary', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-1.5">
      <div className="h-5 w-14 rounded" style={{ backgroundColor: COLORS[0] }} />
      <div className="h-1.5 w-9 rounded bg-gray-200 dark:bg-gray-600" />
    </div>
  ) },
  { id: 'list', label: 'Ranked List', needsSecondary: false, minItems: 1, maxItems: 10, category: 'data', preview: () => (
    <div className="space-y-1.5 w-full">{[0, 1, 2].map(i => <div key={i} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded" /><div className="w-4 h-2 bg-gray-200 dark:bg-gray-600 rounded" /></div>)}</div>
  ) },
  { id: 'progress', label: 'Progress Bars', needsSecondary: false, minItems: 1, maxItems: 8, category: 'metric', preview: () => (
    <div className="space-y-1.5 w-full">{[90, 65, 40].map((w, i) => <div key={i} className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: COLORS[i] }} /></div>)}</div>
  ) },
  { id: 'treemap', label: 'Treemap', needsSecondary: false, minItems: 2, maxItems: 10, category: 'distribution', preview: () => (
    <div className="grid grid-cols-3 gap-0.5 h-16 w-full"><div className="col-span-2 row-span-2 rounded" style={{ backgroundColor: COLORS[0] }} /><div className="rounded" style={{ backgroundColor: COLORS[1] }} /><div className="rounded" style={{ backgroundColor: COLORS[2] }} /></div>
  ) },
  { id: 'comparison', label: 'Comparison', needsSecondary: true, minItems: 2, maxItems: 6, category: 'comparison', preview: () => (
    <div className="space-y-1.5 w-full">{[0, 1, 2].map(i => <div key={i} className="flex items-center gap-1"><div className="w-8 h-2 rounded" style={{ backgroundColor: `${COLORS[0]}80` }} /><div className="w-12 h-2 rounded" style={{ backgroundColor: COLORS[1] }} /></div>)}</div>
  ) },
  { id: 'funnel', label: 'Funnel', needsSecondary: false, minItems: 3, maxItems: 8, category: 'flow', preview: () => (
    <div className="flex flex-col items-center gap-1 w-full">{[100, 70, 40].map((w, i) => <div key={i} className="h-2.5 rounded" style={{ width: `${w}%`, backgroundColor: COLORS[i] }} />)}</div>
  ) },
  { id: 'half-donut', label: 'Half Donut', needsSecondary: false, minItems: 2, maxItems: 6, category: 'metric', preview: () => (
    <div className="w-16 h-8 overflow-hidden"><div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${COLORS[0]} 0% 50%, ${COLORS[1]} 50% 100%)` }}><div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800" /></div></div>
  ) },
  { id: 'horizontal-stack', label: 'Horizontal Stack', needsSecondary: false, minItems: 2, maxItems: 6, category: 'distribution', preview: () => (
    <div className="flex h-6 rounded overflow-hidden w-full">{[40, 30, 20, 10].map((w, i) => <div key={i} style={{ width: `${w}%`, backgroundColor: COLORS[i] }} />)}</div>
  ) },
];

// Layouts for chart_type='aggregate-cards' (a single aggregated number, not a category
// breakdown — see CHART_TYPES' own 'aggregate-cards' entry above, kept there only so
// existing charts' chartType still resolves). Shown in their own "Card" picker instead of
// mixed into the CHART_TYPES grid, since a card's chartType never changes — only its
// cardDesign does — so "which chart type" and "which card design" are two separate
// questions with two separate pickers, not one 22-tile grid. Rendered by AggregateValueCard.
const CARD_DESIGNS = [
  { id: 'big-number', label: 'Big Number', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-1.5">
      <div className="h-5 w-14 rounded" style={{ backgroundColor: COLORS[0] }} />
      <div className="h-1.5 w-9 rounded bg-gray-200 dark:bg-gray-600" />
    </div>
  ) },
  { id: 'icon-number', label: 'Icon + Number', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-1.5">
      <MapPin size={16} color={COLORS[0]} />
      <div className="h-4 w-12 rounded" style={{ backgroundColor: COLORS[0] }} />
      <div className="h-1.5 w-8 rounded bg-gray-200 dark:bg-gray-600" />
    </div>
  ) },
  { id: 'colored-bg', label: 'Colored Background', preview: () => (
    <div className="w-full h-16 rounded-lg flex flex-col items-center justify-center gap-1.5" style={{ backgroundColor: COLORS[0] }}>
      <div className="h-4 w-12 rounded bg-white/90" />
      <div className="h-1.5 w-8 rounded bg-white/50" />
    </div>
  ) },
  { id: 'progress', label: 'Progress / Target', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-2 px-2">
      <div className="h-1.5 w-9 rounded bg-gray-200 dark:bg-gray-600" />
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '62%', backgroundColor: COLORS[0] }} />
      </div>
    </div>
  ) },
  { id: 'compact-row', label: 'Compact Row', preview: () => (
    <div className="w-full h-16 flex items-center justify-center gap-2 px-2">
      <div className="h-5 w-10 rounded shrink-0" style={{ backgroundColor: COLORS[0] }} />
      <div className="flex-1 space-y-1"><div className="h-1.5 w-full rounded bg-gray-200 dark:bg-gray-600" /><div className="h-1.5 w-2/3 rounded bg-gray-200 dark:bg-gray-600" /></div>
    </div>
  ) },
  // Photo behind the number, gradient overlay for legibility — same visual language as
  // Awards' "Showcase" hero card elsewhere in the admin. Needs chart.cardImage (a URL).
  { id: 'image-bg', label: 'Image Background', preview: () => (
    <div className="w-full h-16 rounded-lg overflow-hidden relative flex items-end p-2"
      style={{ background: `linear-gradient(135deg, ${COLORS[0]}, ${COLORS[2]})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative h-2.5 w-10 rounded bg-white/90" />
    </div>
  ) },
  // The "quiet" alternative to big-number's bold centered digit — a small left accent bar,
  // regular-weight value and label, meant for dense dashboards where every tile doesn't
  // need to shout.
  { id: 'minimal-text', label: 'Plain Text', preview: () => (
    <div className="w-full h-16 flex flex-col justify-center gap-1.5 pl-3 border-l-2" style={{ borderColor: COLORS[0] }}>
      <div className="h-3 w-10 rounded bg-gray-300 dark:bg-gray-600" />
      <div className="h-1.5 w-14 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  ) },
];

// react-select expects {value, label} options and a single selected option object (or
// null), rather than the bare string this file's state has always stored — these two
// convert between the two shapes so every plain <select> below can become a <Select>
// (see selectStyles, imported from FreeWifiMap.tsx) without restructuring how its value
// is held in state.
const toOptions = (values, labelFor = (v) => v) => values.map((v) => ({ value: v, label: labelFor(v) }));
const selectValue = (options, current) => options.find((o) => o.value === current) || null;

// Distinct, non-blank values of `field` across `records` — populates the "equals" dropdown
// for the count_equals aggregation (Summary Card tiles / Value Card), so an admin picks an
// actual value from the data instead of free-typing something that has to match it exactly.
const distinctFieldValues = (records, field) =>
  [...new Set((records || []).map((r) => r[field]))]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(String)
    .sort();

// The Data Field dropdown's option text — surfaces whether a field looks like a date
// (see fieldIsDateLike) right in the list, since nothing else in that dropdown says so and
// a field named e.g. "Integration Date" isn't necessarily typed/detected as one.
const fieldOptionLabel = (f, fieldCardinality, fieldIsDateLike) => {
  const count = fieldCardinality[f.value] || 0;
  const countLabel = `${count} ${count === 1 ? 'value' : 'values'}`;
  return `${f.label} (${fieldIsDateLike[f.value] ? 'Date · ' : ''}${countLabel})`;
};

// Common date formats seen in imported/synced data (ISO, slash/dash numeric, and written
// month names) — used to decide whether a field is safe to plot chronologically (Line/Area
// charts). Deliberately stricter than a bare `Date.parse` check: plain numbers like "2024"
// or "12" parse as (wrong) dates in some engines, which would wrongly unlock Line/Area for
// a field that isn't actually date data.
const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}/,
  /^\d{4}\/\d{1,2}\/\d{1,2}/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
  /^\d{1,2}-\d{1,2}-\d{4}/,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i,
  /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}/i,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}$/i,
];

// True if most of `field`'s non-blank values across `records` look like dates — gates
// Line/Area chart types (see CHART_TYPES' requiresDateField) so they're only offered where
// plotting left-to-right chronologically is actually meaningful, and drives the chronological
// sort those two chart types use in CustomChartRenderer instead of the count-descending order
// every other chart type uses.
function isDateLikeField(records, field) {
  const values = (records || [])
    .map((r) => String(r[field] ?? '').trim())
    .filter((v) => v && v.toLowerCase() !== 'n/a');
  if (values.length < 3) return false;
  const sample = values.slice(0, 50);
  const matches = sample.filter((v) => DATE_PATTERNS.some((re) => re.test(v)) && !isNaN(Date.parse(v)));
  return matches.length / sample.length >= 0.8;
}

export const DATE_GROUP_BY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

// Line/Area used to group by the exact date STRING, so real-world data (mostly unique
// per-day timestamps) fanned out into dozens of single-point spikes instead of a readable
// trend — e.g. 2,882 rows across 3 years produced 97 scattered daily categories, nearly all
// with a count of 1. Bucketing into a coarser period (month by default) turns that into an
// actual trend line. Keys are built so plain string sort == chronological order (no need to
// re-parse dates just to sort), which is what CustomChartRenderer relies on.
function dateBucketKey(rawValue, groupBy) {
  const d = new Date(rawValue);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (groupBy) {
    case 'day': return d.toISOString().slice(0, 10);
    case 'week': {
      const weekStart = new Date(y, m, d.getDate() - d.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    case 'quarter': return `${y}-Q${Math.floor(m / 3) + 1}`;
    case 'year': return String(y);
    case 'month':
    default: return `${y}-${String(m + 1).padStart(2, '0')}`;
  }
}

function dateBucketLabel(key, groupBy) {
  if (groupBy === 'quarter' || groupBy === 'year') return key;
  if (groupBy === 'week') return `Week of ${new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  if (groupBy === 'day') return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// A single condition's type — 'equals' (the original, and the default when `type` is
// missing, so every condition saved before this existed keeps working unchanged),
// 'multi' ("is one of" a picked set of values — {values: [...]}, OR'd together within the
// condition), or 'range' ({from, to} — either end optional, meaning "no lower/upper
// bound"). Conditions are still ANDed together as a list; this only changes what a single
// condition can itself match.
export const CONDITION_TYPE_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'multi', label: 'Is one of' },
  { value: 'range', label: 'Range' },
];

function conditionMatches(row, c) {
  // A field entirely absent as a KEY on this row (not just blank) only happens for a
  // multi-table chart (see combineChartRecords) — it means this row's own source table
  // has no column playing that role and wasn't explicitly mapped to one, so the
  // condition simply doesn't apply to it, rather than excluding it outright.
  if (!(c.field in row)) return true;
  const raw = row[c.field];
  const type = c.type || 'equals';
  if (type === 'multi') {
    const values = (c.values || []).map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    // No values picked yet — same "not really filtering" behavior as an empty `equals`
    // value, rather than matching nothing until the admin finishes picking.
    if (!values.length) return true;
    return values.includes(String(raw ?? '').trim().toLowerCase());
  }
  if (type === 'range') {
    const hasFrom = c.from !== '' && c.from != null;
    const hasTo = c.to !== '' && c.to != null;
    if (!hasFrom && !hasTo) return true;
    // Numeric compare when both the row's value and the bounds parse as numbers (covers
    // real number fields); otherwise fall back to date compare (covers "May 19, 2022"-style
    // text date fields, the common case elsewhere in this file — see isDateLikeField).
    // Neither parsing is a match — pass the row through rather than silently dropping it.
    const rawNum = Number(raw);
    if (raw !== '' && raw != null && !isNaN(rawNum)) {
      if (hasFrom && !isNaN(Number(c.from)) && rawNum < Number(c.from)) return false;
      if (hasTo && !isNaN(Number(c.to)) && rawNum > Number(c.to)) return false;
      return true;
    }
    const rawDate = new Date(raw);
    if (!isNaN(rawDate)) {
      if (hasFrom) {
        const fromDate = new Date(c.from);
        if (!isNaN(fromDate) && rawDate < fromDate) return false;
      }
      if (hasTo) {
        const toDate = new Date(c.to);
        // Inclusive of the whole "to" day, same as the general date-range filter bar.
        if (!isNaN(toDate) && rawDate > new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999)) return false;
      }
      return true;
    }
    return true;
  }
  // 'equals' (default)
  return String(raw ?? '').trim().toLowerCase() === String(c.value ?? '').trim().toLowerCase();
}

// Admin-set filter conditions — a list of conditions (see CONDITION_TYPE_OPTIONS), ANDed
// together (a row only counts if it matches EVERY condition). One shared implementation
// for every place conditions apply: ProjectChartConfig.conditions (custom charts, in
// CustomChartRenderer), each Summary Card tile's own conditions (in computeSummaryTiles),
// and ProjectChartSource.map_conditions/breakdown_conditions (in resolveMapSites and the
// Breakdown widgets) — so "what counts as a match" can't drift between them.
export function filterRecordsByConditions(records, conditions) {
  const active = (conditions || []).filter((c) => c.field);
  if (!active.length) return records;
  return records.filter((r) => active.every((c) => conditionMatches(r, c)));
}

// Groups `records` by `keyFn(record)` into {key: metric} — a plain row-count per key when
// `isAgg` is false (every chart type's original behavior), or `aggField`'s sum/average/
// distinct-count per key when true (chart.aggregationEnabled — see CHART_AGG_OPTIONS).
// `keyFn` returning null/undefined skips that row entirely (used by the date-trend chart
// types for values that don't parse as a date, rather than lumping them into a bogus key).
// Shared by CustomChartRenderer's main grouping (fieldData) and its secondary-field
// breakdown (getSubGroups), so a stacked/grouped/comparison chart's sub-bars use the same
// metric as its main bars instead of the sub-bars silently staying row-counts.
function tallyBy(records, keyFn, isAgg, aggField, aggType) {
  const result = {};
  const helper = {};
  records.forEach((r) => {
    const k = keyFn(r);
    if (k === null || k === undefined) return;
    if (!isAgg) { result[k] = (result[k] || 0) + 1; return; }
    const rawVal = r[aggField];
    if (aggType === 'distinct') {
      if (!helper[k]) helper[k] = new Set();
      if (rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '') helper[k].add(String(rawVal).trim());
      result[k] = helper[k].size;
    } else if (aggType === 'average') {
      if (!helper[k]) helper[k] = { sum: 0, count: 0 };
      const num = Number(rawVal);
      if (!isNaN(num)) { helper[k].sum += num; helper[k].count += 1; }
      result[k] = helper[k].count > 0 ? Math.round(helper[k].sum / helper[k].count) : 0;
    } else {
      // 'sum' (default)
      const num = Number(rawVal) || 0;
      result[k] = (result[k] || 0) + num;
    }
  });
  return result;
}

// Free Wi-Fi's own fixed field list — other projects derive theirs from whichever of
// their own Datasets tables a chart is pointed at (see availableFieldsFor below).
const FREEWIFI_AVAILABLE_FIELDS = [
  { value: 'province', label: 'Province' },
  { value: 'district', label: 'District' },
  { value: 'locality', label: 'Locality' },
  { value: 'barangay', label: 'Barangay' },
  { value: 'site_type', label: 'Site Type' },
  { value: 'contract', label: 'Contract' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'site_status', label: 'Site Status' },
  { value: 'site_code', label: 'Site Code' },
  { value: 'gida', label: 'GIDA' },
  { value: 'ap', label: 'Access Point (AP)' },
  { value: 'link', label: 'Link/Connectivity' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'psgc', label: 'PSGC Code' },
];

const GRID_SIZES = [
  { id: 'full', label: 'Full Width (1/1)' },
  { id: 'half', label: 'Half Width (1/2)' },
  { id: 'third', label: 'One Third (1/3)' },
  { id: 'quarter', label: 'One Quarter (1/4)' },
];
const GRID_SIZE_OPTIONS = GRID_SIZES.map(s => ({ value: s.id, label: s.label }));

// Maps a custom chart's saved gridSize to its column span in the 12-col chart grid —
// shared by the admin preview and the public page (ProjectChartsDisplay.tsx) so a size
// can never render differently between them again (Half Width used to do nothing at all
// on the public page, because it had its own separate, incomplete copy of this mapping).
// Only ever called for custom charts and extra widget instances — the 3 original
// built-ins are always full width on both sides. Three tiers, not two: phone always gets
// one full-width column (nothing to squeeze a quarter-width chart into on a 375px
// screen); tablet (md, 768px+) gets two columns regardless of size, since three or four
// across is still too cramped there; desktop (lg, 1024px+) is where a size's real
// fraction (quarter/third/half) finally applies.
export function gridSizeClass(gridSize) {
  switch (gridSize) {
    case 'quarter': return 'col-span-12 md:col-span-6 lg:col-span-3';
    case 'third': return 'col-span-12 md:col-span-6 lg:col-span-4';
    case 'half': return 'col-span-12 md:col-span-6';
    default: return 'col-span-12';
  }
}

// Built-in chart definitions
const BUILT_IN_CHARTS = [
  { id: 'summary', label: 'Summary Card', type: 'builtin' },
  { id: 'map', label: 'Active APs Map', type: 'builtin' },
  { id: 'province-breakdown', label: 'Province Breakdown', type: 'builtin' },
];

// Datasets a built-in chart can be pointed at — mirrors the tabs on the Datasets screen
export const DATA_SOURCES = [
  { id: 'live', label: 'Live Sites' },
  { id: 'main', label: 'Main Database' },
  { id: 'target', label: 'Target' },
  { id: 'masterlist', label: 'Masterlist' },
];
const DATA_SOURCE_OPTIONS = DATA_SOURCES.map(s => ({ value: s.id, label: s.label }));

// Aggregation option lists — Summary Card tiles don't offer "Average" (that vocabulary was
// only ever added for the Value Card), everything else overlaps.
const TILE_AGG_OPTIONS = [
  { value: 'distinct', label: 'Count unique values' },
  { value: 'count_equals', label: 'Count rows where equals...' },
  { value: 'sum', label: 'Sum values' },
  { value: 'count', label: 'Count all rows' },
];
const CARD_AGG_OPTIONS = [
  { value: 'sum', label: 'Sum values' },
  { value: 'average', label: 'Average values' },
  { value: 'count', label: 'Count all rows' },
  { value: 'distinct', label: 'Count unique values' },
  { value: 'count_equals', label: 'Count rows where equals...' },
];
// Every other chart type's OPTIONAL per-category aggregation (chart.aggregationEnabled) —
// "count" and "count rows where equals" are deliberately left out: "count" is just what
// every chart type already does with aggregation off, and "equals" needs a condition value
// that doesn't fit a per-category breakdown the way it does a single Value Card number.
const CHART_AGG_OPTIONS = [
  { value: 'sum', label: 'Sum values' },
  { value: 'average', label: 'Average values' },
  { value: 'distinct', label: 'Count unique values' },
];

// A general filter (GlobalDateFilterBar) is either an 'exact' dropdown of a column's
// distinct values, or a 'range' From/To pair (dates, compared as timestamps) — see
// FilterSettingsModal and filterTablesByGeneralFilter.
const FILTER_TYPE_OPTIONS = [
  { value: 'exact', label: 'Exact value (dropdown)' },
  { value: 'range', label: 'Range (From/To)' },
];

// Built-in charts' data-source picks are published settings (KmsSettings), not per-browser
// state — whatever the admin sets here is exactly what the public page shows, with no
// selector of its own there.
export const BUILTIN_SOURCE_SETTING = {
  summary: 'freewifi_summary_source',
  map: 'freewifi_map_source',
  'province-breakdown': 'freewifi_breakdown_source',
};

export const DEFAULT_SUMMARY_STYLE = { colorFrom: '#0038A8', colorTo: '#0055f1', orientation: 'row', accentColor: '#FCD116' };

// Picks readable text (near-black or white) for an arbitrary accent background,
// so an admin-chosen color never ends up with unreadable text on the AP tile.
function contrastTextColor(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return '#111827';
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

// {r,g,b} for an arbitrary hex color, so it can be dropped into an rgba(...) string at any
// opacity — used for the 'image-bg' card design's gradient (card_gradient_color), which
// needs the SAME color at several different opacities, not just the flat swatch a CSS
// `background-color` would give.
function hexToRgb(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(c.slice(0, 2), 16), g: parseInt(c.slice(2, 4), 16), b: parseInt(c.slice(4, 6), 16) };
}

// Masterlist uses different field names (lat/long, location_name) than the other three
// datasets (latitude/longitude, site_name) — normalize so shared chart code just works.
export function normalizeMasterlistRecord(r) {
  return {
    ...r,
    site_name: r.site_name || r.location_name,
    latitude: r.latitude ?? r.lat,
    longitude: r.longitude ?? r.long,
  };
}

// Client-side equivalent of the backend's Live-only /summary endpoint, so Main/Target/
// Masterlist can drive the Summary Card too. `hasApField` is false for Target/Masterlist
// (no `ap` column in those tables), used to hide the "Total Active APs" tile.
export function computeSummaryStats(records) {
  const provinces = new Set(), localities = new Set(), barangays = new Set(), ids = new Set();
  let apCount = 0, hasApField = false;
  records.forEach(r => {
    if (r.province) provinces.add(r.province);
    if (r.locality) localities.add(r.locality);
    if (r.barangay) barangays.add(r.barangay);
    if (r.r10_site_id) ids.add(r.r10_site_id);
    if ('ap' in r) {
      hasApField = true;
      if (r.ap === 'TRUE' || r.ap === 'true') apCount += 1;
    }
  });
  return {
    total_locations: ids.size,
    provinces_count: provinces.size,
    municipalities_count: localities.size,
    barangays_count: barangays.size,
    total_active_aps: apCount,
    hasApField,
  };
}

// Client-side equivalent of the backend's by_province aggregation, for non-Live sources.
export function computeProvinceBreakdown(records) {
  const byProvince = {};
  records.forEach(r => {
    const prov = r.province || 'N/A';
    if (!byProvince[prov]) byProvince[prov] = { total_sites: 0, ap_count: 0, site_types: {} };
    byProvince[prov].total_sites += 1;
    if (r.ap === 'TRUE' || r.ap === 'true') byProvince[prov].ap_count += 1;
    if (r.site_type) byProvince[prov].site_types[r.site_type] = (byProvince[prov].site_types[r.site_type] || 0) + 1;
  });
  return byProvince;
}

// A ProjectDatasetField can link its values to another dataset's column (see
// ProjectDatasetField.reference_dataset/reference_column on the backend) — "table A's
// province_id column matches table B's id column". This indexes table B's rows by that
// column's value (first row wins on duplicates) so a matching row can be found in O(1)
// per record instead of re-scanning table B for every row of table A.
function buildReferenceLookup(allTables, datasetId, column) {
  const table = allTables.find((t) => t.id === datasetId);
  if (!table) return null;
  const index = {};
  (table.rows || []).forEach((r) => {
    const key = r.values?.[column];
    if (key === null || key === undefined || key === '') return;
    const k = String(key);
    if (!(k in index)) index[k] = r.values || {};
  });
  return { fields: table.fields || [], index };
}

// The "auto-merge all columns" table-link behavior: for every field on `tableFields` that
// links to another dataset, matches each record's value for that field against the linked
// table (via buildReferenceLookup) and merges in EVERY column of the matched row, keyed as
// "<linking field name>__<their column name>" (mirrors referencedFieldOptionsFor's option
// values below, and Django's own `__` relation-traversal convention) so two different
// links — or a link and a same-named local column — can never collide. No-op (returns
// `records` unchanged) when this table has no linked fields.
export function mergeReferencedFields(records, tableFields, allTables) {
  const refFields = (tableFields || []).filter((f) => f.reference_dataset && f.reference_column);
  if (refFields.length === 0) return records;
  const lookups = refFields
    .map((f) => ({ field: f, lookup: buildReferenceLookup(allTables, f.reference_dataset, f.reference_column) }))
    .filter((l) => l.lookup);
  if (lookups.length === 0) return records;
  return records.map((r) => {
    const extra = {};
    lookups.forEach(({ field, lookup }) => {
      const key = r[field.name];
      if (key === null || key === undefined || key === '') return;
      const matched = lookup.index[String(key)];
      if (!matched) return;
      lookup.fields.forEach((rf) => { extra[`${field.name}__${rf.name}`] = matched[rf.name]; });
    });
    return Object.keys(extra).length ? { ...r, ...extra } : r;
  });
}

// The chart-builder-facing half of the same link: extra field OPTIONS a table's linked
// column(s) make available (its own columns, from availableFieldsFor, plus these) — same
// "<linking field name>__<their column name>" value scheme mergeReferencedFields keys
// records with, so picking one of these here always resolves to a real key on the merged
// records. Labeled "<their column> (via <linking column>)" so it's clear at a glance which
// link a merged field came through when a table links to more than one other table.
export function referencedFieldOptionsFor(table, allTables) {
  const refFields = (table?.fields || []).filter((f) => f.reference_dataset && f.reference_column);
  const options = [];
  refFields.forEach((f) => {
    const target = allTables.find((t) => t.id === f.reference_dataset);
    (target?.fields || []).forEach((rf) => {
      options.push({ value: `${f.name}__${rf.name}`, label: `${rf.label} (via ${f.label})` });
    });
  });
  return options;
}

// A chart's full list of source table ids — the primary Table select (chart.dataset)
// plus any additional tables added via ExtraTablesEditor (chart.extraDatasets),
// deduplicated and coerced to numbers (dataset ids arrive as numbers from the backend
// but sometimes as select-option strings while the modal is being edited).
export function chartDatasetIds(chart) {
  const ids = [chart?.dataset, ...(chart?.extraDatasets || [])]
    .map((id) => (id === '' || id == null ? null : Number(id)))
    .filter((id) => id !== null && !Number.isNaN(id));
  return [...new Set(ids)];
}

// Which column a multi-table chart's field "slot" (Data Field/Secondary Field/
// Aggregation Field, or a Filter condition's own field) should read from for ONE
// specific source table — every table defaults to the SAME column name the admin picked
// for the primary table, unless explicitly mapped to a different one of that table's own
// columns via ExtraTablesEditor/ConditionsEditor's per-table mapping rows.
function resolveMappedField(baseField, fieldMap, datasetId) {
  // `||` (not `??`) deliberately — clearing a mapping row leaves an empty string
  // behind (see FieldMapRow's isClearable), which should fall back to the base field
  // exactly like never having mapped it at all, not resolve to a blank/nonexistent
  // column name.
  return fieldMap?.[datasetId] || fieldMap?.[String(datasetId)] || baseField;
}

// Combines every one of a chart's source tables' rows into one record set (see
// ProjectChartConfig.extra_datasets/field_map/secondary_field_map/
// aggregation_field_map) — CustomChartRenderer/AggregateValueCard/
// filterRecordsByConditions never have to know a chart spans more than one table: every
// field slot the chart actually uses (Data Field, Secondary Field, Aggregation Field,
// each Filter condition) gets re-keyed here onto record[<that slot's chart-level name>],
// reading from whichever column the admin mapped for that row's own table (falling back
// to the SAME column name when a table wasn't explicitly mapped). A slot whose resolved
// column isn't actually one of that table's own columns is left UNSET on the record
// (not forced to blank) rather than copied through — see conditionMatches' `field in
// row` check, which relies on that absence to mean "this filter condition doesn't apply
// to rows from this table" instead of "this table's rows all fail it".
export function combineChartRecords(chart, recordsByDataset, genericTables) {
  const datasetIds = chartDatasetIds(chart);
  if (datasetIds.length <= 1) return recordsByDataset[datasetIds[0]] || [];
  const slots = [
    [chart.field, chart.fieldMap],
    [chart.secondaryField, chart.secondaryFieldMap],
    [chart.aggregationField, chart.aggregationFieldMap],
    ...(chart.conditions || []).map((c) => [c.field, c.fieldMap]),
  ].filter(([name]) => !!name);
  const rows = [];
  datasetIds.forEach((id) => {
    const table = (genericTables || []).find((t) => t.id === id);
    const ownFieldNames = new Set((table?.fields || []).map((f) => f.name));
    // Per-table row filter (chart.tableConditions[id]) — narrows THIS table's own rows,
    // by its own column names, before they're merged with any other table's. Independent
    // of the shared `conditions` above (which apply to the combined set instead): e.g.
    // "only Table 2's Active rows" without that also excluding Table 1's inactive ones.
    const tableRecords = filterRecordsByConditions(recordsByDataset[id] || [], chart.tableConditions?.[id]);
    tableRecords.forEach((r) => {
      const remapped = { ...r, __datasetId: id };
      slots.forEach(([name, map]) => {
        const sourceCol = resolveMappedField(name, map, id);
        if (ownFieldNames.has(sourceCol)) {
          remapped[name] = r[sourceCol];
        } else if (name !== sourceCol) {
          delete remapped[name];
        }
      });
      rows.push(remapped);
    });
  });
  return rows;
}

// Resolves the three independent per-widget dataset tags (ProjectChartSource's
// summary_dataset/map_dataset/breakdown_dataset) against this project's actual Datasets
// tables into row arrays — used on initial load and again after saving Data Source, since
// each built-in can point at a different table (or the same one).
export function buildTaggedRecords(tables, source) {
  const rowsFor = (datasetId) => {
    const table = tables.find(t => t.id === datasetId);
    const records = (table?.rows || []).map(r => ({ id: r.id, ...(r.values || {}) }));
    return mergeReferencedFields(records, table?.fields, tables);
  };
  return {
    summary: rowsFor(source?.summary_dataset),
    map: rowsFor(source?.map_dataset),
    breakdown: rowsFor(source?.breakdown_dataset),
  };
}

// Turns a Map-tagged table's raw rows into geocoded, tooltip-ready records — shared by
// the admin widget and the public page so a coordinate-parsing fix (e.g. the combined
// "lat, lng" column format) only has to happen in one place. Returns `mapped` (every row
// with valid latitude/longitude), `tooltipFieldDefs` (resolved {name,label} pairs for the
// admin-picked hover-tooltip columns), `filterFieldDefs` (same shape, for the columns
// FreeWifiMap should render as filter dropdowns — see map_filter_fields), and
// `colorFieldDef` (same shape or null, for the admin-picked marker-color/legend column —
// see map_color_field; independent of filterFieldDefs, doesn't have to be one of them).
export function resolveMapSites(records, source, taggedFields) {
  const latField = source?.latitude_field, lngField = source?.longitude_field;
  if (!latField || !lngField) return { mapped: [], tooltipFieldDefs: [], filterFieldDefs: [], colorFieldDef: null };
  // Admin-set floor under map_filter_fields (those are visitor-interactive dropdowns;
  // this always applies regardless of what a visitor picks there) — see map_conditions.
  const conditioned = filterRecordsByConditions(records, source?.map_conditions);
  // Same field tagged for both = a combined "lat, lng" column (e.g.
  // "8.486735683, 124.6322367") — split on the comma instead of reading two columns.
  const combined = latField === lngField;
  const mapped = conditioned
    .map(r => {
      if (combined) {
        const [rawLat, rawLng] = String(r[latField] ?? '').split(',');
        return { ...r, latitude: Number(String(rawLat ?? '').trim()), longitude: Number(String(rawLng ?? '').trim()) };
      }
      return { ...r, latitude: Number(r[latField]), longitude: Number(r[lngField]) };
    })
    .filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  const tooltipFieldDefs = (source?.tooltip_fields || [])
    .map(name => taggedFields.find(f => f.name === name))
    .filter(Boolean)
    .map(f => ({ name: f.name, label: f.label }));
  const filterFieldDefs = (source?.map_filter_fields || [])
    .map(name => taggedFields.find(f => f.name === name))
    .filter(Boolean)
    .map(f => ({ name: f.name, label: f.label }));
  const colorFieldRaw = source?.map_color_field && taggedFields.find(f => f.name === source.map_color_field);
  const colorFieldDef = colorFieldRaw ? { name: colorFieldRaw.name, label: colorFieldRaw.label } : null;
  return { mapped, tooltipFieldDefs, filterFieldDefs, colorFieldDef };
}

// Charts page's admin-defined filters — applied once, upstream of every built-in AND
// custom chart, by filtering each table's own rows before anything downstream reads them.
// `filters` = ProjectChartSource.general_filters: [{label, type: 'range'|'exact'}, ...].
// `values` = { [label]: {from,to} for 'range' | string for 'exact' }. A row must match
// EVERY filter that has a value set (AND across active filters), read via that table's OWN
// tagged column for that filter's label (ProjectDataset.general_filter_fields) — a filter
// the table hasn't tagged, or one with nothing entered, doesn't constrain it. There's no
// special-cased date concept anymore: what used to be the hardcoded From/To filter is just
// whichever filter(s) the admin gave type='range', using the exact same mechanism as any
// other filter. Shared by the admin preview and the public page so both filter identically.
export function filterTablesByGeneralFilter(tables, filters, values) {
  const typeByLabel = {};
  (filters || []).forEach((f) => { typeByLabel[f.label] = f.type; });
  const active = Object.entries(values || {}).filter(([label, v]) =>
    typeByLabel[label] === 'range' ? Boolean(v?.from || v?.to) : Boolean(v));
  if (!active.length) return tables;
  return tables.map((t) => {
    const fieldMap = t.general_filter_fields || {};
    const applicable = active.filter(([label]) => fieldMap[label]);
    if (!applicable.length) return t;
    const rows = (t.rows || []).filter((r) => applicable.every(([label, val]) => {
      const raw = r.values?.[fieldMap[label]];
      if (typeByLabel[label] === 'range') {
        if (!raw) return false;
        const time = new Date(raw).getTime();
        if (Number.isNaN(time)) return false;
        const fromTime = val.from ? new Date(val.from).getTime() : -Infinity;
        // Inclusive through the end of the "To" day — a bare date has no time component,
        // so without this, picking the same day for From and To would match nothing.
        const toTime = val.to ? new Date(val.to).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;
        return time >= fromTime && time <= toTime;
      }
      return String(raw ?? '').trim().toLowerCase() === String(val).trim().toLowerCase();
    }));
    return { ...t, rows };
  });
}

// The Summary Card's "as of" label — the active range, if a range-type filter is set and
// has a value, so the card is honest about which slice of data it's summarizing instead of
// always claiming to be current; falls back to `today` (the real calendar date) otherwise,
// since that's genuinely what an unfiltered summary is "as of". Shared by the admin preview
// (both the live widget and its style-editor preview) and the public page.
export function summaryAsOfLabel(dateFrom, dateTo, today) {
  const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `${fmt(dateFrom)} onward`;
  if (dateTo) return `through ${fmt(dateTo)}`;
  return today;
}

// { [filterLabel]: [{value,label}, ...] } — one option list per 'exact'-type filter, each
// the union of distinct values across every table that tagged a column for THAT label
// (tables can call the same concept by different column names). 'range' filters don't need
// discrete options (they're date inputs). Computed from the full, unfiltered table list so
// picking a value doesn't shrink what's offered by another filter.
export function generalFilterOptionsFor(tables, filters) {
  const result = {};
  (filters || []).forEach(({ label, type }) => {
    if (type === 'range') return;
    // Keyed by lowercase so e.g. "Cagayan de Oro" (tagged on one table) and "cagayan de
    // oro" (tagged on another table under the same filter) collapse into ONE dropdown
    // option instead of showing as two — filterTablesByGeneralFilter already matches
    // case-insensitively (see its `.toLowerCase()` comparison below), so surfacing every
    // raw casing here was pure duplication, not a real distinction. First casing seen
    // wins for display.
    const values = new Map();
    (tables || []).forEach((t) => {
      const field = (t.general_filter_fields || {})[label];
      if (!field) return;
      (t.rows || []).forEach((r) => {
        const v = r.values?.[field];
        if (v === null || v === undefined) return;
        const trimmed = String(v).trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!values.has(key)) values.set(key, trimmed);
      });
    });
    result[label] = [...values.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, display]) => ({ value: display, label: display }));
  });
  return result;
}

// Filter bar rendered above every chart on the Charts page (built-in and custom) — shared
// between the admin preview and the public page. Renders one control per admin-defined
// filter: a From/To date pair for type='range', a searchable dropdown for type='exact'.
// Nothing configured means an (almost) empty bar — see the admin's own always-visible
// wrapper around this for the "add a filter" entry point when that's the case.
export function GlobalDateFilterBar({ filters = [], values = {}, onChange, onClear, generalFilterOptions = {} }) {
  const hasFilter = filters.some((f) => {
    const v = values[f.label];
    return f.type === 'range' ? Boolean(v?.from || v?.to) : Boolean(v);
  });
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filters</span>
      {filters.length === 0 && (
        <span className="text-xs text-gray-400">None configured yet.</span>
      )}
      {filters.map((f) => f.type === 'range' ? (
        <div key={f.label} className="flex flex-wrap items-center gap-1.5">
          <label className="text-xs text-gray-500 dark:text-gray-400">{f.label} from</label>
          <input type="date" value={values[f.label]?.from || ''}
            onChange={(e) => onChange(f.label, { ...(values[f.label] || {}), from: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          <label className="text-xs text-gray-500 dark:text-gray-400">to</label>
          <input type="date" value={values[f.label]?.to || ''}
            onChange={(e) => onChange(f.label, { ...(values[f.label] || {}), to: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
      ) : (
        <div key={f.label} className="min-w-[160px]">
          <Select value={selectValue(generalFilterOptions[f.label] || [], values[f.label] || '')}
            onChange={(opt) => onChange(f.label, opt ? opt.value : '')}
            options={generalFilterOptions[f.label] || []} placeholder={f.label} isClearable styles={selectStyles} />
        </div>
      ))}
      {hasFilter && (
        <button type="button" onClick={onClear} className="text-xs font-medium text-red-500 hover:underline">Clear</button>
      )}
    </div>
  );
}

// Generic (non-Free-Wi-Fi) Summary Card tile computation — shared by the live widget and
// its style-editor preview so the preview always shows real numbers instead of placeholders.
export function computeSummaryTiles(records, source, taggedFields) {
  // Older saves stored plain field-name strings (sum-only) — normalize those too.
  const tileConfigs = (source?.summary_fields || [])
    .map(t => (typeof t === 'string' ? { field: t, agg: 'sum' } : t))
    .filter(t => t.agg === 'count' || t.field);
  // No tiles configured yet → fall back to a single row-count tile so the widget isn't
  // blank before anyone visits "Data Source". Once tiles are configured, the first one IS
  // the lead tile (e.g. a distinct-count "Total Active Locations" rather than the raw row
  // count) — nothing is auto-prepended.
  const tiles = tileConfigs.length
    ? tileConfigs.map((cfg) => {
        const fieldDef = (taggedFields || []).find(f => f.name === cfg.field);
        // Each tile can carry its own filter conditions, independent of every other
        // tile's — e.g. one tile counts all rows, another only Province = Bukidnon rows.
        const rows = filterRecordsByConditions(records, cfg.conditions);
        let value = 0;
        if (cfg.agg === 'count') {
          value = rows.length;
        } else if (cfg.agg === 'distinct') {
          value = new Set(rows.map(r => String(r[cfg.field] ?? '').trim()).filter(Boolean)).size;
        } else if (cfg.agg === 'count_equals') {
          const target = String(cfg.equals ?? '').trim().toLowerCase();
          value = rows.filter(r => String(r[cfg.field] ?? '').trim().toLowerCase() === target).length;
        } else {
          value = rows.reduce((s, r) => s + (Number(r[cfg.field]) || 0), 0);
        }
        return { label: cfg.label || fieldDef?.label || cfg.field || 'Count', value, highlight: Boolean(cfg.highlight) };
      })
    : [{ label: 'Total Records', value: records.length }];
  // Tile 0 is always the lead (big number). The highlighted/accent tile is whichever tile
  // got starred in "Data Source"; if none was, it defaults to the last tile.
  const explicitAccentIndex = tiles.findIndex(t => t.highlight);
  const accentIndex = tiles.length > 1 ? (explicitAccentIndex !== -1 ? explicitAccentIndex : tiles.length - 1) : -1;
  const hasAccent = accentIndex !== -1;
  return {
    lead: tiles[0],
    rest: tiles.filter((_, idx) => idx !== 0 && idx !== accentIndex),
    accentTile: hasAccent ? tiles[accentIndex] : null,
  };
}

// Renders the tiles (lead/rest/accent) computed above — used by both the live Summary
// Card widget and its style-editor preview, so they're always visually identical. "Row"
// is a single flex row that never wraps regardless of how many tiles are configured
// (a fixed grid-cols count would wrap extra tiles onto their own row).
export function renderSummaryCardBody({ lead, rest, accentTile }, style) {
  const accentTextColor = contrastTextColor(style.accentColor);
  if (style.orientation === 'stacked') {
    return (
      <div className="space-y-3">
        <div><p className="text-sm text-white/70 mb-1">{lead.label}</p><p className="text-4xl font-black">{lead.value.toLocaleString()}</p></div>
        {rest.map(t => (
          <div key={t.label} className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-white/70">{t.label}</span><span className="text-2xl font-black">{t.value.toLocaleString()}</span>
          </div>
        ))}
        {accentTile && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: style.accentColor }}>
            <span className="text-sm" style={{ color: accentTextColor }}>{accentTile.label}</span>
            <span className="text-2xl font-black" style={{ color: accentTextColor }}>{accentTile.value.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-4 md:gap-6">
      <div className="flex-1 min-w-[120px]"><p className="text-sm text-white/70 mb-1 truncate">{lead.label}</p><p className="text-4xl font-black">{lead.value.toLocaleString()}</p></div>
      {rest.map(t => (
        <div key={t.label} className="flex-1 min-w-[120px] bg-white/10 rounded-xl p-4">
          <p className="text-sm text-white/70 mb-1 truncate">{t.label}</p><p className="text-3xl font-black">{t.value.toLocaleString()}</p>
        </div>
      ))}
      {accentTile && (
        <div className="flex-1 min-w-[120px] rounded-xl p-4" style={{ backgroundColor: style.accentColor }}>
          <p className="text-sm mb-1 truncate" style={{ color: accentTextColor }}>{accentTile.label}</p>
          <p className="text-3xl font-black" style={{ color: accentTextColor }}>{accentTile.value.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

// Breakdown accordion — shared by the public page and any extra Breakdown widget
// instance (see ProjectBuiltinWidget). Same visual language/raw-data table as the
// admin's ORIGINAL singleton Breakdown widget, minus its admin-only "clicking a row also
// filters the Map" cross-widget wiring — self-contained, since neither the public page
// nor an independent extra instance has another widget that needs to react to which
// group is open.
const BREAKDOWN_ACCORDION_PAGE_SIZE = 50;
export function BreakdownAccordion({ records, source, taggedFields }) {
  const [search, setSearch] = useState('');
  const [openGroup, setOpenGroup] = useState(null);
  const [page, setPage] = useState(1);

  const groupField = source.group_field;
  const rawDataFieldDefs = (source.breakdown_fields || []).length
    ? source.breakdown_fields.map(name => taggedFields.find(f => f.name === name)).filter(Boolean)
    : taggedFields;

  const rowsByGroup = {};
  records.forEach(r => {
    const key = r[groupField] || 'N/A';
    (rowsByGroup[key] = rowsByGroup[key] || []).push(r);
  });
  const maxCount = Math.max(...Object.values(rowsByGroup).map(rows => rows.length), 1);
  const query = search.trim().toLowerCase();
  const entries = Object.entries(rowsByGroup)
    .filter(([group, rows]) => !query
      || group.toLowerCase().includes(query)
      || rows.some(r => rawDataFieldDefs.some(f => String(r[f.name] ?? '').toLowerCase().includes(query))))
    .map(([group, rows]) => [group, rows.length])
    .sort((a, b) => b[1] - a[1]);

  const toggleGroup = (group) => {
    if (openGroup === group) { setOpenGroup(null); return; }
    setOpenGroup(group);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
      </div>
      {query && entries.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No matches for "{search}"</p>
      )}
      {entries.map(([group, count]) => {
        const isOpen = openGroup === group;
        const groupLabelMatches = query && group.toLowerCase().includes(query);
        const groupRows = records.filter(r => (r[groupField] || 'N/A') === group);
        const filteredRows = !query || groupLabelMatches
          ? groupRows
          : groupRows.filter(r => rawDataFieldDefs.some(f => String(r[f.name] ?? '').toLowerCase().includes(query)));
        const totalPages = Math.max(1, Math.ceil(filteredRows.length / BREAKDOWN_ACCORDION_PAGE_SIZE));
        const clampedPage = Math.min(page, totalPages);
        const pageRows = filteredRows.slice((clampedPage - 1) * BREAKDOWN_ACCORDION_PAGE_SIZE, clampedPage * BREAKDOWN_ACCORDION_PAGE_SIZE);
        return (
          <div key={group} className={`border rounded-xl overflow-hidden transition-colors ${
            isOpen ? 'border-[#0038A8]' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <button type="button" onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-2 sm:gap-4 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-left font-medium text-gray-900 dark:text-white w-20 sm:w-[200px] shrink-0 truncate" title={group}>{group}</span>
              <div className="flex-1 min-w-0 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#0038A8]" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16 sm:w-20 text-right shrink-0 truncate">{count} rows</span>
              {isOpen ? <ChevronDown size={18} className="text-gray-400 shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
            </button>
            {isOpen && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-3">{filteredRows.length.toLocaleString()} row{filteredRows.length === 1 ? '' : 's'}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {rawDataFieldDefs.map(f => (
                          <th key={f.id} className="text-left py-1.5 px-2 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr><td colSpan={rawDataFieldDefs.length || 1} className="text-center py-6 text-xs text-gray-400">No matching rows.</td></tr>
                      ) : pageRows.map((r, i) => (
                        <tr key={r.id ?? i} className="border-t border-gray-100 dark:border-gray-800">
                          {rawDataFieldDefs.map(f => (
                            <td key={f.id} className="py-1.5 px-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{String(r[f.name] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Page {clampedPage} of {totalPages}</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={clampedPage === 1}
                        className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Prev</button>
                      <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={clampedPage === totalPages}
                        className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Display label for each of the 3 widget types an extra ProjectBuiltinWidget instance
// can be — used wherever a widget instance needs a fallback title (before the admin sets
// its own via DataSourceModal) or a name in the "Add widget" menu.
export const WIDGET_TYPE_LABELS = { summary: 'Summary', map: 'Map', 'province-breakdown': 'Breakdown' };

// Turns one ProjectBuiltinWidget row (a backend id + widget_type + settings blob) into
// the chart-like shape the Charts page's unified allCharts list/render loop expects —
// mirrors chartConfigFromBackend's role for custom charts. `id` is prefixed ("widget-42")
// so it can never collide with either a custom chart's numeric id or a singleton
// built-in's fixed string id ('summary'/'map'/'province-breakdown') within the same
// chart_order list; `dbId` keeps the real numeric id around for the update/delete calls
// that actually need it.
export function builtinWidgetFromBackend(w) {
  return {
    id: `widget-${w.id}`,
    dbId: w.id,
    type: 'builtin-extra',
    widgetType: w.widget_type,
    settings: w.settings || {},
    gridSize: w.grid_size || 'full',
    visible: w.visible !== false,
    showOnUser: w.show_on_user !== false,
    // Public-page-only title toggle — top-level on the model (not buried in `settings`)
    // since it's a meta-flag about the instance regardless of widget_type, same as
    // visible/showOnUser above.
    hideTitle: !!w.hide_title,
  };
}

// Title for an extra widget instance — whichever of its type's own *_title settings key
// is set (see DataSourceModal's handleSave payload shape, reused verbatim for instances),
// falling back to the generic type label.
export function builtinWidgetTitle(chart) {
  const s = chart.settings || {};
  return s.summary_title || s.map_title || s.breakdown_title || WIDGET_TYPE_LABELS[chart.widgetType] || 'Widget';
}

// Two custom charts showing the same type + fields are duplicates
// Value Cards on the same field but a different aggregation (e.g. Sum vs. Average of
// "budget") are legitimately different charts, not duplicates — include agg/equals so
// they don't collide under one signature. Same reasoning for conditions: "Sum of Budget
// where Province=Bukidnon" and "Sum of Budget where Province=Misamis" are different
// charts even though type/field/agg all match.
const chartSignature = (c) => `${c.chartType}|${c.field}|${c.secondaryField || ''}` +
  (c.chartType === 'aggregate-cards' ? `|${c.agg || 'sum'}|${c.equals || ''}` : '') +
  `|${JSON.stringify(c.conditions || [])}`;

// Backend chart-config rows are snake_case; the renderer/local state use this camelCase
// shape. `id` stays numeric (a real backend id) so it's distinguishable from the legacy
// client-generated `custom-<timestamp>` ids of charts created before backend sync existed.
export function chartConfigFromBackend(c) {
  return {
    id: c.id,
    type: 'custom',
    title: c.title,
    chartType: c.chart_type,
    field: c.field,
    secondaryField: c.secondary_field || '',
    // Only meaningful for chart_type='aggregate-cards' — see ProjectChartConfig's model
    // docstring. Defaulted here (not left undefined) so the "Add Custom Chart" modal's
    // Aggregation select always has a valid value even for charts saved before this
    // existed.
    agg: c.agg || 'sum',
    equals: c.agg_equals || '',
    // Optional, for every chart_type EXCEPT 'aggregate-cards' — see the model field's
    // docstring. Off by default (count rows, the original behavior).
    aggregationEnabled: !!c.aggregation_enabled,
    aggregationField: c.aggregation_field || '',
    aggregationType: c.aggregation_type || 'sum',
    // Only meaningful for chart_type='aggregate-cards' — which of CARD_DESIGNS this Value
    // Card uses (blank/'big-number' is the original plain-number look), plus that design's
    // own settings: cardIcon (icon-number), cardColor (all designs but big-number), and
    // cardTarget (progress).
    cardDesign: c.card_design || 'big-number',
    cardIcon: c.card_icon || '',
    cardColor: c.card_color || '',
    cardTarget: c.card_target || '',
    cardImage: c.card_image || '',
    cardTextAlign: c.card_text_align || 'left',
    cardGradientColor: c.card_gradient_color || '#000000',
    cardDescription: c.card_description || '',
    // Any chart_type — hides the public page's title/subtitle header above this chart.
    // The admin's own preview always shows it regardless (see the model field's docstring).
    hideTitle: !!c.hide_title,
    // Only meaningful for chart_type in ('line', 'area') — see DATE_GROUP_BY_OPTIONS and
    // CustomChartRenderer's dateBucketKey usage.
    dateGroupBy: c.date_group_by || 'month',
    cumulative: !!c.cumulative,
    // Per-chart display overrides for `field`'s raw values — see the model field's
    // docstring. Applied in CustomChartRenderer's displayLabel helper.
    valueLabels: c.value_labels || {},
    // {field, value} pairs, ANDed together, narrowing which rows this chart counts —
    // independent of chart_type, unlike agg/agg_equals. See CustomChartRenderer.
    conditions: c.conditions || [],
    gridSize: c.grid_size || 'full',
    showOnUser: c.show_on_user,
    showAllCategories: c.show_all_categories,
    visible: c.visible,
    // Only present on ProjectChartConfig rows (the non-Free-Wi-Fi path) — which of a
    // project's own Datasets tables this chart counts rows from.
    dataset: c.dataset,
    // Additional source tables beyond `dataset`, and the per-table column overrides for
    // field/secondaryField/aggregationField (and each Filter condition's own field, kept
    // inline on the condition itself) — see combineChartRecords. Empty/{} for every
    // chart saved before multi-table existed, which keeps reading from `dataset` alone.
    extraDatasets: c.extra_datasets || [],
    fieldMap: c.field_map || {},
    secondaryFieldMap: c.secondary_field_map || {},
    aggregationFieldMap: c.aggregation_field_map || {},
    // Per-table row filters (see combineChartRecords) — {"<dataset id>": [condition...]}.
    tableConditions: c.table_conditions || {},
  };
}

export function chartConfigToBackend(chart) {
  const isCard = chart.chartType === 'aggregate-cards';
  const isDateTrend = chart.chartType === 'line' || chart.chartType === 'area';
  return {
    title: chart.title,
    chart_type: chart.chartType,
    field: chart.field,
    secondary_field: chart.secondaryField || '',
    agg: isCard ? (chart.agg || 'sum') : '',
    agg_equals: isCard ? (chart.equals || '') : '',
    aggregation_enabled: !isCard && !!chart.aggregationEnabled,
    aggregation_field: !isCard ? (chart.aggregationField || '') : '',
    aggregation_type: !isCard ? (chart.aggregationType || 'sum') : '',
    card_design: isCard ? (chart.cardDesign || 'big-number') : '',
    card_icon: isCard ? (chart.cardIcon || '') : '',
    card_color: isCard ? (chart.cardColor || '') : '',
    card_target: isCard ? (chart.cardTarget || '') : '',
    card_image: isCard ? (chart.cardImage || '') : '',
    card_text_align: isCard ? (chart.cardTextAlign || 'left') : '',
    card_gradient_color: isCard ? (chart.cardGradientColor || '#000000') : '',
    card_description: isCard ? (chart.cardDescription || '') : '',
    hide_title: !!chart.hideTitle,
    date_group_by: isDateTrend ? (chart.dateGroupBy || 'month') : '',
    cumulative: isDateTrend ? !!chart.cumulative : false,
    value_labels: Object.fromEntries(Object.entries(chart.valueLabels || {}).filter(([, v]) => v && v.trim())),
    conditions: (chart.conditions || []).filter(cond => cond.field),
    grid_size: chart.gridSize || 'full',
    show_on_user: chart.showOnUser !== false,
    show_all_categories: !!chart.showAllCategories,
    visible: chart.visible !== false,
    ...(chart.dataset != null ? { dataset: chart.dataset } : {}),
    extra_datasets: (chart.extraDatasets || []).filter((id) => id != null && id !== ''),
    field_map: chart.fieldMap || {},
    secondary_field_map: chart.secondaryFieldMap || {},
    aggregation_field_map: chart.aggregationFieldMap || {},
    table_conditions: Object.fromEntries(
      Object.entries(chart.tableConditions || {}).map(([id, conds]) => [id, (conds || []).filter(c => c.field)])
    ),
  };
}

// Applies a saved display order (ProjectChartSource.chart_order: a flat list of chart
// ids, built-ins and custom mixed together) to a list of chart-like items keyed by `id`.
// Items not present in `chartOrder` (new charts created since it was last saved, or
// before it's ever been saved at all) are appended after, in whatever order they were
// passed in — never dropped just for being unlisted. Shared by the admin preview and the
// public page so both display in the exact same sequence.
export function sortByChartOrder(items, chartOrder) {
  const byId = new Map(items.map(item => [item.id, item]));
  const ordered = [];
  const remaining = new Set(byId.keys());
  (chartOrder || []).forEach(id => {
    if (remaining.has(id)) { ordered.push(byId.get(id)); remaining.delete(id); }
  });
  remaining.forEach(id => ordered.push(byId.get(id)));
  return ordered;
}

// Clean a saved chart list: drop duplicate ids, duplicate custom configs, and stale
// built-ins; guarantee every current built-in appears exactly once (starting hidden if its
// id is in hiddenBuiltins — see ProjectChartSource.hidden_builtins, the built-in equivalent
// of a custom chart's own `visible` field); then apply chartOrder (see sortByChartOrder) so
// built-ins and custom charts display in one combined sequence.
function sanitizeCharts(charts, chartOrder, hiddenBuiltins = []) {
  const seenIds = new Set();
  const seenConfigs = new Set();
  const result = [];
  (Array.isArray(charts) ? charts : []).forEach(c => {
    if (!c || !c.id || seenIds.has(c.id)) return;
    if (c.type === 'builtin') {
      const def = BUILT_IN_CHARTS.find(b => b.id === c.id);
      if (!def) return;
      seenIds.add(c.id);
      result.push({ ...c, label: def.label, dataSource: c.dataSource || 'live' });
      return;
    }
    // Extra Summary/Map/Breakdown instances (see ProjectBuiltinWidget) — id-only dedup,
    // same as custom charts below, but skipping chartSignature entirely: it's built from
    // chartType/field, which these don't have, so every instance would collapse onto the
    // same degenerate signature and all but the first would be dropped as "duplicates" of
    // each other.
    if (c.type === 'builtin-extra') {
      seenIds.add(c.id);
      result.push(c);
      return;
    }
    const sig = chartSignature(c);
    if (seenConfigs.has(sig)) return;
    seenConfigs.add(sig);
    seenIds.add(c.id);
    result.push(c);
  });
  BUILT_IN_CHARTS.forEach(b => {
    if (!seenIds.has(b.id)) result.push({ ...b, visible: !hiddenBuiltins.includes(b.id), dataSource: 'live' });
  });
  return sortByChartOrder(result, chartOrder);
}

// How well a chart type fits a field with `count` distinct values. `isDateLike` gates
// Line/Area (see CHART_TYPES' requiresDateField) — disabled outright for a non-date field,
// since a "trend" over arbitrary categories isn't a trend at all. `fieldSelected=false`
// (no field chosen yet) skips every check below and always returns 'ok' — every chart type
// is pickable up front, and the picked type's own requirements show up afterward as
// guidance (see the Chart Type Info box) instead of pre-emptively graying out a grid the
// admin hasn't had a chance to explore yet.
function getChartFit(type, count, isDateLike = false, fieldSelected = true) {
  if (!type) return { status: 'ok' };
  if (!fieldSelected) return { status: 'ok' };
  if (type.requiresDateField && !isDateLike) return { status: 'disabled', reason: "Needs a date field — pick one with date values, or mark a field's type as Date on the Datasets tab" };
  if (count < type.minItems) return { status: 'disabled', reason: `Needs at least ${type.minItems} categories — this field only has ${count}` };
  if (type.maxItems && count > type.maxItems) {
    return { status: 'partial', reason: type.requiresDateField
      ? `Shows the most recent ${type.maxItems} of ${count} dates`
      : `Shows the top ${type.maxItems} of ${count} categories` };
  }
  return { status: 'ok' };
}

// Best chart types for a given number of distinct values
function recommendChartTypes(count, isDateLike = false) {
  if (isDateLike && count >= 3) return ['line', 'area', 'bar-vertical'];
  if (count <= 2) return ['cards', 'progress', 'pie'];
  if (count <= 6) return ['pie', 'donut', 'horizontal-stack', 'bar-vertical'];
  if (count <= 10) return ['bar-horizontal', 'donut', 'treemap', 'progress'];
  if (count <= 20) return ['bar-horizontal', 'list', 'table'];
  return ['table', 'list', 'bar-horizontal'];
}

// Keep the current type if it still fits, otherwise pick the best recommendation
function bestChartType(count, currentId, isDateLike = false) {
  const current = CHART_TYPES.find(t => t.id === currentId);
  if (getChartFit(current, count, isDateLike).status !== 'disabled') return currentId;
  const rec = recommendChartTypes(count, isDateLike).find(id =>
    getChartFit(CHART_TYPES.find(t => t.id === id), count, isDateLike).status !== 'disabled');
  return rec || 'table';
}

// Summary card — shared between Admin and the public page so appearance settings
// (gradient colors, row/stacked layout) always render identically in both places.
export function SummaryCard({ stats, today, sourceLabel, colorFrom = '#0038A8', colorTo = '#0055f1', orientation = 'row', accentColor = '#FCD116' }) {
  if (!stats) return null;
  const gradientStyle = { background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` };
  const accentTextColor = contrastTextColor(accentColor);
  const tiles = [
    { label: 'Municipalities', value: stats.municipalities_count },
    { label: 'Total Province', value: stats.provinces_count },
    { label: 'Barangays', value: stats.barangays_count },
  ];
  return (
    <div className="rounded-2xl p-8 text-white -m-4" style={gradientStyle}>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium text-white/70">SUMMARY</span>
        <span className="text-sm text-white/50">as of</span>
        <span className="text-sm font-medium">{today}</span>
        <span className="text-sm text-white/50">·</span>
        <span className="text-sm font-medium">{sourceLabel}</span>
      </div>
      {orientation === 'stacked' ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-white/70 mb-1">Total Active Locations</p>
            <p className="text-4xl font-black">{stats.total_locations.toLocaleString()}</p>
          </div>
          {tiles.map(t => (
            <div key={t.label} className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-white/70">{t.label}</span>
              <span className="text-2xl font-black">{t.value}</span>
            </div>
          ))}
          {stats.hasApField && (
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: accentColor }}>
              <span className="text-sm" style={{ color: accentTextColor }}>Total Active APs</span>
              <span className="text-2xl font-black" style={{ color: accentTextColor }}>{stats.total_active_aps.toLocaleString()}</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-2 ${stats.hasApField ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
          <div className="col-span-2 lg:col-span-1">
            <p className="text-sm text-white/70 mb-1">Total Active Locations</p>
            <p className="text-4xl font-black">{stats.total_locations.toLocaleString()}</p>
          </div>
          {tiles.map(t => (
            <div key={t.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-sm text-white/70 mb-1">{t.label}</p>
              <p className="text-3xl font-black">{t.value}</p>
            </div>
          ))}
          {stats.hasApField && (
            <div className="rounded-xl p-4" style={{ backgroundColor: accentColor }}>
              <p className="text-sm mb-1" style={{ color: accentTextColor }}>Total Active APs</p>
              <p className="text-3xl font-black" style={{ color: accentTextColor }}>{stats.total_active_aps.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Province Breakdown component
export function ProvinceBreakdown({ province, data, sites, color, maxSites, hasApField = true, externalSearch = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // The chart-level search bar seeds this province's own search box and pops it open —
  // still editable/clearable locally afterward, it's a starting point, not a lock.
  useEffect(() => {
    if (externalSearch) {
      setExpanded(true);
      setSearch(externalSearch);
      setPage(1);
    }
  }, [externalSearch]);

  const provinceSites = sites.filter(s => s.province === province);
  const filteredSites = provinceSites.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.site_name?.toLowerCase().includes(q) ||
      s.r10_site_id?.toLowerCase().includes(q) ||
      s.locality?.toLowerCase().includes(q) ||
      s.barangay?.toLowerCase().includes(q);
    const matchType = !selectedType || s.site_type === selectedType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filteredSites.length / pageSize);
  const paginatedSites = filteredSites.slice((page - 1) * pageSize, page * pageSize);
  const siteTypes = Object.entries(data?.site_types || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center  gap-4 p-4 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex items-center gap-2 w-[200px]">
          <span className=" text-left font-medium text-gray-900 dark:text-white ">{province}</span>
        </div>
        
        <div className="w-full  h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(data.total_sites / maxSites) * 100}%`, backgroundColor: color }} />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right">
          {hasApField ? `${data.ap_count} APs` : `${data.total_sites} sites`}
        </span>
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {siteTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button onClick={() => { setSelectedType(''); setPage(1); }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${!selectedType ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                All: {provinceSites.length}
              </button>
              {siteTypes.map(([type, count]) => (
                <button key={type} onClick={() => { setSelectedType(selectedType === type ? '' : type); setPage(1); }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${selectedType === type ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                  {type}: {count}
                </button>
              ))}
            </div>
          )}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">#</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">ID</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Name</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Type</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Locality</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">AP</th>
              </tr></thead>
              <tbody>
                {paginatedSites.map((site, i) => (
                  <tr key={site.id || i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 px-2 text-gray-400">{(page - 1) * pageSize + i + 1}</td>
                    <td className="py-1.5 px-2 font-mono text-gray-600">{site.r10_site_id}</td>
                    <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{site.site_name}</td>
                    <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 text-[10px]">{site.site_type}</span></td>
                    <td className="py-1.5 px-2 text-gray-600">{site.locality}</td>
                    <td className="py-1.5 px-2">{(site.ap === 'TRUE' || site.ap === 'true') && <span className="text-green-500">✓</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single aggregate number for chart_type='aggregate-cards' — same aggregation
// vocabulary as ProjectChartSource's Summary Card tiles (computeSummaryTiles above),
// just producing one plain value instead of a tile list.
function computeAggregateValue(records, field, agg) {
  if (agg === 'count') return records.length;
  if (agg === 'distinct') return new Set(records.map(r => String(r[field] ?? '').trim()).filter(Boolean)).size;
  if (agg === 'average') {
    // Number('') is 0, not NaN — blank cells must be filtered out as strings first, or
    // they'd silently count as zero-valued rows and drag the average down instead of
    // being excluded as "no data" (rows with a real value are what an average means).
    const nums = records
      .map(r => r[field])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .map(Number)
      .filter(Number.isFinite);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }
  return records.reduce((s, r) => s + (Number(r[field]) || 0), 0); // sum (default)
}

// KPI tile for chart_type='aggregate-cards' — one big number (e.g. "Total Budget:
// ₱2.4M"), the chart's own Title (rendered by the enclosing ChartCard/DraggableChart)
// is the label, so this only needs to render the value itself.
function AggregateValueCard({ chart, sites }) {
  const agg = chart.agg || 'sum';
  const value = agg === 'count_equals'
    ? sites.filter(r => String(r[chart.field] ?? '').trim().toLowerCase() === String(chart.equals ?? '').trim().toLowerCase()).length
    : computeAggregateValue(sites, chart.field, agg);
  const display = agg === 'average'
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : Math.round(value).toLocaleString();
  const color = chart.cardColor || '#0038A8';
  const design = chart.cardDesign || 'big-number';
  const Icon = chart.cardIcon ? MARKER_ICON_OPTIONS.find(o => o.name === chart.cardIcon)?.Icon : null;
  // Shared across every design below (not just 'image-bg') — `justify`/`items` reposition
  // the content BLOCK within the card's width, `text` aligns text within that block (only
  // differs from `justify` for multi-line content, e.g. a wrapped title under the number).
  const align = chart.cardTextAlign || 'left';
  const alignJustify = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[align];
  const alignItems = { left: 'items-start', center: 'items-center', right: 'items-end' }[align];
  const alignText = { left: 'text-left', center: 'text-center', right: 'text-right' }[align];

  // Optional longer text (chart.cardDescription) — a sentence or two of context, distinct
  // from `title` (short, shown alongside the number on some designs already). Wraps fully,
  // never truncated: an admin who pastes a long paragraph gets a long card, on purpose.
  // Each design below renders it inline (not via one shared snippet) since the right text
  // color differs per design — muted gray on a light card, translucent white on a photo or
  // colored background.

  if (design === 'colored-bg') {
    const textColor = contrastTextColor(color);
    return (
      <div className={`flex flex-col py-8 px-6 rounded-xl ${alignItems}`} style={{ backgroundColor: color }}>
        <p className="text-5xl font-black" style={{ color: textColor }}>{display}</p>
        {chart.cardDescription && (
          <p className={`text-xs mt-1.5 max-w-xs whitespace-pre-line opacity-80 ${alignText}`} style={{ color: textColor }}>{chart.cardDescription}</p>
        )}
      </div>
    );
  }

  if (design === 'icon-number') {
    return (
      <div className={`flex flex-col justify-center gap-2 py-8 px-6 ${alignItems}`}>
        {Icon && <Icon size={28} color={color} />}
        <p className="text-5xl font-black" style={{ color }}>{display}</p>
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  if (design === 'progress') {
    const target = Number(chart.cardTarget) || 0;
    const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
    return (
      <div className="py-8 px-6">
        <p className={`text-3xl font-black mb-3 ${alignText}`} style={{ color }}>
          {display}{target > 0 && <span className="text-lg font-medium text-gray-400"> / {Math.round(target).toLocaleString()}</span>}
        </p>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        {target > 0 && <p className={`text-xs text-gray-400 mt-1.5 ${alignText}`}>{Math.round(pct)}%</p>}
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  if (design === 'compact-row') {
    return (
      <div className={`flex flex-col gap-1.5 py-6 px-4 ${alignItems}`}>
        <div className="flex items-center gap-3">
          {Icon && <Icon size={24} color={color} className="shrink-0" />}
          <p className="text-4xl font-black shrink-0" style={{ color }}>{display}</p>
          {chart.title && <p className="text-sm text-gray-500 dark:text-gray-400 min-w-0">{chart.title}</p>}
        </div>
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  if (design === 'image-bg') {
    // 'center' centers the text block BOTH ways (a hero-banner look) — 'left'/'right' stay
    // bottom-anchored (a photo-caption look, where vertical centering would look adrift).
    // The gradient shape follows the same split: a bottom-up fade reads fine when the text
    // sits at the bottom, but leaves the middle of the photo at full brightness, so a
    // vertically centered text block would lose contrast against a bright photo — a flat
    // overlay guarantees contrast anywhere on the image instead.
    const isCentered = chart.cardTextAlign === 'center';
    const { r, g, b } = hexToRgb(chart.cardGradientColor || '#000000');
    return (
      <div className={`relative rounded-xl overflow-hidden min-h-[160px] flex flex-col ${isCentered ? 'justify-center' : 'justify-end'} p-5 ${alignItems} ${alignText}`}
        style={{
          backgroundColor: chart.cardImage ? '#111' : color,
          backgroundImage: chart.cardImage ? `url(${chart.cardImage})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
        {/* Inline gradient, not Tailwind's `via-<n>%` stop-position utilities — those need
            Tailwind 3.4+ and this project is pinned to 3.3.3, where they're silently
            dropped (unrecognized class, no CSS emitted) rather than erroring. Color comes
            from card_gradient_color (default black), not card_color — that field already
            means "accent color" on every other design, and reusing it here would mean an
            existing chart's gradient silently changes color the moment someone edits its
            unrelated accent. */}
        {chart.cardImage && (
          <div className="absolute inset-0" style={{
            background: isCentered
              ? `rgba(${r},${g},${b},0.45)`
              : `linear-gradient(to top, rgba(${r},${g},${b},0.92) 0%, rgba(${r},${g},${b},0.55) 45%, rgba(${r},${g},${b},0) 100%)`,
          }} />
        )}
        <div className="relative">
          <p className="text-4xl font-black text-white drop-shadow">{display}</p>
          {chart.title && <p className="text-xs font-medium text-white/80 mt-1">{chart.title}</p>}
          {chart.cardDescription && <p className={`text-xs text-white/80 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
        </div>
      </div>
    );
  }

  if (design === 'minimal-text') {
    return (
      <div className="py-6 pl-4 pr-5 border-l-4 rounded-r-lg" style={{ borderColor: color }}>
        <p className={`text-2xl font-semibold text-gray-800 dark:text-gray-100 ${alignText}`}>{display}</p>
        {chart.title && <p className={`text-xs text-gray-400 mt-1 ${alignText}`}>{chart.title}</p>}
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  // 'big-number' — the original plain design.
  return (
    <div className={`flex flex-col py-8 px-6 ${alignItems}`}>
      <p className="text-5xl font-black" style={{ color }}>{display}</p>
      {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
    </div>
  );
}

// Custom Chart Renderer with hover tooltips
export function CustomChartRenderer({ chart, sites }) {
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  // Paginates the "vertical list" chart types (bar-horizontal, table, list, ...) once
  // "Show all categories" is on — dumping e.g. 97 categories into one long scrolling block
  // was the alternative, this instead pages through them in the type's normal batch size.
  // Resets to page 1 whenever the underlying data/config changes so a stale page number
  // from a previous field/filter doesn't leave the view showing nothing.
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [chart.field, chart.dataset, chart.chartType, chart.showAllCategories, chart.conditions]);

  // Optional admin-set filter conditions (see ProjectChartConfig.conditions), applied
  // before any type-specific logic below — the aggregation branch (aggregate-cards) and
  // the fieldData tally branch both just read filteredSites instead of sites.
  const filteredSites = filterRecordsByConditions(sites, chart.conditions);

  // chart_type='aggregate-cards' aggregates `field`'s VALUES into one number instead of
  // counting occurrences of its distinct values — bypasses the fieldData/sorted pipeline
  // every other chart type below is built on, since that pipeline doesn't apply to it.
  // (After the two useState calls above, not before — an early return earlier would skip
  // hooks conditionally between renders, since the live chart-builder preview re-renders
  // this same instance as the admin switches chart types.)
  if (chart.chartType === 'aggregate-cards') {
    return <AggregateValueCard chart={chart} sites={filteredSites} />;
  }

  // Line/Area plot a date field chronologically (oldest to newest, left to right), bucketed
  // into chart.dateGroupBy periods (default 'month' — grouping by the exact date string
  // instead fans real-world data out into one spike per unique timestamp, see
  // dateBucketKey's comment) — every other chart type ranks by count descending, which
  // would turn a "trend" into a meaningless walk between whichever dates have the most rows.
  const isDateTrend = chart.chartType === 'line' || chart.chartType === 'area';
  const dateGroupBy = chart.dateGroupBy || 'month';
  // Optional per-category aggregation (chart.aggregationEnabled) — sum/average/distinct-
  // count of aggregationField per category instead of the plain row-count every chart type
  // uses by default. See tallyBy's own comment; not offered for aggregate-cards, which
  // already has its own complete agg/agg_equals system (handled by the early return above).
  const isAgg = !!chart.aggregationEnabled && !!chart.aggregationField;
  const aggType = chart.aggregationType || 'sum';
  const bucketLabels = {};
  const fieldData = tallyBy(filteredSites, (s) => {
    if (!isDateTrend) return s[chart.field] || 'N/A';
    const raw = s[chart.field];
    const key = raw ? dateBucketKey(raw, dateGroupBy) : null;
    if (!key) return null;
    if (!bucketLabels[key]) bucketLabels[key] = dateBucketLabel(key, dateGroupBy);
    return key;
  }, isAgg, chart.aggregationField, aggType);

  let sorted = isDateTrend
    ? Object.entries(fieldData).sort((a, b) => a[0].localeCompare(b[0]))
    : Object.entries(fieldData).sort((a, b) => b[1] - a[1]);
  // Grand total is fixed BEFORE the cumulative transform below — cumulative turns each
  // point's count into a running sum, and summing those would double (or worse) count rows.
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

  // "Cumulative" (Line/Area only) turns each point from "rows in this period" into
  // "rows up to and including this period" — the growth-over-time reading that's usually
  // the actual point of a trend chart ("sites accepted over time"), vs. the per-period
  // reading (spikes/dips) that's the default.
  if (isDateTrend && chart.cumulative) {
    let running = 0;
    sorted = sorted.map(([key, count]) => { running += count; return [key, running]; });
  }
  const max = Math.max(...sorted.map(([, count]) => count), 1);

  // Every chart type below caps how many categories it draws for readability.
  // `chart.showAllCategories` (the "show all" override toggle) bypasses that cap.
  const cap = (defaultCap) => (chart.showAllCategories ? sorted.length : defaultCap);

  // Roll the tail beyond `limit` into an "Others" slice so part-to-whole
  // charts always account for 100% of the data
  const withOthers = (limit) => {
    if (sorted.length <= limit) return sorted;
    const shown = sorted.slice(0, limit - 1);
    const otherCount = sorted.slice(limit - 1).reduce((s, [, c]) => s + c, 0);
    return [...shown, ['Others', otherCount]];
  };
  const colorFor = (label, i) => (label === 'Others' ? '#9ca3af' : COLORS[i % COLORS.length]);

  // Per-chart display-label override (chart.valueLabels: {rawValue: displayText} — see the
  // model field's docstring) — lets an admin relabel a value everywhere it's shown in THIS
  // chart (e.g. "N/A" → "No") without touching the underlying data. Falls back to the
  // date-bucket auto-label (Line/Area) or the raw value itself when there's no override.
  // Only ever changes what's DISPLAYED — key/onClick/fieldData keying all still use the raw
  // label, so grouping and click-to-filter are unaffected.
  const displayLabel = (rawLabel) => chart.valueLabels?.[rawLabel] || bucketLabels[rawLabel] || rawLabel;

  // Paginates a "vertical list" of rows (bar-horizontal, table, list, progress, ...) in
  // batches of `pageSize` once "Show all categories" is checked — with it off, behaves
  // exactly like the old `.slice(0, pageSize)` (unchanged default: top N, no pager shown).
  // For pie/donut/half-donut/horizontal-stack, the graphic itself still draws every slice
  // (already readable at a glance); this only paginates the scrolling label list under it.
  const pageOf = (list, pageSize) => {
    if (!chart.showAllCategories) return { items: list.slice(0, pageSize), totalPages: 1, currentPage: 1 };
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    return { items: list.slice((currentPage - 1) * pageSize, currentPage * pageSize), totalPages, currentPage };
  };

  const Pager = ({ totalPages, currentPage }) => totalPages <= 1 ? null : (
    <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
      <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronLeft size={14} />
      </button>
      <span className="text-[11px] text-gray-400">Page {currentPage} of {totalPages}</span>
      <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight size={14} />
      </button>
    </div>
  );

  const getSubGroups = (primaryLabel) => {
    if (!chart.secondaryField) return null;
    const scoped = filteredSites.filter(s => (s[chart.field] || 'N/A') === primaryLabel);
    const subData = tallyBy(scoped, (s) => s[chart.secondaryField] || 'N/A', isAgg, chart.aggregationField, aggType);
    return Object.entries(subData).sort((a, b) => b[1] - a[1]);
  };

  const handleClick = (label) => {
    setSelectedFilter(selectedFilter === label ? null : label);
  };

  // Percent-of-total helper shared by every tooltip
  const pctOf = (count) => ((count / total) * 100).toFixed(1);

  // SVG points (line/area/radar) can't wrap an HTML Tooltip div around a
  // <circle>, so hover state drives a positioned overlay instead. x/y are
  // 0-100 (percent of the chart's own box), placed in a `relative` parent.
  const HoverTooltip = () => hoveredItem && (
    <div className="absolute px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg pointer-events-none whitespace-nowrap z-50 -translate-x-1/2 -translate-y-[130%]"
      style={{ left: `${hoveredItem.x}%`, top: `${hoveredItem.y}%` }}>
      <p className="font-bold">{hoveredItem.label}</p>
      <p>{hoveredItem.count} ({hoveredItem.percent}%)</p>
    </div>
  );

  // Tooltip component. `style`/`className` land on the wrapper div itself —
  // pass grid sizing (gridColumn/gridRow span) here, not on `children`, since
  // this wrapper is what actually participates in the parent grid/flex layout.
  const Tooltip = ({ label, count, percent, children, style, className = '' }) => (
    <div className={`relative group/tip ${className}`} style={style}>
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <p className="font-bold">{label}</p>
        <p>{count} ({percent}%)</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  );

  if (!sorted.length) {
    return <div className="py-10 text-center text-sm text-gray-400">No data available for this field</div>;
  }

  const renderChart = () => {
  switch (chart.chartType) {
    case 'bar-horizontal': {
      const { items, totalPages, currentPage } = pageOf(sorted, 10);
      return (
        <div>
          {selectedFilter && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Filtered:</span>
              <span className="px-2 py-0.5 text-xs bg-[#0038A8] text-white rounded-full">{displayLabel(selectedFilter)}</span>
              <button onClick={() => handleClick(null)} className="text-xs text-red-500 hover:underline">Clear</button>
            </div>
          )}
          <div className="space-y-3">
            {items.map(([label, count], i) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={label}>
                  <Tooltip label={displayLabel(label)} count={count} percent={pct}>
                    <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleClick(label)}>
                      <span className="w-40 shrink-0 text-sm text-gray-700 dark:text-gray-300 chart-h-scroll">{displayLabel(label)}</span>
                      <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg flex items-center px-3"
                          style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </div>
              );
            })}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'bar-vertical':
      // Horizontal layout (more categories = more columns, not more rows) — scrolls
      // sideways instead of squishing bars/labels when "Show all categories" adds more
      // than fit. `flex-1 min-w-[56px]` grows bars to fill the space when there's room but
      // won't shrink past 56px, which is what forces the scroll instead of a squeeze.
      return (
        <div className="overflow-x-auto chart-canvas-scroll">
          <div className="flex items-end gap-2 h-48">
            {sorted.slice(0, cap(8)).map(([label, count], i) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={pct} className="flex-1 min-w-[56px]">
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleClick(label)}>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{count}</span>
                    <div className="w-full rounded-t-lg transition-all"
                      style={{ height: `${(count / max) * 100}%`, backgroundColor: selectedFilter === label ? '#0038A8' : COLORS[i % COLORS.length], minHeight: '20px' }} />
                    <span className="text-[10px] text-gray-500 mt-1 chart-h-scroll w-full text-center">{displayLabel(label)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );
    case 'bar-stacked': {
      const { items, totalPages, currentPage } = pageOf(sorted, 6);
      return (
        <div>
          <div className="space-y-3">
            {items.map(([label, count], i) => {
              const subGroups = getSubGroups(label) || [];
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                  <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-32 shrink-0 text-sm text-gray-700 dark:text-gray-300 chart-h-scroll">{displayLabel(label)}</span>
                      <span className="text-xs font-bold">{count}</span>
                    </div>
                    <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {subGroups.slice(0, 5).map(([subLabel, subCount], si) => (
                        <div key={subLabel} className="h-full flex items-center justify-center"
                          style={{ width: `${(subCount / (count || 1)) * 100}%`, backgroundColor: COLORS[si % COLORS.length] }}
                          title={`${subLabel}: ${subCount}`}>
                          {subCount > 5 && <span className="text-[9px] font-bold text-white">{subCount}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'bar-grouped':
      // Horizontal layout — see 'bar-vertical' above for why this scrolls instead of
      // paginating, and why flex-1/min-w sit on Tooltip's own className, not a descendant.
      return (
        <div className="overflow-x-auto chart-canvas-scroll">
          <div className="flex items-end gap-4 h-48">
            {sorted.slice(0, cap(6)).map(([label, count], i) => {
              const subGroups = getSubGroups(label) || [];
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)} className="flex-1 min-w-[64px]">
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-80"
                    onClick={() => handleClick(label)}>
                    <div className="w-full flex items-end gap-1 h-40">
                      <div className="flex-1 rounded-t" style={{ height: `${(count / max) * 100}%`, backgroundColor: COLORS[0], minHeight: '10px' }} />
                      {subGroups.slice(0, 1).map(([_, subCount]) => (
                        <div key={_} className="flex-1 rounded-t" style={{ height: `${(subCount / max) * 100}%`, backgroundColor: COLORS[1], minHeight: '10px' }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 chart-h-scroll w-full text-center">{displayLabel(label)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );
    case 'line': {
      // Divisor must match the actual point count, not a hardcoded 8-1 — otherwise
      // fewer categories (say 5) bunch up on the left instead of spanning the chart.
      // Sliced from the end (not the start) since `sorted` is chronological ascending here —
      // the cap should keep the most RECENT dates, not the earliest.
      const points = sorted.slice(-cap(8));
      const divisor = Math.max(points.length - 1, 1);
      // Squeezing many points into a fixed-width canvas (previously just `w-full`) crushed
      // the dots, number labels, and date labels into an overlapping unreadable mess once
      // "Show all categories" added more than a handful of points. The canvas itself now
      // grows wider (60px per point, never narrower than the card) and the OUTER div
      // scrolls horizontally — same fix as bar-vertical/bar-grouped above — instead of any
      // individual label trying to scroll on its own, which does nothing for a chart whose
      // whole plot area is what's actually too cramped.
      // Reserved on both sides of the actual plot box — the first/last dot sit at exactly
      // 0%/100% and are centered on that point (-translate-x-1/2), so without this, half of
      // the edge dot renders past the plot box's true boundary and gets clipped with no way
      // to scroll further to it (scrollLeft can't go negative, and there's nothing beyond
      // the last point either). Sized for the HOVER TOOLTIP, not just the dot/number — the
      // tooltip is a ~90-110px box also centered on the point, so hovering the first/last
      // dot needs much more side room than the tiny dot or its number ever did.
      const sideInset = 70;
      const canvasWidth = points.length * 60 + sideInset * 2;
      return (
        <div className="overflow-x-auto chart-canvas-scroll">
          <div style={{ width: `${canvasWidth}px`, minWidth: '100%' }}>
            {/* Reserved headroom above the plot — the hover tooltip renders above the dot
                (translated up by its own height), and .chart-canvas-scroll's container is
                overflow-y: hidden (needed to kill an unwanted vertical scrollbar, see that
                class's comment), so without this the tooltip for any dot near the top of
                the chart gets clipped instead of showing. Sits inside the same scrolling
                container so the reserved space scrolls horizontally with the plot, not
                above/outside it. */}
            <div className="h-14" />
            <div className="flex">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="h-48 relative flex-1">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                  ))}
                  <polyline
                    points={points.map(([, count], i) => {
                      const x = (i / divisor) * 100;
                      const y = 100 - (count / max) * 90;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke={COLORS[0]} strokeWidth="2" vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {/* Plain HTML dots, not SVG <circle> — the SVG's non-uniform stretch
                    (viewBox 100x100 mapped onto a wide, short box) would otherwise
                    squash circles into ellipses. Fixed pixel size stays circular. The count is
                    printed right above each dot (not just on hover) — the whole point of a
                    trend line is reading the numbers off it at a glance. */}
                {points.map(([label, count], i) => {
                  const x = (i / divisor) * 100;
                  const y = 100 - (count / max) * 90;
                  return (
                    <div key={label} className="absolute -translate-x-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                      <span className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {count}
                      </span>
                      <div
                        className="w-3 h-3 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                        style={{ backgroundColor: COLORS[0] }}
                        onClick={() => handleClick(label)}
                        onMouseEnter={() => setHoveredItem({ label: displayLabel(label), count, percent: pctOf(count), x, y })}
                        onMouseLeave={() => setHoveredItem(null)} />
                    </div>
                  );
                })}
                <HoverTooltip />
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
            {/* Date labels used to sit `absolute bottom-0` INSIDE the plot box above, sharing
                its 0-100 coordinate space with the line — so a low value's dot (which can sit
                as low as y=100, the very bottom) had the line running right through the
                label row. A separate row below the plot, in normal flow, can't overlap the
                line no matter how low it dips. */}
            <div className="flex mt-2">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="flex-1 flex justify-between px-2">
                {points.map(([label]) => (
                  <span key={label} className="text-[9px] text-gray-500 whitespace-nowrap">{displayLabel(label)}</span>
                ))}
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
          </div>
        </div>
      );
    }
    case 'area': {
      // Sliced from the end — see the 'line' case above for why (chronological ascending
      // order means the cap should keep the most recent dates).
      const points = sorted.slice(-cap(8));
      const divisor = Math.max(points.length - 1, 1);
      // Same wide-scrollable-canvas and edge-inset fix as 'line' above — see that case's
      // comments for why both exist.
      const sideInset = 70;
      const canvasWidth = points.length * 60 + sideInset * 2;
      return (
        <div className="overflow-x-auto chart-canvas-scroll">
          <div style={{ width: `${canvasWidth}px`, minWidth: '100%' }}>
            <div className="h-14" />
            <div className="flex">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="h-48 relative flex-1">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`areaGrad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[0]} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={COLORS[0]} stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M${points.map(([, count], i) => {
                      const x = (i / divisor) * 100;
                      const y = 100 - (count / max) * 90;
                      return `${x},${y}`;
                    }).join(' L')} L100,100 L0,100 Z`}
                    fill={`url(#areaGrad-${chart.id})`}
                  />
                  <polyline
                    points={points.map(([, count], i) => {
                      const x = (i / divisor) * 100;
                      const y = 100 - (count / max) * 90;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none" stroke={COLORS[0]} strokeWidth="2" vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {/* Plain HTML dots, not SVG <circle> — see the line-chart case for why. Count
                    printed above each dot same as Line — see that case for why. */}
                {points.map(([label, count], i) => {
                  const x = (i / divisor) * 100;
                  const y = 100 - (count / max) * 90;
                  return (
                    <div key={label} className="absolute -translate-x-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                      <span className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {count}
                      </span>
                      <div
                        className="w-2.5 h-2.5 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                        style={{ backgroundColor: COLORS[0] }}
                        onClick={() => handleClick(label)}
                        onMouseEnter={() => setHoveredItem({ label: displayLabel(label), count, percent: pctOf(count), x, y })}
                        onMouseLeave={() => setHoveredItem(null)} />
                    </div>
                  );
                })}
                <HoverTooltip />
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
            {/* Date labels moved to their own row below the plot — see the 'line' case
                above for why (the line can dip down to y=100 and used to run right through
                a shared bottom-0 label row). */}
            <div className="flex mt-2">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="flex-1 flex justify-between px-2">
                {points.map(([label]) => (
                  <span key={label} className="text-[9px] text-gray-500 whitespace-nowrap">{displayLabel(label)}</span>
                ))}
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
          </div>
        </div>
      );
    }
    case 'pie':
    case 'donut': {
      // The ring itself always draws every slice (already readable at a glance even with
      // many); only the legend list below gets paginated once "Show all categories" makes
      // it long — see pageOf's comment.
      const slices = withOthers(cap(8));
      // Paginate an array of [entry, trueIndex] pairs, not `slices` directly — colorFor
      // cycles COLORS by index, and that index has to be the slice's TRUE position in the
      // full ring, or page 2+'s legend swatches would drift out of sync with the ring's
      // actual wedge colors (both would restart from COLORS[0] on every page otherwise).
      const { items: legendItems, totalPages, currentPage } = pageOf(slices.map((s, i) => [s, i]), 8);
      let acc = 0;
      const grad = slices.map(([label, count], i) => {
        const pct = (count / total) * 100;
        const start = acc;
        acc += pct;
        return `${colorFor(label, i)} ${start}% ${acc}%`;
      }).join(', ');
      return (
        <div className="flex items-center gap-6">
          <div className="w-36 h-36 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: `conic-gradient(${grad})` }}>
            {chart.chartType === 'donut' && (
              <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-black">{total}</p>
                  <p className="text-[8px] text-gray-500">Total</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-1.5">
              {legendItems.map(([[label, count], i]) => (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                    <span className="text-xs text-gray-700 dark:text-gray-300 chart-h-scroll min-w-0">{displayLabel(label)}</span>
                    <span className="text-xs font-bold ml-auto shrink-0">{count}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
            <Pager totalPages={totalPages} currentPage={currentPage} />
          </div>
        </div>
      );
    }
    case 'radar': {
      const points = sorted.slice(0, cap(8));
      return (
        <div className="flex justify-center">
          <div className="relative w-56 h-56">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon key={scale}
                  points={points.map((_, i) => {
                    const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
                    const x = 100 + Math.cos(angle) * 80 * scale;
                    const y = 100 + Math.sin(angle) * 80 * scale;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none" stroke="#e5e7eb" strokeWidth="0.5"
                />
              ))}
              <polygon
                points={points.map(([_, count], i) => {
                  const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
                  const r = (count / max) * 80;
                  const x = 100 + Math.cos(angle) * r;
                  const y = 100 + Math.sin(angle) * r;
                  return `${x},${y}`;
                }).join(' ')}
                fill={`${COLORS[0]}30`} stroke={COLORS[0]} strokeWidth="2"
              />
              {/* Hoverable/clickable points */}
              {points.map(([label, count], i) => {
                const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2;
                const r = (count / max) * 80;
                const x = 100 + Math.cos(angle) * r;
                const y = 100 + Math.sin(angle) * r;
                const labelX = 100 + Math.cos(angle) * 95;
                const labelY = 100 + Math.sin(angle) * 95;
                return (
                  <g key={label} className="cursor-pointer" onClick={() => handleClick(label)}
                    onMouseEnter={() => setHoveredItem({ label: displayLabel(label), count, percent: pctOf(count), x: x / 2, y: y / 2 })}
                    onMouseLeave={() => setHoveredItem(null)}>
                    <circle cx={x} cy={y} r="8" fill="transparent" />
                    <circle cx={x} cy={y} r="4" fill={COLORS[0]} stroke="white" strokeWidth="2" />
                    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                      className="text-[8px] fill-gray-600 dark:fill-gray-400">
                      {displayLabel(label)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <HoverTooltip />
          </div>
        </div>
      );
    }
    case 'table': {
      const { items, totalPages, currentPage } = pageOf(sorted, 8);
      return (
        <div>
          <div className="overflow-x-auto chart-canvas-scroll">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">#</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Name</th>
                <th className="text-right py-1.5 px-2 font-semibold text-gray-600">Count</th>
                <th className="text-right py-1.5 px-2 font-semibold text-gray-600">%</th>
              </tr></thead>
              <tbody>
                {items.map(([label, count], i) => (
                  <tr key={label} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => handleClick(label)}>
                    <td className="py-1.5 px-2 text-gray-400">{(currentPage - 1) * 8 + i + 1}</td>
                    <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{displayLabel(label)}</td>
                    <td className="py-1.5 px-2 text-right font-bold">{count}</td>
                    <td className="py-1.5 px-2 text-right text-gray-500">{((count / total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'cards': {
      const { items, totalPages, currentPage } = pageOf(sorted, 4);
      return (
        <div>
          <div className="grid grid-cols-2 gap-2">
            {items.map(([label, count], i) => (
              <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${COLORS[i % COLORS.length]}10` }}
                  onClick={() => handleClick(label)}>
                  <p className="text-xl font-black" style={{ color: COLORS[i % COLORS.length] }}>{count}</p>
                  <p className="text-[10px] text-gray-500 chart-h-scroll">{displayLabel(label)}</p>
                </div>
              </Tooltip>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'list': {
      const { items, totalPages, currentPage } = pageOf(sorted, 10);
      return (
        <div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map(([label, count], i) => (
              <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded"
                  onClick={() => handleClick(label)}>
                  <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                    {(currentPage - 1) * 10 + i + 1}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 chart-h-scroll">{displayLabel(label)}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{count}</span>
                  <span className="text-xs text-gray-400 shrink-0">{((count / total) * 100).toFixed(1)}%</span>
                </div>
              </Tooltip>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'progress': {
      const { items, totalPages, currentPage } = pageOf(sorted, 8);
      return (
        <div>
          <div className="space-y-4">
            {items.map(([label, count], i) => (
              <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 chart-h-scroll min-w-0">{displayLabel(label)}</span>
                    <span className="text-sm font-bold shrink-0">{count} <span className="text-xs text-gray-400">({((count / total) * 100).toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'treemap': {
      // Unlike pie/donut, a treemap tile IS its own label+color (no separate legend to
      // keep in sync across pages), so this can paginate `slices` directly.
      const slices = withOthers(cap(10));
      const { items: tiles, totalPages, currentPage } = pageOf(slices, 10);
      return (
        <div>
          <div className="grid grid-cols-6 gap-1 auto-rows-[60px]">
            {tiles.map(([label, count], i) => {
              const pct = (count / total) * 100;
              // Dynamic sizing based on percentage
              let colSpan, rowSpan;
              if (pct >= 30) { colSpan = 3; rowSpan = 3; }
              else if (pct >= 20) { colSpan = 3; rowSpan = 2; }
              else if (pct >= 15) { colSpan = 2; rowSpan = 2; }
              else if (pct >= 10) { colSpan = 2; rowSpan = 1; }
              else if (pct >= 5) { colSpan = 1; rowSpan = 1; }
              else { colSpan = 1; rowSpan = 1; }

              // Row height (not column width) is what limits whether the label + big
              // number stack without overlapping, since they're stacked vertically.
              const isShort = rowSpan < 2;
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={pct.toFixed(1)}
                  style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` }}>
                  <div
                    className={`h-full w-full rounded-lg flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity ${isShort ? 'p-2' : 'p-3'}`}
                    style={{
                      backgroundColor: `${colorFor(label, i)}15`,
                      borderLeft: `4px solid ${colorFor(label, i)}`,
                    }}
                    onClick={() => handleClick(label)}
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 chart-h-scroll leading-tight">{displayLabel(label)}</span>
                    <div className="leading-tight">
                      <span className={isShort ? 'text-sm font-bold' : 'text-xl font-black'} style={{ color: colorFor(label, i) }}>{count}</span>
                      <span className="text-[10px] text-gray-400 ml-1">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'comparison': {
      const { items, totalPages, currentPage } = pageOf(sorted, 6);
      return (
        <div>
          <div className="space-y-4">
            {items.map(([label, count], i) => {
              const subGroups = getSubGroups(label) || [];
              const subMax = subGroups[0]?.[1] || 1;
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                  <div className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg"
                    onClick={() => handleClick(label)}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 chart-h-scroll min-w-0">{displayLabel(label)}</span>
                      <span className="text-sm font-bold shrink-0">{count}</span>
                    </div>
                    {subGroups.length > 0 ? (
                      <div className="space-y-1">
                        {subGroups.slice(0, 3).map(([subLabel, subCount]) => (
                          <div key={subLabel} className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-[11px] text-gray-500 chart-h-scroll">{subLabel}</span>
                            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                              <div className="h-full rounded flex items-center px-2"
                                style={{ width: `${(subCount / subMax) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                                <span className="text-[9px] font-bold text-white">{subCount}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                        <div className="h-full rounded flex items-center px-2"
                          style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                          <span className="text-[10px] font-bold text-white">{count}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'funnel': {
      // Width used to taper by fixed steps based on rank alone (1st bar 100%, 2nd ~91%,
      // 3rd ~83%, ...) regardless of the actual counts — so two stages with nearly
      // identical counts would taper by the same amount as two stages with a huge gap
      // between them, which defeats the point of a funnel (showing where the real
      // drop-offs are). Width is now count/max, the same ratio already used for the
      // tooltip's percent, so the taper reflects the real data.
      const { items, totalPages, currentPage } = pageOf(sorted, 8);
      return (
        <div>
          <div className="flex flex-col items-center gap-2 py-4">
            {items.map(([label, count], i) => {
              const pct = ((count / max) * 100).toFixed(1);
              const width = Math.max(20, (count / max) * 100);
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={pct} className="w-full flex justify-center">
                  <div
                    className="h-10 rounded-lg flex items-center justify-between px-4 gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${width}%`, backgroundColor: `${COLORS[i % COLORS.length]}20`, borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}
                    onClick={() => handleClick(label)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 chart-h-scroll min-w-0">{displayLabel(label)}</span>
                    <span className="text-sm font-bold shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{count}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'half-donut': {
      const slices = withOthers(cap(6));
      // See 'pie'/'donut' above — the ring draws every slice, only the legend paginates,
      // and the legend needs each entry's TRUE index (not its page-local one) so its
      // swatch color stays in sync with the ring's actual wedge color across pages.
      const { items: legendItems, totalPages, currentPage } = pageOf(slices.map((s, i) => [s, i]), 6);
      let halfAcc = 0;
      const halfGrad = slices.map(([label, count], i) => {
        const pct = (count / total) * 100;
        const start = halfAcc;
        halfAcc += pct;
        return `${colorFor(label, i)} ${start}% ${halfAcc}%`;
      }).join(', ');
      // The hole used to be `absolute bottom-0` against the outer clipped box — its
      // containing block ended up being that 80px-tall clip window (the ring div itself
      // has no `relative`), not the full 160px ring, so it centered on the wrong point and
      // came out as a lopsided teardrop instead of a clean semicircular cutout. Centering it
      // with flexbox on the (unclipped) ring div itself — same technique the picker's own
      // preview above already uses successfully — centers it on the ring's true middle
      // regardless of the clip. `items-start`/`pt` (not `items-end`/`pb`) because only the
      // TOP half of the hole survives the clip, so the label needs to sit near the hole's
      // top edge to stay inside the visible half, not the invisible bottom half.
      return (
        <div className="flex flex-col items-center">
          <div className="w-40 h-20 overflow-hidden">
            <div className="w-40 h-40 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${halfGrad})` }}>
              <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-start justify-center pt-2">
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{total}</p>
                  <p className="text-[8px] text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4 max-w-full">
            {legendItems.map(([[label, count], i]) => (
              <Tooltip key={label} label={displayLabel(label)} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 max-w-[140px]" onClick={() => handleClick(label)}>
                  <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 chart-h-scroll min-w-0">{displayLabel(label)}</span>
                </div>
              </Tooltip>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'horizontal-stack': {
      // `width: pct%` used to sit on the div INSIDE Tooltip's own wrapper — but that
      // wrapper (a bare `relative group/tip` div, see the Tooltip component below) has no
      // width of its own, so the percentage had nothing meaningful to resolve against and
      // every segment collapsed to its content size instead of the intended proportional
      // width. Tooltip's `style` prop exists precisely so callers can size the wrapper
      // itself when it needs to participate in the parent flex/grid layout (see its own
      // comment) — passing width there, instead of on `children`, is what every other flex-
      // proportional chart type in this file already does correctly.
      const slices = withOthers(cap(6));
      // Same true-index pagination as half-donut above — the bar draws every slice, only
      // the legend paginates, and colors must stay in sync between them.
      const { items: legendItems, totalPages, currentPage } = pageOf(slices.map((s, i) => [s, i]), 6);
      return (
        <div>
          <div className="h-12 rounded-lg overflow-hidden flex bg-gray-100 dark:bg-gray-700">
            {slices.map(([label, count], i) => {
              const pct = (count / total) * 100;
              return (
                <Tooltip key={label} label={displayLabel(label)} count={count} percent={pct.toFixed(1)} style={{ width: `${pct}%` }}>
                  <div
                    className="h-full w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: colorFor(label, i) }}
                    onClick={() => handleClick(label)}
                  >
                    {pct > 8 && <span className="text-[10px] font-bold text-white">{count}</span>}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {legendItems.map(([[label, count], i]) => (
              <div key={label} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 max-w-[160px]" onClick={() => handleClick(label)}>
                <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                <span className="text-xs text-gray-600 dark:text-gray-400 chart-h-scroll min-w-0">{displayLabel(label)} ({count})</span>
              </div>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    default:
      return null;
  }
  };

  // "{top} leads with {pct}%" assumes sorted[0] is the highest-count entry, which is true
  // for every chart type EXCEPT Line/Area (sorted chronologically, not by count — sorted[0]
  // there is just the earliest period). Those two get their own footer instead: the latest
  // period's value (or, in cumulative mode, the running total reached by it).
  const [topLabel, topCount] = sorted[0];
  const periodWord = { day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year' }[dateGroupBy] || 'period';
  const latest = sorted[sorted.length - 1];
  return (
    <div>
      {renderChart()}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-[10px] text-gray-400">
        {isDateTrend ? (
          <>
            <span className="shrink-0">{sorted.length.toLocaleString()} {periodWord}{sorted.length === 1 ? '' : 's'} · {total.toLocaleString()} total</span>
            <span className="chart-h-scroll min-w-0">
              {chart.cumulative
                ? `Reached ${latest[1].toLocaleString()} by ${displayLabel(latest[0])}`
                : `Latest: ${displayLabel(latest[0])} — ${latest[1].toLocaleString()}`}
            </span>
          </>
        ) : (
          <>
            <span className="shrink-0">{sorted.length.toLocaleString()} {sorted.length === 1 ? 'category' : 'categories'} · {total.toLocaleString()} total</span>
            <span className="chart-h-scroll min-w-0">{displayLabel(topLabel)} leads with {((topCount / total) * 100).toFixed(1)}%</span>
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper for draggable chart
function DraggableChart({ id, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, children, title, subtitle, onEdit, onEditStyle, onDelete, onToggleVisibility, showOnUser, isCustom, dataSource, onDataSourceChange, noPadding }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all ${
        isDragging ? 'border-[#0038A8] scale-[0.98] opacity-60' : 'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span
              draggable
              onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical size={16} className="text-gray-400" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
              {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDataSourceChange && (
              <div className="w-36" onClick={(e) => e.stopPropagation()} title="Data source">
                <Select value={selectValue(DATA_SOURCE_OPTIONS, dataSource)}
                  onChange={(opt) => onDataSourceChange(opt.value)}
                  options={DATA_SOURCE_OPTIONS} isSearchable={false} styles={selectStyles} />
              </div>
            )}
            {onEditStyle && (
              <button onClick={onEditStyle} className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Edit style">
                <Palette size={14} />
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Edit settings">
                <Edit2 size={14} />
              </button>
            )}
            {onToggleVisibility && (
              <button onClick={onToggleVisibility}
                className={`p-1.5 rounded transition-colors ${
                  showOnUser !== false ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={showOnUser !== false ? 'Click to hide' : 'Click to show'}>
                {showOnUser !== false ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            )}
            {isCustom && onDelete && (
              <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className={noPadding ? '' : 'p-4'}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Isolated so dragging a color picker only re-renders this small modal, not the whole
// Charts page (allCharts list, every DraggableChart card) — that was the source of the lag.
function SummaryStyleModal({ initialStyle, saving, renderPreview, onSave, onClose }) {
  const [draft, setDraft] = useState(initialStyle);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Summary Card Style</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-8 space-y-8">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Gradient colors</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Start color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={draft.colorFrom}
                    onChange={(e) => setDraft(s => ({ ...s, colorFrom: e.target.value }))}
                    className="w-12 h-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <input type="text" value={draft.colorFrom}
                    onChange={(e) => setDraft(s => ({ ...s, colorFrom: e.target.value }))}
                    className="flex-1 px-3 py-2.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">End color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={draft.colorTo}
                    onChange={(e) => setDraft(s => ({ ...s, colorTo: e.target.value }))}
                    className="w-12 h-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <input type="text" value={draft.colorTo}
                    onChange={(e) => setDraft(s => ({ ...s, colorTo: e.target.value }))}
                    className="flex-1 px-3 py-2.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Total Active APs accent color</h4>
            <div className="flex items-center gap-3 max-w-sm">
              <input type="color" value={draft.accentColor}
                onChange={(e) => setDraft(s => ({ ...s, accentColor: e.target.value }))}
                className="w-12 h-12 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
              <input type="text" value={draft.accentColor}
                onChange={(e) => setDraft(s => ({ ...s, accentColor: e.target.value }))}
                className="flex-1 px-3 py-2.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Text on this tile switches between dark and white automatically to stay readable.</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Layout</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'row', label: 'Row', desc: 'Tiles side by side', preview: (
                  <div className="flex gap-1 w-full">
                    <div className="h-8 flex-[2] rounded bg-current opacity-90" />
                    <div className="h-8 flex-1 rounded bg-current opacity-40" />
                    <div className="h-8 flex-1 rounded bg-current opacity-40" />
                    <div className="h-8 flex-1 rounded bg-current opacity-40" />
                  </div>
                ) },
                { id: 'stacked', label: 'Stacked', desc: 'One stat per row', preview: (
                  <div className="flex flex-col gap-1 w-full">
                    <div className="h-2.5 w-full rounded bg-current opacity-90" />
                    <div className="h-2.5 w-full rounded bg-current opacity-40" />
                    <div className="h-2.5 w-full rounded bg-current opacity-40" />
                  </div>
                ) },
              ].map(o => (
                <button key={o.id} onClick={() => setDraft(s => ({ ...s, orientation: o.id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all text-[#0038A8] dark:text-blue-400 ${
                    draft.orientation === o.id
                      ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                  <div className="h-10 flex items-center mb-3">{o.preview}</div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{o.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Preview</h4>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40 overflow-hidden">
              {renderPreview(draft)}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Preview only — the actual chart won't change until you hit Save.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => onSave(draft)} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setDraft(DEFAULT_SUMMARY_STYLE)}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Reset</button>
            <button onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Raw rows behind a Breakdown click — paginated 50 rows at a time so a table with
// thousands of rows never renders them all at once (rendered inline under Breakdown,
// see the 'province-breakdown' case in renderGenericBuiltIn).
const RAW_DATA_PAGE_SIZE = 50;

// One field slot's per-table mapping row (used by ExtraTablesEditor for Data Field/
// Secondary Field/Aggregation Field, and by ConditionsEditor for a Filter row's own
// field) — a table defaults to trying the SAME column name as the chart-level field
// (shown as the placeholder), overridden here only when that table calls it something
// else. Left blank = "use the same name", which is correct whenever it happens to exist.
function FieldMapRow({ label, table, baseFieldLabel, value, onChange }) {
  const options = (table?.fields || []).map((f) => ({ value: f.name, label: f.label }));
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex-1 min-w-0">
        <Select value={selectValue(options, value || '')}
          onChange={(opt) => onChange(opt ? opt.value : '')}
          options={options} isClearable
          placeholder={`Same as "${baseFieldLabel}"`} styles={selectStyles} />
      </div>
    </div>
  );
}

// Lets a chart pull rows from MORE than one Datasets table — once added, an extra
// table's rows are folded into the chart's combined record set (see
// combineChartRecords) alongside the primary table's, e.g. so a Value Card can sum
// "total transactions" across two separately-tracked tables. Because different tables
// can name "the same" column differently, each extra table gets its own small mapping
// row per field slot this chart actually uses — left blank, a slot just tries the SAME
// column name on that table (works whenever the tables happen to share a name).
function ExtraTablesEditor({ chart, setChart, genericTables, needsSecondary, recordsByDataset }) {
  const primaryId = chart.dataset ? Number(chart.dataset) : null;
  const extraIds = chart.extraDatasets || [];
  const addableTables = genericTables.filter((t) => t.id !== primaryId && !extraIds.includes(t.id));
  const primaryTable = genericTables.find((t) => t.id === primaryId);
  const primaryFieldLabel = primaryTable?.fields?.find((f) => f.name === chart.field)?.label
    || referencedFieldOptionsFor(primaryTable, genericTables).find((f) => f.value === chart.field)?.label
    || chart.field;

  const addTable = (id) => setChart((c) => ({ ...c, extraDatasets: [...(c.extraDatasets || []), id] }));
  const removeTable = (id) => setChart((c) => {
    const omit = (map) => Object.fromEntries(Object.entries(map || {}).filter(([k]) => Number(k) !== id));
    return {
      ...c,
      extraDatasets: (c.extraDatasets || []).filter((x) => x !== id),
      fieldMap: omit(c.fieldMap),
      secondaryFieldMap: omit(c.secondaryFieldMap),
      aggregationFieldMap: omit(c.aggregationFieldMap),
      tableConditions: omit(c.tableConditions),
      conditions: (c.conditions || []).map((cond) => ({ ...cond, fieldMap: omit(cond.fieldMap) })),
    };
  });
  const setMap = (mapKey, tableId, column) => setChart((c) => ({
    ...c, [mapKey]: { ...(c[mapKey] || {}), [tableId]: column },
  }));
  const setTableConditions = (tableId, next) => setChart((c) => ({
    ...c, tableConditions: { ...(c.tableConditions || {}), [tableId]: next },
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Select value={null} onChange={(opt) => opt && addTable(opt.value)}
            options={toOptions(addableTables.map((t) => t.id), (id) => genericTables.find((t2) => t2.id === id)?.name)}
            placeholder="+ Add another source table..." isDisabled={addableTables.length === 0}
            styles={selectStyles} />
        </div>
      </div>
      {extraIds.map((id) => {
        const table = genericTables.find((t) => t.id === id);
        return (
          <div key={id} className="p-2.5 border border-gray-100 dark:border-gray-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{table?.name || `Table ${id}`}</span>
              <button type="button" onClick={() => removeTable(id)} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
            {chart.field && (
              <FieldMapRow label="Data Field" table={table} baseFieldLabel={primaryFieldLabel}
                value={chart.fieldMap?.[id]} onChange={(v) => setMap('fieldMap', id, v)} />
            )}
            {needsSecondary && chart.secondaryField && (
              <FieldMapRow label="Secondary Field" table={table} baseFieldLabel={chart.secondaryField}
                value={chart.secondaryFieldMap?.[id]} onChange={(v) => setMap('secondaryFieldMap', id, v)} />
            )}
            {chart.aggregationEnabled && chart.aggregationField && (
              <FieldMapRow label="Aggregation Field" table={table} baseFieldLabel={chart.aggregationField}
                value={chart.aggregationFieldMap?.[id]} onChange={(v) => setMap('aggregationFieldMap', id, v)} />
            )}
            {/* Row filter for THIS table only — independent of the chart's shared Filter
                rows below (which apply to the combined set across every source table).
                Uses this table's own columns/values, not the primary table's. */}
            <div className="pt-1">
              <p className="text-[10px] text-gray-400 mb-1">Only include this table's rows where...</p>
              <ConditionsEditor conditions={chart.tableConditions?.[id]}
                onChange={(next) => setTableConditions(id, next)}
                fieldOptions={toOptions((table?.fields || []).map((f) => f.name), (n) => table?.fields?.find((f) => f.name === n)?.label)}
                valuesFor={(field) => toOptions(distinctFieldValues(recordsByDataset?.[id] || [], field))} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Admin UI for one {field, value} AND-list — reused everywhere conditions are editable:
// each custom chart, each Summary Card tile, and the whole Map/Breakdown widgets. `fieldOptions`
// is the {value,label} list for the "Column" dropdown; `valuesFor(field)` returns that
// field's own {value,label} list for the "Value" dropdown (typically distinctFieldValues
// wrapped in toOptions, computed against whichever table/records this instance concerns).
// `extraTables` (only passed for a multi-table custom chart's own Filter rows — every
// other caller omits it) enables a per-condition "map per table" section identical in
// spirit to ExtraTablesEditor's, for when a condition's column is named differently on
// one of the chart's extra tables.
function ConditionsEditor({ conditions, onChange, fieldOptions, valuesFor, extraTables }) {
  const add = () => onChange([...(conditions || []), { field: '', type: 'equals', value: '' }]);
  const update = (i, patch) => onChange((conditions || []).map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i) => onChange((conditions || []).filter((_, idx) => idx !== i));
  // Switching field or type clears every value shape (value/values/from/to) so a stale
  // single-value carries over into "is one of" (or vice versa) instead of a fresh pick.
  const clearedValues = { value: '', values: [], from: '', to: '' };
  return (
    <div className="space-y-2">
      {(conditions || []).map((cond, i) => {
        const type = cond.type || 'equals';
        return (
          <div key={i} className="flex items-start gap-2 p-2 border border-gray-100 dark:border-gray-800 rounded-lg">
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-[110px]">
                  <Select value={selectValue(fieldOptions, cond.field)}
                    onChange={(opt) => update(i, { field: opt ? opt.value : '', ...clearedValues })}
                    options={fieldOptions} placeholder="Column..." isClearable styles={selectStyles} />
                </div>
                <div className="w-[124px] shrink-0">
                  <Select value={selectValue(CONDITION_TYPE_OPTIONS, type)}
                    onChange={(opt) => update(i, { type: opt.value, ...clearedValues })}
                    options={CONDITION_TYPE_OPTIONS} isSearchable={false} isDisabled={!cond.field} styles={selectStyles} />
                </div>
              </div>
              {type === 'equals' && (
                <Select value={selectValue(valuesFor(cond.field), cond.value)}
                  onChange={(opt) => update(i, { value: opt ? opt.value : '' })}
                  options={valuesFor(cond.field)} isDisabled={!cond.field}
                  placeholder="Value..." isClearable styles={selectStyles} />
              )}
              {type === 'multi' && (
                <Select isMulti value={(cond.values || []).map((v) => ({ value: v, label: v }))}
                  onChange={(opts) => update(i, { values: (opts || []).map((o) => o.value) })}
                  options={valuesFor(cond.field)} isDisabled={!cond.field}
                  placeholder="Values..." styles={selectStyles} />
              )}
              {type === 'range' && (
                <div className="flex items-center gap-2">
                  <input type="text" value={cond.from || ''} onChange={(e) => update(i, { from: e.target.value })}
                    placeholder="From" disabled={!cond.field}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50" />
                  <span className="text-xs text-gray-400 shrink-0">–</span>
                  <input type="text" value={cond.to || ''} onChange={(e) => update(i, { to: e.target.value })}
                    placeholder="To" disabled={!cond.field}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50" />
                </div>
              )}
              {/* Per-table override — only for a multi-table chart's own Filter rows (see
                  ConditionsEditor's extraTables doc above). A table left blank here just
                  tries this SAME column name; tables that genuinely don't have a matching
                  column simply aren't narrowed by this one condition (see conditionMatches'
                  `field in row` check) instead of having every one of their rows excluded. */}
              {!!extraTables?.length && cond.field && (
                <div className="pt-1 space-y-1">
                  <p className="text-[10px] text-gray-400">Column name on other tables (optional)</p>
                  {extraTables.map((table) => (
                    <FieldMapRow key={table.id} label={table.name} table={table} baseFieldLabel={cond.field}
                      value={cond.fieldMap?.[table.id]}
                      onChange={(v) => update(i, { fieldMap: { ...(cond.fieldMap || {}), [table.id]: v } })} />
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 shrink-0 mt-2">
              <X size={14} />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={add} className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
        + Add condition{(conditions || []).length > 0 ? ' (AND)' : ''}
      </button>
    </div>
  );
}

// Dedicated settings surface for the Charts page's general filters (each one's name + which
// column each table tags for it) — same "pencil icon opens a focused modal" pattern the
// built-in Summary/Map/Breakdown widgets got earlier. Doesn't reuse DataSourceModal's
// focusSection sections since this isn't scoped to one widget's one table — it can tag ANY
// of the project's tables, including ones only a custom chart points at, for ANY number of
// filters. Everything here is a local draft, only written on Save (Cancel discards it) —
// unlike the marker-icon-style "apply immediately" pickers elsewhere, since adding/removing
// filters and retagging several tables at once is much easier to get right as one commit.
function FilterSettingsModal({ slug, tables, initialFilters, onClose, onSaved }) {
  // Each filter is { label, type: 'exact'|'range' } — 'range' is what the old hardcoded
  // From/To date filter now is, just no longer special-cased (admin can name it "Date" or
  // anything else, and add as many range filters as they want, e.g. "Installation Date"
  // AND "Renewal Date" both independently).
  const [filters, setFilters] = useState(
    initialFilters && initialFilters.length ? initialFilters.map((f) => ({ ...f })) : []
  );
  // { [tableId]: { [filterLabel]: columnName } }
  const [tableFields, setTableFields] = useState(() => {
    const map = {};
    tables.forEach((t) => { map[t.id] = { ...(t.general_filter_fields || {}) }; });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const addFilter = () => setFilters((prev) => [...prev, { label: '', type: 'exact' }]);
  const updateFilter = (i, patch) => setFilters((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeFilter = (i) => {
    const removedLabel = filters[i].label;
    setFilters((prev) => prev.filter((_, idx) => idx !== i));
    // Drop that label's column tags too, so a removed filter doesn't leave orphaned tags
    // a re-added filter with the same name would otherwise silently inherit.
    setTableFields((prev) => {
      const next = {};
      Object.entries(prev).forEach(([tableId, fieldMap]) => {
        const rest = { ...fieldMap };
        delete rest[removedLabel];
        next[tableId] = rest;
      });
      return next;
    });
  };
  const setTableColumn = (tableId, label, column) => {
    setTableFields((prev) => ({ ...prev, [tableId]: { ...(prev[tableId] || {}), [label]: column } }));
  };

  const cleanFilters = filters
    .map((f) => ({ label: f.label.trim(), type: f.type === 'range' ? 'range' : 'exact' }))
    .filter((f) => f.label);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectChartSource(slug, { general_filters: cleanFilters });
      const labels = cleanFilters.map((f) => f.label);
      await Promise.all(tables.map((t) => {
        const fieldMap = tableFields[t.id] || {};
        const cleaned = {};
        labels.forEach((label) => { if (fieldMap[label]) cleaned[label] = fieldMap[label]; });
        return updateProjectDataset(t.id, { general_filter_fields: cleaned });
      }));
      await onSaved();
    } catch (err) {
      alert('Failed to save filter settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filter Settings</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Filters <span className="text-gray-400">(each becomes its own control on the Charts page, e.g. "Province" or "Date")</span>
            </label>
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={f.label} onChange={(e) => updateFilter(i, { label: e.target.value })}
                    placeholder="e.g. Province" className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                  <div className="w-48 shrink-0">
                    <Select value={selectValue(FILTER_TYPE_OPTIONS, f.type)}
                      onChange={(opt) => updateFilter(i, { type: opt.value })}
                      options={FILTER_TYPE_OPTIONS} isSearchable={false} styles={selectStyles} />
                  </div>
                  <button type="button" onClick={() => removeFilter(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addFilter} className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
                + Add filter
              </button>
              {filters.length === 0 && (
                <p className="text-[11px] text-gray-400">No filters yet — the Charts page won't show a filter bar until you add one.</p>
              )}
            </div>
          </div>

          {cleanFilters.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                Column per table <span className="text-gray-400">(which of each table's own columns feeds each filter — blank means that table isn't affected by it)</span>
              </label>
              {tables.length === 0 ? (
                <p className="text-xs text-gray-400">Create a table under the Datasets tab first.</p>
              ) : (
                <div className="space-y-3">
                  {tables.map((t) => (
                    <div key={t.id} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 truncate" title={t.name}>{t.name}</p>
                      <div className="space-y-1.5">
                        {cleanFilters.map(({ label }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-[11px] text-gray-500 dark:text-gray-400 truncate" title={label}>{label}</span>
                            <div className="flex-1">
                              <Select
                                value={selectValue(toOptions((t.fields || []).map(f => f.name), (n) => (t.fields || []).find(f => f.name === n)?.label), (tableFields[t.id] || {})[label] || '')}
                                onChange={(opt) => setTableColumn(t.id, label, opt ? opt.value : '')}
                                options={toOptions((t.fields || []).map(f => f.name), (n) => (t.fields || []).find(f => f.name === n)?.label)}
                                placeholder="None" isClearable styles={selectStyles} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Non-Free-Wi-Fi only: "tag" which of this project's own Datasets tables feeds each of
// the Summary/Map/Breakdown built-ins (independently — same table or three different
// ones, admin's call), which of that table's columns power it, and its title. The
// generic equivalent of Free Wi-Fi's per-built-in DATA_SOURCES picker.
// `focusSection`: null shows all 3 widget sections (the "Data Source" button — first-time
// setup or editing more than one widget at once); 'summary'/'map'/'breakdown' shows only
// that one (each built-in chart's own "Edit" button) so a quick tweak doesn't require
// wading through the other two widgets' settings. Every section's state/save logic stays
// exactly the same either way — Save always submits the full draft, so a hidden section's
// fields just pass through unchanged instead of being read from a smaller draft shape.
// `instanceMode` (extra ProjectBuiltinWidget instances only) hides the marker-icon
// picker — that control persists straight to the SINGLETON's ProjectChartSource row
// (see applyMarkerIconUpdate below, which calls updateProjectChartSource directly, not
// via `onSave`), so leaving it visible while editing an instance would silently let an
// admin overwrite the ORIGINAL Map's marker icon instead of this instance's. Every other
// field stays fully reusable since `initial`/`onSave` are already generic.
function DataSourceModal({ slug, tables, initial, builtInTitles, focusSection = null, instanceMode = false, onSave, onClose, onDatasetUpdated, onChartSourceUpdated }) {
  // Custom Map marker icon (one image for every dot, replacing the default colored
  // circle) — file upload and URL both apply immediately, rather than waiting for the
  // modal's own Save button, since they're a separate multipart endpoint / a standalone
  // field that isn't part of the JSON draft
  // Save already sends.
  const [markerIcon, setMarkerIcon] = useState(initial?.marker_icon || '');
  const [markerIconUrlInput, setMarkerIconUrlInput] = useState(initial?.marker_icon || '');
  const [markerIconName, setMarkerIconName] = useState(initial?.marker_icon_name || '');
  const [markerIconColor, setMarkerIconColor] = useState(initial?.marker_icon_color || '#0038A8');
  const [savingMarkerIcon, setSavingMarkerIcon] = useState(false);
  const applyMarkerIconUpdate = async (fn) => {
    setSavingMarkerIcon(true);
    try {
      const updated = await fn();
      setMarkerIcon(updated.marker_icon || '');
      setMarkerIconUrlInput(updated.marker_icon || '');
      setMarkerIconName(updated.marker_icon_name || '');
      setMarkerIconColor(updated.marker_icon_color || '#0038A8');
      if (onChartSourceUpdated) onChartSourceUpdated(updated);
    } catch (err) {
      alert('Failed to update the marker icon.');
    } finally {
      setSavingMarkerIcon(false);
    }
  };
  // Image and Lucide-icon are mutually exclusive — picking one clears the other (the
  // backend enforces this too; see ProjectChartSourceView.patch), so there's never a
  // question of which one actually shows on the map.
  const uploadMarkerIconFile = (file) => applyMarkerIconUpdate(() => uploadProjectChartSourceMarkerIcon(slug, file));
  const setMarkerIconUrl = () => applyMarkerIconUpdate(() => updateProjectChartSource(slug, { marker_icon: markerIconUrlInput.trim() }));
  const clearMarkerIcon = () => applyMarkerIconUpdate(() => updateProjectChartSource(slug, { marker_icon: '', marker_icon_name: '' }));
  const selectMarkerIconName = (name) => applyMarkerIconUpdate(() => updateProjectChartSource(slug, { marker_icon_name: name, marker_icon_color: markerIconColor }));
  const changeMarkerIconColor = (color) => {
    setMarkerIconColor(color);
    if (markerIconName) applyMarkerIconUpdate(() => updateProjectChartSource(slug, { marker_icon_color: color }));
  };

  // Summary Card
  const [summaryDatasetId, setSummaryDatasetId] = useState(initial?.summary_dataset || '');
  const [summaryTitle, setSummaryTitle] = useState(initial?.summary_title || '');
  const [summaryHideTitle, setSummaryHideTitle] = useState(!!initial?.summary_hide_title);
  // Each tile: { field, agg: 'sum'|'distinct'|'count_equals'|'count', equals?, label, highlight? }.
  // Position controls layout (tile 0 = big lead number); `highlight` marks the one tile
  // rendered as the colored accent box (falls back to the last tile if none is marked, so
  // older saves — plain field-name strings or objects without `highlight` — keep working).
  const [summaryFields, setSummaryFields] = useState(
    (initial?.summary_fields || []).map(t => (typeof t === 'string' ? { field: t, agg: 'sum', label: '' } : t))
  );
  const [dragTileIndex, setDragTileIndex] = useState(null);

  // Map
  const [mapDatasetId, setMapDatasetId] = useState(initial?.map_dataset || '');
  const [mapTitle, setMapTitle] = useState(initial?.map_title || '');
  const [mapHideTitle, setMapHideTitle] = useState(!!initial?.map_hide_title);
  const [latField, setLatField] = useState(initial?.latitude_field || '');
  const [lngField, setLngField] = useState(initial?.longitude_field || '');
  // Some tables store "lat, lng" together in one column (e.g. "8.486735683, 124.6322367")
  // instead of two separate number columns — when tagged, latitude_field and
  // longitude_field are saved as the same field name and the map view splits on the comma.
  const [combinedCoords, setCombinedCoords] = useState(
    Boolean(initial?.latitude_field) && initial.latitude_field === initial?.longitude_field
  );
  // Columns shown in the Map's hover tooltip, in the order they were picked. Empty = no
  // tooltip on the dots at all.
  const [tooltipFields, setTooltipFields] = useState(initial?.tooltip_fields || []);
  // Columns FreeWifiMap renders as its filter dropdowns, in selection order. Generic
  // replacement for the old hardcoded province/district/locality/barangay filters — any
  // project's own columns work, no need to rename sheet headers to match. Empty = no
  // filter dropdowns.
  const [filterFields, setFilterFields] = useState(initial?.map_filter_fields || []);
  // Which single column drives per-marker color + the legend — picked independently of
  // filterFields (doesn't have to be a filter dropdown, or any of them). Empty = every
  // marker uses the default color, no legend.
  const [mapColorField, setMapColorField] = useState(initial?.map_color_field || '');
  // Admin-set floor under filterFields (those are visitor-interactive; this always
  // applies) — narrows which rows plot on the Map at all. See ConditionsEditor.
  const [mapConditions, setMapConditions] = useState(initial?.map_conditions || []);

  // Breakdown
  const [breakdownDatasetId, setBreakdownDatasetId] = useState(initial?.breakdown_dataset || '');
  const [breakdownTitle, setBreakdownTitle] = useState(initial?.breakdown_title || '');
  const [breakdownHideTitle, setBreakdownHideTitle] = useState(!!initial?.breakdown_hide_title);
  const [groupField, setGroupField] = useState(initial?.group_field || '');
  // Columns shown in the Breakdown widget's raw-data table. Empty = show every column
  // (unlike tooltipFields, since this preserves the pre-existing "show everything" default).
  const [breakdownFields, setBreakdownFields] = useState(initial?.breakdown_fields || []);
  // Narrows which rows the Breakdown widget groups/counts at all, before group_field
  // splits them. See ConditionsEditor.
  const [breakdownConditions, setBreakdownConditions] = useState(initial?.breakdown_conditions || []);

  const [saving, setSaving] = useState(false);

  const summaryTable = tables.find(t => t.id === Number(summaryDatasetId));
  const summaryTableFields = summaryTable?.fields || [];
  const mapTable = tables.find(t => t.id === Number(mapDatasetId));
  const mapTableFields = mapTable?.fields || [];
  const breakdownTable = tables.find(t => t.id === Number(breakdownDatasetId));
  const breakdownTableFields = breakdownTable?.fields || [];

  const toggleTooltipField = (name) => {
    setTooltipFields(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };
  const toggleFilterField = (name) => {
    setFilterFields(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };
  const toggleBreakdownField = (name) => {
    setBreakdownFields(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  const addSummaryTile = () => setSummaryFields(prev => [...prev, { field: '', agg: 'distinct', equals: '', label: '', conditions: [] }]);
  const updateSummaryTile = (i, patch) => setSummaryFields(prev => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeSummaryTile = (i) => setSummaryFields(prev => prev.filter((_, idx) => idx !== i));
  const setHighlightTile = (i) => setSummaryFields(prev => prev.map((t, idx) => ({ ...t, highlight: idx === i })));
  const handleTileDragOver = (e) => e.preventDefault();
  const handleTileDrop = (dropIndex) => {
    if (dragTileIndex === null || dragTileIndex === dropIndex) { setDragTileIndex(null); return; }
    setSummaryFields(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragTileIndex, 1);
      arr.splice(dropIndex, 0, moved);
      return arr;
    });
    setDragTileIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        summary_dataset: summaryDatasetId ? Number(summaryDatasetId) : null,
        summary_title: summaryTitle,
        summary_hide_title: summaryHideTitle,
        summary_fields: summaryFields.filter(t => t.agg === 'count' || t.field)
          .map(t => ({ ...t, conditions: (t.conditions || []).filter(c => c.field) })),
        map_dataset: mapDatasetId ? Number(mapDatasetId) : null,
        map_title: mapTitle,
        map_hide_title: mapHideTitle,
        latitude_field: latField,
        longitude_field: combinedCoords ? latField : lngField,
        tooltip_fields: tooltipFields,
        map_filter_fields: filterFields,
        map_color_field: mapColorField,
        map_conditions: mapConditions.filter(c => c.field),
        breakdown_dataset: breakdownDatasetId ? Number(breakdownDatasetId) : null,
        breakdown_title: breakdownTitle,
        breakdown_hide_title: breakdownHideTitle,
        group_field: groupField,
        breakdown_fields: breakdownFields,
        breakdown_conditions: breakdownConditions.filter(c => c.field),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {focusSection === 'summary' ? 'Summary Card Settings'
              : focusSection === 'map' ? 'Map Settings'
              : focusSection === 'breakdown' ? 'Breakdown Settings'
              : 'Data Source'}
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          {!focusSection && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Each widget below can pull from a different one of this project's Datasets
              tables — or the same one — entirely independently.
            </p>
          )}

          {/* Summary Card */}
          {(!focusSection || focusSection === 'summary') && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Summary Card</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} placeholder={builtInTitles.summary}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={summaryHideTitle} onChange={(e) => setSummaryHideTitle(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Hide title on public page</span>
            </label>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <Select value={selectValue(toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name), summaryDatasetId ? Number(summaryDatasetId) : null)}
                onChange={(opt) => { setSummaryDatasetId(opt ? opt.value : ''); setSummaryFields([]); }}
                options={toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name)}
                placeholder="Select table..." isClearable styles={selectStyles} />
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

            {summaryTable && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Tiles</label>
                
                <div className="space-y-2">
                  {summaryFields.map((t, i) => (
                    <div key={i}
                      onDragOver={handleTileDragOver}
                      onDrop={() => handleTileDrop(i)}
                      className={`p-2 border rounded-lg transition-colors ${
                        dragTileIndex === i ? 'border-[#0038A8] opacity-60' : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span draggable
                          onDragStart={() => setDragTileIndex(i)}
                          onDragEnd={() => setDragTileIndex(null)}
                          className="cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                          <GripVertical size={14} className="text-gray-400" />
                        </span>
                        <div className="flex-1 min-w-[110px]">
                          <Select value={selectValue(toOptions(summaryTableFields.map(f => f.name), (n) => summaryTableFields.find(f => f.name === n)?.label), t.field)}
                            onChange={(opt) => updateSummaryTile(i, { field: opt ? opt.value : '' })}
                            isDisabled={t.agg === 'count'}
                            options={toOptions(summaryTableFields.map(f => f.name), (n) => summaryTableFields.find(f => f.name === n)?.label)}
                            placeholder="Select column..." isClearable styles={selectStyles} />
                        </div>
                        <div className="w-52">
                          <Select value={selectValue(TILE_AGG_OPTIONS, t.agg)}
                            onChange={(opt) => updateSummaryTile(i, { agg: opt.value })}
                            options={TILE_AGG_OPTIONS} isSearchable={false} styles={selectStyles} />
                        </div>
                        {t.agg === 'count_equals' && (
                          <div className="w-32">
                            <Select value={selectValue(toOptions(distinctFieldValues((summaryTable?.rows || []).map(r => r.values || {}), t.field)), t.equals || '')}
                              onChange={(opt) => updateSummaryTile(i, { equals: opt ? opt.value : '' })}
                              options={toOptions(distinctFieldValues((summaryTable?.rows || []).map(r => r.values || {}), t.field))}
                              placeholder="Value..." isClearable styles={selectStyles} />
                          </div>
                        )}
                        <input value={t.label || ''} onChange={(e) => updateSummaryTile(i, { label: e.target.value })}
                          placeholder="Tile label" className="w-28 px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                        {i > 0 && (
                          <button type="button" onClick={() => setHighlightTile(i)} title="Make this the highlighted tile"
                            className={`shrink-0 ${t.highlight ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}>
                            <Star size={16} fill={t.highlight ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        <button type="button" onClick={() => removeSummaryTile(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 mb-1">Filter rows for this tile (optional — independent of every other tile's own filter)</p>
                        <ConditionsEditor conditions={t.conditions} onChange={(next) => updateSummaryTile(i, { conditions: next })}
                          fieldOptions={toOptions(summaryTableFields.map(f => f.name), (n) => summaryTableFields.find(f => f.name === n)?.label)}
                          valuesFor={(field) => toOptions(distinctFieldValues((summaryTable?.rows || []).map(r => r.values || {}), field))} />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addSummaryTile}
                    className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
                    + Add tile
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Map */}
          {(!focusSection || focusSection === 'map') && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Map</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={mapTitle} onChange={(e) => setMapTitle(e.target.value)} placeholder={builtInTitles.map}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={mapHideTitle} onChange={(e) => setMapHideTitle(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Hide title on public page</span>
            </label>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <Select value={selectValue(toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name), mapDatasetId ? Number(mapDatasetId) : null)}
                onChange={(opt) => { setMapDatasetId(opt ? opt.value : ''); setLatField(''); setLngField(''); setCombinedCoords(false); setTooltipFields([]); setFilterFields([]); setMapColorField(''); setMapConditions([]); }}
                options={toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name)}
                placeholder="Select table..." isClearable styles={selectStyles} />
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

            {!instanceMode && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Marker icon <span className="text-gray-400">(replaces the default colored dot for every marker)</span>
              </label>
              <div className="flex items-center gap-3">
                {markerIcon ? (
                  <img src={markerIcon} alt="Marker icon" className="w-9 h-9 rounded object-contain border border-gray-200 dark:border-gray-700 shrink-0" />
                ) : markerIconName ? (
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-center">
                    {(() => {
                      const SelectedIcon = MARKER_ICON_OPTIONS.find(o => o.name === markerIconName)?.Icon;
                      return SelectedIcon ? <SelectedIcon size={18} color={markerIconColor} /> : null;
                    })()}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0038A8] shrink-0" title="Default marker" />
                )}
                <label className={`px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-[#0038A8] ${savingMarkerIcon ? 'opacity-50 pointer-events-none' : ''}`}>
                  Upload image
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMarkerIconFile(f); e.target.value = ''; }} />
                </label>
                {(markerIcon || markerIconName) && (
                  <button type="button" onClick={clearMarkerIcon} disabled={savingMarkerIcon}
                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50">
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input value={markerIconUrlInput} onChange={(e) => setMarkerIconUrlInput(e.target.value)}
                  placeholder="...or paste an image URL"
                  className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                <button type="button" onClick={setMarkerIconUrl}
                  disabled={savingMarkerIcon || markerIconUrlInput.trim() === markerIcon}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40">
                  {savingMarkerIcon ? 'Saving...' : 'Set'}
                </button>
              </div>

              <div className="mt-3">
                <p className="text-[11px] text-gray-400 mb-1.5">...or pick an icon (any color):</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="color" value={markerIconColor} onChange={(e) => changeMarkerIconColor(e.target.value)}
                    disabled={savingMarkerIcon}
                    className="w-8 h-8 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
                    title="Icon color" />
                  {MARKER_ICON_OPTIONS.map(({ name, Icon }) => (
                    <button key={name} type="button" onClick={() => selectMarkerIconName(name)} disabled={savingMarkerIcon}
                      title={name}
                      className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-50 ${
                        markerIconName === name ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}>
                      <Icon size={16} color={markerIconName === name ? markerIconColor : undefined}
                        className={markerIconName === name ? '' : 'text-gray-500 dark:text-gray-400'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {mapTable && (
              <>
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 cursor-pointer">
                    <input type="checkbox" checked={combinedCoords}
                      onChange={(e) => { setCombinedCoords(e.target.checked); setLngField(''); }}
                      className="rounded" />
                    Coordinates are stored in a single column (e.g. "8.486735683, 124.6322367")
                  </label>

                  {combinedCoords ? (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Coordinates column</label>
                      <Select value={selectValue(toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label), latField)}
                        onChange={(opt) => setLatField(opt ? opt.value : '')}
                        options={toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label)}
                        placeholder="None" isClearable styles={selectStyles} />
                      <p className="text-[11px] text-gray-400 mt-1">Value should be "latitude, longitude" — e.g. 8.486735683, 124.6322367</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Latitude column</label>
                        <Select value={selectValue(toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label), latField)}
                          onChange={(opt) => setLatField(opt ? opt.value : '')}
                          options={toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label)}
                          placeholder="None" isClearable styles={selectStyles} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Longitude column</label>
                        <Select value={selectValue(toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label), lngField)}
                          onChange={(opt) => setLngField(opt ? opt.value : '')}
                          options={toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label)}
                          placeholder="None" isClearable styles={selectStyles} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Hover tooltip <span className="text-gray-400">(columns shown when hovering a dot)</span>
                  </label>
                  {mapTableFields.length === 0 ? (
                    <p className="text-xs text-gray-400">No columns on this table yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {mapTableFields.map(f => (
                        <button key={f.id} type="button" onClick={() => toggleTooltipField(f.name)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            tooltipFields.includes(f.name) ? 'bg-[#0038A8] text-white border-[#0038A8]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {tooltipFields.length === 0 ? "No fields selected — dots won't show a hover tooltip." : 'Shown in the order clicked.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Filter dropdowns <span className="text-gray-400">(columns visitors can filter the map by)</span>
                  </label>
                  {mapTableFields.length === 0 ? (
                    <p className="text-xs text-gray-400">No columns on this table yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {mapTableFields.map(f => (
                        <button key={f.id} type="button" onClick={() => toggleFilterField(f.name)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            filterFields.includes(f.name) ? 'bg-[#0038A8] text-white border-[#0038A8]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {filterFields.length === 0
                      ? 'No fields selected — the map shows an unfiltered search box only.'
                      : 'Shown in the order clicked.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Group / color map by <span className="text-gray-400">(sets marker color + the legend — any column, doesn't need to be a filter dropdown above)</span>
                  </label>
                  <Select value={selectValue(toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label), mapColorField)}
                    onChange={(opt) => setMapColorField(opt ? opt.value : '')}
                    options={toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label)}
                    placeholder="None — every marker uses the default color" isClearable styles={selectStyles} />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Filter rows <span className="text-gray-400">(optional — only rows matching every condition plot on the Map at all, regardless of what a visitor picks above)</span>
                  </label>
                  <ConditionsEditor conditions={mapConditions} onChange={setMapConditions}
                    fieldOptions={toOptions(mapTableFields.map(f => f.name), (n) => mapTableFields.find(f => f.name === n)?.label)}
                    valuesFor={(field) => toOptions(distinctFieldValues((mapTable?.rows || []).map(r => r.values || {}), field))} />
                </div>
              </>
            )}
          </div>
          )}

          {/* Breakdown */}
          {(!focusSection || focusSection === 'breakdown') && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Breakdown</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={breakdownTitle} onChange={(e) => setBreakdownTitle(e.target.value)} placeholder={builtInTitles['province-breakdown']}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={breakdownHideTitle} onChange={(e) => setBreakdownHideTitle(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-xs text-gray-700 dark:text-gray-300">Hide title on public page</span>
            </label>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <Select value={selectValue(toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name), breakdownDatasetId ? Number(breakdownDatasetId) : null)}
                onChange={(opt) => { setBreakdownDatasetId(opt ? opt.value : ''); setGroupField(''); setBreakdownFields([]); setBreakdownConditions([]); }}
                options={toOptions(tables.map(t => t.id), (id) => tables.find(t => t.id === id)?.name)}
                placeholder="Select table..." isClearable styles={selectStyles} />
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

            {breakdownTable && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">"Group by" column</label>
                  <Select value={selectValue(toOptions(breakdownTableFields.map(f => f.name), (n) => breakdownTableFields.find(f => f.name === n)?.label), groupField)}
                    onChange={(opt) => setGroupField(opt ? opt.value : '')}
                    options={toOptions(breakdownTableFields.map(f => f.name), (n) => breakdownTableFields.find(f => f.name === n)?.label)}
                    placeholder="None" isClearable styles={selectStyles} />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Filter rows <span className="text-gray-400">(optional — only rows matching every condition are grouped/counted)</span>
                  </label>
                  <ConditionsEditor conditions={breakdownConditions} onChange={setBreakdownConditions}
                    fieldOptions={toOptions(breakdownTableFields.map(f => f.name), (n) => breakdownTableFields.find(f => f.name === n)?.label)}
                    valuesFor={(field) => toOptions(distinctFieldValues((breakdownTable?.rows || []).map(r => r.values || {}), field))} />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Raw-data columns <span className="text-gray-400">(shown when a group row is clicked)</span>
                  </label>
                  {breakdownTableFields.length === 0 ? (
                    <p className="text-xs text-gray-400">No columns on this table yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {breakdownTableFields.map(f => (
                        <button key={f.id} type="button" onClick={() => toggleBreakdownField(f.name)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            breakdownFields.includes(f.name) ? 'bg-[#0038A8] text-white border-[#0038A8]' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {breakdownFields.length === 0 ? 'None selected — every column will be shown.' : 'Shown in the order clicked.'}
                  </p>
                </div>
              </>
            )}
          </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FreeWifiCharts({ slug = 'free-wifi' }) {
  // Free Wi-Fi's own FreeWifiLiveData/MainData/TargetData/MasterlistData/ChartConfig/
  // KmsSettings-based fixed data source has been removed — it now goes through the
  // exact same tagged-dataset path (ProjectChartConfig/ProjectChartSource) as every
  // other project, via 'free-wifi' being just another entry in PROJECT_DATASET_ROW_MODELS
  // on the backend. This is permanently false (not `slug === 'free-wifi'`) so every branch
  // below that used to special-case Free Wi-Fi now takes the generic path instead — those
  // branches (and the getFreeWifi*/services/freewifi(Data).js imports they call) are dead
  // code kept only because other, still-live code in this file references the same
  // variables; harmless since they can no longer execute.
  const isFreeWifi = false;

  const [summary, setSummary] = useState(null);
  // Every dataset a built-in chart could be pointed at; 'live' stays the default and is
  // what custom charts (unaffected by this feature) keep using via the `sites` alias below.
  // Non-Free-Wi-Fi projects have one entry per built-in ('summary'/'map'/'breakdown') since
  // each can now be tagged to a different table — see chartSource's *_dataset fields.
  const [datasets, setDatasets] = useState({ live: [], main: [], target: [], masterlist: [] });
  const sites = isFreeWifi ? datasets.live : [];
  const summarySites = datasets.summary || [];
  const mapSites = datasets.map || [];
  const breakdownSites = datasets.breakdown || [];
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState(null);
  // "Show" / "Hidden" tab — switches the whole content area, same pattern as Awards/
  // Accomplishments/Highlights. The Show grid still maps over the FULL allCharts array
  // (see below) so drag-reorder stays index-coupled to true positions (handleDrop splices
  // by index) — hidden charts just render as `null` instead of a card, which is safe here
  // because the grid uses relative `col-span-N` classes (auto-flow), not absolute
  // grid-column/row lines, so skipping one doesn't leave a gap.
  const [activeView, setActiveView] = useState('show');
  const [hiddenChartSearch, setHiddenChartSearch] = useState('');
  const [hiddenChartSort, setHiddenChartSort] = useState('default');
  // General search bar for the Breakdown built-in — matches a group's own label AND any
  // row's value in the selected "Breakdown raw-data columns", so a group whose name
  // doesn't match still shows up (and its raw-data table pre-filters to just the matching
  // rows) if something inside it does.
  const [provinceSearch, setProvinceSearch] = useState('');
  // Non-Free-Wi-Fi only: clicking a Breakdown row narrows the Map to that group's dots
  // (cleared via the "Clear filter"/"Show all" chip on either widget) and expands an
  // inline raw-data table under the Breakdown list, scoped to the same rows — just
  // pagination state, since the search above already covers its content.
  const [breakdownFilter, setBreakdownFilter] = useState(null);
  const [rawDataPage, setRawDataPage] = useState(1);

  // Non-Free-Wi-Fi only: this project's office id, its own Datasets-tab tables, and the
  // "which table (+ which of its columns) feeds the built-ins" tagging (ProjectChartSource) —
  // the generic equivalent of Free Wi-Fi's per-built-in DATA_SOURCES + KmsSettings fields.
  const [officeId, setOfficeId] = useState(null);
  const [genericTables, setGenericTables] = useState([]);
  const [chartSource, setChartSource] = useState(null);
  // false = closed; 'all' = every widget (the "Data Source" button); 'summary'/'map'/
  // 'breakdown' = just that one built-in chart's own settings (its "Edit" button) — see
  // DataSourceModal's focusSection prop.
  const [dataSourceModalSection, setDataSourceModalSection] = useState(false);

  // Charts page's admin-defined filters (see GlobalDateFilterBar/FilterSettingsModal) —
  // applied upstream of every built-in AND custom chart. `generalFilterValues` is
  // { [label]: {from,to} for a 'range' filter | string for an 'exact' one }. Options come
  // from the FULL table list (not yet filtered) so they don't shrink as filters apply.
  // Non-Free-Wi-Fi only, same as the rest of this block.
  const [generalFilterValues, setGeneralFilterValues] = useState({});
  const generalFilterLabels = chartSource?.general_filters || [];
  const generalFilterOptions = useMemo(
    () => generalFilterOptionsFor(genericTables, generalFilterLabels),
    [genericTables, generalFilterLabels]
  );
  // Filter bar's own "pencil" settings modal (add/remove filters + per-table column tags)
  // — see FilterSettingsModal, same pattern as each built-in chart's own Edit button.
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const filteredGenericTables = useMemo(
    () => filterTablesByGeneralFilter(genericTables, generalFilterLabels, generalFilterValues),
    [genericTables, generalFilterLabels, generalFilterValues]
  );

  const recordsByDataset = useMemo(() => {
    const map = {};
    filteredGenericTables.forEach((t) => {
      const records = (t.rows || []).map((r) => ({ id: r.id, ...(r.values || {}) }));
      map[t.id] = mergeReferencedFields(records, t.fields, filteredGenericTables);
    });
    return map;
  }, [filteredGenericTables]);

  // Re-derive the built-ins' record sets whenever a filter changes — same computation the
  // initial load / Data Source save already run, just also reacting to filteredGenericTables.
  useEffect(() => {
    if (isFreeWifi || !chartSource) return;
    setDatasets(buildTaggedRecords(filteredGenericTables, chartSource));
  }, [isFreeWifi, filteredGenericTables, chartSource]);

  // Field list for the custom-chart builder: Free Wi-Fi's fixed list, or whichever table
  // a given chart is pointed at (each project can have several Datasets tables, unlike
  // Free Wi-Fi where custom charts implicitly always read Live Sites).
  const availableFieldsFor = (datasetId) => {
    if (isFreeWifi) return FREEWIFI_AVAILABLE_FIELDS;
    const table = genericTables.find((t) => t.id === Number(datasetId));
    const own = (table?.fields || []).map((f) => ({ value: f.name, label: f.label }));
    return [...own, ...referencedFieldOptionsFor(table, genericTables)];
  };

  // All charts in a single ordered list, deduped against stale saved state. Free Wi-Fi
  // seeds from its per-browser cache first (then reconciles with the backend below);
  // other projects always load fresh from the backend, so they start empty here.
  const [allCharts, setAllCharts] = useState(() => {
    if (!isFreeWifi) return sanitizeCharts([]);
    try {
      const saved = localStorage.getItem('freewifi_all_charts');
      if (saved) return sanitizeCharts(JSON.parse(saved));
    } catch {}
    return sanitizeCharts([]);
  });

  const [showAddChart, setShowAddChart] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [savingChart, setSavingChart] = useState(false);
  const [newChart, setNewChart] = useState({
    title: '', field: isFreeWifi ? 'province' : '', secondaryField: '', chartType: 'bar-horizontal',
    agg: 'sum', equals: '',
    aggregationEnabled: false, aggregationField: '', aggregationType: 'sum',
    cardDesign: 'big-number', cardIcon: '', cardColor: '#0038A8', cardTarget: '', cardImage: '', cardTextAlign: 'left',
    cardGradientColor: '#000000', cardDescription: '',
    hideTitle: false,
    dateGroupBy: 'month', cumulative: false, valueLabels: {},
    conditions: [],
    gridSize: 'full', showOnUser: true, showAllCategories: false, dataset: '',
    extraDatasets: [], fieldMap: {}, secondaryFieldMap: {}, aggregationFieldMap: {}, tableConditions: {},
  });
  // 'image-bg' card design's background photo — URL mode just writes straight into
  // newChart.cardImage like any other text field; Upload mode holds the picked File here
  // (not yet sent) since it needs the chart's id to attach to, which doesn't exist yet for
  // a brand-new chart — handleAddChart uploads it as a follow-up call after create/update
  // (see uploadProjectChartConfigCardImage). Reset whenever the modal opens/closes so a
  // stale pending file from a previous chart never gets attached to the wrong one.
  const [cardImageMode, setCardImageMode] = useState('url');
  const [pendingCardImageFile, setPendingCardImageFile] = useState(null);
  // Recomputed only when the picked file actually changes (not every render) — calling
  // createObjectURL on every render would mint a new, never-revoked blob URL each time.
  const cardImagePreviewUrl = useMemo(
    () => (pendingCardImageFile ? URL.createObjectURL(pendingCardImageFile) : ''),
    [pendingCardImageFile]
  );

  // Summary card appearance — published setting, same one the public page reads (Free
  // Wi-Fi only; other projects' equivalent lives on chartSource, no public page to match).
  const [summaryStyle, setSummaryStyle] = useState(DEFAULT_SUMMARY_STYLE);
  const [showSummaryStyle, setShowSummaryStyle] = useState(false);
  const [savingSummaryStyle, setSavingSummaryStyle] = useState(false);

  useEffect(() => {
    if (isFreeWifi) {
      Promise.all([
        getFreeWifiSummary(),
        getFreeWifiLiveData(),
        getFreeWifiMainData().catch(() => []),
        getFreeWifiTargetData().catch(() => []),
        getFreeWifiMasterlistData().catch(() => []),
      ])
        .then(([s, live, main, target, masterlist]) => {
          setSummary(s);
          setDatasets({ live, main, target, masterlist: masterlist.map(normalizeMasterlistRecord) });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      getProjectOfficeId(slug), getProjectDatasets(slug), getProjectChartSource(slug), getProjectChartConfigs(slug),
      getProjectBuiltinWidgets(slug),
    ])
      .then(([id, tables, source, configs, widgets]) => {
        setOfficeId(id);
        setGenericTables(tables);
        setChartSource(source);
        setDatasets(buildTaggedRecords(tables, source));
        setAllCharts(sanitizeCharts(
          [...configs.map(chartConfigFromBackend), ...widgets.map(builtinWidgetFromBackend)],
          source.chart_order, source.hidden_builtins || []
        ));
        setSummaryStyle({
          colorFrom: source.color_from || '#0038A8',
          colorTo: source.color_to || '#0055f1',
          orientation: source.orientation || 'row',
          accentColor: source.accent_color || '#FCD116',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!isFreeWifi) return;
    localStorage.setItem('freewifi_all_charts', JSON.stringify(allCharts));
  }, [allCharts, isFreeWifi]);

  // Reconcile with the backend: bring in charts created elsewhere (another browser/
  // session), and refresh ones already known here. Legacy local-only charts (string ids,
  // predating server sync) are left alone until the admin re-saves them. Free Wi-Fi only —
  // other projects already loaded fresh from the backend above, nothing to reconcile.
  useEffect(() => {
    if (!isFreeWifi) return;
    getFreeWifiChartConfigs().then(configs => {
      setAllCharts(prev => {
        const merged = [...prev];
        configs.map(chartConfigFromBackend).forEach(bc => {
          const idx = merged.findIndex(c => c.id === bc.id);
          if (idx === -1) merged.push(bc);
          else merged[idx] = bc;
        });
        return sanitizeCharts(merged);
      });
    }).catch(console.error);
  }, [isFreeWifi]);

  // Pull in the published data-source setting for each built-in, so this admin's own
  // view matches whatever was last set (possibly from a different browser/session).
  // Free Wi-Fi only — other projects' equivalent (chartSource) was already loaded above.
  useEffect(() => {
    if (!isFreeWifi) return;
    getKmsSettings().then(settings => {
      setAllCharts(prev => prev.map(c => {
        const field = BUILTIN_SOURCE_SETTING[c.id];
        return field && settings[field] ? { ...c, dataSource: settings[field] } : c;
      }));
      setSummaryStyle({
        colorFrom: settings.freewifi_summary_color_from || '#0038A8',
        colorTo: settings.freewifi_summary_color_to || '#0055f1',
        orientation: settings.freewifi_summary_orientation || 'row',
        accentColor: settings.freewifi_summary_accent_color || '#FCD116',
      });
    }).catch(console.error);
  }, []);

  // Distinct value count per field — drives chart-type recommendations. Free Wi-Fi
  // always counts against `sites`; other projects count against whichever table the
  // chart being added/edited is currently pointed at.
  const fieldCardinality = useMemo(() => {
    const map = {};
    const fields = isFreeWifi ? FREEWIFI_AVAILABLE_FIELDS : availableFieldsFor(newChart.dataset);
    const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
    // Counts real, non-blank distinct values only — same rule distinctFieldValues uses for
    // the "equals" value picker, so the "(N values)" label next to a field never claims
    // more than that picker can actually offer. That distinction matters most for an
    // auto-merged field (see mergeReferencedFields): when a linked column's key doesn't
    // match anything in the other table, every record's merged value is blank, and this
    // must show "(0 values)" — not silently count that shared blankness as if it were one
    // real "N/A" category, which used to make an entirely unmatched link look like it had
    // data.
    fields.forEach(f => { map[f.value] = distinctFieldValues(records, f.value).length; });
    return map;
  }, [sites, isFreeWifi, newChart.dataset, recordsByDataset, genericTables]);

  // Which fields look like real date data — gates Line/Area in the chart-type picker (see
  // CHART_TYPES' requiresDateField) so they're never offered for a field that can't
  // actually be plotted chronologically.
  const fieldIsDateLike = useMemo(() => {
    const map = {};
    const fields = isFreeWifi ? FREEWIFI_AVAILABLE_FIELDS : availableFieldsFor(newChart.dataset);
    const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
    // A field explicitly typed 'date' on the Datasets tab (ProjectDatasetField.field_type)
    // is trusted outright, bypassing the value-sniffing heuristic entirely — most imported
    // tables never get that type set (CSV/JSON import only ever picks 'number' or 'text',
    // never 'date'), so a column that IS full of dates but stored in a format the heuristic
    // doesn't recognize would otherwise have no way to unlock Line/Area. Marking the field
    // Date in the Datasets tab is that escape hatch.
    const table = isFreeWifi ? null : genericTables.find(t => t.id === Number(newChart.dataset));
    fields.forEach(f => {
      const declaredType = table?.fields?.find(tf => tf.name === f.value)?.field_type;
      map[f.value] = declaredType === 'date' || isDateLikeField(records, f.value);
    });
    return map;
  }, [sites, isFreeWifi, newChart.dataset, recordsByDataset, genericTables]);

  // Custom charts are persisted server-side (FreeWifiChartConfig) so the public Free Wi-Fi
  // page can show them too. A chart with a numeric id is already backend-synced — anything
  // else (the old `custom-<timestamp>` ids from before this existed) hasn't been created
  // there yet, so saving it now creates it for the first time rather than updating.
  const handleAddChart = async () => {
    if (!newChart.title.trim()) return alert('Title is required');
    if (!isFreeWifi && !newChart.dataset) return alert('Choose a table first');
    const dup = allCharts.find(c => c.type === 'custom' && c.id !== editingChart?.id && chartSignature(c) === chartSignature(newChart));
    if (dup) return alert(`A chart with the same type and field already exists: "${dup.title}"`);
    setSavingChart(true);
    try {
      const isBackedChart = editingChart && typeof editingChart.id === 'number';
      const payload = {
        ...chartConfigToBackend(newChart),
        ...(isFreeWifi ? {} : { dataset: Number(newChart.dataset), ...(isBackedChart ? {} : { office: officeId, order: allCharts.length }) }),
      };
      let saved = isFreeWifi
        ? (isBackedChart ? await updateFreeWifiChartConfig(editingChart.id, payload) : await createFreeWifiChartConfig(payload))
        : (isBackedChart ? await updateProjectChartConfig(editingChart.id, payload) : await createProjectChartConfig(payload));
      // The image file (if the admin picked "Upload" instead of pasting a URL) needs the
      // chart's own id to attach to, which a brand-new chart doesn't have until the create
      // call above returns it — so this always runs as a follow-up, never inline with the
      // main save.
      if (!isFreeWifi && pendingCardImageFile) {
        saved = await uploadProjectChartConfigCardImage(saved.id, pendingCardImageFile);
      }
      const chart = chartConfigFromBackend(saved);
      if (editingChart) {
        setAllCharts(prev => prev.map(c => c.id === editingChart.id ? chart : c));
      } else {
        setAllCharts(prev => [...prev, chart]);
      }
      setShowAddChart(false);
      setEditingChart(null);
      setNewChart({ title: '', field: isFreeWifi ? 'province' : '', secondaryField: '', chartType: 'bar-horizontal', agg: 'sum', equals: '', gridSize: 'full', showOnUser: true, showAllCategories: false, dataset: '' });
      setCardImageMode('url');
      setPendingCardImageFile(null);
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSavingChart(false);
    }
  };

  const handleDeleteChart = async (id) => {
    if (!confirm('Delete this chart?')) return;
    const chart = allCharts.find(c => c.id === id);
    setAllCharts(prev => prev.filter(c => c.id !== id));
    if (typeof id === 'number') {
      const del = isFreeWifi ? deleteFreeWifiChartConfig(id) : deleteProjectChartConfig(id);
      del.catch(() => alert('Failed to delete on the server — it may reappear on next reload.'));
    } else if (chart?.type === 'builtin-extra' && chart.dbId != null) {
      deleteProjectBuiltinWidget(chart.dbId).catch(() => alert('Failed to delete on the server — it may reappear on next reload.'));
    }
  };

  const toggleVisibility = (id) => {
    setAllCharts(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    if (isFreeWifi) return;
    const chart = allCharts.find(c => c.id === id);
    const willBeVisible = !chart?.visible;
    if (typeof id === 'number') {
      updateProjectChartConfig(id, { visible: willBeVisible }).catch(console.error);
    } else if (chart?.type === 'builtin-extra') {
      // Extra widget instance (see ProjectBuiltinWidget) — its own visible flag, not the
      // singleton's hidden_builtins list.
      if (chart.dbId != null) updateProjectBuiltinWidget(chart.dbId, { visible: willBeVisible }).catch(console.error);
    } else {
      // Built-in chart — id is its fixed string ('summary'/'map'/'province-breakdown'),
      // not a ProjectChartConfig row, so its hidden state lives on ProjectChartSource
      // instead (see hidden_builtins). This was previously missing entirely, so hiding a
      // built-in only ever changed local state — it silently reverted to visible on
      // reload since nothing was ever persisted.
      const current = chartSource?.hidden_builtins || [];
      const next = willBeVisible ? current.filter(x => x !== id) : [...new Set([...current, id])];
      updateProjectChartSource(slug, { hidden_builtins: next }).then(setChartSource).catch(console.error);
    }
  };

  const toggleUserVisibility = (id) => {
    setAllCharts(prev => prev.map(c => c.id === id ? { ...c, showOnUser: !c.showOnUser } : c));
  };

  // Built-ins' data source. Free Wi-Fi lets each of the 3 built-ins point at a
  // different one of its 4 fixed tables (published via KmsSettings, read-only on the
  // public page). Other projects share ONE tagged table across all 3 (ProjectChartSource)
  // — see the "Data Source" button/modal instead of a per-card picker.
  const setChartDataSource = (id, dataSource) => {
    setAllCharts(prev => prev.map(c => c.id === id ? { ...c, dataSource } : c));
    const settingField = BUILTIN_SOURCE_SETTING[id];
    if (settingField) {
      updateKmsSettings({ [settingField]: dataSource }).catch(console.error);
    }
  };

  const handleSaveSummaryStyle = async (draft) => {
    setSavingSummaryStyle(true);
    try {
      if (isFreeWifi) {
        await updateKmsSettings({
          freewifi_summary_color_from: draft.colorFrom,
          freewifi_summary_color_to: draft.colorTo,
          freewifi_summary_orientation: draft.orientation,
          freewifi_summary_accent_color: draft.accentColor,
        });
      } else {
        await updateProjectChartSource(slug, {
          color_from: draft.colorFrom, color_to: draft.colorTo,
          orientation: draft.orientation, accent_color: draft.accentColor,
        });
      }
      setSummaryStyle(draft);
      setShowSummaryStyle(false);
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSavingSummaryStyle(false);
    }
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setAllCharts(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(dropIndex, 0, moved);
      // Free Wi-Fi's order is a per-browser (localStorage) concept only — see the effect
      // above. Other projects have no such fallback, so persist to the backend here:
      // custom charts' own relative order (ProjectChartConfig.order, read elsewhere) AND
      // the full combined built-in+custom sequence (ProjectChartSource.chart_order) — the
      // former alone can't place a custom chart above/below a built-in, only against other
      // custom charts, which is why built-ins used to always end up last on reload.
      if (!isFreeWifi) {
        const customOrder = arr.filter(c => c.type === 'custom').map((c, i) => ({ id: c.id, order: i }));
        if (customOrder.length) reorderProjectChartConfigs(customOrder).catch(console.error);
        const chartOrder = arr.map(c => c.id);
        updateProjectChartSource(slug, { chart_order: chartOrder })
          .then(saved => setChartSource(saved))
          .catch(console.error);
      }
      return arr;
    });
    setDragIndex(null);
  };
  // Dropped outside any card (or drag cancelled) never fires onDrop — reset here so the
  // dragged card doesn't stay stuck looking "lifted" (dimmed/scaled) forever.
  const handleDragEnd = () => setDragIndex(null);

  // Extra Summary/Map/Breakdown widget instances (see ProjectBuiltinWidget) — "add
  // widget" menu open state + which instance (if any) has its settings editor open.
  // Declared here, above the loading early-return below, so every render calls the same
  // number of hooks regardless of whether `loading` is still true.
  const [addingWidgetType, setAddingWidgetType] = useState(false);
  const [editingWidgetInstance, setEditingWidgetInstance] = useState(null);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Built-in titles for non-Free-Wi-Fi projects — the one piece of "premade chart"
  // customization every project gets even before it tags a data source: renaming what
  // Summary Card / Map / Breakdown are called. Blank falls back to a generic default.
  const builtInTitles = {
    summary: chartSource?.summary_title || 'Summary',
    map: chartSource?.map_title || 'Map',
    'province-breakdown': chartSource?.breakdown_title || 'Breakdown',
  };

  // The raw-data table for whichever Breakdown group is expanded — rendered inline right
  // under that group's own row (accordion-style), not floated in a modal or shared at the
  // bottom of the list. `query` is the general Breakdown search bar's value: if the group
  // itself matched the query by its label, every row shows (searching "Bukidnon" should
  // show all of Bukidnon); otherwise only rows whose own fields match it do (the group
  // only qualified to be listed because something inside it matched).
  const renderBreakdownRawData = (group, groupField, records, fieldDefs, query) => {
    const groupRows = records.filter(r => (r[groupField] || 'N/A') === group);
    const groupLabelMatches = query && group.toLowerCase().includes(query);
    const filteredRows = !query || groupLabelMatches
      ? groupRows
      : groupRows.filter(r => fieldDefs.some(f => String(r[f.name] ?? '').toLowerCase().includes(query)));
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / RAW_DATA_PAGE_SIZE));
    const page = Math.min(rawDataPage, totalPages);
    const pageRows = filteredRows.slice((page - 1) * RAW_DATA_PAGE_SIZE, page * RAW_DATA_PAGE_SIZE);

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-400 mb-3">
          {filteredRows.length.toLocaleString()} row{filteredRows.length === 1 ? '' : 's'}
          {query && !groupLabelMatches ? ` matching "${provinceSearch}"` : ''}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {fieldDefs.map(f => (
                  <th key={f.id} className="text-left py-1.5 px-2 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={fieldDefs.length || 1} className="text-center py-6 text-xs text-gray-400">No matching rows.</td></tr>
              ) : pageRows.map((r, i) => (
                <tr key={r.id ?? i} className="border-t border-gray-100 dark:border-gray-800">
                  {fieldDefs.map(f => (
                    <td key={f.id} className="py-1.5 px-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{String(r[f.name] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setRawDataPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Prev</button>
              <button type="button" onClick={() => setRawDataPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Generic (non-Free-Wi-Fi) built-in rendering — sourced from whichever table + columns
  // this project tagged via the "Data Source" button (ProjectChartSource), instead of
  // Free Wi-Fi's fixed province/AP/coordinate fields.
  const renderGenericBuiltIn = (chartId) => {
    const source = chartSource || {};
    switch (chartId) {
      case 'summary': {
        const records = summarySites;
        const taggedFields = genericTables.find(t => t.id === source.summary_dataset)?.fields || [];
        const tiles = computeSummaryTiles(records, source, taggedFields);
        return (
          <div className="rounded-2xl p-8 text-white -m-4" style={{ background: `linear-gradient(135deg, ${summaryStyle.colorFrom}, ${summaryStyle.colorTo})` }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-white/70">SUMMARY</span>
              <span className="text-sm text-white/50">as of</span>
              <span className="text-sm font-medium">{summaryAsOfLabel(summaryDateFrom, summaryDateTo, today)}</span>
            </div>
            {renderSummaryCardBody(tiles, summaryStyle)}
          </div>
        );
      }
      case 'map': {
        const records = mapSites;
        const taggedFields = genericTables.find(t => t.id === source.map_dataset)?.fields || [];
        if (!source.latitude_field || !source.longitude_field) {
          return <div className="py-16 text-center text-sm text-gray-400">No latitude/longitude columns tagged yet — set them via "Data Source" above.</div>;
        }
        const { mapped, tooltipFieldDefs, filterFieldDefs, colorFieldDef } = resolveMapSites(records, source, taggedFields);
        // A Breakdown row click sets breakdownFilter — hide every dot that doesn't belong
        // to that group instead of showing everything.
        const groupField = source.group_field;
        const filteredMapped = breakdownFilter && groupField
          ? mapped.filter(r => (r[groupField] || 'N/A') === breakdownFilter)
          : mapped;
        if (!filteredMapped.length) {
          return (
            <div className="py-16 text-center text-sm text-gray-400">
              {breakdownFilter ? (
                <>No coordinate data for "{breakdownFilter}". <button type="button" onClick={() => setBreakdownFilter(null)} className="text-[#0038A8] dark:text-blue-400 hover:underline">Show all</button></>
              ) : 'No coordinate data available in this table.'}
            </div>
          );
        }
        return (
          <div>
            {breakdownFilter && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Showing <strong className="text-gray-700 dark:text-gray-300">{breakdownFilter}</strong> only ({filteredMapped.length.toLocaleString()} of {mapped.length.toLocaleString()})
                </span>
                <button type="button" onClick={() => setBreakdownFilter(null)}
                  className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
                  Show all
                </button>
              </div>
            )}
            <div className="-m-4"><FreeWifiMap sites={filteredMapped} totalAPs={filteredMapped.length} height="500px" tooltipFields={tooltipFieldDefs} filterFields={filterFieldDefs} colorField={colorFieldDef} markerIcon={source.marker_icon} markerIconName={source.marker_icon_name} markerIconColor={source.marker_icon_color} /></div>
          </div>
        );
      }
      case 'province-breakdown': {
        if (!source.group_field) {
          return <div className="py-16 text-center text-sm text-gray-400">No "group by" column tagged yet — set one via "Data Source" above.</div>;
        }
        const records = filterRecordsByConditions(breakdownSites, source.breakdown_conditions);
        const taggedFields = genericTables.find(t => t.id === source.breakdown_dataset)?.fields || [];
        const groupField = source.group_field;
        // Columns for the raw-data table — from "Breakdown raw-data columns" in Data
        // Source, or every tagged column if none were picked. Computed before `entries` so
        // the search below can also match against them, not just each group's own label.
        const rawDataFieldDefs = (source.breakdown_fields || []).length
          ? source.breakdown_fields.map(name => taggedFields.find(f => f.name === name)).filter(Boolean)
          : taggedFields;
        const rowsByGroup = {};
        records.forEach(r => {
          const key = r[groupField] || 'N/A';
          (rowsByGroup[key] = rowsByGroup[key] || []).push(r);
        });
        const maxCount = Math.max(...Object.values(rowsByGroup).map(rows => rows.length), 1);
        const query = provinceSearch.trim().toLowerCase();
        const entries = Object.entries(rowsByGroup)
          .filter(([group, rows]) => !query
            || group.toLowerCase().includes(query)
            || rows.some(r => rawDataFieldDefs.some(f => String(r[f.name] ?? '').toLowerCase().includes(query))))
          .map(([group, rows]) => [group, rows.length])
          .sort((a, b) => b[1] - a[1]);
        const groupLabel = taggedFields.find(f => f.name === groupField)?.label || groupField;
        // Clicking a row's own header toggles it open/closed (accordion — only one group
        // expanded at a time, matching how the Map filter already works).
        const toggleGroup = (group) => {
          if (breakdownFilter === group) {
            setBreakdownFilter(null);
          } else {
            setBreakdownFilter(group);
            setRawDataPage(1);
          }
        };

        return (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder={`Search by ${groupLabel} or raw data...`}
                value={provinceSearch} onChange={(e) => { setProvinceSearch(e.target.value); setRawDataPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
            </div>
            {query && entries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No matches for "{provinceSearch}"</p>
            )}
            {entries.map(([group, count]) => {
              const isActive = breakdownFilter === group;
              return (
                <div key={group} className={`border rounded-xl overflow-hidden transition-colors ${
                  isActive ? 'border-[#0038A8]' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <button type="button" onClick={() => toggleGroup(group)}
                    title="View raw data and filter the Map to this group"
                    className="w-full flex items-center gap-2 sm:gap-4 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-left font-medium text-gray-900 dark:text-white w-20 sm:w-[200px] shrink-0 truncate">{group}</span>
                    <div className="flex-1 min-w-0 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0038A8]" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16 sm:w-20 text-right shrink-0 truncate">{count} rows</span>
                    {isActive ? <ChevronDown size={18} className="text-gray-400 shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                  </button>
                  {isActive && renderBreakdownRawData(group, groupField, records, rawDataFieldDefs, query)}
                </div>
              );
            })}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Render built-in chart content
  const renderBuiltIn = (chartId, dataSource = 'live') => {
    if (!isFreeWifi) return renderGenericBuiltIn(chartId);
    const records = datasets[dataSource] || [];
    const sourceLabel = DATA_SOURCES.find(s => s.id === dataSource)?.label;
    switch (chartId) {
      case 'summary': {
        const stats = dataSource === 'live'
          ? {
              total_locations: summary?.overall?.total_locations || 0,
              municipalities_count: summary?.overall?.municipalities_count || 0,
              provinces_count: summary?.overall?.provinces_count || 0,
              barangays_count: summary?.overall?.barangays_count || 0,
              total_active_aps: summary?.overall?.total_sites || 0,
              hasApField: true,
            }
          : computeSummaryStats(records);
        return (
          <SummaryCard stats={stats} today={today} sourceLabel={sourceLabel}
            colorFrom={summaryStyle.colorFrom} colorTo={summaryStyle.colorTo} orientation={summaryStyle.orientation} accentColor={summaryStyle.accentColor} />
        );
      }
      case 'map': {
        const hasCoords = records.some(r => r.latitude && r.longitude);
        if (!hasCoords) {
          return (
            <div className="py-16 text-center text-sm text-gray-400">
              No coordinate data available for {sourceLabel}
            </div>
          );
        }
        return (
          <div className="-m-4">
            <FreeWifiMap sites={records} totalAPs={records.length} height="500px" />
          </div>
        );
      }
      case 'province-breakdown': {
        const byProvince = dataSource === 'live' ? (summary?.by_province || {}) : computeProvinceBreakdown(records);
        const maxSites = Math.max(...Object.values(byProvince).map(p => p.total_sites || 0), 1);
        const hasApField = records.some(r => 'ap' in r);
        const query = provinceSearch.trim().toLowerCase();
        const matchesQuery = (s) =>
          s.site_name?.toLowerCase().includes(query) ||
          s.r10_site_id?.toLowerCase().includes(query) ||
          s.locality?.toLowerCase().includes(query) ||
          s.barangay?.toLowerCase().includes(query) ||
          s.province?.toLowerCase().includes(query);
        const provinceEntries = Object.entries(byProvince)
          .map(([prov, data]) => ({ prov, data, siteMatch: query ? records.some(r => r.province === prov && matchesQuery(r)) : false }))
          .filter(({ prov, siteMatch }) => !query || prov.toLowerCase().includes(query) || siteMatch)
          .sort((a, b) => b.data.total_sites - a.data.total_sites);
        return (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by site name, ID, locality, barangay, or province..."
                value={provinceSearch} onChange={(e) => setProvinceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
            </div>
            {query && provinceEntries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No matches for "{provinceSearch}"</p>
            )}
            {provinceEntries.map(({ prov, data, siteMatch }) => (
              <ProvinceBreakdown key={prov} province={prov} data={data} sites={records}
                color={PROVINCE_COLORS[prov] || '#6b7280'} maxSites={maxSites} hasApField={hasApField}
                externalSearch={siteMatch ? query : ''} />
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Renders one EXTRA Summary/Map/Breakdown widget instance (see ProjectBuiltinWidget) —
  // reuses the exact same computeSummaryTiles/resolveMapSites/BreakdownAccordion pipeline
  // the singleton built-ins use above, just fed this instance's OWN settings/table
  // instead of chartSource's. Deliberately independent of every other widget on the page:
  // no "clicking a Breakdown row filters the Map" cross-widget wiring (that's specific to
  // the ORIGINAL singleton pair via breakdownFilter) — each instance only reacts to its
  // own settings.
  const renderBuiltinWidgetInstance = (chart) => {
    const settings = chart.settings || {};
    const datasetId = settings.summary_dataset ?? settings.map_dataset ?? settings.breakdown_dataset;
    const table = genericTables.find(t => t.id === datasetId);
    const taggedFields = table?.fields || [];
    const baseRecords = recordsByDataset[datasetId] || [];

    switch (chart.widgetType) {
      case 'summary': {
        if (!datasetId) {
          return <div className="py-16 text-center text-sm text-gray-400">No table tagged yet — edit this widget to set one.</div>;
        }
        const tiles = computeSummaryTiles(baseRecords, settings, taggedFields);
        return (
          <div className="rounded-2xl p-8 text-white -m-4" style={{ background: `linear-gradient(135deg, ${DEFAULT_SUMMARY_STYLE.colorFrom}, ${DEFAULT_SUMMARY_STYLE.colorTo})` }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-white/70">SUMMARY</span>
              <span className="text-sm text-white/50">as of</span>
              <span className="text-sm font-medium">{today}</span>
            </div>
            {renderSummaryCardBody(tiles, DEFAULT_SUMMARY_STYLE)}
          </div>
        );
      }
      case 'map': {
        if (!settings.latitude_field || !settings.longitude_field) {
          return <div className="py-16 text-center text-sm text-gray-400">No latitude/longitude columns tagged yet — edit this widget to set them.</div>;
        }
        const { mapped, tooltipFieldDefs, filterFieldDefs, colorFieldDef } = resolveMapSites(baseRecords, settings, taggedFields);
        if (!mapped.length) {
          return <div className="py-16 text-center text-sm text-gray-400">No coordinate data available in this table.</div>;
        }
        return (
          <div className="-m-4">
            <FreeWifiMap sites={mapped} totalAPs={mapped.length} height="500px" tooltipFields={tooltipFieldDefs} filterFields={filterFieldDefs} colorField={colorFieldDef} />
          </div>
        );
      }
      case 'province-breakdown': {
        if (!settings.group_field) {
          return <div className="py-16 text-center text-sm text-gray-400">No "group by" column tagged yet — edit this widget to set one.</div>;
        }
        const records = filterRecordsByConditions(baseRecords, settings.breakdown_conditions);
        return <BreakdownAccordion records={records} source={settings} taggedFields={taggedFields} />;
      }
      default:
        return null;
    }
  };

  // Add a new extra widget instance, then immediately open its settings editor — same
  // "create, then edit" flow as "Add Custom Chart". (State lives up near the component's
  // other useState calls, above the `if (loading) return` below — declaring hooks after
  // an early return means they'd only run once loading finished, changing the hook count
  // between renders and tripping React's Rules of Hooks.)
  const addBuiltinWidget = async (widgetType) => {
    setAddingWidgetType(false);
    try {
      const created = await createProjectBuiltinWidget({
        office: officeId, widget_type: widgetType, settings: {}, order: allCharts.length,
      });
      const chart = builtinWidgetFromBackend(created);
      setAllCharts(prev => [...prev, chart]);
      setEditingWidgetInstance(chart);
    } catch {
      alert('Failed to add widget.');
    }
  };
  const saveWidgetInstanceSettings = async (payload) => {
    if (!editingWidgetInstance) return;
    // DataSourceModal always builds all 3 sections' fields (summary_hide_title/
    // map_hide_title/breakdown_hide_title) regardless of which one focusSection showed —
    // pick out just this instance's own type, since hide_title lives top-level on
    // ProjectBuiltinWidget, not inside `settings`.
    const hideTitle = editingWidgetInstance.widgetType === 'summary' ? payload.summary_hide_title
      : editingWidgetInstance.widgetType === 'map' ? payload.map_hide_title
      : payload.breakdown_hide_title;
    const updated = await updateProjectBuiltinWidget(editingWidgetInstance.dbId, { settings: payload, hide_title: !!hideTitle });
    const chart = builtinWidgetFromBackend(updated);
    setAllCharts(prev => prev.map(c => c.id === chart.id ? chart : c));
    setEditingWidgetInstance(null);
  };

  // Whether the Add/Edit Chart modal's type picker is in "Card" mode (a single aggregated
  // value, CARD_DESIGNS) vs "Chart" mode (a category breakdown, CHART_TYPES) — see the
  // Chart/Card toggle in that modal below.
  const isCardMode = newChart.chartType === 'aggregate-cards';

  // Whether the filter bar shows on the PUBLIC Charts page (ProjectChartSource.
  // show_filter_bar — undefined on charts saved before this existed, so `!== false` keeps
  // the always-shown default). The admin's own copy below stays visible regardless, since
  // it's also how the admin filters what THEY see while building/testing charts here.
  const dateFilterVisible = chartSource?.show_filter_bar !== false;
  const toggleDateFilterVisibility = () => {
    updateProjectChartSource(slug, { show_filter_bar: !dateFilterVisible })
      .then(setChartSource)
      .catch(console.error);
  };
  // The Summary Card's "as of" label reflects whichever range-type filter is currently
  // active (if any) — not tied to a filter literally named "Date", since the admin can
  // name/add range filters freely now. Uses the first one with a value set.
  const activeRangeFilter = generalFilterLabels.find(
    (f) => f.type === 'range' && (generalFilterValues[f.label]?.from || generalFilterValues[f.label]?.to)
  );
  const summaryDateFrom = activeRangeFilter ? (generalFilterValues[activeRangeFilter.label]?.from || '') : '';
  const summaryDateTo = activeRangeFilter ? (generalFilterValues[activeRangeFilter.label]?.to || '') : '';
  const hiddenCharts = allCharts.filter((c) => !c.visible);
  const chartTitle = (chart) => chart.type === 'custom' ? chart.title
    : chart.type === 'builtin-extra' ? builtinWidgetTitle(chart)
    : (isFreeWifi ? chart.label : builtInTitles[chart.id]);
  const filteredHiddenCharts = (() => {
    let list = hiddenCharts;
    if (hiddenChartSearch.trim()) {
      const q = hiddenChartSearch.trim().toLowerCase();
      list = list.filter((c) => (chartTitle(c) || '').toLowerCase().includes(q));
    }
    if (hiddenChartSort === 'title_asc' || hiddenChartSort === 'title_desc') {
      list = [...list].sort((a, b) => {
        const cmp = (chartTitle(a) || '').localeCompare(chartTitle(b) || '');
        return hiddenChartSort === 'title_desc' ? -cmp : cmp;
      });
    }
    return list;
  })();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Charts</h2>
        <div className="flex flex-wrap items-center gap-2">
          {!isFreeWifi && (
            <button onClick={() => setDataSourceModalSection('all')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:border-[#0038A8]">
              <Database size={16} />
              {(chartSource?.summary_dataset || chartSource?.map_dataset || chartSource?.breakdown_dataset) ? 'Data Source' : 'Set Data Source'}
            </button>
          )}
          {/* Add another Summary/Map/Breakdown — an extra, independently-configured
              instance beyond the singleton one above (see ProjectBuiltinWidget). Placed
              at the end of the list; drag it anywhere afterward, same as a custom chart. */}
          {!isFreeWifi && (
            <div className="relative">
              <button onClick={() => setAddingWidgetType(s => !s)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:border-[#0038A8]">
                <Plus size={16} /> Add Widget
              </button>
              {addingWidgetType && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50">
                  {Object.entries(WIDGET_TYPE_LABELS).map(([type, label]) => (
                    <button key={type} type="button" onClick={() => addBuiltinWidget(type)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => { setCardImageMode('url'); setPendingCardImageFile(null); setShowAddChart(true); }} disabled={!isFreeWifi && genericTables.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
            <Plus size={16} /> Add Custom Chart
          </button>
        </div>
      </div>

      {!isFreeWifi && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <GlobalDateFilterBar
              filters={generalFilterLabels}
              values={generalFilterValues}
              onChange={(label, value) => setGeneralFilterValues(prev => ({ ...prev, [label]: value }))}
              onClear={() => setGeneralFilterValues({})}
              generalFilterOptions={generalFilterOptions}
            />
          </div>
          <button type="button" onClick={() => setShowFilterSettings(true)} title="Edit filter settings"
            className="shrink-0 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[#0038A8] hover:border-gray-300 transition-colors">
            <Edit2 size={16} />
          </button>
          <button type="button" onClick={toggleDateFilterVisibility}
            title={dateFilterVisible ? 'Visible on the public Charts page — click to hide' : 'Hidden on the public Charts page — click to show'}
            className={`shrink-0 p-2.5 rounded-lg border transition-colors ${
              dateFilterVisible
                ? 'text-green-600 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {dateFilterVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      )}

      {!isFreeWifi && showFilterSettings && (
        <FilterSettingsModal
          slug={slug}
          tables={genericTables}
          initialFilters={generalFilterLabels}
          onClose={() => setShowFilterSettings(false)}
          onSaved={async () => {
            const [source, ds] = await Promise.all([getProjectChartSource(slug), getProjectDatasets(slug)]);
            setChartSource(source);
            setGenericTables(ds);
            setShowFilterSettings(false);
          }}
        />
      )}

      {!isFreeWifi && dataSourceModalSection && (
        <DataSourceModal
          slug={slug}
          tables={genericTables}
          initial={chartSource}
          builtInTitles={builtInTitles}
          focusSection={dataSourceModalSection === 'all' ? null : dataSourceModalSection}
          onClose={() => setDataSourceModalSection(false)}
          onDatasetUpdated={async () => setGenericTables(await getProjectDatasets(slug))}
          onChartSourceUpdated={(updated) => setChartSource(updated)}
          onSave={async (draft) => {
            try {
              const saved = await updateProjectChartSource(slug, draft);
              setChartSource(saved);
              setDatasets(buildTaggedRecords(genericTables, saved));
              setDataSourceModalSection(false);
            } catch (err) {
              alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
            }
          }}
        />
      )}

      {/* Settings editor for ONE extra widget instance (see ProjectBuiltinWidget) —
          reuses DataSourceModal exactly like the per-card "Edit settings" pencil above
          does for the singleton, just scoped via instanceMode + a settings blob instead
          of chartSource. */}
      {!isFreeWifi && editingWidgetInstance && (
        <DataSourceModal
          slug={slug}
          tables={genericTables}
          initial={{
            ...editingWidgetInstance.settings,
            // hide_title lives top-level on ProjectBuiltinWidget (see
            // builtinWidgetFromBackend), not inside `settings` — merged in here under
            // whichever of the 3 section keys DataSourceModal actually reads, so its
            // checkbox reflects the instance's real current value when reopened.
            ...(editingWidgetInstance.widgetType === 'summary' ? { summary_hide_title: editingWidgetInstance.hideTitle }
              : editingWidgetInstance.widgetType === 'map' ? { map_hide_title: editingWidgetInstance.hideTitle }
              : { breakdown_hide_title: editingWidgetInstance.hideTitle }),
          }}
          builtInTitles={WIDGET_TYPE_LABELS}
          focusSection={editingWidgetInstance.widgetType === 'province-breakdown' ? 'breakdown' : editingWidgetInstance.widgetType}
          instanceMode
          onClose={() => setEditingWidgetInstance(null)}
          onSave={async (draft) => {
            try {
              await saveWidgetInstanceSettings(draft);
            } catch (err) {
              alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
            }
          }}
        />
      )}

      {/* Add/Edit Chart Modal */}
      {showAddChart && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[90vw] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingChart ? 'Edit Chart' : 'Add Custom Chart'}</h3>
              <button onClick={() => { setShowAddChart(false); setEditingChart(null); }}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="flex">
              {/* Left Side - Settings */}
              <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-y-auto">
                {/* Chart vs Card — two different questions (which visualization vs. which
                    single-value layout), so two separate pickers instead of one grid mixing
                    16 chart types with 5 card designs. Switching modes swaps chartType
                    between a chart default and the fixed 'aggregate-cards' id. */}
                <div className="flex gap-2 mb-4">
                  <button type="button"
                    onClick={() => { if (isCardMode) setNewChart(c => ({ ...c, chartType: 'bar-horizontal' })); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      !isCardMode ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    Chart
                  </button>
                  <button type="button"
                    onClick={() => { if (!isCardMode) setNewChart(c => ({ ...c, chartType: 'aggregate-cards', cardDesign: c.cardDesign || 'big-number' })); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      isCardMode ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    Card
                  </button>
                </div>

                {/* Chart Type Selection — shown before Table/Field below so the admin picks
                    a visualization first; nothing here is disabled by field cardinality
                    until a field is actually chosen (see getChartFit's fieldSelected param),
                    so the whole gallery stays explorable up front. Once a type is picked,
                    the Chart Type Info box right after this grid explains how to feed it
                    (which field shape it wants) — and once a field IS chosen too, that same
                    box switches to a real fit check for the combination. */}
                {!isCardMode && (
                <div className="mb-5">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {CHART_TYPES.filter(t => t.id !== 'aggregate-cards').map((type) => {
                      const count = fieldCardinality[newChart.field] || 0;
                      const isDateLike = fieldIsDateLike[newChart.field];
                      const fit = getChartFit(type, count, isDateLike, !!newChart.field);
                      const isDisabled = fit.status === 'disabled';
                      const isRecommended = !!newChart.field && !isDisabled && recommendChartTypes(count, isDateLike).includes(type.id);
                      return (
                        <button key={type.id} disabled={isDisabled}
                          onClick={() => setNewChart(c => ({ ...c, chartType: type.id }))}
                          title={fit.reason || type.label}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            newChart.chartType === type.id
                              ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : isDisabled
                                ? 'border-gray-100 dark:border-gray-800 opacity-30 cursor-not-allowed'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                          {isRecommended && (
                            <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-green-500 text-white rounded-full shadow">BEST</span>
                          )}
                          <div className="h-16 flex items-center justify-center mb-2">{type.preview()}</div>
                          <p className="text-[10px] font-bold text-gray-900 dark:text-white text-center">{type.label}</p>
                        </button>
                      );
                    })}
              </div>
            </div>
                )}

                {/* Card Design Selection */}
                {isCardMode && (
                <div className="mb-5">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {CARD_DESIGNS.map((design) => (
                      <button key={design.id} type="button"
                        onClick={() => setNewChart(c => ({ ...c, cardDesign: design.id }))}
                        title={design.label}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          newChart.cardDesign === design.id
                            ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                        <div className="h-16 flex items-center justify-center mb-2">{design.preview()}</div>
                        <p className="text-[10px] font-bold text-gray-900 dark:text-white text-center">{design.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                )}

            {/* Chart Settings */}
            <div className="space-y-4">
              {/* Chart Type Info — doubles as the "how do I use this" instruction the
                  moment a chart type is picked. Before a field is chosen it just explains
                  what the type needs (a plain instruction, nothing to warn about yet); once
                  a field IS chosen, the same box switches to a real fit check against it. */}
              {!isCardMode && (() => {
                const selectedType = CHART_TYPES.find(t => t.id === newChart.chartType);
                if (!selectedType) return null;
                const fieldSelected = !!newChart.field;
                const count = fieldCardinality[newChart.field] || 0;
                const fit = getChartFit(selectedType, count, fieldIsDateLike[newChart.field], fieldSelected);
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-bold mb-1">{selectedType.label}</p>
                    <p>
                      {selectedType.requiresDateField
                        ? 'This chart plots a date field chronologically, left to right.'
                        : selectedType.needsSecondary
                        ? 'This chart works best with a secondary field for grouping.'
                        : 'This chart uses a single field to display data.'}
                      {selectedType.maxItems && ` Shows up to ${selectedType.maxItems} items.`}
                    </p>
                    {!fieldSelected ? (
                      <p className="mt-1 font-semibold">
                        {selectedType.requiresDateField
                          ? 'Pick a table and a date field below to plot it.'
                          : `Pick a table and field below${selectedType.minItems > 0 ? ` — needs at least ${selectedType.minItems} distinct values` : ''}.`}
                      </p>
                    ) : fit.status === 'disabled' ? (
                      <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">{fit.reason}</p>
                    ) : fit.status === 'partial' && (
                      <>
                        <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                          {newChart.showAllCategories
                            ? `Showing all ${count} categories (default limit is top ${selectedType.maxItems})`
                            : fit.reason}
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input type="checkbox" checked={!!newChart.showAllCategories}
                            onChange={(e) => setNewChart(c => ({ ...c, showAllCategories: e.target.checked }))}
                            className="rounded border-gray-300" />
                          <span className="text-[11px] text-blue-700 dark:text-blue-300">Show all {count} categories (ignore the limit)</span>
                        </label>
                      </>
                    )}
                  </div>
                );
              })()}

              {!isFreeWifi && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
                  <Select value={selectValue(toOptions(genericTables.map(t => t.id), (id) => genericTables.find(t => t.id === id)?.name), newChart.dataset ? Number(newChart.dataset) : null)}
                    onChange={(opt) => setNewChart(c => ({
                      ...c, dataset: opt ? opt.value : '', field: '', secondaryField: '',
                      extraDatasets: [], fieldMap: {}, secondaryFieldMap: {}, aggregationFieldMap: {}, tableConditions: {},
                    }))}
                    options={toOptions(genericTables.map(t => t.id), (id) => genericTables.find(t => t.id === id)?.name)}
                    placeholder="Select table..." isClearable styles={selectStyles} />
                </div>
              )}

              {/* Extra source tables — optional, folds more tables' rows into this
                  chart's combined record set (see combineChartRecords), e.g. summing a
                  Value Card across two separately-tracked tables. */}
              {!isFreeWifi && newChart.dataset && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Additional source tables <span className="text-gray-400">(optional — combine rows from more tables into this chart)</span>
                  </label>
                  <ExtraTablesEditor chart={newChart} setChart={setNewChart} genericTables={genericTables}
                    needsSecondary={!!CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary}
                    recordsByDataset={recordsByDataset} />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Chart Title</label>
                <input placeholder="e.g. Sites by Contract" value={newChart.title}
                  onChange={(e) => setNewChart(c => ({ ...c, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Data Field {CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary ? '(Primary)' : ''}
                </label>
                <Select
                  value={selectValue(availableFieldsFor(newChart.dataset).map(f => ({
                    value: f.value, label: fieldOptionLabel(f, fieldCardinality, fieldIsDateLike),
                  })), newChart.field)}
                  isDisabled={(!isFreeWifi && !newChart.dataset) || (newChart.chartType === 'aggregate-cards' && newChart.agg === 'count')}
                  onChange={(opt) => {
                    const field = opt ? opt.value : '';
                    const count = fieldCardinality[field] || 0;
                    setNewChart(c => ({ ...c, field, chartType: bestChartType(count, c.chartType, fieldIsDateLike[field]) }));
                  }}
                  options={availableFieldsFor(newChart.dataset).map(f => ({
                    value: f.value, label: fieldOptionLabel(f, fieldCardinality, fieldIsDateLike),
                  }))}
                  placeholder="Select field..." isClearable styles={selectStyles} />
                {CHART_TYPES.find(t => t.id === newChart.chartType)?.requiresDateField && (
                  <p className="text-[11px] text-gray-400 mt-1">Fields marked "Date" above will work — others won't, even if their name sounds date-like.</p>
                )}
              </div>

              {/* Aggregation — optional. Off, every chart type counts rows per category
                  (the original, still-default behavior). On, each category shows a
                  sum/average/unique-count of a SEPARATE value field instead — e.g. "Total
                  Budget per Province" instead of "Number of Rows per Province". Not shown
                  in Card mode, which already has its own complete Aggregation section
                  below (agg/agg_equals, count/count-where-equals included). */}
              {!isCardMode && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                    <input type="checkbox" checked={!!newChart.aggregationEnabled}
                      onChange={(e) => setNewChart(c => ({ ...c, aggregationEnabled: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Aggregation <span className="text-gray-400 font-normal">(optional — sum/average a field per category instead of counting rows)</span>
                    </span>
                  </label>
                  {newChart.aggregationEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={selectValue(CHART_AGG_OPTIONS, newChart.aggregationType || 'sum')}
                        onChange={(opt) => setNewChart(c => ({ ...c, aggregationType: opt.value }))}
                        options={CHART_AGG_OPTIONS} isSearchable={false} styles={selectStyles} />
                      <Select
                        value={selectValue(availableFieldsFor(newChart.dataset).map(f => ({ value: f.value, label: f.label })), newChart.aggregationField)}
                        onChange={(opt) => setNewChart(c => ({ ...c, aggregationField: opt ? opt.value : '' }))}
                        options={availableFieldsFor(newChart.dataset).map(f => ({ value: f.value, label: f.label }))}
                        placeholder="Value field..." isClearable styles={selectStyles} />
                    </div>
                  )}
                </div>
              )}

              {/* Date grouping (Line/Area only) — what makes these two charts actually
                  readable: grouping by the exact date value fans real data out into one
                  spike per unique timestamp (see dateBucketKey's comment), so this bucket
                  size is what turns that into a real trend. Cumulative flips the reading
                  from "activity per period" to "running total over time" — usually the more
                  useful one for a growth/adoption story ("sites accepted over time"). */}
              {CHART_TYPES.find(t => t.id === newChart.chartType)?.requiresDateField && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Group dates by</label>
                    <Select value={selectValue(DATE_GROUP_BY_OPTIONS, newChart.dateGroupBy || 'month')}
                      onChange={(opt) => setNewChart(c => ({ ...c, dateGroupBy: opt.value }))}
                      options={DATE_GROUP_BY_OPTIONS} isSearchable={false} styles={selectStyles} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!newChart.cumulative}
                        onChange={(e) => setNewChart(c => ({ ...c, cumulative: e.target.checked }))}
                        className="rounded border-gray-300" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Show cumulative total</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Customize labels — per-CHART display overrides for a field's raw values
                  (ProjectChartConfig.value_labels), e.g. showing "N/A" as "No" or "Yes" as
                  "Renewed" in this chart's bars/legend/tooltips without touching the
                  underlying data or any other chart built on the same field. Only for Chart
                  mode (a Value Card shows one aggregated number, not per-value labels) and
                  only once a field with a manageable number of distinct values is picked —
                  past ~20 this would turn into an unusable wall of text inputs. */}
              {!isCardMode && newChart.field && (() => {
                const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
                const values = distinctFieldValues(records, newChart.field);
                if (values.length === 0 || values.length > 20) return null;
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Customize labels <span className="text-gray-400">(optional — change how a value is shown in this chart)</span>
                    </label>
                    <div className="space-y-1.5">
                      {values.map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 text-xs text-gray-500 chart-h-scroll" title={v}>{v}</span>
                          <span className="text-gray-300 shrink-0">→</span>
                          <input type="text" value={newChart.valueLabels?.[v] || ''}
                            onChange={(e) => setNewChart(c => ({ ...c, valueLabels: { ...c.valueLabels, [v]: e.target.value } }))}
                            placeholder={v}
                            className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Filter rows — independent of chart type/aggregation: narrows which rows
                  this chart counts/aggregates down to only the ones matching EVERY
                  condition (AND), before whatever that chart type does with them. E.g. a
                  bar chart of "Contract" can be scoped to just Province = Bukidnon, or a
                  Value Card's Sum can be scoped to Province = Bukidnon AND Status = Active
                  — same idea as the old count_equals special case, generalized so it
                  applies to any chart and stacks past one condition. */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Filter rows <span className="text-gray-400">(optional — only rows matching every condition are counted)</span>
                </label>
                <ConditionsEditor conditions={newChart.conditions}
                  onChange={(next) => setNewChart(c => ({ ...c, conditions: next }))}
                  fieldOptions={toOptions(availableFieldsFor(newChart.dataset).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label)}
                  valuesFor={(field) => toOptions(distinctFieldValues(isFreeWifi ? sites : combineChartRecords(newChart, recordsByDataset, genericTables), field))}
                  extraTables={!isFreeWifi ? (newChart.extraDatasets || []).map(id => genericTables.find(t => t.id === id)).filter(Boolean) : []} />
              </div>

              {/* Aggregation (Value Card only) — same vocabulary as the Summary Card tile
                  editor: Sum/Average/Count all rows/Count unique values/Count where equals. */}
              {newChart.chartType === 'aggregate-cards' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Aggregation</label>
                  <Select value={selectValue(CARD_AGG_OPTIONS, newChart.agg)}
                    onChange={(opt) => setNewChart(c => ({ ...c, agg: opt.value }))}
                    options={CARD_AGG_OPTIONS} isSearchable={false} styles={selectStyles} />
                  {newChart.agg === 'count_equals' && (
                    <div className="mt-2">
                      <Select
                        value={selectValue(toOptions(distinctFieldValues(isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []), newChart.field)), newChart.equals)}
                        onChange={(opt) => setNewChart(c => ({ ...c, equals: opt ? opt.value : '' }))}
                        options={toOptions(distinctFieldValues(isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []), newChart.field))}
                        placeholder="Value..." isClearable styles={selectStyles} />
                    </div>
                  )}
                </div>
              )}

              {/* Card design settings — accent color and text alignment apply to every
                  CARD_DESIGNS layout; the icon picker, target input, and image picker only
                  matter for the designs that use them (icon-number / progress / image-bg
                  respectively). Same Lucide icon list as the Map's marker-icon picker,
                  reused rather than duplicated. */}
              {isCardMode && (
                <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Accent color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={newChart.cardColor || '#0038A8'}
                        onChange={(e) => setNewChart(c => ({ ...c, cardColor: e.target.value }))}
                        className="w-10 h-10 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                      <input type="text" value={newChart.cardColor || '#0038A8'}
                        onChange={(e) => setNewChart(c => ({ ...c, cardColor: e.target.value }))}
                        className="flex-1 px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-gray-800" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Text alignment</label>
                    <div className="flex gap-2">
                      {[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }].map((opt) => (
                        <button key={opt.value} type="button" onClick={() => setNewChart(c => ({ ...c, cardTextAlign: opt.value }))}
                          className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            (newChart.cardTextAlign || 'left') === opt.value ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Description <span className="text-gray-400">(optional — a sentence or two of context shown under the number)</span>
                    </label>
                    <textarea value={newChart.cardDescription || ''}
                      onChange={(e) => setNewChart(c => ({ ...c, cardDescription: e.target.value }))}
                      rows={3} placeholder="e.g. Cumulative participants trained under the NGP program across Region 10."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
                  </div>

                  {newChart.cardDesign === 'icon-number' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Icon</label>
                      <div className="flex flex-wrap gap-2">
                        {MARKER_ICON_OPTIONS.map(({ name, Icon }) => (
                          <button key={name} type="button" onClick={() => setNewChart(c => ({ ...c, cardIcon: name }))} title={name}
                            className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${
                              newChart.cardIcon === name ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}>
                            <Icon size={16} color={newChart.cardIcon === name ? (newChart.cardColor || '#0038A8') : undefined}
                              className={newChart.cardIcon === name ? '' : 'text-gray-500 dark:text-gray-400'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {newChart.cardDesign === 'progress' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Target value</label>
                      <input type="number" value={newChart.cardTarget}
                        onChange={(e) => setNewChart(c => ({ ...c, cardTarget: e.target.value }))}
                        placeholder="e.g. 1000" className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                      <p className="text-[11px] text-gray-400 mt-1">Shown as "value / target" with a fill bar.</p>
                    </div>
                  )}

                  {newChart.cardDesign === 'image-bg' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Gradient color</label>
                      <div className="flex items-center gap-3 mb-3">
                        <input type="color" value={newChart.cardGradientColor || '#000000'}
                          onChange={(e) => setNewChart(c => ({ ...c, cardGradientColor: e.target.value }))}
                          className="w-10 h-10 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                        <input type="text" value={newChart.cardGradientColor || '#000000'}
                          onChange={(e) => setNewChart(c => ({ ...c, cardGradientColor: e.target.value }))}
                          className="flex-1 px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-gray-800" />
                      </div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Background image</label>
                      <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => { setCardImageMode('url'); setPendingCardImageFile(null); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${cardImageMode === 'url' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          <Link2 size={12} /> Image URL
                        </button>
                        <button type="button" onClick={() => setCardImageMode('upload')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${cardImageMode === 'upload' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          <Upload size={12} /> Upload File
                        </button>
                      </div>
                      {cardImageMode === 'url' ? (
                        <input type="url" value={newChart.cardImage || ''}
                          onChange={(e) => { setNewChart(c => ({ ...c, cardImage: e.target.value })); setPendingCardImageFile(null); }}
                          placeholder="https://example.com/photo.jpg" className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                      ) : (
                        <input type="file" accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
                            setPendingCardImageFile(file);
                          }}
                          className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0038A8] file:text-white hover:file:bg-[#001a52]" />
                      )}
                      <p className="text-xs text-gray-400 mt-1">Max 10MB. Uploaded images are auto-converted to WebP.</p>
                      {(cardImagePreviewUrl || newChart.cardImage) && (
                        <img src={cardImagePreviewUrl || newChart.cardImage} alt="Preview" className="mt-2 h-20 w-full rounded-lg object-cover" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Show secondary field only for charts that need it */}
              {CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Secondary Field <span className="text-gray-400">(for grouping/breakdown)</span>
                  </label>
                  <Select
                    value={selectValue(toOptions(availableFieldsFor(newChart.dataset).filter(f => f.value !== newChart.field).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label), newChart.secondaryField)}
                    onChange={(opt) => setNewChart(c => ({ ...c, secondaryField: opt ? opt.value : '' }))}
                    options={toOptions(availableFieldsFor(newChart.dataset).filter(f => f.value !== newChart.field).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label)}
                    placeholder="None" isClearable styles={selectStyles} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Grid Size</label>
                  <Select value={selectValue(GRID_SIZE_OPTIONS, newChart.gridSize)}
                    onChange={(opt) => setNewChart(c => ({ ...c, gridSize: opt.value }))}
                    options={GRID_SIZE_OPTIONS} isSearchable={false} styles={selectStyles} />
                </div>
                {isFreeWifi && (
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newChart.showOnUser}
                        onChange={(e) => setNewChart(c => ({ ...c, showOnUser: e.target.checked }))}
                        className="rounded border-gray-300" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Show on Dashboard</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Hides the title/subtitle header the PUBLIC page renders above this chart —
                  the admin's own preview keeps showing it regardless, so managing charts
                  doesn't get harder just because one of them hides its label out front. */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!newChart.hideTitle}
                  onChange={(e) => setNewChart(c => ({ ...c, hideTitle: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-xs text-gray-700 dark:text-gray-300">Hide title on public page</span>
              </label>

              <div className="flex gap-2">
                <button onClick={handleAddChart} disabled={savingChart}
                  className="flex-1 px-4 py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
                  {savingChart ? 'Saving...' : editingChart ? 'Update Chart' : 'Create Chart'}
                </button>
                <button onClick={() => { setShowAddChart(false); setEditingChart(null); }} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
              </div>

              {/* Right Side - Live Preview */}
              <div className="w-[40vw] p-6 bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye size={16} /> Live Preview
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[400px] overflow-hidden">
                  <div className="p-5 pb-4">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {newChart.title || 'Chart Title'}
                    </h4>
                  </div>
                  {/* No side/bottom padding for the 'image-bg' design, matching the actual
                      public/admin rendering (ChartCard/DraggableChart's own noPadding) —
                      otherwise the preview shows a padded inset that the real chart won't
                      have. */}
                  <div className={newChart.chartType === 'aggregate-cards' && newChart.cardDesign === 'image-bg' ? '' : 'px-5 pb-5'}>
                    <CustomChartRenderer
                      chart={{ ...newChart, id: 'preview', cardImage: cardImagePreviewUrl || newChart.cardImage }}
                      sites={isFreeWifi ? sites : combineChartRecords(newChart, recordsByDataset, genericTables)}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 text-center">
                  Preview with live data from your database
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Summary Card Style Modal */}
      {showSummaryStyle && (
        <SummaryStyleModal
          initialStyle={summaryStyle}
          saving={savingSummaryStyle}
          onSave={handleSaveSummaryStyle}
          onClose={() => setShowSummaryStyle(false)}
          renderPreview={(draft) => isFreeWifi ? (
            <SummaryCard
              stats={summary?.overall ? {
                total_locations: summary.overall.total_locations || 0,
                municipalities_count: summary.overall.municipalities_count || 0,
                provinces_count: summary.overall.provinces_count || 0,
                barangays_count: summary.overall.barangays_count || 0,
                total_active_aps: summary.overall.total_sites || 0,
                hasApField: true,
              } : null}
              today={today} sourceLabel="Live Sites"
              colorFrom={draft.colorFrom} colorTo={draft.colorTo} orientation={draft.orientation} accentColor={draft.accentColor}
            />
          ) : (
            <div className="rounded-2xl p-8 text-white" style={{ background: `linear-gradient(135deg, ${draft.colorFrom}, ${draft.colorTo})` }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm font-medium text-white/70">SUMMARY</span>
                <span className="text-sm text-white/50">as of</span>
                <span className="text-sm font-medium">{summaryAsOfLabel(summaryDateFrom, summaryDateTo, today)}</span>
              </div>
              {renderSummaryCardBody(
                computeSummaryTiles(summarySites, chartSource, genericTables.find(t => t.id === chartSource?.summary_dataset)?.fields || []),
                draft
              )}
            </div>
          )}
        />
      )}

      {/* "Show" / "Hidden" tab — same pattern as Awards/Accomplishments/Highlights. */}
      <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-4">
        <button type="button" onClick={() => setActiveView('show')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeView === 'show' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}>
          Show
        </button>
        <button type="button" onClick={() => setActiveView('hidden')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeView === 'hidden' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}>
          Hidden ({hiddenCharts.length})
        </button>
      </div>

      {activeView === 'show' ? (
        // Maps over the FULL allCharts array (not a filtered copy) so `index` still points
        // at each chart's true position — handleDrop splices by that index, so filtering
        // the array before mapping would corrupt drag-reorder. Hidden charts just render
        // as `null` instead of a card; the grid's `col-span-N` classes are relative
        // (auto-flow), so skipping one doesn't leave a gap.
        <div className="grid grid-cols-12 gap-6">
          {allCharts.map((chart, index) => {
            if (!chart.visible) return null;
            const isCustom = chart.type === 'custom';
            const isWidgetInstance = chart.type === 'builtin-extra';
            const gridSize = isCustom || isWidgetInstance ? gridSizeClass(chart.gridSize) : 'col-span-12';

            return (
              <div key={chart.id} className={gridSize}>
                <DraggableChart
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === index}
                  title={isCustom ? chart.title : isWidgetInstance ? builtinWidgetTitle(chart) : (isFreeWifi ? chart.label : builtInTitles[chart.id])}
                  subtitle={
                    isCustom ? `${CHART_TYPES.find(t => t.id === chart.chartType)?.label} · ${availableFieldsFor(chart.dataset).find(f => f.value === chart.field)?.label}`
                      : isWidgetInstance ? `${WIDGET_TYPE_LABELS[chart.widgetType]} · extra instance` : undefined
                  }
                  isCustom={isCustom || isWidgetInstance}
                  showOnUser={chart.showOnUser}
                  onEdit={isCustom ? () => {
                    setNewChart({ title: chart.title, field: chart.field, secondaryField: chart.secondaryField || '', chartType: chart.chartType, agg: chart.agg || 'sum', equals: chart.equals || '', aggregationEnabled: !!chart.aggregationEnabled, aggregationField: chart.aggregationField || '', aggregationType: chart.aggregationType || 'sum', cardDesign: chart.cardDesign || 'big-number', cardIcon: chart.cardIcon || '', cardColor: chart.cardColor || '#0038A8', cardTarget: chart.cardTarget || '', cardImage: chart.cardImage || '', cardTextAlign: chart.cardTextAlign || 'left', cardGradientColor: chart.cardGradientColor || '#000000', cardDescription: chart.cardDescription || '', hideTitle: !!chart.hideTitle, dateGroupBy: chart.dateGroupBy || 'month', cumulative: !!chart.cumulative, valueLabels: chart.valueLabels || {}, conditions: chart.conditions || [], gridSize: chart.gridSize, showOnUser: chart.showOnUser, showAllCategories: chart.showAllCategories || false, dataset: chart.dataset ? String(chart.dataset) : '', extraDatasets: chart.extraDatasets || [], fieldMap: chart.fieldMap || {}, secondaryFieldMap: chart.secondaryFieldMap || {}, aggregationFieldMap: chart.aggregationFieldMap || {}, tableConditions: chart.tableConditions || {} });
                    setEditingChart(chart);
                    setCardImageMode('url');
                    setPendingCardImageFile(null);
                    setShowAddChart(true);
                  } : isWidgetInstance ? () => setEditingWidgetInstance(chart)
                  // Built-ins: opens the same Data Source modal as the "Data Source" button,
                  // just scoped to this one widget's own section (see focusSection) instead
                  // of showing all three — a direct per-chart edit that still shares the
                  // exact same settings/save logic as the full modal, not a separate copy.
                  : !isFreeWifi ? () => setDataSourceModalSection(chart.id === 'province-breakdown' ? 'breakdown' : chart.id) : undefined}
                  onEditStyle={!isCustom && !isWidgetInstance && chart.id === 'summary' ? () => setShowSummaryStyle(true) : undefined}
                  onDelete={isCustom || isWidgetInstance ? () => handleDeleteChart(chart.id) : undefined}
                  onToggleVisibility={() => toggleVisibility(chart.id)}
                  dataSource={isFreeWifi && !isCustom && !isWidgetInstance ? (chart.dataSource || 'live') : undefined}
                  onDataSourceChange={isFreeWifi && !isCustom && !isWidgetInstance ? (ds) => setChartDataSource(chart.id, ds) : undefined}
                  noPadding={isCustom && chart.chartType === 'aggregate-cards' && chart.cardDesign === 'image-bg'}
                >
                  {isCustom ? (
                    <CustomChartRenderer chart={chart} sites={isFreeWifi ? sites : combineChartRecords(chart, recordsByDataset, genericTables)} />
                  ) : isWidgetInstance ? (
                    renderBuiltinWidgetInstance(chart)
                  ) : (
                    renderBuiltIn(chart.id, chart.dataSource || 'live')
                  )}
                </DraggableChart>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {hiddenCharts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input type="text" placeholder="Search hidden charts..." value={hiddenChartSearch} onChange={(e) => setHiddenChartSearch(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              <select value={hiddenChartSort} onChange={(e) => setHiddenChartSort(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="default">As listed</option>
                <option value="title_asc">Title — A to Z</option>
                <option value="title_desc">Title — Z to A</option>
              </select>
            </div>
          )}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {hiddenCharts.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">Nothing hidden — charts you hide from the public page will show up here.</p>
            ) : filteredHiddenCharts.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">No hidden charts match "{hiddenChartSearch}".</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHiddenCharts.map((chart) => {
                  const isCustom = chart.type === 'custom';
                  const isWidgetInstance = chart.type === 'builtin-extra';
                  return (
                    <div key={chart.id} className="flex items-center justify-between gap-3 p-3 px-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {isCustom ? chart.title : isWidgetInstance ? builtinWidgetTitle(chart) : (isFreeWifi ? chart.label : builtInTitles[chart.id])}
                        </p>
                        {isCustom && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {CHART_TYPES.find(t => t.id === chart.chartType)?.label} · {availableFieldsFor(chart.dataset).find(f => f.value === chart.field)?.label}
                          </p>
                        )}
                        {isWidgetInstance && (
                          <p className="text-[10px] text-gray-400 truncate">{WIDGET_TYPE_LABELS[chart.widgetType]} · extra instance</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleVisibility(chart.id)}
                          className="p-1.5 text-gray-400 hover:text-green-500 transition-colors" title="Click to show">
                          <EyeOff size={14} />
                        </button>
                        {(isCustom || isWidgetInstance) && (
                          <button type="button" onClick={() => handleDeleteChart(chart.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
