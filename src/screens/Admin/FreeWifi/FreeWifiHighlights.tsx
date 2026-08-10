// @ts-nocheck
import ProjectHighlights from '../Project/ProjectHighlights';

// This file used to be the whole Free Wi-Fi Highlights admin screen (backed by its own
// FreeWifiHighlight/FreeWifiSliderDesign tables). Those tables are gone — Free Wi-Fi now
// uses the same generic ProjectHighlight/ProjectSliderDesign system as every other
// project (see ProjectHighlights). The camelCase<->snake_case mapping helpers below are
// kept here (and still exported from this exact path) because ProjectHighlightsSlider,
// the public FreeWifi page, and ProjectHighlights itself all import them from here.

const DEFAULT_DESIGN = {
  bgColor: '#0038A8',
  bgGradient: '#001a52',
  textColor: '#ffffff',
  overlayOpacity: 30,
  height: 'h-64',
  autoPlay: true,
  interval: 5000,
  template: 'classic-center',
};

export function designFromBackend(s) {
  return {
    bgColor: s.bg_color || DEFAULT_DESIGN.bgColor,
    bgGradient: s.bg_gradient || DEFAULT_DESIGN.bgGradient,
    textColor: s.text_color || DEFAULT_DESIGN.textColor,
    overlayOpacity: s.overlay_opacity ?? DEFAULT_DESIGN.overlayOpacity,
    height: s.height || DEFAULT_DESIGN.height,
    customHeight: s.custom_height || undefined,
    autoPlay: s.auto_play ?? DEFAULT_DESIGN.autoPlay,
    interval: s.interval ?? DEFAULT_DESIGN.interval,
    template: s.template || DEFAULT_DESIGN.template,
  };
}

export function designToBackend(d) {
  return {
    bg_color: d.bgColor,
    bg_gradient: d.bgGradient,
    text_color: d.textColor,
    overlay_opacity: d.overlayOpacity,
    height: d.height,
    custom_height: d.height === 'custom' ? (d.customHeight || null) : null,
    auto_play: d.autoPlay,
    interval: d.interval,
    template: d.template,
  };
}

export function highlightFromBackend(h) {
  return {
    id: h.id,
    title: h.title,
    description: h.description || '',
    image: h.image || '',
    active: h.active,
    showTitle: h.show_title,
    showDescription: h.show_description,
    order: h.order,
  };
}

export default function FreeWifiHighlights() {
  return <ProjectHighlights slug="free-wifi" />;
}
