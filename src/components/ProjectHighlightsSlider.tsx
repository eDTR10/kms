// @ts-nocheck
import { useEffect, useState } from 'react';
import { getProjectHighlights, getProjectSliderDesign } from '../services/projects';
import { designFromBackend, highlightFromBackend } from '../screens/Admin/FreeWifi/FreeWifiHighlights';
import { SliderPreview } from '../screens/Admin/Project/ProjectHighlights';
import { Skeleton } from '../screens/Admin/Skeleton';

const DEFAULT_DESIGN = {
  bgColor: '#0038A8', bgGradient: '#001a52', textColor: '#ffffff', overlayOpacity: 30,
  height: 'h-64', autoPlay: true, interval: 5000, template: 'classic-center',
};

/** Public-facing highlights slider for a project page — same admin-managed content
 * and rendering (templates, colors, autoplay) as Free Wi-Fi's own slider, just reused
 * across the other 7 projects instead of being reimplemented per page. Renders nothing
 * if the project has no active highlights yet. */
export default function ProjectHighlightsSlider({ slug }) {
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState([]);
  const [design, setDesign] = useState(DEFAULT_DESIGN);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProjectHighlights(slug), getProjectSliderDesign(slug)])
      .then(([h, d]) => {
        setHighlights(h.map(highlightFromBackend));
        setDesign(designFromBackend(d));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mb-8">
        <Skeleton className={`w-full ${DEFAULT_DESIGN.height} rounded-2xl`} />
      </div>
    );
  }

  if (highlights.filter((h) => h.active).length === 0) return null;

  return (
    <div className="mb-8">
      <SliderPreview highlights={highlights} design={design} />
    </div>
  );
}
