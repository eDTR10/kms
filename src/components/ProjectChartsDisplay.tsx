// @ts-nocheck
import { useEffect, useState } from 'react';
import { getProjectChartConfigs, getProjectChartSource, getProjectDatasets, getProjectBuiltinWidgets } from '../services/projects';
import {
  buildTaggedRecords, resolveMapSites, computeSummaryTiles, renderSummaryCardBody,
  chartConfigFromBackend, CustomChartRenderer, GlobalDateFilterBar,
  sortByChartOrder, gridSizeClass, filterRecordsByConditions,
  filterTablesByGeneralFilter, generalFilterOptionsFor, summaryAsOfLabel,
  mergeReferencedFields, combineChartRecords, BreakdownAccordion,
  builtinWidgetFromBackend, builtinWidgetTitle, DEFAULT_SUMMARY_STYLE,
} from '../screens/Admin/FreeWifi/FreeWifiCharts';
import FreeWifiMap from './FreeWifiMap';
import { Skeleton } from '../screens/Admin/Skeleton';

// `hideTitle` (chart.hideTitle — custom charts only) drops the header entirely, for when
// the number/chart already speaks for itself. The admin's own preview (DraggableChart in
// FreeWifiCharts.tsx) never hides it, same as `visible`/`show_on_user` — this only affects
// the public page.
// `noPadding` (the 'image-bg' Value Card design) drops the p-4 content padding so the photo
// fills the card edge-to-edge instead of floating inside a padded white/dark inset — that
// inset was this wrapper's own padding + background showing around the image-bg div's own
// rounded corners, not anything coming from the image itself.
function ChartCard({ title, hideTitle, noPadding, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {!hideTitle && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
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
  const [builtinWidgets, setBuiltinWidgets] = useState([]);
  // Visitor-facing filters — { [label]: {from,to} for a 'range' filter | string for an
  // 'exact' one }, same tagged-per-table mechanism the admin preview uses (see
  // FreeWifiCharts.tsx). Local to this page load; not persisted. Only shows/does anything
  // once source.general_filters has entries.
  const [generalFilterValues, setGeneralFilterValues] = useState({});

  useEffect(() => {
    Promise.all([getProjectChartSource(slug), getProjectDatasets(slug), getProjectChartConfigs(slug), getProjectBuiltinWidgets(slug)])
      .then(([source, ds, configs, widgets]) => {
        setChartSource(source);
        setTables(ds);
        setCustomCharts(
          configs.map(chartConfigFromBackend).filter(c => c.visible !== false && c.showOnUser !== false)
        );
        setBuiltinWidgets(
          widgets.map(builtinWidgetFromBackend).filter(w => w.visible !== false && w.showOnUser !== false)
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <ChartsSkeleton />;

  const source = chartSource || {};
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const generalFilterLabels = source.general_filters || [];
  const filteredTables = filterTablesByGeneralFilter(tables, generalFilterLabels, generalFilterValues);
  const generalFilterOptions = generalFilterOptionsFor(tables, generalFilterLabels);
  // The Summary Card's "as of" label reflects whichever range-type filter is currently
  // active (if any) — see the matching logic in FreeWifiCharts.tsx's admin preview.
  const activeRangeFilter = generalFilterLabels.find(
    (f) => f.type === 'range' && (generalFilterValues[f.label]?.from || generalFilterValues[f.label]?.to)
  );
  const summaryDateFrom = activeRangeFilter ? (generalFilterValues[activeRangeFilter.label]?.from || '') : '';
  const summaryDateTo = activeRangeFilter ? (generalFilterValues[activeRangeFilter.label]?.to || '') : '';

  const { summary: summaryRecords, map: mapRecords, breakdown: breakdownRecords } = buildTaggedRecords(filteredTables, source);

  // Built-ins hidden from the admin's "Hidden" section (ProjectChartSource.hidden_builtins)
  // — the built-in equivalent of a custom chart's own visible/showOnUser filter above.
  const hiddenBuiltins = source.hidden_builtins || [];

  const summaryTaggedFields = filteredTables.find(t => t.id === source.summary_dataset)?.fields || [];
  const hasSummary = Boolean(source.summary_dataset) && !hiddenBuiltins.includes('summary');

  const mapTaggedFields = filteredTables.find(t => t.id === source.map_dataset)?.fields || [];
  const { mapped, tooltipFieldDefs, filterFieldDefs, colorFieldDef } = resolveMapSites(mapRecords, source, mapTaggedFields);
  const hasMap = Boolean(source.map_dataset && source.latitude_field && source.longitude_field && mapped.length) && !hiddenBuiltins.includes('map');

  const breakdownTaggedFields = filteredTables.find(t => t.id === source.breakdown_dataset)?.fields || [];
  const filteredBreakdownRecords = filterRecordsByConditions(breakdownRecords, source.breakdown_conditions);
  const hasBreakdown = Boolean(source.breakdown_dataset && source.group_field && filteredBreakdownRecords.length) && !hiddenBuiltins.includes('province-breakdown');

  const recordsByDataset = {};
  filteredTables.forEach(t => {
    const records = (t.rows || []).map(r => ({ id: r.id, ...(r.values || {}) }));
    recordsByDataset[t.id] = mergeReferencedFields(records, t.fields, filteredTables);
  });

  // Whether anything is configured at all — deliberately NOT based on post-filter record
  // counts, so a date range that (temporarily) matches nothing still leaves the filter bar
  // on screen instead of the whole section vanishing with no way to clear it.
  const isConfigured = Boolean(source.summary_dataset || source.map_dataset || source.breakdown_dataset) || customCharts.length > 0 || builtinWidgets.length > 0;
  if (!isConfigured) return null;

  // Built each visible chart as a {id, gridClass, node} so the whole set — built-ins and
  // custom alike — can be sorted by the admin's saved chart_order (see FreeWifiCharts.tsx's
  // sortByChartOrder) instead of always rendering Summary, then Map, then Breakdown, then
  // custom charts regardless of how the admin actually arranged them. gridClass mirrors the
  // admin preview's grid exactly (col-span-12 vs col-span-12 lg:col-span-6 for a custom
  // chart set to "Half Width") — this page used to just stack everything in a plain
  // space-y-6 column with no grid at all, so "Half Width" had nowhere to take effect.
  const chartItems = [];
  if (hasSummary) {
    chartItems.push({
      id: 'summary',
      gridClass: 'col-span-12',
      node: (
        <ChartCard key="summary" title={source.summary_title || 'Summary'} hideTitle={source.summary_hide_title}>
          <div className="rounded-2xl p-8 text-white -m-4"
            style={{ background: `linear-gradient(135deg, ${source.color_from || '#0038A8'}, ${source.color_to || '#0055f1'})` }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-white/70">SUMMARY</span>
              <span className="text-sm text-white/50">as of</span>
              <span className="text-sm font-medium">{summaryAsOfLabel(summaryDateFrom, summaryDateTo, today)}</span>
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
      ),
    });
  }
  if (hasMap) {
    chartItems.push({
      id: 'map',
      gridClass: 'col-span-12',
      node: (
        <ChartCard key="map" title={source.map_title || 'Map'} hideTitle={source.map_hide_title}>
          <div className="-m-4">
            <FreeWifiMap sites={mapped} totalAPs={mapped.length} height="500px" tooltipFields={tooltipFieldDefs} filterFields={filterFieldDefs} colorField={colorFieldDef} markerIcon={source.marker_icon} markerIconName={source.marker_icon_name} markerIconColor={source.marker_icon_color} />
          </div>
        </ChartCard>
      ),
    });
  }
  if (hasBreakdown) {
    chartItems.push({
      id: 'province-breakdown',
      gridClass: 'col-span-12',
      node: (
        <ChartCard key="province-breakdown" title={source.breakdown_title || 'Breakdown'} hideTitle={source.breakdown_hide_title}>
          <BreakdownAccordion records={filteredBreakdownRecords} source={source} taggedFields={breakdownTaggedFields} />
        </ChartCard>
      ),
    });
  }
  customCharts.forEach(chart => {
    chartItems.push({
      id: chart.id,
      gridClass: gridSizeClass(chart.gridSize),
      node: (
        <ChartCard key={chart.id} title={chart.title} hideTitle={chart.hideTitle}
          noPadding={chart.chartType === 'aggregate-cards' && chart.cardDesign === 'image-bg'}>
          <CustomChartRenderer chart={chart} sites={combineChartRecords(chart, recordsByDataset, filteredTables)} />
        </ChartCard>
      ),
    });
  });
  // Extra Summary/Map/Breakdown instances (see ProjectBuiltinWidget) — same
  // computeSummaryTiles/resolveMapSites/BreakdownAccordion pipeline the singleton
  // built-ins above use, just fed this instance's OWN settings/table. Independent of
  // every other widget: no "Breakdown row filters the Map" cross-highlight (that's
  // specific to the ORIGINAL singleton pair, which has no meaning for an arbitrary
  // number of otherwise-unrelated extra instances).
  builtinWidgets.forEach(widget => {
    const settings = widget.settings || {};
    const datasetId = settings.summary_dataset ?? settings.map_dataset ?? settings.breakdown_dataset;
    const taggedFields = filteredTables.find(t => t.id === datasetId)?.fields || [];
    const records = recordsByDataset[datasetId] || [];
    let node = null;
    if (widget.widgetType === 'summary' && datasetId) {
      node = (
        <div className="rounded-2xl p-8 text-white -m-4" style={{ background: `linear-gradient(135deg, ${DEFAULT_SUMMARY_STYLE.colorFrom}, ${DEFAULT_SUMMARY_STYLE.colorTo})` }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-white/70">SUMMARY</span>
            <span className="text-sm text-white/50">as of</span>
            <span className="text-sm font-medium">{today}</span>
          </div>
          {renderSummaryCardBody(computeSummaryTiles(records, settings, taggedFields), DEFAULT_SUMMARY_STYLE)}
        </div>
      );
    } else if (widget.widgetType === 'map' && settings.latitude_field && settings.longitude_field) {
      const { mapped: widgetMapped, tooltipFieldDefs: widgetTooltips, filterFieldDefs: widgetFilters, colorFieldDef: widgetColor } = resolveMapSites(records, settings, taggedFields);
      if (widgetMapped.length) {
        node = (
          <div className="-m-4">
            <FreeWifiMap sites={widgetMapped} totalAPs={widgetMapped.length} height="500px" tooltipFields={widgetTooltips} filterFields={widgetFilters} colorField={widgetColor} />
          </div>
        );
      }
    } else if (widget.widgetType === 'province-breakdown' && settings.group_field) {
      const widgetRecords = filterRecordsByConditions(records, settings.breakdown_conditions);
      if (widgetRecords.length) {
        node = <BreakdownAccordion records={widgetRecords} source={settings} taggedFields={taggedFields} />;
      }
    }
    if (!node) return;
    chartItems.push({
      id: widget.id,
      gridClass: gridSizeClass(widget.gridSize),
      node: (
        <ChartCard key={widget.id} title={builtinWidgetTitle(widget)} hideTitle={widget.hideTitle}>
          {node}
        </ChartCard>
      ),
    });
  });

  return (
    <div className="space-y-6 mb-10">
      {source.show_filter_bar !== false && generalFilterLabels.length > 0 && (
        <GlobalDateFilterBar
          filters={generalFilterLabels}
          values={generalFilterValues}
          onChange={(label, value) => setGeneralFilterValues(prev => ({ ...prev, [label]: value }))}
          onClear={() => setGeneralFilterValues({})}
          generalFilterOptions={generalFilterOptions}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        {sortByChartOrder(chartItems, source.chart_order).map(item => (
          <div key={item.id} className={item.gridClass}>{item.node}</div>
        ))}
      </div>
    </div>
  );
}
