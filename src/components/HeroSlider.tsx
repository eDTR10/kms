// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Award as AwardIcon, Image as ImageIcon } from 'lucide-react';
import { getAwards } from '../services/awards';
import { getHighlights } from '../services/highlights';

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4 },
};

/** Resolves the background image (with a Drive-thumbnail fallback) for a slide, if it has one. */
function getSlideImage(slide) {
  if (slide.type === 'award' && slide.award.image) {
    return { src: slide.award.image, fallback: null };
  }
  if (slide.type === 'highlight' && slide.highlight.image) {
    return { src: slide.highlight.image, fallback: null };
  }
  return null;
}

function SlideBackground({ slideKey, image }) {
  const [src, setSrc] = useState(image.src);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setSrc(image.src);
    setHidden(false);
  }, [image.src]);

  if (hidden) return null;

  return (
    <>
      <img
        key={slideKey}
        src={src}
        alt=""
        crossOrigin={image.fallback ? 'anonymous' : undefined}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => {
          if (image.fallback && src !== image.fallback) setSrc(image.fallback);
          else setHidden(true);
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#001233]/95 via-[#0038A8]/70 to-[#0038A8]/30 dark:from-black/95 dark:via-black/70 dark:to-black/30" />
    </>
  );
}

function IntroSlide() {
  return (
    <motion.div key="intro" {...fade}>
      <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-primary/10 dark:border dark:border-primary/20 rounded-full px-4 py-1.5 text-sm mb-6 shadow-[0_0_15px_rgba(44,90,255,0.2)] dark:shadow-[0_0_15px_rgba(44,90,255,0.2)]">
        <span className="w-2 h-2 bg-[#FCD116] dark:bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(44,90,255,0.8)]" />
        <span className="dark:text-primary-foreground font-medium">Knowledge Management System</span>
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight tracking-tight">
        DICT Region 10<br />
        <span className="text-[#FCD116] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-primary dark:to-blue-400 drop-shadow-sm">KMS Portal</span>
      </h1>
      <p className="text-white/80 dark:text-muted-foreground text-lg max-w-2xl mx-auto mb-3 sm:mb-6">
        Centralized access to programs, projects, and performance dashboards of the
        Department of Information and Communications Technology – Northern Mindanao.
      </p>
      <div className="flex  sm:flex-row  gap-4 justify-center">
        <a href="#projects"
          className="px-6 py-3 bg-[#FCD116] text-[#0038A8] dark:bg-primary dark:text-primary-foreground rounded-full font-bold hover:bg-yellow-300 dark:hover:bg-primary/90 transition-all flex items-center justify-center gap-2 dark:shadow-[0_0_20px_rgba(44,90,255,0.4)] dark:hover:shadow-[0_0_30px_rgba(44,90,255,0.6)]">
          View Projects <ArrowRight size={16} />
        </a>
        <Link to="/kms/about"
          className="px-6 py-3 bg-white/10 dark:bg-secondary dark:text-secondary-foreground hover:bg-white/20 dark:hover:bg-secondary/80 rounded-full font-medium transition-colors border border-transparent dark:border-border">
          About Us
        </Link>
      </div>
    </motion.div>
  );
}

function AwardSlide({ award }) {
  return (
    <motion.div key={`award-${award.id}`} {...fade} className="flex flex-col items-center">
      <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-6">
        <AwardIcon size={14} className="text-[#FCD116]" /> Award
      </span>
      {!award.image && (
        <span className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <AwardIcon size={36} className="text-[#FCD116]" />
        </span>
      )}
      <h2 className="text-2xl sm:text-4xl font-black mb-3 leading-tight tracking-tight max-w-3xl drop-shadow-lg">
        {award.title}
      </h2>
      <p className="text-white/80 text-base mb-8 drop-shadow">
        {award.issuer} &middot; {award.year}
      </p>
      <a href="#awards"
        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors border border-white/20 inline-flex items-center gap-2">
        View All Awards <ArrowRight size={16} />
      </a>
    </motion.div>
  );
}

function HighlightSlide({ highlight }) {
  return (
    <motion.div key={`highlight-${highlight.id}`} {...fade} className="flex flex-col items-center">
      <span className="inline-flex items-center bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-6">
        Office Highlight
      </span>
      {!highlight.image && (
        <span className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <ImageIcon size={36} className="text-[#FCD116]" />
        </span>
      )}
      {highlight.title && (
        <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight max-w-2xl drop-shadow-lg">
          {highlight.title}
        </h2>
      )}
    </motion.div>
  );
}

export default function HeroSlider() {
  const [awards, setAwards] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    getAwards().then(setAwards);
    getHighlights().then(setHighlights);
  }, []);

  const slides = [
    { type: 'intro' },
    ...awards.map((a) => ({ type: 'award', award: a })),
    ...highlights.map((h) => ({ type: 'highlight', highlight: h })),
  ];

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [slides.length, paused, next]);

  const slide = slides[current] || slides[0];
  const slideImage = getSlideImage(slide);

  return (
    <div
      className="relative h-[70vh] flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full-bleed slide background */}
      <AnimatePresence mode="wait">
        {slideImage && (
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <SlideBackground slideKey={current} image={slideImage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foreground content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 max-h-full overflow-y-auto text-center">
        <AnimatePresence mode="wait">
          {slide.type === 'intro' && <IntroSlide />}
          {slide.type === 'award' && <AwardSlide award={slide.award} />}
          {slide.type === 'highlight' && <HighlightSlide highlight={slide.highlight} />}
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous slide"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <button onClick={next} aria-label="Next slide"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
            <ChevronRight size={22} />
          </button>

          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-[#FCD116]' : 'w-2 bg-white/40'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
