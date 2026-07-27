// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Upload, FileJson, FileSpreadsheet, ArrowUp, ArrowDown, Wifi, Eye, Search, Filter, Table } from 'lucide-react';
import { getFreeWifiSites, createFreeWifiSite, updateFreeWifiSite, deleteFreeWifiSite, importFreeWifiSitesJson, importFreeWifiSitesCsv, getXlsxSheets, importFreeWifiSitesXlsx, reorderFreeWifiSites } from '../../services/freewifi';

const PROVINCE_CHOICES = [
  'Bukidnon', 'Camiguin', 'Cagayan de Oro City', 'Iligan City',
  'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental',
];

const STATUS_CHOICES = ['Live', 'Offline', 'Dormant', 'Not Activated'];

const SITE_TYPES = [
  'PES', 'PHS', 'BRGY', 'HALL', 'HSP', 'PLZ', 'TOUR', 'RHU', 'SUC',
  'MKT', 'LCC', 'OTH', 'TRM', 'BHS', 'TESDA', 'AIR', 'SEA', 'PC',
  'ICM', 'NGA', 'RO', 'PS', 'DRRMO', 'FO',
];

const EMPTY_FORM = {
  site_code: '', r10_site_id: '', site_name: '', site_type: '',
  province: '', district: '', locality: '', barangay: '',
  site_status: 'Live', contract: '', supplier: '',
  is_ap: true, latitude: '', longitude: '', psgc: '', gida: '',
};

export default function ManageFreeWifi() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [xlsxSheets, setXlsxSheets] = useState([]);
  const [selectedXlsxFile, setSelectedXlsxFile] = useState(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try { setItems(await getFreeWifiSites()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const startEdit = (item) => {
    setForm({
      site_code: item.site_code || '', r10_site_id: item.r10_site_id || '',
      site_name: item.site_name || '', site_type: item.site_type || '',
      province: item.province || '', district: item.district || '',
      locality: item.locality || '', barangay: item.barangay || '',
      site_status: item.site_status || 'Live', contract: item.contract || '',
      supplier: item.supplier || '', is_ap: item.is_ap ?? true,
      latitude: item.latitude || '', longitude: item.longitude || '',
      psgc: item.psgc || '', gida: item.gida || '',
    });
    setEditingId(item.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.r10_site_id.trim() || !form.site_name.trim()) return alert('Site ID and Site Name are required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      if (editingId) await updateFreeWifiSite(editingId, payload);
      else await createFreeWifiSite(payload);
      resetForm(); fetchItems();
    } catch (err) { console.error(err); alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this site?')) return;
    try { await deleteFreeWifiSite(id); setItems((p) => p.filter((i) => i.id !== id)); }
    catch (err) { console.error(err); }
  };

  const handleJsonFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportText(ev.target.result as string);
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!importText.trim()) return alert('Paste or upload JSON first.');
    setImporting(true); setImportResult(null);
    try {
      const result = await importFreeWifiSitesJson(JSON.parse(importText));
      setImportResult(result); setShowImport(false); setImportText(''); fetchItems();
    } catch (err: any) { alert(`Import error: ${err?.response?.data?.error || err.message}`); }
    finally { setImporting(false); }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) return alert('Please upload a CSV file');
    
    setImporting(true); setImportResult(null);
    try {
      const result = await importFreeWifiSitesCsv(file);
      setImportResult(result);
      fetchItems();
    } catch (err: any) {
      alert(`Import error: ${err?.response?.data?.error || err.message}`);
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleXlsxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return alert('Please upload an Excel file (.xlsx or .xls)');
    }
    
    setImporting(true); setImportResult(null);
    try {
      const result = await getXlsxSheets(file);
      if (result.action === 'select_sheet' && result.sheets?.length > 0) {
        setSelectedXlsxFile(file);
        setXlsxSheets(result.sheets);
        setShowSheetSelector(true);
      } else if (result.created !== undefined) {
        setImportResult(result);
        fetchItems();
      }
    } catch (err: any) {
      alert(`Error: ${err?.response?.data?.error || err.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleImportXlsxWithSheet = async (sheetName) => {
    if (!selectedXlsxFile) return;
    
    setImporting(true); setImportResult(null);
    setShowSheetSelector(false);
    try {
      const result = await importFreeWifiSitesXlsx(selectedXlsxFile, sheetName);
      setImportResult(result);
      fetchItems();
    } catch (err: any) {
      alert(`Import error: ${err?.response?.data?.error || err.message}`);
    } finally {
      setImporting(false);
      setSelectedXlsxFile(null);
      setXlsxSheets([]);
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) return alert('No data to export');
    
    const headers = ['R10 Site ID', 'Site Code', 'Site Name', 'Site Type', 'Province', 'District', 'Locality', 'Barangay', 'Site Status', 'Contract', 'Supplier', 'AP', 'PSGC', 'GIDA'];
    const rows = items.map(item => [
      item.r10_site_id, item.site_code, item.site_name, item.site_type,
      item.province, item.district, item.locality, item.barangay,
      item.site_status, item.contract, item.supplier, item.is_ap ? 'Yes' : 'No',
      item.psgc, item.gida
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `free-wifi-sites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    try { await reorderFreeWifiSites(newItems.map((item, i) => ({ id: item.id, order: i }))); }
    catch (err) { console.error(err); fetchItems(); }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = !searchTerm ||
      item.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.r10_site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.locality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProvince = !filterProvince || item.province === filterProvince;
    const matchType = !filterType || item.site_type === filterType;
    return matchSearch && matchProvince && matchType;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Free Wi-Fi Sites</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            FPIAP Region 10 - {items.length} total sites
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button onClick={() => { setShowImport((s) => !s); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Upload size={15} /> Import Excel/CSV
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); setShowImport(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors">
            <Plus size={15} /> Add Site
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Imported <strong>{importResult.created}</strong> site{importResult.created !== 1 ? 's' : ''}.
            {importResult.errors?.length > 0 && ` (${importResult.errors.length} failed)`}
          </p>
          <button onClick={() => setImportResult(null)} className="text-green-600"><X size={16} /></button>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Import Sites</h3>
          
          {/* XLSX Upload Section (Primary) */}
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-emerald-300 dark:border-emerald-700">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
              <Table size={16} className="text-emerald-600" /> Upload Excel File (.xlsx)
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Upload your Excel file directly. You'll be able to select which sheet/tab to import from.
              Supports all column formats from the FPIAP Masterlist.
            </p>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleXlsxUpload}
              disabled={importing}
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-50" 
            />
            {importing && <p className="text-xs text-emerald-600 mt-2">Reading Excel file...</p>}
          </div>

          {/* CSV Upload Section */}
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-blue-600" /> Or Upload CSV File
            </h4>
            <input 
              type="file" 
              accept=".csv,text/csv" 
              onChange={handleCsvUpload}
              disabled={importing}
              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50" 
            />
          </div>

          {/* JSON Upload Section */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
              <FileJson size={16} className="text-purple-600" /> Or Import from JSON
            </h4>
            <div className="mb-3">
              <input type="file" accept=".json,application/json" onChange={handleJsonFileUpload}
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700" />
            </div>
            <textarea placeholder='[{"R10 Site ID": "...", "Site Name": "...", "Province": "...", ...}]'
              value={importText} onChange={(e) => setImportText(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex gap-2 mt-3">
              <button onClick={handleImportJson} disabled={importing || !importText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Upload size={13} /> {importing ? 'Importing...' : 'Import JSON'}
              </button>
            </div>
          </div>

          <button onClick={() => { setShowImport(false); setImportText(''); }}
            className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
            Close
          </button>
        </div>
      )}

      {/* Sheet Selector Modal */}
      {showSheetSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Select Sheet to Import</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your Excel file has {xlsxSheets.length} sheets. Choose which one to import:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {xlsxSheets.map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => handleImportXlsxWithSheet(sheet)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Table size={16} className="text-emerald-600" />
                    <span className="font-medium text-gray-900 dark:text-white">{sheet}</span>
                  </div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => { setShowSheetSelector(false); setSelectedXlsxFile(null); setXlsxSheets([]); }}
              className="mt-4 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingId ? 'Edit' : 'New'} Site</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder="R10 Site ID" value={form.r10_site_id}
              onChange={(e) => setForm((f) => ({ ...f, r10_site_id: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Site Code" value={form.site_code}
              onChange={(e) => setForm((f) => ({ ...f, site_code: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Site Name" value={form.site_name}
              onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <select value={form.site_type}
              onChange={(e) => setForm((f) => ({ ...f, site_type: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]">
              <option value="">Site Type</option>
              {SITE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]">
              <option value="">Province</option>
              {PROVINCE_CHOICES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input placeholder="District" value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Locality" value={form.locality}
              onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Barangay" value={form.barangay}
              onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <select value={form.site_status}
              onChange={(e) => setForm((f) => ({ ...f, site_status: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]">
              {STATUS_CHOICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Contract" value={form.contract}
              onChange={(e) => setForm((f) => ({ ...f, contract: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Supplier" value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <label className="flex items-center gap-2 px-3 py-2">
              <input type="checkbox" checked={form.is_ap}
                onChange={(e) => setForm((f) => ({ ...f, is_ap: e.target.checked }))}
                className="rounded border-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Is Access Point (AP)</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search sites..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
          </div>
        </div>
        <select value={filterProvince}
          onChange={(e) => setFilterProvince(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]">
          <option value="">All Provinces</option>
          {PROVINCE_CHOICES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]">
          <option value="">All Types</option>
          {SITE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Wifi size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No sites found.</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3">
            Showing {filteredItems.length} of {items.length} sites
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Site ID</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Site Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Province</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Locality</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">AP</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.slice(0, 200).map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{item.r10_site_id}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white max-w-[200px] truncate">{item.site_name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {item.site_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{item.province}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{item.locality}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        item.site_status === 'Live' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        item.site_status === 'Offline' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {item.site_status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {item.is_ap ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length > 200 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                Showing 200 of {filteredItems.length} sites
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
