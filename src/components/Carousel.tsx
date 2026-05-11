// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import dictLogo from '../assets/project-logo/DICT Logo.png';

const STORAGE_KEY = 'kms-carousel';

/** Extract the Drive file ID from common sharing URL patterns */
function extractDriveId(url) {
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

/** Convert a Google Drive sharing URL to a displayable image URL.
 *  lh3.googleusercontent.com/d/FILE_ID is the CDN path that works for
 *  publicly-shared Drive images; falls back to thumbnail API for authenticated sessions.
 */
export function getDriveImageUrl(url) {
  if (!url) return '';
  const id = extractDriveId(url);
  if (id) return `https://lh3.googleusercontent.com/d/${id}=w1600`;
  return url; // already a direct image URL
}

/** The thumbnail API URL (used as <img> crossorigin fallback) */
export function getDriveThumbnailUrl(url) {
  if (!url) return '';
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
  return url;
}

export function getCarouselSlides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCarouselSlides(slides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
}

export default function Carousel() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    setSlides(getCarouselSlides());
    const onUpdate = () => { setSlides(getCarouselSlides()); setImgErrors({}); };
    window.addEventListener('kms-carousel-update', onUpdate);
    return () => window.removeEventListener('kms-carousel-update', onUpdate);
  }, []);

  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) {
      setCurrent(slides.length - 1);
    }
  }, [slides.length, current]);

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + slides.length) % slides.length),
    [slides.length]
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, paused, next]);

  if (slides.length === 0) return null;

  const handleImgError = (id, primarySrc, fallbackSrc, e) => {
    // Try thumbnail API as second attempt before showing placeholder
    if (e.target.src !== fallbackSrc) {
      e.target.src = fallbackSrc;
    } else {
      setImgErrors((prev) => ({ ...prev, [id]: true }));
    }
  };

  return (
    <section
      className="w-full bg-[#001a52] select-none py-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-5xl mx-auto px-4 relative">
        {/* Slide track — 16:9 aspect ratio shows full image */}
        <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
          {slides.map((slide, i) => {
            const primarySrc = getDriveImageUrl(slide.url);
            const fallbackSrc = getDriveThumbnailUrl(slide.url);
            const hasError = imgErrors[slide.id];

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
              >
                {hasError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-[#0038A8] to-[#001a52] gap-4">
                    <img src={dictLogo} alt="DICT" className="w-16 h-16 object-contain opacity-40" />
                    <div className="text-center">
                      <ImageOff size={22} className="text-white/30 mx-auto mb-2" />
                      <p className="text-white/40 text-xs max-w-xs px-4">
                        Image could not be loaded. Sign in with your DICT Google account, or ensure the Drive file is shared as <em>"Anyone with the link"</em>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={primarySrc}
                    alt={slide.title || `Slide ${i + 1}`}
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                    onError={(e) => handleImgError(slide.id, primarySrc, fallbackSrc, e)}
                  />
                )}
                {slide.title && (
                  <div className="absolute bottom-6 left-0 right-0 text-center px-6">
                    <p className="text-white font-bold text-lg drop-shadow-lg bg-black/40 inline-block px-4 py-1 rounded-full">
                      {slide.title}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button onClick={prev} aria-label="Previous slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/65 text-white rounded-full p-2 transition-colors">
                <ChevronLeft size={22} />
              </button>
              <button onClick={next} aria-label="Next slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/65 text-white rounded-full p-2 transition-colors">
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

