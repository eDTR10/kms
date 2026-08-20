// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Save, Image, Upload, Link2, FileJson, ArrowUp, ArrowDown, LayoutGrid, List, GripVertical, Eye, EyeOff, Clock, Rows3, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getAccomplishments,
  createAccomplishment,
  updateAccomplishment,
  deleteAccomplishment,
  importAccomplishmentsJson,
  reorderAccomplishments,
} from '../../services/accomplishments';
import { getKmsSettings, updateKmsSettings } from '../../services/settings';
import { ACCOMPLISHMENT_STYLES } from '../../lib/gridStyles';

const STYLE_ICONS = {
  'collage-1': LayoutGrid, 'collage-2': LayoutGrid, 'collage-3': LayoutGrid,
  'collage-4': LayoutGrid, 'collage-5': LayoutGrid, 'collage-6': LayoutGrid,
  'collage-7': LayoutGrid, 'collage-8': LayoutGrid, 'collage-9': LayoutGrid,
  'collage-10': LayoutGrid,
};

// All 10 collage patterns for preview
const COLLAGE_PATTERNS = {
  'collage-1': [ // Classic
    { col: '1', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1', row: '2/4', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '2/4', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '2', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2/4', row: '4', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4/6', row: '2', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '4/6', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
  ],
  'collage-2': [ // Centered
    { col: '1', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2/5', row: '2/4', colSpan: '3', rowSpan: '2', size: 'big' },
    { col: '5', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
  ],
  'collage-3': [ // Zigzag
    { col: '1/3', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4/6', row: '2/4', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '1', row: '3/5', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '2/4', row: '3', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '2/4', row: '4', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '4/6', row: '4', colSpan: '2', rowSpan: '1', size: 'medium' },
  ],
  'collage-4': [ // Magazine
    { col: '1/3', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3', row: '1/3', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3/5', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '5', row: '3/5', colSpan: '1', rowSpan: '2', size: 'medium' },
  ],
  'collage-5': [ // Scattered
    { col: '1', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '1/3', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1/3', row: '2/4', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '4', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4/6', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
  ],
  'collage-6': [ // Cascade
    { col: '1/3', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '2/4', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '4', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4/6', row: '4/6', colSpan: '2', rowSpan: '2', size: 'big' },
  ],
  'collage-7': [ // Bricks
    { col: '1', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4/6', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '1/3', row: '2/4', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3/5', row: '4/6', colSpan: '2', rowSpan: '2', size: 'big' },
  ],
  'collage-8': [ // Panorama
    { col: '1/3', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3/5', row: '1/3', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '5', row: '1/3', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '1/3', row: '3', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '3', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1/3', row: '4', colSpan: '2', rowSpan: '1', size: 'wide' },
    { col: '3/5', row: '4/6', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '5', row: '4/6', colSpan: '1', rowSpan: '2', size: 'medium' },
  ],
  'collage-9': [ // Mosaic
    { col: '1', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '1/3', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '1/3', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '1', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1/3', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '3/5', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
  ],
  'collage-10': [ // Diamond
    { col: '3', row: '1', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '4', row: '2', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '1', row: '3/5', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '2/4', row: '3/5', colSpan: '2', rowSpan: '2', size: 'big' },
    { col: '4', row: '3/5', colSpan: '1', rowSpan: '2', size: 'medium' },
    { col: '5', row: '3', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '5', row: '4', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '2', row: '5', colSpan: '1', rowSpan: '1', size: 'small' },
    { col: '3', row: '5', colSpan: '1', rowSpan: '1', size: 'small' },
  ],
};

const EMPTY_FORM = {
  year: new Date().getFullYear(),
  metric: '',
  metric_label: '',
  title: '',
  description: '',
  image: '',
  image_file: null,
  breakdown: [],
};

export default function ManageAccomplishments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [imageMode, setImageMode] = useState('url');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [breakdownInput, setBreakdownInput] = useState({ label: '', value: '' });
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [savingStyle, setSavingStyle] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  // "Show" / "Hidden" tab — switches the whole content area between the normal collage
  // and a simple restore list of everything currently off the homepage.
  const [activeView, setActiveView] = useState('show');
  const [hiddenSearch, setHiddenSearch] = useState('');
  const [hiddenSort, setHiddenSort] = useState('recent');

  useEffect(() => {
    fetchItems();
    getKmsSettings().then((s) => setViewMode(s.accomplishments_style || 'list')).catch(() => {});
  }, []);

  const changeStyle = async (styleId) => {
    setViewMode(styleId);
    setSavingStyle(true);
    try { await updateKmsSettings({ accomplishments_style: styleId }); }
    catch (err) { console.error(err); }
    finally { setSavingStyle(false); }
  };

  const fetchItems = async () => {
    try { setItems(await getAccomplishments()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); setPreview(''); setImageMode('url');
  };

  const startEdit = (item) => {
    setForm({
      year: item.year, metric: item.metric, metric_label: item.metric_label,
      title: item.title, description: item.description || '', image: item.image || '',
      image_file: null, breakdown: item.breakdown || [],
    });
    setEditingId(item.id); setShowForm(true); setPreview(item.image || '');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setForm((f) => ({ ...f, image_file: file, image: '' }));
    setPreview(URL.createObjectURL(file));
  };

  const addBreakdown = () => {
    if (!breakdownInput.label.trim() || !breakdownInput.value.trim()) return;
    setForm((f) => ({ ...f, breakdown: [...f.breakdown, { ...breakdownInput }] }));
    setBreakdownInput({ label: '', value: '' });
  };

  const removeBreakdown = (index) => {
    setForm((f) => ({ ...f, breakdown: f.breakdown.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('year', form.year); fd.append('metric', form.metric);
      fd.append('metric_label', form.metric_label); fd.append('title', form.title);
      fd.append('description', form.description);
      if (form.image_file) fd.append('image_file', form.image_file);
      else if (form.image) fd.append('image', form.image);
      fd.append('breakdown', JSON.stringify(form.breakdown));
      if (editingId) await updateAccomplishment(editingId, fd);
      else await createAccomplishment(fd);
      resetForm(); fetchItems();
    } catch (err) { console.error(err); alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this accomplishment?')) return;
    try { await deleteAccomplishment(id); setItems((p) => p.filter((i) => i.id !== id)); }
    catch (err) { console.error(err); }
  };

  const handleJsonFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportText(ev.target.result as string);
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!importText.trim()) return alert('Paste or upload a JSON file first.');
    setImporting(true); setImportResult(null);
    try {
      const parsed = JSON.parse(importText);
      const result = await importAccomplishmentsJson(parsed);
      setImportResult(result); setShowImport(false); setImportText(''); fetchItems();
    } catch (err: any) {
      alert(`Import error: ${err?.response?.data?.error || err.message}`);
    } finally { setImporting(false); }
  };

  const toggleActive = async (item) => {
    // `active` defaults to true on the backend, so treat a missing value as "currently shown".
    const currentlyActive = item.active !== false;
    const nextActive = !currentlyActive;
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: nextActive } : i)));
    try {
      const fd = new FormData();
      fd.append('active', nextActive);
      await updateAccomplishment(item.id, fd);
    } catch (err) {
      console.error(err);
      setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: currentlyActive } : i)));
      alert('Failed to update — reverted');
    }
  };

  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    setDragIndex(null);
    const payload = newItems.map((item, i) => ({ id: item.id, order: i }));
    try { await reorderAccomplishments(payload); } catch (err) { console.error(err); fetchItems(); }
  };

  // Drag-to-reorder in grid view
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setItems(newItems);
    setDragIndex(null);
    const payload = newItems.map((item, i) => ({ id: item.id, order: i }));
    try { await reorderAccomplishments(payload); } catch (err) { console.error(err); fetchItems(); }
  };

  // ── Grid Preview Card (matches user-facing AccomplishmentCard) ──────────────
  function GridCard({ item, size, index }) {
    const big = size === 'big';
    const small = size === 'small';
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(index)}
        className={`group relative h-full w-full rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
          dragIndex === index ? 'border-[#0038A8] scale-95 opacity-60' : 'border-transparent hover:border-[#0038A8]/40'
        }`}
      >
        {item.image ? (
          <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold">
          {item.year}
        </span>
        {/* Drag handle */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-white/70" />
        </div>
        <div className={`absolute bottom-0 inset-x-0 ${big ? 'p-4' : small ? 'p-2' : 'p-3'}`}>
          <p className={`font-black text-[#FCD116] leading-none ${big ? 'text-2xl' : small ? 'text-base' : 'text-lg'}`}>
            {item.metric}
          </p>
          {!small && <p className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-0.5 mb-1">{item.metric_label}</p>}
          <h3 className={`font-bold leading-tight text-white ${big ? 'text-sm' : small ? 'text-[10px]' : 'text-xs'}`}
            style={small ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}>
            {item.title}
          </h3>
        </div>
      </div>
    );
  }

  const hiddenAccomplishments = items.filter((i) => i.active === false);
  const filteredHiddenAccomplishments = (() => {
    let list = hiddenAccomplishments;
    if (hiddenSearch.trim()) {
      const q = hiddenSearch.trim().toLowerCase();
      list = list.filter((i) => i.title?.toLowerCase().includes(q) || i.metric_label?.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (hiddenSort) {
      case 'title_asc': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'title_desc': sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
      case 'year_desc': sorted.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      case 'year_asc': sorted.sort((a, b) => (a.year || 0) - (b.year || 0)); break;
      default: sorted.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
    return sorted;
  })();
  // Visible items paired with their real position in `items` — the collage patterns assign
  // grid slots by array position, so hidden items must be filtered out *before* that position
  // is computed, or they leave gaps; `trueIndex` still points into the full `items` array so
  // drag/reorder (moveItem/handleDrop) keeps operating on real positions.
  const visibleAccomplishments = items
    .map((item, trueIndex) => ({ item, trueIndex }))
    .filter(({ item }) => item.active !== false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Accomplishments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create, edit, reorder, or remove accomplishments.</p>
        </div>
        <div className="flex gap-2">
          {/* Style selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {ACCOMPLISHMENT_STYLES.map(({ id, label }) => {
              const Icon = STYLE_ICONS[id] || LayoutGrid;
              return (
                <button key={id} onClick={() => changeStyle(id)} title={label}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${viewMode === id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                  <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => { setShowImport((s) => !s); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <FileJson size={15} /> Import JSON
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); setShowImport(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Imported <strong>{importResult.created}</strong> item{importResult.created !== 1 ? 's' : ''}.
            {importResult.errors?.length > 0 && ` (${importResult.errors.length} failed)`}
          </p>
          <button onClick={() => setImportResult(null)} className="text-green-600"><X size={16} /></button>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <FileJson size={16} className="text-emerald-600" /> Import from JSON
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Upload a <code>.json</code> file or paste below. Accepts array or <code>{'{'}data: [...]{'}'}</code>.</p>
          <div className="mb-3">
            <input type="file" accept=".json,application/json" onChange={handleJsonFileUpload}
              className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700" />
          </div>
          <textarea placeholder='[{"year": 2026, "metric": "58", ...}]' value={importText}
            onChange={(e) => setImportText(e.target.value)} rows={5}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleImportJson} disabled={importing || !importText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
              <Upload size={13} /> {importing ? 'Importing...' : 'Import'}
            </button>
            <button onClick={() => { setShowImport(false); setImportText(''); }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingId ? 'Edit' : 'New'} Accomplishment</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || 0 }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Metric (e.g. 58)" value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Metric Label" value={form.metric_label} onChange={(e) => setForm((f) => ({ ...f, metric_label: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
            className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
          <div className="mt-3">
            <div className="flex gap-2 mb-2">
              <button onClick={() => setImageMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium ${imageMode === 'url' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Link2 size={12} /> URL
              </button>
              <button onClick={() => setImageMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium ${imageMode === 'upload' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Upload size={12} /> Upload
              </button>
            </div>
            {imageMode === 'url' ? (
              <input type="url" placeholder="https://..." value={form.image}
                onChange={(e) => { setForm((f) => ({ ...f, image: e.target.value, image_file: null })); setPreview(e.target.value); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            ) : (
              <input type="file" accept="image/*" onChange={handleFileChange}
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0038A8] file:text-white" />
            )}
            <p className="text-xs text-gray-400 mt-1">Max 10MB. Auto-converted to WebP.</p>
            {preview && <img src={preview} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />}
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Breakdown</label>
            <div className="flex gap-2 mt-1">
              <input placeholder="Label" value={breakdownInput.label} onChange={(e) => setBreakdownInput((b) => ({ ...b, label: e.target.value }))}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              <input placeholder="Value" value={breakdownInput.value} onChange={(e) => setBreakdownInput((b) => ({ ...b, value: e.target.value }))}
                className="w-24 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              <button onClick={addBreakdown} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg"><Plus size={12} /></button>
            </div>
            {form.breakdown.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{b.label}:</span> {b.value}
                    <button onClick={() => removeBreakdown(i)} className="text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {!loading && (
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
            Hidden ({hiddenAccomplishments.length})
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : activeView === 'hidden' ? (
        <div>
          {hiddenAccomplishments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input type="text" placeholder="Search hidden accomplishments..." value={hiddenSearch} onChange={(e) => setHiddenSearch(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              <select value={hiddenSort} onChange={(e) => setHiddenSort(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="recent">Recently hidden</option>
                <option value="title_asc">Title — A to Z</option>
                <option value="title_desc">Title — Z to A</option>
                <option value="year_desc">Year — Newest first</option>
                <option value="year_asc">Year — Oldest first</option>
              </select>
            </div>
          )}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {hiddenAccomplishments.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">Nothing hidden — accomplishments you hide from the homepage will show up here.</p>
            ) : filteredHiddenAccomplishments.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">No hidden accomplishments match "{hiddenSearch}".</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHiddenAccomplishments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Star size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{item.metric} {item.metric_label} · {item.year}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => toggleActive(item)}
                        className="p-1.5 text-gray-400 hover:text-green-500 transition-colors" title="Click to feature on homepage">
                        <EyeOff size={14} />
                      </button>
                      <button type="button" onClick={() => startEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Image size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No accomplishments yet.</p>
        </div>
      ) : viewMode.startsWith('collage-') ? (
        /* ── Grid Preview (matches user-facing collage) ───────────────────── */
        <div>
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <Eye size={12} /> Drag tiles to reorder. Style: <strong>{ACCOMPLISHMENT_STYLES.find(s => s.id === viewMode)?.label}</strong>
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 auto-rows-[140px] lg:auto-rows-[110px] gap-3">
            {visibleAccomplishments.map(({ item, trueIndex }, i) => {
              const currentPattern = COLLAGE_PATTERNS[viewMode] || COLLAGE_PATTERNS['collage-1'];
              const pattern = i < currentPattern.length ? currentPattern[i] : null;
              const style = pattern
                ? { gridColumn: pattern.col, gridRow: pattern.row }
                : {};
              return (
                <div key={item.id} style={style}
                  draggable
                  onDragStart={() => handleDragStart(trueIndex)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(trueIndex)}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                    dragIndex === trueIndex ? 'border-[#0038A8] scale-95 opacity-60' : 'border-transparent hover:border-[#0038A8]/40'
                  }`}>
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold">{item.year}</span>
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} className="text-white/70" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <p className="font-black text-[#FCD116] leading-none text-lg">{item.metric}</p>
                    <p className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-0.5">{item.metric_label}</p>
                    <h3 className="text-xs font-bold leading-tight text-white mt-1 truncate">{item.title}</h3>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(item); }}
                      title="On homepage — click to hide from homepage"
                      className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Eye size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(trueIndex, -1); }} disabled={trueIndex === 0}
                      className="p-1 bg-black/40 hover:bg-black/60 text-white rounded disabled:opacity-30"><ArrowUp size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(trueIndex, 1); }} disabled={trueIndex === items.length - 1}
                      className="p-1 bg-black/40 hover:bg-black/60 text-white rounded disabled:opacity-30"><ArrowDown size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                      className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Edit2 size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1 bg-red-500/60 hover:bg-red-500/80 text-white rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <Eye size={12} /> Drag to reorder · Style: <strong>{ACCOMPLISHMENT_STYLES.find(s => s.id === viewMode)?.label}</strong>
            {savingStyle && <span className="text-[10px] text-gray-300 ml-1">(saving...)</span>}
          </p>

          {/* ── Grid (collage pattern) ───────────────────────────────────── */}
          {viewMode.startsWith('collage-') && (
            <div className="grid grid-cols-2 lg:grid-cols-5 auto-rows-[140px] lg:auto-rows-[110px] gap-3">
              {items.map((item, i) => {
                const currentPattern = COLLAGE_PATTERNS[viewMode] || COLLAGE_PATTERNS['collage-1'];
                const pattern = i < currentPattern.length ? currentPattern[i] : null;
                const style = pattern ? { gridColumn: pattern.col, gridRow: pattern.row } : {};
                return (
                  <div key={item.id} style={style} draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all cursor-grab ${dragIndex === i ? 'border-[#0038A8] scale-95 opacity-60' : 'border-transparent hover:border-[#0038A8]/40'}`}>
                    {item.image ? <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold">{item.year}</span>
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <p className="font-black text-[#FCD116] leading-none text-lg">{item.metric}</p>
                      <p className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-0.5">{item.metric_label}</p>
                      <h3 className="text-xs font-bold leading-tight text-white mt-1 truncate">{item.title}</h3>
                    </div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); moveItem(i, -1); }} disabled={i === 0}
                        className="p-1 bg-black/40 text-white rounded disabled:opacity-30"><ArrowUp size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveItem(i, 1); }} disabled={i === items.length - 1}
                        className="p-1 bg-black/40 text-white rounded disabled:opacity-30"><ArrowDown size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                        className="p-1 bg-black/40 text-white rounded"><Edit2 size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1 bg-red-500/60 text-white rounded"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Collage ──────────────────────────────────────────────────── */}
          {viewMode === 'collage' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[160px] gap-3">
              {items.map((item, i) => {
                const patterns = [
                  { gridColumn: 'span 2', gridRow: 'span 2' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 2' },
                ];
                const style = patterns[i % patterns.length];
                return (
                  <div key={item.id} style={style} draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all cursor-grab ${dragIndex === i ? 'border-[#0038A8] scale-95 opacity-60' : 'border-transparent hover:border-[#0038A8]/40'}`}>
                    {item.image ? <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                      : <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold">{item.year}</span>
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <p className="font-black text-[#FCD116] leading-none text-2xl">{item.metric}</p>
                      <p className="text-[10px] font-medium text-white/70 uppercase tracking-wide mt-0.5">{item.metric_label}</p>
                      <h3 className="text-sm font-bold leading-tight text-white mt-1">{item.title}</h3>
                    </div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); moveItem(i, -1); }} disabled={i === 0}
                        className="p-1 bg-black/40 text-white rounded disabled:opacity-30"><ArrowUp size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveItem(i, 1); }} disabled={i === items.length - 1}
                        className="p-1 bg-black/40 text-white rounded disabled:opacity-30"><ArrowDown size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                        className="p-1 bg-black/40 text-white rounded"><Edit2 size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1 bg-red-500/60 text-white rounded"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
