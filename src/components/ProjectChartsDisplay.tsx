// @ts-nocheck
import { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { getProjectChartConfigs, getProjectChartSource, getProjectDatasets } from '../services/projects';
import {
  buildTaggedRecords, resolveMapSites, computeSummaryTiles, renderSummaryCardBody,
  chartConfigFromBackend, CustomChartRenderer,
} from '../screens/Admin/FreeWifi/FreeWifiCharts';
import FreeWifiMap from './FreeWifiMap';
import { Skeleton } from '../screens/Admin/Skeleton';

const RAW_DATA_PAGE_SIZE = 50;

// Public-page Breakdown accordion — same visual language and raw-data table as the admin
// widget, minus the admin-only "clicking a row also filters the Map" cross-widget wiring
// (self-contained here since nothing else needs to react to which group is open).
function PublicBreakdown({ records, source, taggedFields }) {
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
        const totalPages = Math.max(1, Math.ceil(filteredRows.length / RAW_DATA_PAGE_SIZE));
        const clampedPage = Math.min(page, totalPages);
        const pageRows = filteredRows.slice((clampedPage - 1) * RAW_DATA_PAGE_SIZE, clampedPage * RAW_DATA_PAGE_SIZE);
        return (
          <div key={group} className={`border rounded-xl overflow-hidden transition-colors ${
            isOpen ? 'border-[#0038A8]' : 'border-gray-200 dark:border-gray-700'
          }`}>
            <button type="button" onClick={() => toggleGroup(group)}
              className="w-full flex items-center gap-4 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-left font-medium text-gray-900 dark:text-white w-[200px] truncate">{group}</span>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#0038A8]" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right shrink-0">{count} rows</span>
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

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Stand-in for Summary/Map/Breakdown while the three chart requests are in flight -
// shaped like the cards that are about to replace it (exact section count/order settles
// once the config loads, so this is a plausible best guess, not a precise match).
function ChartsSkeleton() {
  return (
    <div className="space-y-6 mb-10">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-8">
          <Skeleton className="h-4 w-40 mb-6" />
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Public-facing Charts section for a project page — Summary Card, Map, and Breakdown
 * (whichever the admin has tagged a dataset for) plus any custom chart marked visible for
 * the public, all sourced from the same ProjectChartConfig/ProjectChartSource data the
 * admin Charts screen manages, so this always matches what the admin last published.
 * Renders nothing if the project hasn't configured/published anything yet. */
export default function ProjectChartsDisplay({ slug }) {
  const [loading, setLoading] = useState(true);
  const [chartSource, setChartSource] = useState(null);
  const [tables, setTables] = useState([]);
  const [customCharts, setCustomCharts] = useState([]);

  useEffect(() => {
    Promise.all([getProjectChartSource(slug), getProjectDatasets(slug), getProjectChartConfigs(slug)])
      .then(([source, ds, configs]) => {
        setChartSource(source);
        setTables(ds);
        setCustomCharts(
          configs.map(chartConfigFromBackend).filter(c => c.visible !== false && c.showOnUser !== false)
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <ChartsSkeleton />;

  const source = chartSource || {};
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const { summary: summaryRecords, map: mapRecords, breakdown: breakdownRecords } = buildTaggedRecords(tables, source);

  const summaryTaggedFields = tables.find(t => t.id === source.summary_dataset)?.fields || [];
  const hasSummary = Boolean(source.summary_dataset);

  const mapTaggedFields = tables.find(t => t.id === source.map_dataset)?.fields || [];
  const { mapped, tooltipFieldDefs } = resolveMapSites(mapRecords, source, mapTaggedFields);
  const hasMap = Boolean(source.map_dataset && source.latitude_field && source.longitude_field && mapped.length);

  const breakdownTaggedFields = tables.find(t => t.id === source.breakdown_dataset)?.fields || [];
  const hasBreakdown = Boolean(source.breakdown_dataset && source.group_field && breakdownRecords.length);

  const recordsByDataset = {};
  tables.forEach(t => { recordsByDataset[t.id] = (t.rows || []).map(r => ({ id: r.id, ...(r.values || {}) })); });

  if (!hasSummary && !hasMap && !hasBreakdown && customCharts.length === 0) return null;

  return (
    <div className="space-y-6 mb-10">
      {hasSummary && (
        <ChartCard title={source.summary_title || 'Summary'}>
          <div className="rounded-2xl p-8 text-white -m-4"
            style={{ background: `linear-gradient(135deg, ${source.color_from || '#0038A8'}, ${source.color_to || '#0055f1'})` }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-white/70">SUMMARY</span>
              <span className="text-sm text-white/50">as of</span>
              <span className="text-sm font-medium">{today}</span>
            </div>
            {renderSummaryCardBody(
              computeSummaryTiles(summaryRecords, source, summaryTaggedFields),
              {
                colorFrom: source.color_from || '#0038A8',
                colorTo: source.color_to || '#0055f1',
                orientation: source.orientation || 'row',
                accentColor: source.accent_color || '#FCD116',
              }
            )}
          </div>
        </ChartCard>
      )}

      {hasMap && (
        <ChartCard title={source.map_title || 'Map'}>
          <div className="-m-4">
            <FreeWifiMap sites={mapped} totalAPs={mapped.length} height="500px" tooltipFields={tooltipFieldDefs} />
          </div>
        </ChartCard>
      )}

      {hasBreakdown && (
        <ChartCard title={source.breakdown_title || 'Breakdown'}>
          <PublicBreakdown records={breakdownRecords} source={source} taggedFields={breakdownTaggedFields} />
        </ChartCard>
      )}

      {customCharts.map(chart => (
        <ChartCard key={chart.id} title={chart.title}>
          <CustomChartRenderer chart={chart} sites={recordsByDataset[chart.dataset] || []} />
        </ChartCard>
      ))}
    </div>
  );
}
