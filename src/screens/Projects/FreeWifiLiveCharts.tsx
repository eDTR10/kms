// @ts-nocheck
// Public, read-only view of the Free Wi-Fi charts. Reuses the exact same
// renderers/helpers as the Admin charts screen (screens/Admin/FreeWifi/FreeWifiCharts.tsx)
// so results always match, but only ever calls GET endpoints — no add/edit/delete/import
// affordances exist here, and no create/update/delete service functions are imported.
//
// Custom charts (built via "Add Custom Chart" in Admin) are fetched read-only from the
// FreeWifiChartConfig backend table and shown here too, filtered to showOnUser !== false —
// they're no longer admin-browser-local, so any visitor sees whatever the admin published.
//
// Which dataset each built-in chart shows (Live/Main/Target/Masterlist) is a published
// setting the admin picks on the Charts screen (KmsSettings), not something this page lets
// a visitor change — there's no selector here at all, only whatever the admin last set.
import { useEffect, useRef, useState } from 'react';
import {
  getFreeWifiLiveData, getFreeWifiMainData, getFreeWifiTargetData, getFreeWifiMasterlistData,
  getFreeWifiChartConfigs,
} from '../../services/freewifiData';
import { getKmsSettings } from '../../services/settings';
import FreeWifiMap from '../../components/FreeWifiMap';
import {
  DATA_SOURCES, PROVINCE_COLORS, normalizeMasterlistRecord,
  computeSummaryStats, computeProvinceBreakdown, ProvinceBreakdown, SummaryCard,
  CustomChartRenderer, chartConfigFromBackend,
} from '../Admin/FreeWifi/FreeWifiCharts';

// Every source is fetched the same way — plain GET, cached once, on demand.
// Each card fetches independently, so switching one card's source (or a slow
// network on one dataset) never blocks the other two cards from rendering.
const FETCHERS = {
  live: getFreeWifiLiveData,
  main: getFreeWifiMainData,
  target: getFreeWifiTargetData,
  masterlist: () => getFreeWifiMasterlistData().then(rows => rows.map(normalizeMasterlistRecord)),
};

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

function SummarySkeleton() {
  return (
    <div className="rounded-2xl p-8 bg-gray-100 dark:bg-gray-900/40 -m-4">
      <SkeletonBlock className="h-4 w-40 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="col-span-2 lg:col-span-1 space-y-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-24" />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl p-4 bg-gray-200/60 dark:bg-gray-800/60 space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="-m-4">
      <SkeletonBlock className="w-full h-[500px] rounded-none" />
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-10 w-full rounded-lg" />
      {[0, 1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );
}

function ChartSkeleton() {
  return <SkeletonBlock className="h-48 w-full" />;
}

function CardShell({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">{children}</div>
    </div>
  );
}

// Fetch-once-per-source cache shared across all three cards, so if two cards
// both point at (say) Live, only one network request goes out.
function useDatasetCache() {
  const [cache, setCache] = useState({});
  const [errored, setErrored] = useState({});
  const requestedRef = useRef(new Set());

  const ensureLoaded = (sourceId) => {
    if (requestedRef.current.has(sourceId)) return;
    requestedRef.current.add(sourceId);
    FETCHERS[sourceId]()
      .then(data => setCache(c => ({ ...c, [sourceId]: data })))
      .catch(() => setErrored(e => ({ ...e, [sourceId]: true })));
  };

  return { cache, errored, ensureLoaded };
}

export default function FreeWifiLiveCharts() {
  const { cache, errored, ensureLoaded } = useDatasetCache();
  const [summarySource, setSummarySource] = useState('live');
  const [mapSource, setMapSource] = useState('live');
  const [breakdownSource, setBreakdownSource] = useState('live');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [customCharts, setCustomCharts] = useState(null);
  const [customChartsError, setCustomChartsError] = useState(false);
  const [summaryStyle, setSummaryStyle] = useState({ colorFrom: '#0038A8', colorTo: '#0055f1', orientation: 'row', accentColor: '#FCD116' });

  // Read-only: pull each built-in's admin-chosen source (and the Summary card's
  // admin-chosen color/layout) from published settings. No selector for any of this here —
  // whatever the admin set on the Charts screen is exactly what shows.
  useEffect(() => {
    getKmsSettings().then(settings => {
      if (settings.freewifi_summary_source) setSummarySource(settings.freewifi_summary_source);
      if (settings.freewifi_map_source) setMapSource(settings.freewifi_map_source);
      if (settings.freewifi_breakdown_source) setBreakdownSource(settings.freewifi_breakdown_source);
      setSummaryStyle({
        colorFrom: settings.freewifi_summary_color_from || '#0038A8',
        colorTo: settings.freewifi_summary_color_to || '#0055f1',
        orientation: settings.freewifi_summary_orientation || 'row',
        accentColor: settings.freewifi_summary_accent_color || '#FCD116',
      });
    }).catch(console.error);
  }, []);

  useEffect(() => { ensureLoaded(summarySource); }, [summarySource]);
  useEffect(() => { ensureLoaded(mapSource); }, [mapSource]);
  useEffect(() => { ensureLoaded(breakdownSource); }, [breakdownSource]);
  // Custom charts always render off Live data, same as in Admin — fetch it
  // independently of whatever source the 3 built-in cards are currently on.
  useEffect(() => { ensureLoaded('live'); }, []);

  useEffect(() => {
    getFreeWifiChartConfigs()
      .then(configs => setCustomCharts(configs.map(chartConfigFromBackend).filter(c => c.showOnUser !== false)))
      .catch(() => setCustomChartsError(true));
  }, []);

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const sourceLabel = (id) => DATA_SOURCES.find(s => s.id === id)?.label;

  const summaryRecords = cache[summarySource];
  const mapRecords = cache[mapSource];
  const breakdownRecords = cache[breakdownSource];

  const stats = summaryRecords ? computeSummaryStats(summaryRecords) : null;
  const hasCoords = mapRecords ? mapRecords.some(r => r.latitude && r.longitude) : false;

  let byProvince = {}, maxSites = 1, hasApField = false, provinceEntries = [];
  if (breakdownRecords) {
    byProvince = computeProvinceBreakdown(breakdownRecords);
    maxSites = Math.max(...Object.values(byProvince).map(p => p.total_sites || 0), 1);
    hasApField = breakdownRecords.some(r => 'ap' in r);
    const query = provinceSearch.trim().toLowerCase();
    const matchesQuery = (s) =>
      s.site_name?.toLowerCase().includes(query) ||
      s.r10_site_id?.toLowerCase().includes(query) ||
      s.locality?.toLowerCase().includes(query) ||
      s.barangay?.toLowerCase().includes(query) ||
      s.province?.toLowerCase().includes(query);
    provinceEntries = Object.entries(byProvince)
      .map(([prov, data]) => ({ prov, data, siteMatch: query ? breakdownRecords.some(r => r.province === prov && matchesQuery(r)) : false }))
      .filter(({ prov, siteMatch }) => !query || prov.toLowerCase().includes(query) || siteMatch)
      .sort((a, b) => b.data.total_sites - a.data.total_sites);
  }
  const breakdownQuery = provinceSearch.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <CardShell>
        {errored[summarySource] ? (
          <p className="text-sm text-red-500 text-center py-8">Couldn't load {sourceLabel(summarySource)} data.</p>
        ) : !stats ? (
          <SummarySkeleton />
        ) : (
          <SummaryCard stats={stats} today={today} sourceLabel={sourceLabel(summarySource)}
            colorFrom={summaryStyle.colorFrom} colorTo={summaryStyle.colorTo} orientation={summaryStyle.orientation} accentColor={summaryStyle.accentColor} />
        )}
      </CardShell>

      <CardShell>
        {errored[mapSource] ? (
          <p className="text-sm text-red-500 text-center py-8">Couldn't load {sourceLabel(mapSource)} data.</p>
        ) : !mapRecords ? (
          <MapSkeleton />
        ) : hasCoords ? (
          <div className="-m-4">
            <FreeWifiMap sites={mapRecords} totalAPs={mapRecords.length} height="500px" />
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-gray-400">
            No coordinate data available for {sourceLabel(mapSource)}
          </div>
        )}
      </CardShell>

      <CardShell>
        {errored[breakdownSource] ? (
          <p className="text-sm text-red-500 text-center py-8">Couldn't load {sourceLabel(breakdownSource)} data.</p>
        ) : !breakdownRecords ? (
          <BreakdownSkeleton />
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input type="text" placeholder="Search by site name, ID, locality, barangay, or province..."
                value={provinceSearch} onChange={(e) => setProvinceSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
            </div>
            {breakdownQuery && provinceEntries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No matches for "{provinceSearch}"</p>
            )}
            {provinceEntries.map(({ prov, data, siteMatch }) => (
              <ProvinceBreakdown key={prov} province={prov} data={data} sites={breakdownRecords}
                color={PROVINCE_COLORS[prov] || '#6b7280'} maxSites={maxSites} hasApField={hasApField}
                externalSearch={siteMatch ? breakdownQuery : ''} />
            ))}
          </div>
        )}
      </CardShell>

      {customChartsError ? null : !customCharts || customCharts.length === 0 ? null : (
        <div className="grid grid-cols-12 gap-6">
          {customCharts.map(chart => (
            <div key={chart.id} className={chart.gridSize === 'half' ? 'col-span-12 lg:col-span-6' : 'col-span-12'}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">{chart.title}</h3>
                </div>
                <div className="p-4">
                  {cache.live ? <CustomChartRenderer chart={chart} sites={cache.live} /> : <ChartSkeleton />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
