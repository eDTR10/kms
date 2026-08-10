// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Save, BarChart3, TrendingUp, MapPin, Wifi, ChevronDown, ChevronRight, Search, ChevronLeft, GripVertical, Plus, Trash2, X, Eye, EyeOff, Edit2, Database, Star } from 'lucide-react';
import { getFreeWifiSummary } from '../../../services/freewifi';
import {
  getFreeWifiLiveData, getFreeWifiMainData, getFreeWifiTargetData, getFreeWifiMasterlistData,
  getFreeWifiChartConfigs, createFreeWifiChartConfig, updateFreeWifiChartConfig, deleteFreeWifiChartConfig,
} from '../../../services/freewifiData';
import { getKmsSettings, updateKmsSettings } from '../../../services/settings';
import FreeWifiMap from '../../../components/FreeWifiMap';
import {
  getProjectOfficeId, getProjectDatasets,
  getProjectChartConfigs, createProjectChartConfig, updateProjectChartConfig, deleteProjectChartConfig,
  reorderProjectChartConfigs, getProjectChartSource, updateProjectChartSource,
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
  { id: 'line', label: 'Line Graph', needsSecondary: false, minItems: 3, maxItems: 8, category: 'trend', preview: () => (
    <svg viewBox="0 0 100 40" className="w-full h-16"><polyline points="5,35 25,20 45,28 65,10 85,18 95,8" fill="none" stroke={COLORS[0]} strokeWidth="2" />{[5,25,45,65,85,95].map((x, i) => <circle key={i} cx={x} cy={[35,20,28,10,18,8][i]} r="2" fill={COLORS[0]} />)}</svg>
  ) },
  { id: 'area', label: 'Area Chart', needsSecondary: false, minItems: 3, maxItems: 8, category: 'trend', preview: () => (
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
  { id: 'full', label: 'Full Width' },
  { id: 'half', label: 'Half Width' },
];

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

// Resolves the three independent per-widget dataset tags (ProjectChartSource's
// summary_dataset/map_dataset/breakdown_dataset) against this project's actual Datasets
// tables into row arrays — used on initial load and again after saving Data Source, since
// each built-in can point at a different table (or the same one).
export function buildTaggedRecords(tables, source) {
  const rowsFor = (datasetId) => (tables.find(t => t.id === datasetId)?.rows || []).map(r => ({ id: r.id, ...(r.values || {}) }));
  return {
    summary: rowsFor(source?.summary_dataset),
    map: rowsFor(source?.map_dataset),
    breakdown: rowsFor(source?.breakdown_dataset),
  };
}

// Turns a Map-tagged table's raw rows into geocoded, tooltip-ready records — shared by
// the admin widget and the public page so a coordinate-parsing fix (e.g. the combined
// "lat, lng" column format) only has to happen in one place. Returns `mapped` (every row
// with valid latitude/longitude) and `tooltipFieldDefs` (resolved {name,label} pairs for
// the admin-picked hover-tooltip columns).
export function resolveMapSites(records, source, taggedFields) {
  const latField = source?.latitude_field, lngField = source?.longitude_field;
  if (!latField || !lngField) return { mapped: [], tooltipFieldDefs: [] };
  // Same field tagged for both = a combined "lat, lng" column (e.g.
  // "8.486735683, 124.6322367") — split on the comma instead of reading two columns.
  const combined = latField === lngField;
  const mapped = records
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
  return { mapped, tooltipFieldDefs };
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
        let value = 0;
        if (cfg.agg === 'count') {
          value = records.length;
        } else if (cfg.agg === 'distinct') {
          value = new Set(records.map(r => String(r[cfg.field] ?? '').trim()).filter(Boolean)).size;
        } else if (cfg.agg === 'count_equals') {
          const target = String(cfg.equals ?? '').trim().toLowerCase();
          value = records.filter(r => String(r[cfg.field] ?? '').trim().toLowerCase() === target).length;
        } else {
          value = records.reduce((s, r) => s + (Number(r[cfg.field]) || 0), 0);
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
    <div className="flex flex-nowrap gap-4 md:gap-6 overflow-x-auto pb-1">
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

// Two custom charts showing the same type + fields are duplicates
const chartSignature = (c) => `${c.chartType}|${c.field}|${c.secondaryField || ''}`;

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
    gridSize: c.grid_size || 'full',
    showOnUser: c.show_on_user,
    showAllCategories: c.show_all_categories,
    visible: c.visible,
    // Only present on ProjectChartConfig rows (the non-Free-Wi-Fi path) — which of a
    // project's own Datasets tables this chart counts rows from.
    dataset: c.dataset,
  };
}

export function chartConfigToBackend(chart) {
  return {
    title: chart.title,
    chart_type: chart.chartType,
    field: chart.field,
    secondary_field: chart.secondaryField || '',
    grid_size: chart.gridSize || 'full',
    show_on_user: chart.showOnUser !== false,
    show_all_categories: !!chart.showAllCategories,
    visible: chart.visible !== false,
    ...(chart.dataset != null ? { dataset: chart.dataset } : {}),
  };
}

// Clean a saved chart list: drop duplicate ids, duplicate custom configs,
// and stale built-ins; guarantee every current built-in appears exactly once
function sanitizeCharts(charts) {
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
    const sig = chartSignature(c);
    if (seenConfigs.has(sig)) return;
    seenConfigs.add(sig);
    seenIds.add(c.id);
    result.push(c);
  });
  BUILT_IN_CHARTS.forEach(b => {
    if (!seenIds.has(b.id)) result.push({ ...b, visible: true, dataSource: 'live' });
  });
  return result;
}

// How well a chart type fits a field with `count` distinct values
function getChartFit(type, count) {
  if (!type) return { status: 'ok' };
  if (count < type.minItems) return { status: 'disabled', reason: `Needs at least ${type.minItems} categories — this field only has ${count}` };
  if (type.maxItems && count > type.maxItems) return { status: 'partial', reason: `Shows the top ${type.maxItems} of ${count} categories` };
  return { status: 'ok' };
}

// Best chart types for a given number of distinct values
function recommendChartTypes(count) {
  if (count <= 2) return ['cards', 'progress', 'pie'];
  if (count <= 6) return ['pie', 'donut', 'horizontal-stack', 'bar-vertical'];
  if (count <= 10) return ['bar-horizontal', 'donut', 'treemap', 'progress'];
  if (count <= 20) return ['bar-horizontal', 'list', 'table'];
  return ['table', 'list', 'bar-horizontal'];
}

// Keep the current type if it still fits, otherwise pick the best recommendation
function bestChartType(count, currentId) {
  const current = CHART_TYPES.find(t => t.id === currentId);
  if (getChartFit(current, count).status !== 'disabled') return currentId;
  const rec = recommendChartTypes(count).find(id =>
    getChartFit(CHART_TYPES.find(t => t.id === id), count).status !== 'disabled');
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

// Custom Chart Renderer with hover tooltips
export function CustomChartRenderer({ chart, sites }) {
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const fieldData = {};
  sites.forEach(s => {
    const key = s[chart.field] || 'N/A';
    fieldData[key] = (fieldData[key] || 0) + 1;
  });

  let sorted = Object.entries(fieldData).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

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

  const getSubGroups = (primaryLabel) => {
    if (!chart.secondaryField) return null;
    const subData = {};
    sites.filter(s => (s[chart.field] || 'N/A') === primaryLabel).forEach(s => {
      const subKey = s[chart.secondaryField] || 'N/A';
      subData[subKey] = (subData[subKey] || 0) + 1;
    });
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
    case 'bar-horizontal':
      return (
        <div>
          {selectedFilter && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Filtered:</span>
              <span className="px-2 py-0.5 text-xs bg-[#0038A8] text-white rounded-full">{selectedFilter}</span>
              <button onClick={() => handleClick(null)} className="text-xs text-red-500 hover:underline">Clear</button>
            </div>
          )}
          <div className="space-y-3">
            {sorted.slice(0, cap(10)).map(([label, count], i) => {
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={label}>
                  <Tooltip label={label} count={count} percent={pct}>
                    <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleClick(label)}>
                      <span className="w-40 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
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
        </div>
      );
    case 'bar-vertical':
      return (
        <div className="flex items-end gap-2 h-48">
          {sorted.slice(0, cap(8)).map(([label, count], i) => {
            const pct = ((count / total) * 100).toFixed(1);
            return (
              <Tooltip key={label} label={label} count={count} percent={pct}>
                <div className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleClick(label)}>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{count}</span>
                  <div className="w-full rounded-t-lg transition-all"
                    style={{ height: `${(count / max) * 100}%`, backgroundColor: selectedFilter === label ? '#0038A8' : COLORS[i % COLORS.length], minHeight: '20px' }} />
                  <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{label}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
    case 'bar-stacked':
      return (
        <div className="space-y-3">
          {sorted.slice(0, cap(6)).map(([label, count], i) => {
            const subGroups = getSubGroups(label) || [];
            return (
              <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="w-32 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
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
      );
    case 'bar-grouped':
      return (
        <div className="flex items-end gap-4 h-48">
          {sorted.slice(0, cap(6)).map(([label, count], i) => {
            const subGroups = getSubGroups(label) || [];
            return (
              <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80"
                  onClick={() => handleClick(label)}>
                  <div className="w-full flex items-end gap-1 h-40">
                    <div className="flex-1 rounded-t" style={{ height: `${(count / max) * 100}%`, backgroundColor: COLORS[0], minHeight: '10px' }} />
                    {subGroups.slice(0, 1).map(([_, subCount]) => (
                      <div key={_} className="flex-1 rounded-t" style={{ height: `${(subCount / max) * 100}%`, backgroundColor: COLORS[1], minHeight: '10px' }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{label}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
    case 'line': {
      // Divisor must match the actual point count, not a hardcoded 8-1 — otherwise
      // fewer categories (say 5) bunch up on the left instead of spanning the chart.
      const points = sorted.slice(0, cap(8));
      const divisor = Math.max(points.length - 1, 1);
      return (
        <div>
          <div className="h-48 relative">
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
                squash circles into ellipses. Fixed pixel size stays circular. */}
            {points.map(([label, count], i) => {
              const x = (i / divisor) * 100;
              const y = 100 - (count / max) * 90;
              return (
                <div key={label}
                  className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%`, backgroundColor: COLORS[0] }}
                  onClick={() => handleClick(label)}
                  onMouseEnter={() => setHoveredItem({ label, count, percent: pctOf(count), x, y })}
                  onMouseLeave={() => setHoveredItem(null)} />
              );
            })}
            <HoverTooltip />
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
              {points.map(([label]) => (
                <span key={label} className="text-[9px] text-gray-500 truncate max-w-[60px]">{label}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }
    case 'area': {
      const points = sorted.slice(0, cap(8));
      const divisor = Math.max(points.length - 1, 1);
      return (
        <div className="h-48 relative">
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
          {/* Plain HTML dots, not SVG <circle> — see the line-chart case for why. */}
          {points.map(([label, count], i) => {
            const x = (i / divisor) * 100;
            const y = 100 - (count / max) * 90;
            return (
              <div key={label}
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-800 cursor-pointer"
                style={{ left: `${x}%`, top: `${y}%`, backgroundColor: COLORS[0] }}
                onClick={() => handleClick(label)}
                onMouseEnter={() => setHoveredItem({ label, count, percent: pctOf(count), x, y })}
                onMouseLeave={() => setHoveredItem(null)} />
            );
          })}
          <HoverTooltip />
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
            {points.map(([label]) => (
              <span key={label} className="text-[9px] text-gray-500 truncate max-w-[60px]">{label}</span>
            ))}
          </div>
        </div>
      );
    }
    case 'pie':
    case 'donut': {
      const slices = withOthers(cap(8));
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
          <div className="space-y-1.5">
            {slices.map(([label, count], i) => (
              <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{label}</span>
                  <span className="text-xs font-bold ml-auto">{count}</span>
                </div>
              </Tooltip>
            ))}
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
                    onMouseEnter={() => setHoveredItem({ label, count, percent: pctOf(count), x: x / 2, y: y / 2 })}
                    onMouseLeave={() => setHoveredItem(null)}>
                    <circle cx={x} cy={y} r="8" fill="transparent" />
                    <circle cx={x} cy={y} r="4" fill={COLORS[0]} stroke="white" strokeWidth="2" />
                    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                      className="text-[8px] fill-gray-600 dark:fill-gray-400">
                      {label}
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
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left py-1.5 px-2 font-semibold text-gray-600">#</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-600">Name</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-600">Count</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-600">%</th>
            </tr></thead>
            <tbody>
              {sorted.slice(0, cap(8)).map(([label, count], i) => (
                <tr key={label} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => handleClick(label)}>
                  <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                  <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{label}</td>
                  <td className="py-1.5 px-2 text-right font-bold">{count}</td>
                  <td className="py-1.5 px-2 text-right text-gray-500">{((count / total) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-2 gap-2">
          {sorted.slice(0, cap(4)).map(([label, count], i) => (
            <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
              <div className="rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${COLORS[i % COLORS.length]}10` }}
                onClick={() => handleClick(label)}>
                <p className="text-xl font-black" style={{ color: COLORS[i % COLORS.length] }}>{count}</p>
                <p className="text-[10px] text-gray-500 truncate">{label}</p>
              </div>
            </Tooltip>
          ))}
        </div>
      );
    case 'list':
      return (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sorted.slice(0, cap(10)).map(([label, count], i) => (
            <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
              <div className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded"
                onClick={() => handleClick(label)}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </div>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                <span className="text-xs text-gray-400">{((count / total) * 100).toFixed(1)}%</span>
              </div>
            </Tooltip>
          ))}
        </div>
      );
    case 'progress':
      return (
        <div className="space-y-4">
          {sorted.slice(0, cap(8)).map(([label, count], i) => (
            <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
              <div className="cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  <span className="text-sm font-bold">{count} <span className="text-xs text-gray-400">({((count / total) * 100).toFixed(1)}%)</span></span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      );
    case 'treemap': {
      const slices = withOthers(cap(10));
      return (
        <div className="grid grid-cols-6 gap-1 auto-rows-[60px]">
          {slices.map(([label, count], i) => {
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
              <Tooltip key={label} label={label} count={count} percent={pct.toFixed(1)}
                style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` }}>
                <div
                  className={`h-full w-full rounded-lg flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${isShort ? 'p-2' : 'p-3'}`}
                  style={{
                    backgroundColor: `${colorFor(label, i)}15`,
                    borderLeft: `4px solid ${colorFor(label, i)}`,
                  }}
                  onClick={() => handleClick(label)}
                >
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate leading-tight">{label}</span>
                  <div className="leading-tight">
                    <span className={isShort ? 'text-sm font-bold' : 'text-xl font-black'} style={{ color: colorFor(label, i) }}>{count}</span>
                    <span className="text-[10px] text-gray-400 ml-1">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
    }
    case 'comparison':
      return (
        <div className="space-y-4">
          {sorted.slice(0, cap(6)).map(([label, count], i) => {
            const subGroups = getSubGroups(label) || [];
            const subMax = subGroups[0]?.[1] || 1;
            return (
              <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-lg"
                  onClick={() => handleClick(label)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                  {subGroups.length > 0 ? (
                    <div className="space-y-1">
                      {subGroups.slice(0, 3).map(([subLabel, subCount]) => (
                        <div key={subLabel} className="flex items-center gap-2">
                          <span className="w-24 text-[11px] text-gray-500 truncate">{subLabel}</span>
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
      );
    case 'funnel': {
      const items = sorted.slice(0, cap(8));
      const taperStep = 65 / Math.max(items.length - 1, 1);
      return (
        <div className="flex flex-col items-center gap-2 py-4">
          {items.map(([label, count], i) => {
            const pct = ((count / max) * 100).toFixed(1);
            const width = Math.max(30, 100 - (i * taperStep));
            return (
              <Tooltip key={label} label={label} count={count} percent={pct}>
                <div
                  className="h-10 rounded-lg flex items-center justify-between px-4 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ width: `${width}%`, backgroundColor: `${COLORS[i % COLORS.length]}20`, borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}
                  onClick={() => handleClick(label)}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
                  <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{count}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      );
    }
    case 'half-donut': {
      const slices = withOthers(cap(6));
      let halfAcc = 0;
      const halfGrad = slices.map(([label, count], i) => {
        const pct = (count / total) * 100;
        const start = halfAcc;
        halfAcc += pct;
        return `${colorFor(label, i)} ${start}% ${halfAcc}%`;
      }).join(', ');
      return (
        <div className="flex flex-col items-center">
          <div className="w-40 h-20 overflow-hidden relative">
            <div className="w-40 h-40 rounded-full" style={{ background: `conic-gradient(${halfGrad})` }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-white dark:bg-gray-800 flex items-end justify-center pb-2">
                <div className="text-center">
                  <p className="text-xl font-black text-gray-900 dark:text-white">{total}</p>
                  <p className="text-[8px] text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {slices.map(([label, count], i) => (
              <Tooltip key={label} label={label} count={count} percent={((count / total) * 100).toFixed(1)}>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      );
    }
    case 'horizontal-stack': {
      const slices = withOthers(cap(6));
      return (
        <div>
          <div className="h-12 rounded-lg overflow-hidden flex bg-gray-100 dark:bg-gray-700">
            {slices.map(([label, count], i) => {
              const pct = (count / total) * 100;
              return (
                <Tooltip key={label} label={label} count={count} percent={pct.toFixed(1)}>
                  <div
                    className="h-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${pct}%`, backgroundColor: colorFor(label, i) }}
                    onClick={() => handleClick(label)}
                  >
                    {pct > 8 && <span className="text-[10px] font-bold text-white">{count}</span>}
                  </div>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {slices.map(([label, count], i) => (
              <div key={label} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => handleClick(label)}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorFor(label, i) }} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{label} ({count})</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
  };

  const [topLabel, topCount] = sorted[0];
  return (
    <div>
      {renderChart()}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-[10px] text-gray-400">
        <span>{sorted.length.toLocaleString()} {sorted.length === 1 ? 'category' : 'categories'} · {total.toLocaleString()} total</span>
        <span className="truncate">{topLabel} leads with {((topCount / total) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

// Wrapper for draggable chart
function DraggableChart({ id, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, children, title, subtitle, onEdit, onDelete, onToggleVisibility, showOnUser, isCustom, dataSource, onDataSourceChange }) {
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
              <select value={dataSource} onChange={(e) => onDataSourceChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                title="Data source"
                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Edit">
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
        <div className="p-4">
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

// Non-Free-Wi-Fi only: "tag" which of this project's own Datasets tables feeds each of
// the Summary/Map/Breakdown built-ins (independently — same table or three different
// ones, admin's call), which of that table's columns power it, and its title. The
// generic equivalent of Free Wi-Fi's per-built-in DATA_SOURCES picker.
function DataSourceModal({ tables, initial, builtInTitles, onSave, onClose }) {
  // Summary Card
  const [summaryDatasetId, setSummaryDatasetId] = useState(initial?.summary_dataset || '');
  const [summaryTitle, setSummaryTitle] = useState(initial?.summary_title || '');
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

  // Breakdown
  const [breakdownDatasetId, setBreakdownDatasetId] = useState(initial?.breakdown_dataset || '');
  const [breakdownTitle, setBreakdownTitle] = useState(initial?.breakdown_title || '');
  const [groupField, setGroupField] = useState(initial?.group_field || '');
  // Columns shown in the Breakdown widget's raw-data table. Empty = show every column
  // (unlike tooltipFields, since this preserves the pre-existing "show everything" default).
  const [breakdownFields, setBreakdownFields] = useState(initial?.breakdown_fields || []);

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
  const toggleBreakdownField = (name) => {
    setBreakdownFields(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  const addSummaryTile = () => setSummaryFields(prev => [...prev, { field: '', agg: 'distinct', equals: '', label: '' }]);
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
        summary_fields: summaryFields.filter(t => t.agg === 'count' || t.field),
        map_dataset: mapDatasetId ? Number(mapDatasetId) : null,
        map_title: mapTitle,
        latitude_field: latField,
        longitude_field: combinedCoords ? latField : lngField,
        tooltip_fields: tooltipFields,
        breakdown_dataset: breakdownDatasetId ? Number(breakdownDatasetId) : null,
        breakdown_title: breakdownTitle,
        group_field: groupField,
        breakdown_fields: breakdownFields,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Data Source</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Each widget below can pull from a different one of this project's Datasets
            tables — or the same one — entirely independently.
          </p>

          {/* Summary Card */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Summary Card</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} placeholder={builtInTitles.summary}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <select value={summaryDatasetId} onChange={(e) => { setSummaryDatasetId(e.target.value); setSummaryFields([]); }}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                <option value="">Select table...</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

            {summaryTable && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Tiles</label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Drag <GripVertical size={10} className="inline -mt-0.5" /> to reorder — the top tile is the
                  big lead number. Click <Star size={10} className="inline -mt-0.5" /> on any other tile to make
                  it the highlighted one (defaults to the bottom tile if none is starred). E.g. to reproduce Free
                  Wi-Fi's card: "R10 Site ID" → Count unique values → "Total Active Locations" (top/lead),
                  "Locality" → Count unique values → "Municipalities", "Province" → Count unique values →
                  "Total Province", "Barangay" → Count unique values → "Barangays", "AP" → Count rows where
                  equals "TRUE" → "Total Active APs" (starred/highlighted). Leave empty to just show a row count.
                </p>
                <div className="space-y-2">
                  {summaryFields.map((t, i) => (
                    <div key={i}
                      onDragOver={handleTileDragOver}
                      onDrop={() => handleTileDrop(i)}
                      className={`flex flex-wrap items-center gap-2 p-2 border rounded-lg transition-colors ${
                        dragTileIndex === i ? 'border-[#0038A8] opacity-60' : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <span draggable
                        onDragStart={() => setDragTileIndex(i)}
                        onDragEnd={() => setDragTileIndex(null)}
                        className="cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                        <GripVertical size={14} className="text-gray-400" />
                      </span>
                      <select value={t.field} disabled={t.agg === 'count'} onChange={(e) => updateSummaryTile(i, { field: e.target.value })}
                        className="flex-1 min-w-[110px] px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800 disabled:opacity-40">
                        <option value="">Select column...</option>
                        {summaryTableFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                      </select>
                      <select value={t.agg} onChange={(e) => updateSummaryTile(i, { agg: e.target.value })}
                        className="px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800">
                        <option value="distinct">Count unique values</option>
                        <option value="count_equals">Count rows where equals...</option>
                        <option value="sum">Sum values</option>
                        <option value="count">Count all rows</option>
                      </select>
                      {t.agg === 'count_equals' && (
                        <input value={t.equals || ''} onChange={(e) => updateSummaryTile(i, { equals: e.target.value })}
                          placeholder="e.g. TRUE" className="w-20 px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800" />
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
                  ))}
                  <button type="button" onClick={addSummaryTile}
                    className="text-xs font-medium text-[#0038A8] dark:text-blue-400 hover:underline">
                    + Add tile
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Map</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={mapTitle} onChange={(e) => setMapTitle(e.target.value)} placeholder={builtInTitles.map}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <select value={mapDatasetId}
                onChange={(e) => { setMapDatasetId(e.target.value); setLatField(''); setLngField(''); setCombinedCoords(false); setTooltipFields([]); }}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                <option value="">Select table...</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

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
                      <select value={latField} onChange={(e) => setLatField(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                        <option value="">None</option>
                        {mapTableFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">Value should be "latitude, longitude" — e.g. 8.486735683, 124.6322367</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Latitude column</label>
                        <select value={latField} onChange={(e) => setLatField(e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                          <option value="">None</option>
                          {mapTableFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Longitude column</label>
                        <select value={lngField} onChange={(e) => setLngField(e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                          <option value="">None</option>
                          {mapTableFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                        </select>
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
              </>
            )}
          </div>

          {/* Breakdown */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Breakdown</h4>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input value={breakdownTitle} onChange={(e) => setBreakdownTitle(e.target.value)} placeholder={builtInTitles['province-breakdown']}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
              <select value={breakdownDatasetId}
                onChange={(e) => { setBreakdownDatasetId(e.target.value); setGroupField(''); setBreakdownFields([]); }}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                <option value="">Select table...</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tables.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Create a table under the Datasets tab first.</p>}
            </div>

            {breakdownTable && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">"Group by" column</label>
                  <select value={groupField} onChange={(e) => setGroupField(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                    <option value="">None</option>
                    {breakdownTableFields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                  </select>
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
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);

  const recordsByDataset = useMemo(() => {
    const map = {};
    genericTables.forEach((t) => { map[t.id] = (t.rows || []).map((r) => ({ id: r.id, ...(r.values || {}) })); });
    return map;
  }, [genericTables]);

  // Field list for the custom-chart builder: Free Wi-Fi's fixed list, or whichever table
  // a given chart is pointed at (each project can have several Datasets tables, unlike
  // Free Wi-Fi where custom charts implicitly always read Live Sites).
  const availableFieldsFor = (datasetId) => {
    if (isFreeWifi) return FREEWIFI_AVAILABLE_FIELDS;
    const table = genericTables.find((t) => t.id === Number(datasetId));
    return (table?.fields || []).map((f) => ({ value: f.name, label: f.label }));
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
    gridSize: 'full', showOnUser: true, showAllCategories: false, dataset: '',
  });

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
    ])
      .then(([id, tables, source, configs]) => {
        setOfficeId(id);
        setGenericTables(tables);
        setChartSource(source);
        setDatasets(buildTaggedRecords(tables, source));
        setAllCharts(sanitizeCharts(configs.map(chartConfigFromBackend)));
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
    fields.forEach(f => {
      const values = new Set();
      records.forEach(s => values.add(s[f.value] ?? 'N/A'));
      map[f.value] = values.size;
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
      const saved = isFreeWifi
        ? (isBackedChart ? await updateFreeWifiChartConfig(editingChart.id, payload) : await createFreeWifiChartConfig(payload))
        : (isBackedChart ? await updateProjectChartConfig(editingChart.id, payload) : await createProjectChartConfig(payload));
      const chart = chartConfigFromBackend(saved);
      if (editingChart) {
        setAllCharts(prev => prev.map(c => c.id === editingChart.id ? chart : c));
      } else {
        setAllCharts(prev => [...prev, chart]);
      }
      setShowAddChart(false);
      setEditingChart(null);
      setNewChart({ title: '', field: isFreeWifi ? 'province' : '', secondaryField: '', chartType: 'bar-horizontal', gridSize: 'full', showOnUser: true, showAllCategories: false, dataset: '' });
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSavingChart(false);
    }
  };

  const handleDeleteChart = async (id) => {
    if (!confirm('Delete this chart?')) return;
    setAllCharts(prev => prev.filter(c => c.id !== id));
    if (typeof id === 'number') {
      const del = isFreeWifi ? deleteFreeWifiChartConfig(id) : deleteProjectChartConfig(id);
      del.catch(() => alert('Failed to delete on the server — it may reappear on next reload.'));
    }
  };

  const toggleVisibility = (id) => {
    setAllCharts(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    if (!isFreeWifi && typeof id === 'number') {
      const chart = allCharts.find(c => c.id === id);
      updateProjectChartConfig(id, { visible: !chart?.visible }).catch(console.error);
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
      // above. Other projects have no such fallback, so persist custom charts' relative
      // order to the backend here (built-ins have no order of their own to save).
      if (!isFreeWifi) {
        const customOrder = arr.filter(c => c.type === 'custom').map((c, i) => ({ id: c.id, order: i }));
        if (customOrder.length) reorderProjectChartConfigs(customOrder).catch(console.error);
      }
      return arr;
    });
    setDragIndex(null);
  };
  // Dropped outside any card (or drag cancelled) never fires onDrop — reset here so the
  // dragged card doesn't stay stuck looking "lifted" (dimmed/scaled) forever.
  const handleDragEnd = () => setDragIndex(null);

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
              <span className="text-sm font-medium">{today}</span>
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
        const { mapped, tooltipFieldDefs } = resolveMapSites(records, source, taggedFields);
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
            <div className="-m-4"><FreeWifiMap sites={filteredMapped} totalAPs={filteredMapped.length} height="500px" tooltipFields={tooltipFieldDefs} /></div>
          </div>
        );
      }
      case 'province-breakdown': {
        if (!source.group_field) {
          return <div className="py-16 text-center text-sm text-gray-400">No "group by" column tagged yet — set one via "Data Source" above.</div>;
        }
        const records = breakdownSites;
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
                    className="w-full flex items-center gap-4 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-left font-medium text-gray-900 dark:text-white w-[200px] truncate">{group}</span>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0038A8]" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right shrink-0">{count} rows</span>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Charts</h2>
        <div className="flex items-center gap-2">
          {!isFreeWifi && (
            <button onClick={() => setShowDataSourceModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:border-[#0038A8]">
              <Database size={16} />
              {(chartSource?.summary_dataset || chartSource?.map_dataset || chartSource?.breakdown_dataset) ? 'Data Source' : 'Set Data Source'}
            </button>
          )}
          <button onClick={() => setShowAddChart(true)} disabled={!isFreeWifi && genericTables.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
            <Plus size={16} /> Add Custom Chart
          </button>
        </div>
      </div>

      {!isFreeWifi && showDataSourceModal && (
        <DataSourceModal
          tables={genericTables}
          initial={chartSource}
          builtInTitles={builtInTitles}
          onClose={() => setShowDataSourceModal(false)}
          onSave={async (draft) => {
            try {
              const saved = await updateProjectChartSource(slug, draft);
              setChartSource(saved);
              setDatasets(buildTaggedRecords(genericTables, saved));
              setShowDataSourceModal(false);
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
                {/* Chart Type Selection */}
                <div className="mb-5">
                  <div className="grid grid-cols-5 gap-2">
                    {CHART_TYPES.map((type) => {
                      const count = fieldCardinality[newChart.field] || 0;
                      const fit = getChartFit(type, count);
                      const isDisabled = fit.status === 'disabled';
                      const isRecommended = !isDisabled && recommendChartTypes(count).includes(type.id);
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

            {/* Chart Settings */}
            <div className="space-y-4">
              {/* Chart Type Info */}
              {(() => {
                const selectedType = CHART_TYPES.find(t => t.id === newChart.chartType);
                if (!selectedType) return null;
                const count = fieldCardinality[newChart.field] || 0;
                const fit = getChartFit(selectedType, count);
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    <p className="font-bold mb-1">{selectedType.label}</p>
                    <p>
                      {selectedType.needsSecondary
                        ? 'This chart works best with a secondary field for grouping.'
                        : 'This chart uses a single field to display data.'}
                      {selectedType.maxItems && ` Shows up to ${selectedType.maxItems} items.`}
                    </p>
                    {fit.status === 'disabled' && (
                      <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">{fit.reason}</p>
                    )}
                    {fit.status === 'partial' && (
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
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Table</label>
                  <select value={newChart.dataset}
                    onChange={(e) => setNewChart(c => ({ ...c, dataset: e.target.value, field: '', secondaryField: '' }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                    <option value="">Select table...</option>
                    {genericTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
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
                <select value={newChart.field} disabled={!isFreeWifi && !newChart.dataset}
                  onChange={(e) => {
                    const field = e.target.value;
                    const count = fieldCardinality[field] || 0;
                    setNewChart(c => ({ ...c, field, chartType: bestChartType(count, c.chartType) }));
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50">
                  {!isFreeWifi && <option value="">Select field...</option>}
                  {availableFieldsFor(newChart.dataset).map(f => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({fieldCardinality[f.value] || 0} {(fieldCardinality[f.value] || 0) === 1 ? 'value' : 'values'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Show secondary field only for charts that need it */}
              {CHART_TYPES.find(t => t.id === newChart.chartType)?.needsSecondary && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    Secondary Field <span className="text-gray-400">(for grouping/breakdown)</span>
                  </label>
                  <select value={newChart.secondaryField} onChange={(e) => setNewChart(c => ({ ...c, secondaryField: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                    <option value="">None</option>
                    {availableFieldsFor(newChart.dataset).filter(f => f.value !== newChart.field).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Grid Size</label>
                  <select value={newChart.gridSize} onChange={(e) => setNewChart(c => ({ ...c, gridSize: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                    {GRID_SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 min-h-[400px]">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                    {newChart.title || 'Chart Title'}
                  </h4>
                  <CustomChartRenderer
                    chart={{ ...newChart, id: 'preview' }}
                    sites={isFreeWifi ? sites : (recordsByDataset[Number(newChart.dataset)] || [])}
                  />
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
                <span className="text-sm font-medium">{today}</span>
              </div>
              {renderSummaryCardBody(
                computeSummaryTiles(summarySites, chartSource, genericTables.find(t => t.id === chartSource?.summary_dataset)?.fields || []),
                draft
              )}
            </div>
          )}
        />
      )}

      {/* All Charts (Draggable) */}
      <div className="grid grid-cols-12 gap-6">
        {allCharts.map((chart, index) => {
          const isCustom = chart.type === 'custom';
          const gridSize = isCustom ? (chart.gridSize === 'half' ? 'col-span-12 lg:col-span-6' : 'col-span-12') : 'col-span-12';
          const isHidden = !chart.visible;

          return (
            <div key={chart.id} className={`${gridSize} ${isHidden ? 'opacity-20 hover:opacity-60 transition-opacity' : ''}`}>
              <DraggableChart
                index={index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={dragIndex === index}
                title={isCustom ? chart.title : (isFreeWifi ? chart.label : builtInTitles[chart.id])}
                subtitle={
                  isHidden ? 'Hidden - Click eye to show' :
                  isCustom ? `${CHART_TYPES.find(t => t.id === chart.chartType)?.label} · ${availableFieldsFor(chart.dataset).find(f => f.value === chart.field)?.label}` : undefined
                }
                isCustom={isCustom}
                showOnUser={chart.showOnUser}
                onEdit={isCustom ? () => {
                  setNewChart({ title: chart.title, field: chart.field, secondaryField: chart.secondaryField || '', chartType: chart.chartType, gridSize: chart.gridSize, showOnUser: chart.showOnUser, showAllCategories: chart.showAllCategories || false, dataset: chart.dataset ? String(chart.dataset) : '' });
                  setEditingChart(chart);
                  setShowAddChart(true);
                } : chart.id === 'summary' ? () => setShowSummaryStyle(true) : undefined}
                onDelete={isCustom ? () => handleDeleteChart(chart.id) : undefined}
                onToggleVisibility={() => toggleVisibility(chart.id)}
                dataSource={isFreeWifi && !isCustom ? (chart.dataSource || 'live') : undefined}
                onDataSourceChange={isFreeWifi && !isCustom ? (ds) => setChartDataSource(chart.id, ds) : undefined}
              >
                {isCustom ? (
                  <CustomChartRenderer chart={chart} sites={isFreeWifi ? sites : (recordsByDataset[chart.dataset] || [])} />
                ) : (
                  renderBuiltIn(chart.id, chart.dataSource || 'live')
                )}
              </DraggableChart>
            </div>
          );
        })}
      </div>
    </div>
  );
}
