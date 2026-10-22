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
import api from '../../services/api';
import { KMS_PROJECTS } from '../../constants/kmsProjects';
import { resolveLinkedAccomplishments, stripAccomplishments } from '../../lib/linkedAccomplishments';
import Select from 'react-select';
import { FormSection, Field, INPUT, INPUT_BASE } from '../../components/FormParts';
import { selectStyles } from '../../components/FreeWifiMap';
import { computeBreakdownRows, ConditionsEditor, toOptions, distinctFieldValues } from './FreeWifi/FreeWifiCharts';

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

const yearKey = (y) => parseInt(String(y ?? '').match(/\d{4}/)?.[0] ?? '0', 10);
const BREAKDOWN_AGG_OPTIONS = [
  { value: 'count', label: 'Count rows' },
  { value: 'sum', label: 'Sum values' },
  { value: 'average', label: 'Average values' },
  { value: 'distinct', label: 'Count unique values' },
];

// Opt-in: build the breakdown from a dataset — one row per value of "Group by" (e.g.
// Province) — instead of typing rows by hand. Computed live when the page loads.
function BreakdownBindingEditor({ binding, onChange }) {
  const set = (patch) => onChange({ ...binding, ...patch });
  const [tables, setTables] = useState([]);
  useEffect(() => {
    if (!binding.enabled || !binding.office) { setTables([]); return; }
    api.get('kms/project-datasets/', { params: { office: binding.office } })
      .then(({ data }) => setTables(data.results ?? data)).catch(() => setTables([]));
  }, [binding.enabled, binding.office]);
  const pick = (options, v) => options.find((o) => o.value === v) || null;
  const table = tables.find((t) => t.id === Number(binding.dataset));
  const fieldOptions = (table?.fields || []).map((f) => ({ value: f.name, label: f.label }));
  const records = (table?.rows || []).map((r) => ({ id: r.id, ...(r.values || {}) }));
  const projectOptions = KMS_PROJECTS.map((p) => ({ value: p.officeId, label: p.label }));
  const tableOptions = tables.map((t) => ({ value: t.id, label: t.name }));
  const preview = binding.enabled && table ? computeBreakdownRows(table, binding) : null;
  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!binding.enabled}
          onChange={(e) => set({ enabled: e.target.checked, agg: binding.agg || 'count', conditions: binding.conditions || [] })}
          className="rounded border-gray-300" />
        <span className="text-sm text-gray-700 dark:text-gray-300">Fill the breakdown from a dataset (e.g. per province)</span>
      </label>
      {binding.enabled && (
        <>
          <Select value={pick(projectOptions, binding.office)} options={projectOptions} placeholder="Project..." styles={selectStyles}
            onChange={(o) => set({ office: o ? o.value : null, dataset: '', group_field: '', field: '', conditions: [] })} />
          {binding.office && (
            <Select value={pick(tableOptions, binding.dataset)} options={tableOptions} placeholder="Dataset..." styles={selectStyles}
              onChange={(o) => set({ dataset: o ? o.value : '', group_field: '', field: '', conditions: [] })} />
          )}
          {table && (
            <>
              <Select value={pick(fieldOptions, binding.group_field)} options={fieldOptions} placeholder="Group by (e.g. Province)..." styles={selectStyles}
                onChange={(o) => set({ group_field: o ? o.value : '' })} />
              <Select value={pick(BREAKDOWN_AGG_OPTIONS, binding.agg || 'count')} options={BREAKDOWN_AGG_OPTIONS} isSearchable={false} styles={selectStyles}
                onChange={(o) => set({ agg: o.value })} />
              {(binding.agg || 'count') !== 'count' && (
                <Select value={pick(fieldOptions, binding.field)} options={fieldOptions} placeholder="Value field..." styles={selectStyles}
                  onChange={(o) => set({ field: o ? o.value : '' })} />
              )}
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Filter rows (optional)</p>
              <ConditionsEditor conditions={binding.conditions} onChange={(next) => set({ conditions: next })}
                fieldOptions={fieldOptions} valuesFor={(field) => toOptions(distinctFieldValues(records, field))} extraTables={[]} />
              {preview && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p className="font-medium">Preview ({preview.length} rows)</p>
                  {preview.slice(0, 6).map((r) => <p key={r.label}>{r.label}: <b>{r.value}</b></p>)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  year: String(new Date().getFullYear()),
  metric: '',
  metric_label: '',
  title: '',
  description: '',
  image: '',
  image_file: null,
  breakdown: [],
  project_highlight: null,
  breakdown_binding: {},
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
  // Highlights from every project, loaded the first time the form opens, so a new
  // accomplishment can start from one (title/description/image carried over).
  const [projectHighlights, setProjectHighlights] = useState(null);
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
    try {
      const data = await getAccomplishments();
      setItems(await resolveLinkedAccomplishments(data).catch(() => stripAccomplishments(data)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!showForm || projectHighlights) return;
    api.get('kms/project-highlights/').then(({ data }) => setProjectHighlights(data.results ?? data)).catch(() => setProjectHighlights([]));
  }, [showForm, projectHighlights]);

  const [hlProject, setHlProject] = useState(null);
  const linkedHighlight = form.project_highlight ? (projectHighlights || []).find((h) => h.id === form.project_highlight) : null;
  const metricDynamic = !!linkedHighlight?.title_binding?.enabled;
  // Editing a linked accomplishment: show its highlight (and project) as the selection.
  useEffect(() => {
    const linked = form.project_highlight && (projectHighlights || []).find((h) => h.id === form.project_highlight);
    if (linked) setHlProject(linked.office);
    else if (!form.project_highlight && !showForm) setHlProject(null);
  }, [form.project_highlight, projectHighlights, showForm]);
  const projectOptions = KMS_PROJECTS
    .filter((p) => (projectHighlights || []).some((h) => h.office === p.officeId))
    .map((p) => ({ value: p.officeId, label: p.label }));
  const highlightsOfProject = (projectHighlights || []).filter((h) => h.office === hlProject)
    .map((h) => ({ value: h.id, label: (h.title || '').replace('{value}', '').trim() || `Highlight #${h.id}` }));
  const highlightOptions = KMS_PROJECTS
    .map((p) => ({
      label: p.label,
      options: (projectHighlights || []).filter((h) => h.office === p.officeId)
        .map((h) => ({ value: h.id, label: (h.title || '').replace('{value}', '').trim() || `Highlight #${h.id}` })),
    }))
    .filter((g) => g.options.length);

  const useProjectHighlight = (id) => {
    const h = (projectHighlights || []).find((x) => String(x.id) === String(id));
    if (!h) return;
    setForm((f) => ({
      ...f,
      project_highlight: h.id,
      // Highlight → accomplishment: title → Metric, description → Metric Label,
      // project name → Description, image → Image. The Title field is left alone.
      metric: (h.title || '').replace('{value}', '').trim(),
      metric_label: h.description || '',
      description: KMS_PROJECTS.find((p) => p.officeId === h.office)?.label || '',
      image: h.image || f.image, image_file: null,
    }));
    if (h.image) { setPreview(h.image); setImageMode('url'); }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); setPreview(''); setImageMode('url');
  };

  const startEdit = (item) => {
    setForm({
      year: item.year, metric: item.metric, metric_label: item.metric_label,
      title: item.title, description: item.description || '', image: item.image || '',
      image_file: null, breakdown: item.breakdown || [],
      project_highlight: item.linked_highlight ? item.project_highlight : null,
      breakdown_binding: item.breakdown_binding || {},
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
      fd.append('project_highlight', form.project_highlight || '');
      fd.append('breakdown_binding', JSON.stringify(form.breakdown_binding?.enabled ? form.breakdown_binding : {}));
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
      case 'year_desc': sorted.sort((a, b) => yearKey(b.year) - yearKey(a.year)); break;
      case 'year_asc': sorted.sort((a, b) => yearKey(a.year) - yearKey(b.year)); break;
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{editingId ? 'Edit' : 'New'} Accomplishment</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shown as a tile on the home page and in the hero slider.</p>
            </div>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-6">
            {/* 1 · Source */}
            <FormSection step="1" title="Start from a project highlight" hint="Optional — fills the fields below and keeps the metric live.">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Project">
                  <Select value={projectOptions.find((o) => o.value === hlProject) || null} options={projectOptions} styles={selectStyles}
                    placeholder="Select a project…" isClearable
                    onChange={(o) => { setHlProject(o ? o.value : null); }} />
                </Field>
                <Field label="Highlight">
                  <Select value={highlightsOfProject.find((o) => o.value === form.project_highlight) || null} options={highlightsOfProject} styles={selectStyles} isDisabled={!hlProject}
                    placeholder={!hlProject ? 'Select a project first' : projectHighlights ? (highlightsOfProject.length ? 'Select a highlight…' : 'No highlights in this project') : 'Loading…'}
                    noOptionsMessage={() => 'No highlights found'}
                    onChange={(o) => o && useProjectHighlight(o.value)} />
                </Field>
              </div>
              {form.project_highlight && (
                <div className="mt-2 flex items-start justify-between gap-3 px-3 py-2 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span>Linked — Metric follows the highlight title (dataset numbers computed live), Metric Label its description, Description the project name, and Image its image. Title stays as you typed it.</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, project_highlight: null }))} className="shrink-0 font-semibold underline">Unlink</button>
                </div>
              )}
            </FormSection>

            {/* 2 · Content */}
            <FormSection step="2" title="Details">
              <div className="grid sm:grid-cols-[1fr_140px] gap-4">
                <Field label="Title">
                  <input placeholder="e.g. Free Wi-Fi for All" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Year">
                  <input placeholder="e.g. 2026 or 2024-2026" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Metric" badge={metricDynamic ? 'dynamic' : form.project_highlight ? 'linked' : null} hint={metricDynamic ? 'Computed live from the dataset behind the linked highlight.' : 'The big number or headline on the tile.'} className="sm:col-span-2">
                  <input placeholder="e.g. 2,919" value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Metric label" badge={form.project_highlight ? 'linked' : null} hint="Small text under the metric." className="sm:col-span-2">
                  <input placeholder="e.g. Barangays Connected" value={form.metric_label} onChange={(e) => setForm((f) => ({ ...f, metric_label: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Description" badge={form.project_highlight ? 'linked' : null} className="sm:col-span-2">
                  <textarea placeholder="A short sentence or the project name" value={form.description} rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={INPUT} />
                </Field>
              </div>
            </FormSection>

            {/* 3 · Image */}
            <FormSection step="3" title="Image" hint={form.project_highlight ? 'Linked — follows the highlight image.' : null}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-44 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <Image size={26} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-2">
                    {[['url', 'URL', Link2], ['upload', 'Upload', Upload]].map(([mode, label, Icon]) => (
                      <button key={mode} type="button" onClick={() => setImageMode(mode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${imageMode === mode ? 'bg-white dark:bg-gray-800 text-[#0038A8] shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                  {imageMode === 'url' ? (
                    <input type="url" placeholder="https://…" value={form.image}
                      onChange={(e) => { setForm((f) => ({ ...f, image: e.target.value, image_file: null })); setPreview(e.target.value); }} className={INPUT} />
                  ) : (
                    <input type="file" accept="image/*" onChange={handleFileChange}
                      className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0038A8] file:text-white" />
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">Max 10MB. Auto-converted to WebP.</p>
                </div>
              </div>
            </FormSection>

            {/* 4 · Breakdown */}
            <FormSection step="4" title="Breakdown" hint={form.breakdown_binding?.enabled ? 'Dynamic — computed live from a dataset.' : 'Optional list shown when the tile is opened (e.g. per province).'}>
              <BreakdownBindingEditor binding={form.breakdown_binding || {}} onChange={(b) => setForm((f) => ({ ...f, breakdown_binding: b }))} />
              {!form.breakdown_binding?.enabled && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input placeholder="Label" value={breakdownInput.label} onChange={(e) => setBreakdownInput((b) => ({ ...b, label: e.target.value }))} className={`${INPUT_BASE} min-w-0 flex-1`} />
                    <input placeholder="Value" value={breakdownInput.value} onChange={(e) => setBreakdownInput((b) => ({ ...b, value: e.target.value }))} className={`${INPUT_BASE} w-28 shrink-0`} />
                    <button type="button" onClick={addBreakdown} className="px-3 bg-[#0038A8] text-white rounded-lg" aria-label="Add row"><Plus size={14} /></button>
                  </div>
                  {form.breakdown.length > 0 && (
                    <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg">
                      {form.breakdown.map((b, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium truncate">{b.label}</span>
                          <span className="flex items-center gap-3 shrink-0">{b.value}
                            <button type="button" onClick={() => removeBreakdown(i)} className="text-gray-400 hover:text-red-500" aria-label="Remove row"><X size={14} /></button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FormSection>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-900/40 rounded-b-2xl border-t border-gray-100 dark:border-gray-700">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#002f8f]">
              <Save size={14} /> {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
            </button>
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
