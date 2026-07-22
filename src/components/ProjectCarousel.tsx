import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export interface ProjectCarouselSlide {
  title: string;
  caption?: string;
  gradient?: string;
  imageUrl?: string;
}

const DEFAULT_SLIDES: ProjectCarouselSlide[] = [
  {
    title: "Program Highlights",
    caption: "Sample placeholder — swap for real project photos",
    gradient: "from-[#0038A8] to-[#001a52]",
    imageUrl: "https://picsum.photos/seed/program-highlights/1200/350",
  },
  {
    title: "Field Implementation",
    caption: "Sample placeholder — swap for real project photos",
    gradient: "from-[#CE1126] to-[#7a0d18]",
    imageUrl: "https://picsum.photos/seed/field-implementation/1200/350",
  },
  {
    title: "Partner LGUs & Stakeholders",
    caption: "Sample placeholder — swap for real project photos",
    gradient: "from-[#0038A8] via-[#1b4fc4] to-[#CE1126]",
    imageUrl: "https://picsum.photos/seed/partner-stakeholders/1200/350",
  },
];

/**
 * Same carousel treatment on every project page — currently sample
 * placeholder slides until real project photos are supplied per project.
 */
export default function ProjectCarousel({ slides = DEFAULT_SLIDES }: { slides?: ProjectCarouselSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + slides.length) % slides.length),
    [slides.length]
  );
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, paused, next]);

  return (
    <section
      className="w-full mb-8 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: "21 / 6" }}>
        {slides.map((slide, i) => (
          <div
            key={slide.title}
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} flex flex-col items-center justify-center gap-2 transition-opacity duration-700 ${
              i === current ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <ImageIcon className="text-white/50" size={32} />
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            ) : null}
            <p className="text-white font-bold text-xl drop-shadow-sm text-center px-6">{slide.title}</p>
            {slide.caption && <p className="text-white/70 text-xs">{slide.caption}</p>}
          </div>
        ))}

        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
