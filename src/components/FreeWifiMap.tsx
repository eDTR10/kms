// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Select from 'react-select';
import { Wifi, Search } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MARKER_ICON_OPTIONS } from '../lib/markerIcons';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Kept only for the Free-Wi-Fi-specific dead code path in FreeWifiCharts.tsx (isFreeWifi
// is permanently false there now) — the map itself no longer assumes a "province" column
// exists; see `filterFields` below for the generic replacement.
export const PROVINCE_COLORS = {
  'Bukidnon': '#2563eb',
  'Camiguin': '#059669',
  'Cagayan de Oro City': '#d97706',
  'Iligan City': '#7c3aed',
  'Lanao del Norte': '#dc2626',
  'Misamis Occidental': '#0891b2',
  'Misamis Oriental': '#db2777',
};

// Palette for coloring dots/legend by whichever column is the first configured filter
// field — cycles if a column has more distinct values than colors.
const FILTER_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777', '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
const DEFAULT_DOT_COLOR = '#0038A8';

const REGION_10_CENTER = [8.35, 124.65];
// Bigger than Leaflet's old default (4px) so a dot is easy to hit with the mouse; grows
// further on hover so it's obvious it's being targeted.
const MAP_DOT_RADIUS = 6;
const MAP_DOT_HOVER_RADIUS = 10;

// Turns a Lucide icon name + color into a Leaflet divIcon — Leaflet markers need actual
// HTML/an image, not a React component, so the icon is rendered to a static SVG string
// once here, cached per color by the caller (not rebuilt per marker/per pan-frame). No
// wrapper div/background/box-shadow: that badge was the main cost of panning/zooming with
// many markers on screen (box-shadow forces a repaint per marker per frame), so this is
// just the bare glyph, small and centered on the coordinate like the old dot markers were.
function buildLucideDivIcon(iconName, color) {
  const option = MARKER_ICON_OPTIONS.find(o => o.name === iconName);
  if (!option) return null;
  const iconColor = color || DEFAULT_DOT_COLOR;
  const size = 18;
  const svg = renderToStaticMarkup(<option.Icon size={size} color={iconColor} strokeWidth={2.5} />);
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

// Exported so every other admin dropdown (FreeWifiCharts.tsx's Data Source / Add-Edit
// Chart modals) can use the exact same react-select look instead of each screen rolling
// its own — this is the one Select ever built for this app, everything reuses it.
export const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '36px',
    fontSize: '13px',
    borderColor: state.isFocused ? '#0038A8' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(0,56,168,0.2)' : 'none',
    backgroundColor: 'transparent',
  }),
  menu: (base) => ({ ...base, fontSize: '13px', zIndex: 9999 }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected ? '#0038A8' : isFocused ? '#f0f7ff' : 'white',
    color: isSelected ? 'white' : '#1f2937',
  }),
  multiValue: (base) => ({ ...base, backgroundColor: '#e0e7ff', borderRadius: '4px' }),
  multiValueLabel: (base) => ({ ...base, color: '#0038A8', fontSize: '12px' }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '13px' }),
};

function FitBounds({ sites }) {
  const map = useMap();
  useEffect(() => {
    if (sites.length > 0) {
      const validSites = sites.filter(s => s.latitude && s.longitude);
      if (validSites.length > 0) {
        const bounds = L.latLngBounds(validSites.map(s => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [sites, map]);
  return null;
}

// `tooltipFields`/`filterFields`: [{ name, label }, ...] — which of a site's own columns
// to show when hovering its dot / to render as a filter dropdown above the map, and in
// what order. Both admin-configurable per project via "Data Source" — no column names are
// assumed, so a project doesn't need to rename its sheet headers to match a fixed set.
// `colorField`: { name, label } or null — which column drives per-marker color + the
// legend (ProjectChartSource.map_color_field), picked independently of filterFields; it
// doesn't have to be one of the filter dropdowns, or configured at all.
// `markerIcon`/`markerIconName`+`markerIconColor`: replaces the default colored circle for
// every marker with either an uploaded/linked image, or a Lucide icon (ProjectChartSource.
// marker_icon / marker_icon_name+marker_icon_color) — mutually exclusive, `markerIcon` wins
// if somehow both are set. An uploaded image is a single flat icon (can't be recolored, so
// the colorField coding/legend are suppressed for it); a Lucide icon instead keeps the
// per-category tint + legend, same as the old dot markers, since it can be recolored.
export default function FreeWifiMap({ sites, totalAPs, showFilters = true, height = '500px', tooltipFields = [], filterFields = [], colorField = null, markerIcon = '', markerIconName = '', markerIconColor = '' }) {
  const [search, setSearch] = useState('');
  // { [fieldName]: [{value,label}, ...] } — one entry per configured filter field.
  const [selectedByField, setSelectedByField] = useState({});

  // Distinct values per filter field, independent of each other — no cascading, since
  // (unlike the old fixed province→district→locality→barangay hierarchy) these are
  // arbitrary per-project columns with no assumed relationship to one another.
  const optionsByField = useMemo(() => {
    const map = {};
    filterFields.forEach(f => {
      map[f.name] = [...new Set(sites.map(s => s[f.name]))].filter(Boolean).sort().map(v => ({ value: v, label: v }));
    });
    return map;
  }, [sites, filterFields]);

  const colorFieldName = colorField?.name;
  // Distinct values of the color field on their own — colorField isn't necessarily one of
  // filterFields, so this can't reuse optionsByField.
  const colorFieldValues = useMemo(() => {
    if (!colorFieldName) return [];
    return [...new Set(sites.map(s => s[colorFieldName]))].filter(Boolean).sort();
  }, [sites, colorFieldName]);
  const colorMap = useMemo(() => {
    if (!colorFieldName) return {};
    const map = {};
    colorFieldValues.forEach((v, i) => { map[v] = FILTER_COLORS[i % FILTER_COLORS.length]; });
    return map;
  }, [colorFieldName, colorFieldValues]);
  const colorFor = (site) => (colorFieldName && colorMap[site[colorFieldName]]) || DEFAULT_DOT_COLOR;

  // Uploaded image, sized/anchored like a typical pin. Built once per URL, not per marker.
  // An image can't be recolored per category, so this stays a single shared icon.
  const imageIcon = useMemo(() => {
    if (!markerIcon) return null;
    return L.icon({ iconUrl: markerIcon, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28] });
  }, [markerIcon]);

  // Lucide icon, unlike an image, can be recolored — so build one divIcon per distinct
  // category color (bounded by the filter field's own distinct-value count, same as the
  // old dot legend) instead of a single flat color, preserving province/category
  // separation. Cached by color, not rebuilt per marker or per pan/zoom frame.
  const lucideIconsByColor = useMemo(() => {
    if (!markerIconName || markerIcon) return null;
    const colors = new Set();
    if (colorFieldName && Object.keys(colorMap).length > 0) {
      Object.values(colorMap).forEach(c => colors.add(c));
      colors.add(DEFAULT_DOT_COLOR);
    } else {
      colors.add(markerIconColor || DEFAULT_DOT_COLOR);
    }
    const map = {};
    colors.forEach(c => { map[c] = buildLucideDivIcon(markerIconName, c); });
    return map;
  }, [markerIconName, markerIcon, colorFieldName, colorMap, markerIconColor]);

  const iconFor = (site) => {
    if (imageIcon) return imageIcon;
    if (lucideIconsByColor) {
      const color = colorFieldName ? colorFor(site) : (markerIconColor || DEFAULT_DOT_COLOR);
      return lucideIconsByColor[color] || lucideIconsByColor[DEFAULT_DOT_COLOR];
    }
    return null;
  };

  // Drives the "Visible" stats-card glyph so it matches whichever Lucide icon is picked
  // (falls back to the default Wifi glyph for image-marker mode or no custom icon at all).
  const statsIconOption = markerIconName ? MARKER_ICON_OPTIONS.find(o => o.name === markerIconName) : null;
  const StatsIcon = statsIconOption?.Icon || Wifi;
  const statsIconColor = statsIconOption ? (markerIconColor || DEFAULT_DOT_COLOR) : '#0038A8';

  const setFieldSelection = (name, val) => setSelectedByField(prev => ({ ...prev, [name]: val || [] }));

  // Filter sites for map
  const filteredSites = useMemo(() => {
    let result = sites.filter(s => s.latitude && s.longitude);

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(s => Object.values(s).some(v => v != null && String(v).toLowerCase().includes(term)));
    }

    filterFields.forEach(f => {
      const selected = selectedByField[f.name];
      if (selected && selected.length > 0) {
        result = result.filter(s => selected.some(opt => opt.value === s[f.name]));
      }
    });

    return result;
  }, [sites, search, filterFields, selectedByField]);

  const clearFilters = () => {
    setSearch('');
    setSelectedByField({});
  };

  const hasFilters = search || Object.values(selectedByField).some(v => v && v.length > 0);

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            {filterFields.map(f => (
              <div key={f.name} className="min-w-[160px]">
                <Select
                  isMulti
                  options={optionsByField[f.name] || []}
                  value={selectedByField[f.name] || []}
                  onChange={(val) => setFieldSelection(f.name, val)}
                  placeholder={f.label}
                  styles={selectStyles}
                  className="text-sm"
                />
              </div>
            ))}
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ height, position: 'relative' }}>
        <MapContainer center={REGION_10_CENTER} zoom={9} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <FitBounds sites={filteredSites} />

          {filteredSites.map((site, i) => {
            // `id` is the row's real database id — falls back to r10_site_id + index
            // since that alone isn't unique (one site can have several AP rows). A
            // duplicate key here made React reconcile markers incorrectly on filter
            // changes, leaving stale "ghost" dots from before the filter was applied.
            const key = site.id ?? `${site.r10_site_id || 'row'}-${i}`;
            const tooltipNode = tooltipFields.length > 0 && (
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-[160px]">
                  {tooltipFields.map(f => (
                    <p key={f.name} className="text-xs text-gray-700 leading-snug">
                      <span className="font-semibold">{f.label}:</span> {String(site[f.name] ?? '—')}
                    </p>
                  ))}
                </div>
              </Tooltip>
            );

            const icon = iconFor(site);
            if (icon) {
              return (
                <Marker key={key} position={[site.latitude, site.longitude]} icon={icon}>
                  {tooltipNode}
                </Marker>
              );
            }
            return (
              <CircleMarker
                key={key}
                center={[site.latitude, site.longitude]}
                radius={MAP_DOT_RADIUS}
                pathOptions={{
                  color: colorFor(site),
                  fillColor: colorFor(site),
                  fillOpacity: 0.7,
                  weight: 1,
                }}
                eventHandlers={{
                  mouseover: (e) => e.target.setRadius(MAP_DOT_HOVER_RADIUS),
                  mouseout: (e) => e.target.setRadius(MAP_DOT_RADIUS),
                }}
              >
                {tooltipNode}
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Stats overlay */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center gap-2">
            <StatsIcon size={25} style={{ color: statsIconColor }} />
            <div>
              <p className="text-sm font-bold">{filteredSites.length}</p>
              <p className="text-[10px] text-gray-500">Visible</p>
            </div>
          </div>
        </div>

        {/* Legend — only when a color field is set (its distinct values drive dot/icon
            color) AND we're not in uploaded-image mode (an image can't be tinted, so
            per-category color has no meaning there). Lucide-icon mode keeps the legend,
            since its icons are tinted per category same as the plain dots were. */}
        {!imageIcon && colorFieldName && Object.keys(colorMap).length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000] max-w-[200px]">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{colorField.label}</h4>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(colorMap).map(([value, color]) => (
                <div key={value} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={value}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
