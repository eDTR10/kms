// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Edit2, X, Save, Table, Settings2, Upload, FileSpreadsheet,
  Search, ChevronLeft, ChevronRight, Link2, RefreshCw,
} from 'lucide-react';
import {
  getProjectOfficeId, getProjectDatasets, createProjectDataset, updateProjectDataset, deleteProjectDataset,
  createProjectDatasetField, updateProjectDatasetField, deleteProjectDatasetField,
  createProjectDatasetRow, updateProjectDatasetRow, deleteProjectDatasetRow,
  importProjectDatasetCsv, syncProjectDatasetSheet,
} from '../../../services/projects';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
];

function slugifyFieldName(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
}

function emptyValuesFor(fields) {
  const values = {};
  fields.forEach((f) => { values[f.name] = f.field_type === 'boolean' ? false : ''; });
  return values;
}

function formatCellValue(field, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (field.field_type === 'boolean') return value ? '✓' : '✗';
  return String(value);
}

// Same naive CSV parser used throughout this app's other import panels (FreeWifiDatasets,
// ManageAwards, ...) — doesn't handle embedded newlines inside quoted cells.
function parseCsvText(text) {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index]?.trim() || ''; });
    data.push(row);
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

function FieldValueInput({ field, value, onChange }) {
  if (field.field_type === 'boolean') {
    return (
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300" />
    );
  }
  if (field.field_type === 'number') {
    return (
      <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
    );
  }
  if (field.field_type === 'date') {
    return (
      <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
    );
  }
  return (
    <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
  );
}

export default function ProjectDatasets({ slug }) {
  const [officeId, setOfficeId] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [showAddDataset, setShowAddDataset] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');

  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldForm, setFieldForm] = useState({ label: '', field_type: 'text' });

  // Link a column to another table's column — see openLinkEditor/handleSaveLink below.
  const [linkingField, setLinkingField] = useState(null);
  const [linkDatasetId, setLinkDatasetId] = useState('');
  const [linkColumn, setLinkColumn] = useState('');

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const [showSheetLink, setShowSheetLink] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [syncingSheet, setSyncingSheet] = useState(false);

  // Table toolbar — search / sort / pagination, same shape as FreeWifiDatasets
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Add/Edit row — modal, same pattern as FreeWifiDatasets
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([getProjectOfficeId(slug), getProjectDatasets(slug)])
      .then(([id, ds]) => {
        setOfficeId(id);
        setDatasets(ds);
        setActiveId((prev) => (prev && ds.some((d) => d.id === prev) ? prev : ds[0]?.id ?? null));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [slug]);

  const activeDataset = datasets.find((d) => d.id === activeId) || null;
  const fields = activeDataset?.fields || [];
  const rows = activeDataset?.rows || [];

  // Keep the sheet-link input in sync with whichever table is active.
  useEffect(() => {
    setSheetUrlInput(activeDataset?.sheet_url || '');
  }, [activeDataset?.id]);

  const switchDataset = (id) => {
    setActiveId(id);
    setCurrentPage(1);
    setSearchTerm('');
    setSortColumn(null);
  };

  const handleAddDataset = async () => {
    if (!newDatasetName.trim()) return;
    try {
      const created = await createProjectDataset({ office: officeId, project_slug: slug, name: newDatasetName.trim(), order: datasets.length });
      setNewDatasetName('');
      setShowAddDataset(false);
      switchDataset(created.id);
      fetchAll();
    } catch (err) {
      alert('Failed to create table.');
    }
  };

  const handleDeleteDataset = async (dataset) => {
    if (!confirm(`Delete the "${dataset.name}" table and all its data? This cannot be undone.`)) return;
    try {
      await deleteProjectDataset(dataset.id);
      if (activeId === dataset.id) switchDataset(null);
      fetchAll();
    } catch (err) {
      alert('Failed to delete table.');
    }
  };

  const handleAddField = async () => {
    if (!fieldForm.label.trim() || !activeDataset) return;
    try {
      await createProjectDatasetField({
        dataset: activeDataset.id,
        name: slugifyFieldName(fieldForm.label),
        label: fieldForm.label.trim(),
        field_type: fieldForm.field_type,
        order: fields.length,
      });
      setFieldForm({ label: '', field_type: 'text' });
      setShowFieldForm(false);
      fetchAll();
    } catch (err) {
      alert('Failed to add column — the name may already be in use.');
    }
  };

  const handleDeleteField = async (field) => {
    if (!confirm(`Delete the "${field.label}" column? Existing values for it will no longer show.`)) return;
    try {
      await deleteProjectDatasetField(field.id);
      fetchAll();
    } catch (err) {
      alert('Failed to delete column.');
    }
  };

  const openLinkEditor = (field) => {
    setLinkingField(field);
    setLinkDatasetId(field.reference_dataset ? String(field.reference_dataset) : '');
    setLinkColumn(field.reference_column || '');
  };

  const handleSaveLink = async () => {
    if (!linkingField) return;
    try {
      await updateProjectDatasetField(linkingField.id, {
        reference_dataset: linkDatasetId ? Number(linkDatasetId) : null,
        reference_column: linkDatasetId ? linkColumn : '',
      });
      setLinkingField(null);
      fetchAll();
    } catch (err) {
      alert('Failed to update column link.');
    }
  };

  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(String(ev.target.result || ''));
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!activeDataset || !csvText.trim()) return alert('Paste or upload a CSV first.');
    const parsedRows = parseCsvText(csvText);
    if (parsedRows.length === 0) return alert('No data rows found — make sure the first line is a header row.');

    const headers = Object.keys(parsedRows[0]);
    const nameByHeader = {};
    headers.forEach((h) => { nameByHeader[h] = slugifyFieldName(h); });

    const csvFields = headers.map((h) => {
      const values = parsedRows.map((r) => r[h]).filter((v) => v !== '');
      const isNumber = values.length > 0 && values.every((v) => v !== '' && !isNaN(Number(v)));
      return { name: nameByHeader[h], label: h, field_type: isNumber ? 'number' : 'text' };
    });

    const importRows = parsedRows.map((r) => {
      const values = {};
      headers.forEach((h) => { values[nameByHeader[h]] = r[h]; });
      return values;
    });

    // Send in batches of 200, same as Free Wi-Fi's dataset import — a single request
    // with thousands of rows can exceed MySQL's max_allowed_packet and 500.
    const batchSize = 200;
    let rowsCreated = 0;
    let fieldsCreated = 0;
    let failedBatches = 0;

    setImporting(true);
    setUploadProgress(0);
    setUploadStatus(`Importing ${importRows.length} rows...`);
    try {
      for (let i = 0; i < importRows.length; i += batchSize) {
        const batch = importRows.slice(i, i + batchSize);
        try {
          const result = await importProjectDatasetCsv(activeDataset.id, { fields: csvFields, rows: batch });
          rowsCreated += result.rows_created || 0;
          fieldsCreated = Math.max(fieldsCreated, result.fields_created || 0);
        } catch {
          failedBatches += 1;
        }
        setUploadProgress(Math.round(((i + batch.length) / importRows.length) * 100));
        setUploadStatus(`Batch ${Math.floor(i / batchSize) + 1}: ${Math.min(i + batchSize, importRows.length)}/${importRows.length} rows`);
      }
      setCsvText('');
      setShowCsvImport(false);
      fetchAll();
      alert(
        `Imported ${rowsCreated} row(s) and ${fieldsCreated} new column(s).` +
        (failedBatches > 0 ? ` ${failedBatches} batch(es) failed.` : '')
      );
    } finally {
      setImporting(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  const handleSyncSheet = async () => {
    if (!activeDataset || !sheetUrlInput.trim()) return alert('Paste a Google Sheets tab URL first.');
    setSyncingSheet(true);
    try {
      const result = await syncProjectDatasetSheet(activeDataset.id, sheetUrlInput.trim());
      fetchAll();
      alert(`Synced ${result.rows_created} row(s) and ${result.fields_created} new column(s) from the sheet.`);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to sync the sheet.');
    } finally {
      setSyncingSheet(false);
    }
  };

  // ── Row add/edit (modal) ──────────────────────────────────────────────────────

  const openAddForm = () => {
    setEditingRow(null);
    setFormValues(emptyValuesFor(fields));
    setShowForm(true);
  };

  const openEditForm = (row) => {
    setEditingRow(row);
    setFormValues({ ...row.values });
    setShowForm(true);
  };

  const handleSaveForm = async () => {
    if (!activeDataset) return;
    setSaving(true);
    try {
      if (editingRow) {
        await updateProjectDatasetRow(slug, editingRow.id, { values: formValues });
      } else {
        await createProjectDatasetRow(slug, { dataset: activeDataset.id, values: formValues, order: rows.length });
      }
      setShowForm(false);
      setEditingRow(null);
      fetchAll();
    } catch (err) {
      alert('Failed to save row.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!confirm('Delete this row?')) return;
    try {
      await deleteProjectDatasetRow(slug, id);
      fetchAll();
    } catch (err) {
      alert('Failed to delete row.');
    }
  };

  // ── Search / sort / pagination ────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) =>
      Object.values(r.values || {}).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a.values?.[sortColumn] ?? '';
      const bVal = b.values?.[sortColumn] ?? '';
      return String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (name) => {
    if (sortColumn === name) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(name);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Table tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {datasets.map((d) => (
            <button key={d.id} onClick={() => switchDataset(d.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeId === d.id
                  ? 'text-[#0038A8] border-b-2 border-[#0038A8]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {d.name}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeId === d.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {d.rows?.length ?? 0}
              </span>
            </button>
          ))}
          <button onClick={() => setShowAddDataset(true)}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-400 hover:text-[#0038A8]">
            <Plus size={14} /> New Table
          </button>
        </div>

        {showAddDataset && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
            <input autoFocus value={newDatasetName} onChange={(e) => setNewDatasetName(e.target.value)}
              placeholder="Table name, e.g. Beneficiaries"
              onKeyDown={(e) => e.key === 'Enter' && handleAddDataset()}
              className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            <button onClick={handleAddDataset} className="px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium">Create</button>
            <button onClick={() => { setShowAddDataset(false); setNewDatasetName(''); }}
              className="px-3 py-2 text-gray-500 dark:text-gray-400"><X size={16} /></button>
          </div>
        )}

        {!activeDataset ? (
          <div className="text-center py-16 text-gray-400">
            <Table size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No tables yet. Create one to start adding data.</p>
          </div>
        ) : (
          <>
            {/* CSV import / column management */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload CSV to <strong>{activeDataset.name}</strong>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowCsvImport((s) => !s); setShowFieldForm(false); setShowSheetLink(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#0038A8]">
                  <FileSpreadsheet size={13} /> Import CSV
                </button>
                <button onClick={() => { setShowSheetLink((s) => !s); setShowCsvImport(false); setShowFieldForm(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#0038A8]">
                  <Link2 size={13} /> {activeDataset.sheet_url ? 'Sheet Linked' : 'Link Sheet'}
                </button>
                <button onClick={() => { setShowFieldForm((s) => !s); setShowCsvImport(false); setShowSheetLink(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#0038A8]">
                  <Settings2 size={13} /> Columns
                </button>
                <button onClick={() => handleDeleteDataset(activeDataset)}
                  className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>

            {showSheetLink && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste the URL of a Google Sheets tab, shared (Viewer is enough) with{' '}
                  <span className="font-mono">efas-sync@efas-488408.iam.gserviceaccount.com</span> — it doesn't need
                  to be public. Each sync <strong>replaces</strong> this table's rows with exactly what's currently
                  in the sheet — columns stay (new ones created automatically, existing ones reused), but any rows
                  added by hand with "Add Row" will be removed on the next sync. Don't mix manual rows into a
                  sheet-linked table.
                </p>
                <div className="flex items-center gap-2">
                  <input type="url" value={sheetUrlInput} onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                  <button onClick={handleSyncSheet} disabled={syncingSheet}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0038A8] text-white rounded-lg text-xs font-bold disabled:opacity-50 whitespace-nowrap">
                    <RefreshCw size={13} className={syncingSheet ? 'animate-spin' : ''} /> {syncingSheet ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
                {activeDataset.sheet_synced_at && (
                  <p className="text-[11px] text-gray-400">
                    Last synced {new Date(activeDataset.sheet_synced_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {showCsvImport && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  First row must be column headers. New columns are created automatically (number
                  type detected when every value in a column is numeric); columns that already
                  exist by name are reused, and their rows are just added to.
                </p>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={5}
                  placeholder="Name,Age,Barangay&#10;Juan Dela Cruz,34,Poblacion"
                  className="w-full px-3 py-2 text-xs font-mono border rounded-lg bg-white dark:bg-gray-800" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-[#0038A8]">
                    <Upload size={13} /> Upload CSV file
                    <input type="file" accept=".csv,text/csv" onChange={handleCsvFileUpload} className="hidden" />
                  </label>
                  <button onClick={handleImportCsv} disabled={importing}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#0038A8] text-white rounded-lg text-xs font-bold disabled:opacity-50">
                    {importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
                {importing && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{uploadStatus}</span>
                      <span className="text-xs font-bold text-[#0038A8]">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#0038A8] to-[#0055f1] rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {showFieldForm && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => {
                    const linkedDataset = f.reference_dataset ? datasets.find((d) => d.id === f.reference_dataset) : null;
                    return (
                      <span key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs">
                        {f.label} <span className="text-gray-400">({FIELD_TYPES.find((t) => t.value === f.field_type)?.label})</span>
                        {linkedDataset && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title={`Linked to ${linkedDataset.name}.${f.reference_column}`}>
                            <Link2 size={11} /> {linkedDataset.name}
                          </span>
                        )}
                        <button onClick={() => openLinkEditor(f)}
                          className={linkedDataset ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-[#0038A8]'}
                          title="Link this column to another table">
                          <Link2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteField(f)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                      </span>
                    );
                  })}
                  {fields.length === 0 && (
                    <span className="text-xs text-gray-400">No columns yet — add one below, or import a CSV.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input value={fieldForm.label} onChange={(e) => setFieldForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Column name, e.g. Beneficiary Name"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                  <select value={fieldForm.field_type} onChange={(e) => setFieldForm((f) => ({ ...f, field_type: e.target.value }))}
                    className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800">
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button onClick={handleAddField} className="flex items-center gap-1 px-3 py-1.5 bg-[#0038A8] text-white rounded-lg text-xs font-bold">
                    <Plus size={13} /> Add Column
                  </button>
                </div>

                {linkingField && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Link <strong>{linkingField.label}</strong> to a column in another table — once linked, every
                      other column of the matched row becomes available when building charts/cards on{' '}
                      <strong>{activeDataset.name}</strong>.
                    </p>
                    <div className="flex items-center gap-2">
                      <select value={linkDatasetId}
                        onChange={(e) => { setLinkDatasetId(e.target.value); setLinkColumn(''); }}
                        className="flex-1 px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800">
                        <option value="">Not linked</option>
                        {datasets.filter((d) => d.id !== activeDataset.id).map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <select value={linkColumn} onChange={(e) => setLinkColumn(e.target.value)} disabled={!linkDatasetId}
                        className="flex-1 px-2 py-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50">
                        <option value="">Match column...</option>
                        {(datasets.find((d) => d.id === Number(linkDatasetId))?.fields || []).map((f2) => (
                          <option key={f2.id} value={f2.name}>{f2.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleSaveLink} disabled={!!linkDatasetId && !linkColumn}
                        className="px-3 py-1.5 bg-[#0038A8] text-white rounded-lg text-xs font-bold disabled:opacity-50">
                        Save Link
                      </button>
                      <button onClick={() => setLinkingField(null)} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={openAddForm} disabled={fields.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
                  <Plus size={16} /> Add Row
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
                <span className="text-sm text-gray-500">{sortedRows.length} records</span>
              </div>
            </div>

            {/* Data table */}
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Add at least one column, or import a CSV, to start entering rows.</p>
            ) : paginatedRows.length === 0 ? (
              <div className="p-8 text-center">
                <Table size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">{searchTerm ? 'No matching rows' : 'No rows yet. Add one or import a CSV.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs sticky left-0 bg-gray-50 dark:bg-gray-800/50 z-10">#</th>
                      {fields.map((f) => (
                        <th key={f.id} onClick={() => handleSort(f.name)}
                          className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs cursor-pointer hover:text-gray-900 dark:hover:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {f.label}
                            {sortColumn === f.name && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                          </div>
                        </th>
                      ))}
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400 text-xs sticky right-0 bg-gray-50 dark:bg-gray-800/50 z-10">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, index) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 px-3 text-gray-400 text-xs sticky left-0 bg-white dark:bg-gray-800 z-10">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        {fields.map((f) => (
                          <td key={f.id} className="py-2 px-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={String(row.values?.[f.name] ?? '')}>
                            {formatCellValue(f, row.values?.[f.name])}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right sticky right-0 bg-white dark:bg-gray-800 z-10">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditForm(row)} className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
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
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}
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
          </>
        )}
      </div>

      {/* Add/Edit Row Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingRow ? 'Edit' : 'Add'} Row — {activeDataset?.name}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingRow(null); }}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.id}>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">{f.label}</label>
                  <FieldValueInput field={f} value={formValues[f.name]}
                    onChange={(v) => setFormValues((prev) => ({ ...prev, [f.name]: v }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveForm} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingRow(null); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
