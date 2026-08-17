import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getFloodEvents, getFloodLocations, getCityMetadata } from '../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function RainfallIntelligence() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(85);
  const [selectedCorrelation, setSelectedCorrelation] = useState<string | null>(null);
  const [floodLocations, setFloodLocations] = useState<any[]>([]);
  const [floodEvents, setFloodEvents] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<any>(null);

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

  // Center map when a hotspot is clicked from the sidebar
  useEffect(() => {
    if (map && selectedCorrelation) {
      const loc = floodLocations.find(l => l.name === selectedCorrelation);
      if (loc && loc.geometry?.coordinates) {
        // GeoJSON gives [lng, lat], map.flyTo needs [lat, lng]
        map.flyTo([loc.geometry.coordinates[1], loc.geometry.coordinates[0]], 15, { duration: 1 });
      }
    }
  }, [selectedCorrelation, map, floodLocations]);

  const avgRainfall = cityData?.annual_avg_rainfall_mm || 1205;

  return (
    <div className="bg-background text-on-surface h-screen w-screen overflow-hidden flex flex-col font-body-sm relative selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar />

      <main className="flex-1 relative md:ml-[260px] bg-[#0a0c10] h-screen overflow-hidden">
        {/* Real Dynamic Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={[21.1458, 79.0882]}
            zoom={12}
            style={{ width: '100%', height: '100%', background: '#0a0c10' }}
            zoomControl={false}
            ref={setMap}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap CartoDB'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {floodLocations.map((loc, idx) => {
              if (!loc.geometry || loc.geometry.type !== 'Point') return null;
              const isSelected = selectedCorrelation === loc.name;
              const isHighRisk = loc.category?.toLowerCase().includes('chronic') || loc.category?.toLowerCase().includes('critical');

              // Leaflet needs [lat, lng]
              const pos: [number, number] = [loc.geometry.coordinates[1], loc.geometry.coordinates[0]];

              return (
                <CircleMarker
                  key={idx}
                  center={pos}
                  radius={isSelected ? (isHighRisk ? 12 : 10) : (isHighRisk ? 8 : 6)}
                  pathOptions={{
                    fillColor: isHighRisk ? '#ffb4ab' : '#00f2ff',
                    fillOpacity: isSelected ? 0.8 : 0.5,
                    color: isHighRisk ? '#ffb4ab' : '#00f2ff',
                    weight: isSelected ? 3 : 1
                  }}
                  eventHandlers={{
                    click: () => setSelectedCorrelation(loc.name)
                  }}
                >
                  <Popup className="bg-surface-container font-data-mono text-[11px]">
                    <strong className={isHighRisk ? 'text-error' : 'text-primary'}>{loc.name}</strong><br />
                    <span className="text-on-surface-variant">Type: {loc.category}</span>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Cinematic map overlay (vignette over real map) */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: 'inset 0 0 100px rgba(10,12,16,1)' }}></div>
      </main>

      {/* Right Side Panel */}
      <div className="hidden lg:flex absolute right-margin-page top-24 bottom-[88px] w-[340px] z-30 glass-panel rounded-xl flex-col shadow-2xl overflow-hidden">
        <div className="px-gutter py-panel-padding border-b border-outline-variant/20 bg-surface/50">
          <h2 className="font-headline-md text-headline-md text-primary glow-text flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">radar</span>
            Telemetry
          </h2>
        </div>
        <div className={`flex-1 overflow-y-auto p-gutter flex flex-col gap-margin-page transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {/* Rainfall Intensity */}
          <div className="flex flex-col gap-stack-gap">
            <div className="flex justify-between items-end mb-1">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">Rainfall Data</h3>
              <span className="flex items-center gap-1 font-label-caps text-label-caps text-primary-fixed-dim bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                <span className="w-1.5 h-1.5 bg-primary-fixed-dim rounded-full animate-pulse"></span> LIVE
              </span>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-panel-padding relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent pointer-events-none"></div>
              <div className="font-data-mono text-data-mono text-on-surface-variant flex flex-col gap-2 relative z-10">
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <span>ANNUAL_AVG</span>
                  <span className="text-primary font-bold text-[16px] glow-text">{avgRainfall} mm</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <span>FLOOD_EVENTS</span>
                  <span className="text-secondary-fixed">{floodEvents.length} documented</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>HOTSPOTS</span>
                  <span className="text-error">{floodLocations.length} locations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flood Hotspots Correlation */}
          <div className="flex flex-col gap-stack-gap">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">Flood Hotspots (Click to locate)</h3>
            <div className="flex flex-col gap-2">
              {floodLocations.length > 0 ? floodLocations.slice(0, 5).map((loc: any, idx: number) => {
                const isSelected = selectedCorrelation === loc.name;
                const isHighRisk = loc.category?.toLowerCase().includes('chronic') || loc.category?.toLowerCase().includes('critical');
                return (
                  <div key={idx} onClick={() => setSelectedCorrelation(loc.name)}
                    className={`bg-surface-container/50 border rounded-lg p-3 hover:bg-surface-container transition-colors cursor-pointer border-l-4 ${isSelected ? (isHighRisk ? 'border-error-container bg-error-container/10 border-l-error-container' : 'border-primary bg-primary/10 border-l-primary') : 'border-outline-variant/30 border-l-outline-variant/30'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface">{loc.name}</span>
                      <span className={`font-data-mono text-[10px] px-1.5 py-0.5 rounded ${isHighRisk ? 'text-error bg-error-container/20' : 'text-primary bg-primary/10'}`}>
                        {loc.category?.toUpperCase() || 'FLOOD ZONE'}
                      </span>
                    </div>
                    {loc.source_event && (
                      <p className="font-body-sm text-[12px] text-on-surface-variant leading-tight mt-1">{loc.source_event}</p>
                    )}
                  </div>
                );
              }) : (
                <div className="text-on-surface-variant text-[12px] font-data-mono">
                  {loading ? 'Loading...' : 'No flood locations available. Seed the database.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="absolute bottom-[48px] left-0 md:left-64 right-0 lg:right-[calc(340px+24px+24px)] mx-margin-page h-[72px] z-30 glass-panel rounded-xl px-gutter flex items-center gap-gutter shadow-2xl backdrop-blur-xl bg-surface-container/80">
        <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 hover:scale-105 transition-all shrink-0">
          <span className="material-symbols-outlined text-[24px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
        </button>
        <div className="flex-1 relative h-full flex items-center">
          <div className="absolute left-0 right-0 h-1 bg-surface-variant rounded-full cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTimelineIndex(((e.clientX - rect.left) / rect.width) * 100);
          }}>
            <div className="absolute left-0 h-full bg-gradient-to-r from-secondary-container to-primary-container rounded-full shadow-[0_0_8px_rgba(0,242,255,0.5)] transition-all ease-linear" style={{ width: `${timelineIndex}%` }}></div>
          </div>
          <div className="absolute left-0 right-0 h-full flex justify-between items-center px-1 pointer-events-none">
            {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(year => (
              <div key={year} className="flex flex-col items-center gap-1 mt-6">
                <div className="w-1 h-2 bg-outline-variant rounded-sm"></div>
                <span className="font-data-mono text-[10px] text-on-surface-variant">{year}</span>
              </div>
            ))}
          </div>
          <div className="absolute top-1/2 -mt-3 w-6 h-6 bg-surface border-2 border-primary-container rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(0,242,255,0.8)] cursor-grab active:cursor-grabbing transition-all ease-linear" style={{ left: `calc(${timelineIndex}% - 12px)` }}>
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="absolute -top-10 bg-surface-container border border-primary/30 text-primary font-data-mono text-[11px] px-2 py-1 rounded whitespace-nowrap">
              {2019 + Math.floor((timelineIndex / 100) * 7)} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor((timelineIndex % 15) / 1.25)] || 'Jan'}
            </div>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 border-l border-outline-variant/30 pl-gutter ml-2">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </button>
          <div className="font-data-mono text-data-mono text-on-surface bg-surface-container px-2 py-1 rounded border border-outline-variant/20">
            {isPlaying ? '1X SPD' : 'PAUSED'}
          </div>
        </div>
      </div>
    </div>
  );
}
