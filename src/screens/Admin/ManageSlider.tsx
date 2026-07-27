// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, ArrowUp, ArrowDown, GripVertical, Eye, ToggleLeft, ToggleRight, Award, Image as ImageIcon, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSliderItems, createSliderItem, deleteSliderItem, reorderSliderItems, toggleSliderItemActive } from '../../services/slider';
import { getAccomplishments } from '../../services/accomplishments';
import { getAwards } from '../../services/awards';
import { getHighlights } from '../../services/highlights';

const CONTENT_TYPE_ICONS = {
  accomplishment: Star,
  award: Award,
  highlight: ImageIcon,
};

const CONTENT_TYPE_COLORS = {
  accomplishment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  award: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  highlight: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function ManageSlider() {
  const [sliderItems, setSliderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addTab, setAddTab] = useState('awards');
  const [availableItems, setAvailableItems] = useState({ accomplishments: [], awards: [], highlights: [] });
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchSliderItems();
  }, []);

  const fetchSliderItems = async () => {
    try {
      setSliderItems(await getSliderItems());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    setLoadingItems(true);
    try {
      const [accomplishments, awards, highlights] = await Promise.all([
        getAccomplishments(),
        getAwards(),
        getHighlights(),
      ]);
      setAvailableItems({ accomplishments, awards, highlights });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleOpenAddPanel = () => {
    setShowAddPanel(true);
    fetchAvailableItems();
  };

  const handleAddItem = async (contentType, objectId) => {
    setSaving(true);
    try {
      const newOrder = sliderItems.length > 0 ? Math.max(...sliderItems.map(i => i.order)) + 1 : 0;
      await createSliderItem({ content_type: contentType, object_id: objectId, order: newOrder, is_active: true });
      await fetchSliderItems();
    } catch (err) {
      console.error(err);
      alert('Failed to add item to slider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this item from the slider?')) return;
    try {
      await deleteSliderItem(id);
      setSliderItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const updated = await toggleSliderItemActive(id);
      setSliderItems((prev) => prev.map((i) => i.id === id ? updated : i));
    } catch (err) {
      console.error(err);
    }
  };

  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sliderItems.length) return;
    const newItems = [...sliderItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setSliderItems(newItems);
    try {
      await reorderSliderItems(newItems.map((item, i) => ({ id: item.id, order: i })));
    } catch (err) {
      console.error(err);
      fetchSliderItems();
    }
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const newItems = [...sliderItems];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setSliderItems(newItems);
    setDragIndex(null);
    try {
      await reorderSliderItems(newItems.map((item, i) => ({ id: item.id, order: i })));
    } catch (err) {
      console.error(err);
      fetchSliderItems();
    }
  };

  const isItemInSlider = (contentType, objectId) => {
    return sliderItems.some((si) => si.content_type === contentType && si.object_id === objectId);
  };

  const getAvailableForType = (type) => {
    const items = availableItems[type === 'accomplishment' ? 'accomplishments' : type === 'award' ? 'awards' : 'highlights'] || [];
    return items.filter((item) => !isItemInSlider(type, item.id));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Manage Hero Slider</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Select items from Awards, Highlights, or Accomplishments to display in the hero slider. Drag to reorder.
          </p>
        </div>
        <button
          onClick={handleOpenAddPanel}
          className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors"
        >
          <Plus size={15} /> Add to Slider
        </button>
      </div>

      {/* Add Panel Modal */}
      <AnimatePresence>
        {showAddPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowAddPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Item to Slider</h2>
                <button onClick={() => setShowAddPanel(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {['awards', 'highlights', 'accomplishments'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAddTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      addTab === tab
                        ? 'text-[#0038A8] dark:text-primary border-b-2 border-[#0038A8] dark:border-primary'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {loadingItems ? (
                  <p className="text-center text-gray-400 py-8">Loading...</p>
                ) : getAvailableForType(addTab === 'accomplishments' ? 'accomplishment' : addTab === 'awards' ? 'award' : 'highlight').length === 0 ? (
                  <p className="text-center text-gray-400 py-8">All items of this type are already in the slider.</p>
                ) : (
                  <div className="space-y-3">
                    {getAvailableForType(addTab === 'accomplishments' ? 'accomplishment' : addTab === 'awards' ? 'award' : 'highlight').map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {addTab === 'awards' ? item.issuer : addTab === 'accomplishments' ? `${item.metric} ${item.metric_label}` : item.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddItem(
                            addTab === 'accomplishments' ? 'accomplishment' : addTab === 'awards' ? 'award' : 'highlight',
                            item.id
                          )}
                          disabled={saving}
                          className="px-3 py-1.5 bg-[#0038A8] text-white text-xs font-medium rounded-lg hover:bg-[#001a52] transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slider Items List */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : sliderItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No items in slider</p>
          <p className="text-sm mt-1">Click "Add to Slider" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
            <Eye size={12} /> Drag to reorder. Toggle active/inactive to show/hide items.
          </p>
          {sliderItems.map((item, index) => {
            const TypeIcon = CONTENT_TYPE_ICONS[item.content_type] || ImageIcon;
            const typeColor = CONTENT_TYPE_COLORS[item.content_type] || 'bg-gray-100 text-gray-700';
            const detail = item.content_detail;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center gap-4 shadow-sm group cursor-grab transition-all ${
                  dragIndex === index ? 'opacity-50 scale-95 border-[#0038A8]' : 'border-gray-100 dark:border-gray-700'
                } ${!item.is_active ? 'opacity-60' : ''}`}
              >
                {/* Drag Handle */}
                <div className="text-gray-300 dark:text-gray-600">
                  <GripVertical size={18} />
                </div>

                {/* Order Number */}
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 shrink-0">
                  {index + 1}
                </div>

                {/* Image */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                  {detail?.image ? (
                    <img src={detail.image} alt={detail.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${typeColor}`}>
                      <TypeIcon size={10} />
                      {item.content_type}
                    </span>
                    {detail?.year && (
                      <span className="text-[10px] text-gray-400">{detail.year}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {detail?.title || 'Unknown Item'}
                  </p>
                  {detail?.issuer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{detail.issuer}</p>
                  )}
                  {detail?.metric && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{detail.metric} {detail.metric_label}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    title={item.is_active ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-lg transition-colors ${
                      item.is_active
                        ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === sliderItems.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
