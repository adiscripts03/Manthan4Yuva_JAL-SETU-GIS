import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getWaterways, getWaterwayStats, getNullahs, getWaterwayById } from '../services/api';
import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const WATERWAY_COLORS: Record<string, string> = {
  river: '#173bab', // Dark blue
  stream: '#00dbe7', // Cyan
  drain: '#00f2ff', // Bright cyan
  canal: '#ffb783', // Orange/peach
  unknown: '#49454f'
};

const WATERWAY_WEIGHTS: Record<string, number> = {
  river: 6,
  stream: 3,
  drain: 3,
  canal: 4,
  unknown: 2
};

export default function DrainageNetwork() {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(45);
  const [waterways, setWaterways] = useState<any[]>([]);
  const [waterwayStats, setWaterwayStats] = useState<any>(null);
  const [nullahs, setNullahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [isLegendMinimized, setIsLegendMinimized] = useState(false);
  const [isListMinimized, setIsListMinimized] = useState(false);

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

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  return (
    <div className="bg-background text-on-surface h-screen w-screen overflow-hidden flex flex-col font-body-sm relative selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar />

      <main className="flex-1 relative md:ml-[260px] bg-background overflow-hidden" style={{ height: "100vh" }}>
        
        {/* Real Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={[21.1458, 79.0882]} 
            zoom={12} 
            style={{ width: '100%', height: '100%', background: '#0a0c10' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap CartoDB'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Render actual geoJSON coordinates for waterways */}
            {waterways.map((ww: any, idx: number) => {
              if (!ww.geometry || ww.geometry.type !== 'LineString') return null;
              // GeoJSON provides [lng, lat], Leaflet Polyline expects [lat, lng]
              const positions = ww.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
              const isSelected = selectedAsset && selectedAsset.osm_id === ww.osm_id;
              
              return (
                <Polyline 
                  key={`ww-${ww.osm_id}-${idx}`}
                  positions={positions}
                  color={isSelected ? '#00f2ff' : (WATERWAY_COLORS[ww.waterway] || WATERWAY_COLORS.unknown)}
                  weight={isSelected ? 6 : (WATERWAY_WEIGHTS[ww.waterway] || 2)}
                  opacity={isSelected ? 1 : 0.7}
                  eventHandlers={{
                    click: () => handleSelectWaterway(ww)
                  }}
                  className={isSelected ? "drain-line" : ""}
                >
                  <Tooltip sticky>
                    <span className="font-bold">{ww.name || 'Unnamed segment'}</span><br/>
                    <span className="text-xs text-on-surface-variant font-data-mono">ID: {ww.osm_id}</span>
                  </Tooltip>
                </Polyline>
              );
            })}
          </MapContainer>
        </div>

        <div className="absolute inset-0 p-margin-page pointer-events-none flex justify-between items-start z-10">
          {/* Left: Legend Panel with real stats */}
          <div className={`glass-panel rounded-lg p-panel-padding w-72 pointer-events-auto flex flex-col gap-stack-gap transition-all ${isLegendMinimized ? 'h-[52px] overflow-hidden' : 'max-h-[calc(100vh-100px)] overflow-y-auto'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider mb-0">Network Legend</h3>
              <button onClick={() => setIsLegendMinimized(!isLegendMinimized)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">{isLegendMinimized ? 'expand_more' : 'expand_less'}</span>
              </button>
            </div>
            
            {!isLegendMinimized && (
              <>
                {waterwayStats && (
                  <div className="mb-2">
                    <div className="font-data-mono text-[11px] text-primary mb-2">Total: {waterwayStats.total} waterways</div>
                    {Object.entries(waterwayStats.by_type || {}).map(([type, count]: [string, any]) => (
                      <div key={type}
                        className={`flex items-center justify-between cursor-pointer hover:bg-surface-variant/30 p-1 rounded transition-colors ${filterType === type ? 'bg-primary/10' : ''}`}
                        onClick={() => setFilterType(filterType === type ? '' : type)}
                      >
                        <div className="flex items-center gap-unit">
                          <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: WATERWAY_COLORS[type] || WATERWAY_COLORS.unknown }}></div>
                          <span className="font-data-mono text-data-mono text-on-surface capitalize">{type}</span>
                        </div>
                        <span className="font-data-mono text-data-mono text-on-surface-variant text-[10px]">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Named Nullahs */}
                {nullahs.length > 0 && (
                  <div className="border-t border-outline-variant/20 pt-2">
                    <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-2">NAMED NULLAHS ({nullahs.length})</h4>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {nullahs.map((n: any, idx: number) => (
                        <div key={idx} className="text-[11px] font-data-mono text-on-surface-variant hover:text-primary cursor-pointer transition-colors max-w-full truncate">
                          {n.name || n.nullah_name || `Nullah #${idx + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Waterway List + Details */}
          <div className="flex flex-col gap-2 w-80 pointer-events-auto max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
            {/* Waterway list */}
            <div className={`glass-panel rounded-lg p-panel-padding flex flex-col gap-2 transition-all ${isListMinimized ? 'h-[52px] overflow-hidden' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-0">
                  WATERWAYS {filterType ? `(${filterType})` : ''} — {waterways.length}
                </h3>
                <button onClick={() => setIsListMinimized(!isListMinimized)} className="text-on-surface-variant hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{isListMinimized ? 'expand_more' : 'expand_less'}</span>
                </button>
              </div>
              {!isListMinimized && (
                <div className={`flex flex-col gap-1 max-h-52 overflow-y-auto custom-scrollbar transition-opacity ${loading ? 'opacity-50' : ''}`}>
                  {waterways.slice(0, 30).map((ww: any, idx: number) => (
                    <div key={idx}
                      onClick={() => handleSelectWaterway(ww)}
                      className={`text-[11px] font-data-mono p-2 rounded cursor-pointer transition-colors ${selectedAsset?.osm_id === ww.osm_id ? 'bg-primary/10 text-primary border border-primary/30' : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'}`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="truncate max-w-[150px]">{ww.name || ww.osm_id || `Segment ${idx + 1}`}</span>
                        <span className="capitalize text-[9px] text-outline shrink-0">{ww.waterway}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected waterway details */}
            {selectedAsset && (
              <div className="glass-panel rounded-lg flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
                <div className="p-panel-padding border-b border-outline-variant/30 bg-surface-container-low/50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-unit mb-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="font-data-mono text-data-mono text-primary tracking-wider">SELECTED WATERWAY</span>
                    </div>
                    <h2 className="font-headline-md text-[18px] font-bold text-primary glow-text break-words line-clamp-2">{selectedAsset.name || selectedAsset.osm_id}</h2>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="text-on-surface-variant hover:text-primary transition-colors shrink-0 ml-2">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                <div className="p-panel-padding grid grid-cols-2 gap-stack-gap">
                  <div className="bg-surface-variant/30 p-unit rounded border border-outline-variant/20">
                    <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Type</p>
                    <p className="font-data-mono text-data-mono text-on-surface capitalize">{selectedAsset.waterway}</p>
                  </div>
                  <div className="bg-surface-variant/30 p-unit rounded border border-outline-variant/20">
                    <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">OSM ID</p>
                    <p className="font-data-mono text-data-mono text-primary text-[10px] break-all">{selectedAsset.osm_id}</p>
                  </div>
                  {selectedAsset.width && (
                    <div className="bg-surface-variant/30 p-unit rounded border border-outline-variant/20">
                      <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Width</p>
                      <p className="font-data-mono text-data-mono text-on-surface">{selectedAsset.width}</p>
                    </div>
                  )}
                  {selectedAsset.intermittent && (
                    <div className="bg-surface-variant/30 p-unit rounded border border-outline-variant/20">
                      <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Intermittent</p>
                      <p className="font-data-mono text-data-mono text-on-surface">{selectedAsset.intermittent}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom scrubber */}
        <div className="absolute bottom-margin-page left-1/2 -translate-x-1/2 w-[60%] max-w-2xl glass-panel rounded-full px-panel-padding py-unit flex items-center gap-gutter pointer-events-auto z-10 shadow-2xl backdrop-blur-xl bg-surface-container/80">
          <button onClick={() => setIsPlaying(!isPlaying)} className="text-primary hover:bg-primary/20 p-2 rounded-full transition-colors flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? 'pause_circle' : 'play_circle'}
            </span>
          </button>
          <div className="flex-1 relative h-6 flex items-center group cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const val = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(Math.max(0, Math.min(100, val)));
          }}>
            <div className="absolute w-full h-[2px] bg-outline-variant/50 rounded-full"></div>
            <div className="absolute h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(0,242,255,0.8)]" style={{ width: `${progress}%` }}></div>
            <div className="absolute w-3 h-3 rounded-full bg-primary -ml-1.5 shadow-[0_0_10px_rgba(0,242,255,1)] group-hover:scale-125 transition-transform" style={{ left: `${progress}%` }}></div>
          </div>
          <span className="font-data-mono text-data-mono text-on-surface flex-shrink-0 w-32 text-right">
            Simulate: 24h
            <span className="block text-[10px] text-primary">{Math.floor((progress / 100) * 24)}h : {Math.floor((progress % (100/24))/(100/24)*60).toString().padStart(2, '0')}m</span>
          </span>
        </div>
      </main>
    </div>
  );
}
