import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getRiskModel, getSusceptibility, getCityMetadata, getFloodLocations } from '../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

const FR_PARAMETER_LABELS: Record<string, string> = {
  altitude_m: 'Altitude',
  slope_deg: 'Slope',
  twi: 'Topographic Wetness',
  lulc: 'Land Use / Cover',
  soil_texture: 'Soil Texture',
  rainfall_mm: 'Rainfall',
  surface_runoff_by_land_use: 'Surface Runoff',
  distance_from_river_m: 'Distance from River',
  lithology: 'Lithology',
  landform: 'Landform',
};

export default function TopographyIntelligence() {
  const [riskModel, setRiskModel] = useState<any>(null);
  const [susceptibility, setSusceptibility] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any>(null);
  const [floodLocations, setFloodLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [isTopographyMinimized, setIsTopographyMinimized] = useState(false);
  const [isProfileMinimized, setIsProfileMinimized] = useState(false);
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
        const [riskRes, susRes, cityRes, locRes] = await Promise.all([
          getRiskModel(),
          getSusceptibility(),
          getCityMetadata(),
          getFloodLocations()
        ]);
        setRiskModel(riskRes.data || null);
        setSusceptibility(susRes.data || []);
        setCityData(cityRes.data || null);
        setFloodLocations(locRes.data || []);
      } catch (e) {
        console.error('Failed to load topography data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const cityArea = cityData?.municipal_area_km2 || '—';
  const builtUp = cityData?.built_up_pct || '—';
  const drainage = cityData?.drainage_sewage_infra_coverage_pct || '—';
  const rainfall = cityData?.annual_avg_rainfall_mm || '—';

  const paramTables = riskModel
    ? Object.fromEntries(
        Object.keys(FR_PARAMETER_LABELS)
          .filter((key) => Array.isArray(riskModel[key]))
          .map((key) => [key, riskModel[key]])
      )
    : {};
  const paramKeys = Object.keys(paramTables);
  const selectedRows = selectedParam ? paramTables[selectedParam] || [] : [];

  return (
    <div className="bg-[var(--bg-app)] text-[var(--text-primary)] h-full w-full overflow-hidden flex flex-col font-sans relative">
      <Sidebar />

      <main className="flex-1 md:ml-[240px] relative h-full overflow-hidden flex">
        {/* Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={[21.1458, 79.0882]} 
            zoom={12} 
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
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
              const pos: [number, number] = [loc.geometry.coordinates[1], loc.geometry.coordinates[0]];
              return (
                <CircleMarker
                  key={idx}
                  center={pos}
                  radius={18}
                  pathOptions={{
                    fillColor: 'var(--color-danger)',
                    fillOpacity: 0.2,
                    color: 'var(--color-danger)',
                    weight: 1.5,
                    dashArray: "4 4"
                  }}
                >
                  <Popup>
                    <div className="text-xs font-sans p-1">
                      <strong className="text-red-600 font-bold">Topographic Depression</strong><br/>
                      <span className="text-[10px] text-[var(--text-secondary)]">Near: {loc.name}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Left Panel: City & Risk Data */}
        <div className={`absolute left-4 top-4 w-80 z-20 glass-panel rounded-xl flex-col shadow-lg overflow-hidden transition-all ${isTopographyMinimized ? 'h-12' : 'max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar'} ${loading ? 'opacity-50' : ''}`}>
          <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface-elevated)]">
            <h2 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--color-primary)]" />
              Topography & Risk Model
            </h2>
            <button onClick={() => setIsTopographyMinimized(!isTopographyMinimized)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {isTopographyMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!isTopographyMinimized && (
            <div className="p-3 flex flex-col gap-3">
              {/* City Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--bg-app)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">MUNICIPAL AREA</span>
                  <span className="text-sm font-bold font-mono text-[var(--color-primary)]">{cityArea} km²</span>
                </div>
                <div className="bg-[var(--bg-app)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">BUILT-UP</span>
                  <span className="text-sm font-bold font-mono text-[var(--text-primary)]">{builtUp}%</span>
                </div>
                <div className="bg-[var(--bg-app)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">AVG RAINFALL</span>
                  <span className="text-sm font-bold font-mono text-[var(--color-natural-green)]">{rainfall} mm</span>
                </div>
                <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200">
                  <span className="text-[10px] font-bold block mb-1 uppercase">DRAINAGE COV.</span>
                  <span className="text-sm font-bold font-mono">{drainage}%</span>
                </div>
              </div>

              {/* Risk Model Info */}
              {riskModel && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Frequency Ratio Model</span>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-[var(--color-soft-blue)] text-[var(--color-primary)] px-2 py-0.5 rounded font-mono font-medium">
                      Accuracy: {riskModel.model_accuracy_pct}%
                    </span>
                    <span className="bg-[var(--color-soft-green)] text-[var(--color-natural-green)] px-2 py-0.5 rounded font-mono font-medium">
                      Val: {riskModel.validation_accuracy_pct}%
                    </span>
                  </div>
                </div>
              )}

              {/* Susceptibility Classes */}
              {susceptibility.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Flood Susceptibility</span>
                  <div className="flex flex-col gap-1.5">
                    {susceptibility.map((cls: any, idx: number) => {
                      const pct = parseFloat(cls.area_pct || cls.percentage || '0');
                      const className = (cls.class || '').toLowerCase();
                      const isHigh = className.includes('high');
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className={isHigh ? 'text-[var(--color-danger)] font-semibold' : 'text-[var(--text-secondary)]'}>{cls.class}</span>
                            <span className="font-bold">{cls.area_pct || cls.percentage}%</span>
                          </div>
                          <div className="w-full bg-[var(--border-subtle)] rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${isHigh ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-primary)]'}`} 
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FR Parameters list */}
              {paramKeys.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">FR Parameters</span>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {paramKeys.map((key) => (
                      <button key={key}
                        onClick={() => setSelectedParam(selectedParam === key ? null : key)}
                        className={`text-left text-xs p-2 rounded-lg transition-colors flex items-center justify-between ${
                          selectedParam === key 
                            ? 'bg-[var(--color-soft-blue)] text-[var(--color-primary)] font-semibold border border-[var(--color-primary)]/30' 
                            : 'hover:bg-[var(--bg-app)] text-[var(--text-secondary)]'
                        }`}>
                        <span>{FR_PARAMETER_LABELS[key] || key.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-mono opacity-75">{paramTables[key].length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Elevation profile / FR Table drawer */}
        <div className={`absolute bottom-4 left-4 md:left-[350px] right-4 z-20 glass-panel rounded-xl shadow-xl p-3 flex flex-col transition-all ${isProfileMinimized ? 'h-12' : 'h-44'}`}>
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[var(--color-primary)]" />
              {selectedParam ? `FR Parameter: ${FR_PARAMETER_LABELS[selectedParam] || selectedParam.replace(/_/g, ' ')}` : 'Cross-Section Elevation Profile (West to East)'}
            </h3>
            <button onClick={() => setIsProfileMinimized(!isProfileMinimized)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {isProfileMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {!isProfileMinimized && (
            <div className="flex-1 overflow-auto">
              {selectedParam && selectedRows.length > 0 ? (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {Object.keys(selectedRows[0] || {}).map((col) => (
                        <th key={col} className="text-left px-2 py-1">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row: any, ridx: number) => (
                      <tr key={ridx} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--bg-app)]">
                        {Object.values(row).map((val: any, cidx: number) => (
                          <td key={cidx} className="px-2 py-1">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="w-full h-full flex flex-col justify-center px-4">
                  <div className="w-full h-16 relative border-l border-b border-[var(--border-strong)]">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M 0 20 Q 20 10 30 40 T 60 80 T 80 50 T 100 30 L 100 100 L 0 100 Z" fill="var(--color-soft-blue)" opacity="0.6" />
                      <path d="M 0 20 Q 20 10 30 40 T 60 80 T 80 50 T 100 30" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono uppercase mt-1">
                    <span>West</span>
                    <span>Central Basin (Nagpur)</span>
                    <span>East</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
