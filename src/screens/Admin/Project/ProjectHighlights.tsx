// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Save, Image, Eye, EyeOff, Plus, Trash2, Edit2, ChevronLeft, ChevronRight, ChevronDown, Palette } from 'lucide-react';
import {
  getProjectOfficeId, getProjectHighlights, createProjectHighlight, updateProjectHighlight, deleteProjectHighlight,
  reorderProjectHighlights, getProjectSliderDesign, updateProjectSliderDesign,
} from '../../../services/projects';
import { designFromBackend, designToBackend, highlightFromBackend } from '../FreeWifi/FreeWifiHighlights';

// Same layout templates as Free Wi-Fi's Highlights slider — kept in sync manually
// since DesignTab below needs its own project-scoped save handler.
const TEMPLATES = [
  {
    id: 'classic-center', label: 'Classic Center',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center p-2">
        <div className="text-center">
          <div className="w-12 h-2 bg-white/80 rounded mx-auto mb-1" />
          <div className="w-16 h-1 bg-white/50 rounded mx-auto" />
        </div>
      </div>
    ),
  },
  {
    id: 'left-hero', label: 'Left Hero',
    preview: (
      <div className="w-full h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center p-3">
        <div className="w-1/2">
          <div className="w-10 h-2 bg-white/80 rounded mb-1" />
          <div className="w-14 h-1 bg-white/50 rounded mb-1" />
          <div className="w-8 h-1 bg-white/30 rounded" />
        </div>
        <div className="w-1/2 flex justify-end">
          <div className="w-12 h-12 rounded-lg bg-white/20" />
        </div>
      </div>
    ),
  },
  {
    id: 'right-hero', label: 'Right Hero',
    preview: (
      <div className="w-full h-full bg-gradient-to-l from-blue-600 to-blue-800 rounded-lg flex items-center p-3">
        <div className="w-1/2">
          <div className="w-12 h-12 rounded-lg bg-white/20" />
        </div>
        <div className="w-1/2 text-right">
          <div className="w-10 h-2 bg-white/80 rounded ml-auto mb-1" />
          <div className="w-14 h-1 bg-white/50 rounded ml-auto" />
        </div>
      </div>
    ),
  },
  {
    id: 'bottom-banner', label: 'Bottom Banner',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg relative">
        <div className="absolute inset-0 bg-white/5" />
        <div className="absolute bottom-0 inset-x-0 bg-black/40 p-2">
          <div className="w-10 h-1.5 bg-white/80 rounded mb-1" />
          <div className="w-14 h-1 bg-white/50 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'top-banner', label: 'Top Banner',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg relative">
        <div className="absolute inset-0 bg-white/5" />
        <div className="absolute top-0 inset-x-0 bg-black/40 p-2">
          <div className="w-10 h-1.5 bg-white/80 rounded mb-1" />
          <div className="w-14 h-1 bg-white/50 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'split-screen', label: 'Split Screen',
    preview: (
      <div className="w-full h-full flex rounded-lg overflow-hidden">
        <div className="w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-white/20" />
        </div>
        <div className="w-1/2 bg-gray-100 flex items-center p-2">
          <div>
            <div className="w-10 h-2 bg-gray-400 rounded mb-1" />
            <div className="w-14 h-1 bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'card-overlay', label: 'Card Overlay',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-end p-2">
        <div className="bg-white rounded-lg p-2 w-full shadow-lg">
          <div className="w-10 h-1.5 bg-gray-400 rounded mb-1" />
          <div className="w-14 h-1 bg-gray-300 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: 'minimal', label: 'Minimal',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
        <div className="w-14 h-1.5 bg-white/80 rounded" />
      </div>
    ),
  },
  {
    id: 'spotlight', label: 'Spotlight',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute w-16 h-16 rounded-full bg-white/25 blur-xl" />
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <span className="h-px w-2.5 bg-yellow-400" />
            <span className="w-6 h-1 bg-yellow-400 rounded-sm" />
            <span className="h-px w-2.5 bg-yellow-400" />
          </div>
          <div className="w-16 h-2 bg-white/90 rounded mx-auto" />
        </div>
      </div>
    ),
  },
];

const EMPTY_HIGHLIGHT = {
  title: '', description: '', image: '', active: true, showTitle: true, showDescription: true,
};

const DEFAULT_DESIGN = {
  bgColor: '#0038A8', bgGradient: '#001a52', textColor: '#ffffff', overlayOpacity: 30,
  height: 'h-64', autoPlay: true, interval: 5000, template: 'classic-center',
};

const HEIGHT_OPTIONS = [
  { value: 'h-48', label: 'Small (192px)' },
  { value: 'h-56', label: 'Medium (224px)' },
  { value: 'h-64', label: 'Large (256px)' },
  { value: 'h-80', label: 'Extra Large (320px)' },
  { value: 'custom', label: 'Custom (px)' },
];

export function SliderPreview({ highlights, design }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const activeHighlights = highlights.filter((h) => h.active);
  const heightClass = design.height === 'custom' ? '' : design.height;
  const heightStyle = design.height === 'custom' && design.customHeight ? { height: `${design.customHeight}px` } : {};

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % activeHighlights.length);
  }, [activeHighlights.length]);

  useEffect(() => {
    if (activeHighlights.length < 2 || paused || !design.autoPlay) return;
    const timer = setInterval(next, design.interval);
    return () => clearInterval(timer);
  }, [activeHighlights.length, paused, design.autoPlay, design.interval, next]);

  if (activeHighlights.length === 0) {
    return (
      <div className={`${heightClass} rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600`} style={heightStyle}>
        <div className="text-center text-gray-400">
          <Image size={48} className="mx-auto mb-2" />
          <p className="text-sm">No active highlights</p>
          <p className="text-xs">Add highlights and toggle them active</p>
        </div>
      </div>
    );
  }

  const highlight = activeHighlights[current];
  const template = design.template || 'classic-center';

  const renderTemplateContent = () => {
    const title = highlight.showTitle !== false && highlight.title;
    const desc = highlight.showDescription !== false && highlight.description;

    switch (template) {
      case 'left-hero':
        return (
          <div className="relative z-10 h-full flex items-center px-12">
            <div className="max-w-lg text-left">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'right-hero':
        return (
          <div className="relative z-10 h-full flex items-center justify-end px-12">
            <div className="max-w-lg text-right">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'bottom-banner':
        return (
          <div className="relative z-10 h-full flex flex-col justify-end">
            <div className="bg-black/50 backdrop-blur-sm px-8 py-6">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm text-center max-w-2xl mx-auto" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'top-banner':
        return (
          <div className="relative z-10 h-full flex flex-col justify-start">
            <div className="bg-black/50 backdrop-blur-sm px-8 py-6">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm text-center max-w-2xl mx-auto" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'split-screen':
        return (
          <div className="relative z-10 h-full flex">
            <div className="w-1/2" />
            <div className="w-1/2 flex items-center px-10 bg-black/30 backdrop-blur-sm">
              <div className="text-left">
                {title && <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
                {desc && <p className="text-sm" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
              </div>
            </div>
          </div>
        );
      case 'card-overlay':
        return (
          <div className="relative z-10 h-full flex items-end justify-center px-8 pb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-6 max-w-xl border border-white/20">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'minimal':
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="text-center max-w-md">
              {title && <h2 className="text-3xl sm:text-4xl font-black" style={{ color: design.textColor }}>{highlight.title}</h2>}
            </div>
          </div>
        );
      case 'spotlight':
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8 overflow-hidden">
            <div className="absolute w-[70%] h-[70%] rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${design.textColor}, transparent 65%)` }} />
            <div className="relative text-center max-w-2xl">
              {(title || desc) && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="h-px w-8 bg-[#FCD116]" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FCD116]">Featured</span>
                  <span className="h-px w-8 bg-[#FCD116]" />
                </div>
              )}
              {title && <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      default:
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="text-center max-w-2xl">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`${heightClass} rounded-2xl overflow-hidden relative`} style={heightStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {highlight.image ? (
        <img src={highlight.image} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: (100 - design.overlayOpacity) / 100 }} />
      ) : null}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${design.bgColor}, ${design.bgGradient})`,
        opacity: highlight.image ? 0.7 : 1,
      }} />

      {renderTemplateContent()}

      {activeHighlights.length > 1 && (
        <>
          <button onClick={() => setCurrent((c) => (c - 1 + activeHighlights.length) % activeHighlights.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
            {activeHighlights.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-[#FCD116]' : 'w-1.5 bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Isolated from the parent so editing colors/etc only re-renders this tab.
function DesignTab({ slug, highlights, onSaved }) {
  const [savedDesign, setSavedDesign] = useState(DEFAULT_DESIGN);
  const [editDesign, setEditDesign] = useState(DEFAULT_DESIGN);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjectSliderDesign(slug).then((settings) => {
      const loaded = designFromBackend(settings);
      setSavedDesign(loaded);
      setEditDesign(loaded);
    }).catch(console.error).finally(() => setLoading(false));
  }, [slug]);

  const updateDesign = (updates) => {
    setEditDesign((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProjectSliderDesign(slug, designToBackend(editDesign));
      setSavedDesign(editDesign);
      setHasChanges(false);
      onSaved?.(editDesign);
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditDesign(savedDesign);
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditDesign(DEFAULT_DESIGN);
    setHasChanges(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Palette size={16} /> Slider Design Settings
          </h3>
          <div className="flex gap-2">
            {hasChanges && (
              <button onClick={handleReset}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Reset to Default
              </button>
            )}
            <button onClick={handleCancel} disabled={!hasChanges}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!hasChanges || saving}
              className="px-4 py-1.5 text-sm bg-[#0038A8] text-white rounded-lg disabled:opacity-50 hover:bg-[#001a52]">
              <Save size={14} className="inline mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Background Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={editDesign.bgColor}
                onChange={(e) => updateDesign({ bgColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer" />
              <input type="text" value={editDesign.bgColor}
                onChange={(e) => updateDesign({ bgColor: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Gradient Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={editDesign.bgGradient}
                onChange={(e) => updateDesign({ bgGradient: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer" />
              <input type="text" value={editDesign.bgGradient}
                onChange={(e) => updateDesign({ bgGradient: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Text Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={editDesign.textColor}
                onChange={(e) => updateDesign({ textColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer" />
              <input type="text" value={editDesign.textColor}
                onChange={(e) => updateDesign({ textColor: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Slider Height</label>
            <div className="flex gap-2">
              <select value={editDesign.height}
                onChange={(e) => updateDesign({ height: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800">
                {HEIGHT_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
              <input type="number" placeholder="px" min="100" max="600"
                value={editDesign.customHeight || ''}
                onChange={(e) => updateDesign({ customHeight: parseInt(e.target.value) || '', height: 'custom' })}
                className="w-20 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Or enter custom height in pixels</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Image Overlay Opacity</label>
            <input type="range" min="0" max="100" value={editDesign.overlayOpacity}
              onChange={(e) => updateDesign({ overlayOpacity: parseInt(e.target.value) })}
              className="w-full" />
            <span className="text-xs text-gray-500">{editDesign.overlayOpacity}%</span>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Auto-play Interval (ms)</label>
            <input type="number" min="2000" max="10000" step="1000" value={editDesign.interval}
              onChange={(e) => updateDesign({ interval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editDesign.autoPlay}
              onChange={(e) => updateDesign({ autoPlay: e.target.checked })}
              className="rounded border-gray-300" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-play slider</span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Layout Template</h4>
          {editDesign.template !== DEFAULT_DESIGN.template && (
            <button type="button" onClick={() => updateDesign({ template: DEFAULT_DESIGN.template })}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 underline">
              Reset template
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose how text and images are arranged in the slider.</p>
        <div className="grid grid-cols-4 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button key={tmpl.id} type="button"
              onClick={() => updateDesign({ template: tmpl.id })}
              className={`p-2 rounded-xl border-2 transition-all ${
                editDesign.template === tmpl.id
                  ? 'border-[#0038A8] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}>
              <div className="h-20 mb-2 rounded-lg overflow-hidden">{tmpl.preview}</div>
              <p className="text-[10px] font-bold text-gray-900 dark:text-white text-center">{tmpl.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Preview</h4>
        <SliderPreview highlights={highlights} design={editDesign} />
      </div>
    </div>
  );
}

export default function ProjectHighlights({ slug }) {
  const [officeId, setOfficeId] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [design, setDesign] = useState(DEFAULT_DESIGN);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_HIGHLIGHT);
  const [imageFile, setImageFile] = useState(null);
  const [imageMode, setImageMode] = useState('url');
  const [activeTab, setActiveTab] = useState('highlights');
  const [saving, setSaving] = useState(false);
  // Collapsible "Hidden" section below the main list (same pattern as the Charts and
  // Awards admin screens) — a quick-glance place to find and restore highlights hidden
  // from the project page, instead of hunting for the dimmed ones in the main list.
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    setLoadError(null);
    Promise.all([getProjectOfficeId(slug), getProjectHighlights(slug), getProjectSliderDesign(slug)])
      .then(([id, h, d]) => {
        setOfficeId(id);
        setHighlights(h.map(highlightFromBackend));
        setDesign(designFromBackend(d));
      })
      .catch((err) => setLoadError(err?.message || 'Failed to load this project.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setForm((f) => ({ ...f, image: URL.createObjectURL(file) }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('office', officeId);
    fd.append('title', form.title);
    fd.append('description', form.description || '');
    fd.append('active', form.active !== false);
    fd.append('show_title', form.showTitle !== false);
    fd.append('show_description', form.showDescription !== false);
    if (imageFile) {
      fd.append('image_file', imageFile);
    } else if (form.image && !form.image.startsWith('blob:')) {
      fd.append('image', form.image);
    }
    return fd;
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required');
    if (!officeId) return alert('No office is set up for this project yet — see the error banner above.');
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editingId) {
        const saved = await updateProjectHighlight(editingId, fd);
        setHighlights((prev) => prev.map((h) => (h.id === editingId ? highlightFromBackend(saved) : h)));
      } else {
        fd.append('order', highlights.length);
        const saved = await createProjectHighlight(fd);
        setHighlights((prev) => [...prev, highlightFromBackend(saved)]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_HIGHLIGHT);
      setImageFile(null);
    } catch (err) {
      alert(`Save failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (highlight) => {
    setEditingId(highlight.id);
    setForm({
      title: highlight.title, description: highlight.description || '', image: highlight.image || '',
      active: highlight.active, showTitle: highlight.showTitle, showDescription: highlight.showDescription,
    });
    setImageFile(null);
    setImageMode('url');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this highlight?')) return;
    try {
      await deleteProjectHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const toggleActive = async (id) => {
    const highlight = highlights.find((h) => h.id === id);
    if (!highlight) return;
    const nextActive = !highlight.active;
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, active: nextActive } : h)));
    try {
      const fd = new FormData();
      fd.append('active', nextActive);
      await updateProjectHighlight(id, fd);
    } catch (err) {
      setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, active: !nextActive } : h)));
      alert('Failed to update — reverted');
    }
  };

  const moveHighlight = async (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= highlights.length) return;
    const arr = [...highlights];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setHighlights(arr);
    try {
      await reorderProjectHighlights(arr.map((h, i) => ({ id: h.id, order: i })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0038A8] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (loadError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 text-sm text-red-700 dark:text-red-300">
        <p className="font-semibold mb-1">Couldn't load this project's highlights</p>
        <p>{loadError}</p>
        <p className="mt-2 text-red-600 dark:text-red-400">
          Go to Admin &rarr; Offices and make sure an office exists whose name matches this project exactly, with its Office Type set to "Project".
        </p>
      </div>
    );
  }

  const hiddenHighlights = highlights.filter((h) => !h.active);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Slider Preview</h2>
        <SliderPreview highlights={highlights} design={design} />
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {[
          { id: 'highlights', label: 'Highlights' },
          { id: 'design', label: 'Slider Design' },
        ].map((tab) => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'highlights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage highlights displayed on the project page.</p>
            <button onClick={() => { setForm(EMPTY_HIGHLIGHT); setEditingId(null); setImageFile(null); setImageMode('url'); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52]">
              <Plus size={16} /> Add Highlight
            </button>
          </div>

          {showForm && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{editingId ? 'Edit Highlight' : 'New Highlight'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
                  <input placeholder="Highlight title" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Description</label>
                  <textarea placeholder="Highlight description" value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3} className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Image</label>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setImageMode('url')}
                      className={`px-3 py-1.5 text-xs rounded-lg ${imageMode === 'url' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>URL</button>
                    <button onClick={() => setImageMode('upload')}
                      className={`px-3 py-1.5 text-xs rounded-lg ${imageMode === 'upload' ? 'bg-[#0038A8] text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Upload</button>
                  </div>
                  {imageMode === 'url' ? (
                    <input type="url" placeholder="https://example.com/image.jpg" value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
                  ) : (
                    <input type="file" accept="image/*" onChange={handleFileChange}
                      className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0038A8] file:text-white" />
                  )}
                  {form.image && <img src={form.image} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.showTitle !== false}
                      onChange={(e) => setForm((f) => ({ ...f, showTitle: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show title</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.showDescription !== false}
                      onChange={(e) => setForm((f) => ({ ...f, showDescription: e.target.checked }))}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show description</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    <Save size={14} className="inline mr-1" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setImageFile(null); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {highlights.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Image size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No highlights yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={highlight.id}
                  className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all ${
                    highlight.active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'
                  }`}>
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                    {highlight.image ? (
                      <img src={highlight.image} alt={highlight.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Image size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{highlight.title}</p>
                    {highlight.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{highlight.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(highlight.id)}
                      className={`p-1.5 rounded ${highlight.active ? 'text-green-500' : 'text-gray-400'}`}>
                      {highlight.active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => moveHighlight(index, -1)} disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <button onClick={() => moveHighlight(index, 1)} disabled={index === highlights.length - 1}
                      className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
                    <button onClick={() => handleEdit(highlight)} className="p-1.5 text-gray-400 hover:text-[#0038A8]"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(highlight.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden highlights — a quick-glance list of everything currently hidden from
              the project page, so reviewing/restoring them doesn't mean hunting for the
              dimmed ones in the main list above. */}
          {hiddenHighlights.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowHidden((v) => !v)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <EyeOff size={16} className="text-gray-400" /> Hidden ({hiddenHighlights.length})
                </span>
                {showHidden ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>
              {showHidden && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {hiddenHighlights.map((highlight) => (
                    <div key={highlight.id} className="flex items-center gap-4 p-3 px-4">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                        {highlight.image ? (
                          <img src={highlight.image} alt={highlight.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400"><Image size={14} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{highlight.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleActive(highlight.id)}
                          className="p-1.5 text-gray-400 hover:text-green-500 transition-colors" title="Click to show">
                          <EyeOff size={14} />
                        </button>
                        <button type="button" onClick={() => handleEdit(highlight)}
                          className="p-1.5 text-gray-400 hover:text-[#0038A8] transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(highlight.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'design' && (
        <DesignTab slug={slug} highlights={highlights} onSaved={setDesign} />
      )}
    </div>
  );
}
