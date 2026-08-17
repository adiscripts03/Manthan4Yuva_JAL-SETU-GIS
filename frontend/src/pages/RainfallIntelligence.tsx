import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getFloodEvents, getFloodLocations, getCityMetadata } from '../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, Activity, ChevronDown, ChevronUp } from 'lucide-react';

export default function RainfallIntelligence() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [selectedCorrelation, setSelectedCorrelation] = useState<string | null>(null);
  const [floodLocations, setFloodLocations] = useState<any[]>([]);
  const [floodEvents, setFloodEvents] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<any>(null);
  const [isTelemetryMinimized, setIsTelemetryMinimized] = useState(false);
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
    async function loadData() {
      try {
        const [locRes, evtRes, cityRes] = await Promise.all([
          getFloodLocations(),
          getFloodEvents(),
          getCityMetadata(),
        ]);
        setFloodLocations(locRes.data || []);
        setFloodEvents(evtRes.data || []);
        setCityData(cityRes.data || null);
        if (locRes.data?.length > 0) setSelectedCorrelation(locRes.data[0].name);
      } catch (e) {
        console.error('Failed to load rainfall data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimelineIndex((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (map && selectedCorrelation) {
      const loc = floodLocations.find(l => l.name === selectedCorrelation);
      if (loc && loc.geometry?.coordinates) {
        map.flyTo([loc.geometry.coordinates[1], loc.geometry.coordinates[0]], 15, { duration: 1 });
      }
    }
  }, [selectedCorrelation, map, floodLocations]);

  const avgRainfall = cityData?.annual_avg_rainfall_mm || 1205;

  return (
    <div className="bg-[var(--bg-app)] text-[var(--text-primary)] h-full w-full overflow-hidden flex flex-col font-sans relative">
      <Sidebar />

      <main className="flex-1 relative md:ml-[240px] h-full overflow-hidden">
        {/* Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={[21.1458, 79.0882]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            ref={setMap}
          >
            <TileLayer
              key={isDarkMap ? 'dark-map' : 'light-map'}
              attribution='&copy; OpenStreetMap CartoDB'
              url={isDarkMap 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
            />
            {floodLocations.map((loc, idx) => {
              if (!loc.geometry || loc.geometry.type !== 'Point') return null;
              const isSelected = selectedCorrelation === loc.name;
              const isHighRisk = loc.category?.toLowerCase().includes('chronic') || loc.category?.toLowerCase().includes('critical');
              const pos: [number, number] = [loc.geometry.coordinates[1], loc.geometry.coordinates[0]];

              return (
                <CircleMarker
                  key={idx}
                  center={pos}
                  radius={isSelected ? (isHighRisk ? 12 : 10) : (isHighRisk ? 8 : 6)}
                  pathOptions={{
                    fillColor: isHighRisk ? 'var(--color-danger)' : 'var(--color-primary)',
                    fillOpacity: isSelected ? 0.85 : 0.6,
                    color: isHighRisk ? 'var(--color-danger)' : 'var(--color-primary)',
                    weight: isSelected ? 3 : 1
                  }}
                  eventHandlers={{
                    click: () => setSelectedCorrelation(loc.name)
                  }}
                >
                  <Popup>
                    <div className="text-xs font-sans p-1">
                      <strong className={isHighRisk ? 'text-red-500 font-bold' : 'text-[var(--color-primary)] font-bold'}>{loc.name}</strong><br />
                      <span className="text-[10px] text-[var(--text-secondary)]">Category: {loc.category}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right Telemetry Panel */}
        <div className={`hidden lg:flex absolute right-4 top-4 w-80 z-20 glass-panel rounded-xl flex-col shadow-lg overflow-hidden transition-all ${isTelemetryMinimized ? 'h-12' : 'max-h-[calc(100vh-140px)]'}`}>
          <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface-elevated)]">
            <h2 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-primary)]" />
              Meteorological Telemetry
            </h2>
            <button onClick={() => setIsTelemetryMinimized(!isTelemetryMinimized)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {isTelemetryMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!isTelemetryMinimized && (
            <div className={`p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar transition-opacity ${loading ? 'opacity-50' : ''}`}>
              {/* Rainfall Metrics */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Rainfall Averages</span>
                  <span className="text-[10px] font-medium text-[var(--color-natural-green)] bg-[var(--color-soft-green)] px-2 py-0.5 rounded-full border border-[var(--color-natural-green)]/20">
                    Live Feed
                  </span>
                </div>

                <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs text-[var(--text-secondary)]">Annual Average</span>
                    <span className="text-sm font-bold font-mono text-[var(--color-primary)]">{avgRainfall} mm</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs text-[var(--text-secondary)]">Documented Events</span>
                    <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">{floodEvents.length} events</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--text-secondary)]">Active Hotspots</span>
                    <span className="text-xs font-mono font-semibold text-[var(--color-danger)]">{floodLocations.length} zones</span>
                  </div>
                </div>
              </div>

              {/* Hotspots List */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Flood Hotspots</span>
                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {floodLocations.slice(0, 8).map((loc: any, idx: number) => {
                    const isSelected = selectedCorrelation === loc.name;
                    const isHighRisk = loc.category?.toLowerCase().includes('chronic') || loc.category?.toLowerCase().includes('critical');
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedCorrelation(loc.name)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-[var(--color-soft-blue)] border-[var(--color-primary)] text-[var(--color-primary)] font-semibold shadow-sm' 
                            : 'bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs truncate max-w-[170px]">{loc.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isHighRisk ? 'bg-red-100 text-red-700 font-bold' : 'bg-emerald-100 text-emerald-700'}`}>
                            {loc.category?.toUpperCase() || 'ZONE'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Scrubber Timeline */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-xl glass-panel rounded-xl p-3 flex items-center gap-3 z-20 shadow-xl border border-[var(--border-subtle)]">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="w-9 h-9 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white flex items-center justify-center shadow-sm shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="flex-1 relative h-4 flex items-center group cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTimelineIndex(((e.clientX - rect.left) / rect.width) * 100);
          }}>
            <div className="w-full h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-primary)] rounded-full transition-all ease-linear" style={{ width: `${timelineIndex}%` }} />
            </div>
            <div 
              className="absolute w-3.5 h-3.5 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--color-primary)] shadow-md group-hover:scale-125 transition-transform"
              style={{ left: `calc(${timelineIndex}% - 7px)` }}
            />
          </div>

          <div className="font-mono text-xs text-[var(--text-secondary)] shrink-0 w-24 text-right">
            <span>
              {2019 + Math.floor((timelineIndex / 100) * 7)} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor((timelineIndex % 15) / 1.25)] || 'Jan'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
