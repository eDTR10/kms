// @ts-nocheck
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { getAccomplishments } from '../services/accomplishments';

// A fixed 10-tile collage template (mirrors a reference photo-collage layout):
// a 2-col mobile fallback, switching to an explicit 5-col/4-row placement at
// lg+ that reproduces the exact tile arrangement — narrow column (small
// square over a tall strip), middle column (big square, a pair of small
// squares, a wide strip), right column (a pair of small squares, a wide
// strip, a wide-tall strip). Extra items beyond 10 fall back to simple
// auto-placed tiles appended below the fixed block.
const COLLAGE_PATTERN = [
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
];

const OVERFLOW_SPAN_PATTERN = [
  'col-span-2 row-span-2',
  'col-span-2 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

function AccomplishmentCard({ item, size }) {
  const big = size === 'big';
  const small = size === 'small';

  return (
    <div className="group relative h-full w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#0038A8]/40 dark:hover:border-primary/50">
      {/* Background: photo if available, otherwise a brand-color cover */}
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

      {/* Scrim for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/95" />

      {/* Top badges */}

      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold">
        {item.year}
      </span>

      {/* Overlaid text */}
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
    </div>
  );
}

export default function Accomplishments() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getAccomplishments().then(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-white dark:bg-background py-20">
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

        {/* Collage grid — mixed tile sizes instead of a uniform grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-5 auto-rows-[170px] lg:auto-rows-[120px] grid-flow-row-dense gap-4"
        >
          {items.map((item, i) => {
            if (i < COLLAGE_PATTERN.length) {
              const { base, lg, size } = COLLAGE_PATTERN[i];
              return (
                <motion.div key={item.id} variants={card} className={`${base} ${lg}`}>
                  <AccomplishmentCard item={item} size={size} />
                </motion.div>
              );
            }
            const overflowIndex = i - COLLAGE_PATTERN.length;
            const span = OVERFLOW_SPAN_PATTERN[overflowIndex % OVERFLOW_SPAN_PATTERN.length];
            return (
              <motion.div key={item.id} variants={card} className={span}>
                <AccomplishmentCard item={item} size="medium" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
