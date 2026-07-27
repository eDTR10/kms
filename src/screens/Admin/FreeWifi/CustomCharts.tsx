// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, GripVertical, Eye, EyeOff } from 'lucide-react';
import { getFreeWifiLiveData } from '../../../services/freewifiData';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

const CHART_TYPES = [
  { id: 'bar-horizontal', label: 'Horizontal Bar', description: 'Best for comparing categories' },
  { id: 'bar-vertical', label: 'Vertical Bar', description: 'Good for rankings and comparisons' },
  { id: 'pie', label: 'Pie Chart', description: 'Shows proportion of whole' },
  { id: 'donut', label: 'Donut Chart', description: 'Modern pie with center label' },
  { id: 'table', label: 'Data Table', description: 'Detailed view with numbers' },
  { id: 'cards', label: 'Stat Cards', description: 'Grid of numbers with labels' },
];

const AVAILABLE_FIELDS = [
  { value: 'province', label: 'Province' },
  { value: 'district', label: 'District' },
  { value: 'locality', label: 'Locality' },
  { value: 'site_type', label: 'Site Type' },
  { value: 'contract', label: 'Contract' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'site_status', label: 'Site Status' },
  { value: 'gida', label: 'GIDA' },
];

// Preview components for each chart type
function BarHorizontalPreview() {
  return (
    <div className="space-y-2">
      {['Bukidnon', 'Lanao del Norte', 'Misamis Oriental', 'CDO'].map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-20 text-[10px] text-gray-500 truncate">{label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div className="h-full rounded" style={{ width: `${100 - i * 20}%`, backgroundColor: COLORS[i] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarVerticalPreview() {
  return (
    <div className="flex items-end gap-1 h-20">
      {[80, 60, 45, 35, 25].map((h, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: COLORS[i] }} />
      ))}
    </div>
  );
}

function PiePreview() {
  return (
    <div className="w-20 h-20 rounded-full relative mx-auto" style={{
      background: `conic-gradient(${COLORS[0]} 0% 40%, ${COLORS[1]} 40% 65%, ${COLORS[2]} 65% 80%, ${COLORS[3]} 80% 100%)`
    }} />
  );
}

function DonutPreview() {
  return (
    <div className="w-20 h-20 rounded-full relative mx-auto flex items-center justify-center" style={{
      background: `conic-gradient(${COLORS[0]} 0% 40%, ${COLORS[1]} 40% 65%, ${COLORS[2]} 65% 80%, ${COLORS[3]} 80% 100%)`
    }}>
      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800" />
    </div>
  );
}

function TablePreview() {
  return (
    <div className="text-[10px]">
      <div className="grid grid-cols-3 gap-px bg-gray-200 rounded overflow-hidden">
        {['Name', 'Count', '%'].map(h => (
          <div key={h} className="bg-gray-100 p-1 font-bold text-center">{h}</div>
        ))}
        {[1, 2, 3].map(i => (
          <>
            <div key={`n${i}`} className="bg-white p-1">Item {i}</div>
            <div key={`c${i}`} className="bg-white p-1 text-center">{100 - i * 20}</div>
            <div key={`p${i}`} className="bg-white p-1 text-center">{50 - i * 10}%</div>
          </>
        ))}
      </div>
    </div>
  );
}

function CardsPreview() {
  return (
    <div className="grid grid-cols-2 gap-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-gray-50 rounded p-1.5 text-center">
          <p className="text-sm font-bold text-gray-700">{100 * i}</p>
          <p className="text-[8px] text-gray-400">Label</p>
        </div>
      ))}
    </div>
  );
}

const PREVIEW_COMPONENTS = {
  'bar-horizontal': BarHorizontalPreview,
  'bar-vertical': BarVerticalPreview,
  'pie': PiePreview,
  'donut': DonutPreview,
  'table': TablePreview,
  'cards': CardsPreview,
};

// Render actual chart with data
function renderChart(chart, sites) {
  const fieldData = {};
  sites.forEach(s => {
    const key = s[chart.field] || 'N/A';
    fieldData[key] = (fieldData[key] || 0) + 1;
  });
  const sorted = Object.entries(fieldData).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

  switch (chart.chartType) {
    case 'bar-horizontal':
      return (
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
      );

    case 'bar-vertical':
      return (
        <div className="flex items-end gap-2 h-64">
          {sorted.slice(0, 10).map(([label, count], i) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{count}</span>
              <div className="w-full rounded-t-lg" style={{ height: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length], minHeight: '20px' }} />
              <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{label}</span>
            </div>
          ))}
        </div>
      );

    case 'pie':
      let accumulated = 0;
      const pieGradient = sorted.slice(0, 8).map(([label, count], i) => {
        const pct = (count / total) * 100;
        const start = accumulated;
        accumulated += pct;
        return `${COLORS[i % COLORS.length]} ${start}% ${accumulated}%`;
      }).join(', ');

      return (
        <div className="flex items-center gap-8">
          <div className="w-48 h-48 rounded-full flex-shrink-0" style={{ background: `conic-gradient(${pieGradient})` }} />
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

    case 'donut':
      let acc2 = 0;
      const donutGrad = sorted.slice(0, 8).map(([label, count], i) => {
        const pct = (count / total) * 100;
        const start = acc2;
        acc2 += pct;
        return `${COLORS[i % COLORS.length]} ${start}% ${acc2}%`;
      }).join(', ');

      return (
        <div className="flex items-center gap-8">
          <div className="w-48 h-48 rounded-full flex-shrink-0 flex items-center justify-center relative"
            style={{ background: `conic-gradient(${donutGrad})` }}>
            <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
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

    case 'table':
      return (
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
      );

    case 'cards':
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sorted.slice(0, 8).map(([label, count], i) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}10` }}>
              <p className="text-3xl font-black" style={{ color: COLORS[i % COLORS.length] }}>{count}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{label}</p>
              <p className="text-xs text-gray-400">{((count / total) * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export default function CustomCharts() {
  const [charts, setCharts] = useState(() => {
    const saved = localStorage.getItem('freewifi_custom_charts');
    return saved ? JSON.parse(saved) : [];
  });
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [form, setForm] = useState({ title: '', field: 'province', chartType: 'bar-horizontal', showOnUser: true });

  useEffect(() => {
    getFreeWifiLiveData().then(setSites).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('freewifi_custom_charts', JSON.stringify(charts));
  }, [charts]);

  const handleSave = () => {
    if (!form.title.trim()) return alert('Title is required');
    if (editingChart) {
      setCharts(prev => prev.map(c => c.id === editingChart.id ? { ...c, ...form } : c));
    } else {
      setCharts(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
    setEditingChart(null);
    setForm({ title: '', field: 'province', chartType: 'bar-horizontal', showOnUser: true });
  };

  const handleEdit = (chart) => {
    setEditingChart(chart);
    setForm({ title: chart.title, field: chart.field, chartType: chart.chartType, showOnUser: chart.showOnUser });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this chart?')) return;
    setCharts(prev => prev.filter(c => c.id !== id));
  };

  const toggleUserVisible = (id) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, showOnUser: !c.showOnUser } : c));
  };

  const moveChart = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= charts.length) return;
    const arr = [...charts];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setCharts(arr);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Custom Charts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create charts by selecting data fields and chart type.</p>
        </div>
        <button onClick={() => { setForm({ title: '', field: 'province', chartType: 'bar-horizontal', showOnUser: true }); setEditingChart(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52]">
          <Plus size={16} /> Add Chart
        </button>
      </div>

      {/* Form with Chart Type Preview */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingChart ? 'Edit Chart' : 'Create New Chart'}</h3>
          
          {/* Chart Type Selection with Preview */}
          <div className="mb-5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3 block">Select Chart Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {CHART_TYPES.map((type) => {
                const PreviewComponent = PREVIEW_COMPONENTS[type.id];
                return (
                  <button
                    key={type.id}
                    onClick={() => setForm(f => ({ ...f, chartType: type.id }))}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      form.chartType === type.id
                        ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="h-20 flex items-center justify-center mb-2">
                      <PreviewComponent />
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white text-center">{type.label}</p>
                    <p className="text-[10px] text-gray-500 text-center mt-0.5">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Settings */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Chart Title</label>
              <input placeholder="e.g. Sites by Province" value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Data Field</label>
              <select value={form.field} onChange={(e) => setForm(f => ({ ...f, field: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                {AVAILABLE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.showOnUser} onChange={(e) => setForm(f => ({ ...f, showOnUser: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show on User Dashboard</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium">
              <Save size={14} /> {editingChart ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingChart(null); }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Charts List */}
      {charts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No custom charts yet. Click "Add Chart" to create one.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {charts.map((chart, index) => (
            <div key={chart.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <GripVertical size={16} className="text-gray-400 cursor-grab" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{chart.title}</h3>
                    <p className="text-xs text-gray-500">
                      Field: {AVAILABLE_FIELDS.find(f => f.value === chart.field)?.label} · 
                      Type: {CHART_TYPES.find(t => t.id === chart.chartType)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleUserVisible(chart.id)}
                    className={`p-2 rounded-lg transition-colors ${chart.showOnUser ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-gray-400'}`}
                    title={chart.showOnUser ? 'Visible on user dashboard' : 'Hidden from user dashboard'}>
                    {chart.showOnUser ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => moveChart(index, -1)} disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
                  <button onClick={() => moveChart(index, 1)} disabled={index === charts.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
                  <button onClick={() => handleEdit(chart)} className="p-2 text-gray-400 hover:text-[#0038A8]">Edit</button>
                  <button onClick={() => handleDelete(chart.id)} className="p-2 text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {renderChart(chart, sites)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
