// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getAwards } from '../services/awards';

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
  const hasImage = item.image && !imgBroken;

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 bg-white flex items-end"
    >
      {/* Full-bleed photo backdrop, fixed behind the text — it does not
          scroll away, the whole card (title + full description) reads as
          one continuous overlay on top of it, like the award's own posters. */}
      {hasImage ? (
        <img
          src={item.image}
          alt={item.title}
          onError={() => setImgBroken(true)}
          className="absolute inset-0 w-full h-[50vh] object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] to-[#ffffffef]" />
      )}
      <div className="absolute top-20 inset-0 bg-gradient-to-t from-white via-white to-white/0" />

      {/* Scrollable text overlay — sits on top of the fixed backdrop above,
          initially anchored to the bottom so the photo reads first. */}
      <div className="relative h-[60vh] bottom-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end px-6 sm:px-8 py-8">
          <h3 className="text-2xl sm:text-4xl font-black text-accent-foreground leading-tight drop-shadow-lg mb-2">
            {item.title}
          </h3>
          <p className="text-sm text-accent-foreground/70 mb-4">
            {item.issuer} &middot; {item.year}
          </p>
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
        {/* Pinned in place regardless of scroll — siblings of the scrolling
            text overlay inside AwardLightboxContent, not inside it. */}
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
          <AwardLightboxContent item={item} />
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

export default function Awards() {
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    getAwards().then(setItems);
  }, []);

  const next = useCallback(
    () => setSelectedIndex((i) => (i + 1) % items.length),
    [items.length]
  );
  const prev = useCallback(
    () => setSelectedIndex((i) => (i - 1 + items.length) % items.length),
    [items.length]
  );

  if (items.length === 0) return null;

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
            Recognitions received by DICT Region 10
          </p>
          <div className="mt-4 h-1.5 w-16 bg-[#FCD116] dark:bg-primary rounded-full mx-auto dark:shadow-[0_0_10px_rgba(44,90,255,0.5)]" />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              type="button"
              variants={card}
              onClick={() => setSelectedIndex(i)}
              className="group h-full flex flex-col text-left rounded-2xl border p-6 bg-white border-gray-200 text-gray-800 shadow-sm dark:bg-card dark:border-border dark:text-card-foreground dark:hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(44,90,255,0.15)] hover:-translate-y-1.5 transition-all duration-300"
            >
              <AwardThumb src={item.image} alt={item.title} /> 
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
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <AwardLightbox
            items={items}
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
