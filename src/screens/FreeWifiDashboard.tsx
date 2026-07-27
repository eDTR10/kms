// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wifi, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { getFreeWifiSummary } from '../services/freewifi';
import { getFreeWifiLiveData } from '../services/freewifiData';
import FreeWifiMap from '../components/FreeWifiMap';
import freewifiDataFallback from '../data/freewifiLiveData.json';

const PROVINCE_COLORS = {
  'Bukidnon': '#2563eb',
  'Camiguin': '#059669',
  'Cagayan de Oro City': '#d97706',
  'Iligan City': '#7c3aed',
  'Lanao del Norte': '#dc2626',
  'Misamis Occidental': '#0891b2',
  'Misamis Oriental': '#db2777',
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function ProvinceBar({ province, count, max, color, apCount }) {
  const pct = (count / max) * 100;
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-44 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{province}</div>
      <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-lg flex items-center justify-between px-4"
          style={{ backgroundColor: color }}
        >
          <span className="text-sm font-bold text-white">{count} sites</span>
          <span className="text-xs text-white/80">{apCount} APs</span>
        </motion.div>
      </div>
    </div>
  );
}

function ProvinceSection({ province, data, sites }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const color = PROVINCE_COLORS[province] || '#6b7280';
  const siteTypes = Object.entries(data.site_types || {}).sort((a, b) => b[1] - a[1]);

  const provinceSites = sites ? sites.filter(s => s.province === province) : [];
  const filteredSites = selectedType 
    ? provinceSites.filter(s => s.site_type === selectedType) 
    : provinceSites;

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <div className="text-left">
            <h3 className="font-bold text-gray-900 dark:text-foreground">{province}</h3>
            <p className="text-sm text-gray-500 dark:text-muted-foreground">
              {data.total_sites} sites · {data.ap_count} APs · {data.localities_count} localities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {siteTypes.slice(0, 3).map(([type, count]) => (
              <span key={type} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {type}: {count}
              </span>
            ))}
          </div>
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-gray-200 dark:border-border"
        >
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30">
            {/* Site Type Breakdown - Clickable badges */}
            {siteTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setSelectedType('')}
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                    !selectedType
                      ? 'bg-[#0038A8] text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All: {provinceSites.length}
                </button>
                {siteTypes.map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? '' : type)}
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                      selectedType === type
                        ? 'bg-[#0038A8] text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type}: {count}
                  </button>
                ))}
              </div>
            )}

            {/* Filtered sites count */}
            {selectedType && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Showing {filteredSites.length} {selectedType} sites
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function FreeWifiDashboard() {
  const [data, setData] = useState(freewifiDataFallback);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read chart settings from admin (localStorage)
  const chartOrder = useMemo(() => {
    const saved = localStorage.getItem('freewifi_chart_order');
    return saved ? JSON.parse(saved) : ['summary', 'map', 'province-bar', 'site-type-chart', 'contract-chart', 'province-breakdown'];
  }, []);

  const chartVisibility = useMemo(() => {
    const saved = localStorage.getItem('freewifi_chart_visibility');
    return saved ? JSON.parse(saved) : { summary: true, map: true, 'province-bar': true, 'site-type-chart': true, 'contract-chart': true, 'province-breakdown': true };
  }, []);

  useEffect(() => {
    Promise.all([
      getFreeWifiSummary().catch(() => freewifiDataFallback),
      getFreeWifiLiveData().catch(() => []),
    ]).then(([summaryData, liveData]) => {
      if (summaryData?.overall?.total_sites > 0) {
        setData(summaryData);
      }
      setSites(liveData);
    }).finally(() => setLoading(false));
  }, []);

  const { overall, by_province } = data;
  const provinces = Object.keys(by_province).sort((a, b) => by_province[b].total_sites - by_province[a].total_sites);
  const maxSites = Math.max(...provinces.map(p => by_province[p].total_sites));
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Chart components
  const chartComponents = {
    summary: (
      <div className="bg-gradient-to-br from-[#0038A8] to-[#0055f1] rounded-2xl p-8 text-white mb-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm font-medium text-white/70">SUMMARY</span>
          <span className="text-sm text-white/50">as of</span>
          <span className="text-sm font-medium">{today}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="col-span-2 lg:col-span-1">
            <p className="text-sm text-white/70 mb-1">Total Active Locations</p>
            <p className="text-4xl font-black">{overall.total_locations?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-white/70 mb-1">Municipalities</p>
            <p className="text-3xl font-black">{overall.municipalities_count || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-white/70 mb-1">Total Province</p>
            <p className="text-3xl font-black">{overall.provinces_count || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm text-white/70 mb-1">Barangays</p>
            <p className="text-3xl font-black">{overall.barangays_count || 0}</p>
          </div>
          <div className="bg-[#FCD116] rounded-xl p-4">
            <p className="text-sm text-[#0038A8] mb-1">Total Active APs</p>
            <p className="text-3xl font-black text-[#0038A8]">{overall.total_sites?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>
    ),
    map: (
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border overflow-hidden mb-12">
        <div className="p-6 border-b border-gray-200 dark:border-border">
          <h2 className="text-xl font-bold text-gray-900 dark:text-foreground">Active APs Map</h2>
        </div>
        <FreeWifiMap sites={sites} totalAPs={overall.total_sites} height="500px" />
      </div>
    ),
    'province-bar': (
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6 mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Sites by Province</h2>
        <div className="space-y-3">
          {provinces.map(province => (
            <ProvinceBar key={province} province={province} count={by_province[province].total_sites}
              max={maxSites} color={PROVINCE_COLORS[province] || '#6b7280'} apCount={by_province[province].ap_count} />
          ))}
        </div>
      </div>
    ),
    'site-type-chart': (
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6 mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Site Type Distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(overall.site_types_total || {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    'contract-chart': (
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6 mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Contract Distribution</h2>
        <div className="space-y-3">
          {(() => {
            const byContract = {};
            sites.forEach(s => { byContract[s.contract || 'N/A'] = (byContract[s.contract || 'N/A'] || 0) + 1; });
            return Object.entries(byContract).sort((a, b) => b[1] - a[1]).map(([contract, count]) => (
              <div key={contract} className="flex items-center gap-4">
                <span className="w-32 text-sm text-gray-700 dark:text-gray-300 truncate">{contract}</span>
                <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg bg-[#0038A8] flex items-center px-3"
                    style={{ width: `${(count / (sites.length || 1)) * 100}%` }}>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    ),
    'province-breakdown': (
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Province Breakdown</h2>
        <div className="space-y-4">
          {provinces.map(province => (
            <ProvinceSection key={province} province={province} data={by_province[province]} sites={sites} />
          ))}
        </div>
      </div>
    ),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#0038A8]/10 dark:bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <Wifi size={16} className="text-[#0038A8] dark:text-primary" />
            <span className="text-sm font-semibold text-[#0038A8] dark:text-primary">Free Wi-Fi Project</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-foreground mb-4">
            FPIAP Region 10 Dashboard
          </h1>
          <p className="text-gray-500 dark:text-muted-foreground text-lg max-w-2xl mx-auto">
            Free Public Internet Access Program - Live Sites and Access Points across Northern Mindanao
          </p>
          <div className="mt-4 h-1.5 w-16 bg-[#FCD116] dark:bg-primary rounded-full mx-auto" />
        </div>

        {/* Render charts in order based on admin settings */}
        {chartOrder.map((chartId) => (
          chartVisibility[chartId] && (
            <div key={chartId}>
              {chartComponents[chartId]}
            </div>
          )
        ))}

        {/* Province Distribution Chart (always show) */}
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Sites by Province</h2>
          <div className="space-y-3">
            {provinces.map(province => (
              <ProvinceBar
                key={province}
                province={province}
                count={by_province[province].total_sites}
                max={maxSites}
                color={PROVINCE_COLORS[province] || '#6b7280'}
                apCount={by_province[province].ap_count}
              />
            ))}
          </div>
        </div>

        {/* Custom Charts from Admin */}
        {(() => {
          const customCharts = JSON.parse(localStorage.getItem('freewifi_custom_charts') || '[]');
          const visibleCharts = customCharts.filter(c => c.showOnUser);
          if (visibleCharts.length === 0) return null;
          
          const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
          
          return (
            <div className="space-y-8 mb-12">
              {visibleCharts.map((chart) => {
                const fieldData = {};
                sites.forEach(s => {
                  const key = s[chart.field] || 'N/A';
                  fieldData[key] = (fieldData[key] || 0) + 1;
                });
                const sorted = Object.entries(fieldData).sort((a, b) => b[1] - a[1]);
                const max = sorted[0]?.[1] || 1;
                const total = sorted.reduce((sum, [, count]) => sum + count, 0);

                return (
                  <div key={chart.id} className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">{chart.title}</h2>
                    
                    {chart.chartType === 'bar-horizontal' && (
                      <div className="space-y-3">
                        {sorted.slice(0, 15).map(([label, count], i) => (
                          <div key={label} className="flex items-center gap-4">
                            <span className="w-44 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
                            <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              <div className="h-full rounded-lg flex items-center px-3"
                                style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}>
                                <span className="text-xs font-bold text-white">{count}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {chart.chartType === 'bar-vertical' && (
                      <div className="flex items-end gap-2 h-64">
                        {sorted.slice(0, 10).map(([label, count], i) => (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{count}</span>
                            <div className="w-full rounded-t-lg" style={{ height: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length], minHeight: '20px' }} />
                            <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {chart.chartType === 'pie' && (() => {
                      let acc = 0;
                      const grad = sorted.slice(0, 8).map(([, count], i) => {
                        const pct = (count / total) * 100;
                        const start = acc;
                        acc += pct;
                        return `${COLORS[i % COLORS.length]} ${start}% ${acc}%`;
                      }).join(', ');
                      return (
                        <div className="flex items-center gap-8">
                          <div className="w-48 h-48 rounded-full flex-shrink-0" style={{ background: `conic-gradient(${grad})` }} />
                          <div className="space-y-2">
                            {sorted.slice(0, 8).map(([label, count], i) => (
                              <div key={label} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
                                <span className="text-sm font-bold ml-auto">{count}</span>
                                <span className="text-xs text-gray-500">{((count / total) * 100).toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {chart.chartType === 'donut' && (() => {
                      let acc = 0;
                      const grad = sorted.slice(0, 8).map(([, count], i) => {
                        const pct = (count / total) * 100;
                        const start = acc;
                        acc += pct;
                        return `${COLORS[i % COLORS.length]} ${start}% ${acc}%`;
                      }).join(', ');
                      return (
                        <div className="flex items-center gap-8">
                          <div className="w-48 h-48 rounded-full flex-shrink-0 flex items-center justify-center"
                            style={{ background: `conic-gradient(${grad})` }}>
                            <div className="w-28 h-28 rounded-full bg-white dark:bg-card flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{total}</p>
                                <p className="text-[10px] text-gray-500">Total</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {sorted.slice(0, 8).map(([label, count], i) => (
                              <div key={label} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
                                <span className="text-sm font-bold ml-auto">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {chart.chartType === 'table' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">#</th>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Name</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Count</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.slice(0, 10).map(([label, count], i) => (
                              <tr key={label} className="border-t border-gray-100 dark:border-gray-800">
                                <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{label}</td>
                                <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">{count}</td>
                                <td className="py-2 px-3 text-right text-gray-500">{((count / total) * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {chart.chartType === 'cards' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {sorted.slice(0, 8).map(([label, count], i) => (
                          <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}10` }}>
                            <p className="text-3xl font-black" style={{ color: COLORS[i % COLORS.length] }}>{count}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{label}</p>
                            <p className="text-xs text-gray-400">{((count / total) * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Site Type Summary (always show) */}
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-200 dark:border-border p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Site Type Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(overall.site_types_total || {})
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
