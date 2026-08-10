// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import Select from 'react-select';
import { Wifi, Search } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const PROVINCE_COLORS = {
  'Bukidnon': '#2563eb',
  'Camiguin': '#059669',
  'Cagayan de Oro City': '#d97706',
  'Iligan City': '#7c3aed',
  'Lanao del Norte': '#dc2626',
  'Misamis Occidental': '#0891b2',
  'Misamis Oriental': '#db2777',
};

const REGION_10_CENTER = [8.35, 124.65];
// Bigger than Leaflet's old default (4px) so a dot is easy to hit with the mouse; grows
// further on hover so it's obvious it's being targeted.
const MAP_DOT_RADIUS = 6;
const MAP_DOT_HOVER_RADIUS = 10;

const selectStyles = {
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

// `tooltipFields`: [{ name, label }, ...] — which of a site's own columns to show when
// hovering its dot, and in what order. Admin-configurable per project via "Data Source".
// Empty (the default) means no hover tooltip at all.
export default function FreeWifiMap({ sites, totalAPs, showFilters = true, height = '500px', tooltipFields = [] }) {
  const [search, setSearch] = useState('');
  const [selectedProvinces, setSelectedProvinces] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedLocalities, setSelectedLocalities] = useState([]);
  const [selectedBarangays, setSelectedBarangays] = useState([]);

  // Get unique values for filters
  const provinces = useMemo(() => 
    [...new Set(sites.map(s => s.province))].filter(Boolean).sort().map(p => ({ value: p, label: p })),
    [sites]
  );

  const districts = useMemo(() => {
    let filtered = sites;
    if (selectedProvinces.length > 0) {
      const provinceValues = selectedProvinces.map(p => p.value);
      filtered = filtered.filter(s => provinceValues.includes(s.province));
    }
    return [...new Set(filtered.map(s => s.district))].filter(Boolean).sort().map(d => ({ value: d, label: d }));
  }, [sites, selectedProvinces]);

  const localities = useMemo(() => {
    let filtered = sites;
    if (selectedProvinces.length > 0) {
      filtered = filtered.filter(s => selectedProvinces.some(p => p.value === s.province));
    }
    if (selectedDistricts.length > 0) {
      filtered = filtered.filter(s => selectedDistricts.some(d => d.value === s.district));
    }
    return [...new Set(filtered.map(s => s.locality))].filter(Boolean).sort().map(l => ({ value: l, label: l }));
  }, [sites, selectedProvinces, selectedDistricts]);

  const barangays = useMemo(() => {
    let filtered = sites;
    if (selectedProvinces.length > 0) {
      filtered = filtered.filter(s => selectedProvinces.some(p => p.value === s.province));
    }
    if (selectedDistricts.length > 0) {
      filtered = filtered.filter(s => selectedDistricts.some(d => d.value === s.district));
    }
    if (selectedLocalities.length > 0) {
      filtered = filtered.filter(s => selectedLocalities.some(l => l.value === s.locality));
    }
    return [...new Set(filtered.map(s => s.barangay))].filter(Boolean).sort().map(b => ({ value: b, label: b }));
  }, [sites, selectedProvinces, selectedDistricts, selectedLocalities]);

  // Filter sites for map
  const filteredSites = useMemo(() => {
    let result = sites.filter(s => s.latitude && s.longitude);
    
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(s =>
        s.site_name?.toLowerCase().includes(term) ||
        s.r10_site_id?.toLowerCase().includes(term) ||
        s.locality?.toLowerCase().includes(term) ||
        s.barangay?.toLowerCase().includes(term)
      );
    }
    
    if (selectedProvinces.length > 0) {
      result = result.filter(s => selectedProvinces.some(p => p.value === s.province));
    }
    if (selectedDistricts.length > 0) {
      result = result.filter(s => selectedDistricts.some(d => d.value === s.district));
    }
    if (selectedLocalities.length > 0) {
      result = result.filter(s => selectedLocalities.some(l => l.value === s.locality));
    }
    if (selectedBarangays.length > 0) {
      result = result.filter(s => selectedBarangays.some(b => b.value === s.barangay));
    }
    
    return result;
  }, [sites, search, selectedProvinces, selectedDistricts, selectedLocalities, selectedBarangays]);

  const clearFilters = () => {
    setSearch('');
    setSelectedProvinces([]);
    setSelectedDistricts([]);
    setSelectedLocalities([]);
    setSelectedBarangays([]);
  };

  const hasFilters = search || selectedProvinces.length > 0 || selectedDistricts.length > 0 || 
                     selectedLocalities.length > 0 || selectedBarangays.length > 0;

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
                placeholder="Search site name, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="min-w-[180px]">
              <Select
                isMulti
                options={provinces}
                value={selectedProvinces}
                onChange={(val) => {
                  setSelectedProvinces(val || []);
                  setSelectedDistricts([]);
                  setSelectedLocalities([]);
                  setSelectedBarangays([]);
                }}
                placeholder="Province"
                styles={selectStyles}
                className="text-sm"
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                isMulti
                options={districts}
                value={selectedDistricts}
                onChange={(val) => {
                  setSelectedDistricts(val || []);
                  setSelectedLocalities([]);
                  setSelectedBarangays([]);
                }}
                placeholder="District"
                styles={selectStyles}
                className="text-sm"
              />
            </div>
            <div className="min-w-[180px]">
              <Select
                isMulti
                options={localities}
                value={selectedLocalities}
                onChange={(val) => {
                  setSelectedLocalities(val || []);
                  setSelectedBarangays([]);
                }}
                placeholder="Locality"
                styles={selectStyles}
                className="text-sm"
              />
            </div>
            <div className="min-w-[160px]">
              <Select
                isMulti
                options={barangays}
                value={selectedBarangays}
                onChange={(val) => setSelectedBarangays(val || [])}
                placeholder="Barangay"
                styles={selectStyles}
                className="text-sm"
              />
            </div>
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

          {filteredSites.map((site, i) => (
            <CircleMarker
              // `id` is the row's real database id — falls back to r10_site_id + index
              // since that alone isn't unique (one site can have several AP rows). A
              // duplicate key here made React reconcile markers incorrectly on filter
              // changes, leaving stale "ghost" dots from before the filter was applied.
              key={site.id ?? `${site.r10_site_id || 'row'}-${i}`}
              center={[site.latitude, site.longitude]}
              radius={MAP_DOT_RADIUS}
              pathOptions={{
                color: PROVINCE_COLORS[site.province] || '#6b7280',
                fillColor: PROVINCE_COLORS[site.province] || '#6b7280',
                fillOpacity: 0.7,
                weight: 1,
              }}
              eventHandlers={{
                mouseover: (e) => e.target.setRadius(MAP_DOT_HOVER_RADIUS),
                mouseout: (e) => e.target.setRadius(MAP_DOT_RADIUS),
              }}
            >
              {tooltipFields.length > 0 && (
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div className="min-w-[160px]">
                    {tooltipFields.map(f => (
                      <p key={f.name} className="text-xs text-gray-700 leading-snug">
                        <span className="font-semibold">{f.label}:</span> {String(site[f.name] ?? '—')}
                      </p>
                    ))}
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Stats overlay */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-[#0038A8]" />
            <div>
              <p className="text-sm font-bold">{filteredSites.length}</p>
              <p className="text-[10px] text-gray-500">Visible</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-[1000]">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Provinces</h4>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(PROVINCE_COLORS).map(([province, color]) => (
              <div key={province} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-gray-600 dark:text-gray-400">{province.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
