// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, Image } from 'lucide-react';
import { getCarouselSlides, saveCarouselSlides, getDriveImageUrl } from '../../components/Carousel';

export default function ManageCarousel() {
  const [slides, setSlides] = useState([]);
  const [form, setForm] = useState({ title: '', url: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSlides(getCarouselSlides());
  }, []);

  const persist = (updated) => {
    setSlides(updated);
    saveCarouselSlides(updated);
    window.dispatchEvent(new Event('kms-carousel-update'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const addSlide = () => {
    if (!form.url.trim()) return;
    persist([
      ...slides,
      { id: Date.now(), title: form.title.trim(), url: form.url.trim() },
    ]);
    setForm({ title: '', url: '' });
  };

  const removeSlide = (id) => persist(slides.filter((s) => s.id !== id));

  const moveUp = (i) => {
    if (i === 0) return;
    const arr = [...slides];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    persist(arr);
  };

  const moveDown = (i) => {
    if (i === slides.length - 1) return;
    const arr = [...slides];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    persist(arr);
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Carousel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add Google Drive image links displayed in the home page carousel
          </p>
        </div>
        {saved && (
          <span className="text-green-600 dark:text-green-400 text-sm font-semibold">
            Saved ✓
          </span>
        )}
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Plus size={16} className="text-[#0038A8]" /> Add New Slide
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Caption (optional)
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Free Wi-Fi Launch in CDO"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Google Drive Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://drive.google.com/file/d/FILE_ID/view"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Paste a Google Drive sharing link or any direct image URL. Ensure the Drive
              file is shared as <em>"Anyone with the link can view"</em>.
            </p>
          </div>
          <button
            onClick={addSlide}
            disabled={!form.url.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
            <Plus size={14} /> Add Slide
          </button>
        </div>
      </div>

      {/* Slides list */}
      {slides.length === 0 ? (
        <div className="text-center py-14 text-gray-400 dark:text-gray-600">
          <Image size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No slides yet. Add your first carousel slide above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
          </p>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 shadow-sm"
            >
              {/* Up / Down */}
              <div className="flex flex-col gap-1 shrink-0 text-center">
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xs leading-none px-1"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === slides.length - 1}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 text-xs leading-none px-1"
                >
                  ▼
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-16 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                <img
                  src={getDriveImageUrl(slide.url)}
                  alt={slide.title || 'Slide'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {slide.title || (
                    <span className="text-gray-400 italic font-normal">No caption</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{slide.url}</p>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeSlide(slide.id)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

