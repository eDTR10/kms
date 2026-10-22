// @ts-nocheck
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toCanvas as htmlNodeToCanvas } from 'html-to-image';
import {
  Save, BarChart3, TrendingUp, MapPin, Wifi, ChevronDown, ChevronRight, Search, ChevronLeft, GripVertical,
  Plus, Trash2, X, Eye, EyeOff, Edit2, Database, Star, Palette, Link2, Upload, Download, FileText, Image as ImageIcon, Loader2, Quote, Megaphone,
} from 'lucide-react';
import { MARKER_ICON_OPTIONS } from '../../../lib/markerIcons';
import { getFreeWifiSummary } from '../../../services/freewifi';
import {
  getFreeWifiLiveData, getFreeWifiMainData, getFreeWifiTargetData, getFreeWifiMasterlistData,
  getFreeWifiChartConfigs, createFreeWifiChartConfig, updateFreeWifiChartConfig, deleteFreeWifiChartConfig,
} from '../../../services/freewifiData';
import { getKmsSettings, updateKmsSettings } from '../../../services/settings';
import Select from 'react-select';
import FreeWifiMap, { selectStyles, MAP_TILE_STYLES } from '../../../components/FreeWifiMap';
import {
  getProjectOfficeId, getProjectDatasets, updateProjectDataset,
  getProjectChartConfigs, createProjectChartConfig, updateProjectChartConfig, deleteProjectChartConfig,
  reorderProjectChartConfigs, getProjectChartSource, updateProjectChartSource, uploadProjectChartSourceMarkerIcon,
  uploadProjectChartConfigCardImage,
  getProjectBuiltinWidgets, createProjectBuiltinWidget, updateProjectBuiltinWidget, deleteProjectBuiltinWidget,
  getProjectChartLayouts, createProjectChartLayout, updateProjectChartLayout, deleteProjectChartLayout,
} from '../../../services/projects';
import LayoutTabs from '../../../components/LayoutTabs';
import IctPlansAndPolicies from '../../../components/IctPlansAndPolicies';

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
  { id: 'table', label: 'Data Table', needsSecondary: true, minItems: 1, maxItems: 8, category: 'data', preview: () => (
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
  // Each category is a circle whose AREA (not diameter) scales with its value, so a
  // category twice as big reads as twice as big instead of four times — see its case in
  // CustomChartRenderer.
  { id: 'bubble', label: 'Bubble Chart', needsSecondary: false, minItems: 2, maxItems: 30, category: 'distribution', preview: () => (
    <div className="flex items-center justify-center gap-1 h-16 w-full">
      <div className="rounded-full" style={{ width: 30, height: 30, backgroundColor: COLORS[0] }} />
      <div className="rounded-full" style={{ width: 20, height: 20, backgroundColor: COLORS[1] }} />
      <div className="rounded-full" style={{ width: 38, height: 38, backgroundColor: COLORS[2] }} />
      <div className="rounded-full" style={{ width: 14, height: 14, backgroundColor: COLORS[3] }} />
    </div>
  ) },
  // One full-width, 100%-normalized bar per PRIMARY category (unlike 'bar-stacked' above,
  // whose segments only add up to that row's own raw count, not a shared 0-100% axis) —
  // every row's segments always sum to exactly 100%, colored by a legend that stays
  // consistent row to row (see CustomChartRenderer's own case for why that needs its own
  // pass over every row up front, not just each row's own subGroups).
  { id: 'bar-100-stacked', label: '100% Stacked Bar', needsSecondary: true, minItems: 2, maxItems: 8, category: 'distribution', preview: () => (
    <div className="space-y-1.5 w-full">{[0, 1, 2].map((r) => (
      <div key={r} className="flex h-3 rounded overflow-hidden w-full">
        <div style={{ width: `${[70, 45, 30][r]}%`, backgroundColor: COLORS[0] }} />
        <div className="flex-1" style={{ backgroundColor: COLORS[1] }} />
      </div>
    ))}</div>
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

// Templates for "Text" mode (chart.cardDesign, same field CARD_DESIGNS uses — a text
// card is still stored/rendered as chart_type='aggregate-cards' under the hood, just
// gated to this design set instead of CARD_DESIGNS' own — see TEXT_DESIGN_IDS and
// AggregateValueCard's branch for these ids). None of these touch a field/aggregation
// at all — every one of them just shows chart.cardDescription (every other design's
// small "context under the number" text, repurposed as the whole content here since
// there's no number for it to sit under) — see AggregateValueCard's own comment.
const TEXT_DESIGNS = [
  { id: 'text-note', label: 'Plain', preview: () => (
    <div className="w-full h-16 flex flex-col justify-center gap-1.5 px-2">
      <div className="h-1.5 w-full rounded bg-gray-300 dark:bg-gray-600" />
      <div className="h-1.5 w-4/5 rounded bg-gray-300 dark:bg-gray-600" />
      <div className="h-1.5 w-3/5 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  ) },
  { id: 'text-quote', label: 'Quote', preview: () => (
    <div className="w-full h-16 flex flex-col justify-center gap-1 px-2">
      <Quote size={14} style={{ color: COLORS[0] }} className="opacity-70" />
      <div className="h-1.5 w-4/5 rounded bg-gray-300 dark:bg-gray-600" />
      <div className="h-1.5 w-3/5 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  ) },
  { id: 'text-banner', label: 'Banner', preview: () => (
    <div className="w-full h-16 rounded-lg flex flex-col items-center justify-center gap-1.5 px-2" style={{ backgroundColor: COLORS[0] }}>
      <div className="h-1.5 w-4/5 rounded bg-white/90" />
      <div className="h-1.5 w-3/5 rounded bg-white/60" />
    </div>
  ) },
  { id: 'text-callout', label: 'Callout', preview: () => (
    <div className="w-full h-16 flex flex-col justify-center gap-1.5 pl-3 pr-2 border-l-4" style={{ borderColor: COLORS[0] }}>
      <div className="h-1.5 w-full rounded bg-gray-300 dark:bg-gray-600" />
      <div className="h-1.5 w-3/5 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  ) },
  // Large centered accent-colored statement, no box/border at all — for a short punchy
  // line (a tagline, a milestone) rather than a paragraph.
  { id: 'text-spotlight', label: 'Spotlight', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-1.5 px-2">
      <div className="h-2.5 w-16 rounded" style={{ backgroundColor: COLORS[0] }} />
      <div className="h-2.5 w-11 rounded" style={{ backgroundColor: COLORS[0] }} />
    </div>
  ) },
  // Soft tinted background (accent color at low opacity) — an "info box" feel, distinct
  // from Banner's solid fill and Callout's border-only accent.
  { id: 'text-highlight', label: 'Highlight', preview: () => (
    <div className="w-full h-16 rounded-lg flex flex-col justify-center gap-1.5 px-3" style={{ backgroundColor: `${COLORS[0]}22` }}>
      <div className="h-1.5 w-4/5 rounded" style={{ backgroundColor: COLORS[0] }} />
      <div className="h-1.5 w-3/5 rounded bg-gray-400 dark:bg-gray-500" />
    </div>
  ) },
  { id: 'text-announcement', label: 'Announcement', preview: () => (
    <div className="w-full h-16 flex flex-col items-center justify-center gap-1.5 px-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS[0] }}>
        <Megaphone size={12} className="text-white" />
      </div>
      <div className="h-1.5 w-4/5 rounded bg-gray-300 dark:bg-gray-600" />
    </div>
  ) },
  // Same photo/gradient treatment as CARD_DESIGNS' own 'image-bg' (chart.cardImage +
  // chart.cardGradientColor, same overlay math) — but text only, no big number, since a
  // Text card has no aggregation to show. Reuses that design's own "Background image"/
  // "Gradient color" builder controls (see their gating below) rather than duplicating them.
  { id: 'text-image-bg', label: 'Image Background', preview: () => (
    <div className="w-full h-16 rounded-lg overflow-hidden relative flex items-end p-2"
      style={{ background: `linear-gradient(135deg, ${COLORS[0]}, ${COLORS[2]})` }}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative space-y-1 w-full">
        <div className="h-1.5 w-4/5 rounded bg-white/90" />
        <div className="h-1.5 w-3/5 rounded bg-white/70" />
      </div>
    </div>
  ) },
];
const TEXT_DESIGN_IDS = new Set(TEXT_DESIGNS.map((d) => d.id));

// react-select expects {value, label} options and a single selected option object (or
// null), rather than the bare string this file's state has always stored — these two
// convert between the two shapes so every plain <select> below can become a <Select>
// (see selectStyles, imported from FreeWifiMap.tsx) without restructuring how its value
// is held in state.
export const toOptions = (values, labelFor = (v) => v) => values.map((v) => ({ value: v, label: labelFor(v) }));
const selectValue = (options, current) => options.find((o) => o.value === current) || null;

// Distinct, non-blank values of `field` across `records` — populates the "equals" dropdown
// for the count_equals aggregation (Summary Card tiles / Value Card), so an admin picks an
// actual value from the data instead of free-typing something that has to match it exactly.
export const distinctFieldValues = (records, field) =>
  [...new Set((records || []).map((r) => r[field]))]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(String)
    .sort();

// Same values as distinctFieldValues, plus a synthetic "N/A" entry when at least one row's
// value for `field` is blank — for a picker that needs to be able to target blank rows too
// (Value Card's count_equals/percentage), matching the same "blank rows are their own real
// category, not just excluded" convention "Customize labels" already uses elsewhere.
const distinctFieldValuesWithNA = (records, field) => {
  const distinct = distinctFieldValues(records, field);
  const hasBlank = (records || []).some((r) => {
    const v = r[field];
    return v === null || v === undefined || String(v).trim() === '';
  });
  return hasBlank ? [...distinct, 'N/A'] : distinct;
};

// Whether a row's raw value for a field "equals" an admin-picked target — a plain
// case-insensitive string compare, EXCEPT picking "N/A" (see distinctFieldValuesWithNA)
// means "this row's value is blank", not literally the text "N/A" — a naive compare would
// never match a blank row there at all, since a blank value stringifies to "" not "N/A". A
// row whose value genuinely IS typed as "N/A" still matches too, so a table that already
// uses "N/A" as a real value keeps meaning what it always did.
const matchesEqualsValue = (raw, target) => {
  const v = String(raw ?? '').trim();
  const t = String(target ?? '').trim();
  if (t.toLowerCase() === 'n/a') return v === '' || v.toLowerCase() === 'n/a';
  return v.toLowerCase() === t.toLowerCase();
};

// The Data Field dropdown's option text — surfaces whether a field looks like a date
// (see fieldIsDateLike) right in the list, since nothing else in that dropdown says so and
// a field named e.g. "Integration Date" isn't necessarily typed/detected as one.
const fieldOptionLabel = (f, fieldCardinality, fieldIsDateLike) => {
  const count = fieldCardinality[f.value] || 0;
  const countLabel = `${fmtNum(count)} ${count === 1 ? 'value' : 'values'}`;
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
  // A bare year ("2023") — common for tables that only track a school/program year, not a
  // full date. new Date("2023") still parses fine (resolves to Jan 1 that year), and
  // dateBucketKey's 'year' grouping only reads .getFullYear() anyway, so this needs no
  // downstream changes — it just widens what counts as "looks like a date" for Line/Area's
  // requiresDateField gate, without forcing the field's own type to be re-tagged as Date
  // (which would mean re-entering every row through a full day/month/year date picker for
  // what's conceptually just a year number).
  /^(19|20)\d{2}$/,
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
    // Jan–Jun = 1st semester, Jul–Dec = 2nd — only used by the range-overlap general
    // filter's period mode today (see RANGE_OVERLAP_GRANULARITY_OPTIONS), not offered in
    // DATE_GROUP_BY_OPTIONS.
    case 'semester': return `${y}-S${m < 6 ? 1 : 2}`;
    case 'year': return String(y);
    case 'month':
    default: return `${y}-${String(m + 1).padStart(2, '0')}`;
  }
}

function dateBucketLabel(key, groupBy) {
  if (groupBy === 'semester') {
    const [y, s] = key.split('-S');
    return `${s === '1' ? '1st' : '2nd'} Semester ${y}`;
  }
  if (groupBy === 'quarter' || groupBy === 'year') return key;
  if (groupBy === 'week') return `Week of ${new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  if (groupBy === 'day') return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// The inverse of dateBucketKey for 'quarter'/'semester'/'year' — turns a picked bucket
// (e.g. "2026-Q1") into concrete calendar boundary dates, so the range-overlap filter's
// period mode can run the exact same [start,end]-overlaps-[from,to] check its manual
// From/To mode already does, just with `to`/`from` computed from the period instead of
// typed in. `new Date(y, monthAfterEnd, 0, ...)` is "day 0" of the month AFTER the bucket
// ends, which JS resolves to the last day of the bucket's own last month.
function periodBoundsFromKey(key, granularity) {
  if (granularity === 'year') {
    const year = Number(key);
    if (!Number.isFinite(year)) return null;
    return { from: new Date(year, 0, 1), to: new Date(year, 12, 0, 23, 59, 59, 999) };
  }
  if (granularity === 'semester') {
    const [yStr, sStr] = key.split('-S');
    const year = Number(yStr);
    if (!Number.isFinite(year)) return null;
    return sStr === '1'
      ? { from: new Date(year, 0, 1), to: new Date(year, 6, 0, 23, 59, 59, 999) }
      : { from: new Date(year, 6, 1), to: new Date(year, 12, 0, 23, 59, 59, 999) };
  }
  if (granularity === 'quarter') {
    const [yStr, qStr] = key.split('-Q');
    const year = Number(yStr);
    const q = Number(qStr);
    if (!Number.isFinite(year) || !Number.isFinite(q)) return null;
    const startMonth = (q - 1) * 3;
    return { from: new Date(year, startMonth, 1), to: new Date(year, startMonth + 3, 0, 23, 59, 59, 999) };
  }
  return null;
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

// Parses a raw dataset cell value into a number, tolerating thousand-separator commas
// (e.g. "1,381,933") — a bare Number(...)/parseFloat(...) on a string like that returns
// NaN (Number) or silently truncates at the first comma (parseFloat), either of which
// makes a real numeric column read as 0/broken once someone pastes/imports a
// comma-formatted number. Every numeric coercion of a raw row value anywhere in this
// file's chart aggregation/filtering should go through this, not a bare Number(...).
function toNum(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return NaN;
  const cleaned = String(v).replace(/,/g, '').trim();
  return cleaned === '' ? NaN : Number(cleaned);
}

// Formats a chart value for display: thousand-separator commas, decimal point preserved
// when the number actually has a fractional part (not silently rounded away) — e.g.
// 1381933 -> "1,381,933", 1234.5 -> "1,234.5". Falls back to the raw value unchanged if
// it isn't a finite number (defensive — every real call site here is a plain number from
// tallyBy's own arithmetic, but this avoids ever rendering "NaN" on a chart).
function fmtNum(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString() : n;
}

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
    const rawNum = toNum(raw);
    if (raw !== '' && raw != null && !isNaN(rawNum)) {
      if (hasFrom && !isNaN(toNum(c.from)) && rawNum < toNum(c.from)) return false;
      if (hasTo && !isNaN(toNum(c.to)) && rawNum > toNum(c.to)) return false;
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
      const num = toNum(rawVal);
      if (!isNaN(num)) { helper[k].sum += num; helper[k].count += 1; }
      result[k] = helper[k].count > 0 ? Math.round(helper[k].sum / helper[k].count) : 0;
    } else {
      // 'sum' (default)
      const num = toNum(rawVal) || 0;
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

// Each `preview` draws N equal blocks with the first one filled — "this chart takes 1 of
// N equal columns in a row" reads at a glance, unlike the old text dropdown ("One Third
// (1/3)") which just named the fraction without showing what it actually looks like.
const gridSizePreview = (slots) => () => (
  <div className="w-full h-8 flex gap-1">
    {Array.from({ length: slots }).map((_, i) => (
      <div key={i} className={i === 0 ? 'flex-1 rounded' : 'flex-1 rounded bg-gray-200 dark:bg-gray-600'}
        style={i === 0 ? { backgroundColor: COLORS[0] } : undefined} />
    ))}
  </div>
);
// Unlike gridSizePreview's N-equal-blocks (this chart is 1 of N identical columns),
// three-quarter is a majority split, meant to sit next to a Quarter chart in the same
// row (3+1 quarters = a full row) — drawn as an actual 3:1 ratio bar so it doesn't get
// mistaken for just another "1 of N equal" option.
const threeQuarterPreview = () => (
  <div className="w-full h-8 flex gap-1">
    <div className="rounded" style={{ flex: '3 1 0%', backgroundColor: COLORS[0] }} />
    <div className="rounded bg-gray-200 dark:bg-gray-600" style={{ flex: '1 1 0%' }} />
  </div>
);
// 'third' is deliberately not offered here anymore — still handled by gridSizeClass
// below so any chart that already has it saved keeps its current width instead of
// silently jumping to full-width just because this list changed.
const GRID_SIZES = [
  { id: 'full', label: 'Full Width', preview: gridSizePreview(1) },
  { id: 'three-quarter', label: 'Three Quarters', preview: threeQuarterPreview },
  { id: 'half', label: 'Half Width', preview: gridSizePreview(2) },
  { id: 'quarter', label: 'One Quarter', preview: gridSizePreview(4) },
];

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
    // Meant to pair with a Quarter chart in the same row (9 + 3 = the full 12) — a wide
    // main chart next to a narrow side one, not another "1 of N equal" fraction.
    case 'three-quarter': return 'col-span-12 lg:col-span-9';
    default: return 'col-span-12';
  }
}

// What "kind" a custom chart is, for useEqualHeightGrid below — a Value Card and a Text
// note both use chartType 'aggregate-cards' (they're distinguished by cardDesign, see
// TEXT_DESIGN_IDS), so those need splitting out; every other chartType is a real chart,
// kept distinct per chart type (a donut shouldn't be told to match a bar's height).
export function customChartKind(chart) {
  if (chart.chartType === 'aggregate-cards') {
    return TEXT_DESIGN_IDS.has(chart.cardDesign) ? 'text' : 'card';
  }
  return `chart:${chart.chartType}`;
}

// Matches same-row card heights, but ONLY among cards sharing the same "kind" (see
// customChartKind — a Value Card, a Text note, and each individual chart type all count as
// different kinds; extra Map/Breakdown/Summary widget instances use `widget:<widgetType>`).
// CSS Grid's own align-items:stretch can't express that distinction — it stretches every
// item assigned to a row track uniformly, regardless of kind — so grid items instead opt
// OUT of stretch (see the `self-start` class at each call site) and this measures natural
// heights, then applies an explicit per-item pixel height only within matching (row, kind)
// groups, leaving a card with no same-kind row-mate at its own natural height.
//
// Call once per grid, with a ref on the grid container (every direct grid-item child must
// carry `data-eh-id`/`data-eh-kind`) and a cheap string key that changes whenever the set,
// order, or width of visible items changes (id/gridSize list is enough — content-driven
// height changes, like async data finishing a chart's render, are caught live by the
// ResizeObserver below without needing to be in this key).
export function useEqualHeightGrid(containerRef, dependencyKey) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const recompute = () => {
      const items = Array.from(container.querySelectorAll('[data-eh-id]'));
      if (!items.length) return;
      // Pass 1: clear any height forced by a previous pass so what gets measured below is
      // always the item's true natural content height, never a stale forced value (e.g.
      // left over from before a same-kind sibling was removed or shrank).
      items.forEach((el) => { el.style.height = ''; });
      const rows = new Map();
      items.forEach((el) => {
        const top = Math.round(el.offsetTop);
        if (!rows.has(top)) rows.set(top, []);
        rows.get(top).push(el);
      });
      rows.forEach((rowItems) => {
        const byKind = new Map();
        rowItems.forEach((el) => {
          const kind = el.dataset.ehKind || '';
          if (!byKind.has(kind)) byKind.set(kind, []);
          byKind.get(kind).push(el);
        });
        byKind.forEach((group) => {
          if (group.length < 2) return;
          const maxHeight = Math.max(...group.map((el) => el.getBoundingClientRect().height));
          group.forEach((el) => { el.style.height = `${maxHeight}px`; });
        });
      });
    };

    recompute();

    // Reacts to content-driven size changes too (a chart's async data finishing, a legend
    // growing, fonts loading) — not just the id/gridSize changes dependencyKey covers.
    let frame = null;
    const scheduleRecompute = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(recompute);
    };
    const ro = new ResizeObserver(scheduleRecompute);
    Array.from(container.querySelectorAll('[data-eh-id]')).forEach((el) => ro.observe(el));
    window.addEventListener('resize', scheduleRecompute);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', scheduleRecompute);
    };
  }, [dependencyKey]);
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
  // "Row mode" for one tile — instead of aggregating across every matching row, reads
  // this ONE column's raw value straight off the first row this tile's own Filter rows
  // narrow down to (e.g. "Jan" for whichever row's Filter rows says Site = "Site A").
  // Reuses the tile's existing `conditions` as the row-picker — no separate mechanism.
  { value: 'row_value', label: 'Value from one row' },
];
const CARD_AGG_OPTIONS = [
  { value: 'sum', label: 'Sum values' },
  { value: 'average', label: 'Average values' },
  { value: 'count', label: 'Count all rows' },
  { value: 'distinct', label: 'Count unique values' },
  { value: 'count_equals', label: 'Count rows where equals...' },
  // Same numerator as count_equals (rows where `field` equals a picked value), but shown
  // as that count's share of every row this card counts (after Filter rows), not the raw
  // count — e.g. "23.8%" instead of "503", for "what fraction of rows are Live" style
  // cards. Reuses count_equals' own "Value..." picker in the builder below.
  { value: 'percentage', label: 'Percentage of rows (%)' },
];
// Optional override for a Card/Text design's own main text size (the big number, or the
// text-mode paragraph) — blank (no chart.fontSize) keeps whatever size that specific
// design's own layout normally uses, unchanged from before this existed. One shared scale
// for both Card and Text, spanning small paragraph text through a big headline number,
// since the same picker in the builder applies to either mode.
const FONT_SIZE_OPTIONS = [
  { value: 'xs', label: 'XS', px: 14 },
  { value: 'sm', label: 'S', px: 20 },
  { value: 'md', label: 'M', px: 28 },
  { value: 'lg', label: 'L', px: 40 },
  { value: 'xl', label: 'XL', px: 56 },
  { value: 'xxl', label: 'XXL', px: 80 },
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
// distinct values, a 'range' From/To pair matched against ONE date column (compared as
// timestamps), or a 'range-overlap' filter matched against a PAIR of columns — a
// "started" column (required) and an "ended" column (optional, blank/unset meaning still
// ongoing) — where a row matches if its [started, ended-or-forever] span overlaps the
// selected window at all, e.g. "which sites were live at some point during this period,
// including ones that haven't been deactivated yet." A range-overlap filter has its own
// `granularity`: 'exact' (default — a manual From/To date pair, like 'range' but checked
// against the start/end column PAIR instead of one column) or 'period' — three separate
// multi-selects: Year (the actual years present in the data), Semester (generic "1st
// Sem"/"2nd Sem", not tied to any one year), and Quarter (generic "Q1"–"Q4"). Year is the
// anchor — Semester/Quarter picks are only meaningful paired with a selected year (e.g.
// Year=2026 + Quarter=Q1 means "Q1 2026", not "Q1 of every year"), so the filter is only
// "active" once at least one year is picked, and picking a Semester/Quarter with NO year
// picked has no effect yet. A row matches if its [start,end] span overlaps ANY of the
// resulting year×semester / year×quarter (or, with neither picked, whole-year) windows.
// See FilterSettingsModal and filterTablesByGeneralFilter.
const FILTER_TYPE_OPTIONS = [
  { value: 'exact', label: 'Exact value (dropdown)' },
  { value: 'range', label: 'Range (From/To)' },
  { value: 'range-overlap', label: 'Range — active during (start/end columns)' },
];
const RANGE_OVERLAP_GRANULARITY_OPTIONS = [
  { value: 'exact', label: 'Exact dates (From/To)' },
  { value: 'period', label: 'Period — Year / Semester / Quarter' },
];
// Semester/Quarter are generic (not per-year) — same 2/4 options regardless of what's in
// the data, since they only ever apply combined with whichever year(s) are picked.
const PERIOD_SEMESTER_OPTIONS = [{ value: '1', label: '1st Sem' }, { value: '2', label: '2nd Sem' }];
const PERIOD_QUARTER_OPTIONS = [
  { value: '1', label: 'Q1' }, { value: '2', label: 'Q2' }, { value: '3', label: 'Q3' }, { value: '4', label: 'Q4' },
];
// Whether this filter renders as two date inputs (value shape {from,to}) rather than a
// dropdown — 'range' always does; 'range-overlap' only does while its granularity is
// 'exact' (the default/unset case) or missing.
export const isRangeFilterType = (type, granularity) =>
  type === 'range' || (type === 'range-overlap' && (!granularity || granularity === 'exact'));
// range-overlap + granularity:'period' renders as the Year/Semester/Quarter trio (value
// shape: {years:[...], semesters:[...], quarters:[...]}) instead of the plain 'exact'
// type's single-select (value shape: one string). Also treats the old 'quarter'/
// 'semester'/'year' granularity values as 'period' too — those were this filter's own
// separate granularity values for a brief window before landing on this Year-anchored
// design; a filter saved with one of those old values just upgrades automatically.
const isPeriodOverlapFilter = (type, granularity) =>
  type === 'range-overlap' && ['period', 'quarter', 'semester', 'year'].includes(granularity);

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

// Resolves ONE general-filter's per-table "column" into a per-row value getter — usually
// just a direct lookup on the table's own field (plain column name), but the column can
// also be a merged pseudo-field ("<link field>__<their column>", the same convention
// mergeReferencedFields/referencedFieldOptionsFor use) when the admin picked a column from
// a LINKED table instead of one of this table's own — see FilterSettingsModal's
// auto-detection, which suggests these for a table with no directly-matching column of its
// own but a relationship to one that has. Builds the cross-table lookup once (not per row).
function buildFieldResolver(table, fieldKey, allTables) {
  const sepIdx = fieldKey.indexOf('__');
  if (sepIdx === -1) return (row) => row.values?.[fieldKey];
  const linkFieldName = fieldKey.slice(0, sepIdx);
  const targetColumn = fieldKey.slice(sepIdx + 2);
  const linkField = (table?.fields || []).find((f) => f.name === linkFieldName);
  if (!linkField?.reference_dataset) return () => undefined;
  const lookup = buildReferenceLookup(allTables, linkField.reference_dataset, linkField.reference_column);
  return (row) => {
    const key = row.values?.[linkFieldName];
    if (key === null || key === undefined || key === '') return undefined;
    return lookup?.index[String(key)]?.[targetColumn];
  };
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
// Every table's own rows (reference-merged), computed once and reused both directly
// (summary's primary table, and as combineChartRecords' own lookup map for map/
// breakdown below) AND by computeSummaryTiles below (each tile can map a different
// field across the SAME extra tables, so per-tile combining happens there instead of
// once here — see summary_extra/map_extra/breakdown_extra on ProjectChartSource).
function buildRecordsByDataset(tables) {
  const recordsByDataset = {};
  (tables || []).forEach((t) => {
    const records = (t.rows || []).map(r => ({ id: r.id, ...(r.values || {}) }));
    recordsByDataset[t.id] = mergeReferencedFields(records, t.fields, tables);
  });
  return recordsByDataset;
}

export function buildTaggedRecords(tables, source) {
  const recordsByDataset = buildRecordsByDataset(tables);
  const mapExtra = source?.map_extra || {};
  const breakdownExtra = source?.breakdown_extra || {};
  // Map/Breakdown each have exactly one field slot to combine across tables (their own
  // single mapped column) — reused via combineChartRecords with a throwaway "shim"
  // shaped like a chart, same trick computeSummaryTiles uses per-tile below. When no
  // extra tables are set this is a no-op passthrough (combineChartRecords' own
  // single-table fast path), so the no-extras case behaves exactly as before.
  return {
    summary: recordsByDataset[source?.summary_dataset] || [],
    map: combineChartRecords({
      dataset: source?.map_dataset,
      extraDatasets: mapExtra.datasets,
      field: source?.latitude_field,
      fieldMap: mapExtra.field_maps?.lat,
      secondaryField: source?.longitude_field,
      secondaryFieldMap: mapExtra.field_maps?.lng,
      // Reusing the aggregationField slot to carry the marker-color field's mapping —
      // it's otherwise unused for a Map, and this avoids adding a 4th slot to
      // combineChartRecords just for this one caller.
      aggregationField: source?.map_color_field,
      aggregationFieldMap: mapExtra.field_maps?.color,
      tableConditions: mapExtra.table_conditions,
    }, recordsByDataset, tables),
    breakdown: combineChartRecords({
      dataset: source?.breakdown_dataset,
      extraDatasets: breakdownExtra.datasets,
      field: source?.group_field,
      fieldMap: breakdownExtra.field_map,
      tableConditions: breakdownExtra.table_conditions,
    }, recordsByDataset, tables),
    recordsByDataset,
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
  const granularityByLabel = {};
  (filters || []).forEach((f) => { typeByLabel[f.label] = f.type; granularityByLabel[f.label] = f.granularity; });
  const active = Object.entries(values || {}).filter(([label, v]) => {
    if (isRangeFilterType(typeByLabel[label], granularityByLabel[label])) return Boolean(v?.from || v?.to);
    // Year is the anchor — Semester/Quarter picks with no year picked don't constrain
    // anything yet (see this file's own FILTER_TYPE_OPTIONS doc comment).
    if (isPeriodOverlapFilter(typeByLabel[label], granularityByLabel[label])) return Boolean(v?.years?.length);
    return Boolean(v);
  });
  if (!active.length) return tables;
  return tables.map((t) => {
    const fieldMap = t.general_filter_fields || {};
    const applicable = active
      // range-overlap's tag is {start, end} — only start is required (a table with no
      // "ended" concept at all just never excludes a row on that side) — regardless of
      // granularity, the same two columns feed both the exact-date and period modes.
      .filter(([label]) => typeByLabel[label] === 'range-overlap' ? fieldMap[label]?.start : fieldMap[label])
      .map(([label, val]) => [label, val, typeByLabel[label] === 'range-overlap'
        ? { resolveStart: buildFieldResolver(t, fieldMap[label].start, tables), resolveEnd: fieldMap[label].end ? buildFieldResolver(t, fieldMap[label].end, tables) : () => null }
        : buildFieldResolver(t, fieldMap[label], tables)]);
    if (!applicable.length) return t;
    const rows = (t.rows || []).filter((r) => applicable.every(([label, val, resolveOrResolvers]) => {
      if (typeByLabel[label] === 'range-overlap') {
        const granularity = granularityByLabel[label];
        const startRaw = resolveOrResolvers.resolveStart(r);
        if (!startRaw) return false;
        const startTime = new Date(startRaw).getTime();
        if (Number.isNaN(startTime)) return false;
        const endRaw = resolveOrResolvers.resolveEnd(r);
        const endTime = endRaw ? new Date(endRaw).getTime() : NaN;
        // Blank "ended" (or one that doesn't parse) means still ongoing — never excludes a
        // row on that side, for either mode below.
        const stillOngoing = !endRaw || Number.isNaN(endTime);
        const overlaps = (fromTime, toTime) => startTime <= toTime && (stillOngoing || endTime >= fromTime);
        if (isPeriodOverlapFilter('range-overlap', granularity)) {
          // Period mode: `val` is {years, semesters, quarters} — Semester/Quarter are
          // generic (not per-year), so every window is a YEAR × semester-or-quarter pair;
          // with neither picked, the whole selected year(s) are the window. A row matches
          // if it overlaps ANY resulting window (OR across the full cross-product).
          const years = val?.years || [];
          if (!years.length) return true;
          const quarters = val?.quarters || [];
          const semesters = val?.semesters || [];
          const windows = [];
          years.forEach((y) => {
            if (quarters.length) quarters.forEach((q) => windows.push(periodBoundsFromKey(`${y}-Q${q}`, 'quarter')));
            if (semesters.length) semesters.forEach((s) => windows.push(periodBoundsFromKey(`${y}-S${s}`, 'semester')));
            if (!quarters.length && !semesters.length) windows.push(periodBoundsFromKey(String(y), 'year'));
          });
          return windows.some((w) => w && overlaps(w.from.getTime(), w.to.getTime()));
        }
        // Exact mode: `val` is the usual {from,to} pair typed into the date inputs.
        const fromTime = val.from ? new Date(val.from).getTime() : -Infinity;
        // Inclusive through the end of the "To" day — a bare date has no time component,
        // so without this, picking the same day for From and To would match nothing.
        const toTime = val.to ? new Date(val.to).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;
        return overlaps(fromTime, toTime);
      }
      const fromTime = val.from ? new Date(val.from).getTime() : -Infinity;
      const toTime = val.to ? new Date(val.to).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;
      const raw = resolveOrResolvers(r);
      if (typeByLabel[label] === 'range') {
        if (!raw) return false;
        const time = new Date(raw).getTime();
        if (Number.isNaN(time)) return false;
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
  (filters || []).forEach(({ label, type, granularity }) => {
    if (isRangeFilterType(type, granularity)) return;
    // Keyed by lowercase so e.g. "Cagayan de Oro" (tagged on one table) and "cagayan de
    // oro" (tagged on another table under the same filter) collapse into ONE dropdown
    // option instead of showing as two — filterTablesByGeneralFilter already matches
    // case-insensitively (see its `.toLowerCase()` comparison below), so surfacing every
    // raw casing here was pure duplication, not a real distinction. First casing seen
    // wins for display. A period-mode range-overlap filter only needs YEAR options
    // computed here (read off its "started" column) — Semester/Quarter are generic,
    // always PERIOD_SEMESTER_OPTIONS/PERIOD_QUARTER_OPTIONS regardless of what's in the
    // data, since they only ever apply paired with whichever year(s) get picked.
    const isPeriod = isPeriodOverlapFilter(type, granularity);
    const values = new Map();
    (tables || []).forEach((t) => {
      const fieldSpec = (t.general_filter_fields || {})[label];
      const field = isPeriod ? fieldSpec?.start : fieldSpec;
      if (!field) return;
      const resolve = buildFieldResolver(t, field, tables);
      (t.rows || []).forEach((r) => {
        const v = resolve(r);
        if (v === null || v === undefined) return;
        if (isPeriod) {
          const year = dateBucketKey(v, 'year');
          if (year && !values.has(year)) values.set(year, year);
          return;
        }
        const trimmed = String(v).trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!values.has(key)) values.set(key, trimmed);
      });
    });
    result[label] = [...values.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, display]) => ({ value: isPeriod ? key : display, label: display }));
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
    if (isRangeFilterType(f.type, f.granularity)) return Boolean(v?.from || v?.to);
    if (isPeriodOverlapFilter(f.type, f.granularity)) return Boolean(v?.years?.length);
    return Boolean(v);
  });
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filters</span>
      {filters.length === 0 && (
        <span className="text-xs text-gray-400">None configured yet.</span>
      )}
      {filters.map((f) => {
        if (isRangeFilterType(f.type, f.granularity)) {
          return (
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
          );
        }
        if (isPeriodOverlapFilter(f.type, f.granularity)) {
          // Three separate multi-selects — Year (real years from the data, via
          // generalFilterOptions), Semester and Quarter (generic — PERIOD_SEMESTER_OPTIONS/
          // PERIOD_QUARTER_OPTIONS, same options no matter what's in the data). Semester
          // and Quarter are disabled until at least one Year is picked, since they only
          // ever apply combined with the selected year(s) — see filterTablesByGeneralFilter.
          const yearOpts = generalFilterOptions[f.label] || [];
          const val = values[f.label] || {};
          const years = val.years || [];
          const semesters = val.semesters || [];
          const quarters = val.quarters || [];
          const setPart = (part, arr) => onChange(f.label, { ...val, [part]: arr });
          return (
            <div key={f.label} className="flex flex-wrap items-center gap-1.5">
              <div className="min-w-[110px]">
                <Select isMulti value={yearOpts.filter((o) => years.includes(o.value))}
                  onChange={(sel) => setPart('years', (sel || []).map((o) => o.value))}
                  options={yearOpts} placeholder="Year" styles={selectStyles} />
              </div>
              <div className="min-w-[130px]">
                <Select isMulti isDisabled={!years.length} value={PERIOD_SEMESTER_OPTIONS.filter((o) => semesters.includes(o.value))}
                  onChange={(sel) => setPart('semesters', (sel || []).map((o) => o.value))}
                  options={PERIOD_SEMESTER_OPTIONS} placeholder={years.length ? 'Semester' : 'Pick a year first'} styles={selectStyles} />
              </div>
              <div className="min-w-[130px]">
                <Select isMulti isDisabled={!years.length} value={PERIOD_QUARTER_OPTIONS.filter((o) => quarters.includes(o.value))}
                  onChange={(sel) => setPart('quarters', (sel || []).map((o) => o.value))}
                  options={PERIOD_QUARTER_OPTIONS} placeholder={years.length ? 'Quarter' : 'Pick a year first'} styles={selectStyles} />
              </div>
            </div>
          );
        }
        return (
          <div key={f.label} className="min-w-[160px]">
            <Select value={selectValue(generalFilterOptions[f.label] || [], values[f.label] || '')}
              onChange={(opt) => onChange(f.label, opt ? opt.value : '')}
              options={generalFilterOptions[f.label] || []} placeholder={f.label} isClearable styles={selectStyles} />
          </div>
        );
      })}
      {hasFilter && (
        <button type="button" onClick={onClear} className="text-xs font-medium text-red-500 hover:underline">Clear</button>
      )}
    </div>
  );
}

// Generic (non-Free-Wi-Fi) Summary Card tile computation — shared by the live widget and
// its style-editor preview so the preview always shows real numbers instead of placeholders.
// `combineCtx` (optional: `{ recordsByDataset, genericTables }`) unlocks per-tile extra
// source tables (ProjectChartSource.summary_extra) — each tile can map its own field
// across a different set of columns than any other tile, so unlike Map/Breakdown (one
// shared field, combined once in buildTaggedRecords), the combining has to happen HERE,
// per tile, via the same combineChartRecords "shim" trick. Omitting combineCtx (every
// call site that hasn't been updated yet, or genuinely doesn't have it in scope) just
// falls through to today's single-table behavior — fully backward compatible.
export function computeSummaryTiles(records, source, taggedFields, combineCtx) {
  // Older saves stored plain field-name strings (sum-only) — normalize those too.
  const tileConfigs = (source?.summary_fields || [])
    .map(t => (typeof t === 'string' ? { field: t, agg: 'sum' } : t))
    .filter(t => t.agg === 'count' || t.field);
  const summaryExtra = source?.summary_extra;
  // No tiles configured yet → fall back to a single row-count tile so the widget isn't
  // blank before anyone visits "Data Source". Once tiles are configured, the first one IS
  // the lead tile (e.g. a distinct-count "Total Active Locations" rather than the raw row
  // count) — nothing is auto-prepended.
  const tiles = tileConfigs.length
    ? tileConfigs.map((cfg) => {
        const fieldDef = (taggedFields || []).find(f => f.name === cfg.field);
        // Each tile can carry its own filter conditions, independent of every other
        // tile's — e.g. one tile counts all rows, another only Province = Bukidnon rows.
        const rows = (summaryExtra?.datasets?.length && combineCtx)
          ? combineChartRecords({
              dataset: source.summary_dataset,
              extraDatasets: summaryExtra.datasets,
              field: cfg.field,
              fieldMap: cfg.fieldMap,
              tableConditions: summaryExtra.table_conditions,
              conditions: cfg.conditions,
            }, combineCtx.recordsByDataset, combineCtx.genericTables)
          : filterRecordsByConditions(records, cfg.conditions);
        let value = 0;
        if (cfg.agg === 'count') {
          value = rows.length;
        } else if (cfg.agg === 'distinct') {
          // A blank row counts as one "N/A" value here, not zero — same convention charts
          // use when grouping rows (tallyBy's `field || 'N/A'`), so a distinct-count tile
          // agrees with what a chart on the same field would show as its category count.
          value = new Set(rows.map(r => String(r[cfg.field] ?? '').trim() || 'N/A')).size;
        } else if (cfg.agg === 'count_equals') {
          const target = String(cfg.equals ?? '').trim().toLowerCase();
          value = rows.filter(r => String(r[cfg.field] ?? '').trim().toLowerCase() === target).length;
        } else if (cfg.agg === 'row_value') {
          // Not an aggregate at all — this tile's own `conditions` pick ONE row (the
          // first match), and its raw value for `field` is shown as-is.
          value = rows.length ? (toNum(rows[0][cfg.field]) || 0) : 0;
        } else {
          value = rows.reduce((s, r) => s + (toNum(r[cfg.field]) || 0), 0);
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
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16 sm:w-20 text-right shrink-0 truncate">{fmtNum(count)} rows</span>
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
export const WIDGET_TYPE_LABELS = { summary: 'Summary', map: 'Map', 'province-breakdown': 'Breakdown', 'ict-plans-policies': 'ICT Plans and Policies' };

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
    tertiaryField: c.tertiary_field || '',
    // Only meaningful for chart_type='aggregate-cards' — see ProjectChartConfig's model
    // docstring. Defaulted here (not left undefined) so the "Add Custom Chart" modal's
    // Aggregation select always has a valid value even for charts saved before this
    // existed.
    agg: c.agg || 'sum',
    equals: c.agg_equals || '',
    // Optional word shown right after a 'percentage' card's own number — see the model
    // field's docstring.
    percentageLabel: c.percentage_label || '',
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
    // Optional override for the main number/text's size — see FONT_SIZE_OPTIONS.
    fontSize: c.font_size || '',
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
    // Per-category "out of" target — {rawValue: 100} shows "50/100" instead of just "50"
    // for that category, e.g. progress toward a goal. Display-only: does NOT change the
    // real tallied count, bar height, or percentage-of-total math anywhere — see the
    // model field's docstring and displayValue() in CustomChartRenderer.
    valueTargets: c.value_targets || {},
    // Same idea, for secondary_field's own sub-group values — see displaySecondaryLabel.
    secondaryValueLabels: c.secondary_value_labels || {},
    // {field, value} pairs, ANDed together, narrowing which rows this chart counts —
    // independent of chart_type, unlike agg/agg_equals. See CustomChartRenderer.
    conditions: c.conditions || [],
    gridSize: c.grid_size || 'full',
    showOnUser: c.show_on_user,
    showAllCategories: c.show_all_categories,
    // Only meaningful once showAllCategories is on — see pageOf/Pager in
    // CustomChartRenderer for what this actually skips.
    disablePagination: !!c.disable_pagination,
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
    // "Compare columns for one row" mode — see CustomChartRenderer's rowMode branch.
    rowMode: !!c.row_mode,
    rowColumns: c.row_columns || [],
    // line/area only — one line per matching row instead of one line grouping `field`'s
    // values — see buildMultiRowSeries/renderMultiRowLine in CustomChartRenderer.
    multiRowMode: !!c.multi_row_mode,
    // Color customization — see colorFor's docstring in CustomChartRenderer.
    colorMode: c.color_mode || 'palette',
    chartColor: c.chart_color || '#0038A8',
    categoryColors: c.category_colors || {},
    secondaryCategoryColors: c.secondary_category_colors || {},
    categorySecondaryColors: c.category_secondary_colors || {},
    // Admin-set display order for a non-row-mode chart's categories (see
    // buildChartTallyData) — dragged into place in "Customize labels".
    categoryOrder: c.category_order || [],
    // Same idea, for secondary_field's own sub-groups within each primary category's
    // breakdown — dragged into place in "Customize sub-labels".
    secondaryCategoryOrder: c.secondary_category_order || [],
    // Same idea, one level deeper still — tertiary_field's own values, no color
    // counterpart (see the model field's own comment for why).
    tertiaryValueLabels: c.tertiary_value_labels || {},
    tertiaryCategoryOrder: c.tertiary_category_order || [],
    // Donut's own center content — see the "Donut center" toggle in the chart builder.
    donutCenterMode: c.donut_center_mode || 'total',
    // Comparison chart type only — each primary category starts collapsed, expanding on
    // click to reveal its secondary_field breakdown rows.
    comparisonCollapsible: !!c.comparison_collapsible,
    // bar-vertical + row mode only — the automatic per-bar "% change" readout.
    // Defaults true (opt-out, not opt-in) so it keeps showing for every chart saved before
    // this field existed, since c.show_row_increase comes back undefined for those.
    showRowIncrease: c.show_row_increase !== false,
    rowIncreaseColor: c.row_increase_color || '',
    rowDecreaseColor: c.row_decrease_color || '',
    rowIncreaseInHeader: !!c.row_increase_in_header,
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
    tertiary_field: chart.tertiaryField || '',
    agg: isCard ? (chart.agg || 'sum') : '',
    agg_equals: isCard ? (chart.equals || '') : '',
    percentage_label: isCard ? (chart.percentageLabel || '') : '',
    aggregation_enabled: !isCard && !!chart.aggregationEnabled,
    aggregation_field: !isCard ? (chart.aggregationField || '') : '',
    aggregation_type: !isCard ? (chart.aggregationType || 'sum') : '',
    card_design: isCard ? (chart.cardDesign || 'big-number') : '',
    card_icon: isCard ? (chart.cardIcon || '') : '',
    card_color: isCard ? (chart.cardColor || '') : '',
    card_target: isCard ? (chart.cardTarget || '') : '',
    card_image: isCard ? (chart.cardImage || '') : '',
    card_text_align: isCard ? (chart.cardTextAlign || 'left') : '',
    font_size: isCard ? (chart.fontSize || '') : '',
    card_gradient_color: isCard ? (chart.cardGradientColor || '#000000') : '',
    card_description: isCard ? (chart.cardDescription || '') : '',
    hide_title: !!chart.hideTitle,
    date_group_by: isDateTrend ? (chart.dateGroupBy || 'month') : '',
    cumulative: isDateTrend ? !!chart.cumulative : false,
    value_labels: Object.fromEntries(Object.entries(chart.valueLabels || {}).filter(([, v]) => v && v.trim())),
    value_targets: Object.fromEntries(Object.entries(chart.valueTargets || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
    secondary_value_labels: Object.fromEntries(Object.entries(chart.secondaryValueLabels || {}).filter(([, v]) => v && v.trim())),
    conditions: (chart.conditions || []).filter(cond => cond.field),
    grid_size: chart.gridSize || 'full',
    show_on_user: chart.showOnUser !== false,
    show_all_categories: !!chart.showAllCategories,
    disable_pagination: !!chart.showAllCategories && !!chart.disablePagination,
    visible: chart.visible !== false,
    ...(chart.dataset != null ? { dataset: chart.dataset } : {}),
    extra_datasets: (chart.extraDatasets || []).filter((id) => id != null && id !== ''),
    field_map: chart.fieldMap || {},
    secondary_field_map: chart.secondaryFieldMap || {},
    aggregation_field_map: chart.aggregationFieldMap || {},
    table_conditions: Object.fromEntries(
      Object.entries(chart.tableConditions || {}).map(([id, conds]) => [id, (conds || []).filter(c => c.field)])
    ),
    row_mode: !isCard && !!chart.rowMode,
    row_columns: !isCard && (chart.rowMode || chart.multiRowMode) ? (chart.rowColumns || []) : [],
    multi_row_mode: !isCard && (chart.chartType === 'line' || chart.chartType === 'area') && !chart.rowMode && !!chart.multiRowMode,
    color_mode: !isCard ? (chart.colorMode || 'palette') : 'palette',
    chart_color: !isCard ? (chart.chartColor || '#0038A8') : '',
    category_colors: !isCard ? (chart.categoryColors || {}) : {},
    secondary_category_colors: !isCard ? (chart.secondaryCategoryColors || {}) : {},
    category_secondary_colors: !isCard ? (chart.categorySecondaryColors || {}) : {},
    category_order: !isCard && !chart.rowMode ? (chart.categoryOrder || []) : [],
    secondary_category_order: !isCard && !chart.rowMode ? (chart.secondaryCategoryOrder || []) : [],
    tertiary_value_labels: !isCard ? (chart.tertiaryValueLabels || {}) : {},
    tertiary_category_order: !isCard && !chart.rowMode ? (chart.tertiaryCategoryOrder || []) : [],
    donut_center_mode: chart.chartType === 'donut' ? (chart.donutCenterMode || 'total') : 'total',
    comparison_collapsible: chart.chartType === 'comparison' ? !!chart.comparisonCollapsible : false,
    show_row_increase: chart.chartType === 'bar-vertical' ? chart.showRowIncrease !== false : true,
    row_increase_color: chart.chartType === 'bar-vertical' ? (chart.rowIncreaseColor || '') : '',
    row_decrease_color: chart.chartType === 'bar-vertical' ? (chart.rowDecreaseColor || '') : '',
    row_increase_in_header: chart.chartType === 'bar-vertical' ? !!chart.rowIncreaseInHeader : false,
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
//
// Dedup is by id only — two DIFFERENT charts (different backend rows, different ids) that
// happen to share the same type/field/etc. are legitimate, not duplicates (e.g. several
// donut charts grouping the same field with different titles, colors, or filters). This
// used to also dedup by a computed "signature" (chart type + field + conditions, ...),
// which silently dropped every chart after the first one with a matching signature —
// exactly the multi-chart-same-field setups admins actually want to build.
function sanitizeCharts(charts, chartOrder, hiddenBuiltins = []) {
  const seenIds = new Set();
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
  if (count < type.minItems) return { status: 'disabled', reason: `Needs at least ${type.minItems} categories — this field only has ${fmtNum(count)}` };
  if (type.maxItems && count > type.maxItems) {
    return { status: 'partial', reason: type.requiresDateField
      ? `Shows the most recent ${type.maxItems} of ${fmtNum(count)} dates`
      : `Shows the top ${type.maxItems} of ${fmtNum(count)} categories` };
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
                  {type}: {fmtNum(count)}
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
  // A blank row counts as one "N/A" value here, not zero — see computeSummaryTiles's
  // 'distinct' branch above for why.
  if (agg === 'distinct') return new Set(records.map(r => String(r[field] ?? '').trim() || 'N/A')).size;
  if (agg === 'average') {
    // Number('') is 0, not NaN — blank cells must be filtered out as strings first, or
    // they'd silently count as zero-valued rows and drag the average down instead of
    // being excluded as "no data" (rows with a real value are what an average means).
    const nums = records
      .map(r => r[field])
      .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      .map(toNum)
      .filter(Number.isFinite);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }
  return records.reduce((s, r) => s + (toNum(r[field]) || 0), 0); // sum (default)
}

// Same number a Value Card shows, as display text — used by project highlights whose
// title is bound to a dataset (title_binding: {enabled, dataset, field, agg, equals,
// percentageLabel, conditions}). `table` is one entry of getProjectDatasets().
export function computeBindingDisplay(table, binding) {
  if (!table || !binding) return null;
  const records = (table.rows || []).map((r) => ({ id: r.id, ...(r.values || {}) }));
  const sites = filterRecordsByConditions(records, binding.conditions);
  const agg = binding.agg || 'sum';
  const matchCount = () => sites.filter((r) => matchesEqualsValue(r[binding.field], binding.equals)).length;
  const value = agg === 'count_equals'
    ? matchCount()
    : agg === 'percentage'
    ? (sites.length ? (matchCount() / sites.length) * 100 : 0)
    : computeAggregateValue(sites, binding.field, agg);
  return agg === 'percentage'
    ? `${value.toFixed(1)}%${binding.percentageLabel ? ' ' + binding.percentageLabel : ''}`
    : agg === 'average'
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : value.toLocaleString();
}

// Accomplishment breakdown from a dataset: one row per distinct `group_field` value (e.g.
// Province) with that group's count/sum/average/unique (same vocabulary as a Value Card),
// biggest first. Returns [{label, value}] like a hand-typed breakdown.
export function computeBreakdownRows(table, binding) {
  if (!table || !binding?.group_field) return null;
  const records = (table.rows || []).map((r) => ({ id: r.id, ...(r.values || {}) }));
  const sites = filterRecordsByConditions(records, binding.conditions);
  const groups = new Map();
  sites.forEach((r) => {
    const k = String(r[binding.group_field] ?? '').trim() || 'N/A';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  const agg = binding.agg || 'count';
  return [...groups.entries()]
    .map(([label, rows]) => ({ label, num: computeAggregateValue(rows, binding.field, agg) }))
    .sort((a, b) => b.num - a.num)
    .map(({ label, num }) => ({
      label,
      value: agg === 'average' ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }) : num.toLocaleString(),
    }));
}

// Title text for a highlight: `{value}` in the typed title is replaced by the computed
// number; with no placeholder the number is put in front. Falls back to the typed title
// (placeholder stripped) while the dataset is loading or missing.
export function resolveHighlightTitle(title, binding, tables) {
  if (!binding?.enabled || !binding.dataset) return title;
  // Datasets still being fetched: a pulsing placeholder bar in the text colour.
  if (tables == null) return <span className="inline-block h-[0.9em] w-28 max-w-full align-middle rounded bg-current opacity-20 animate-pulse" aria-label="Loading" />;
  const display = computeBindingDisplay((tables || []).find((t) => t.id === Number(binding.dataset)), binding);
  if (display == null) return title.replace('{value}', '').trim();
  return title.includes('{value}') ? title.replace('{value}', display) : `${display} ${title}`.trim();
}

// KPI tile for chart_type='aggregate-cards' — one big number (e.g. "Total Budget:
// ₱2.4M"), the chart's own Title (rendered by the enclosing ChartCard/DraggableChart)
// is the label, so this only needs to render the value itself.
function AggregateValueCard({ chart, sites }) {
  const design = chart.cardDesign || 'big-number';
  const color = chart.cardColor || '#0038A8';
  // Shared across every design below (not just 'image-bg') — `justify`/`items` reposition
  // the content BLOCK within the card's width, `text` aligns text within that block (only
  // differs from `justify` for multi-line content, e.g. a wrapped title under the number).
  // Computed before the aggregation below since Text Note needs it too but skips
  // aggregation entirely — see that branch just below.
  const align = chart.cardTextAlign || 'left';
  const alignJustify = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[align];
  const alignItems = { left: 'items-start', center: 'items-center', right: 'items-end' }[align];
  const alignText = { left: 'text-left', center: 'text-center', right: 'text-right' }[align];
  // Optional font-size override (see FONT_SIZE_OPTIONS) for the main number (Card) or main
  // text (Text mode) — an inline style always overrides a design's own Tailwind text-size
  // CLASS regardless of specificity, so every design below just spreads this into its
  // existing `style` (or adds one) rather than needing to swap classes conditionally. `{}`
  // (not undefined) when unset, so every spread below is unconditional.
  const fontSizeStyle = chart.fontSize && FONT_SIZE_OPTIONS.some((o) => o.value === chart.fontSize)
    ? { fontSize: `${FONT_SIZE_OPTIONS.find((o) => o.value === chart.fontSize).px}px`, lineHeight: 1.25 }
    : {};

  // Text designs (TEXT_DESIGNS) — "no DATA needed, just text": none of them touch
  // `sites`/`chart.field`/aggregation at all, just show whatever the admin typed directly.
  // All reuse cardDescription (every other design's small "context under the number" text)
  // as their own MAIN content instead of adding a dedicated field — there's no number here
  // for it to sit under, so it can just BE the card, and this needed no backend change at
  // all. Branches out before the aggregation below, which every other design depends on
  // and these don't.
  if (TEXT_DESIGN_IDS.has(design)) {
    const content = chart.cardDescription;
    // break-words: a long unbroken run of characters (no spaces to wrap at) would
    // otherwise overflow past the card's edge and get clipped by its ancestor's
    // overflow-hidden instead of wrapping onto the next line.
    const empty = <p className={`text-sm text-gray-400 italic ${alignText}`}>No text set yet — edit this card to add some.</p>;

    if (design === 'text-image-bg') {
      // Same photo/gradient math as CARD_DESIGNS' own 'image-bg' branch below (see its
      // comments for why the gradient shape/color work the way they do) — just showing
      // `content` instead of `display`, since there's no number here at all.
      const isCentered = chart.cardTextAlign === 'center';
      const { r, g, b } = hexToRgb(chart.cardGradientColor || '#000000');
      return (
        <div className={`relative rounded-xl overflow-hidden min-h-[160px] flex flex-col ${isCentered ? 'justify-center' : 'justify-end'} p-5 ${alignItems} ${alignText}`}
          style={{
            backgroundColor: chart.cardImage ? '#111' : color,
            backgroundImage: chart.cardImage ? `url(${chart.cardImage})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
          {chart.cardImage && (
            <div className="absolute inset-0" style={{
              background: isCentered
                ? `rgba(${r},${g},${b},0.45)`
                : `linear-gradient(to top, rgba(${r},${g},${b},0.92) 0%, rgba(${r},${g},${b},0.55) 45%, rgba(${r},${g},${b},0) 100%)`,
            }} />
          )}
          <div className="relative">
            {content ? (
              <p className={`text-base font-semibold text-white drop-shadow whitespace-pre-line break-words max-w-md ${alignText}`} style={fontSizeStyle}>{content}</p>
            ) : (
              <p className={`text-sm text-white/70 italic ${alignText}`}>No text set yet — edit this card to add some.</p>
            )}
          </div>
        </div>
      );
    }

    if (design === 'text-quote') {
      return (
        <div className={`flex flex-col py-6 px-6 gap-2 ${alignItems}`}>
          <Quote size={24} style={{ color }} className="opacity-60 shrink-0" />
          {content ? (
            <p className={`text-base italic font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line break-words max-w-md ${alignText}`} style={fontSizeStyle}>{content}</p>
          ) : empty}
        </div>
      );
    }

    if (design === 'text-banner') {
      const textColor = contrastTextColor(color);
      return (
        <div className={`flex flex-col py-8 px-6 rounded-xl ${alignItems}`} style={{ backgroundColor: color }}>
          {content ? (
            <p className={`text-base font-bold whitespace-pre-line break-words max-w-md ${alignText}`} style={{ color: textColor, ...fontSizeStyle }}>{content}</p>
          ) : (
            <p className={`text-sm italic opacity-80 ${alignText}`} style={{ color: textColor }}>No text set yet — edit this card to add some.</p>
          )}
        </div>
      );
    }

    if (design === 'text-callout') {
      return (
        <div className={`py-6 pl-4 pr-5 border-l-4 rounded-r-lg ${alignItems}`} style={{ borderColor: color }}>
          {content ? (
            <p className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words max-w-md ${alignText}`} style={fontSizeStyle}>{content}</p>
          ) : empty}
        </div>
      );
    }

    if (design === 'text-spotlight') {
      return (
        <div className={`flex flex-col py-10 px-6 ${alignItems}`}>
          {content ? (
            <p className={`text-2xl font-black whitespace-pre-line break-words max-w-md ${alignText}`} style={{ color, ...fontSizeStyle }}>{content}</p>
          ) : empty}
        </div>
      );
    }

    if (design === 'text-highlight') {
      return (
        <div className={`flex flex-col py-6 px-6 rounded-xl ${alignItems}`} style={{ backgroundColor: `${color}22` }}>
          {content ? (
            <p className={`text-sm font-medium whitespace-pre-line break-words max-w-md ${alignText}`} style={{ color, ...fontSizeStyle }}>{content}</p>
          ) : empty}
        </div>
      );
    }

    if (design === 'text-announcement') {
      return (
        <div className={`flex flex-col gap-2 py-6 px-6 ${alignItems}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
            <Megaphone size={16} className="text-white" />
          </div>
          {content ? (
            <p className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words max-w-md ${alignText}`} style={fontSizeStyle}>{content}</p>
          ) : empty}
        </div>
      );
    }

    // 'text-note' — Plain, the default text design.
    return (
      <div className={`flex flex-col py-6 px-6 gap-1.5 ${alignItems}`}>
        {content ? (
          <p className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words max-w-md ${alignText}`} style={fontSizeStyle}>{content}</p>
        ) : empty}
      </div>
    );
  }

  const agg = chart.agg || 'sum';
  const matchCount = () => sites.filter(r => matchesEqualsValue(r[chart.field], chart.equals)).length;
  const value = agg === 'count_equals'
    ? matchCount()
    : agg === 'percentage'
    ? (sites.length ? (matchCount() / sites.length) * 100 : 0)
    : computeAggregateValue(sites, chart.field, agg);
  const display = agg === 'percentage'
    ? `${value.toFixed(1)}%${chart.percentageLabel ? ' ' + chart.percentageLabel : ''}`
    : agg === 'average'
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : value.toLocaleString();
  const Icon = chart.cardIcon ? MARKER_ICON_OPTIONS.find(o => o.name === chart.cardIcon)?.Icon : null;

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
        <p className="text-5xl font-black" style={{ color: textColor, ...fontSizeStyle }}>{display}</p>
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
        <p className="text-5xl font-black" style={{ color, ...fontSizeStyle }}>{display}</p>
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  if (design === 'progress') {
    const target = Number(chart.cardTarget) || 0;
    const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
    return (
      <div className="py-8 px-6">
        <p className={`text-3xl font-black mb-3 ${alignText}`} style={{ color, ...fontSizeStyle }}>
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
          <p className="text-4xl font-black shrink-0" style={{ color, ...fontSizeStyle }}>{display}</p>
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
          <p className="text-4xl font-black text-white drop-shadow" style={fontSizeStyle}>{display}</p>
          {chart.title && <p className="text-xs font-medium text-white/80 mt-1">{chart.title}</p>}
          {chart.cardDescription && <p className={`text-xs text-white/80 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
        </div>
      </div>
    );
  }

  if (design === 'minimal-text') {
    return (
      <div className="py-6 pl-4 pr-5 border-l-4 rounded-r-lg" style={{ borderColor: color }}>
        <p className={`text-2xl font-semibold text-gray-800 dark:text-gray-100 ${alignText}`} style={fontSizeStyle}>{display}</p>
        {chart.title && <p className={`text-xs text-gray-400 mt-1 ${alignText}`}>{chart.title}</p>}
        {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
      </div>
    );
  }

  // 'big-number' — the original plain design.
  return (
    <div className={`flex flex-col py-8 px-6 ${alignItems}`}>
      <p className="text-5xl font-black" style={{ color, ...fontSizeStyle }}>{display}</p>
      {chart.cardDescription && <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs whitespace-pre-line ${alignText}`}>{chart.cardDescription}</p>}
    </div>
  );
}

// Row mode ("Compare columns for one row") needs exactly one row — but "Filter rows" only
// has to narrow it down to SOME matches, and a "Is one of" condition on its own field can
// easily leave several (e.g. "Summary is one of [Live count, Not-live count]" matches both
// of those rows). Picking plain filteredSites[0] then means whichever row the underlying
// table happens to list first wins — not necessarily the one the admin meant — and if THAT
// row's compared columns are blank, the chart just renders empty bars with no explanation.
// This instead tries each of the admin's own selected values IN ORDER (the first one
// picked is treated as the intended one), and within that, skips straight past a matching
// row that has no real number in any compared column to the next candidate — a blank/
// text-only row is never useful to chart, so there's no reason to prefer it over one with
// actual data just because it happened to match first.
function pickRowModeRow(filteredSites, conditions, rowColumns) {
  const hasNumericValue = (row) => (rowColumns || []).some((col) => Number.isFinite(toNum(row[col])));
  const multiCond = (conditions || []).find((c) => c.field && c.type === 'multi' && (c.values || []).length > 1);
  if (multiCond) {
    for (const wantedValue of multiCond.values) {
      const wanted = String(wantedValue).trim().toLowerCase();
      const match = filteredSites.find((r) => String(r[multiCond.field] ?? '').trim().toLowerCase() === wanted && hasNumericValue(r));
      if (match) return match;
    }
  }
  return filteredSites.find(hasNumericValue) || filteredSites[0] || null;
}

// Builds the {label: value} category data every chart type below renders from — pulled
// out of CustomChartRenderer so the CSV export (exportChartDataCSV) can compute the
// EXACT same data through one shared function instead of a second, separately-maintained
// copy of this logic that could quietly drift from what's actually on screen. Returns the
// FULL sorted list (before withOthers/cap trim it for on-screen display only) — export
// should never silently drop rows past a display cap.
function buildChartTallyData(chart, sites) {
  const filteredSites = filterRecordsByConditions(sites, chart.conditions);
  const isRowMode = !!chart.rowMode;
  const rowModeRow = isRowMode ? pickRowModeRow(filteredSites, chart.conditions, chart.rowColumns) : null;
  const isDateTrend = !isRowMode && (chart.chartType === 'line' || chart.chartType === 'area');
  const dateGroupBy = chart.dateGroupBy || 'month';
  const isAgg = !isRowMode && !!chart.aggregationEnabled && !!chart.aggregationField;
  const aggType = chart.aggregationType || 'sum';
  const bucketLabels = {};
  const fieldData = isRowMode
    ? Object.fromEntries((chart.rowColumns || []).map((col) => [col, rowModeRow ? (toNum(rowModeRow[col]) || 0) : 0]))
    : tallyBy(filteredSites, (s) => {
        if (!isDateTrend) return s[chart.field] || 'N/A';
        const raw = s[chart.field];
        const key = raw ? dateBucketKey(raw, dateGroupBy) : null;
        if (!key) return null;
        if (!bucketLabels[key]) bucketLabels[key] = dateBucketLabel(key, dateGroupBy);
        return key;
      }, isAgg, chart.aggregationField, aggType);

  // Default order is count-descending; chart.categoryOrder (set by dragging rows in
  // "Customize labels") overrides that for non-date-trend, non-row-mode charts — date
  // trends stay chronological and row mode already has its own inherent order (rowColumns'
  // own sequence). Any category NOT in a saved order (new data since it was set) ranks
  // last, sorted among themselves by count — same "new values append at the end" rule
  // "Customize labels" itself uses, so neither view can drift from the other.
  let sorted;
  if (isDateTrend) {
    sorted = Object.entries(fieldData).sort((a, b) => a[0].localeCompare(b[0]));
  } else if (isRowMode) {
    sorted = Object.entries(fieldData);
  } else if (chart.categoryOrder && chart.categoryOrder.length) {
    const orderIndex = new Map(chart.categoryOrder.map((v, i) => [v, i]));
    sorted = Object.entries(fieldData).sort((a, b) => {
      const ai = orderIndex.has(a[0]) ? orderIndex.get(a[0]) : Infinity;
      const bi = orderIndex.has(b[0]) ? orderIndex.get(b[0]) : Infinity;
      return ai !== bi ? ai - bi : b[1] - a[1];
    });
  } else {
    sorted = Object.entries(fieldData).sort((a, b) => b[1] - a[1]);
  }
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  if (isDateTrend && chart.cumulative) {
    let running = 0;
    sorted = sorted.map(([key, count]) => { running += count; return [key, running]; });
  }
  return { sorted, total, bucketLabels, isRowMode, rowModeRow, isDateTrend };
}

// bar-vertical + row mode + chart.rowIncreaseInHeader only — swaps the chart's own title
// for the computed first-vs-last-column "+X% Increase from <label>" text instead of
// showing it inline above the bars (see CustomChartRenderer's per-bar changePct), matching
// a design where that line IS the header rather than living inside the chart body. Called
// from the same place chart.title normally gets read (DraggableChart/ChartCard's title
// prop, plus the builder's own Live Preview header) — never from inside
// CustomChartRenderer, which keeps rendering its own per-bar badges independent of this.
export function rowIncreaseHeaderText(chart, sites) {
  if (chart.chartType !== 'bar-vertical' || !chart.rowIncreaseInHeader) return null;
  const { sorted, isRowMode } = buildChartTallyData(chart, sites);
  if (!isRowMode || sorted.length < 2 || !sorted[0][1]) return null;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const pct = ((last[1] - first[1]) / first[1]) * 100;
  const firstLabel = chart.valueLabels?.[first[0]] || first[0];
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% ${pct >= 0 ? 'Increase' : 'Decrease'} from ${firstLabel}`;
}

// A wide table (one row per category, one column per period — e.g. REGION rows with
// 2023/2024/2025/2026 columns) doesn't fit buildChartTallyData's one-line-total model at
// all: the point isn't grouping `field`'s values into buckets, it's turning every matching
// ROW into its own LINE, plotted across the same shared `row_columns` X-axis — one series
// per row instead of one series total. Capped at MAX_MULTI_ROW_SERIES lines so a table with
// hundreds of rows doesn't turn into an unreadable tangle; narrow it down with Filter rows.
const MAX_MULTI_ROW_SERIES = 12;

function buildMultiRowSeries(chart, sites) {
  const filteredSites = filterRecordsByConditions(sites, chart.conditions);
  const columns = chart.rowColumns || [];
  const matchedRows = filteredSites.slice(0, MAX_MULTI_ROW_SERIES);
  let series = matchedRows.map((row) => ({
    rawLabel: String(row[chart.field] ?? 'N/A'),
    points: columns.map((col) => toNum(row[col]) || 0),
  }));
  // Same "drag to reorder in Customize labels, anything new appends at the end" convention
  // every other category list in this file already follows — chart.categoryOrder is keyed
  // by the row's own `field` value here, exactly like a normal (non-multi-row) chart keys
  // it by that field's distinct values.
  if (chart.categoryOrder?.length) {
    const orderIndex = new Map(chart.categoryOrder.map((v, idx) => [v, idx]));
    series = [...series].sort((a, b) => {
      const ai = orderIndex.has(a.rawLabel) ? orderIndex.get(a.rawLabel) : Infinity;
      const bi = orderIndex.has(b.rawLabel) ? orderIndex.get(b.rawLabel) : Infinity;
      return ai - bi;
    });
  }
  const max = Math.max(...series.flatMap((s) => s.points), 1);
  return { series, columns, max, matchedCount: filteredSites.length };
}

// Strips characters most filesystems reject in a filename, and caps length so an admin's
// long chart title can't produce an unusably long/invalid file name.
function safeFilename(title, ext) {
  return `${(title || 'chart').replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 80) || 'chart'}.${ext}`;
}

// Serializes flat row objects into a CSV string and triggers a browser download — plain
// text, no library needed. Quotes any value containing a comma/quote/newline per RFC 4180.
function downloadCSV(rows, filename) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const escape = (val) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Downloads a custom chart's underlying data as CSV — the FULL data behind the chart, not
// just whatever's currently visible on screen (e.g. "Show all categories" off still
// exports every category, not just the capped top N). Value Cards export their one
// computed number; every other chart type exports via buildChartTallyData, the exact same
// function the chart itself renders from, so what's downloaded always matches what's shown.
export function exportChartDataCSV(chart, sites) {
  const isCard = chart.chartType === 'aggregate-cards';
  const rows = isCard
    ? (() => {
        const filteredSites = filterRecordsByConditions(sites, chart.conditions);
        const agg = chart.agg || 'sum';
        const matchCount = () => filteredSites.filter(r => matchesEqualsValue(r[chart.field], chart.equals)).length;
        const value = agg === 'count_equals'
          ? matchCount()
          : agg === 'percentage'
          ? (filteredSites.length ? (matchCount() / filteredSites.length) * 100 : 0)
          : computeAggregateValue(filteredSites, chart.field, agg);
        return [{ [chart.title || 'Value']: agg === 'percentage' ? `${value.toFixed(1)}%${chart.percentageLabel ? ' ' + chart.percentageLabel : ''}` : value }];
      })()
    : (() => {
        const { sorted, bucketLabels } = buildChartTallyData(chart, sites);
        const displayLabel = (rawLabel) => chart.valueLabels?.[rawLabel] || bucketLabels[rawLabel] || rawLabel;
        if (!chart.secondaryField) {
          return sorted.map(([label, value]) => ({ Category: displayLabel(label), Value: value }));
        }
        // Mirrors CustomChartRenderer's getSubGroups/getSubSubGroups exactly (same scoping,
        // same tallyBy, same saved order), so the export always has the same breakdown the
        // on-screen sub-rows do — a flat Category/Value pair alone was silently dropping
        // whatever secondary/tertiary field the chart was actually configured to group by.
        // One row per (primary, secondary[, tertiary]) combination — repeating the primary
        // category's own label/total on every one of its sub-rows, the standard "tidy data"
        // shape spreadsheet pivot tables/filters expect, rather than blanking it out after
        // the first sub-row the way the on-screen table does purely for visual scanning.
        const filteredSites = filterRecordsByConditions(sites, chart.conditions);
        const isAgg = !chart.rowMode && !!chart.aggregationEnabled && !!chart.aggregationField;
        const aggType = chart.aggregationType || 'sum';
        const displaySecondaryLabel = (v) => chart.secondaryValueLabels?.[v] || v;
        const displayTertiaryLabel = (v) => chart.tertiaryValueLabels?.[v] || v;
        const orderEntries = (entries, orderList) => {
          if (!orderList || !orderList.length) return entries.sort((a, b) => b[1] - a[1]);
          const orderIndex = new Map(orderList.map((v, i) => [v, i]));
          return entries.sort((a, b) => {
            const ai = orderIndex.has(a[0]) ? orderIndex.get(a[0]) : Infinity;
            const bi = orderIndex.has(b[0]) ? orderIndex.get(b[0]) : Infinity;
            return ai !== bi ? ai - bi : b[1] - a[1];
          });
        };
        const hasTertiary = !!chart.tertiaryField;
        const rows = [];
        sorted.forEach(([label, value]) => {
          const scoped = filteredSites.filter((s) => String(s[chart.field] || 'N/A') === String(label));
          const subData = tallyBy(scoped, (s) => s[chart.secondaryField] || 'N/A', isAgg, chart.aggregationField, aggType);
          const subEntries = orderEntries(Object.entries(subData), chart.secondaryCategoryOrder);
          subEntries.forEach(([subLabel, subValue]) => {
            const base = {
              Category: displayLabel(label), Value: value,
              [chart.secondaryField]: displaySecondaryLabel(subLabel),
              [`${chart.secondaryField} Value`]: subValue,
            };
            if (!hasTertiary) { rows.push(base); return; }
            const subScoped = scoped.filter((s) => String(s[chart.secondaryField] || 'N/A') === String(subLabel));
            const subSubData = tallyBy(subScoped, (s) => s[chart.tertiaryField] || 'N/A', isAgg, chart.aggregationField, aggType);
            const subSubEntries = orderEntries(Object.entries(subSubData), chart.tertiaryCategoryOrder);
            subSubEntries.forEach(([subSubLabel, subSubValue]) => {
              rows.push({
                ...base,
                [chart.tertiaryField]: displayTertiaryLabel(subSubLabel),
                [`${chart.tertiaryField} Value`]: subSubValue,
              });
            });
          });
        });
        return rows;
      })();
  downloadCSV(rows, safeFilename(chart.title, 'csv'));
}

// Group-by-field row counts — the aggregation every Breakdown widget (singleton and any
// extra instance) renders from. Kept separate from BreakdownAccordion's own inline copy of
// this same loop since export runs outside that component's render, but computes the
// identical grouping so the CSV always matches what the accordion shows.
function computeBreakdownGroups(records, groupField) {
  const rowsByGroup = {};
  records.forEach(r => {
    const key = r[groupField] || 'N/A';
    (rowsByGroup[key] = rowsByGroup[key] || []).push(r);
  });
  return Object.entries(rowsByGroup).map(([group, rows]) => [group, rows.length]).sort((a, b) => b[1] - a[1]);
}

// Row data for a Summary widget's CSV export (singleton or extra instance). Free Wi-Fi's
// built-in Summary Card reads from the live `summary` stats object instead of the generic
// computeSummaryTiles pipeline, so this branches on `isFreeWifi` rather than trying to
// unify two genuinely different data shapes.
export function builtinSummaryCSVRows({ isFreeWifi, stats, tiles }) {
  if (isFreeWifi) {
    const labels = { total_locations: 'Total Locations', municipalities_count: 'Municipalities', provinces_count: 'Provinces', barangays_count: 'Barangays', total_active_aps: 'Total Active Sites' };
    return Object.entries(labels).map(([key, label]) => ({ Label: label, Value: stats?.[key] ?? 0 }));
  }
  const list = [tiles.lead, ...tiles.rest, ...(tiles.accentTile ? [tiles.accentTile] : [])];
  return list.map(t => ({ Label: t.label, Value: t.value }));
}

// Row data for a Map widget's CSV export (singleton or extra instance) — one row per
// plotted point.
export function builtinMapCSVRows({ isFreeWifi, records, mapped, tooltipFieldDefs }) {
  if (isFreeWifi) {
    return (records || []).filter(r => r.latitude && r.longitude).map(r => ({
      Site: r.site_name || '', 'Site ID': r.r10_site_id || '', Province: r.province || '',
      Municipality: r.locality || '', Barangay: r.barangay || '', Latitude: r.latitude, Longitude: r.longitude,
    }));
  }
  return (mapped || []).map(r => {
    const row = { Latitude: r.latitude, Longitude: r.longitude };
    (tooltipFieldDefs || []).forEach(f => { row[f.label] = r[f.name]; });
    return row;
  });
}

// Row data for a Breakdown widget's CSV export (singleton or extra instance) — one row per
// underlying RECORD, with the same columns (and column order) as the accordion's own
// expanded raw-data table (source.breakdown_fields, or every tagged field when that's
// empty — see BreakdownAccordion's identical rawDataFieldDefs). A flat group+count summary
// was hiding the actual site-level data admins open each group to see; that summary is
// kept only as a fallback for a caller that doesn't have taggedFields to pass in.
export function builtinBreakdownCSVRows({ isFreeWifi, byProvince, records, groupField, groupLabel, taggedFields, breakdownFields }) {
  if (isFreeWifi) {
    return Object.entries(byProvince || {}).map(([prov, data]) => ({ Province: prov, Sites: data.total_sites || 0 })).sort((a, b) => b.Sites - a.Sites);
  }
  const rawDataFieldDefs = (breakdownFields || []).length
    ? breakdownFields.map(name => (taggedFields || []).find(f => f.name === name)).filter(Boolean)
    : (taggedFields || []);
  if (!rawDataFieldDefs.length) {
    return computeBreakdownGroups(records, groupField).map(([group, count]) => ({ [groupLabel || 'Group']: group, Rows: count }));
  }
  return (records || []).map((r) => {
    const row = {};
    rawDataFieldDefs.forEach((f) => { row[f.label] = r[f.name] ?? ''; });
    return row;
  });
}

// Screenshots a chart card's rendered DOM as a PNG — generic across every chart/widget
// type (custom charts, Value Cards, Summary/Map/Breakdown, extra widget instances) since
// it just rasterizes whatever's actually on screen instead of needing type-specific logic.
//
// Uses `html-to-image` rather than html2canvas: html2canvas reimplements CSS layout and
// text metrics itself in JS, and kept surfacing a fresh mismatch with the real browser
// render for every different pattern this page uses (`.chart-h-scroll`'s clipped labels,
// `.chart-canvas-scroll`'s clipped points, react-select's CSS-Grid-centered placeholder
// text) — three separate, real bugs across three unrelated mechanisms, all boiling down to
// html2canvas's own layout engine not matching what the browser actually does.
// `html-to-image` instead serializes the DOM into an SVG `<foreignObject>` and lets the
// BROWSER'S OWN engine lay it out and paint it, the same as it already does on screen, so
// there's no separate layout implementation left to disagree with reality.
//
// `width`/`height` (CSS px) are optional — applied directly to the card's own LIVE element
// (not a detached clone) before capture, the same as physically resizing it would be, so
// its real flex/wrap/truncate CSS actually reflows for that size (bars widen/narrow,
// labels get more or less room, etc.) instead of the chart just being scaled or clipped
// after the fact. html-to-image reads the node's own clientWidth/clientHeight for its
// output size when no width/height option is passed to it directly, so once the live node
// has already reflowed to the requested size, no separate resize step is needed on the
// capture's end at all — it just captures whatever the (now differently-sized) node
// actually renders as, exactly like a real screenshot at that size would.
//
// `includeHeader`: `contentRef` (what `node` is, from DraggableChart) only wraps the
// chart's own content — the title lives in a sibling header div above it (alongside the
// drag handle / edit / download buttons, which the export should never include), so it's
// never part of the capture on its own. When on, a plain title bar is built fresh and
// temporarily inserted as the node's first child purely for this one capture, spanning
// edge-to-edge via a negative margin that exactly cancels whatever padding the node
// actually has right now (0 for `noPadding` cards, the usual p-4 otherwise) rather than
// assuming a fixed value, then removed again in `finally` — the live page is untouched
// once this returns.
//
// Returns a promise that resolves once the download has actually been triggered, so
// callers can show a loading state for the capture instead of it looking like nothing
// happened.
export async function exportChartAsImage(node, title, { width, height, includeHeader } = {}) {
  if (!node) return;
  const prevWidth = node.style.width;
  const prevHeight = node.style.height;
  if (width) node.style.width = `${width}px`;
  let headerEl = null;
  if (includeHeader && title) {
    const computed = window.getComputedStyle(node);
    headerEl = document.createElement('div');
    headerEl.textContent = title;
    Object.assign(headerEl.style, {
      margin: `-${computed.paddingTop} -${computed.paddingRight} 12px -${computed.paddingLeft}`,
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb',
      fontWeight: '700',
      fontSize: '14px',
      color: '#111827',
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', sans-serif",
    });
    node.insertBefore(headerEl, node.firstChild);
  }
  // Applied after the header is already inserted (not alongside `width` above) — a
  // requested height is meant as the CHART's height, not the header's, so the header's own
  // rendered height (only knowable once it's actually in the live DOM) gets added on top
  // instead of being squeezed out of that same budget. Without this, the forced box was
  // exactly one header short of fitting header + chart, silently cropping that much off
  // the bottom of the chart content.
  if (height) node.style.height = `${height + (headerEl?.offsetHeight || 0)}px`;
  let blob;
  try {
    const canvas = await htmlNodeToCanvas(node, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
    });
    blob = await new Promise((resolve) => canvas.toBlob(resolve));
  } finally {
    if (headerEl) headerEl.remove();
    node.style.width = prevWidth;
    node.style.height = prevHeight;
  }
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(title, 'png');
  a.click();
  URL.revokeObjectURL(url);
}

// Custom Chart Renderer with hover tooltips
export function CustomChartRenderer({ chart, sites }) {
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  // chart_type='comparison' + chart.comparisonCollapsible only — which primary categories
  // are currently expanded to show their secondary_field breakdown. Empty by default (every
  // category starts collapsed), matching "the first thing you see is the primary field".
  const [expandedComparisonRows, setExpandedComparisonRows] = useState(() => new Set());
  const toggleComparisonRow = (label) => {
    setExpandedComparisonRows((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };
  // Paginates the "vertical list" chart types (bar-horizontal, table, list, ...) once
  // "Show all categories" is on — dumping e.g. 97 categories into one long scrolling block
  // was the alternative, this instead pages through them in the type's normal batch size.
  // Resets to page 1 whenever the underlying data/config changes so a stale page number
  // from a previous field/filter doesn't leave the view showing nothing.
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [chart.field, chart.dataset, chart.chartType, chart.showAllCategories, chart.disablePagination, chart.conditions, chart.rowMode, chart.rowColumns]);

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

  // See buildChartTallyData's own docstring for what this computes and why it's a
  // separate function — "Compare columns for one row" mode (isRowMode), Line/Area's
  // chronological date-bucketing (isDateTrend), and the optional per-category
  // aggregation are all handled inside it.
  const { sorted: tallySorted, total, bucketLabels, isRowMode, rowModeRow, isDateTrend } = buildChartTallyData(chart, sites);
  if (isRowMode && !rowModeRow) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No row matches the Filter rows conditions above — narrow them down until exactly one row matches.
      </div>
    );
  }
  let sorted = tallySorted;
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
  // Color customization (chart.colorMode) — 'palette' (default, unchanged behavior) just
  // cycles the shared COLORS array by position. 'accent' uses chart.chartColor for every
  // bar/slice/line alike (one flat color across the whole chart). 'custom' looks up
  // chart.categoryColors by this category's RAW label (same raw-label keying convention
  // as chart.valueLabels) — a category the admin hasn't picked a color for yet still
  // falls back to the shared palette instead of going blank. "Others" (the roll-up
  // bucket withOthers creates) always stays neutral gray regardless of mode — it isn't a
  // real category, so no per-category color would make sense for it, and a custom accent
  // there would visually claim it as significant when it's actually a catch-all.
  const colorFor = (label, i) => {
    if (label === 'Others') return '#9ca3af';
    if (chart.colorMode === 'accent') return chart.chartColor || COLORS[0];
    if (chart.colorMode === 'custom') return chart.categoryColors?.[label] || COLORS[i % COLORS.length];
    return COLORS[i % COLORS.length];
  };

  // Per-chart display-label override (chart.valueLabels: {rawValue: displayText} — see the
  // model field's docstring) — lets an admin relabel a value everywhere it's shown in THIS
  // chart (e.g. "N/A" → "No") without touching the underlying data. Falls back to the
  // date-bucket auto-label (Line/Area) or the raw value itself when there's no override.
  // Only ever changes what's DISPLAYED — key/onClick/fieldData keying all still use the raw
  // label, so grouping and click-to-filter are unaffected.
  const displayLabel = (rawLabel) => chart.valueLabels?.[rawLabel] || bucketLabels[rawLabel] || rawLabel;
  // Same idea as displayLabel, for secondary_field's own sub-group values (see
  // chart.secondaryValueLabels) — no date-bucket fallback, since a secondary field is
  // never itself a date-trend axis.
  const displaySecondaryLabel = (rawLabel) => chart.secondaryValueLabels?.[rawLabel] || rawLabel;
  const displayTertiaryLabel = (rawLabel) => chart.tertiaryValueLabels?.[rawLabel] || rawLabel;
  // Per-category "out of" target (chart.valueTargets: {rawValue: number}, set via
  // "Customize labels") — shows "50/100" instead of just "50" for a category with a target
  // set (used in tooltips/legends/table cells/cards, which all have room for the combined
  // text). `count` here is always the real tallied/aggregated value; percent-of-total is
  // unaffected by a target either way.
  const targetFor = (rawLabel) => {
    const t = toNum(chart.valueTargets?.[rawLabel]);
    return Number.isFinite(t) && t > 0 ? t : null;
  };
  const displayValue = (rawLabel, count) => {
    const target = targetFor(rawLabel);
    return target !== null ? `${fmtNum(count)}/${fmtNum(target)}` : fmtNum(count);
  };
  // Just the "/target" suffix (or '' with no target) — for the handful of bar-style chart
  // types (bar-horizontal, funnel, comparison's fallback bar) where the value label sits
  // INSIDE a width-proportional colored fill: a short bar's text would otherwise overflow
  // past its own colored area once "/target" made the label longer, so those render the
  // plain count inside the bar and this suffix as a separate label just outside it instead.
  const targetLabel = (rawLabel) => { const t = targetFor(rawLabel); return t !== null ? `/${fmtNum(t)}` : ''; };
  // A category with a target sizes its own bar/fill relative to THAT target instead of
  // `max` (the greatest raw value across every category) — so e.g. a small town's bar isn't
  // visually dwarfed by a big city's raw count just because they're being measured against
  // completely different goals. A category with no target is unaffected, still uses `max`.
  const maxFor = (rawLabel) => targetFor(rawLabel) || max;

  // Paginates a "vertical list" of rows (bar-horizontal, table, list, progress, ...) in
  // batches of `pageSize` once "Show all categories" is checked — with it off, behaves
  // exactly like the old `.slice(0, pageSize)` (unchanged default: top N, no pager shown).
  // chart.disablePagination skips the paging too, once show-all is on: every category
  // renders on one continuous list, no Next/Previous clicks needed at all.
  // For pie/donut/half-donut/horizontal-stack, the graphic itself still draws every slice
  // (already readable at a glance); this only paginates the scrolling label list under it.
  const pageOf = (list, pageSize) => {
    if (!chart.showAllCategories) return { items: list.slice(0, pageSize), totalPages: 1, currentPage: 1 };
    if (chart.disablePagination) return { items: list, totalPages: 1, currentPage: 1 };
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

  // Same isAgg/aggType derivation buildChartTallyData uses internally — recomputed here
  // since that function only returns the finished tally, not its intermediate flags, and
  // this secondary-field breakdown needs the same optional-aggregation setting applied
  // to sub-groups that the primary grouping above already got.
  const isAgg = !isRowMode && !!chart.aggregationEnabled && !!chart.aggregationField;
  const aggType = chart.aggregationType || 'sum';
  const getSubGroups = (primaryLabel) => {
    if (!chart.secondaryField) return null;
    const scoped = filteredSites.filter(s => (s[chart.field] || 'N/A') === primaryLabel);
    const subData = tallyBy(scoped, (s) => s[chart.secondaryField] || 'N/A', isAgg, chart.aggregationField, aggType);
    // Default is count-descending; chart.secondaryCategoryOrder (set by dragging rows in
    // "Customize sub-labels") overrides that — same rule buildChartTallyData's own
    // categoryOrder uses for the primary field: applies uniformly across every primary
    // category's own sub-breakdown, and a sub-value not yet in a saved order (new data)
    // ranks last, sorted among themselves by count.
    if (chart.secondaryCategoryOrder && chart.secondaryCategoryOrder.length) {
      const orderIndex = new Map(chart.secondaryCategoryOrder.map((v, i) => [v, i]));
      return Object.entries(subData).sort((a, b) => {
        const ai = orderIndex.has(a[0]) ? orderIndex.get(a[0]) : Infinity;
        const bi = orderIndex.has(b[0]) ? orderIndex.get(b[0]) : Infinity;
        return ai !== bi ? ai - bi : b[1] - a[1];
      });
    }
    return Object.entries(subData).sort((a, b) => b[1] - a[1]);
  };

  // Generic third-level tally — scoped to rows matching every {field: value} constraint
  // given, then tallied by `groupField`. Backs both of the tertiary-field helpers below.
  // `orderList` (chart.tertiaryCategoryOrder, when the result is grouped BY the tertiary
  // field) applies the same "saved order first, then count-descending for anything not in
  // it" rule getSubGroups already uses for secondary — omitted (undefined) wherever the
  // result is grouped by a DIFFERENT field instead (getSubGroupsFor, grouped by secondary),
  // which is reordered separately at its own call site to match the shared legend instead.
  const tallyFilteredBy = (constraints, groupField, orderList) => {
    if (!groupField) return null;
    // String(...) on both sides — `v` is always a string (an Object.entries key, from
    // tallyBy's own grouping below), but `s[f]` can be a number for some rows and a string
    // for others in real-world data (a column that's usually numeric but has a stray
    // non-numeric entry, say). tallyBy's grouping doesn't notice that mismatch since object
    // property access auto-stringifies keys either way, but a raw === here does not — that
    // silently dropped every row whose value didn't happen to already be a string, which is
    // why a district's own breakdown could come out all one color while its row's own total
    // (tallied via getTertiaryRows, unaffected by this) still included the missing rows.
    const scoped = filteredSites.filter(s => Object.entries(constraints).every(([f, v]) => String(s[f] || 'N/A') === v));
    const data = tallyBy(scoped, (s) => s[groupField] || 'N/A', isAgg, chart.aggregationField, aggType);
    if (orderList && orderList.length) {
      const orderIndex = new Map(orderList.map((v, i) => [v, i]));
      return Object.entries(data).sort((a, b) => {
        const ai = orderIndex.has(a[0]) ? orderIndex.get(a[0]) : Infinity;
        const bi = orderIndex.has(b[0]) ? orderIndex.get(b[0]) : Infinity;
        return ai !== bi ? ai - bi : b[1] - a[1];
      });
    }
    return Object.entries(data).sort((a, b) => b[1] - a[1]);
  };
  // For 'table': one more indented level under each secondary sub-row (Province >
  // Wi-Fi status > District, say).
  const getSubSubGroups = (primaryLabel, secondaryLabel) =>
    tallyFilteredBy({ [chart.field]: primaryLabel, [chart.secondaryField]: secondaryLabel }, chart.tertiaryField, chart.tertiaryCategoryOrder);
  // For 'bar-100-stacked': the tertiary field becomes an extra ROW level nested under each
  // primary row instead (Province > District), each with its OWN secondary-field stacked
  // bar — getTertiaryRows lists the district rows themselves, getSubGroupsFor gets one
  // district's own Wi-Fi-status segment counts.
  const getTertiaryRows = (primaryLabel) => tallyFilteredBy({ [chart.field]: primaryLabel }, chart.tertiaryField, chart.tertiaryCategoryOrder);
  const getSubGroupsFor = (primaryLabel, tertiaryLabel) =>
    tallyFilteredBy({ [chart.field]: primaryLabel, [chart.tertiaryField]: tertiaryLabel }, chart.secondaryField) || [];

  const handleClick = (label) => {
    setSelectedFilter(selectedFilter === label ? null : label);
  };

  // Percent-of-total helper shared by every tooltip
  // A category with a target shows progress toward THAT target (count/target) instead of
  // its share of the grand total across every category — otherwise "25/26 (40.3%)" would
  // show a percentage that doesn't correspond to 25 of 26 at all.
  const pctOf = (rawLabel, count) => {
    const target = targetFor(rawLabel);
    const denom = target !== null ? target : total;
    return denom > 0 ? ((count / denom) * 100).toFixed(1) : '0.0';
  };
  // The value shown INSIDE a target-aware bar — "50 (50%)" (count and its progress toward
  // the target) when a target is set, or just the plain count otherwise. The percentage
  // renders smaller/lighter than the count itself so it reads as secondary detail rather
  // than competing with it — especially important on a short/narrow bar. The "/target"
  // itself renders separately, just outside the bar — see targetLabel below.
  const valueWithPct = (rawLabel, count) => {
    const target = targetFor(rawLabel);
    if (target === null) return fmtNum(count);
    return (
      <>
        {fmtNum(count)} <span className="text-[9px] font-normal opacity-80">({pctOf(rawLabel, count)}%)</span>
      </>
    );
  };

  // SVG points (line/area/radar) can't wrap an HTML Tooltip div around a
  // <circle>, so hover state drives a positioned overlay instead. x/y are
  // 0-100 (percent of the chart's own box), placed in a `relative` parent.
  const HoverTooltip = () => hoveredItem && (
    <div className="absolute px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg pointer-events-none whitespace-nowrap z-50 -translate-x-1/2 -translate-y-[130%]"
      style={{ left: `${hoveredItem.x}%`, top: `${hoveredItem.y}%` }}>
      <p className="font-bold">{hoveredItem.label}</p>
      {/* percent is omitted (not just 0) for multi-row mode's per-series dots — "% of
          total" has no meaningful shared denominator across independent rows/lines, unlike
          every single-series chart type where it's this point's share of one real total. */}
      <p>{displayValue(hoveredItem.rawLabel, hoveredItem.count)}{hoveredItem.percent != null && ` (${hoveredItem.percent}%)`}</p>
    </div>
  );

  // Tooltip component. `style`/`className` land on the wrapper div itself —
  // pass grid sizing (gridColumn/gridRow span) here, not on `children`, since
  // this wrapper is what actually participates in the parent grid/flex layout.
  const Tooltip = ({ label, rawLabel, count, percent, children, style, className = '' }) => (
    <div className={`relative group/tip ${className}`} style={style}>
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <p className="font-bold">{label}</p>
        <p>{displayValue(rawLabel, count)}{percent !== null && percent !== undefined ? ` (${percent}%)` : ''}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  );

  if (!sorted.length && !chart.multiRowMode) {
    return <div className="py-10 text-center text-sm text-gray-400">No data available for this field</div>;
  }

  // chart.multiRowMode (line/area only) — one line per matching row instead of one line
  // grouping `field`'s values. See buildMultiRowSeries's own docstring for the shape this
  // computes. Dots are plain HTML divs, not SVG <circle>s — same reason the single-series
  // line/area cases below use them (see their own comments): the SVG's non-uniform stretch
  // (preserveAspectRatio="none") would otherwise squash circles into ellipses.
  const renderMultiRowLine = (isArea) => {
    const { series, columns, max: seriesMax, matchedCount } = buildMultiRowSeries(chart, sites);
    if (!columns.length) {
      return <div className="py-10 text-center text-sm text-gray-400">Pick at least one column to compare.</div>;
    }
    if (!series.length) {
      return <div className="py-10 text-center text-sm text-gray-400">No rows match the Filter rows conditions above.</div>;
    }
    const divisor = Math.max(columns.length - 1, 1);
    const sideInset = 70;
    const canvasWidth = columns.length * 60 + sideInset * 2;
    const pointAt = (v, i) => ({ x: (i / divisor) * 100, y: 100 - (v / seriesMax) * 90 });
    return (
      <div>
        <div className="overflow-x-auto chart-canvas-scroll">
          <div style={{ width: `${canvasWidth}px`, minWidth: '100%' }}>
            <div className="h-14" />
            <div className="flex">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="h-48 relative flex-1">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                  ))}
                  {isArea && (
                    <defs>
                      {series.map((s, si) => (
                        <linearGradient key={s.rawLabel} id={`multiAreaGrad-${chart.id}-${si}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colorFor(s.rawLabel, si)} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={colorFor(s.rawLabel, si)} stopOpacity="0.03" />
                        </linearGradient>
                      ))}
                    </defs>
                  )}
                  {isArea && series.map((s, si) => (
                    <path key={`area-${s.rawLabel}`}
                      d={`M${s.points.map((v, i) => { const p = pointAt(v, i); return `${p.x},${p.y}`; }).join(' L')} L100,100 L0,100 Z`}
                      fill={`url(#multiAreaGrad-${chart.id}-${si})`} />
                  ))}
                  {series.map((s, si) => (
                    <polyline key={s.rawLabel}
                      points={s.points.map((v, i) => { const p = pointAt(v, i); return `${p.x},${p.y}`; }).join(' ')}
                      fill="none" stroke={colorFor(s.rawLabel, si)} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
                {series.map((s, si) => s.points.map((v, i) => {
                  const { x, y } = pointAt(v, i);
                  return (
                    <div key={`${s.rawLabel}-${i}`} className="absolute -translate-x-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                      <div
                        className="w-2.5 h-2.5 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                        style={{ backgroundColor: colorFor(s.rawLabel, si) }}
                        onMouseEnter={() => setHoveredItem({
                          // No "% of total" here — unlike every single-series chart type,
                          // there's no one shared total across independent rows/lines for
                          // a percentage to meaningfully be a share of (see HoverTooltip).
                          label: `${displayLabel(s.rawLabel)} · ${displayLabel(columns[i])}`,
                          rawLabel: s.rawLabel, count: v, percent: null, x, y,
                        })}
                        onMouseLeave={() => setHoveredItem(null)} />
                    </div>
                  );
                }))}
                <HoverTooltip />
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
            <div className="flex mt-2">
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
              <div className="flex-1 flex justify-between px-2">
                {columns.map((col) => <span key={col} className="text-[9px] text-gray-500 whitespace-nowrap">{displayLabel(col)}</span>)}
              </div>
              <div style={{ width: `${sideInset}px` }} className="shrink-0" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {series.map((s, si) => (
            <div key={s.rawLabel} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => handleClick(s.rawLabel)}>
              <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(s.rawLabel, si) }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{displayLabel(s.rawLabel)}</span>
            </div>
          ))}
        </div>
        {matchedCount > series.length && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
            Showing {series.length} of {matchedCount} matching rows — narrow Filter rows to plot different ones.
          </p>
        )}
      </div>
    );
  };

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
              const pct = pctOf(label, count);
              return (
                <div key={label}>
                  <Tooltip label={displayLabel(label)} rawLabel={label} count={count} percent={pct}>
                    <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleClick(label)}>
                      <span className="w-40 shrink-0 text-sm text-gray-700 dark:text-gray-300 chart-label-wrap">{displayLabel(label)}</span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden min-w-0">
                          <div className="h-full rounded-lg flex items-center px-3"
                            style={{ width: `${(count / maxFor(label)) * 100}%`, backgroundColor: colorFor(label, i) }}>
                            <span className="text-xs font-bold text-white">{valueWithPct(label, count)}</span>
                          </div>
                        </div>
                        {targetLabel(label) && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{targetLabel(label)}</span>}
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
    case 'bar-vertical': {
      // Horizontal layout (more categories = more columns, not more rows) — scrolls
      // sideways instead of squishing bars/labels when "Show all categories" adds more
      // than fit. `flex-1 min-w-[56px]` grows bars to fill the space when there's room but
      // won't shrink past 56px, which is what forces the scroll instead of a squeeze.
      // Bar height is already count/max — the tallest bar always belongs to whichever
      // column has the highest value, no matter its left-to-right position. Row mode
      // (comparing a fixed, small set of columns rather than every category) also gets a
      // per-bar "+X%" readout, each column vs the one immediately before it (year-over-year,
      // not just first-vs-last) — the first bar has nothing before it to compare against, so
      // it shows no badge.
      const showIncrease = isRowMode && sorted.length >= 2 && chart.showRowIncrease !== false;
      return (
        <div className="overflow-x-auto chart-canvas-scroll">
          {/* Reserved headroom above the bars — the hover Tooltip renders above its bar
              (bottom-full), and .chart-canvas-scroll is overflow-y: hidden (needed to kill
              an unwanted vertical scrollbar, see that class's own comment), so without this
              the tooltip for any bar gets clipped instead of showing. Same fix Line/Area
              already needed for its own hover tooltip. Taller than the plain value+bar case
              (h-14) needs to be, since the per-bar % badge above the value pushes the
              Tooltip wrapper's own top edge — and the tooltip itself, positioned bottom-full
              off THAT edge — higher up by the badge's own height too. */}
          <div className={showIncrease ? 'h-20' : 'h-14'} />
          <div className="flex items-end gap-2 h-48">
            {sorted.slice(0, cap(8)).map(([label, count], i) => {
              const pct = pctOf(label, count);
              const prevCount = i > 0 ? sorted[i - 1][1] : null;
              const changePct = showIncrease && prevCount ? ((count - prevCount) / prevCount) * 100 : null;
              const changeColor = changePct === null ? null : (changePct >= 0 ? (chart.rowIncreaseColor || '#059669') : (chart.rowDecreaseColor || '#dc2626'));
              return (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pct} className="flex-1 min-w-[56px]">
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleClick(label)}>
                    {changePct !== null && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold mb-0.5" style={{ color: changeColor }}>
                        <TrendingUp size={10} className={changePct < 0 ? 'rotate-180' : ''} />
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    )}
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{displayValue(label, count)}</span>
                    {/* A CSS "height: X%" bar needs every ancestor up to the h-48 container to
                        have a DEFINITE height for that percentage to resolve against — but
                        items-end (needed so short and tall bars share a bottom edge) makes each
                        column's own height content-based (auto) instead, so the percentage was
                        silently resolving to 0 and every bar was just sitting at minHeight. A
                        plain pixel height computed here isn't affected by that at all. */}
                    <div className="w-full rounded-t-lg transition-all"
                      style={{ height: `${Math.max(20, (count / max) * 150)}px`, backgroundColor: selectedFilter === label ? '#0038A8' : colorFor(label, i) }} />
                    <span className="text-[10px] text-gray-500 mt-1 chart-label-wrap w-full text-center">{displayLabel(label)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );
    }
    case 'bar-stacked': {
      const { items, totalPages, currentPage } = pageOf(sorted, 6);
      return (
        <div>
          <div className="space-y-3">
            {items.map(([label, count], i) => {
              const subGroups = getSubGroups(label) || [];
              return (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                  <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-32 shrink-0 text-sm text-gray-700 dark:text-gray-300 chart-label-wrap">{displayLabel(label)}</span>
                      <span className="text-xs font-bold">{displayValue(label, count)}</span>
                    </div>
                    <div className="flex h-6 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {subGroups.slice(0, 5).map(([subLabel, subCount], si) => (
                        <div key={subLabel} className="h-full flex items-center justify-center"
                          style={{ width: `${(subCount / (count || 1)) * 100}%`, backgroundColor: chart.secondaryCategoryColors?.[subLabel] || COLORS[si % COLORS.length] }}
                          title={`${displaySecondaryLabel(subLabel)}: ${fmtNum(subCount)}`}>
                          {subCount > 5 && <span className="text-[9px] font-bold text-white">{fmtNum(subCount)}</span>}
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
    case 'bar-100-stacked': {
      // Row mode has no secondary FIELD to stack by — there's only ever one row, so a
      // "sub-group of this category" from a field has no meaning. But when Filter rows
      // uses "is one of" with multiple values (e.g. Summary is one of [Live count, Not
      // live count]), the admin clearly means each of THOSE rows to be one stack segment
      // per compared column — Bukidnon's bar becomes [7 live | 9 not live], not just
      // whichever one row got picked. Falls back to a plain single-color bar (no segments)
      // when there's no such multi-condition, or fewer than 2 of its values actually matched
      // a row.
      if (isRowMode) {
        const multiCond = (chart.conditions || []).find(c => c.field && c.type === 'multi' && (c.values || []).length > 1);
        const segmentSources = multiCond
          ? multiCond.values
              .map(v => ({ value: v, row: filteredSites.find(r => String(r[multiCond.field] ?? '').trim().toLowerCase() === String(v).trim().toLowerCase()) }))
              .filter(sr => sr.row)
          : [];
        if (segmentSources.length > 1) {
          // Segment color/label reuse the SAME per-value customization ("Customize
          // sub-labels") every other chart's secondary field already uses — keyed by each
          // selected value's own raw text instead of a field's distinct values, since
          // that's the actual stacking dimension here.
          const segmentColor = (v) => chart.secondaryCategoryColors?.[v] || COLORS[multiCond.values.indexOf(v) % COLORS.length];
          const { items, totalPages, currentPage } = pageOf(sorted, 10);
          return (
            <div>
              <div className="flex flex-wrap gap-3 mb-3">
                {segmentSources.map(({ value }) => (
                  <div key={value} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: segmentColor(value) }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{displaySecondaryLabel(value)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {items.map(([label]) => {
                  const segs = segmentSources.map(({ value, row }) => [value, toNum(row[label]) || 0]);
                  const colTotal = segs.reduce((s, [, v]) => s + v, 0);
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-xs text-gray-700 dark:text-gray-300 chart-label-wrap cursor-pointer hover:opacity-80"
                        onClick={() => handleClick(label)} title={displayLabel(label)}>
                        {displayLabel(label)}
                      </span>
                      <div className="relative group/tip flex-1 min-w-0">
                        <div className="flex h-6 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                          {segs.map(([value, segCount]) => {
                            const pct = colTotal > 0 ? (segCount / colTotal) * 100 : 0;
                            return pct > 0 ? (
                              <div key={value} className="h-full flex items-center justify-center"
                                style={{ width: `${pct}%`, backgroundColor: segmentColor(value) }}>
                                {pct > 8 && <span className="text-[9px] font-bold text-white">{fmtNum(segCount)}</span>}
                              </div>
                            ) : null;
                          })}
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          <p className="font-bold mb-1">{displayLabel(label)}</p>
                          {segs.map(([value, segCount]) => (
                            <p key={value} className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: segmentColor(value) }} />
                              {displaySecondaryLabel(value)}: {fmtNum(segCount)} ({colTotal > 0 ? ((segCount / colTotal) * 100).toFixed(1) : '0.0'}%)
                            </p>
                          ))}
                          <p className="mt-1 pt-1 border-t border-white/20">Total: {fmtNum(colTotal)}</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pager totalPages={totalPages} currentPage={currentPage} />
            </div>
          );
        }
        const { items, totalPages, currentPage } = pageOf(sorted, 10);
        return (
          <div>
            <div className="space-y-3">
              {items.map(([label, count], i) => (
                <div key={label}>
                  <Tooltip label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                    <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleClick(label)}>
                      <span className="w-28 shrink-0 text-xs text-gray-700 dark:text-gray-300 chart-label-wrap">{displayLabel(label)}</span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden min-w-0">
                          <div className="h-full flex items-center px-2"
                            style={{ width: `${(count / maxFor(label)) * 100}%`, backgroundColor: colorFor(label, i) }}>
                            <span className="text-xs font-bold text-white">{fmtNum(count)}</span>
                          </div>
                        </div>
                        {targetLabel(label) && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{targetLabel(label)}</span>}
                      </div>
                    </div>
                  </Tooltip>
                </div>
              ))}
            </div>
            <Pager totalPages={totalPages} currentPage={currentPage} />
          </div>
        );
      }
      // Every row's segments are colored/ordered off ONE shared legend built from every
      // row this chart counts (filteredSites), not just each row's own subGroups — a
      // segment's color (and POSITION) has to mean the same thing no matter which row it's
      // in, or the same value visually swaps sides row to row (e.g. "Live" leading in one
      // row, trailing in the next) purely because each row's own value happened to be
      // bigger or smaller there — confusing for a chart whose whole point is a shared axis.
      // Falls back to combined count across every row (not raw first-seen order, which is
      // arbitrary) when no explicit secondaryCategoryOrder is set, so the default is still
      // a deliberate, stable ranking rather than incidental row-iteration order.
      const legendValues = (() => {
        const totals = {};
        filteredSites.forEach(s => {
          const v = s[chart.secondaryField] || 'N/A';
          totals[v] = (totals[v] || 0) + 1;
        });
        const all = Object.keys(totals);
        if (chart.secondaryCategoryOrder && chart.secondaryCategoryOrder.length) {
          const orderIndex = new Map(chart.secondaryCategoryOrder.map((v, idx) => [v, idx]));
          all.sort((a, b) => {
            const ai = orderIndex.has(a) ? orderIndex.get(a) : Infinity;
            const bi = orderIndex.has(b) ? orderIndex.get(b) : Infinity;
            return ai !== bi ? ai - bi : totals[b] - totals[a];
          });
        } else {
          all.sort((a, b) => totals[b] - totals[a]);
        }
        return all;
      })();
      const segmentColor = (v) => chart.secondaryCategoryColors?.[v] || COLORS[legendValues.indexOf(v) % COLORS.length];
      // A further override, one primary row deep — chart.categorySecondaryColors lets a
      // SPECIFIC row (e.g. just Lanao del Norte) recolor its own bar's segments without
      // touching the shared legend/every other row's bars, which stay on segmentColor as
      // always. Falls through to segmentColor wherever this row has no override set —
      // every chart saved before this existed renders identically to before.
      const segmentColorForRow = (primaryLabel, v) => chart.categorySecondaryColors?.[primaryLabel]?.[v] || segmentColor(v);
      const { items, totalPages, currentPage } = pageOf(sorted, 8);
      return (
        <div>
          <div className="flex flex-wrap gap-3 mb-3">
            {legendValues.map((v) => (
              <div key={v} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: segmentColor(v) }} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{displaySecondaryLabel(v)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {items.map(([label, count], i) => {
              // Reordered (not just re-sorted) to match legendValues exactly, dropping any
              // value this particular row doesn't have — getSubGroups' own order is only a
              // per-row count-descending default, which is what caused the inconsistency.
              const rawSubGroups = getSubGroups(label) || [];
              const subGroups = legendValues
                .map((v) => [v, rawSubGroups.find(([sl]) => sl === v)?.[1] || 0])
                .filter(([, c]) => c > 0);
              // Optional third level — each district (say) gets its own indented sub-row
              // underneath the province, with its own mini Wi-Fi-status stacked bar, reusing
              // the SAME shared legendValues/segmentColor as every other row so a segment
              // means the same color/position everywhere, not just within one province.
              const tertiaryRows = chart.tertiaryField ? (getTertiaryRows(label) || []) : [];
              return (
                <div key={label}>
                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 text-xs text-gray-700 dark:text-gray-300 chart-label-wrap cursor-pointer hover:opacity-80"
                    onClick={() => handleClick(label)} title={displayLabel(label)}>
                    {displayLabel(label)}
                  </span>
                  <div className="relative group/tip flex-1 min-w-0">
                    <div className="flex h-6 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer"
                      onClick={() => handleClick(label)}>
                      {subGroups.map(([subLabel, subCount]) => {
                        const pct = (subCount / (count || 1)) * 100;
                        return (
                          <div key={subLabel} className="h-full flex items-center justify-center"
                            style={{ width: `${pct}%`, backgroundColor: segmentColorForRow(label, subLabel) }}>
                            {pct > 8 && <span className="text-[9px] font-bold text-white">{fmtNum(subCount)}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {/* Rich hover tooltip — every segment's own count AND share of this row,
                        plus the row's total. The shared Tooltip component only ever takes a
                        single label/count/percent, not a per-segment breakdown, so this is
                        its own popup rather than a reuse — same positioning/styling
                        conventions (bottom-full, opacity fade, arrow) as Tooltip itself. */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      <p className="font-bold mb-1">{displayLabel(label)}</p>
                      {subGroups.map(([subLabel, subCount]) => (
                        <p key={subLabel} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: segmentColorForRow(label, subLabel) }} />
                          {displaySecondaryLabel(subLabel)}: {fmtNum(subCount)} ({((subCount / (count || 1)) * 100).toFixed(2)}%)
                        </p>
                      ))}
                      <p className="mt-1 pt-1 border-t border-white/20">Total: {displayValue(label, count)}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                    </div>
                  </div>
                </div>
                {tertiaryRows.length > 0 && (
                  <div className="mt-1.5 ml-4 space-y-1.5 border-l-2 border-gray-100 dark:border-gray-800 pl-3">
                    {tertiaryRows.map(([tLabel, tCount]) => {
                      const rawTertiarySub = getSubGroupsFor(label, tLabel);
                      const tertiarySubGroups = legendValues
                        .map((v) => [v, rawTertiarySub.find(([sl]) => sl === v)?.[1] || 0])
                        .filter(([, c]) => c > 0);
                      return (
                        <div key={tLabel} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-[11px] text-gray-500 dark:text-gray-400 chart-label-wrap" title={displayTertiaryLabel(tLabel)}>
                            {displayTertiaryLabel(tLabel)}
                          </span>
                          <div className="relative group/tip flex-1 min-w-0">
                            <div className="flex h-4 rounded overflow-hidden bg-gray-50 dark:bg-gray-800/60">
                              {tertiarySubGroups.map(([subLabel, subCount]) => {
                                const pct = (subCount / (tCount || 1)) * 100;
                                return (
                                  <div key={subLabel} className="h-full flex items-center justify-center"
                                    style={{ width: `${pct}%`, backgroundColor: segmentColor(subLabel) }}>
                                    {pct > 12 && <span className="text-[8px] font-bold text-white leading-none">{fmtNum(subCount)}</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Same rich hover popup pattern as the main row's own tooltip
                                above — every segment's count/share plus the row's total. */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                              <p className="font-bold mb-1">{displayTertiaryLabel(tLabel)}</p>
                              {tertiarySubGroups.map(([subLabel, subCount]) => (
                                <p key={subLabel} className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: segmentColor(subLabel) }} />
                                  {displaySecondaryLabel(subLabel)}: {fmtNum(subCount)} ({((subCount / (tCount || 1)) * 100).toFixed(2)}%)
                                </p>
                              ))}
                              <p className="mt-1 pt-1 border-t border-white/20">Total: {fmtNum(tCount)}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-28 shrink-0" />
            <div className="flex-1 min-w-0 flex justify-between text-[10px] text-gray-400">
              {[0, 20, 40, 60, 80, 100].map((p) => <span key={p}>{p}%</span>)}
            </div>
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
          {/* Reserved headroom above the bars — see 'bar-vertical' above for why this is
              needed (same overflow-y: hidden + hover Tooltip combination). */}
          <div className="h-14" />
          <div className="flex items-end gap-4 h-48">
            {sorted.slice(0, cap(6)).map(([label, count], i) => {
              const subGroups = getSubGroups(label) || [];
              return (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)} className="flex-1 min-w-[64px]">
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-80"
                    onClick={() => handleClick(label)}>
                    <div className="w-full flex items-end gap-1 h-40">
                      <div className="flex-1 rounded-t" style={{ height: `${(count / max) * 100}%`, backgroundColor: COLORS[0], minHeight: '10px' }} />
                      {subGroups.slice(0, 1).map(([_, subCount]) => (
                        <div key={_} className="flex-1 rounded-t" style={{ height: `${(subCount / max) * 100}%`, backgroundColor: COLORS[1], minHeight: '10px' }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 chart-label-wrap w-full text-center">{displayLabel(label)}</span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );
    case 'line': {
      if (chart.multiRowMode) return renderMultiRowLine(false);
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
                    fill="none" stroke={colorFor(null, 0)} strokeWidth="2" vectorEffect="non-scaling-stroke"
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
                        {displayValue(label, count)}
                      </span>
                      <div
                        className="w-3 h-3 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                        style={{ backgroundColor: colorFor(null, 0) }}
                        onClick={() => handleClick(label)}
                        onMouseEnter={() => setHoveredItem({ label: displayLabel(label), rawLabel: label, count, percent: pctOf(label, count), x, y })}
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
      if (chart.multiRowMode) return renderMultiRowLine(true);
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
                      <stop offset="0%" stopColor={colorFor(null, 0)} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={colorFor(null, 0)} stopOpacity="0.05" />
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
                    fill="none" stroke={colorFor(null, 0)} strokeWidth="2" vectorEffect="non-scaling-stroke"
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
                        {displayValue(label, count)}
                      </span>
                      <div
                        className="w-2.5 h-2.5 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                        style={{ backgroundColor: colorFor(null, 0) }}
                        onClick={() => handleClick(label)}
                        onMouseEnter={() => setHoveredItem({ label: displayLabel(label), rawLabel: label, count, percent: pctOf(label, count), x, y })}
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
      // Was a single CSS conic-gradient div — one flat background, so there was no
      // per-slice element for the browser to fire hover events on at all (only the legend
      // rows below had their own Tooltip). Real SVG wedges give each slice its own
      // hoverable/clickable element, same as every other chart type here.
      let acc = 0;
      const arcs = slices.map(([label, count], i) => {
        const pct = (count / total) * 100;
        const startPct = acc;
        acc += pct;
        return { label, count, i, startPct, endPct: acc };
      });
      // A single-slice ring (e.g. row-mode "compare one column") would otherwise always
      // draw a full circle — its share of the total is trivially 100% when there's nothing
      // else to share the ring with, regardless of any target set on that one category.
      // When it has one, the ring instead shows real progress toward it (colored arc + a
      // gray "remaining" arc below), matching every other target-aware bar in this file.
      const singleTarget = slices.length === 1 ? targetFor(slices[0][0]) : null;
      if (singleTarget !== null) {
        arcs[0] = { ...arcs[0], startPct: 0, endPct: Math.min((arcs[0].count / singleTarget) * 100, 100) };
      }
      // 0% sits at 12 o'clock (matching the old conic-gradient's default), sweeping
      // clockwise — angle math shifts by -90° so pct=0 lands at the top, not 3 o'clock.
      const angleToPoint = (pct, r) => {
        const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
        return [50 + r * Math.cos(angle), 50 + r * Math.sin(angle)];
      };
      return (
        <div className="flex items-center gap-6">
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {arcs.map(({ label, count, i, startPct, endPct }) => {
                const [x1, y1] = angleToPoint(startPct, 48);
                const [x2, y2] = angleToPoint(endPct, 48);
                const largeArc = endPct - startPct > 50 ? 1 : 0;
                // A single category holding 100% of the total degenerates a normal wedge
                // path (its start/end points coincide, so the arc command draws nothing) —
                // draw it as two half-circles instead.
                const path = endPct - startPct >= 99.999
                  ? 'M 50,2 A 48,48 0 1,1 49.99,2.001 Z'
                  : `M 50,50 L ${x1},${y1} A 48,48 0 ${largeArc},1 ${x2},${y2} Z`;
                const [tipX, tipY] = angleToPoint((startPct + endPct) / 2, 30);
                return (
                  <path key={label} d={path} fill={colorFor(label, i)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={() => handleClick(label)}
                    onMouseEnter={() => setHoveredItem({ label: displayLabel(label), rawLabel: label, count, percent: pctOf(label, count), x: tipX, y: tipY })}
                    onMouseLeave={() => setHoveredItem(null)} />
                );
              })}
              {singleTarget !== null && arcs[0].endPct < 99.999 && (() => {
                const [x1, y1] = angleToPoint(arcs[0].endPct, 48);
                const [x2, y2] = angleToPoint(100, 48);
                const largeArc = 100 - arcs[0].endPct > 50 ? 1 : 0;
                const path = `M 50,50 L ${x1},${y1} A 48,48 0 ${largeArc},1 ${x2},${y2} Z`;
                return <path d={path} className="fill-gray-100 dark:fill-gray-700 pointer-events-none" />;
              })()}
            </svg>
            {chart.chartType === 'donut' && (() => {
                // Deliberately arcs[0] here, NOT the true count leader (contrast the "leads
                // with X%" footer below, which does want the real max) — this is meant to be
                // admin-chosen, not auto-computed: dragging a category to the top of
                // "Customize labels" reorders chart.categoryOrder, which is exactly what
                // determines arcs[0] (see buildChartTallyData), so that drag becomes the way
                // to pick which category's percentage gets featured in the center.
                const isPercentMode = chart.donutCenterMode === 'percentage';
                const leader = isPercentMode ? arcs[0] : null;
                const leaderLabel = leader?.label;
                const leaderCount = leader?.count;
                return (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl font-black">
                          {isPercentMode
                            ? `${((leaderCount / (singleTarget !== null ? singleTarget : total)) * 100).toFixed(1)}%`
                            : singleTarget !== null
                            ? <>{fmtNum(slices[0][1])}<span className="text-xs font-medium text-gray-400">/{fmtNum(singleTarget)}</span></>
                            : fmtNum(total)}
                        </p>
                        <p className="text-[8px] text-gray-500 truncate max-w-[70px]">{isPercentMode ? displayLabel(leaderLabel) : 'Total'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            <HoverTooltip />
          </div>
          <div className="flex-1 min-w-0">
            <div className="space-y-1.5">
              {legendItems.map(([[label, count], i]) => (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                  {/* Value sits BELOW the label instead of pinned to the right of it — a
                      long label sharing one row with a pinned count had almost no room
                      left in a narrow card, forcing mid-word wraps ("Rema-ining"). Stacked,
                      the label gets the whole row to itself. */}
                  <div className="flex items-start gap-2 cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                    <div className="w-2.5 h-2.5 shrink-0 rounded-full mt-1" style={{ backgroundColor: colorFor(label, i) }} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300">{displayLabel(label)}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{displayValue(label, count)}</p>
                    </div>
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
                fill={`${colorFor(null, 0)}30`} stroke={colorFor(null, 0)} strokeWidth="2"
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
                    onMouseEnter={() => setHoveredItem({ label: displayLabel(label), rawLabel: label, count, percent: pctOf(label, count), x: x / 2, y: y / 2 })}
                    onMouseLeave={() => setHoveredItem(null)}>
                    <circle cx={x} cy={y} r="8" fill="transparent" />
                    <circle cx={x} cy={y} r="4" fill={colorFor(null, 0)} stroke="white" strokeWidth="2" />
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
      // Optional secondary-field breakdown — same getSubGroups every other chart type's
      // sub-breakdown already uses, just rendered as extra indented rows under each main
      // row instead of stacked bar segments. null (no secondary field set) means every row
      // renders exactly as before this existed.
      const hasSecondary = !!chart.secondaryField;
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
                {items.flatMap(([label, count], i) => {
                  const subGroups = hasSecondary ? getSubGroups(label) : null;
                  const rows = [
                    <tr key={label} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => handleClick(label)}>
                      <td className="py-1.5 px-2 text-gray-400">{(currentPage - 1) * 8 + i + 1}</td>
                      <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300 font-medium">{displayLabel(label)}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{displayValue(label, count)}</td>
                      <td className="py-1.5 px-2 text-right text-gray-500">{pctOf(label, count)}%</td>
                    </tr>,
                  ];
                  (subGroups || []).forEach(([subLabel, subCount]) => {
                    rows.push(
                      <tr key={`${label}__${subLabel}`} className="border-t border-gray-50 dark:border-gray-800/50 bg-gray-50/60 dark:bg-gray-800/30">
                        <td className="py-1 px-2" />
                        <td className="py-1 px-2 pl-5 text-[11px] text-gray-500 dark:text-gray-400 chart-label-wrap">{displaySecondaryLabel(subLabel)}</td>
                        <td className="py-1 px-2 text-right text-[11px] text-gray-500">{fmtNum(subCount)}</td>
                        <td className="py-1 px-2 text-right text-[11px] text-gray-400">{((subCount / (count || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                    );
                    // Optional third level — one more indent under this secondary sub-row.
                    if (chart.tertiaryField) {
                      (getSubSubGroups(label, subLabel) || []).forEach(([subSubLabel, subSubCount]) => {
                        rows.push(
                          <tr key={`${label}__${subLabel}__${subSubLabel}`} className="border-t border-gray-50 dark:border-gray-800/50 bg-gray-50/30 dark:bg-gray-800/10">
                            <td className="py-1 px-2" />
                            <td className="py-1 px-2 pl-9 text-[10px] text-gray-400 dark:text-gray-500 chart-label-wrap">{displayTertiaryLabel(subSubLabel)}</td>
                            <td className="py-1 px-2 text-right text-[10px] text-gray-400">{fmtNum(subSubCount)}</td>
                            <td className="py-1 px-2 text-right text-[10px] text-gray-400">{((subSubCount / (subCount || 1)) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      });
                    }
                  });
                  return rows;
                })}
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
              <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                <div className="rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${colorFor(label, i)}10` }}
                  onClick={() => handleClick(label)}>
                  <p className="text-xl font-black" style={{ color: colorFor(label, i) }}>{displayValue(label, count)}</p>
                  <p className="text-[10px] text-gray-500 chart-label-wrap">{displayLabel(label)}</p>
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
              <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                <div className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded"
                  onClick={() => handleClick(label)}>
                  <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: colorFor(label, i) }}>
                    {(currentPage - 1) * 10 + i + 1}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 chart-label-wrap">{displayLabel(label)}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{displayValue(label, count)}</span>
                  <span className="text-xs text-gray-400 shrink-0">{pctOf(label, count)}%</span>
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
              <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 chart-label-wrap min-w-0">{displayLabel(label)}</span>
                    <span className="text-sm font-bold shrink-0">{displayValue(label, count)} <span className="text-xs text-gray-400">({pctOf(label, count)}%)</span></span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(count / max) * 100}%`, backgroundColor: colorFor(label, i) }} />
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
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pct.toFixed(1)}
                  style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` }}>
                  <div
                    className={`h-full w-full rounded-lg flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity ${isShort ? 'p-2' : 'p-3'}`}
                    style={{
                      backgroundColor: `${colorFor(label, i)}15`,
                      borderLeft: `4px solid ${colorFor(label, i)}`,
                    }}
                    onClick={() => handleClick(label)}
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 chart-label-wrap leading-tight">{displayLabel(label)}</span>
                    <div className="leading-tight">
                      <span className={isShort ? 'text-sm font-bold' : 'text-xl font-black'} style={{ color: colorFor(label, i) }}>{displayValue(label, count)}</span>
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
              // Collapsed by default (see expandedComparisonRows above) — only relevant
              // when chart.comparisonCollapsible is on; otherwise every row's breakdown
              // always shows, exactly as before this option existed.
              const isCollapsible = !!chart.comparisonCollapsible;
              const isExpanded = !isCollapsible || expandedComparisonRows.has(label);
              return (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count}>
                  <div className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg"
                    onClick={() => (isCollapsible ? toggleComparisonRow(label) : handleClick(label))}>
                    <div className="flex items-center gap-2 mb-2">
                      {isCollapsible && (
                        <span className="shrink-0 text-gray-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                      <span className="w-28 sm:w-36 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 chart-label-wrap">{displayLabel(label)}</span>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden min-w-0">
                          <div className="h-full rounded-lg flex items-center px-2.5"
                            style={{ width: `${(count / maxFor(label)) * 100}%`, backgroundColor: colorFor(label, i) }}>
                            <span className="text-xs font-bold text-white">{valueWithPct(label, count)}</span>
                          </div>
                        </div>
                        {targetLabel(label) && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{targetLabel(label)}</span>}
                      </div>
                    </div>
                    {/* The fallback single-bar case (no secondary_field breakdown) is
                        covered by the header's own bar above now — nothing else to show. */}
                    {isExpanded && subGroups.length > 0 && (
                      <div className="space-y-1">
                        {subGroups.map(([subLabel, subCount]) => (
                          <div key={subLabel} className="flex items-center gap-2">
                            {/* Mirrors the header row's own left side (optional chevron space +
                                label width) so this bar's left edge lines up with the parent
                                category's bar above it instead of starting further left. */}
                            {isCollapsible && <span className="shrink-0 w-[14px]" />}
                            <span className="w-28 sm:w-36 shrink-0 text-[11px] text-gray-500 chart-label-wrap">{displaySecondaryLabel(subLabel)}</span>
                            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                              <div className="h-full rounded flex items-center px-2"
                                style={{ width: `${(subCount / subMax) * 100}%`, backgroundColor: chart.secondaryCategoryColors?.[subLabel] || colorFor(label, i) }}>
                                <span className="text-[9px] font-bold text-white">{fmtNum(subCount)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
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
              const pct = pctOf(label, count);
              const width = Math.max(20, (count / maxFor(label)) * 100);
              return (
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pct} className="w-full flex items-center justify-center gap-2">
                  <div
                    className="h-10 rounded-lg flex items-center justify-between px-4 gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${width}%`, backgroundColor: `${colorFor(label, i)}20`, borderLeft: `4px solid ${colorFor(label, i)}` }}
                    onClick={() => handleClick(label)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 chart-label-wrap min-w-0">{displayLabel(label)}</span>
                    <span className="text-sm font-bold shrink-0" style={{ color: colorFor(label, i) }}>{valueWithPct(label, count)}</span>
                  </div>
                  {targetLabel(label) && <span className="text-xs font-medium text-gray-400 shrink-0">{targetLabel(label)}</span>}
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
      // Same single-slice-would-always-be-a-full-ring issue as donut above — see its own
      // comment. A conic-gradient can express a target-aware progress fill just as a
      // colored-then-gray stop pair, no SVG path math needed.
      const singleTarget = slices.length === 1 ? targetFor(slices[0][0]) : null;
      let halfGrad;
      if (singleTarget !== null) {
        const progressPct = Math.min((slices[0][1] / singleTarget) * 100, 100);
        halfGrad = `${colorFor(slices[0][0], 0)} 0% ${progressPct}%, #e5e7eb ${progressPct}% 100%`;
      } else {
        let halfAcc = 0;
        halfGrad = slices.map(([label, count], i) => {
          const pct = (count / total) * 100;
          const start = halfAcc;
          halfAcc += pct;
          return `${colorFor(label, i)} ${start}% ${halfAcc}%`;
        }).join(', ');
      }
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
                  <p className="text-xl font-black text-gray-900 dark:text-white">
                    {singleTarget !== null
                      ? <>{fmtNum(slices[0][1])}<span className="text-xs font-medium text-gray-400">/{fmtNum(singleTarget)}</span></>
                      : fmtNum(total)}
                  </p>
                  <p className="text-[8px] text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4 max-w-full">
            {legendItems.map(([[label, count], i]) => (
              <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pctOf(label, count)}>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 max-w-[140px]" onClick={() => handleClick(label)}>
                  <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 chart-label-wrap min-w-0">{displayLabel(label)}</span>
                </div>
              </Tooltip>
            ))}
          </div>
          <Pager totalPages={totalPages} currentPage={currentPage} />
        </div>
      );
    }
    case 'bubble': {
      // Packed bubbles: circles touch instead of sitting in rows, area tracks value, and
      // (default colors) shade runs light -> dark with size, so the biggest categories
      // read first. Packing is a spiral search from the centre — each circle (largest
      // first) takes the first spot along the spiral that doesn't overlap one already
      // placed — which is plenty fast for the few dozen categories this is meant for, so
      // no layout library is needed. Everything is computed in a unit space then fitted
      // with the SVG viewBox, so it scales with the card.
      const bubbles = sorted.slice(0, cap(30));
      const MIN_R = 12, MAX_R = 64, GAP = 2;
      const hexToRgbArr = (h) => [1, 3, 5].map((s) => parseInt(h.slice(s, s + 2), 16));
      const lerpColor = (a, b, t) => {
        const ca = hexToRgbArr(a), cb = hexToRgbArr(b);
        return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`;
      };
      const placed = [];
      bubbles.forEach(([label, count], i) => {
        const r = MIN_R + Math.sqrt(Math.max(count, 0) / max) * (MAX_R - MIN_R);
        let x = 0, y = 0;
        if (placed.length) {
          for (let step = 0; step < 4000; step++) {
            const angle = step * 0.35;
            const dist = 2 + step * 0.45;
            x = Math.cos(angle) * dist;
            y = Math.sin(angle) * dist;
            if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + GAP)) break;
          }
        }
        placed.push({ label, count, i, r, x, y });
      });
      const minX = Math.min(...placed.map((p) => p.x - p.r)), maxX = Math.max(...placed.map((p) => p.x + p.r));
      const minY = Math.min(...placed.map((p) => p.y - p.r)), maxY = Math.max(...placed.map((p) => p.y + p.r));
      // Always one gradient across the whole chart (pale -> dark by value), never a
      // different color per category. "Single color" mode keeps that gradient but built
      // from the admin's own color (a pale tint of it up to the full color); every other
      // mode uses the default teal -> navy.
      const toHex = (rgbArr) => `#${rgbArr.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      const gradEnd = chart.colorMode === 'accent' ? (chart.chartColor || '#1e4a7d') : '#1e4a7d';
      const gradStart = chart.colorMode === 'accent'
        ? toHex(hexToRgbArr(gradEnd).map((v) => v + (255 - v) * 0.65))
        : '#9fd0cf';
      const bubbleColor = (label, count) => lerpColor(gradStart, gradEnd, Math.sqrt(count / max));
      // Hover uses the shared HoverTooltip (positioned in % of this wrapper) driven by the
      // mouse's real position, not the circle's SVG coordinates — the SVG is letterboxed
      // inside its box (preserveAspectRatio meet), so SVG coords wouldn't map to wrapper
      // percentages. Every other bubble dims while one is hovered.
      const trackHover = (e, label, count) => {
        const rect = e.currentTarget.ownerSVGElement.parentElement.getBoundingClientRect();
        setHoveredItem({
          label: displayLabel(label), rawLabel: label, count, percent: null,
          x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      };
      return (
        <div>
          <div className="relative">
          <svg viewBox={`${minX - 6} ${minY - 6} ${maxX - minX + 12} ${maxY - minY + 12}`}
            className="w-full" style={{ height: 380 }} preserveAspectRatio="xMidYMid meet">
            {placed.map(({ label, count, i, r, x, y }) => {
              const fill = bubbleColor(label, count);
              // Text colour picked off the bubble's own shade — dark text on the pale ones.
              const rgb = fill.startsWith('rgb') ? fill.match(/\d+/g).map(Number) : hexToRgbArr(fill);
              const textColor = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.62 ? '#1f2937' : '#ffffff';
              const name = displayLabel(label);
              const maxChars = Math.max(3, Math.floor(r / 3.4));
              const shown = name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
              const labelled = r >= 26;
              return (
                <g key={label} className="cursor-pointer transition-opacity duration-150"
                  style={{ opacity: hoveredItem && hoveredItem.rawLabel !== label ? 0.4 : 1 }}
                  onClick={() => handleClick(label)}
                  onMouseEnter={(e) => trackHover(e, label, count)}
                  onMouseMove={(e) => trackHover(e, label, count)}
                  onMouseLeave={() => setHoveredItem(null)}>
                  <circle cx={x} cy={y} r={hoveredItem?.rawLabel === label ? r + 3 : r} fill={fill} className="transition-all duration-150"
                    stroke={selectedFilter === label || hoveredItem?.rawLabel === label ? '#0038A8' : 'none'}
                    strokeWidth={selectedFilter === label || hoveredItem?.rawLabel === label ? 3 : 0} />
                  {labelled && (
                    <>
                      <text x={x} y={y - 2} textAnchor="middle" fill={textColor} fontSize={Math.min(11, r / 3.2)} fontWeight="700">{shown}</text>
                      <text x={x} y={y + Math.min(12, r / 3)} textAnchor="middle" fill={textColor} fillOpacity="0.85" fontSize={Math.min(10, r / 3.6)}>{displayValue(label, count)}</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          <HoverTooltip />
          </div>
          {sorted.length > bubbles.length && (
            <p className="text-[11px] text-gray-400 text-center">Showing the largest {bubbles.length} of {fmtNum(sorted.length)} — tick "Show all categories" for more.</p>
          )}
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
                <Tooltip key={label} label={displayLabel(label)} rawLabel={label} count={count} percent={pct.toFixed(1)} style={{ width: `${pct}%` }}>
                  <div
                    className="h-full w-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: colorFor(label, i) }}
                    onClick={() => handleClick(label)}
                  >
                    {pct > 8 && <span className="text-[10px] font-bold text-white">{displayValue(label, count)}</span>}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {legendItems.map(([[label, count], i]) => (
              <div key={label} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 max-w-[160px]" onClick={() => handleClick(label)}>
                <div className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                <span className="text-xs text-gray-600 dark:text-gray-400 chart-label-wrap min-w-0">{displayLabel(label)} ({displayValue(label, count)})</span>
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

  const periodWord = { day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year' }[chart.dateGroupBy || 'month'] || 'period';
  const latest = sorted[sorted.length - 1];
  return (
    <div>
      {renderChart()}
      {/* This summary line assumes the single-series `sorted`/`total`/`latest` computed
          above (from buildChartTallyData) — chart.multiRowMode bypasses all of that inside
          renderChart() while isDateTrend stays true (it's derived from chart type alone),
          so `sorted` is empty and `latest` is undefined here; renderMultiRowLine already
          shows its own legend and "N of M rows" note, so this is simply skipped instead. */}
      {!chart.multiRowMode && (
        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-[10px] text-gray-400">
          {isDateTrend ? (
            <>
              <span className="shrink-0">{sorted.length.toLocaleString()} {periodWord}{sorted.length === 1 ? '' : 's'} · {total.toLocaleString()} total</span>
              <span className="chart-label-wrap min-w-0">
                {chart.cumulative
                  ? `Reached ${latest[1].toLocaleString()} by ${displayLabel(latest[0])}`
                  : `Latest: ${displayLabel(latest[0])} — ${latest[1].toLocaleString()}`}
              </span>
            </>
          ) : (
            <span className="shrink-0">{sorted.length.toLocaleString()} {sorted.length === 1 ? 'category' : 'categories'} · {total.toLocaleString()} total</span>
          )}
        </div>
      )}
    </div>
  );
}

// Wrapper for draggable chart
function DraggableChart({ id, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, children, title, subtitle, onEdit, onEditStyle, onExportData, onDelete, onToggleVisibility, showOnUser, isCustom, dataSource, onDataSourceChange, noPadding }) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [imgWidth, setImgWidth] = useState('');
  const [imgHeight, setImgHeight] = useState('');
  const [includeHeader, setIncludeHeader] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const contentRef = useRef(null);
  // Pre-fills width/height with the card's current on-screen size so there's a sane
  // starting point to nudge from instead of typing from scratch — safe now that the real
  // fix for the clipping bug lives in exportChartAsImage's onclone handling (that issue
  // turned out to be unrelated to whether a size was forced or left natural).
  const openExportMenu = () => {
    if (!showExportMenu && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      setImgWidth(String(Math.round(rect.width)));
      setImgHeight(String(Math.round(rect.height)));
    }
    setShowExportMenu((s) => !s);
  };
  const handleImageDownload = async () => {
    setCapturingImage(true);
    // The capture work (DOM cloning, image embedding, canvas rendering) is heavy enough
    // on the main thread that the browser never gets a chance to actually paint the
    // "Generating…" state before it starts —
    // the state update above gets scheduled, but not rendered, so the button just looks
    // frozen until the download finishes. Waiting two animation frames guarantees a real
    // paint has happened first (one frame isn't reliably enough — the browser can still
    // fold it into the same paint that's about to be blocked).
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      await exportChartAsImage(contentRef.current, title, { width: Number(imgWidth) || undefined, height: Number(imgHeight) || undefined, includeHeader });
    } finally {
      setCapturingImage(false);
      setShowExportMenu(false);
    }
  };
  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
      className="h-full"
    >
      {/* h-full down this whole chain (this div, and the card below) — CSS Grid's own
          default (align-items: stretch) already makes each grid CELL match its row's
          tallest sibling, but a plain block element doesn't automatically grow to fill
          extra space in a taller parent just because the parent got taller; without this,
          the invisible grid cell stretched fine while the visible card inside it stayed at
          its own shorter content height, so same-row cards with a longer wrapped title
          (2 lines vs 1) visibly mismatched even though their grid cells lined up. */}
      <div className={`h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all ${
        isDragging ? 'border-[#0038A8] scale-[0.98] opacity-60' : 'border-gray-200 dark:border-gray-700'
      }`}>
        {/* min-h below: keeps every card's header the same height within a row regardless
            of whether its title wraps to 1 or 2 lines or has a subtitle — line-clamp-2/-1
            on the text caps the worst case so a longer title can't stretch the header past
            it and break that uniformity against shorter-titled cards alongside it. */}
        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-200 dark:border-gray-700 min-h-[88px]">
          <div className="flex items-center gap-3 min-w-0">
            <span
              draggable
              onDragStart={(e) => { e.stopPropagation(); onDragStart(index); }}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing shrink-0"
              title="Drag to reorder"
            >
              <GripVertical size={16} className="text-gray-400" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 break-words">{title}</h3>
              {subtitle && <p className="text-[10px] text-gray-500 line-clamp-1 break-words">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            {onExportData && (
              <div className="relative">
                <button onClick={openExportMenu} className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Download">
                  <Download size={14} />
                </button>
                {/* z-[2000] below: Leaflet's own map panes sit at z-index 400-1000 (see
                    its .leaflet-pane/.leaflet-top/.leaflet-bottom rules), which was enough
                    to render map tiles right over this menu on Map widgets — comfortably
                    clearing that instead of the usual z-50 dropdowns elsewhere. */}
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[2000]" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setShowExportMenu(false); onExportData(); }}
                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <FileText size={14} /> Download data (CSV)
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 px-3 pt-2 pb-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Download image (PNG)</p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <input type="number" min="50" value={imgWidth} onChange={(e) => setImgWidth(e.target.value)}
                          placeholder="Width" className="w-full min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                        <span className="text-xs text-gray-400 shrink-0">×</span>
                        <input type="number" min="50" value={imgHeight} onChange={(e) => setImgHeight(e.target.value)}
                          placeholder="Height" className="w-full min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                      </div>
                      <label className="flex items-center gap-1.5 mb-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={includeHeader} onChange={(e) => setIncludeHeader(e.target.checked)} />
                        Include title
                      </label>
                      <button type="button" onClick={handleImageDownload} disabled={capturingImage}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-[#0038A8] text-white rounded hover:bg-[#001a52] disabled:opacity-60 transition-colors">
                        {capturingImage ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                        {capturingImage ? 'Generating…' : 'Download'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
        <div ref={contentRef} className={`flex-1 ${noPadding ? '' : 'p-4'}`}>
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

// Drops key `id` from a {tableId: value} map — used whenever removing an extra source
// table also needs to clean up whatever was mapped against it (a field-map entry, a
// table-condition list, ...). Shared by every "Additional source tables" remove handler
// below (Map/Breakdown/Summary) and by ExtraTablesEditor's own `omit` above (kept
// separate there rather than switched over, to avoid touching that already-hardened path).
function omitKey(map, id) {
  return Object.fromEntries(Object.entries(map || {}).filter(([k]) => Number(k) !== id));
}

// The add/remove half of "Additional source tables" for the 3 built-in widgets below —
// same idea as ExtraTablesEditor above (combine another table's rows into this widget's
// own via combineChartRecords), but simpler and NOT coupled to a single `chart` object,
// since Map/Breakdown/Summary each keep their own settings as separate useState hooks
// rather than one chart-shaped blob. `renderExtras(id, table)` supplies whatever
// each caller needs per extra table (a field-map row or two, a per-table Filter rows) —
// this component only owns the picker + the add/remove list shell around it.
function ExtraTableList({ primaryId, extraIds, genericTables, onAdd, onRemove, renderExtras }) {
  const addableTables = genericTables.filter((t) => t.id !== primaryId && !extraIds.includes(t.id));
  return (
    <div className="space-y-2">
      <Select value={null} onChange={(opt) => opt && onAdd(opt.value)}
        options={toOptions(addableTables.map((t) => t.id), (id) => genericTables.find((t2) => t2.id === id)?.name)}
        placeholder="+ Add another source table..." isDisabled={addableTables.length === 0}
        styles={selectStyles} />
      {extraIds.map((id) => {
        const table = genericTables.find((t) => t.id === id);
        return (
          <div key={id} className="p-2.5 border border-gray-100 dark:border-gray-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{table?.name || `Table ${id}`}</span>
              <button type="button" onClick={() => onRemove(id)} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
            {renderExtras?.(id, table)}
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
export function ConditionsEditor({ conditions, onChange, fieldOptions, valuesFor, extraTables }) {
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
// Loose text match for auto-detecting a filter's column — lowercased, punctuation/
// whitespace stripped, so "Site Status", "site_status", and "Site  Status" all collapse to
// the same key. Deliberately not fuzzy beyond that (no typo-tolerance): a wrong guess that
// LOOKS right is worse than no guess, since the admin might not notice it's wrong before
// saving.
function normalizeFilterLabel(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Finds a column on `table` whose own label or name matches `filterLabel` — the "same
// header text" case the admin described as the common one.
function findDirectFilterMatch(table, filterLabel) {
  const target = normalizeFilterLabel(filterLabel);
  if (!target) return '';
  const match = (table?.fields || []).find(
    (f) => normalizeFilterLabel(f.label) === target || normalizeFilterLabel(f.name) === target
  );
  return match ? match.name : '';
}

// Auto-detects which column on `table` should feed a filter, for FilterSettingsModal's
// "just review and save" flow: try a direct name match first (the common case — most
// tables literally share the same header text), and only if that fails, check whether one
// of this table's LINKED columns (see the relationship diagram) points at a table that
// itself has a matching column — using that merged field instead of leaving it blank. A
// table with neither a matching column of its own NOR a relevant relationship is left
// alone entirely (no guess), which is the point: two tables that happen to both have a
// same-named column but no real relationship can still collide by coincidence, but a
// table with NO match at all and NO relationship genuinely isn't the same kind of data —
// don't force a filter onto it.
function autoDetectFilterColumn(table, filterLabel, tablesById) {
  const direct = findDirectFilterMatch(table, filterLabel);
  if (direct) return direct;
  for (const f of table?.fields || []) {
    if (!f.reference_dataset || !f.reference_column) continue;
    const targetTable = tablesById[f.reference_dataset];
    if (!targetTable) continue;
    const targetMatch = findDirectFilterMatch(targetTable, filterLabel);
    if (targetMatch) return `${f.name}__${targetMatch}`;
  }
  return '';
}

function FilterSettingsModal({ slug, tables, initialFilters, layoutId = null, onClose, onSaved }) {
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
  // Which (table, label) cells currently hold an auto-detected guess rather than a value
  // the admin explicitly picked/confirmed — drives the small "Auto" hint below, cleared
  // the moment setTableColumn touches that cell for any reason (a different pick, or an
  // explicit clear-to-blank — both are the admin's own decision from then on).
  const [autoSuggested, setAutoSuggested] = useState({});
  // Every (table, label) pair already attempted, successful or not, so a cell the admin
  // deliberately cleared doesn't get silently re-filled the next time this effect runs.
  const attemptedRef = useRef(new Set());
  const tablesById = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t])), [tables]);

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
    setAutoSuggested((prev) => {
      const key = `${tableId}:${label}`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  // range-overlap's tag is {start, end} instead of a plain column name — `part` is
  // 'start' or 'end'. No auto-suggest for this type (see the effect below), so no
  // autoSuggested bookkeeping needed here.
  const setTableRangeField = (tableId, label, part, column) => {
    setTableFields((prev) => ({
      ...prev,
      [tableId]: { ...(prev[tableId] || {}), [label]: { ...(prev[tableId]?.[label] || {}), [part]: column } },
    }));
  };

  const cleanFilters = filters
    .map((f) => ({
      label: f.label.trim(),
      type: f.type === 'range' ? 'range' : f.type === 'range-overlap' ? 'range-overlap' : 'exact',
      ...(f.type === 'range-overlap' ? { granularity: f.granularity || 'exact' } : {}),
    }))
    .filter((f) => f.label);

  // Fills in a suggestion for every (table, label) cell that's still blank AND hasn't
  // been attempted before — runs as filters are added/renamed, so typing a filter label
  // that matches most tables' own header text pre-fills the whole column in one go instead
  // of picking each table one at a time (see autoDetectFilterColumn's own doc for exactly
  // what counts as a match).
  useEffect(() => {
    const additions = {};
    const newlySuggested = {};
    // range-overlap needs two separately-picked columns (start/end) — too fragile to
    // guess from name-matching alone (a "start"-ish column could match several ways),
    // so it's excluded here; the admin always picks both by hand.
    cleanFilters.filter(({ type }) => type !== 'range-overlap').forEach(({ label }) => {
      tables.forEach((t) => {
        const key = `${t.id}:${label}`;
        if (attemptedRef.current.has(key)) return;
        attemptedRef.current.add(key);
        if ((tableFields[t.id] || {})[label]) return; // already has a value — leave it
        const guess = autoDetectFilterColumn(t, label, tablesById);
        if (!guess) return;
        if (!additions[t.id]) additions[t.id] = {};
        additions[t.id][label] = guess;
        newlySuggested[key] = true;
      });
    });
    if (Object.keys(additions).length === 0) return;
    setTableFields((prev) => {
      const next = { ...prev };
      Object.entries(additions).forEach(([tableId, fieldMap]) => {
        next[tableId] = { ...(next[tableId] || {}), ...fieldMap };
      });
      return next;
    });
    setAutoSuggested((prev) => ({ ...prev, ...newlySuggested }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanFilters.map((f) => f.label).join('|'), tables, tablesById]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectChartSource(slug, { general_filters: cleanFilters }, layoutId);
      await Promise.all(tables.map((t) => {
        const fieldMap = tableFields[t.id] || {};
        const cleaned = {};
        cleanFilters.forEach(({ label, type }) => {
          if (type === 'range-overlap') {
            // "end" is genuinely optional (a table with no deactivation concept), but a
            // range-overlap tag with no "start" at all can never match anything — same as
            // leaving the label untagged for this table, so it's dropped rather than saved.
            if (fieldMap[label]?.start) cleaned[label] = { start: fieldMap[label].start, end: fieldMap[label].end || '' };
          } else if (fieldMap[label]) {
            cleaned[label] = fieldMap[label];
          }
        });
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
                <div key={i}>
                  <div className="flex items-center gap-2">
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
                  {f.type === 'range-overlap' && (
                    <div className="flex items-center gap-2 mt-1.5 pl-1">
                      <span className="text-[11px] text-gray-400 shrink-0">Picked as</span>
                      <div className="w-72 shrink-0">
                        <Select value={selectValue(RANGE_OVERLAP_GRANULARITY_OPTIONS, f.granularity || 'exact')}
                          onChange={(opt) => updateFilter(i, { granularity: opt.value })}
                          options={RANGE_OVERLAP_GRANULARITY_OPTIONS} isSearchable={false} styles={selectStyles} />
                      </div>
                    </div>
                  )}
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
                  {tables.map((t) => {
                    // Own columns first, then merged "<link>__<their column>" options from
                    // any related table (see referencedFieldOptionsFor) — the same set the
                    // auto-detect above can suggest from, so a suggested value always
                    // resolves to a real, selectable option here instead of showing blank.
                    const fieldOptions = [
                      ...toOptions((t.fields || []).map(f => f.name), (n) => (t.fields || []).find(f => f.name === n)?.label),
                      ...referencedFieldOptionsFor(t, tables),
                    ];
                    return (
                    <div key={t.id} className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 truncate" title={t.name}>{t.name}</p>
                      <div className="space-y-1.5">
                        {cleanFilters.map(({ label, type }) => type === 'range-overlap' ? (
                          <div key={label} className="space-y-1">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block" title={label}>{label}</span>
                            <div className="flex items-center gap-2 pl-2">
                              <span className="w-24 shrink-0 text-[10px] text-gray-400">Started (required)</span>
                              <div className="flex-1">
                                <Select
                                  value={fieldOptions.find((o) => o.value === (tableFields[t.id]?.[label]?.start || '')) || null}
                                  onChange={(opt) => setTableRangeField(t.id, label, 'start', opt ? opt.value : '')}
                                  options={fieldOptions}
                                  placeholder="None" isClearable styles={selectStyles} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-2">
                              <span className="w-24 shrink-0 text-[10px] text-gray-400">Ended (optional)</span>
                              <div className="flex-1">
                                <Select
                                  value={fieldOptions.find((o) => o.value === (tableFields[t.id]?.[label]?.end || '')) || null}
                                  onChange={(opt) => setTableRangeField(t.id, label, 'end', opt ? opt.value : '')}
                                  options={fieldOptions}
                                  placeholder="None — never excluded" isClearable styles={selectStyles} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={label} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-[11px] text-gray-500 dark:text-gray-400 truncate" title={label}>{label}</span>
                            <div className="flex-1">
                              <Select
                                value={fieldOptions.find((o) => o.value === ((tableFields[t.id] || {})[label] || '')) || null}
                                onChange={(opt) => setTableColumn(t.id, label, opt ? opt.value : '')}
                                options={fieldOptions}
                                placeholder="None" isClearable styles={selectStyles} />
                            </div>
                            {autoSuggested[`${t.id}:${label}`] && (
                              <span title="Auto-detected — review before saving"
                                className="shrink-0 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                Auto
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
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
// A collapsible, consistently-styled wrapper for one logical group of form fields — pulls
// the same bordered-box-with-a-heading pattern already used throughout DataSourceModal/the
// Add-Edit Chart modal into one place instead of every section hand-rolling its own
// spacing, so a long form reads as a scannable list of section headers by default instead
// of one continuous wall of fields. `collapsible=false` (a section that's the ONLY thing
// showing, e.g. DataSourceModal's own focusSection view) renders as a plain always-open
// header — no point offering to collapse the one thing already on screen.
function FormSection({ title, subtitle, collapsible = true, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  // overflow-hidden only while CLOSED — it's there to keep the collapsed header's square
  // corners from poking past the outer rounded-xl border. Left on while open, it would
  // also clip anything a child pops open below its own bounds (e.g. a react-select
  // dropdown menu, which isn't portaled and renders inline right under its trigger).
  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-xl ${open ? '' : 'overflow-hidden'}`}>
      {collapsible ? (
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <div className="px-4 py-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {open && (
        <div className={`p-4 space-y-4 ${collapsible ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Numbered section label for the Add/Edit Chart form — turns one long run of fields into a
// scannable sequence (type -> name/source -> fields -> layout) without restructuring the
// conditional blocks underneath it into wrapper components.
function StepHeading({ n, title, hint }) {
  return (
    <div className="flex items-center gap-2 pt-4 mt-1 border-t border-gray-100 dark:border-gray-700 first:border-t-0 first:pt-0">
      <span className="w-5 h-5 shrink-0 rounded-full bg-[#0038A8] text-white text-[10px] font-bold flex items-center justify-center">{n}</span>
      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
      {hint && <span className="text-[11px] text-gray-400 truncate">{hint}</span>}
    </div>
  );
}

function DataSourceModal({ slug, tables, initial, builtInTitles, focusSection = null, instanceMode = false, layoutId = null, onSave, onClose, onDatasetUpdated, onChartSourceUpdated }) {
  // Every direct updateProjectChartSource call below edits the SINGLETON widget's own
  // ProjectChartSource row (marker icon, stats icon, map style, filters, ...) — never
  // shown at all in instanceMode (see this component's own docstring above) — which is
  // now one row per (office, layout) instead of strictly one per office, so those calls
  // need to target whichever layout is currently active on the parent Charts page.
  // layoutId is null for a project that hasn't adopted layouts, matching
  // updateProjectChartSource's own default and leaving that project's behavior unchanged.
  const patchChartSource = (settings) => updateProjectChartSource(slug, settings, layoutId);
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
  const uploadMarkerIconFile = (file) => applyMarkerIconUpdate(() => uploadProjectChartSourceMarkerIcon(slug, file, layoutId));
  const setMarkerIconUrl = () => applyMarkerIconUpdate(() => patchChartSource({ marker_icon: markerIconUrlInput.trim() }));
  const clearMarkerIcon = () => applyMarkerIconUpdate(() => patchChartSource({ marker_icon: '', marker_icon_name: '' }));
  const selectMarkerIconName = (name) => applyMarkerIconUpdate(() => patchChartSource({ marker_icon_name: name, marker_icon_color: markerIconColor }));
  const changeMarkerIconColor = (color) => {
    setMarkerIconColor(color);
    if (markerIconName) applyMarkerIconUpdate(() => patchChartSource({ marker_icon_color: color }));
  };

  // "Visible" stats badge's own icon — same persist-immediately pattern as the marker icon
  // above (a ProjectChartSource field, not part of the modal's batched Save), but simpler:
  // no image-upload option, just a Lucide icon name + color, since the badge is one small
  // fixed glyph rather than a per-dot pin.
  const [statsIconName, setStatsIconName] = useState(initial?.stats_icon_name || '');
  const [statsIconColor, setStatsIconColor] = useState(initial?.stats_icon_color || '#0038A8');
  const [savingStatsIcon, setSavingStatsIcon] = useState(false);
  const applyStatsIconUpdate = async (fn) => {
    setSavingStatsIcon(true);
    try {
      const updated = await fn();
      setStatsIconName(updated.stats_icon_name || '');
      setStatsIconColor(updated.stats_icon_color || '#0038A8');
      if (onChartSourceUpdated) onChartSourceUpdated(updated);
    } catch (err) {
      alert('Failed to update the stats badge icon.');
    } finally {
      setSavingStatsIcon(false);
    }
  };
  const selectStatsIconName = (name) => applyStatsIconUpdate(() => patchChartSource({ stats_icon_name: name === statsIconName ? '' : name, stats_icon_color: statsIconColor }));
  const changeStatsIconColor = (color) => {
    setStatsIconColor(color);
    if (statsIconName) applyStatsIconUpdate(() => patchChartSource({ stats_icon_color: color }));
  };

  // Which free tile set the map renders — see MAP_TILE_STYLES in FreeWifiMap.tsx.
  const [mapTileStyle, setMapTileStyle] = useState(initial?.map_tile_style || 'standard');
  const [savingTileStyle, setSavingTileStyle] = useState(false);
  const selectMapTileStyle = async (value) => {
    setSavingTileStyle(true);
    try {
      const updated = await patchChartSource({ map_tile_style: value });
      setMapTileStyle(updated.map_tile_style || 'standard');
      if (onChartSourceUpdated) onChartSourceUpdated(updated);
    } catch (err) {
      alert('Failed to update the map style.');
    } finally {
      setSavingTileStyle(false);
    }
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
  // Additional source tables, unioned into every tile's own row set (see
  // ProjectChartSource.summary_extra / computeSummaryTiles). Per-tile field mapping lives
  // on each tile itself (t.fieldMap) since different tiles can map different fields —
  // only the table list + each extra table's own row filter are shared at the widget level.
  const [summaryExtraDatasets, setSummaryExtraDatasets] = useState(initial?.summary_extra?.datasets || []);
  const [summaryTableConditions, setSummaryTableConditions] = useState(initial?.summary_extra?.table_conditions || {});
  const addSummaryTable = (id) => setSummaryExtraDatasets((prev) => [...prev, id]);
  const removeSummaryTable = (id) => {
    setSummaryExtraDatasets((prev) => prev.filter((x) => x !== id));
    setSummaryTableConditions((prev) => omitKey(prev, id));
    setSummaryFields((prev) => prev.map((t) => ({ ...t, fieldMap: omitKey(t.fieldMap, id) })));
  };
  const setSummaryTableCondition = (id, next) => setSummaryTableConditions((prev) => ({ ...prev, [id]: next }));

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
  // Additional source tables, unioned into the Map's own marker set (see
  // ProjectChartSource.map_extra) — each extra table can map its own columns onto
  // latField/lngField/mapColorField (field_maps.lat/lng/color) and gets its own row
  // filter (table_conditions), independent of mapConditions above (which applies to the
  // COMBINED set across every table).
  const [mapExtraDatasets, setMapExtraDatasets] = useState(initial?.map_extra?.datasets || []);
  const [mapFieldMaps, setMapFieldMaps] = useState(initial?.map_extra?.field_maps || {});
  const [mapTableConditions, setMapTableConditions] = useState(initial?.map_extra?.table_conditions || {});
  const addMapTable = (id) => setMapExtraDatasets((prev) => [...prev, id]);
  const removeMapTable = (id) => {
    setMapExtraDatasets((prev) => prev.filter((x) => x !== id));
    setMapFieldMaps((prev) => ({ lat: omitKey(prev.lat, id), lng: omitKey(prev.lng, id), color: omitKey(prev.color, id) }));
    setMapTableConditions((prev) => omitKey(prev, id));
  };
  const setMapFieldMap = (slot, id, col) => setMapFieldMaps((prev) => ({ ...prev, [slot]: { ...(prev[slot] || {}), [id]: col } }));
  const setMapTableCondition = (id, next) => setMapTableConditions((prev) => ({ ...prev, [id]: next }));

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
  // Additional source tables, unioned into the Breakdown's own grouped set (see
  // ProjectChartSource.breakdown_extra) — same shape/reasoning as the Map's above, just
  // one mapped field (groupField) instead of three.
  const [breakdownExtraDatasets, setBreakdownExtraDatasets] = useState(initial?.breakdown_extra?.datasets || []);
  const [breakdownFieldMap, setBreakdownFieldMap] = useState(initial?.breakdown_extra?.field_map || {});
  const [breakdownTableConditions, setBreakdownTableConditions] = useState(initial?.breakdown_extra?.table_conditions || {});
  const addBreakdownTable = (id) => setBreakdownExtraDatasets((prev) => [...prev, id]);
  const removeBreakdownTable = (id) => {
    setBreakdownExtraDatasets((prev) => prev.filter((x) => x !== id));
    setBreakdownFieldMap((prev) => omitKey(prev, id));
    setBreakdownTableConditions((prev) => omitKey(prev, id));
  };
  const setBreakdownFieldMapEntry = (id, col) => setBreakdownFieldMap((prev) => ({ ...prev, [id]: col }));
  const setBreakdownTableCondition = (id, next) => setBreakdownTableConditions((prev) => ({ ...prev, [id]: next }));

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
        summary_extra: { datasets: summaryExtraDatasets, table_conditions: summaryTableConditions },
        map_dataset: mapDatasetId ? Number(mapDatasetId) : null,
        map_title: mapTitle,
        map_hide_title: mapHideTitle,
        latitude_field: latField,
        longitude_field: combinedCoords ? latField : lngField,
        tooltip_fields: tooltipFields,
        map_filter_fields: filterFields,
        map_color_field: mapColorField,
        map_conditions: mapConditions.filter(c => c.field),
        map_extra: {
          datasets: mapExtraDatasets,
          field_maps: { lat: mapFieldMaps.lat, lng: combinedCoords ? mapFieldMaps.lat : mapFieldMaps.lng, color: mapFieldMaps.color },
          table_conditions: mapTableConditions,
        },
        breakdown_dataset: breakdownDatasetId ? Number(breakdownDatasetId) : null,
        breakdown_title: breakdownTitle,
        breakdown_hide_title: breakdownHideTitle,
        group_field: groupField,
        breakdown_fields: breakdownFields,
        breakdown_conditions: breakdownConditions.filter(c => c.field),
        breakdown_extra: { datasets: breakdownExtraDatasets, field_map: breakdownFieldMap, table_conditions: breakdownTableConditions },
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
          <FormSection title="Summary Card" collapsible={!focusSection}>
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
                        <p className="text-[10px] text-gray-400 mb-1">
                          {t.agg === 'row_value'
                            ? 'Which row this tile reads from — add conditions until exactly one row matches.'
                            : 'Filter rows for this tile (optional — independent of every other tile\'s own filter)'}
                        </p>
                        <ConditionsEditor conditions={t.conditions} onChange={(next) => updateSummaryTile(i, { conditions: next })}
                          fieldOptions={toOptions(summaryTableFields.map(f => f.name), (n) => summaryTableFields.find(f => f.name === n)?.label)}
                          valuesFor={(field) => toOptions(distinctFieldValues((summaryTable?.rows || []).map(r => r.values || {}), field))} />
                      </div>
                      {/* Per-tile field mapping onto the widget's extra tables below —
                          only shown once at least one is added, since a tile with no extra
                          tables has nothing to map. Every OTHER tile can map the SAME
                          extra tables onto a DIFFERENT one of its own fields. */}
                      {summaryExtraDatasets.length > 0 && t.field && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                          <p className="text-[10px] text-gray-400">Map "{t.field}" on the additional tables below (optional — defaults to the same column name)</p>
                          {summaryExtraDatasets.map((id) => {
                            const extraTable = tables.find((tt) => tt.id === id);
                            return (
                              <FieldMapRow key={id} label={extraTable?.name || `Table ${id}`} table={extraTable}
                                baseFieldLabel={t.field} value={t.fieldMap?.[id]}
                                onChange={(v) => updateSummaryTile(i, { fieldMap: { ...(t.fieldMap || {}), [id]: v } })} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addSummaryTile}
                    className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
                    + Add tile
                  </button>
                </div>
              </div>
            )}

            {summaryTable && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Additional source tables <span className="text-gray-400">(optional — combine rows from more tables into every tile above)</span>
                </label>
                <ExtraTableList primaryId={summaryDatasetId ? Number(summaryDatasetId) : null} extraIds={summaryExtraDatasets}
                  genericTables={tables} onAdd={addSummaryTable} onRemove={removeSummaryTable}
                  renderExtras={(id, extraTable) => (
                    <div className="pt-1">
                      <p className="text-[10px] text-gray-400 mb-1">Only include this table's rows where...</p>
                      <ConditionsEditor conditions={summaryTableConditions[id]} onChange={(next) => setSummaryTableCondition(id, next)}
                        fieldOptions={toOptions((extraTable?.fields || []).map((f) => f.name), (n) => extraTable?.fields?.find((f) => f.name === n)?.label)}
                        valuesFor={(field) => toOptions(distinctFieldValues((extraTable?.rows || []).map((r) => r.values || {}), field))} />
                    </div>
                  )} />
              </div>
            )}
          </FormSection>
          )}

          {/* Map */}
          {(!focusSection || focusSection === 'map') && (
          <FormSection title="Map" collapsible={!focusSection}>
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

            {!instanceMode && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                Stats badge icon <span className="text-gray-400">(the "Visible" count in the corner — set independently of the marker icon above)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="color" value={statsIconColor} onChange={(e) => changeStatsIconColor(e.target.value)}
                  disabled={savingStatsIcon}
                  className="w-8 h-8 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
                  title="Icon color" />
                {MARKER_ICON_OPTIONS.map(({ name, Icon }) => (
                  <button key={name} type="button" onClick={() => selectStatsIconName(name)} disabled={savingStatsIcon}
                    title={name}
                    className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors disabled:opacity-50 ${
                      statsIconName === name ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}>
                    <Icon size={16} color={statsIconName === name ? statsIconColor : undefined}
                      className={statsIconName === name ? '' : 'text-gray-500 dark:text-gray-400'} />
                  </button>
                ))}
              </div>
              {statsIconName && <p className="text-[11px] text-gray-400 mt-1">Click the selected icon again to go back to the default Wifi glyph.</p>}
            </div>
            )}

            {!instanceMode && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Map style</label>
              <div className="grid grid-cols-3 gap-2">
                {MAP_TILE_STYLES.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => selectMapTileStyle(value)} disabled={savingTileStyle}
                    className={`px-2 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
                      mapTileStyle === value ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 font-medium' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}>
                    {label}
                  </button>
                ))}
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

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Additional source tables <span className="text-gray-400">(optional — combine markers from more tables onto this map)</span>
                  </label>
                  <ExtraTableList primaryId={mapDatasetId ? Number(mapDatasetId) : null} extraIds={mapExtraDatasets}
                    genericTables={tables} onAdd={addMapTable} onRemove={removeMapTable}
                    renderExtras={(id, extraTable) => (
                      <>
                        <FieldMapRow label="Latitude" table={extraTable} baseFieldLabel={latField || 'Latitude'}
                          value={mapFieldMaps.lat?.[id]} onChange={(v) => setMapFieldMap('lat', id, v)} />
                        {!combinedCoords && (
                          <FieldMapRow label="Longitude" table={extraTable} baseFieldLabel={lngField || 'Longitude'}
                            value={mapFieldMaps.lng?.[id]} onChange={(v) => setMapFieldMap('lng', id, v)} />
                        )}
                        {mapColorField && (
                          <FieldMapRow label="Color field" table={extraTable} baseFieldLabel={mapColorField}
                            value={mapFieldMaps.color?.[id]} onChange={(v) => setMapFieldMap('color', id, v)} />
                        )}
                        <div className="pt-1">
                          <p className="text-[10px] text-gray-400 mb-1">Only include this table's rows where...</p>
                          <ConditionsEditor conditions={mapTableConditions[id]} onChange={(next) => setMapTableCondition(id, next)}
                            fieldOptions={toOptions((extraTable?.fields || []).map((f) => f.name), (n) => extraTable?.fields?.find((f) => f.name === n)?.label)}
                            valuesFor={(field) => toOptions(distinctFieldValues((extraTable?.rows || []).map((r) => r.values || {}), field))} />
                        </div>
                      </>
                    )} />
                </div>
              </>
            )}
          </FormSection>
          )}

          {/* Breakdown */}
          {(!focusSection || focusSection === 'breakdown') && (
          <FormSection title="Breakdown" collapsible={!focusSection}>
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
                    Additional source tables <span className="text-gray-400">(optional — combine rows from more tables into this breakdown)</span>
                  </label>
                  <ExtraTableList primaryId={breakdownDatasetId ? Number(breakdownDatasetId) : null} extraIds={breakdownExtraDatasets}
                    genericTables={tables} onAdd={addBreakdownTable} onRemove={removeBreakdownTable}
                    renderExtras={(id, extraTable) => (
                      <>
                        <FieldMapRow label="Group field" table={extraTable} baseFieldLabel={groupField || 'Group field'}
                          value={breakdownFieldMap[id]} onChange={(v) => setBreakdownFieldMapEntry(id, v)} />
                        <div className="pt-1">
                          <p className="text-[10px] text-gray-400 mb-1">Only include this table's rows where...</p>
                          <ConditionsEditor conditions={breakdownTableConditions[id]} onChange={(next) => setBreakdownTableCondition(id, next)}
                            fieldOptions={toOptions((extraTable?.fields || []).map((f) => f.name), (n) => extraTable?.fields?.find((f) => f.name === n)?.label)}
                            valuesFor={(field) => toOptions(distinctFieldValues((extraTable?.rows || []).map((r) => r.values || {}), field))} />
                        </div>
                      </>
                    )} />
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
          </FormSection>
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
  const navigate = useNavigate();

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
  // See useEqualHeightGrid — only same-kind cards sharing a row get matched to the same
  // height (e.g. two donut charts side by side), not every card in the row regardless of
  // type.
  const chartsGridRef = useRef(null);
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
  // Chart Layouts (see ProjectChartLayout) — named, independently-scoped "pages" within
  // this project's Charts tab. Empty `layouts` + `activeLayoutId === null` is a project
  // that hasn't opted in yet, behaving exactly as it always has. `activeLayoutId` scopes
  // every chart/widget/chart-source fetch and create below — see loadLayoutData.
  const [layouts, setLayouts] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState(null);
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

  // Unlocks per-tile "Additional source tables" combining in computeSummaryTiles (see its
  // own doc) — the same recordsByDataset/genericTables pair custom charts already pass to
  // combineChartRecords elsewhere in this file, reused here instead of a second copy.
  const summaryCombineCtx = { recordsByDataset, genericTables };

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
  // Only the id/gridSize list, not the whole allCharts array — a chart's own content
  // changing (e.g. editing its title) shouldn't re-run the row/kind measurement pass,
  // only adding/removing/reordering/resizing a card should (see useEqualHeightGrid).
  const equalHeightKey = allCharts.filter((c) => c.visible).map((c) => `${c.id}:${c.gridSize || ''}`).join('|');
  useEqualHeightGrid(chartsGridRef, equalHeightKey);

  const [showAddChart, setShowAddChart] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [savingChart, setSavingChart] = useState(false);
  const [newChart, setNewChart] = useState({
    title: '', field: isFreeWifi ? 'province' : '', secondaryField: '', tertiaryField: '', chartType: 'bar-horizontal',
    agg: 'sum', equals: '',
    aggregationEnabled: false, aggregationField: '', aggregationType: 'sum',
    cardDesign: 'big-number', cardIcon: '', cardColor: '#0038A8', cardTarget: '', cardImage: '', cardTextAlign: 'left',
    cardGradientColor: '#000000', cardDescription: '',
    hideTitle: false,
    dateGroupBy: 'month', cumulative: false, valueLabels: {}, valueTargets: {}, secondaryValueLabels: {}, tertiaryValueLabels: {},
    conditions: [],
    gridSize: 'full', showOnUser: true, showAllCategories: false, disablePagination: false, dataset: '',
    extraDatasets: [], fieldMap: {}, secondaryFieldMap: {}, aggregationFieldMap: {}, tableConditions: {},
    rowMode: false, rowColumns: [], multiRowMode: false,
    colorMode: 'palette', chartColor: '#0038A8', categoryColors: {}, secondaryCategoryColors: {}, categorySecondaryColors: {},
    categoryOrder: [], secondaryCategoryOrder: [], tertiaryCategoryOrder: [], donutCenterMode: 'total',
    comparisonCollapsible: false, showRowIncrease: true, rowIncreaseColor: '', rowDecreaseColor: '', rowIncreaseInHeader: false,
  });
  // 'image-bg' card design's background photo — URL mode just writes straight into
  // newChart.cardImage like any other text field; Upload mode holds the picked File here
  // (not yet sent) since it needs the chart's id to attach to, which doesn't exist yet for
  // a brand-new chart — handleAddChart uploads it as a follow-up call after create/update
  // (see uploadProjectChartConfigCardImage). Reset whenever the modal opens/closes so a
  // stale pending file from a previous chart never gets attached to the wrong one.
  const [cardImageMode, setCardImageMode] = useState('url');
  const [pendingCardImageFile, setPendingCardImageFile] = useState(null);
  // Drag-reorder state for "Customize labels" below — same splice-on-drop pattern as
  // Summary Card tiles (see DataSourceModal's dragTileIndex), just scoped to this modal's
  // own newChart.categoryOrder instead of a tile list.
  const [dragLabelIndex, setDragLabelIndex] = useState(null);
  // Same drag-reorder pattern, own state — "Customize sub-labels" (secondary field) is a
  // separate list from "Customize labels" (primary field) above, so a drag in one must
  // never be tracked by the other's index.
  const [dragSecondaryLabelIndex, setDragSecondaryLabelIndex] = useState(null);
  // Same idea, one level deeper — "Customize sub-labels" for the tertiary field.
  const [dragTertiaryLabelIndex, setDragTertiaryLabelIndex] = useState(null);
  // Which ONE primary category's "customize this row's own colors" panel (bar-100-stacked
  // only, see categorySecondaryColors) is currently expanded in "Customize labels" — at
  // most one open at a time, same as an accordion, so the list doesn't get overwhelming.
  const [expandedCategoryColorRow, setExpandedCategoryColorRow] = useState(null);
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

  // Fetches everything scoped to ONE layout (chart source/configs/widgets) and applies it
  // — shared by the initial load below and by switching tabs in the layout switcher.
  // `tables` defaults to the current genericTables state, but the initial load passes the
  // just-fetched value explicitly instead, since setGenericTables' own update wouldn't be
  // visible yet within that same effect's closure.
  const loadLayoutData = (layoutId, tables = genericTables) => {
    setLoading(true);
    return Promise.all([
      getProjectChartSource(slug, layoutId),
      getProjectChartConfigs(slug, layoutId),
      getProjectBuiltinWidgets(slug, layoutId),
    ])
      .then(([source, configs, widgets]) => {
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
  };

  // Switches which layout is being viewed/edited (a LayoutTabs onChange) — re-fetches
  // only the layout-scoped data, not office id/tables/the layout list itself.
  const switchLayout = (layoutId) => {
    setActiveLayoutId(layoutId);
    loadLayoutData(layoutId);
  };

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
    Promise.all([getProjectOfficeId(slug), getProjectDatasets(slug), getProjectChartLayouts(slug)])
      .then(([id, tables, fetchedLayouts]) => {
        setOfficeId(id);
        setGenericTables(tables);
        setLayouts(fetchedLayouts);
        // A project that has adopted layouts always shows SOME layout, defaulting to the
        // first (typically "Default", the auto-created one holding pre-adoption content) —
        // never the now-empty layout=NULL slot. A project with none yet keeps null,
        // preserving today's behavior exactly.
        const resolvedLayoutId = fetchedLayouts.length ? fetchedLayouts[0].id : null;
        setActiveLayoutId(resolvedLayoutId);
        return loadLayoutData(resolvedLayoutId, tables);
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
    // Real distinct values, PLUS one more for N/A if any row is actually blank AND there's
    // at least one real value too — matching what the chart itself renders (tallyBy's
    // `field || 'N/A'` groups every blank row into its own category) and what "Customize
    // labels" now lists. The `> 0` guard preserves the one case this needs to stay
    // blank-EXCLUSIVE for: an auto-merged field (see mergeReferencedFields) where a linked
    // column's key doesn't match anything in the other table, so every record's merged
    // value is blank — that must still show "(0 values)", not "(1 value)" implying the
    // broken link has real data, since there's no genuine value mixed in to distinguish it
    // from the "entirely unmatched" case.
    fields.forEach(f => {
      const distinct = distinctFieldValues(records, f.value);
      const hasBlank = distinct.length > 0 && records.some(r => {
        const v = r[f.value];
        return v === null || v === undefined || String(v).trim() === '';
      });
      map[f.value] = hasBlank ? distinct.length + 1 : distinct.length;
    });
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
    setSavingChart(true);
    try {
      const isBackedChart = editingChart && typeof editingChart.id === 'number';
      const payload = {
        ...chartConfigToBackend(newChart),
        ...(isFreeWifi ? {} : { dataset: Number(newChart.dataset), ...(isBackedChart ? {} : { office: officeId, layout: activeLayoutId, order: allCharts.length }) }),
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
      setNewChart({ title: '', field: isFreeWifi ? 'province' : '', secondaryField: '', tertiaryField: '', chartType: 'bar-horizontal', agg: 'sum', equals: '', gridSize: 'full', showOnUser: true, showAllCategories: false, dataset: '' });
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
      updateProjectChartSource(slug, { hidden_builtins: next }, activeLayoutId).then(setChartSource).catch(console.error);
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
        }, activeLayoutId);
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
        updateProjectChartSource(slug, { chart_order: chartOrder }, activeLayoutId)
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

  // CSV export rows for a SINGLETON built-in widget (Summary/Map/Breakdown) — mirrors
  // renderGenericBuiltIn/renderBuiltIn's own per-chartId/isFreeWifi data resolution below,
  // kept as its own function (not extracted out of those render blocks) so wiring export
  // can't risk regressing the render path itself.
  const computeSingletonExportRows = (chartId, dataSource = 'live') => {
    if (isFreeWifi) {
      const records = datasets[dataSource] || [];
      if (chartId === 'summary') {
        const stats = dataSource === 'live'
          ? {
              total_locations: summary?.overall?.total_locations || 0,
              municipalities_count: summary?.overall?.municipalities_count || 0,
              provinces_count: summary?.overall?.provinces_count || 0,
              barangays_count: summary?.overall?.barangays_count || 0,
              total_active_aps: summary?.overall?.total_sites || 0,
            }
          : computeSummaryStats(records);
        return builtinSummaryCSVRows({ isFreeWifi: true, stats });
      }
      if (chartId === 'map') return builtinMapCSVRows({ isFreeWifi: true, records });
      if (chartId === 'province-breakdown') {
        const byProvince = dataSource === 'live' ? (summary?.by_province || {}) : computeProvinceBreakdown(records);
        return builtinBreakdownCSVRows({ isFreeWifi: true, byProvince });
      }
      return [];
    }
    const source = chartSource || {};
    if (chartId === 'summary') {
      const taggedFields = genericTables.find(t => t.id === source.summary_dataset)?.fields || [];
      return builtinSummaryCSVRows({ isFreeWifi: false, tiles: computeSummaryTiles(summarySites, source, taggedFields, summaryCombineCtx) });
    }
    if (chartId === 'map') {
      const taggedFields = genericTables.find(t => t.id === source.map_dataset)?.fields || [];
      const { mapped, tooltipFieldDefs } = resolveMapSites(mapSites, source, taggedFields);
      return builtinMapCSVRows({ isFreeWifi: false, mapped, tooltipFieldDefs });
    }
    if (chartId === 'province-breakdown') {
      const records = filterRecordsByConditions(breakdownSites, source.breakdown_conditions);
      const taggedFields = genericTables.find(t => t.id === source.breakdown_dataset)?.fields || [];
      const groupLabel = taggedFields.find(f => f.name === source.group_field)?.label || source.group_field;
      return builtinBreakdownCSVRows({ isFreeWifi: false, records, groupField: source.group_field, groupLabel, taggedFields, breakdownFields: source.breakdown_fields });
    }
    return [];
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
        const tiles = computeSummaryTiles(records, source, taggedFields, summaryCombineCtx);
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
            <div className="-m-4"><FreeWifiMap sites={filteredMapped} totalAPs={filteredMapped.length} height="500px" tooltipFields={tooltipFieldDefs} filterFields={filterFieldDefs} colorField={colorFieldDef} markerIcon={source.marker_icon} markerIconName={source.marker_icon_name} markerIconColor={source.marker_icon_color} statsIconName={source.stats_icon_name} statsIconColor={source.stats_icon_color} tileStyle={source.map_tile_style} /></div>
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
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-16 sm:w-20 text-right shrink-0 truncate">{fmtNum(count)} rows</span>
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

  // CSV export rows for an EXTRA ProjectBuiltinWidget instance — same idea as
  // computeSingletonExportRows above (always the generic, non-Free-Wi-Fi path, since extra
  // widget instances only exist for generic projects), reading from the instance's own
  // `settings`/table instead of chartSource, mirroring renderBuiltinWidgetInstance below.
  // 'ict-plans-policies' reads two whole separate tables by NAME (see IctPlansAndPolicies
  // .tsx) rather than one tagged dataset like every other widget instance — its export
  // can't reuse computeWidgetInstanceExportRows' single-table/single-CSV shape (Plans and
  // Policies have entirely different columns, and downloadCSV's headers come from just
  // the FIRST row, so mixing both shapes into one CSV would silently drop whichever
  // table's columns didn't match row 0). Triggers up to two separate CSV downloads
  // instead, one per table, each headed by that table's own column LABELS (not the raw
  // field names) — skipping either table entirely if it has no rows yet.
  const exportIctPlansAndPoliciesCSVs = () => {
    const findTableByName = (name) => genericTables.find(t => (t.name || '').trim().toLowerCase() === name.toLowerCase());
    const rowsFor = (table) => (table?.rows || []).map(r => {
      const out = {};
      (table.fields || []).forEach(f => { out[f.label] = r.values?.[f.name] ?? ''; });
      return out;
    });
    const plansRows = rowsFor(findTableByName('ICT Plans and Policies'));
    const policiesRows = rowsFor(findTableByName('ICT Policies'));
    if (plansRows.length) downloadCSV(plansRows, safeFilename('ICT Plans', 'csv'));
    if (policiesRows.length) downloadCSV(policiesRows, safeFilename('ICT Policies', 'csv'));
  };

  const computeWidgetInstanceExportRows = (chart) => {
    const settings = chart.settings || {};
    const datasetId = settings.summary_dataset ?? settings.map_dataset ?? settings.breakdown_dataset;
    const taggedFields = genericTables.find(t => t.id === datasetId)?.fields || [];
    const baseRecords = recordsByDataset[datasetId] || [];
    if (chart.widgetType === 'summary') {
      return builtinSummaryCSVRows({ isFreeWifi: false, tiles: computeSummaryTiles(baseRecords, settings, taggedFields) });
    }
    if (chart.widgetType === 'map') {
      const { mapped, tooltipFieldDefs } = resolveMapSites(baseRecords, settings, taggedFields);
      return builtinMapCSVRows({ isFreeWifi: false, mapped, tooltipFieldDefs });
    }
    if (chart.widgetType === 'province-breakdown') {
      const records = filterRecordsByConditions(baseRecords, settings.breakdown_conditions);
      const groupLabel = taggedFields.find(f => f.name === settings.group_field)?.label || settings.group_field;
      return builtinBreakdownCSVRows({ isFreeWifi: false, records, groupField: settings.group_field, groupLabel, taggedFields, breakdownFields: settings.breakdown_fields });
    }
    return [];
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
      case 'ict-plans-policies':
        // No dataset tag/settings at all — reads this project's own "ICT Plans and
        // Policies"/"ICT Policies" Datasets by name directly (see the component itself).
        // title="" — DraggableChart already renders this widget's own title bar (via
        // builtinWidgetTitle), same as every other widget type here never repeating its
        // own title internally.
        return (
          <div className="-m-4">
            <IctPlansAndPolicies slug={slug} title="" />
          </div>
        );
      default:
        return null;
    }
  };

  // Add a new extra widget instance, then immediately open its settings editor — same
  // "create, then edit" flow as "Add Custom Chart". (State lives up near the component's
  // other useState calls, above the `if (loading) return` below — declaring hooks after
  // an early return means they'd only run once loading finished, changing the hook count
  // between renders and tripping React's Rules of Hooks.)
  // Layout management (see ProjectChartLayout) — creating the office's FIRST layout is
  // what triggers the backend's one-time "fold everything existing into a Default layout"
  // migration (see ProjectChartLayoutViewSet.create), so a full reload of layouts +
  // layout-scoped data is needed here specifically (not just appending the new one to
  // local state), since the office's whole layout-less/legacy content just moved.
  const addLayout = async () => {
    const name = window.prompt(layouts.length ? 'Name for the new layout:' : 'This project has no layouts yet — name your first one:');
    if (!name || !name.trim()) return;
    try {
      const created = await createProjectChartLayout({ office: officeId, name: name.trim() });
      const refreshed = await getProjectChartLayouts(slug);
      setLayouts(refreshed);
      setActiveLayoutId(created.id);
      loadLayoutData(created.id);
    } catch {
      alert('Failed to create the layout.');
    }
  };
  const renameActiveLayout = async () => {
    const current = layouts.find((l) => l.id === activeLayoutId);
    if (!current) return;
    const name = window.prompt('Rename this layout:', current.name);
    if (!name || !name.trim() || name.trim() === current.name) return;
    try {
      const updated = await updateProjectChartLayout(current.id, { name: name.trim() });
      setLayouts((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      alert('Failed to rename the layout.');
    }
  };
  const deleteActiveLayout = async () => {
    const current = layouts.find((l) => l.id === activeLayoutId);
    if (!current) return;
    if (layouts.length <= 1) return alert("Can't delete a project's last layout.");
    if (!window.confirm(`Delete "${current.name}" and everything on it? This can't be undone.`)) return;
    try {
      await deleteProjectChartLayout(current.id);
      const refreshed = await getProjectChartLayouts(slug);
      setLayouts(refreshed);
      const nextId = refreshed.length ? refreshed[0].id : null;
      setActiveLayoutId(nextId);
      loadLayoutData(nextId);
    } catch {
      alert('Failed to delete the layout.');
    }
  };

  const addBuiltinWidget = async (widgetType) => {
    setAddingWidgetType(false);
    try {
      const created = await createProjectBuiltinWidget({
        office: officeId, layout: activeLayoutId, widget_type: widgetType, settings: {}, order: allCharts.length,
      });
      const chart = builtinWidgetFromBackend(created);
      setAllCharts(prev => [...prev, chart]);
      // 'ict-plans-policies' has no per-instance settings at all (it just reads this
      // project's own "ICT Plans and Policies"/"ICT Policies" Datasets by name) — every
      // other widget type opens straight into DataSourceModal to configure itself, but
      // that modal has no section for this one, so there's nothing to edit here.
      if (widgetType !== 'ict-plans-policies') setEditingWidgetInstance(chart);
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
  // The one Card design with no data binding at all — see CARD_DESIGNS' own comment and
  // AggregateValueCard's TEXT_DESIGN_IDS branch. Gates out every data-field/aggregation
  // control below, replacing them with the Text Design grid + a plain textarea.
  const isTextNoteCard = isCardMode && TEXT_DESIGN_IDS.has(newChart.cardDesign);

  // Whether the filter bar shows on the PUBLIC Charts page (ProjectChartSource.
  // show_filter_bar — undefined on charts saved before this existed, so `!== false` keeps
  // the always-shown default). The admin's own copy below stays visible regardless, since
  // it's also how the admin filters what THEY see while building/testing charts here.
  const dateFilterVisible = chartSource?.show_filter_bar !== false;
  const toggleDateFilterVisibility = () => {
    updateProjectChartSource(slug, { show_filter_bar: !dateFilterVisible }, activeLayoutId)
      .then(setChartSource)
      .catch(console.error);
  };
  // The Summary Card's "as of" label reflects whichever range-type filter is currently
  // active (if any) — not tied to a filter literally named "Date", since the admin can
  // name/add range filters freely now. Uses the first one with a value set.
  const activeRangeFilter = generalFilterLabels.find(
    (f) => isRangeFilterType(f.type, f.granularity) && (generalFilterValues[f.label]?.from || generalFilterValues[f.label]?.to)
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

      {/* Chart Layouts (see ProjectChartLayout) — opt-in: a project with none of these
          (layouts.length === 0) shows just the "+ Add Layout" entry point below and is
          otherwise unaffected, exactly as it always has been. The moment an admin creates
          one, this becomes a real tab bar with a management control for the active tab. */}
      {!isFreeWifi && (
        <div className="flex items-center justify-between gap-3">
          <LayoutTabs
            tabs={layouts.map((l) => ({ id: l.id, label: l.name }))}
            activeId={activeLayoutId}
            onChange={switchLayout}
            className="flex-1 min-w-0"
          />
          <div className="flex items-center gap-1 shrink-0">
            {activeLayoutId != null && (
              <>
                <button type="button" onClick={renameActiveLayout} title="Rename this layout"
                  className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors">
                  <Edit2 size={14} />
                </button>
                {layouts.length > 1 && (
                  <button type="button" onClick={deleteActiveLayout} title="Delete this layout"
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={addLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:border-[#0038A8] whitespace-nowrap">
              <Plus size={13} /> Add Layout
            </button>
          </div>
        </div>
      )}

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
          layoutId={activeLayoutId}
          onClose={() => setShowFilterSettings(false)}
          onSaved={async () => {
            const [source, ds] = await Promise.all([getProjectChartSource(slug, activeLayoutId), getProjectDatasets(slug)]);
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
          layoutId={activeLayoutId}
          onClose={() => setDataSourceModalSection(false)}
          onDatasetUpdated={async () => setGenericTables(await getProjectDatasets(slug))}
          onChartSourceUpdated={(updated) => setChartSource(updated)}
          onSave={async (draft) => {
            try {
              const saved = await updateProjectChartSource(slug, draft, activeLayoutId);
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
                {/* Chart vs Card vs Text — three different questions (which visualization,
                    which single-value layout, or no data at all), so three separate entry
                    points instead of burying "no data needed" as one of several Card
                    designs where it wasn't obvious it skipped Table/Field entirely. "Text"
                    locks chartType to 'aggregate-cards' + cardDesign to 'text-note' AND
                    silently fills in `dataset` (genericTables[0] — always exists, since the
                    "Add Custom Chart" button that opens this modal is itself disabled when
                    a project has none) so a text card genuinely never shows a table picker
                    at all, satisfying the backend's dataset FK without the admin ever
                    seeing that requirement. */}
                <div className="mb-3"><StepHeading n={1} title="Choose a type" hint="Chart, single-number Card, or plain Text" /></div>
                <div className="flex gap-2 mb-4">
                  <button type="button"
                    onClick={() => { if (isCardMode) setNewChart(c => ({ ...c, chartType: 'bar-horizontal' })); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      !isCardMode ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    Chart
                  </button>
                  <button type="button"
                    onClick={() => { if (!isCardMode || isTextNoteCard) setNewChart(c => ({ ...c, chartType: 'aggregate-cards', cardDesign: (!c.cardDesign || TEXT_DESIGN_IDS.has(c.cardDesign)) ? 'big-number' : c.cardDesign })); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      isCardMode && !isTextNoteCard ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    Card
                  </button>
                  <button type="button"
                    onClick={() => { if (!isTextNoteCard) setNewChart(c => ({ ...c, chartType: 'aggregate-cards', cardDesign: TEXT_DESIGN_IDS.has(c.cardDesign) ? c.cardDesign : 'text-note', dataset: c.dataset || (isFreeWifi ? c.dataset : (genericTables[0]?.id != null ? String(genericTables[0].id) : c.dataset)) })); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                      isTextNoteCard ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 text-[#0038A8] dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}>
                    Text
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
                    {CHART_TYPES.filter(t => t.id !== 'aggregate-cards' && (!newChart.rowMode || !t.requiresDateField)).map((type) => {
                      const fieldSelected = newChart.rowMode ? (newChart.rowColumns || []).length > 0 : !!newChart.field;
                      const count = newChart.rowMode ? (newChart.rowColumns || []).length : (fieldCardinality[newChart.field] || 0);
                      const isDateLike = newChart.rowMode ? false : (newChart.multiRowMode || fieldIsDateLike[newChart.field]);
                      const fit = getChartFit(type, count, isDateLike, fieldSelected);
                      const isDisabled = fit.status === 'disabled';
                      const isRecommended = fieldSelected && !isDisabled && recommendChartTypes(count, isDateLike).includes(type.id);
                      return (
                        <button key={type.id} disabled={isDisabled}
                          onClick={() => setNewChart(c => ({ ...c, chartType: type.id, multiRowMode: (type.id === 'line' || type.id === 'area') ? c.multiRowMode : false }))}
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

                {/* Card Design Selection — not shown in Text mode, which has its own
                    template grid below instead (TEXT_DESIGNS). */}
                {isCardMode && !isTextNoteCard && (
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

                {/* Text Design Selection — same grid pattern as Chart Type / Card Design
                    above, just scoped to TEXT_DESIGNS (every option here is still stored in
                    the same chart.cardDesign field CARD_DESIGNS uses — see TEXT_DESIGN_IDS). */}
                {isTextNoteCard && (
                <div className="mb-5">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {TEXT_DESIGNS.map((design) => (
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
                const fieldSelected = newChart.rowMode ? (newChart.rowColumns || []).length > 0 : !!newChart.field;
                const count = newChart.rowMode ? (newChart.rowColumns || []).length : (fieldCardinality[newChart.field] || 0);
                const fit = getChartFit(selectedType, count, newChart.rowMode ? false : (newChart.multiRowMode || fieldIsDateLike[newChart.field]), fieldSelected);
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-bold mb-1">{selectedType.label}</p>
                    <p>
                      {newChart.rowMode
                        ? 'This chart plots one row\'s values across the columns you pick.'
                        : selectedType.requiresDateField
                        ? 'This chart plots a date field chronologically, left to right.'
                        : selectedType.needsSecondary
                        ? 'This chart works best with a secondary field for grouping.'
                        : 'This chart uses a single field to display data.'}
                      {selectedType.maxItems && ` Shows up to ${selectedType.maxItems} items.`}
                    </p>
                    {!fieldSelected ? (
                      <p className="mt-1 font-semibold">
                        {newChart.rowMode
                          ? `Pick a table and columns below${selectedType.minItems > 0 ? ` — needs at least ${selectedType.minItems}` : ''}.`
                          : selectedType.requiresDateField
                          ? 'Pick a table and a date field below to plot it.'
                          : `Pick a table and field below${selectedType.minItems > 0 ? ` — needs at least ${selectedType.minItems} distinct values` : ''}.`}
                      </p>
                    ) : fit.status === 'disabled' ? (
                      <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">{fit.reason}</p>
                    ) : fit.status === 'partial' && (
                      <>
                        <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                          {newChart.showAllCategories
                            ? `Showing all ${fmtNum(count)} categories (default limit is top ${selectedType.maxItems})`
                            : fit.reason}
                        </p>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input type="checkbox" checked={!!newChart.showAllCategories}
                            onChange={(e) => setNewChart(c => ({ ...c, showAllCategories: e.target.checked }))}
                            className="rounded border-gray-300" />
                          <span className="text-[11px] text-blue-700 dark:text-blue-300">Show all {fmtNum(count)} categories (ignore the limit)</span>
                        </label>
                        {newChart.showAllCategories && (
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" checked={!!newChart.disablePagination}
                              onChange={(e) => setNewChart(c => ({ ...c, disablePagination: e.target.checked }))}
                              className="rounded border-gray-300" />
                            <span className="text-[11px] text-blue-700 dark:text-blue-300">
                              Show them all on one page <span className="text-blue-400">(no Next/Previous — everything at once)</span>
                            </span>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              <StepHeading n={2} title="Name & data source" />

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Chart Title <span className="text-red-500">*</span></label>
                <input placeholder="e.g. Sites by Contract" value={newChart.title}
                  onChange={(e) => setNewChart(c => ({ ...c, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
              </div>

              {!isFreeWifi && !isTextNoteCard && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table <span className="text-red-500">*</span></label>
                  <Select value={selectValue(toOptions(genericTables.map(t => t.id), (id) => genericTables.find(t => t.id === id)?.name), newChart.dataset ? Number(newChart.dataset) : null)}
                    onChange={(opt) => setNewChart(c => ({
                      ...c, dataset: opt ? opt.value : '', field: '', secondaryField: '', tertiaryField: '',
                      extraDatasets: [], fieldMap: {}, secondaryFieldMap: {}, aggregationFieldMap: {}, tableConditions: {},
                    }))}
                    options={toOptions(genericTables.map(t => t.id), (id) => genericTables.find(t => t.id === id)?.name)}
                    placeholder="Select table..." isClearable styles={selectStyles} />
                </div>
              )}

              {/* "Compare columns for one row" — flips the chart from grouping a field's
                  values across every row into instead charting ONE row's own values
                  across several columns (e.g. a row with Jan/Feb/Mar columns becomes a
                  3-point trend for just that record). Not offered for Value Cards, which
                  already show a single record's single value with no "categories" at all. */}
              {!isFreeWifi && newChart.dataset && !isCardMode && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!newChart.rowMode}
                    onChange={(e) => {
                      const rowMode = e.target.checked;
                      setNewChart(c => ({
                        ...c, rowMode,
                        // Line/Area need a date field to plot against, which row mode has
                        // no equivalent of — fall back to a type that works with any
                        // number of categories instead of leaving an invalid one selected.
                        chartType: rowMode && (c.chartType === 'line' || c.chartType === 'area') ? 'bar-vertical' : c.chartType,
                        // Mutually exclusive with row mode (one row's own columns vs one
                        // line per matching row) — the toggle above hides once rowMode is
                        // on, but clear the underlying value too rather than leaving it
                        // stale and unseen.
                        multiRowMode: rowMode ? false : c.multiRowMode,
                      }));
                    }}
                    className="rounded border-gray-300" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Compare columns for one row <span className="text-gray-400 font-normal">(instead of grouping by a field's values across every row)</span>
                  </span>
                </label>
              )}

              {/* One line per row — a wide table (one row per category, one column per
                  period, e.g. REGION rows with 2023/2024/2025/2026 columns) turned into a
                  multi-line trend chart: every row matching Filter rows below becomes its
                  own line, named/colored/reordered by its own `field` value exactly like
                  "Customize labels" already does for any other chart, plotted across the
                  same "Columns to compare" as row mode uses. Line/Area only — every other
                  chart type has no equivalent of plotting several independent lines. */}
              {!isFreeWifi && newChart.dataset && !isCardMode && !newChart.rowMode &&
                (newChart.chartType === 'line' || newChart.chartType === 'area') && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!newChart.multiRowMode}
                    onChange={(e) => setNewChart(c => ({ ...c, multiRowMode: e.target.checked }))}
                    className="rounded border-gray-300" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    One line per row <span className="text-gray-400 font-normal">(compare columns across every matching row, instead of one line)</span>
                  </span>
                </label>
              )}

              {/* Extra source tables — optional, folds more tables' rows into this
                  chart's combined record set (see combineChartRecords), e.g. summing a
                  Value Card across two separately-tracked tables. Not offered together
                  with row mode — that's about picking one table's own single row, not
                  combining several tables' worth of rows. */}
              {!isFreeWifi && newChart.dataset && !newChart.rowMode && !isTextNoteCard && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Additional source tables <span className="text-gray-400">(optional — combine rows from more tables into this chart)</span>
                  </label>
                  <ExtraTablesEditor chart={newChart} setChart={setNewChart} genericTables={genericTables}
                    needsSecondary={!!CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary}
                    recordsByDataset={recordsByDataset} />
                </div>
              )}

              {!isTextNoteCard && <StepHeading n={3} title="Fields" hint="What to group, break down and measure" />}

              {!isTextNoteCard && (newChart.rowMode ? (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Columns to compare</label>
                  <Select isMulti
                    value={(newChart.rowColumns || []).map(v => ({
                      value: v, label: availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label || v,
                    }))}
                    onChange={(opts) => setNewChart(c => ({ ...c, rowColumns: (opts || []).map(o => o.value) }))}
                    options={availableFieldsFor(newChart.dataset).map(f => ({ value: f.value, label: f.label }))}
                    placeholder="Select columns..." styles={selectStyles} />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Add Filter rows below until exactly one row matches — its values across these columns become the chart.
                  </p>
                </div>
              ) : (
              <>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  {newChart.multiRowMode ? 'Line label field' : `Data Field ${CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary ? '(Primary)' : ''}`}
                </label>
                <Select
                  value={selectValue(availableFieldsFor(newChart.dataset).map(f => ({
                    value: f.value, label: fieldOptionLabel(f, fieldCardinality, fieldIsDateLike),
                  })), newChart.field)}
                  isDisabled={(!isFreeWifi && !newChart.dataset) || (newChart.chartType === 'aggregate-cards' && newChart.agg === 'count')}
                  onChange={(opt) => {
                    const field = opt ? opt.value : '';
                    // Picking a field normally auto-switches to whatever chart type fits its
                    // cardinality best — skipped in multi-row mode, where the chart type is
                    // pinned to line/area (that auto-pick has no idea multi-row mode exists
                    // and would happily switch away from both).
                    if (newChart.multiRowMode) { setNewChart(c => ({ ...c, field })); return; }
                    const count = fieldCardinality[field] || 0;
                    setNewChart(c => ({ ...c, field, chartType: bestChartType(count, c.chartType, fieldIsDateLike[field]) }));
                  }}
                  options={availableFieldsFor(newChart.dataset).map(f => ({
                    value: f.value, label: fieldOptionLabel(f, fieldCardinality, fieldIsDateLike),
                  }))}
                  placeholder="Select field..." isClearable styles={selectStyles} />
                {CHART_TYPES.find(t => t.id === newChart.chartType)?.requiresDateField && !newChart.multiRowMode && (
                  <p className="text-[11px] text-gray-400 mt-1">Fields marked "Date" above will work — others won't, even if their name sounds date-like.</p>
                )}
              </div>
              {newChart.multiRowMode && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Columns to compare</label>
                  <Select isMulti
                    value={(newChart.rowColumns || []).map(v => ({
                      value: v, label: availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label || v,
                    }))}
                    onChange={(opts) => setNewChart(c => ({ ...c, rowColumns: (opts || []).map(o => o.value) }))}
                    options={availableFieldsFor(newChart.dataset).map(f => ({ value: f.value, label: f.label }))}
                    placeholder="Select columns..." styles={selectStyles} />
                  <p className="text-[11px] text-gray-400 mt-1">
                    The shared X-axis every line is plotted across — e.g. 2023, 2024, 2025, 2026.
                  </p>
                </div>
              )}
              </>
              ))}

              {/* Secondary/Third field sit right under the main Data Field (not far below
                  Filter rows) — a stacked/grouped/comparison chart is really defined by
                  this pair, so it shouldn't be hunted for at the bottom of the form. Not
                  shown in row mode, which has no "field" to cross-tab a second one against. */}
              {!newChart.rowMode && CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary && (
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
              {!newChart.rowMode && CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary && newChart.secondaryField && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Third Field <span className="text-gray-400">(optional — a further breakdown nested under each secondary row)</span>
                  </label>
                  <Select
                    value={selectValue(toOptions(availableFieldsFor(newChart.dataset).filter(f => f.value !== newChart.field && f.value !== newChart.secondaryField).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label), newChart.tertiaryField)}
                    onChange={(opt) => setNewChart(c => ({ ...c, tertiaryField: opt ? opt.value : '' }))}
                    options={toOptions(availableFieldsFor(newChart.dataset).filter(f => f.value !== newChart.field && f.value !== newChart.secondaryField).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label)}
                    placeholder="None" isClearable styles={selectStyles} />
                </div>
              )}

              {/* Aggregation — optional. Off, every chart type counts rows per category
                  (the original, still-default behavior). On, each category shows a
                  sum/average/unique-count of a SEPARATE value field instead — e.g. "Total
                  Budget per Province" instead of "Number of Rows per Province". Not shown
                  in Card mode, which already has its own complete Aggregation section
                  below (agg/agg_equals, count/count-where-equals included), nor in row
                  mode — there's only ever one row per category there, nothing to
                  aggregate across. */}
              {!isCardMode && !newChart.rowMode && !newChart.multiRowMode && (
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
              {CHART_TYPES.find(t => t.id === newChart.chartType)?.requiresDateField && !newChart.multiRowMode && (
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

              <StepHeading n={4} title="Appearance & filters" />

              {/* Donut center — 'total' (default) shows the raw row/aggregate total, same as
                  before this option existed. 'percentage' instead shows the display-order
                  leading category's share of the total, which reads more like an at-a-glance
                  summary than a bare count when what matters is how dominant one category
                  is. Only donut has a center to put anything in — plain pie has no hole. */}
              {newChart.chartType === 'donut' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Donut center</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: 'total', label: 'Total' }, { value: 'percentage', label: 'Top %' }].map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setNewChart(c => ({ ...c, donutCenterMode: value }))}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          (newChart.donutCenterMode || 'total') === value ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 font-medium' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison collapsible — only meaningful once there's a secondary_field
                  breakdown to hide/reveal. Off (default) renders exactly as before this
                  option existed: every category's breakdown always shown. */}
              {newChart.chartType === 'comparison' && !!newChart.secondaryField && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!newChart.comparisonCollapsible}
                      onChange={(e) => setNewChart(c => ({ ...c, comparisonCollapsible: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Collapsible — start each category collapsed, expand on click to show its breakdown</span>
                  </label>
                </div>
              )}

              {/* The automatic per-bar "+X%" readout (each column vs the one before it) only
                  appears for a bar-vertical chart in row mode with 2+ compared columns (see
                  CustomChartRenderer's showIncrease) — this is just its opt-out. On
                  (default) keeps every existing chart showing it exactly as before this
                  checkbox existed. */}
              {newChart.chartType === 'bar-vertical' && newChart.rowMode && (newChart.rowColumns || []).length >= 2 && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newChart.showRowIncrease !== false}
                      onChange={(e) => setNewChart(c => ({ ...c, showRowIncrease: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Show each bar's "% change" vs the previous column</span>
                  </label>
                  {newChart.showRowIncrease !== false && (
                    <div className="flex items-center gap-4 mt-2 ml-6">
                      <label className="flex items-center gap-2">
                        <input type="color" value={newChart.rowIncreaseColor || '#059669'}
                          onChange={(e) => setNewChart(c => ({ ...c, rowIncreaseColor: e.target.value }))}
                          className="w-7 h-7 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                        <span className="text-xs text-gray-500">Increase color</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="color" value={newChart.rowDecreaseColor || '#dc2626'}
                          onChange={(e) => setNewChart(c => ({ ...c, rowDecreaseColor: e.target.value }))}
                          className="w-7 h-7 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                        <span className="text-xs text-gray-500">Decrease color</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Puts the overall first-vs-last "+X% Increase from <label>" text in the
                  chart's own title/header instead of (not in addition to — this REPLACES
                  chart.title wherever it's normally shown) leaving it inline above the
                  bars. See rowIncreaseHeaderText, read from the title prop rather than
                  inside CustomChartRenderer — the per-bar badges above stay independent of
                  this and keep showing (or not) exactly per their own checkbox. */}
              {newChart.chartType === 'bar-vertical' && newChart.rowMode && (newChart.rowColumns || []).length >= 2 && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!newChart.rowIncreaseInHeader}
                      onChange={(e) => setNewChart(c => ({ ...c, rowIncreaseInHeader: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Show the % increase in the chart's title instead of "Chart Title" above</span>
                  </label>
                </div>
              )}

              {/* Colors — 'palette' (default) is the original behavior, every category
                  cycling through the shared COLORS array unchanged. 'accent' recolors the
                  whole chart to one flat color. 'custom' opens a per-category swatch
                  picker in the "Customize labels" section right below (same per-value row
                  list, so picking a category's color and its display label happen in one
                  place). Not shown in Card mode, which already has its own accent color
                  (card_color) — a whole different setting for a whole different purpose. */}
              {!isCardMode && (
                <FormSection title="Colors" collapsible>
                  <div className="flex gap-2 mb-2">
                    {[
                      { value: 'palette', label: 'Default' },
                      { value: 'accent', label: 'Single color' },
                      { value: 'custom', label: 'Per category' },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setNewChart(c => ({ ...c, colorMode: opt.value }))}
                        className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          (newChart.colorMode || 'palette') === opt.value ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {newChart.colorMode === 'accent' && (
                    <div className="flex items-center gap-3">
                      <input type="color" value={newChart.chartColor || '#0038A8'}
                        onChange={(e) => setNewChart(c => ({ ...c, chartColor: e.target.value }))}
                        className="w-10 h-10 shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                      <input type="text" value={newChart.chartColor || '#0038A8'}
                        onChange={(e) => setNewChart(c => ({ ...c, chartColor: e.target.value }))}
                        className="flex-1 px-3 py-2 text-sm font-mono border rounded-lg bg-white dark:bg-gray-800" />
                    </div>
                  )}
                  {newChart.colorMode === 'custom' && (
                    <p className="text-[11px] text-gray-400">Pick each category's color in "Customize labels" below.</p>
                  )}
                </FormSection>
              )}

              {/* Customize labels — per-CHART display overrides for a field's raw values
                  (ProjectChartConfig.value_labels), e.g. showing "N/A" as "No" or "Yes" as
                  "Renewed" in this chart's bars/legend/tooltips without touching the
                  underlying data or any other chart built on the same field. Only for Chart
                  mode (a Value Card shows one aggregated number, not per-value labels) and
                  only once a field with a manageable number of distinct values is picked —
                  past ~20 this would turn into an unusable wall of text inputs. In row mode
                  there's no field at all — the "values" being relabeled are the chosen
                  columns' own raw names instead (e.g. "jan_visitors" → "January"), same
                  chart.valueLabels map and same displayLabel() lookup either way. */}
              {!isCardMode && (newChart.field || newChart.rowMode) && (() => {
                const rawValues = newChart.rowMode
                  ? (newChart.rowColumns || [])
                  : (() => {
                      // distinctFieldValues deliberately excludes blank/missing values (it's
                      // built for the count_equals dropdown, where "blank" isn't a real value
                      // to match against) — but the chart itself groups every blank row into
                      // an actual "N/A" category (see tallyBy's `field || 'N/A'` fallback), so
                      // without adding it back here, N/A would show up on the chart with no
                      // way to relabel or color it. Only added when a blank row genuinely
                      // exists, so a field with no blanks doesn't grow a phantom N/A entry.
                      const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
                      const distinct = distinctFieldValues(records, newChart.field);
                      const hasBlank = records.some((r) => {
                        const v = r[newChart.field];
                        return v === null || v === undefined || String(v).trim() === '';
                      });
                      return hasBlank ? [...distinct, 'N/A'] : distinct;
                    })();
                if (rawValues.length === 0 || rawValues.length > 20) return null;
                const showColorSwatch = !isCardMode && newChart.colorMode === 'custom';
                // Per-row "customize this ONE row's own segment colors" (categorySecondaryColors)
                // — only meaningful for a chart type that actually reads it (bar-100-stacked
                // today), and only once there's a secondary field whose segments it would
                // even override. secondaryValuesForRow mirrors "Customize sub-labels"' own
                // distinct-value list exactly, just computed here too since that section
                // renders separately below and its `values` aren't in scope at this point.
                const showRowColorOverride = newChart.chartType === 'bar-100-stacked' && !!newChart.secondaryField;
                const secondaryValuesForRow = showRowColorOverride ? (() => {
                  const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
                  const distinct = distinctFieldValues(records, newChart.secondaryField);
                  const hasBlank = records.some((r) => {
                    const val = r[newChart.secondaryField];
                    return val === null || val === undefined || String(val).trim() === '';
                  });
                  return hasBlank ? [...distinct, 'N/A'] : distinct;
                })() : [];
                // Non-row-mode charts sort categories by count by default (see
                // buildChartTallyData) — categoryOrder overrides that when set, letting the
                // admin drag them into whatever order they want here instead. Row mode has
                // no separate order field: its category order already IS whatever sequence
                // rowColumns is in, so dragging here reorders that array directly. Either
                // way, anything not yet in a saved order (new data) is appended at the end
                // rather than disappearing.
                const savedOrder = newChart.rowMode ? null : (newChart.categoryOrder || []);
                const values = savedOrder
                  ? [...savedOrder.filter((v) => rawValues.includes(v)), ...rawValues.filter((v) => !savedOrder.includes(v))]
                  : rawValues;
                const reorderTo = (dropIndex) => {
                  if (dragLabelIndex === null || dragLabelIndex === dropIndex) { setDragLabelIndex(null); return; }
                  const arr = [...values];
                  const [moved] = arr.splice(dragLabelIndex, 1);
                  arr.splice(dropIndex, 0, moved);
                  setNewChart(c => (newChart.rowMode ? { ...c, rowColumns: arr } : { ...c, categoryOrder: arr }));
                  setDragLabelIndex(null);
                };
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Customize labels <span className="text-gray-400">(optional — change how a value is shown, its color, set an "out of" target, or drag <GripVertical size={11} className="inline -mt-0.5" /> to reorder)</span>
                    </label>
                    <div className="space-y-1.5">
                      {values.map((v, i) => (
                        <div key={v}>
                          <div draggable
                            onDragStart={() => setDragLabelIndex(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => reorderTo(i)}
                            onDragEnd={() => setDragLabelIndex(null)}
                            className={`flex items-center gap-2 rounded-lg transition-opacity ${dragLabelIndex === i ? 'opacity-40' : ''}`}>
                            <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0 cursor-grab active:cursor-grabbing" />
                            {showColorSwatch && (
                              <input type="color" value={newChart.categoryColors?.[v] || COLORS[i % COLORS.length]}
                                onChange={(e) => setNewChart(c => ({ ...c, categoryColors: { ...c.categoryColors, [v]: e.target.value } }))}
                                title={`Color for "${v}"`}
                                className="w-7 h-7 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                            )}
                            <span className="w-28 shrink-0 text-xs text-gray-500 chart-label-wrap" title={v}>{v}</span>
                            <span className="text-gray-300 shrink-0">→</span>
                            <input type="text" value={newChart.valueLabels?.[v] || ''}
                              onChange={(e) => setNewChart(c => ({ ...c, valueLabels: { ...c.valueLabels, [v]: e.target.value } }))}
                              placeholder={v}
                              className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                            {/* "Out of" target — shows "50/100" instead of just "50" for this
                                category, e.g. progress toward a goal. Display-only: the real
                                tallied count still drives bar height/percent-of-total, this
                                just appends "/target" to the number shown — see displayValue()
                                below in this component. */}
                            <span className="text-gray-300 shrink-0 text-xs">/</span>
                            <input type="number" value={newChart.valueTargets?.[v] ?? ''}
                              onChange={(e) => setNewChart(c => ({ ...c, valueTargets: { ...c.valueTargets, [v]: e.target.value } }))}
                              placeholder="over"
                              title={`Show "actual/over" for "${v}" (e.g. 50/100) — leave blank to show just the count`}
                              className="w-16 shrink-0 px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                            {newChart.valueTargets?.[v] !== undefined && newChart.valueTargets?.[v] !== '' && (
                              <button type="button" title="Remove the target"
                                onClick={() => setNewChart(c => { const rest = { ...c.valueTargets }; delete rest[v]; return { ...c, valueTargets: rest }; })}
                                className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
                            )}
                            {showRowColorOverride && (
                              <button type="button" onClick={() => setExpandedCategoryColorRow(x => x === v ? null : v)}
                                title={`Customize just "${v}"'s own bar colors`}
                                className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                  expandedCategoryColorRow === v || newChart.categorySecondaryColors?.[v]
                                    ? 'text-[#0038A8] bg-blue-50 dark:bg-blue-900/20' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'
                                }`}>
                                <Palette size={14} />
                              </button>
                            )}
                          </div>
                          {/* Overrides JUST this one row's bar segments (categorySecondaryColors),
                              leaving "Customize sub-labels" below as every OTHER row's shared
                              default — e.g. recoloring only Lanao del Norte's own bar to
                              red/gray without touching Bukidnon's, Iligan's, etc. */}
                          {showRowColorOverride && expandedCategoryColorRow === v && (
                            <div className="mt-1.5 ml-6 pl-3 border-l-2 border-gray-100 dark:border-gray-800 space-y-1.5">
                              <p className="text-[11px] text-gray-400">Colors just for "{v}"'s own bar — every other row keeps the shared colors below.</p>
                              {secondaryValuesForRow.map((sv) => (
                                <div key={sv} className="flex items-center gap-2">
                                  <input type="color"
                                    value={newChart.categorySecondaryColors?.[v]?.[sv] || newChart.secondaryCategoryColors?.[sv] || COLORS[secondaryValuesForRow.indexOf(sv) % COLORS.length]}
                                    onChange={(e) => setNewChart(c => ({
                                      ...c,
                                      categorySecondaryColors: { ...c.categorySecondaryColors, [v]: { ...c.categorySecondaryColors?.[v], [sv]: e.target.value } },
                                    }))}
                                    title={`"${v}"'s own color for "${sv}"`}
                                    className="w-6 h-6 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                                  <span className="text-xs text-gray-500 chart-label-wrap">{newChart.secondaryValueLabels?.[sv] || sv}</span>
                                  {newChart.categorySecondaryColors?.[v]?.[sv] && (
                                    <button type="button"
                                      onClick={() => setNewChart(c => {
                                        const rest = { ...c.categorySecondaryColors?.[v] };
                                        delete rest[sv];
                                        return { ...c, categorySecondaryColors: { ...c.categorySecondaryColors, [v]: rest } };
                                      })}
                                      className="text-[11px] text-gray-400 hover:text-red-500">Reset</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Row mode + bar-100-stacked with a multi-value "Is one of" filter stacks one
                  segment per selected value (see pickRowModeRow/segmentColor in
                  CustomChartRenderer) — there's no secondaryField to drive "Customize
                  sub-labels" below, so give this specific combo its own small color/label
                  editor for those segment values instead. Reuses secondaryCategoryColors/
                  secondaryValueLabels, the exact same state the stacked-bar renderer reads. */}
              {newChart.rowMode && newChart.chartType === 'bar-100-stacked' && (() => {
                const multiCond = (newChart.conditions || []).find((c) => c.field && c.type === 'multi' && (c.values || []).length > 1);
                if (!multiCond) return null;
                const values = multiCond.values;
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Customize stacked segment colors <span className="text-gray-400">(optional — one color per selected "{multiCond.field}" value, stacked inside each bar)</span>
                    </label>
                    <div className="space-y-1.5">
                      {values.map((v, i) => (
                        <div key={v} className="flex items-center gap-2">
                          <input type="color" value={newChart.secondaryCategoryColors?.[v] || COLORS[i % COLORS.length]}
                            onChange={(e) => setNewChart(c => ({ ...c, secondaryCategoryColors: { ...c.secondaryCategoryColors, [v]: e.target.value } }))}
                            title={`Color for "${v}"`}
                            className="w-7 h-7 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                          <span className="w-40 shrink-0 text-xs text-gray-500 chart-label-wrap" title={v}>{v}</span>
                          <span className="text-gray-300 shrink-0">→</span>
                          <input type="text" value={newChart.secondaryValueLabels?.[v] || ''}
                            onChange={(e) => setNewChart(c => ({ ...c, secondaryValueLabels: { ...c.secondaryValueLabels, [v]: e.target.value } }))}
                            placeholder={v}
                            className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Customize sub-labels — same idea as "Customize labels" above, but for
                  secondary_field's own sub-groups (e.g. district numbers nested under each
                  province bar) instead of the primary field's categories: reorder, relabel,
                  and color each sub-value. Color here is independent of colorMode/palette
                  (which only ever govern the PRIMARY field) — it's a separate, always-
                  available per-sub-value override, applied uniformly across every primary
                  category's own sub-breakdown rather than a separate order/label/color per
                  category (see getSubGroups/displaySecondaryLabel). */}
              {!isCardMode && !newChart.rowMode && newChart.secondaryField && (() => {
                const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
                const distinct = distinctFieldValues(records, newChart.secondaryField);
                const hasBlank = records.some((r) => {
                  const v = r[newChart.secondaryField];
                  return v === null || v === undefined || String(v).trim() === '';
                });
                const rawValues = hasBlank ? [...distinct, 'N/A'] : distinct;
                if (rawValues.length === 0 || rawValues.length > 20) return null;
                const savedOrder = newChart.secondaryCategoryOrder || [];
                const values = savedOrder.length
                  ? [...savedOrder.filter((v) => rawValues.includes(v)), ...rawValues.filter((v) => !savedOrder.includes(v))]
                  : rawValues;
                const reorderTo = (dropIndex) => {
                  if (dragSecondaryLabelIndex === null || dragSecondaryLabelIndex === dropIndex) { setDragSecondaryLabelIndex(null); return; }
                  const arr = [...values];
                  const [moved] = arr.splice(dragSecondaryLabelIndex, 1);
                  arr.splice(dropIndex, 0, moved);
                  setNewChart(c => ({ ...c, secondaryCategoryOrder: arr }));
                  setDragSecondaryLabelIndex(null);
                };
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Customize sub-labels <span className="text-gray-400">(optional — change how a value in the "{newChart.secondaryField}" breakdown is shown, its color, or drag <GripVertical size={11} className="inline -mt-0.5" /> to reorder)</span>
                    </label>
                    <div className="space-y-1.5">
                      {values.map((v, i) => (
                        <div key={v} draggable
                          onDragStart={() => setDragSecondaryLabelIndex(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => reorderTo(i)}
                          onDragEnd={() => setDragSecondaryLabelIndex(null)}
                          className={`flex items-center gap-2 rounded-lg transition-opacity ${dragSecondaryLabelIndex === i ? 'opacity-40' : ''}`}>
                          <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0 cursor-grab active:cursor-grabbing" />
                          <input type="color" value={newChart.secondaryCategoryColors?.[v] || COLORS[i % COLORS.length]}
                            onChange={(e) => setNewChart(c => ({ ...c, secondaryCategoryColors: { ...c.secondaryCategoryColors, [v]: e.target.value } }))}
                            title={`Color for "${v}"`}
                            className="w-7 h-7 shrink-0 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
                          <span className="w-24 shrink-0 text-xs text-gray-500 chart-label-wrap" title={v}>{v}</span>
                          <span className="text-gray-300 shrink-0">→</span>
                          <input type="text" value={newChart.secondaryValueLabels?.[v] || ''}
                            onChange={(e) => setNewChart(c => ({ ...c, secondaryValueLabels: { ...c.secondaryValueLabels, [v]: e.target.value } }))}
                            placeholder={v}
                            className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Same idea again, one level deeper — reorder/relabel for the tertiary
                  field's own values (e.g. district names nested under each secondary
                  sub-row). No color picker here — a tertiary value isn't drawn as a
                  colored bar/segment/swatch anywhere, just a plain row label. */}
              {!isCardMode && !newChart.rowMode && newChart.tertiaryField && (() => {
                const records = isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []);
                const distinct = distinctFieldValues(records, newChart.tertiaryField);
                const hasBlank = records.some((r) => {
                  const v = r[newChart.tertiaryField];
                  return v === null || v === undefined || String(v).trim() === '';
                });
                const rawValues = hasBlank ? [...distinct, 'N/A'] : distinct;
                if (rawValues.length === 0 || rawValues.length > 20) return null;
                const savedOrder = newChart.tertiaryCategoryOrder || [];
                const values = savedOrder.length
                  ? [...savedOrder.filter((v) => rawValues.includes(v)), ...rawValues.filter((v) => !savedOrder.includes(v))]
                  : rawValues;
                const reorderTo = (dropIndex) => {
                  if (dragTertiaryLabelIndex === null || dragTertiaryLabelIndex === dropIndex) { setDragTertiaryLabelIndex(null); return; }
                  const arr = [...values];
                  const [moved] = arr.splice(dragTertiaryLabelIndex, 1);
                  arr.splice(dropIndex, 0, moved);
                  setNewChart(c => ({ ...c, tertiaryCategoryOrder: arr }));
                  setDragTertiaryLabelIndex(null);
                };
                return (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Customize sub-labels <span className="text-gray-400">(optional — change how a value in the "{newChart.tertiaryField}" breakdown is shown, or drag <GripVertical size={11} className="inline -mt-0.5" /> to reorder)</span>
                    </label>
                    <div className="space-y-1.5">
                      {values.map((v, i) => (
                        <div key={v} draggable
                          onDragStart={() => setDragTertiaryLabelIndex(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => reorderTo(i)}
                          onDragEnd={() => setDragTertiaryLabelIndex(null)}
                          className={`flex items-center gap-2 rounded-lg transition-opacity ${dragTertiaryLabelIndex === i ? 'opacity-40' : ''}`}>
                          <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0 cursor-grab active:cursor-grabbing" />
                          <span className="w-24 shrink-0 text-xs text-gray-500 chart-label-wrap" title={v}>{v}</span>
                          <span className="text-gray-300 shrink-0">→</span>
                          <input type="text" value={newChart.tertiaryValueLabels?.[v] || ''}
                            onChange={(e) => setNewChart(c => ({ ...c, tertiaryValueLabels: { ...c.tertiaryValueLabels, [v]: e.target.value } }))}
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
                  applies to any chart and stacks past one condition. Not offered for a Text
                  Note card, which has no data/aggregation to narrow down at all. */}
              {!isTextNoteCard && (
              <FormSection title="Filter rows"
                subtitle={newChart.rowMode ? 'Pick which single row this chart uses — add conditions until exactly one row matches' : 'Optional — only rows matching every condition are counted'}
                collapsible defaultOpen={(newChart.conditions || []).length > 0 || !!newChart.rowMode}>
                <ConditionsEditor conditions={newChart.conditions}
                  onChange={(next) => setNewChart(c => ({ ...c, conditions: next }))}
                  fieldOptions={toOptions(availableFieldsFor(newChart.dataset).map(f => f.value), (v) => availableFieldsFor(newChart.dataset).find(f => f.value === v)?.label)}
                  valuesFor={(field) => toOptions(distinctFieldValues(isFreeWifi ? sites : combineChartRecords(newChart, recordsByDataset, genericTables), field))}
                  extraTables={!isFreeWifi ? (newChart.extraDatasets || []).map(id => genericTables.find(t => t.id === id)).filter(Boolean) : []} />
              </FormSection>
              )}

              {/* Aggregation (Value Card only) — same vocabulary as the Summary Card tile
                  editor: Sum/Average/Count all rows/Count unique values/Count where equals.
                  Not offered for a Text Note card, which has no number to aggregate. */}
              {newChart.chartType === 'aggregate-cards' && !isTextNoteCard && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Aggregation</label>
                  <Select value={selectValue(CARD_AGG_OPTIONS, newChart.agg)}
                    onChange={(opt) => setNewChart(c => ({ ...c, agg: opt.value }))}
                    options={CARD_AGG_OPTIONS} isSearchable={false} styles={selectStyles} />
                  {(newChart.agg === 'count_equals' || newChart.agg === 'percentage') && (
                    <div className="mt-2 space-y-2">
                      <Select
                        value={selectValue(toOptions(distinctFieldValuesWithNA(isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []), newChart.field)), newChart.equals)}
                        onChange={(opt) => setNewChart(c => ({ ...c, equals: opt ? opt.value : '' }))}
                        options={toOptions(distinctFieldValuesWithNA(isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || []), newChart.field))}
                        placeholder="Value... (includes N/A for blank rows)" isClearable styles={selectStyles} />
                      {newChart.agg === 'percentage' && (
                        <div>
                          <input type="text" value={newChart.percentageLabel || ''}
                            onChange={(e) => setNewChart(c => ({ ...c, percentageLabel: e.target.value }))}
                            placeholder="Word shown after the %, e.g. Live"
                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                          <p className="text-[11px] text-gray-400 mt-1">Optional — shows as "{(0).toFixed(1)}% {newChart.percentageLabel || 'Live'}" instead of a bare percentage.</p>
                        </div>
                      )}
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
                  {/* Skipped only for the 'text-note' (Plain) text design, which renders
                      with no color of its own — the other three (Quote/Banner/Callout)
                      all use this as their icon/background/border color, same as every
                      CARD_DESIGNS layout does. */}
                  {newChart.cardDesign !== 'text-note' && (
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
                  )}

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
                      Font size <span className="text-gray-400 font-normal">(optional — leave unset to use this design's own default size)</span>
                    </label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setNewChart(c => ({ ...c, fontSize: '' }))}
                        title="Use this design's own default size"
                        className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          !newChart.fontSize ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                        Default
                      </button>
                      {FONT_SIZE_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => setNewChart(c => ({ ...c, fontSize: opt.value }))}
                          title={`${opt.px}px`}
                          className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            newChart.fontSize === opt.value ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      {isTextNoteCard
                        ? 'Text'
                        : <>Description <span className="text-gray-400">(optional — a sentence or two of context shown under the number)</span></>}
                    </label>
                    <textarea value={newChart.cardDescription || ''}
                      onChange={(e) => setNewChart(c => ({ ...c, cardDescription: e.target.value }))}
                      rows={isTextNoteCard ? 5 : 3}
                      placeholder={isTextNoteCard ? 'Whatever this card should say — a note, an announcement, a caption.' : 'e.g. Cumulative participants trained under the NGP program across Region 10.'}
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

                  {(newChart.cardDesign === 'image-bg' || newChart.cardDesign === 'text-image-bg') && (
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

              <StepHeading n={5} title="Layout & visibility" />

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Grid Size <span className="text-gray-400 font-normal">(how much of the row width this chart takes up)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRID_SIZES.map((size) => (
                    <button key={size.id} type="button" onClick={() => setNewChart(c => ({ ...c, gridSize: size.id }))}
                      title={size.label}
                      className={`p-2 rounded-xl border-2 transition-all ${
                        (newChart.gridSize || 'full') === size.id
                          ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}>
                      <div className="mb-1.5">{size.preview()}</div>
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white text-center">{size.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isFreeWifi && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newChart.showOnUser}
                    onChange={(e) => setNewChart(c => ({ ...c, showOnUser: e.target.checked }))}
                    className="rounded border-gray-300" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Show on Dashboard</span>
                </label>
              )}

              {/* Hides the title/subtitle header the PUBLIC page renders above this chart —
                  the admin's own preview keeps showing it regardless, so managing charts
                  doesn't get harder just because one of them hides its label out front. */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!newChart.hideTitle}
                  onChange={(e) => setNewChart(c => ({ ...c, hideTitle: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-xs text-gray-700 dark:text-gray-300">Hide title on public page</span>
              </label>

              {/* Sticky so Create/Cancel are always reachable — this form scrolls a long way,
                  and the buttons used to sit at the very bottom out of sight. The negative
                  margins cancel the scroll container's own padding so the bar spans
                  edge-to-edge. Create stays disabled (with the reason spelled out) until the
                  two required fields are filled, instead of failing with an alert after the
                  click. */}
              {(() => {
                const missing = [
                  !newChart.title.trim() && 'a title',
                  !isFreeWifi && !newChart.dataset && 'a table',
                ].filter(Boolean);
                return (
                  <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
                    {missing.length > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">Add {missing.join(' and ')} to continue.</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleAddChart} disabled={savingChart || missing.length > 0}
                        className="flex-1 px-4 py-2.5 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50 disabled:cursor-not-allowed">
                        {savingChart ? 'Saving...' : editingChart ? 'Update Chart' : 'Create Chart'}
                      </button>
                      <button onClick={() => { setShowAddChart(false); setEditingChart(null); }} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                );
              })()}
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
                      {rowIncreaseHeaderText(newChart, isFreeWifi ? sites : combineChartRecords(newChart, recordsByDataset, genericTables)) || newChart.title || 'Chart Title'}
                    </h4>
                  </div>
                  {/* No side/bottom padding for the 'image-bg' design, matching the actual
                      public/admin rendering (ChartCard/DraggableChart's own noPadding) —
                      otherwise the preview shows a padded inset that the real chart won't
                      have. */}
                  <div className={newChart.chartType === 'aggregate-cards' && (newChart.cardDesign === 'image-bg' || newChart.cardDesign === 'text-image-bg') ? '' : 'px-5 pb-5'}>
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
                computeSummaryTiles(summarySites, chartSource, genericTables.find(t => t.id === chartSource?.summary_dataset)?.fields || [], summaryCombineCtx),
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
        /* grid-flow-dense backfills gaps CSS Grid otherwise leaves behind when mixed
           widths (e.g. a Quarter next to a Third) don't add up to a clean 12 — without
           it, a chart that doesn't fit the current row just wraps, permanently
           stranding whatever space was left, even if a later, smaller chart would have
           fit right there. Trade-off: dense packing can render a later chart visually
           ahead of an earlier one when it fits a gap better — drag-reorder still sets
           the underlying order, this only affects which gap each chart lands in. */
        <div className="grid grid-cols-12 gap-6 grid-flow-dense" ref={chartsGridRef}>
          {allCharts.map((chart, index) => {
            if (!chart.visible) return null;
            const isCustom = chart.type === 'custom';
            const isWidgetInstance = chart.type === 'builtin-extra';
            const gridSize = isCustom || isWidgetInstance ? gridSizeClass(chart.gridSize) : 'col-span-12';
            // self-start: opts this item OUT of CSS Grid's default row stretch — see
            // useEqualHeightGrid, which applies an explicit height only within a same-kind
            // group so unrelated chart types/cards/text sharing a row don't get forced to
            // match each other's height.
            const ehKind = isWidgetInstance ? `widget:${chart.widgetType}` : isCustom ? customChartKind(chart) : `builtin:${chart.id}`;

            return (
              <div key={chart.id} className={`${gridSize} self-start`} data-eh-id={chart.id} data-eh-kind={ehKind}>
                <DraggableChart
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === index}
                  title={isCustom
                    ? (rowIncreaseHeaderText(chart, isFreeWifi ? sites : combineChartRecords(chart, recordsByDataset, genericTables)) || chart.title)
                    : isWidgetInstance ? builtinWidgetTitle(chart) : (isFreeWifi ? chart.label : builtInTitles[chart.id])}
                  subtitle={
                    isCustom ? (
                      // A Text card has no field/table binding to describe — naming it
                      // "Value Card · <stale field>" (chart.field is never cleared when
                      // switching a card to Text mode, since nothing else reads it there)
                      // would be both wrong and misleading. Name its actual template instead.
                      TEXT_DESIGN_IDS.has(chart.cardDesign)
                        ? `Text · ${TEXT_DESIGNS.find(d => d.id === chart.cardDesign)?.label || 'Plain'}`
                        : `${CHART_TYPES.find(t => t.id === chart.chartType)?.label} · ${
                            chart.rowMode ? `${(chart.rowColumns || []).length} columns compared` : chart.multiRowMode ? `${(chart.rowColumns || []).length} columns · one line per row` : availableFieldsFor(chart.dataset).find(f => f.value === chart.field)?.label
                          }`
                    )
                      : isWidgetInstance ? `${WIDGET_TYPE_LABELS[chart.widgetType]} · extra instance` : undefined
                  }
                  isCustom={isCustom || isWidgetInstance}
                  showOnUser={chart.showOnUser}
                  onEdit={isCustom ? () => {
                    setNewChart({ title: chart.title, field: chart.field, secondaryField: chart.secondaryField || '', tertiaryField: chart.tertiaryField || '', chartType: chart.chartType, agg: chart.agg || 'sum', equals: chart.equals || '', aggregationEnabled: !!chart.aggregationEnabled, aggregationField: chart.aggregationField || '', aggregationType: chart.aggregationType || 'sum', cardDesign: chart.cardDesign || 'big-number', cardIcon: chart.cardIcon || '', cardColor: chart.cardColor || '#0038A8', cardTarget: chart.cardTarget || '', cardImage: chart.cardImage || '', cardTextAlign: chart.cardTextAlign || 'left', cardGradientColor: chart.cardGradientColor || '#000000', cardDescription: chart.cardDescription || '', hideTitle: !!chart.hideTitle, dateGroupBy: chart.dateGroupBy || 'month', cumulative: !!chart.cumulative, valueLabels: chart.valueLabels || {}, valueTargets: chart.valueTargets || {}, secondaryValueLabels: chart.secondaryValueLabels || {}, tertiaryValueLabels: chart.tertiaryValueLabels || {}, conditions: chart.conditions || [], gridSize: chart.gridSize, showOnUser: chart.showOnUser, showAllCategories: chart.showAllCategories || false, disablePagination: !!chart.disablePagination, dataset: chart.dataset ? String(chart.dataset) : '', extraDatasets: chart.extraDatasets || [], fieldMap: chart.fieldMap || {}, secondaryFieldMap: chart.secondaryFieldMap || {}, aggregationFieldMap: chart.aggregationFieldMap || {}, tableConditions: chart.tableConditions || {}, rowMode: !!chart.rowMode, rowColumns: chart.rowColumns || [], multiRowMode: !!chart.multiRowMode, colorMode: chart.colorMode || 'palette', chartColor: chart.chartColor || '#0038A8', categoryColors: chart.categoryColors || {}, secondaryCategoryColors: chart.secondaryCategoryColors || {}, categorySecondaryColors: chart.categorySecondaryColors || {}, categoryOrder: chart.categoryOrder || [], secondaryCategoryOrder: chart.secondaryCategoryOrder || [], tertiaryCategoryOrder: chart.tertiaryCategoryOrder || [], donutCenterMode: chart.donutCenterMode || 'total', comparisonCollapsible: !!chart.comparisonCollapsible, showRowIncrease: chart.showRowIncrease !== false, rowIncreaseColor: chart.rowIncreaseColor || '', rowDecreaseColor: chart.rowDecreaseColor || '', rowIncreaseInHeader: !!chart.rowIncreaseInHeader });
                    setEditingChart(chart);
                    setCardImageMode('url');
                    setPendingCardImageFile(null);
                    setShowAddChart(true);
                  // 'ict-plans-policies' has no chart-config settings to open here (see
                  // addBuiltinWidget) — its content is entirely the "ICT Plans and
                  // Policies"/"ICT Policies" Dataset tables' own rows (see
                  // IctPlansAndPolicies.tsx), so its pencil jumps straight to the Datasets
                  // tab instead, pre-selecting the Plans table so there's no need to hunt
                  // for it by name.
                  } : isWidgetInstance ? (chart.widgetType === 'ict-plans-policies'
                    ? () => navigate(`/kms/admin/${slug}/datasets`, { state: { focusDatasetName: 'ICT Plans and Policies' } })
                    : () => setEditingWidgetInstance(chart))
                  // Built-ins: opens the same Data Source modal as the "Data Source" button,
                  // just scoped to this one widget's own section (see focusSection) instead
                  // of showing all three — a direct per-chart edit that still shares the
                  // exact same settings/save logic as the full modal, not a separate copy.
                  : !isFreeWifi ? () => setDataSourceModalSection(chart.id === 'province-breakdown' ? 'breakdown' : chart.id) : undefined}
                  onEditStyle={!isCustom && !isWidgetInstance && chart.id === 'summary' ? () => setShowSummaryStyle(true) : undefined}
                  onExportData={
                    isCustom
                      ? () => exportChartDataCSV(chart, isFreeWifi ? sites : combineChartRecords(chart, recordsByDataset, genericTables))
                      : isWidgetInstance
                        ? (chart.widgetType === 'ict-plans-policies' ? exportIctPlansAndPoliciesCSVs : () => downloadCSV(computeWidgetInstanceExportRows(chart), safeFilename(builtinWidgetTitle(chart), 'csv')))
                        : () => downloadCSV(computeSingletonExportRows(chart.id, chart.dataSource || 'live'), safeFilename(isFreeWifi ? chart.label : builtInTitles[chart.id], 'csv'))
                  }
                  onDelete={isCustom || isWidgetInstance ? () => handleDeleteChart(chart.id) : undefined}
                  onToggleVisibility={() => toggleVisibility(chart.id)}
                  dataSource={isFreeWifi && !isCustom && !isWidgetInstance ? (chart.dataSource || 'live') : undefined}
                  onDataSourceChange={isFreeWifi && !isCustom && !isWidgetInstance ? (ds) => setChartDataSource(chart.id, ds) : undefined}
                  noPadding={isCustom && chart.chartType === 'aggregate-cards' && (chart.cardDesign === 'image-bg' || chart.cardDesign === 'text-image-bg')}
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
                            {CHART_TYPES.find(t => t.id === chart.chartType)?.label} · {
                              chart.rowMode ? `${(chart.rowColumns || []).length} columns compared` : chart.multiRowMode ? `${(chart.rowColumns || []).length} columns · one line per row` : availableFieldsFor(chart.dataset).find(f => f.value === chart.field)?.label
                            }
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
