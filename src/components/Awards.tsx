// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react';
import { getAwards } from '../services/awards';
import { getKmsSettings } from '../services/settings';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AwardThumb({ src, alt }) {
  const [hidden, setHidden] = useState(false);
  if (!src || hidden) {
    return (
      <div className="w-full h-36 rounded-xl bg-[#0038A8]/5 dark:bg-primary/10 flex items-center justify-center mb-4">
        <Award size={32} className="text-[#0038A8]/40 dark:text-primary/40" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
      className="w-full h-36 rounded-xl object-cover mb-4"
    />
  );
}

function AwardLightboxContent({ item }) {
  const [imgBroken, setImgBroken] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  // MOV gallery if this award has one, else fall back to the legacy single image.
  const gallery = item.images?.length ? item.images.map((im) => im.image) : (item.image ? [item.image] : []);
  const currentSrc = gallery[imgIndex];
  const hasImage = currentSrc && !imgBroken;
  const hasMultipleImages = gallery.length > 1;

  const showImage = (i) => { setImgBroken(false); setImgIndex(i); };

  // Auto-advance through the gallery. Restarts on every index change (manual
  // or auto) so each photo gets a full interval on screen.
  useEffect(() => {
    if (!hasMultipleImages) return undefined;
    const id = setInterval(() => {
      setImgBroken(false);
      setImgIndex((i) => (i + 1) % gallery.length);
    }, 4000);
    return () => clearInterval(id);
  }, [hasMultipleImages, gallery.length, imgIndex]);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 bg-white flex items-end"
    >
      <div className="absolute inset-x-0 top-0 h-[50vh] overflow-hidden">
        {hasImage ? (
          <img
            src={currentSrc}
            alt={item.title}
            onError={() => setImgBroken(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] to-[#ffffffef]" />
        )}
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); showImage((imgIndex - 1 + gallery.length) % gallery.length); }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); showImage((imgIndex + 1) % gallery.length); }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-semibold">
              {imgIndex + 1} / {gallery.length}
            </span>
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); showImage(i); }}
                  aria-label={`Photo ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === imgIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="absolute top-20 inset-0 bg-gradient-to-t from-white via-white to-white/0" />

      <div className="relative h-[60vh] bottom-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end px-6 sm:px-8 py-8">
          <h3 className="text-2xl sm:text-4xl font-black text-accent-foreground leading-tight drop-shadow-lg mb-2">
            {item.title}
          </h3>
          <p className="text-sm text-accent-foreground/70 mb-1">
            {item.issuer} &middot; {item.year}
          </p>
          {(item.recognition_level || item.location || item.date_received) && (
            <p className="text-xs text-accent-foreground/60 mb-4">
              {[item.recognition_level, item.location, item.date_received].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-sm text-accent-foreground/90 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AwardLightbox({ items, index, onClose, onNext, onPrev }) {
  const item = items[index];
  const multiple = items.length > 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (multiple && e.key === 'ArrowRight') onNext();
      if (multiple && e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev, multiple]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {multiple && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous award"
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-3xl w-full h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        >
          <X size={18} />
        </button>

        {multiple && (
          <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/40 text-white text-xs font-semibold">
            {index + 1} / {items.length}
          </span>
        )}

        <AnimatePresence mode="wait">
          <AwardLightboxContent key={item.id} item={item} />
        </AnimatePresence>
      </motion.div>

      {multiple && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next award"
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </motion.div>
  );
}

// `limit`: cap how many render (the homepage teaser); omit for the full /kms/awards
// page. When a cap actually hides some awards, a "View All Awards" link appears below
// the grid — every one of the 8 view styles below renders from `displayItems`, so the
// cap/link apply uniformly regardless of which style is active.
// `hideInactive`: the admin's hide toggle (active === false) is a "leave it off the
// homepage teaser" flag, not a full unpublish — the dedicated /kms/awards page is the
// complete archive and always shows everything, so it passes hideInactive={false}.
export default function Awards({ limit, hideInactive = true } = {}) {
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    // Cover image for thumbnails: first MOV image if any, else the legacy single
    // `image` field (old records saved before the MOV gallery existed).
    getAwards().then((data) => setItems(
      data.map((item) => ({ ...item, coverImage: item.images?.[0]?.image || item.image || '' }))
    ));
    getKmsSettings().then((s) => setViewMode(s.awards_style || 'cards')).catch(() => {});
  }, []);

  const visibleItems = hideInactive ? items.filter((item) => item.active !== false) : items;
  const displayItems = limit ? visibleItems.slice(0, limit) : visibleItems;
  const hasMore = Boolean(limit) && visibleItems.length > limit;

  const next = useCallback(
    () => setSelectedIndex((i) => (i + 1) % displayItems.length),
    [displayItems.length]
  );
  const prev = useCallback(
    () => setSelectedIndex((i) => (i - 1 + displayItems.length) % displayItems.length),
    [displayItems.length]
  );

  if (visibleItems.length === 0) return null;

  return (
    <section id="awards" className="bg-gray-50 dark:bg-background py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#0038A8] dark:text-primary text-sm font-semibold uppercase tracking-wider mb-2">
            Recognition
          </p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-foreground tracking-tight">
            Awards
          </h2>
          <p className="text-gray-500 dark:text-muted-foreground mt-3 text-lg">
            Recognitions received by DICT Region X
          </p>
          <div className="mt-4 h-1.5 w-16 bg-[#FCD116] dark:bg-primary rounded-full mx-auto dark:shadow-[0_0_10px_rgba(44,90,255,0.5)]" />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {/* ── Cards View (default) ────────────────────── */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  variants={card}
                  onClick={() => setSelectedIndex(i)}
                  className="group h-full flex flex-col text-left rounded-2xl border p-6 bg-white border-gray-200 text-gray-800 shadow-sm dark:bg-card dark:border-border dark:text-card-foreground dark:hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(44,90,255,0.15)] hover:-translate-y-1.5 transition-all duration-300"
                >
                  <AwardThumb src={item.coverImage} alt={item.title} />
                  <div className="flex items-start gap-4 mb-3">
                    <span className="w-12 h-12 shrink-0 rounded-full bg-[#FCD116]/20 dark:bg-primary/10 flex items-center justify-center text-[#0038A8] dark:text-primary">
                      <Award size={22} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base leading-tight dark:text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
                        {item.issuer} &middot; {item.year}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed mt-auto line-clamp-3">
                    {item.description}
                  </p>
                </motion.button>
              ))}
            </div>
          )}

          {/* ── List View ───────────────────────────────── */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {displayItems.map((item, i) => (
                <motion.div key={item.id} variants={card}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className="w-full group bg-white dark:bg-card border border-gray-200 dark:border-border rounded-2xl p-5 flex items-center gap-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-[#0038A8]/40 dark:hover:border-primary/50 text-left"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0038A8] to-[#001233] flex items-center justify-center">
                          <Award size={24} className="text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-[#0038A8] text-white px-2 py-0.5 rounded-full font-bold">{item.year}</span>
                        <span className="text-xs text-gray-500 dark:text-muted-foreground">{item.issuer}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-foreground truncate">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-muted-foreground truncate mt-0.5">{item.description}</p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Grid View ───────────────────────────────── */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayItems.map((item, i) => (
                <motion.div key={item.id} variants={card}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className="group relative w-full h-56 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#0038A8]/40 dark:hover:border-primary/50 text-left"
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233] flex items-center justify-center">
                        <Award size={40} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold">
                      {item.year}
                    </span>
                    <div className="absolute bottom-0 inset-x-0 p-5">
                      <h3 className="font-bold text-white text-lg leading-tight">{item.title}</h3>
                      <p className="text-sm text-white/70 mt-1">{item.issuer}</p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Collage View ────────────────────────────── */}
          {viewMode === 'collage' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] gap-4">
              {displayItems.map((item, i) => {
                const patterns = [
                  { gridColumn: 'span 2', gridRow: 'span 2' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 1' },
                  { gridColumn: 'span 1', gridRow: 'span 2' },
                ];
                const style = patterns[i % patterns.length];
                return (
                  <motion.div key={item.id} variants={card} style={style}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className="group relative h-full w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
                    >
                      {item.coverImage ? (
                        <img src={item.coverImage} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233] flex items-center justify-center">
                          <Award size={32} className="text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold">{item.year}</span>
                      <div className="absolute bottom-0 inset-x-0 p-4">
                        <h3 className="font-bold text-white text-sm leading-tight">{item.title}</h3>
                        <p className="text-xs text-white/70 mt-1">{item.issuer}</p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Timeline View ───────────────────────────── */}
          {viewMode === 'timeline' && (
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2 hidden lg:block" />
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 lg:hidden" />
              <div className="space-y-8">
                {displayItems.map((item, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <motion.div key={item.id} variants={card} className={`relative flex items-start gap-4 lg:gap-0 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                      <div className="absolute left-6 lg:left-1/2 w-4 h-4 -translate-x-1/2 rounded-full bg-[#0038A8] border-4 border-white dark:border-gray-900 z-10 mt-5" />
                      <div className="w-12 shrink-0 lg:hidden" />
                      <div className={`flex-1 lg:w-1/2 ${isLeft ? 'lg:pr-10' : 'lg:pl-10'}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedIndex(i)}
                          className="w-full bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-5 shadow-sm hover:shadow-md transition-shadow text-left group"
                        >
                          <div className="flex items-start gap-4">
                            {item.coverImage && <img src={item.coverImage} alt={item.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs bg-[#0038A8] text-white px-2 py-0.5 rounded-full font-bold">{item.year}</span>
                              <h3 className="font-bold text-gray-900 dark:text-foreground text-sm mt-1">{item.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">{item.issuer}</p>
                              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            </div>
                          </div>
                        </button>
                      </div>
                      <div className="hidden lg:block lg:w-1/2" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Masonry View ────────────────────────────── */}
          {viewMode === 'masonry' && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {displayItems.map((item, i) => (
                <motion.div key={item.id} variants={card} className="break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className="w-full bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left group"
                  >
                    {item.coverImage && <img src={item.coverImage} alt={item.title} className="w-full object-cover" style={{ height: `${180 + (i % 3) * 60}px` }} />}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-[#0038A8] text-white px-2 py-0.5 rounded-full font-bold">{item.year}</span>
                        <span className="text-xs text-gray-500 dark:text-muted-foreground">{item.issuer}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-foreground text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Showcase View ───────────────────────────── */}
          {viewMode === 'showcase' && (
            <div className="space-y-6">
              {displayItems[0] && (
                <motion.div variants={card}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(0)}
                    className="relative w-full rounded-2xl overflow-hidden h-72 lg:h-80 group text-left"
                  >
                    {displayItems[0].coverImage ? (
                      <img src={displayItems[0].coverImage} alt={displayItems[0].title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-[#FCD116] text-[#0038A8] text-xs font-black uppercase tracking-wider">Featured</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold">{displayItems[0].year}</span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">{displayItems[0].title}</h2>
                      <p className="text-sm text-white/70">{displayItems[0].issuer}</p>
                      <p className="text-sm text-white/80 max-w-2xl line-clamp-2 mt-2">{displayItems[0].description}</p>
                    </div>
                  </button>
                </motion.div>
              )}
              {displayItems.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {displayItems.slice(1).map((item, i) => (
                    <motion.div key={item.id} variants={card}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(i + 1)}
                        className="w-full bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left group"
                      >
                        {item.coverImage && <img src={item.coverImage} alt={item.title} className="w-full h-32 object-cover" />}
                        <div className="p-3">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 px-2 py-0.5 rounded-full font-medium">{item.year}</span>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-foreground mt-1 truncate">{item.title}</h3>
                          <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{item.issuer}</p>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Horizontal Scroll View ──────────────────── */}
          {viewMode === 'horizontal' && (
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory">
              {displayItems.map((item, i) => (
                <motion.div key={item.id} variants={card} className="flex-shrink-0 w-72 snap-start">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className="group relative h-56 w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-border hover:shadow-xl transition-all duration-300 text-left"
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233] flex items-center justify-center">
                        <Award size={32} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold">{item.year}</span>
                    <div className="absolute bottom-0 inset-x-0 p-5">
                      <h3 className="font-bold text-white text-lg leading-tight">{item.title}</h3>
                      <p className="text-sm text-white/70 mt-1">{item.issuer}</p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {hasMore && (
          <div className="text-center mt-10">
            <Link
              to="/kms/awards"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0038A8] dark:bg-primary text-white font-semibold text-sm hover:bg-[#001a52] dark:hover:opacity-90 transition-colors"
            >
              View All Awards <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <AwardLightbox
            items={displayItems}
            index={selectedIndex}
            onClose={() => setSelectedIndex(null)}
            onNext={next}
            onPrev={prev}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
