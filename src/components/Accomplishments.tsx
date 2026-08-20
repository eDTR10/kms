// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListChecks, X } from 'lucide-react';
import { getAccomplishments } from '../services/accomplishments';
import { getKmsSettings } from '../services/settings';

// ═══════════════════════════════════════════════════════════════════
// Collage Pattern Variants
// Each pattern defines a unique tile arrangement for visual variety
// ═══════════════════════════════════════════════════════════════════

const COLLAGE_PATTERNS = {
  // Pattern A: Classic asymmetric — big hero left, mixed tiles right
  classic: [
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-5', size: 'medium' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-2 lg:col-end-4 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2', lg: 'lg:col-start-2 lg:col-end-4 lg:row-start-4 lg:row-end-5', size: 'wide' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-2 lg:row-end-3', size: 'wide' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-3 lg:row-end-5', size: 'big' },
  ],

  // Pattern B: Centered hero — big center tile with surrounding small tiles
  centered: [
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-3 row-span-2', lg: 'lg:col-start-2 lg:col-end-5 lg:row-start-2 lg:row-end-4', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-4', size: 'small' },
  ],

  // Pattern C: Zigzag — alternating tiles creating a dynamic flow
  zigzag: [
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-2 lg:row-end-4', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-5', size: 'medium' },
    { base: 'col-span-2', lg: 'lg:col-start-2 lg:col-end-4 lg:row-start-3 lg:row-end-4', size: 'wide' },
    { base: 'col-span-2', lg: 'lg:col-start-2 lg:col-end-4 lg:row-start-4 lg:row-end-5', size: 'wide' },
    { base: 'col-span-1 row-span-1', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-4 lg:row-end-5', size: 'medium' },
  ],

  // Pattern D: Magazine — editorial-style layout with large feature tile
  magazine: [
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-3 lg:col-end-5 lg:row-start-3 lg:row-end-5', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-5', size: 'medium' },
  ],

  // Pattern E: Scattered — organic, gallery-wall feel
  scattered: [
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-2 lg:row-end-4', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-3 lg:row-end-5', size: 'big' },
  ],

  // Pattern F: Cascade — diagonal flow from top-left to bottom-right
  cascade: [
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-4', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-4 lg:row-end-6', size: 'big' },
  ],

  // Pattern G: Bricks — brick-wall inspired layout
  bricks: [
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-4 lg:col-end-6 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-2 lg:row-end-4', size: 'big' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-3 lg:col-end-5 lg:row-start-4 lg:row-end-6', size: 'big' },
  ],

  // Pattern H: Panorama — wide panoramic tiles emphasis
  panorama: [
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-3 lg:col-end-5 lg:row-start-1 lg:row-end-3', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-3', size: 'medium' },
    { base: 'col-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-3 lg:row-end-4', size: 'wide' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-4 lg:row-end-5', size: 'wide' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-3 lg:col-end-5 lg:row-start-4 lg:row-end-6', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-4 lg:row-end-6', size: 'medium' },
  ],

  // Pattern I: Mosaic — balanced mix of all tile sizes
  mosaic: [
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-3', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-1 lg:row-end-3', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-1 lg:col-end-3 lg:row-start-3 lg:row-end-5', size: 'big' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-3 lg:col-end-5 lg:row-start-3 lg:row-end-5', size: 'big' },
  ],

  // Pattern J: Diamond — diamond-shaped arrangement
  diamond: [
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-2 lg:row-end-3', size: 'small' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-5', size: 'medium' },
    { base: 'col-span-2 row-span-2', lg: 'lg:col-start-2 lg:col-end-4 lg:row-start-3 lg:row-end-5', size: 'big' },
    { base: 'col-span-1 row-span-2', lg: 'lg:col-start-4 lg:col-end-5 lg:row-start-3 lg:row-end-5', size: 'medium' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-3 lg:row-end-4', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-5 lg:col-end-6 lg:row-start-4 lg:row-end-5', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-2 lg:col-end-3 lg:row-start-5 lg:row-end-6', size: 'small' },
    { base: 'col-span-1', lg: 'lg:col-start-3 lg:col-end-4 lg:row-start-5 lg:row-end-6', size: 'small' },
  ],
};

// Pattern names for random selection
const PATTERN_KEYS = Object.keys(COLLAGE_PATTERNS);

const OVERFLOW_PATTERNS = [
  // Overflow A: Alternating big and small
  [
    { base: 'col-span-2 row-span-2', size: 'big' },
    { base: 'col-span-1', size: 'small' },
    { base: 'col-span-1', size: 'small' },
    { base: 'col-span-2', size: 'wide' },
  ],
  // Overflow B: Mixed sizes
  [
    { base: 'col-span-1 row-span-2', size: 'medium' },
    { base: 'col-span-2 row-span-1', size: 'wide' },
    { base: 'col-span-1', size: 'small' },
    { base: 'col-span-2 row-span-2', size: 'big' },
  ],
  // Overflow C: Row-based
  [
    { base: 'col-span-2', size: 'wide' },
    { base: 'col-span-1', size: 'small' },
    { base: 'col-span-1', size: 'small' },
    { base: 'col-span-2 row-span-2', size: 'big' },
  ],
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

// Map style IDs from settings to pattern keys
const STYLE_TO_PATTERN = {
  'collage-1': 'classic',
  'collage-2': 'centered',
  'collage-3': 'zigzag',
  'collage-4': 'magazine',
  'collage-5': 'scattered',
  'collage-6': 'cascade',
  'collage-7': 'bricks',
  'collage-8': 'panorama',
  'collage-9': 'mosaic',
  'collage-10': 'diamond',
};

function AccomplishmentCard({ item, size, onClick }) {
  const big = size === 'big';
  const small = size === 'small';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-full w-full text-left rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#0038A8]/40 dark:hover:border-primary/50">
      {item.image ? (
        <img
          src={item.image}
          alt={item.title}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none [-webkit-user-drag:none] transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233] dark:from-primary/30 dark:to-background transition-transform duration-500 group-hover:scale-110" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/95" />

      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold">
        {item.year}
      </span>

      <div className={`absolute bottom-0 inset-x-0 transition-transform duration-300 group-hover:-translate-y-0.5 ${big ? 'p-6' : small ? 'p-3' : 'p-4'}`}>
        <p className={`font-black text-[#FCD116] drop-shadow-sm leading-none ${big ? 'text-4xl' : small ? 'text-xl' : 'text-2xl'}`}>
          {item.metric}
        </p>
        {!small && (
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide mt-1 mb-2">
            {item.metricLabel}
          </p>
        )}
        <h3 className={`font-bold leading-tight text-white ${big ? 'text-lg mb-2' : small ? 'text-xs mt-1' : 'text-sm mb-1'}`}
          style={small ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
        >
          {item.title}
        </h3>
        {big && (
          <p
            className="text-xs text-white/70 leading-relaxed"
            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}

function AccomplishmentLightboxContent({ item }) {
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
      {hasImage ? (
        <img
          src={item.image}
          alt={item.title}
          onError={() => setImgBroken(true)}
          className="absolute inset-0 w-full h-[50vh] object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0038A8] to-[#001233]" />
      )}
      <div className="absolute top-20 inset-0 bg-gradient-to-t from-white via-white to-white/0" />

      <div className="relative h-[60vh] bottom-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end px-6 sm:px-8 py-8">
          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0038A8] text-white text-xs font-bold mb-4">
            {item.year}
          </span>
          <p className="text-4xl sm:text-5xl font-black text-[#0038A8] leading-none drop-shadow-sm mb-1">
            {item.metric}
          </p>
          <p className="text-xs font-medium text-accent-foreground/60 uppercase tracking-wide mb-4">
            {item.metricLabel}
          </p>
          <h3 className="text-2xl sm:text-4xl font-black text-accent-foreground leading-tight drop-shadow-lg mb-3">
            {item.title}
          </h3>
          <p className="text-sm text-accent-foreground/90 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>

          {item.breakdown && item.breakdown.length > 0 && (
            <div className="mt-6 pt-6 border-t border-black/10">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={14} className="text-[#0038A8]" />
                <p className="text-xs font-bold text-accent-foreground uppercase tracking-wide">Breakdown</p>
              </div>
              <div className="space-y-2.5">
                {item.breakdown.map((b, i) => {
                  const nums = item.breakdown.map((row) => parseFloat(String(row.value).replace(/,/g, '')) || 0);
                  const max = Math.max(...nums, 1);
                  const pct = Math.max(6, (nums[i] / max) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-accent-foreground/70 w-2/5 shrink-0 truncate">{b.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#0038A8]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-accent-foreground w-16 text-right shrink-0">{b.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AccomplishmentLightbox({ items, index, onClose, onNext, onPrev }) {
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
          aria-label="Previous accomplishment"
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
          <AccomplishmentLightboxContent item={item} />
        </AnimatePresence>
      </motion.div>

      {multiple && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next accomplishment"
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </motion.div>
  );
}

export default function Accomplishments() {
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [activePattern, setActivePattern] = useState('classic');

  useEffect(() => {
    getAccomplishments().then((data) => setItems(data.filter((item) => item.active !== false)));
    getKmsSettings().then((s) => {
      const styleId = s.accomplishments_style || 'collage-1';
      setActivePattern(STYLE_TO_PATTERN[styleId] || 'classic');
    }).catch(() => {});
  }, []);

  const next = useCallback(
    () => setSelectedIndex((i) => (i + 1) % items.length),
    [items.length]
  );
  const prev = useCallback(
    () => setSelectedIndex((i) => (i - 1 + items.length) % items.length),
    [items.length]
  );

  const currentPattern = COLLAGE_PATTERNS[activePattern] || COLLAGE_PATTERNS.classic;
  const overflowPattern = OVERFLOW_PATTERNS[Math.floor(Math.random() * OVERFLOW_PATTERNS.length)];

  if (items.length === 0) return null;

  return (
    <section id="accomplishments" className="bg-white dark:bg-background py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#0038A8] dark:text-primary text-sm font-semibold uppercase tracking-wider mb-2">
            Milestones
          </p>
          <h2 className="text-3xl font-black text-gray-900 dark:text-foreground tracking-tight">
            Accomplishments
          </h2>
          <p className="text-gray-500 dark:text-muted-foreground mt-3 text-lg">
            Highlights from our programs across Region 10
          </p>
          <div className="mt-4 h-1.5 w-16 bg-[#FCD116] dark:bg-primary rounded-full mx-auto dark:shadow-[0_0_10px_rgba(44,90,255,0.5)]" />
        </div>

        {/* Collage grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-5 auto-rows-[170px] lg:auto-rows-[120px] grid-flow-row-dense gap-4"
        >
          {items.map((item, i) => {
            if (i < currentPattern.length) {
              const { base, lg, size } = currentPattern[i];
              return (
                <motion.div key={item.id} variants={card} className={`${base} ${lg}`}>
                  <AccomplishmentCard item={item} size={size} onClick={() => setSelectedIndex(i)} />
                </motion.div>
              );
            }
            const overflowIndex = i - currentPattern.length;
            const { base, size } = overflowPattern[overflowIndex % overflowPattern.length];
            return (
              <motion.div key={item.id} variants={card} className={base}>
                <AccomplishmentCard item={item} size={size} onClick={() => setSelectedIndex(i)} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <AccomplishmentLightbox
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
