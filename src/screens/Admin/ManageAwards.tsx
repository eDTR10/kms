// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Save, Image, Upload, Link2, FileJson, FileSpreadsheet, ArrowUp, ArrowDown, LayoutGrid, List, GripVertical, Award, Eye, EyeOff, Columns3, Grid3x3, Clock, Rows3, Star, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getAwards, createAward, updateAward, deleteAward, importAwardsJson, reorderAwards,
  createAwardImage, deleteAwardImage,
} from '../../services/awards';
import { getKmsSettings, updateKmsSettings } from '../../services/settings';
import { AWARD_STYLES } from '../../lib/gridStyles';

const EMPTY_FORM = {
  title: '', issuer: '', recognitionLevel: '', dateReceived: '', location: '',
  year: new Date().getFullYear(), description: '',
};

const STYLE_ICONS = {
  list: List, cards: Columns3, grid: Grid3x3, collage: LayoutGrid,
  timeline: Clock, masonry: Rows3, showcase: Star, horizontal: ArrowRight,
};

// "Manual" is the drag/arrow-reorderable order (the `order` field, what the public site
// uses); every other option is a view-only computed sort — switching to one shows items
// in that order but disables drag/arrows, since dragging a computed-sort view would end
// up reordering by the wrong index and corrupt the real manual order underneath it.
const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual (drag to reorder)' },
  { value: 'year_desc', label: 'Year — Newest first' },
  { value: 'year_asc', label: 'Year — Oldest first' },
  { value: 'title_asc', label: 'Title — A to Z' },
  { value: 'created_desc', label: 'Date added — Newest first' },
];

// Same simple parser used for Free Wi-Fi CSV imports elsewhere in this app. Note: it
// splits rows on raw newlines, so a quoted cell containing an embedded line break
// (e.g. a multi-line description) will be split into two malformed rows — a known
// limitation, not something introduced here.
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

// Maps a CSV row (matching the "DICT X Awards and Recognitions" export: Award Name,
// Awarding Body, Recognition Level, Date Received, Description, Location, MOV, Year)
// to an Award create payload, plus any MOV image URLs pulled out separately — MOV
// can only be a single-line list of URLs here (comma/semicolon-separated), since a
// CSV cell can't carry an uploaded file.
function csvRowToAwardPayload(row) {
  const movRaw = row['MOV'] || row['Mov'] || row['mov'] || '';
  const movUrls = movRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return {
    award: {
      title: row['Award Name'] || row['Title'] || '',
      issuer: row['Awarding Body'] || row['Issuer'] || '',
      recognition_level: row['Recognition Level'] || '',
      date_received: row['Date Received'] || '',
      location: row['Location'] || '',
      description: row['Description'] || '',
      year: parseInt(row['Year'], 10) || new Date().getFullYear(),
    },
    movUrls,
  };
}

export default function ManageAwards() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  // MOV gallery: `existingImages` are already persisted (edit mode only, removable
  // immediately via the API); `pendingImages` are staged locally and only actually
  // created once the award itself is saved (so brand-new awards — with no id yet —
  // can still queue images before their first Save).
  const [existingImages, setExistingImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [movMode, setMovMode] = useState('url');
  const [movUrlInput, setMovUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFormat, setImportFormat] = useState('json');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [viewStyle, setViewStyle] = useState('cards');
  const [savingStyle, setSavingStyle] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [sortBy, setSortBy] = useState('manual');
  // "Show" / "Hidden" tab — switches the whole content area between the normal styled
  // list and a simple restore list of everything currently off the homepage, instead of
  // hunting for the dimmed ones across 8 view styles.
  const [activeView, setActiveView] = useState('show');
  const [hiddenSearch, setHiddenSearch] = useState('');
  const [hiddenSort, setHiddenSort] = useState('recent');

  const canReorder = sortBy === 'manual';
  const sortedItems = useMemo(() => {
    if (sortBy === 'manual') return items;
    const arr = [...items];
    switch (sortBy) {
      case 'year_desc': return arr.sort((a, b) => (b.year || 0) - (a.year || 0));
      case 'year_asc': return arr.sort((a, b) => (a.year || 0) - (b.year || 0));
      case 'title_asc': return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'created_desc': return arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      default: return arr;
    }
  }, [items, sortBy]);
  const hiddenAwards = useMemo(() => items.filter((i) => i.active === false), [items]);
  const filteredHiddenAwards = useMemo(() => {
    let list = hiddenAwards;
    if (hiddenSearch.trim()) {
      const q = hiddenSearch.trim().toLowerCase();
      list = list.filter((i) => i.title?.toLowerCase().includes(q) || i.issuer?.toLowerCase().includes(q));
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
  }, [hiddenAwards, hiddenSearch, hiddenSort]);
  // Visible items paired with their real position in `sortedItems` — collage assigns tile
  // size by position in sequence, so hidden items must be filtered out before that position
  // is computed; `trueIndex` still points into `sortedItems` so drag/reorder keeps working.
  const visibleSortedItems = useMemo(
    () => sortedItems.map((item, trueIndex) => ({ item, trueIndex })).filter(({ item }) => item.active !== false),
    [sortedItems]
  );

  useEffect(() => {
    fetchItems();
    getKmsSettings().then((s) => setViewStyle(s.awards_style || 'cards')).catch(() => {});
  }, []);

  const changeStyle = async (styleId) => {
    setViewStyle(styleId);
    setSavingStyle(true);
    try { await updateKmsSettings({ awards_style: styleId }); }
    catch (err) { console.error(err); }
    finally { setSavingStyle(false); }
  };

  const fetchItems = async () => {
    try {
      const data = await getAwards();
      // Cover image for card thumbnails: first MOV image if any, else the legacy
      // single `image` field (old records saved before the MOV gallery existed).
      setItems(data.map(item => ({ ...item, coverImage: item.images?.[0]?.image || item.image || '' })));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false);
    setExistingImages([]); setPendingImages([]); setMovMode('url'); setMovUrlInput('');
  };

  const startEdit = (item) => {
    setForm({
      title: item.title, issuer: item.issuer || '',
      recognitionLevel: item.recognition_level || '', dateReceived: item.date_received || '',
      location: item.location || '', year: item.year, description: item.description || '',
    });
    setEditingId(item.id); setShowForm(true);
    setExistingImages(item.images || []);
    setPendingImages([]); setMovMode('url'); setMovUrlInput('');
  };

  const addPendingMovUrl = () => {
    if (!movUrlInput.trim()) return;
    setPendingImages(p => [...p, { key: `pending-${Date.now()}-${Math.random()}`, type: 'url', value: movUrlInput.trim(), previewUrl: movUrlInput.trim() }]);
    setMovUrlInput('');
  };

  const addPendingMovFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setPendingImages(p => [...p, { key: `pending-${Date.now()}-${Math.random()}`, type: 'file', value: file, previewUrl: URL.createObjectURL(file) }]);
    e.target.value = '';
  };

  const removePendingMov = (key) => setPendingImages(p => p.filter(x => x.key !== key));

  const removeExistingMov = async (id) => {
    if (!confirm('Remove this image?')) return;
    try {
      await deleteAwardImage(id);
      setExistingImages(p => p.filter(x => x.id !== id));
    } catch (err) { console.error(err); alert('Failed to remove image'); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('issuer', form.issuer);
      fd.append('recognition_level', form.recognitionLevel);
      fd.append('date_received', form.dateReceived);
      fd.append('location', form.location);
      fd.append('year', form.year);
      fd.append('description', form.description);
      let awardId = editingId;
      if (editingId) await updateAward(editingId, fd);
      else awardId = (await createAward(fd)).id;

      for (const pending of pendingImages) {
        const movFd = new FormData();
        movFd.append('award', awardId);
        if (pending.type === 'file') movFd.append('image_file', pending.value);
        else movFd.append('image', pending.value);
        await createAwardImage(movFd);
      }

      resetForm(); fetchItems();
    } catch (err) { console.error(err); alert('Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this award?')) return;
    try { await deleteAward(id); setItems((p) => p.filter((i) => i.id !== id)); } catch (err) { console.error(err); }
  };

  const toggleActive = async (item) => {
    // `active` defaults to true on the backend, so treat a missing value as "currently shown".
    const currentlyActive = item.active !== false;
    const nextActive = !currentlyActive;
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: nextActive } : i)));
    try {
      const fd = new FormData();
      fd.append('active', nextActive);
      await updateAward(item.id, fd);
    } catch (err) {
      console.error(err);
      setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: !nextActive } : i)));
      alert('Failed to update visibility');
    }
  };

  const handleImportFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportText(ev.target.result as string);
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    if (!importText.trim()) return alert('Paste or upload JSON first.');
    setImporting(true); setImportResult(null);
    try {
      const result = await importAwardsJson(JSON.parse(importText));
      setImportResult(result); setShowImport(false); setImportText(''); fetchItems();
    } catch (err: any) { alert(`Import error: ${err?.response?.data?.error || err.message}`); }
    finally { setImporting(false); }
  };

  const handleImportCsv = async () => {
    if (!importText.trim()) return alert('Paste or upload CSV first.');
    setImporting(true); setImportResult(null);
    try {
      const rows = parseCsvText(importText);
      if (rows.length === 0) { alert('No rows found — check the CSV has a header row plus at least one data row.'); return; }
      const parsed = rows.map(csvRowToAwardPayload);
      const result = await importAwardsJson(parsed.map((p) => p.award));

      // Correlate each created award back to its row's MOV URLs. The backend skips
      // invalid rows, so `result.items` is shorter than `parsed` whenever there were
      // errors — walk only the indices that actually succeeded to keep them paired.
      const failedIndices = new Set((result.errors || []).map((e) => e.index));
      const successfulIndices = parsed.map((_, i) => i).filter((i) => !failedIndices.has(i));
      const movTasks = [];
      successfulIndices.forEach((origIndex, k) => {
        const createdAward = result.items?.[k];
        const movUrls = parsed[origIndex].movUrls;
        if (!createdAward || !movUrls.length) return;
        movUrls.forEach((url) => {
          const fd = new FormData();
          fd.append('award', createdAward.id);
          fd.append('image', url);
          movTasks.push(createAwardImage(fd));
        });
      });
      if (movTasks.length) await Promise.allSettled(movTasks);

      setImportResult(result); setShowImport(false); setImportText(''); fetchItems();
    } catch (err: any) { alert(`Import error: ${err?.response?.data?.error || err.message}`); }
    finally { setImporting(false); }
  };

  const handleImport = () => (importFormat === 'csv' ? handleImportCsv() : handleImportJson());

  // Both guarded on canReorder (sortBy === 'manual'): index/i passed in from the render
  // is the item's position within whatever's currently displayed (sortedItems) — while a
  // computed sort is active that position doesn't match `items`' real order, so acting on
  // it here would silently reorder the wrong pair. Manual is the only sort where
  // sortedItems === items, so index is safe to use directly against `items`.
  const moveItem = async (index, direction) => {
    if (!canReorder) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    try { await reorderAwards(newItems.map((item, i) => ({ id: item.id, order: i }))); }
    catch (err) { console.error(err); fetchItems(); }
  };

  const handleDragStart = (index) => { if (canReorder) setDragIndex(index); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (dropIndex) => {
    if (!canReorder || dragIndex === null || dragIndex === dropIndex) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setItems(newItems); setDragIndex(null);
    try { await reorderAwards(newItems.map((item, i) => ({ id: item.id, order: i }))); }
    catch (err) { console.error(err); fetchItems(); }
  };



  // ── Reusable card component ────────────────────────────────────────────────
  function AwardItemCard({ item, index, variant }) {
    if (item.active === false) return null;
    const isCompact = variant === 'list';
    const isCollage = variant === 'collage';

    if (isCompact) {
      return (
        <div draggable={canReorder} onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)}
          className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm group cursor-grab ${dragIndex === index ? 'opacity-50 scale-95' : ''}`}>
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
            {item.coverImage ? <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-400"><Award size={20} /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">{item.year}</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-1">{item.title}</p>
            {item.issuer && <p className="text-xs text-gray-400">{item.issuer}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleActive(item)} title="On homepage — click to hide from homepage"
                className="p-1.5 text-green-500 hover:text-green-600">
                <Eye size={14} />
              </button>
              <button onClick={() => moveItem(index, -1)} disabled={!canReorder || index === 0}
                className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={14} /></button>
              <button onClick={() => moveItem(index, 1)} disabled={!canReorder || index === sortedItems.length - 1}
                className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={14} /></button>
              <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-[#0038A8]"><Edit2 size={15} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
        </div>
      );
    }

    // Card / Grid / Collage — all use image-forward cards
    return (
      <div draggable={canReorder} onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)}
        className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
          dragIndex === index ? 'border-[#0038A8] scale-95 opacity-60' : 'border-transparent hover:border-[#0038A8]/40'
        } ${isCollage ? 'h-full' : ''}`}>
        {item.coverImage ? (
          <img src={item.coverImage} alt={item.title} className={`${isCollage ? 'absolute inset-0 w-full h-full' : 'w-full h-40'} object-cover`} />
        ) : (
          <div className={`${isCollage ? 'absolute inset-0' : 'w-full h-40'} bg-gradient-to-br from-[#FCD116]/20 to-[#0038A8]/20 flex items-center justify-center`}>
            <Award size={32} className="text-[#0038A8]/30" />
          </div>
        )}
        {item.images?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-medium">
            +{item.images.length} photos
          </span>
        )}
        {isCollage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />}
        <div className={`${isCollage ? 'absolute bottom-0 inset-x-0 p-4' : 'p-4'}`}>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCollage ? 'bg-white/15 backdrop-blur-sm text-white' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>{item.year}</span>
          <h3 className={`font-bold leading-tight mt-2 ${isCollage ? 'text-white text-sm' : 'text-gray-900 dark:text-white text-base'}`}>{item.title}</h3>
          {item.issuer && <p className={`text-xs mt-1 ${isCollage ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{item.issuer}</p>}
          {!isCollage && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{item.description}</p>}
        </div>
        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); toggleActive(item); }} title="On homepage — click to hide from homepage"
            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Eye size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }} disabled={!canReorder || index === 0}
            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded disabled:opacity-30"><ArrowUp size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }} disabled={!canReorder || index === sortedItems.length - 1}
            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded disabled:opacity-30"><ArrowDown size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); startEdit(item); }}
            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Edit2 size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
            className="p-1 bg-red-500/60 hover:bg-red-500/80 text-white rounded"><Trash2 size={12} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Awards</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create, edit, reorder, or remove awards.</p>
        </div>
        <div className="flex gap-2">
          {/* Grid style selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {AWARD_STYLES.map(({ id, label }) => {
              const Icon = STYLE_ICONS[id] || Grid3x3;
              return (
                <button key={id} onClick={() => changeStyle(id)} title={label}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${viewStyle === id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                  <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => { setShowImport((s) => !s); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
            <FileJson size={15} /> Import
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); setShowImport(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52]">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Imported <strong>{importResult.created}</strong> award{importResult.created !== 1 ? 's' : ''}.
          </p>
          <button onClick={() => setImportResult(null)} className="text-green-600"><X size={16} /></button>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              {importFormat === 'csv' ? <FileSpreadsheet size={16} className="text-emerald-600" /> : <FileJson size={16} className="text-emerald-600" />}
              Import Awards
            </h3>
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-0.5 border border-emerald-200 dark:border-emerald-800">
              <button onClick={() => { setImportFormat('json'); setImportText(''); }}
                className={`px-3 py-1 text-xs rounded-md font-medium ${importFormat === 'json' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>JSON</button>
              <button onClick={() => { setImportFormat('csv'); setImportText(''); }}
                className={`px-3 py-1 text-xs rounded-md font-medium ${importFormat === 'csv' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}>CSV</button>
            </div>
          </div>
          {importFormat === 'csv' ? (
            <p className="text-xs text-gray-500 mb-3">
              Upload a <code>.csv</code> or paste below. Expected headers: <code>Award Name, Awarding Body, Recognition Level, Date Received, Description, Location, MOV, Year</code>.
              MOV can hold one or more image URLs separated by commas or semicolons.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mb-3">Upload a <code>.json</code> or paste below.</p>
          )}
          <div className="mb-3">
            <input type="file" accept={importFormat === 'csv' ? '.csv,text/csv' : '.json,application/json'} onChange={handleImportFileUpload}
              className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-600 file:text-white" />
          </div>
          <textarea
            placeholder={importFormat === 'csv'
              ? 'Award Name,Awarding Body,Recognition Level,Date Received,Description,Location,MOV,Year\nRecognition Award,CHED Caraga,Local,"August 17, 2020",...,Caraga Region,,2020'
              : '[{"title": "...", "issuer": "...", "year": 2026, ...}]'}
            value={importText} onChange={(e) => setImportText(e.target.value)} rows={5}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleImport} disabled={importing || !importText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
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
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingId ? 'Edit' : 'New'} Award</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder="Award Name" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Awarding Body" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Recognition Level (e.g. Local, International)" value={form.recognitionLevel}
              onChange={(e) => setForm((f) => ({ ...f, recognitionLevel: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Date Received (e.g. August 17, 2020)" value={form.dateReceived}
              onChange={(e) => setForm((f) => ({ ...f, dateReceived: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || 0 }))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
            className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />

          {/* MOV (Means of Verification) — multiple images per award, each a URL or upload */}
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">MOV (Means of Verification)</label>
            {(existingImages.length > 0 || pendingImages.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.image} alt="MOV" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                    <button onClick={() => removeExistingMov(img.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full">
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {pendingImages.map((img) => (
                  <div key={img.key} className="relative group">
                    <img src={img.previewUrl} alt="MOV (pending)" className="w-16 h-16 rounded-lg object-cover border-2 border-dashed border-[#0038A8]/50" />
                    <button onClick={() => removePendingMov(img.key)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <button onClick={() => setMovMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium ${movMode === 'url' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Link2 size={12} /> URL
              </button>
              <button onClick={() => setMovMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium ${movMode === 'upload' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Upload size={12} /> Upload
              </button>
            </div>
            {movMode === 'url' ? (
              <div className="flex gap-2">
                <input type="url" placeholder="https://..." value={movUrlInput}
                  onChange={(e) => setMovUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPendingMovUrl(); } }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
                <button onClick={addPendingMovUrl} type="button"
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">Add</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={addPendingMovFile}
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0038A8] file:text-white" />
            )}
            <p className="text-xs text-gray-400 mt-1">Add as many images as needed. Max 10MB each, auto-converted to WebP. New images save when you hit Save below.</p>
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
            Hidden ({hiddenAwards.length})
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : activeView === 'hidden' ? (
        <div>
          {hiddenAwards.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input type="text" placeholder="Search hidden awards..." value={hiddenSearch} onChange={(e) => setHiddenSearch(e.target.value)}
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
            {hiddenAwards.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">Nothing hidden — awards you hide from the homepage will show up here.</p>
            ) : filteredHiddenAwards.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">No hidden awards match "{hiddenSearch}".</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHiddenAwards.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Award size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.title}</p>
                        {item.issuer && <p className="text-[10px] text-gray-400 truncate">{item.issuer} · {item.year}</p>}
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
          <p className="text-sm">No awards yet.</p>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Eye size={12} /> {canReorder ? 'Drag to reorder' : 'Sorted — switch to Manual to drag-reorder'} · Style: <strong>{AWARD_STYLES.find(s => s.id === viewStyle)?.label}</strong>
              {savingStyle && <span className="text-[10px] text-gray-300 ml-1">(saving...)</span>}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              Sort by
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          {viewStyle === 'list' && (
            <div className="space-y-3">
              {sortedItems.map((item, i) => <AwardItemCard key={item.id} item={item} index={i} variant="list" />)}
            </div>
          )}

          {viewStyle === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedItems.map((item, i) => <AwardItemCard key={item.id} item={item} index={i} variant="cards" />)}
            </div>
          )}

          {viewStyle === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedItems.map((item, i) => <AwardItemCard key={item.id} item={item} index={i} variant="grid" />)}
            </div>
          )}

          {viewStyle === 'collage' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] gap-3">
              {visibleSortedItems.map(({ item, trueIndex }, i) => {
                const patterns = [
                  { gridColumn: 'span 2', gridRow: 'span 2' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 2' },
                ];
                const style = patterns[i % patterns.length];
                return (
                  <div key={item.id} style={style}>
                    <AwardItemCard item={item} index={trueIndex} variant="collage" />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          {viewStyle === 'timeline' && (
            <div className="relative">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2 hidden lg:block" />
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 lg:hidden" />
              <div className="space-y-8">
                {sortedItems.map((item, i) => {
                  if (item.active === false) return null;
                  const isLeft = i % 2 === 0;
                  return (
                    <div key={item.id} className={`relative flex items-start gap-4 lg:gap-0 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                      {/* Dot */}
                      <div className="absolute left-6 lg:left-1/2 w-4 h-4 -translate-x-1/2 rounded-full bg-[#0038A8] border-4 border-white dark:border-gray-900 z-10 mt-5" />
                      {/* Spacer for mobile */}
                      <div className="w-12 shrink-0 lg:hidden" />
                      {/* Card */}
                      <div className={`flex-1 lg:w-1/2 ${isLeft ? 'lg:pr-10' : 'lg:pl-10'}`}
                        draggable={canReorder} onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}>
                        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm group hover:shadow-md transition-shadow ${dragIndex === i ? 'opacity-50 scale-95' : ''}`}>
                          <div className="flex items-start gap-4">
                            {item.coverImage && (
                              <img src={item.coverImage} alt={item.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-[#0038A8] text-white px-2 py-0.5 rounded-full font-bold">{item.year}</span>
                                {item.issuer && <span className="text-xs text-gray-400">{item.issuer}</span>}
                              </div>
                              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => toggleActive(item)} title="On homepage — click to hide from homepage"
                                className="p-1 text-green-500 hover:text-green-600">
                                <Eye size={12} />
                              </button>
                              <button onClick={() => moveItem(i, -1)} disabled={!canReorder || i === 0}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={12} /></button>
                              <button onClick={() => moveItem(i, 1)} disabled={!canReorder || i === sortedItems.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={12} /></button>
                              <button onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-[#0038A8]"><Edit2 size={12} /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Other side spacer (desktop) */}
                      <div className="hidden lg:block lg:w-1/2" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Masonry (CSS columns) ────────────────────────────────────── */}
          {viewStyle === 'masonry' && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {sortedItems.map((item, i) => item.active === false ? null : (
                <div key={item.id} className="break-inside-avoid"
                  draggable={canReorder} onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}>
                  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group hover:shadow-md transition-shadow ${dragIndex === i ? 'opacity-50 scale-95' : ''}`}>
                    {item.coverImage && (
                      <img src={item.coverImage} alt={item.title}
                        className="w-full object-cover"
                        style={{ height: `${160 + (i % 3) * 60}px` }} />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-[#FCD116]/20 text-[#0038A8] dark:text-yellow-400 px-2 py-0.5 rounded-full font-bold">{item.year}</span>
                        {item.issuer && <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.issuer}</span>}
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
                      {/* Hover actions */}
                      <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleActive(item)} title="On homepage — click to hide from homepage"
                          className="p-1.5 bg-gray-100 dark:bg-gray-700 text-green-500 rounded-lg">
                          <Eye size={12} />
                        </button>
                        <button onClick={() => moveItem(i, -1)} disabled={!canReorder || i === 0}
                          className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg disabled:opacity-20"><ArrowUp size={12} /></button>
                        <button onClick={() => moveItem(i, 1)} disabled={!canReorder || i === sortedItems.length - 1}
                          className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg disabled:opacity-20"><ArrowDown size={12} /></button>
                        <button onClick={() => startEdit(item)}
                          className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg"><Edit2 size={12} /></button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-lg"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Showcase (featured first + grid) ─────────────────────────── */}
          {viewStyle === 'showcase' && (() => {
            const featuredIndex = sortedItems.findIndex((it) => it.active !== false);
            if (featuredIndex === -1) return null;
            const featured = sortedItems[featuredIndex];
            return (
              <div className="space-y-6">
                {/* Featured first visible item */}
                <div className="relative rounded-2xl overflow-hidden h-72 lg:h-80 group"
                  draggable={canReorder} onDragStart={() => handleDragStart(featuredIndex)} onDragOver={handleDragOver} onDrop={() => handleDrop(featuredIndex)}>
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 rounded-full bg-[#FCD116] text-[#0038A8] text-xs font-black uppercase tracking-wider">Featured</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold">{featured.year}</span>
                      {featured.issuer && <span className="text-white/70 text-xs">{featured.issuer}</span>}
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">{featured.title}</h2>
                    <p className="text-sm text-white/80 max-w-2xl line-clamp-2">{featured.description}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleActive(featured)} title="On homepage — click to hide from homepage"
                      className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded"><Eye size={14} /></button>
                    <button onClick={() => startEdit(featured)}
                      className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(featured.id)}
                      className="p-1.5 bg-red-500/60 hover:bg-red-500/80 text-white rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
                {/* Rest in grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sortedItems.map((item, i) => {
                    if (i === featuredIndex || item.active === false) return null;
                    return (
                      <div key={item.id}
                        draggable={canReorder} onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}>
                        <AwardItemCard item={item} index={i} variant="cards" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Horizontal Scroll ────────────────────────────────────────── */}
          {viewStyle === 'horizontal' && (
            <div className="overflow-x-auto pb-4 -mx-8 px-8">
              <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                {sortedItems.map((item, i) => item.active === false ? null : (
                  <div key={item.id} className="w-72 shrink-0"
                    draggable={canReorder} onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i)}>
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group hover:shadow-lg transition-all hover:-translate-y-1 h-full ${dragIndex === i ? 'opacity-50 scale-95' : ''}`}>
                      <div className="relative h-44 overflow-hidden">
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#FCD116]/20 to-[#0038A8]/20 flex items-center justify-center">
                            <Award size={36} className="text-[#0038A8]/30" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#0038A8] text-white text-xs font-bold">{item.year}</span>
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleActive(item)} title="On homepage — click to hide from homepage"
                            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Eye size={12} /></button>
                          <button onClick={() => startEdit(item)}
                            className="p-1 bg-black/40 hover:bg-black/60 text-white rounded"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete(item.id)}
                            className="p-1 bg-red-500/60 hover:bg-red-500/80 text-white rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="p-4">
                        {item.issuer && <p className="text-[10px] text-[#0038A8] dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">{item.issuer}</p>}
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-2">{item.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{item.description}</p>
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveItem(i, -1)} disabled={!canReorder || i === 0}
                            className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 rounded disabled:opacity-20">← Prev</button>
                          <button onClick={() => moveItem(i, 1)} disabled={!canReorder || i === sortedItems.length - 1}
                            className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 rounded disabled:opacity-20">Next →</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
