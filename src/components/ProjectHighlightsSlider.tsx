// @ts-nocheck
import { useEffect, useState } from 'react';
import { getProjectHighlights, getProjectSliderDesign, getProjectOfficeId } from '../services/projects';
import { fetchOfficeDatasets, stripPlaceholder } from '../lib/linkedAccomplishments';
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
  const [tables, setTables] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProjectHighlights(slug), getProjectSliderDesign(slug)])
      .then(async ([h, d]) => {
        const mapped = h.map(highlightFromBackend);
        // Datasets are fetched only when some highlight opted into a dataset-driven title,
        // and the slider waits for them (skeleton shows) so {value} is never visible.
        if (mapped.some((x) => x.active && x.titleBinding?.enabled)) {
          try { setTables(await fetchOfficeDatasets(await getProjectOfficeId(slug))); }
          catch { mapped.forEach((x) => { x.title = stripPlaceholder(x.title); }); }
        }
        setHighlights(mapped);
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
      <SliderPreview highlights={highlights} design={design} tables={tables} />
    </div>
  );
}
