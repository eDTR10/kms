// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Table, ChevronLeft, ChevronRight, Search, Download, RefreshCw, FileSpreadsheet, X, Trash2, AlertTriangle, Check, Plus, Edit2, Save } from 'lucide-react';
import { 
  getFreeWifiLiveData, getFreeWifiMainData, getFreeWifiTargetData, getFreeWifiMasterlistData, 
  deleteAllFreeWifiLiveData, deleteAllFreeWifiMainData, deleteAllFreeWifiTargetData, deleteAllFreeWifiMasterlistData, 
  importFreeWifiLiveDataBatch, importFreeWifiMainDataBatch, importFreeWifiTargetDataBatch, importFreeWifiMasterlistDataBatch,
  createFreeWifiLiveData, createFreeWifiMainData, createFreeWifiTargetData, createFreeWifiMasterlistData
} from '../../../services/freewifiData';
import api from '../../../services/api';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// Explicit column order/labels for the Live Sites tab so it always shows every
// field in a fixed, predictable order instead of whatever Object.keys() happens
// to yield (which varies with which fields are populated on which record).
const LIVE_COLUMN_ORDER = [
  'site_code', 'r10_site_id', 'site_name', 'site_status', 'contract', 'supplier',
  'integration_date', 'acceptance_date', 'termination_date', 'renewed',
  'contract_price', 'renewal_price', 'ap', 'link', 'psgc', 'gida',
  'province', 'district', 'locality', 'barangay', 'coordinates', 'site_type',
];

const LIVE_COLUMN_LABELS = {
  site_code: 'Site Code', r10_site_id: 'R10 Site ID', site_name: 'Site Name',
  site_status: 'Site Status', contract: 'Contract', supplier: 'Supplier',
  integration_date: 'Integration Date', acceptance_date: 'Acceptance Date',
  termination_date: 'Termination Date', renewed: 'Renewed?',
  contract_price: 'Contract Price', renewal_price: 'Renewal Price',
  ap: 'AP', link: 'Link', psgc: 'PSGC', gida: 'GIDA',
  province: 'Province', district: 'District', locality: 'Locality',
  barangay: 'Barangay', coordinates: 'Coordinates', site_type: 'Site Type',
};

// CSV parser
function parseCsvText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length >= headers.length - 2) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      data.push(row);
    }
  }
  return data;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Map CSV columns to API fields
function csvToLiveData(row) {
  let latitude = null, longitude = null;
  if (row.Coordinates) {
    const coords = row.Coordinates.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      latitude = coords[0];
      longitude = coords[1];
    }
  }
  return {
    site_code: row['Site Code'] || '',
    r10_site_id: row['R10 Site ID'] || '',
    site_name: row['Site Name'] || '',
    site_status: row['Site Status'] || 'Live',
    contract: row.Contract || '',
    supplier: row.Supplier || '',
    integration_date: row['Integration Date'] || '',
    acceptance_date: row['Acceptance Date'] || '',
    termination_date: row['Termination Date'] || '',
    renewed: row['Renewed?'] || '',
    contract_price: row['Contract Price'] || '',
    renewal_price: row['Renewal Price'] || '',
    ap: row.AP || 'TRUE',
    link: row.Link || 'FALSE',
    psgc: row.PSGC || '',
    gida: row.GIDA || '',
    province: row.Province || '',
    district: row.District || '',
    locality: row.Locality || '',
    barangay: row.Barangay || '',
    coordinates: row.Coordinates || '',
    latitude,
    longitude,
    site_type: row['Site Type'] || '',
  };
}

function csvToMainData(row) {
  let latitude = null, longitude = null;
  if (row.Coordinates || row.Latitude) {
    const lat = parseFloat(row.Latitude || (row.Coordinates || '').split(',')[0]);
    const lon = parseFloat(row.Longitude || (row.Coordinates || '').split(',')[1]);
    if (!isNaN(lat)) latitude = lat;
    if (!isNaN(lon)) longitude = lon;
  }
  return {
    site_code: row['Site Code'] || '',
    r10_site_id: row['R10 Site ID'] || '',
    site_name: row['Site Name'] || '',
    project_status: row['Project Status'] || '',
    implementation_status: row['Implementation Status'] || '',
    site_status: row['Site Status'] || '',
    contract: row.Contract || '',
    supplier: row.Supplier || '',
    cms_provider: row['CMS Provider'] || '',
    link_provider: row['Link Provider'] || '',
    lot_number: row['Lot #'] || '',
    bandwidth: row.Bandwidth || '',
    integration_date: row['Integration Date'] || '',
    acceptance_date: row['Acceptance Date'] || '',
    termination_date: row['Termination Date'] || '',
    renewed: row['Renewed?'] || '',
    contract_price: row['Contract Price'] || '',
    renewal_price: row['Renewal Price'] || '',
    ap: row.AP || '',
    link: row.Link || '',
    link_type: row['Link Type'] || '',
    termination_point: row['Termination Point'] || '',
    procuring_entity: row['Procuring Entity'] || '',
    ap_code: row['AP Code'] || '',
    province: row.Province || '',
    district: row.District || '',
    locality: row.Locality || '',
    barangay: row.Barangay || '',
    site_type: row['Site Type'] || '',
    latitude,
    longitude,
    psgc: row.PSGC || '',
    gida: row.GIDA || '',
  };
}

function csvToTargetData(row) {
  return {
    r10_site_id: row['R10 Site ID'] || '',
    site_name: row['Site Name'] || '',
    project_status: row['Project Status'] || '',
    site_status: row['Site Status'] || '',
    contract: row.Contract || '',
    supplier: row.Supplier || '',
    integration_date: row['Integration Date'] || '',
    acceptance_date: row['Acceptance Date'] || '',
    termination_date: row['Termination Date'] || '',
    procuring_entity: row['Procuring Entity'] || '',
    procurement: row.Procurement || '',
    psgc: row.PSGC || '',
    province: row.Province || '',
    district: row.District || '',
    locality: row.Locality || '',
    barangay: row.Barangay || '',
    by_district: row['By District'] || '',
  };
}

function csvToMasterlistData(row) {
  let latitude = null, longitude = null;
  if (row.Lat) latitude = parseFloat(row.Lat) || null;
  if (row.Long) longitude = parseFloat(row.Long) || null;
  return {
    r10_site_id: row['R10 Site ID'] || '',
    site_type: row['Site Type'] || '',
    province: row.Province || '',
    district: row.District || '',
    locality: row.Locality || '',
    barangay: row.Barangay || '',
    location_name: row['Location Name'] || '',
    lat: latitude,
    long: longitude,
    closed: row['Closed?'] || '',
    coordinates: row.Coordinates || '',
    psgc: row.PSGC || '',
    status: row.Status || '',
    current_status: row['Current Status'] || '',
  };
}

export default function FreeWifiDatasets() {
  const [activeTab, setActiveTab] = useState('live');
  const [data, setData] = useState({ live: [], main: [], target: [], masterlist: [] });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [importResult, setImportResult] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  // CRUD state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'live', label: 'Live Sites', count: data.live.length },
    { id: 'main', label: 'Main Database', count: data.main.length },
    { id: 'target', label: 'Target', count: data.target.length },
    { id: 'masterlist', label: 'Masterlist', count: data.masterlist.length },
  ];

  // API endpoints for each tab
  const apiEndpoints = {
    live: 'kms/free-wifi-live/',
    main: 'kms/free-wifi-main/',
    target: 'kms/free-wifi-target/',
    masterlist: 'kms/free-wifi-masterlist/',
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [live, main, target, masterlist] = await Promise.all([
        getFreeWifiLiveData().catch(() => []),
        getFreeWifiMainData().catch(() => []),
        getFreeWifiTargetData().catch(() => []),
        getFreeWifiMasterlistData().catch(() => []),
      ]);
      setData({ live, main, target, masterlist });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Upload - uploads to the active tab's table
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) return alert('Please upload a CSV file');

    setImporting(true);
    setImportResult(null);
    setUploadProgress(0);
    setUploadStatus('Reading CSV...');

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      const totalRows = rows.length;
      setUploadProgress(10);
      setUploadStatus(`Processing ${totalRows} rows for ${activeTab}...`);

      // Convert based on active tab
      let items;
      let importFn;
      switch (activeTab) {
        case 'live':
          items = rows.map(csvToLiveData).filter(p => p.r10_site_id);
          importFn = importFreeWifiLiveDataBatch;
          break;
        case 'main':
          items = rows.map(csvToMainData).filter(p => p.r10_site_id);
          importFn = importFreeWifiMainDataBatch;
          break;
        case 'target':
          items = rows.map(csvToTargetData).filter(p => p.r10_site_id);
          importFn = importFreeWifiTargetDataBatch;
          break;
        case 'masterlist':
          items = rows.map(csvToMasterlistData).filter(p => p.r10_site_id);
          importFn = importFreeWifiMasterlistDataBatch;
          break;
        default:
          throw new Error('Invalid tab');
      }

      // Send in batches of 200
      const batchSize = 200;
      let created = 0;
      let errors = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        try {
          const result = await importFn(batch);
          created += result.created || 0;
          errors += (result.errors || []).length;
        } catch {
          errors += batch.length;
        }
        setUploadProgress(10 + Math.round(((i + batch.length) / items.length) * 85));
        setUploadStatus(`Batch ${Math.floor(i / batchSize) + 1}: ${Math.min(i + batchSize, totalRows)}/${totalRows} rows`);
      }

      setUploadProgress(100);
      setUploadStatus('Import complete!');
      setImportResult({ created, errors, sheet: tabs.find(t => t.id === activeTab)?.label });
      fetchData();
    } catch (err) {
      setUploadStatus('Error occurred');
      alert(`Import error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setImporting(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);
      e.target.value = '';
    }
  };

  // CRUD Operations
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.delete(`${apiEndpoints[activeTab]}${id}/`);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await api.patch(`${apiEndpoints[activeTab]}${editingItem.id}/`, formData);
      } else {
        await api.post(apiEndpoints[activeTab], formData);
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurrentTab = async () => {
    setDeleting(true);
    try {
      switch (activeTab) {
        case 'live': await deleteAllFreeWifiLiveData(); break;
        case 'main': await deleteAllFreeWifiMainData(); break;
        case 'target': await deleteAllFreeWifiTargetData(); break;
        case 'masterlist': await deleteAllFreeWifiMasterlistData(); break;
      }
      setShowDeleteConfirm(false);
      fetchData();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (currentData.length === 0) return;
    const headers = columns.map((col) => (activeTab === 'live' && LIVE_COLUMN_LABELS[col]) || String(col));
    const rows = currentData.map((item) =>
      columns.map((col) => `"${(item[col] || '').toString().replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `free-wifi-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentData = data[activeTab] || [];

  const columns = useMemo(() => {
    if (activeTab === 'live') return LIVE_COLUMN_ORDER;
    if (currentData.length === 0) return [];
    const allKeys = new Set();
    currentData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (!['id', 'created_at', 'updated_at'].includes(key)) {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys);
  }, [currentData, activeTab]);

  const getColumnLabel = (col) => (activeTab === 'live' && LIVE_COLUMN_LABELS[col]) || formatColumnName(col);
  // Live Sites always shows every column; other tabs keep the 10-column cap for readability.
  const visibleColumns = activeTab === 'live' ? columns : columns.slice(0, 10);

  const filteredData = useMemo(() => {
    if (!searchTerm) return currentData;
    const term = searchTerm.toLowerCase();
    return currentData.filter((item) =>
      Object.values(item).some((val) => val && String(val).toLowerCase().includes(term))
    );
  }, [currentData, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      return String(aVal).localeCompare(String(bVal)) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [filteredData, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const formatColumnName = (col) => {
    return col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    return String(value);
  };

  // Get form fields based on active tab
  const getFormFields = () => {
    switch (activeTab) {
      case 'live':
        // latitude/longitude aren't in the table's column list (Coordinates covers
        // display) but the map reads them directly, not the Coordinates string —
        // keep them editable or map positions silently stop updating.
        return [...LIVE_COLUMN_ORDER, 'latitude', 'longitude'];
      case 'main':
        return ['r10_site_id', 'site_code', 'site_name', 'project_status', 'site_status', 'province', 'district', 'locality', 'barangay', 'contract', 'supplier'];
      case 'target':
        return ['r10_site_id', 'site_name', 'project_status', 'site_status', 'province', 'district', 'locality', 'barangay', 'contract'];
      case 'masterlist':
        return ['r10_site_id', 'site_type', 'province', 'district', 'locality', 'barangay', 'location_name', 'lat', 'long', 'status'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload Data</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload CSV to <strong>{tabs.find(t => t.id === activeTab)?.label}</strong> table
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/40">
              <Trash2 size={16} /> Delete All {tabs.find(t => t.id === activeTab)?.label}
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
          <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Upload CSV to <strong>{tabs.find(t => t.id === activeTab)?.label}</strong>
          </p>
          <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={importing}
            className="w-full max-w-md mx-auto text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 disabled:opacity-50" />
          
          {importing && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{uploadStatus}</span>
                <span className="text-sm font-bold text-[#0038A8]">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0038A8] to-[#0055f1] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {importResult && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✅ Imported {importResult.created} records to {importResult.sheet}
              {importResult.errors > 0 && ` (${importResult.errors} errors)`}
            </p>
            <button onClick={() => setImportResult(null)} className="text-green-600"><X size={16} /></button>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingItem ? 'Edit' : 'Add'} Record - {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {getFormFields().map((field) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                    {getColumnLabel(field)}
                  </label>
                  <input
                    type="text"
                    value={formData[field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete {tabs.find(t => t.id === activeTab)?.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Delete all {currentData.length} records?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDeleteCurrentTab} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-[#0038A8] border-b-2 border-[#0038A8]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52]">
              <Plus size={16} /> Add Record
            </button>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} rows</option>)}
            </select>
            <span className="text-sm text-gray-500">{sortedData.length} records</span>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="p-8 text-center">
            <Table size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No matching records' : `No data. Upload a CSV to get started.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">#</th>
                  {visibleColumns.map((col) => (
                    <th key={col} onClick={() => handleSort(col)}
                      className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs cursor-pointer hover:text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {getColumnLabel(col)}
                        {sortColumn === col && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  ))}
                  <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs sticky right-0 bg-gray-50 dark:bg-gray-800/50 z-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 px-3 text-gray-400 text-xs sticky left-0 bg-white dark:bg-gray-800 z-10">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col} className="py-2 px-3 text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={String(item[col] || '')}>
                        {formatCellValue(item[col])}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right sticky right-0 bg-white dark:bg-gray-800 z-10">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">First</button>
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span className="px-3 py-1.5 text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
