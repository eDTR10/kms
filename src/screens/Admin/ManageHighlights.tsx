// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Image, Upload, Link2, FileJson, ArrowUp, ArrowDown, LayoutGrid, List, GripVertical, Eye, EyeOff, Rows3, ArrowRight, Star } from 'lucide-react';
import { getHighlights, createHighlight, updateHighlight, deleteHighlight, importHighlightsJson, reorderHighlights } from '../../services/highlights';
import { getKmsSettings, updateKmsSettings } from '../../services/settings';
import { HIGHLIGHT_STYLES } from '../../lib/gridStyles';

const STYLE_ICONS = {
  slider: LayoutGrid, list: List, grid: LayoutGrid, masonry: Rows3, horizontal: ArrowRight,
};

const EMPTY_FORM = { title: '', description: '', image: '', image_file: null };

export default function ManageHighlights() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [imageMode, setImageMode] = useState('url');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [savingStyle, setSavingStyle] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [activeView, setActiveView] = useState('show');
  const [hiddenSearch, setHiddenSearch] = useState('');
  const [hiddenSort, setHiddenSort] = useState('recent');

  useEffect(() => {
    fetchItems();
    getKmsSettings().then((s) => setViewMode(s.highlights_style || 'list')).catch(() => {});
  }, []);

  const changeStyle = async (styleId) => {
    setViewMode(styleId);
    setSavingStyle(true);
    try { await updateKmsSettings({ highlights_style: styleId }); }
    catch (err) { console.error(err); }
    finally { setSavingStyle(false); }
  };

  const fetchItems = async () => {
    try { setItems(await getHighlights()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); setPreview(''); setImageMode('url'); };

  const startEdit = (item) => {
    setForm({ title: item.title, description: item.description || '', image: item.image || '', image_file: null });
    setEditingId(item.id); setShowForm(true); setPreview(item.image || '');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    setForm((f) => ({ ...f, image_file: file, image: '' }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title); fd.append('description', form.description);
      if (form.image_file) fd.append('image_file', form.image_file);
      else if (form.image) fd.append('image', form.image);
      if (editingId) await updateHighlight(editingId, fd);
      else await createHighlight(fd);
      resetForm(); fetchItems();
    } catch (err) { console.error(err); alert('Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this highlight?')) return;
    try { await deleteHighlight(id); setItems((p) => p.filter((i) => i.id !== id)); } catch (err) { console.error(err); }
  };

  const toggleActive = async (item) => {
    const currentlyActive = item.active !== false;
    const nextActive = !currentlyActive;
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: nextActive } : i)));
    try {
      const fd = new FormData();
      fd.append('active', nextActive);
      await updateHighlight(item.id, fd);
    } catch (err) {
      console.error(err);
      setItems((p) => p.map((i) => (i.id === item.id ? { ...i, active: currentlyActive } : i)));
      alert('Failed to update — reverted');
    }
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setItems(newItems); setDragIndex(null);
    try { await reorderHighlights(newItems.map((item, i) => ({ id: item.id, order: i }))); }
    catch (err) { console.error(err); fetchItems(); }
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
      const result = await importHighlightsJson(parsed);
      setImportResult(result); setShowImport(false); setImportText(''); fetchItems();
    } catch (err: any) {
      alert(`Import error: ${err?.response?.data?.error || err.message}`);
    } finally { setImporting(false); }
  };

  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    const payload = newItems.map((item, i) => ({ id: item.id, order: i }));
    try { await reorderHighlights(payload); } catch (err) { console.error(err); fetchItems(); }
  };



  const hiddenHighlights = items.filter((i) => i.active === false);
  const filteredHiddenHighlights = (() => {
    let list = hiddenHighlights;
    if (hiddenSearch.trim()) {
      const q = hiddenSearch.trim().toLowerCase();
      list = list.filter((i) => i.title?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (hiddenSort) {
      case 'title_asc': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'title_desc': sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
      default: sorted.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
    return sorted;
  })();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Highlights</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create, edit, or remove hero slider highlights.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowImport((s) => !s); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <FileJson size={15} /> Import JSON
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); setShowImport(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors">
            <Plus size={15} /> Add Highlight
          </button>
        </div>
      </div>

      {/* Import Result Toast */}
      {importResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Imported <strong>{importResult.created}</strong> highlight{importResult.created !== 1 ? 's' : ''} successfully.
            {importResult.errors?.length > 0 && ` (${importResult.errors.length} failed)`}
          </p>
          <button onClick={() => setImportResult(null)} className="text-green-600 dark:text-green-400 hover:text-green-800"><X size={16} /></button>
        </div>
      )}

      {/* Import JSON Panel */}
      {showImport && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
            <FileJson size={16} className="text-emerald-600" /> Import Highlights from JSON
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Upload a <code>.json</code> file or paste JSON below. Accepts an array or <code>{'{'}data: [...]{'}'}</code> format. Fields: <code>title, description, image</code>.
          </p>
          <div className="mb-3">
            <input type="file" accept=".json,application/json" onChange={handleJsonFileUpload}
              className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700" />
          </div>
          <textarea
            placeholder='[{"title": "...", "description": "...", "image": "https://..."}]'
            value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={handleImportJson} disabled={importing || !importText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
              <Upload size={13} /> {importing ? 'Importing...' : 'Import'}
            </button>
            <button onClick={() => { setShowImport(false); setImportText(''); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingId ? 'Edit Highlight' : 'New Highlight'}</h3>
          <div className="space-y-3">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
            <div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${imageMode === 'url' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <Link2 size={12} /> Image URL
                </button>
                <button onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${imageMode === 'upload' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  <Upload size={12} /> Upload File
                </button>
              </div>
              {imageMode === 'url' ? (
                <input type="url" placeholder="https://example.com/image.jpg" value={form.image}
                  onChange={(e) => { setForm((f) => ({ ...f, image: e.target.value, image_file: null })); setPreview(e.target.value); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              ) : (
                <input type="file" accept="image/*" onChange={handleFileChange}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0038A8] file:text-white hover:file:bg-[#001a52]" />
              )}
              <p className="text-xs text-gray-400 mt-1">Max 10MB. Images are auto-converted to WebP.</p>
              {preview && <img src={preview} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors disabled:opacity-50">
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={resetForm}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

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
            Hidden ({hiddenHighlights.length})
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : activeView === 'hidden' ? (
        <div>
          {hiddenHighlights.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input type="text" placeholder="Search hidden highlights..." value={hiddenSearch} onChange={(e) => setHiddenSearch(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]" />
              <select value={hiddenSort} onChange={(e) => setHiddenSort(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="recent">Recently hidden</option>
                <option value="title_asc">Title — A to Z</option>
                <option value="title_desc">Title — Z to A</option>
              </select>
            </div>
          )}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {hiddenHighlights.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">Nothing hidden — highlights you hide from the slider will show up here.</p>
            ) : filteredHiddenHighlights.length === 0 ? (
              <p className="text-xs text-gray-400 p-4">No hidden highlights match "{hiddenSearch}".</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredHiddenHighlights.map((item) => (
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
                        {item.description && <p className="text-[10px] text-gray-400 truncate">{item.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => toggleActive(item)}
                        className="p-1.5 text-gray-400 hover:text-green-500 transition-colors" title="Click to show on slider">
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
        <div className="text-center py-14 text-gray-400 dark:text-gray-600">
          <Image size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No highlights yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => item.active === false ? null : (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm">
              <div className="w-20 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Image size={20} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveItem(index, -1)} disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"><ArrowUp size={14} /></button>
                <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"><ArrowDown size={14} /></button>
                <button onClick={() => toggleActive(item)} className="p-2 text-gray-400 hover:text-amber-500 transition-colors" title="Click to hide">
                  <Eye size={15} />
                </button>
                <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
