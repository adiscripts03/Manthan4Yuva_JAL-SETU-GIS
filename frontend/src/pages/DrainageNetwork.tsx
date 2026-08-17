import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getWaterways, getWaterwayStats, getNullahs, getWaterwayById } from '../services/api';
import { MapContainer, TileLayer, Polyline, Tooltip, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, Layers, Plus, Minus, Compass, Search, Filter, MapPin } from 'lucide-react';

const aiIcon = new L.DivIcon({
  className: 'custom-ai-icon',
  html: `<div class="w-4 h-4 bg-red-500 rounded-full animate-ping absolute opacity-75"></div><div class="w-4 h-4 bg-red-600 border-2 border-white rounded-full relative shadow-md"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Pin-point marker icon for AI location queries
const pinIcon = new L.DivIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#3B82F6,#1D4ED8);border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;border:3px solid white;">
        <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
      </div>
      <div style="width:3px;height:6px;background:linear-gradient(to bottom,#1D4ED8,transparent);margin-top:-2px;"></div>
      <div style="width:24px;height:24px;background:rgba(59,130,246,0.25);border-radius:50%;position:absolute;top:32px;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    </div>
  `,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -48],
});

const WATERWAY_COLORS: Record<string, string> = {
  river: '#0B3B60',
  stream: '#1677FF',
  drain: '#249B68',
  canal: '#D97706',
  unknown: '#64748B'
};

const WATERWAY_WEIGHTS: Record<string, number> = {
  river: 5,
  stream: 3,
  drain: 3,
  canal: 4,
  unknown: 2
};

/**
 * MapController — handles imperative map commands (flyTo, markers) inside MapContainer context.
 * Listens for 'ai_map_location' events and flies to the specified coordinates.
 */
function MapController({ 
  onLocationReceived 
}: { 
  onLocationReceived: (loc: any) => void 
}) {
  const map = useMap();

  useEffect(() => {
    const handleAiLocation = (e: any) => {
      const loc = e.detail;
      if (loc && loc.lat && loc.lng) {
        console.log(`[MapController] Flying to ${loc.location_name} at [${loc.lat}, ${loc.lng}] zoom=${loc.zoom}`);
        
        // Fly to location with smooth animation
        map.flyTo([loc.lat, loc.lng], loc.zoom || 16, {
          duration: 2,
          easeLinearity: 0.25,
        });

        // Pass location data up for marker rendering
        onLocationReceived(loc);
      }
    };

    window.addEventListener('ai_map_location', handleAiLocation);
    return () => window.removeEventListener('ai_map_location', handleAiLocation);
  }, [map, onLocationReceived]);

  return null;
}

/**
 * MapRefProvider — exposes the map instance for zoom/center buttons outside MapContainer.
 */
function MapRefProvider({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

interface DrainageNetworkProps {
  searchFilter?: string;
}

export default function DrainageNetwork({ searchFilter = '' }: DrainageNetworkProps) {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const [waterways, setWaterways] = useState<any[]>([]);
  const [waterwayStats, setWaterwayStats] = useState<any>(null);
  const [nullahs, setNullahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [aiData, setAiData] = useState<any>(null);
  const [aiPinLocation, setAiPinLocation] = useState<any>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [isDarkMap, setIsDarkMap] = useState<boolean>(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      setIsDarkMap(e.detail === 'dark');
    };
    const observer = new MutationObserver(() => {
      setIsDarkMap(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('theme_change', handleThemeChange);
    return () => {
      observer.disconnect();
      window.removeEventListener('theme_change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleAiSync = (e: any) => {
      setAiData(e.detail);
    };
    window.addEventListener('ai_map_sync', handleAiSync);
    return () => window.removeEventListener('ai_map_sync', handleAiSync);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [wRes, sRes, nRes] = await Promise.all([
          getWaterways(filterType ? { type: filterType } : undefined),
          getWaterwayStats(),
          getNullahs(),
        ]);
        setWaterways(wRes.data || []);
        setWaterwayStats(sRes.data || null);
        setNullahs(nRes.data || []);
        if (wRes.data?.length > 0 && !selectedAsset) {
          setSelectedAsset(wRes.data[0]);
        }
      } catch (e) {
        console.error('Failed to load drainage data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filterType]);



  const handleSelectWaterway = async (ww: any) => {
    if (ww.osm_id) {
      try {
        const detail = await getWaterwayById(ww.osm_id);
        setSelectedAsset(detail.data);
      } catch {
        setSelectedAsset(ww);
      }
    } else {
      setSelectedAsset(ww);
    }
  };

  const handleLocationReceived = (loc: any) => {
    setAiPinLocation(loc);
  };

  const currentSearchTerm = (localSearch || searchFilter || '').toLowerCase();
  const filteredWaterways = waterways.filter((ww: any) => {
    if (!currentSearchTerm) return true;
    const nameStr = (ww.name || '').toLowerCase();
    const idStr = String(ww.osm_id || '').toLowerCase();
    return nameStr.includes(currentSearchTerm) || idStr.includes(currentSearchTerm);
  });

  return (
    <div className="h-full w-full relative flex flex-col font-sans overflow-hidden bg-[var(--bg-app)]">
      <Sidebar />

      <main className="flex-1 relative md:ml-[240px] h-full overflow-hidden">
        {/* Real Leaflet Map Container */}
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={[21.1458, 79.0882]} 
            zoom={12} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            {/* Map controller for AI fly-to commands */}
            <MapController onLocationReceived={handleLocationReceived} />
            <MapRefProvider onMapReady={setMapRef} />

            <TileLayer
              key={isDarkMap ? 'dark-map' : 'light-map'}
              attribution='&copy; OpenStreetMap CartoDB'
              url={isDarkMap 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
            />
            
            {waterways.map((ww: any, idx: number) => {
              if (!ww.geometry || ww.geometry.type !== 'LineString') return null;
              const positions = ww.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
              const isSelected = selectedAsset && selectedAsset.osm_id === ww.osm_id;
              
              let isAITarget = false;
              if (aiData && aiData.canals && ww.name) {
                 isAITarget = aiData.canals.some((aiCanal: string) => 
                     ww.name.toLowerCase().includes(aiCanal.toLowerCase()) || 
                     aiCanal.toLowerCase().includes(ww.name.toLowerCase())
                 );
              }
              
              const finalColor = isAITarget ? '#EF4444' : isSelected ? 'var(--color-primary)' : (WATERWAY_COLORS[ww.waterway] || WATERWAY_COLORS.unknown);
              const finalWeight = isAITarget ? 8 : isSelected ? 6 : (WATERWAY_WEIGHTS[ww.waterway] || 2);
              const finalOpacity = isAITarget ? 1 : isSelected ? 1 : (aiData?.canals?.length ? 0.25 : 0.75);

              return (
                <Polyline 
                  key={`ww-${ww.osm_id}-${idx}`}
                  positions={positions}
                  color={finalColor}
                  weight={finalWeight}
                  opacity={finalOpacity}
                  eventHandlers={{
                    click: () => handleSelectWaterway(ww)
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans">
                      <strong className="font-semibold text-[var(--text-primary)]">{ww.name || 'Unnamed Waterway'}</strong><br/>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">ID: {ww.osm_id}</span>
                      {isAITarget && <div className="text-red-500 font-bold text-[10px] mt-0.5">⚡ AI Target</div>}
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

            {aiData?.synthetic_markers?.map((marker: any) => (
               <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={aiIcon}>
                 <Tooltip permanent direction="top">
                   <div className="p-1 text-xs">
                     <span className="text-red-500 font-bold text-xs block">AI Inference Marker</span>
                     <span className="text-slate-600 text-[10px]">{marker.desc}</span>
                   </div>
                 </Tooltip>
               </Marker>
            ))}

            {/* AI Pin-point Location Marker */}
            {aiPinLocation && (
              <>
                {/* Pulsing radius circle for visual emphasis */}
                <Circle
                  center={[aiPinLocation.lat, aiPinLocation.lng]}
                  radius={300}
                  pathOptions={{
                    color: '#3B82F6',
                    fillColor: '#3B82F6',
                    fillOpacity: 0.08,
                    weight: 2,
                    opacity: 0.3,
                    dashArray: '8 4',
                  }}
                />
                <Circle
                  center={[aiPinLocation.lat, aiPinLocation.lng]}
                  radius={150}
                  pathOptions={{
                    color: '#3B82F6',
                    fillColor: '#3B82F6',
                    fillOpacity: 0.12,
                    weight: 2,
                    opacity: 0.5,
                  }}
                />
                <Marker 
                  position={[aiPinLocation.lat, aiPinLocation.lng]} 
                  icon={pinIcon}
                >
                  <Popup 
                    maxWidth={320}
                    className="ai-location-popup"
                  >
                    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minWidth: '280px' }}>
                      {/* Header */}
                      <div style={{ 
                        background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                        color: 'white',
                        padding: '12px 14px',
                        borderRadius: '8px 8px 0 0',
                        margin: '-14px -14px 12px -14px',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px' }}>
                          📍 {aiPinLocation.location_name}
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>
                          {aiPinLocation.zone} Nagpur • {aiPinLocation.lat.toFixed(4)}°N, {aiPinLocation.lng.toFixed(4)}°E
                        </div>
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', marginBottom: '10px', padding: '0 2px' }}>
                        {aiPinLocation.description}
                      </div>

                      {/* Data Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '0 2px' }}>
                        {aiPinLocation.area_data && Object.entries({
                          '🏔️ Elevation': aiPinLocation.area_data.elevation_range_m ? `${aiPinLocation.area_data.elevation_range_m}m` : 'N/A',
                          '🌊 Flood Risk': aiPinLocation.area_data.flood_susceptibility || 'N/A',
                          '💧 Water Body': aiPinLocation.area_data.nearest_water_body || 'N/A',
                          '🪨 Soil': aiPinLocation.area_data.soil_type ? (aiPinLocation.area_data.soil_type.length > 20 ? aiPinLocation.area_data.soil_type.slice(0, 20) + '…' : aiPinLocation.area_data.soil_type) : 'N/A',
                          '⛰️ Lithology': aiPinLocation.area_data.lithology || 'N/A',
                          '🏗️ Land Use': aiPinLocation.area_data.land_use ? (aiPinLocation.area_data.land_use.length > 20 ? aiPinLocation.area_data.land_use.slice(0, 20) + '…' : aiPinLocation.area_data.land_use) : 'N/A',
                          '🌧️ Rainfall': `${aiPinLocation.area_data.annual_rainfall_mm || 1205}mm/yr`,
                          '🚰 Drainage': `${aiPinLocation.area_data.drainage_coverage_pct || 35}%`,
                        }).map(([label, value]) => (
                          <div key={label} style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '6px 8px',
                          }}>
                            <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#1E293B', fontWeight: '600', marginTop: '2px' }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div style={{ 
                        marginTop: '10px', 
                        paddingTop: '8px', 
                        borderTop: '1px solid #E2E8F0',
                        fontSize: '9px', 
                        color: '#94A3B8',
                        textAlign: 'center',
                        padding: '8px 2px 0 2px',
                      }}>
                        Data: VNIT Frequency Ratio Model (Gaurkhede & Adane 2023) • NMC Records • OSM
                      </div>
                    </div>
                  </Popup>
                  <Tooltip permanent direction="top" offset={[0, -50]}>
                    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2px 4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: '#1D4ED8' }}>
                        📍 {aiPinLocation.location_name}
                      </span>
                      <span style={{ display: 'block', fontSize: '9px', color: '#6B7280', marginTop: '1px' }}>
                        {aiPinLocation.zone} • Flood Risk: {aiPinLocation.area_data?.flood_susceptibility || 'N/A'}
                      </span>
                    </div>
                  </Tooltip>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        {/* Map Floating UI Overlays */}
        <div className="absolute inset-0 p-4 pointer-events-none flex justify-between items-start z-10">
          
          {/* Top Left: Compact Expandable Network Legend */}
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="glass-panel rounded-xl p-3 w-64 shadow-md transition-all">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsLegendExpanded(!isLegendExpanded)}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">Network Legend</span>
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-app)] px-2 py-0.5 rounded-full">
                  {waterwayStats?.total || waterways.length} total
                </span>
              </div>
              
              {isLegendExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1.5 animate-in fade-in duration-200">
                  {waterwayStats && Object.entries(waterwayStats.by_type || {}).map(([type, count]: [string, any]) => (
                    <div 
                      key={type}
                      onClick={() => setFilterType(filterType === type ? '' : type)}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                        filterType === type ? 'bg-[var(--color-soft-blue)] text-[var(--color-primary)] font-semibold' : 'hover:bg-[var(--bg-app)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: WATERWAY_COLORS[type] || WATERWAY_COLORS.unknown }}></div>
                        <span className="capitalize">{type}</span>
                      </div>
                      <span className="font-mono text-[10px]">{count}</span>
                    </div>
                  ))}

                  {nullahs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        Named Nullahs ({nullahs.length})
                      </span>
                      <div className="max-h-28 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {nullahs.map((n: any, idx: number) => (
                          <span key={idx} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--color-primary)] cursor-pointer truncate">
                            {n.name || n.nullah_name || `Nullah #${idx + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Location Info Card — shown when a location is pinned */}
            {aiPinLocation && (
              <div className="glass-panel rounded-xl p-3 w-64 shadow-lg border-l-4 border-l-blue-500 animate-in slide-in-from-left-4 duration-300">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">AI Pinned Location</span>
                  </div>
                  <button 
                    onClick={() => setAiPinLocation(null)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {aiPinLocation.location_name}
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                  {aiPinLocation.zone} Nagpur
                </span>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <div className="bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">Flood Risk</span>
                    <span className={`text-[10px] font-bold ${
                      aiPinLocation.area_data?.flood_susceptibility?.includes('Very High') ? 'text-red-500' :
                      aiPinLocation.area_data?.flood_susceptibility?.includes('High') ? 'text-orange-500' :
                      aiPinLocation.area_data?.flood_susceptibility?.includes('Moderate') ? 'text-yellow-600' :
                      'text-green-500'
                    }`}>
                      {aiPinLocation.area_data?.flood_susceptibility || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">Elevation</span>
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">
                      {aiPinLocation.area_data?.elevation_range_m || 'N/A'}m
                    </span>
                  </div>
                  <div className="bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">Drainage</span>
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">
                      {aiPinLocation.area_data?.drainage_coverage_pct || 35}%
                    </span>
                  </div>
                  <div className="bg-[var(--bg-app)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">Rainfall</span>
                    <span className="text-[10px] font-semibold text-[var(--text-primary)]">
                      {aiPinLocation.area_data?.annual_rainfall_mm || 1205}mm
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (mapRef) {
                      mapRef.flyTo([aiPinLocation.lat, aiPinLocation.lng], aiPinLocation.zoom || 16, { duration: 1.5 });
                    }
                  }}
                  className="mt-2 w-full text-[10px] font-semibold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition-colors text-center"
                >
                  Re-center on Location →
                </button>
              </div>
            )}
          </div>

          {/* Top Right: Waterways List & Details Panel */}
          <div className="pointer-events-auto flex flex-col gap-3 w-80 max-h-[calc(100vh-140px)]">
            {/* Waterway Search & Filter List Card */}
            <div className="glass-panel rounded-xl p-3 shadow-md flex flex-col gap-2">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsListExpanded(!isListExpanded)}>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 className="font-bold text-xs text-[var(--text-primary)]">Waterways</h3>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {filteredWaterways.length} listed
                </span>
              </div>

              {/* Local Search Input */}
              <div className="relative mt-1">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Filter by name or ID..."
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] pl-7 pr-2 py-1 rounded-md outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-muted)]"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar pt-1">
                {['', 'river', 'stream', 'drain', 'canal'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterType(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                      filterType === cat 
                        ? 'bg-[var(--color-primary)] text-white' 
                        : 'bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat === '' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {/* Waterways List */}
              {isListExpanded && (
                <div className={`max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 pt-1 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                  {filteredWaterways.slice(0, 35).map((ww: any, idx: number) => {
                    const isSelected = selectedAsset?.osm_id === ww.osm_id;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectWaterway(ww)}
                        className={`p-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected 
                            ? 'bg-[var(--color-soft-blue)] text-[var(--color-primary)] font-semibold border border-[var(--color-primary)]/30' 
                            : 'hover:bg-[var(--bg-app)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="truncate max-w-[170px]">{ww.name || ww.osm_id || `Segment ${idx + 1}`}</span>
                        <span className="text-[10px] font-mono capitalize opacity-75">{ww.waterway}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Waterway Feature Card */}
            {selectedAsset && (
              <div className="glass-panel rounded-xl p-4 shadow-lg flex flex-col gap-3 border-l-4 border-l-[var(--color-primary)] animate-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block">
                      Selected Feature
                    </span>
                    <h2 className="text-sm font-bold text-[var(--text-primary)] leading-tight mt-0.5">
                      {selectedAsset.name || selectedAsset.osm_id}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedAsset(null)} 
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Type</span>
                    <span className="font-semibold text-[var(--text-primary)] capitalize">{selectedAsset.waterway || 'N/A'}</span>
                  </div>
                  <div className="bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">OSM ID</span>
                    <span className="font-mono text-[10px] text-[var(--color-primary)]">{selectedAsset.osm_id}</span>
                  </div>
                  {selectedAsset.width && (
                    <div className="bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Width</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedAsset.width}</span>
                    </div>
                  )}
                  {selectedAsset.intermittent && (
                    <div className="bg-[var(--bg-app)] p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase block mb-0.5">Intermittent</span>
                      <span className="font-medium text-[var(--text-primary)]">{selectedAsset.intermittent}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Control Buttons Stack (Zoom In, Zoom Out, Center) */}
        <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <button 
            onClick={() => mapRef?.zoomIn()} 
            className="btn-control shadow-md" 
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => mapRef?.zoomOut()} 
            className="btn-control shadow-md" 
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => mapRef?.flyTo([21.1458, 79.0882], 12)} 
            className="btn-control shadow-md" 
            title="Center Map on Nagpur"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>


      </main>
    </div>
  );
}
