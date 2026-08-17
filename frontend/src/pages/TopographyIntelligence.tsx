import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getRiskModel, getSusceptibility, getCityMetadata, getFloodLocations } from '../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

  // Extract FR model parameter tables (if available)
  const paramTables = riskModel
    ? Object.fromEntries(
        Object.keys(FR_PARAMETER_LABELS)
          .filter((key) => Array.isArray(riskModel[key]))
          .map((key) => [key, riskModel[key]])
      )
    : {};
  const paramKeys = Object.keys(paramTables);
  const selectedRows = selectedParam ? paramTables[selectedParam] || [] : [];
  const topFrSignals = paramKeys
    .map((key) => {
      const highest = [...paramTables[key]].sort((a: any, b: any) => (b.FR || 0) - (a.FR || 0))[0];
      return {
        key,
        label: FR_PARAMETER_LABELS[key] || key.replace(/_/g, ' '),
        value: highest?.range || highest?.class || highest?.type || '—',
        fr: Number(highest?.FR || 0),
      };
    })
    .sort((a, b) => b.fr - a.fr)
    .slice(0, 3);

  return (
    <div className="bg-background text-on-surface h-screen w-screen overflow-hidden flex flex-col font-body-sm relative selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar />

      <main className="flex-1 md:ml-[260px] bg-[#0a0c10] relative z-0 overflow-hidden flex">
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
            {/* Display flood hotspots indicating geometric risk clusters */}
            {floodLocations.map((loc, idx) => {
              if (!loc.geometry || loc.geometry.type !== 'Point') return null;
              const pos: [number, number] = [loc.geometry.coordinates[1], loc.geometry.coordinates[0]];
              return (
                <CircleMarker
                  key={idx}
                  center={pos}
                  radius={20}
                  pathOptions={{
                    fillColor: '#ffb4ab',
                    fillOpacity: 0.15,
                    color: '#ffb4ab',
                    weight: 1,
                    dashArray: "4 4"
                  }}
                >
                  <Popup className="bg-surface-container font-data-mono text-[11px]">
                    <strong className="text-error">Topographic Depression</strong><br/>
                    <span className="text-on-surface-variant">Near: {loc.name}</span>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Gradient overlay to smoothly blend with UI panels */}
        <div className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-50" 
             style={{ background: "radial-gradient(circle at 70% 30%, rgba(255, 183, 131, 0.15) 0%, transparent 40%), radial-gradient(circle at 35% 85%, rgba(23, 59, 171, 0.2) 0%, transparent 50%)" }}></div>

        {/* Left Panel: City & Risk Data */}
        <div className={`absolute left-margin-page top-margin-page w-[340px] z-30 glass-panel rounded-xl flex-col shadow-2xl overflow-hidden border border-outline-variant/30 bg-surface-container/70 backdrop-blur-md max-h-[calc(100vh-48px)] overflow-y-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <div className="px-gutter py-panel-padding border-b border-outline-variant/20 bg-surface/50">
            <h2 className="font-headline-md text-headline-md text-primary glow-text flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">public</span>
              Topography & Risk Model
            </h2>
          </div>
          <div className="p-gutter flex flex-col gap-stack-gap">
            {/* City Metrics from real data */}
            <div className="grid grid-cols-2 gap-stack-gap">
              <div className="bg-surface-variant/30 p-3 rounded border border-outline-variant/20 flex flex-col">
                <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">MUNICIPAL AREA</span>
                <span className="font-data-mono text-[18px] text-primary">{cityArea} km²</span>
              </div>
              <div className="bg-surface-variant/30 p-3 rounded border border-outline-variant/20 flex flex-col">
                <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">BUILT-UP</span>
                <span className="font-data-mono text-[18px] text-on-surface">{builtUp}%</span>
              </div>
              <div className="bg-surface-variant/30 p-3 rounded border border-outline-variant/20 flex flex-col">
                <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">AVG RAINFALL</span>
                <span className="font-data-mono text-[18px] text-primary-fixed-dim">{rainfall} mm</span>
              </div>
              <div className="bg-error-container/20 p-3 rounded border border-error/50 flex flex-col">
                <span className="font-label-caps text-[10px] text-error mb-1">DRAINAGE COV.</span>
                <span className="font-data-mono text-[18px] text-error font-bold">{drainage}%</span>
              </div>
            </div>

            {/* Risk Model Info */}
            {riskModel && (
              <div className="mt-2 flex flex-col gap-2">
                <h3 className="font-label-caps text-[11px] text-on-surface-variant">VNIT Frequency Ratio Model</h3>
                <div className="flex gap-2 text-[11px] font-data-mono">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                    Accuracy: {riskModel.model_accuracy_pct}%
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                    Validation: {riskModel.validation_accuracy_pct}%
                  </span>
                </div>
              </div>
            )}

            {/* Susceptibility Classes (real data) */}
            {susceptibility.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <h3 className="font-label-caps text-[11px] text-on-surface-variant">Flood Susceptibility Zones</h3>
                <div className="flex flex-col gap-2">
                  {susceptibility.map((cls: any, idx: number) => {
                    const pct = parseFloat(cls.area_pct || cls.percentage || '0');
                    const className = (cls.class || '').toLowerCase();
                    const isHigh = className.includes('high');
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-[11px] font-data-mono mb-1">
                          <span className={isHigh ? 'text-error' : 'text-on-surface-variant'}>{cls.class}</span>
                          <span className={isHigh ? 'text-error font-bold' : 'text-on-surface'}>{cls.area_pct || cls.percentage}%</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${isHigh ? 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]' : 'bg-primary-fixed-dim'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FR Parameters list */}
            {paramKeys.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <h3 className="font-label-caps text-[11px] text-on-surface-variant">FR Model Parameters</h3>
                <div className="flex flex-col gap-1">
                  {paramKeys.map((key) => (
                    <button key={key}
                      onClick={() => setSelectedParam(selectedParam === key ? null : key)}
                      className={`text-left text-[11px] font-data-mono p-2 rounded transition-colors ${
                        selectedParam === key ? 'bg-primary/10 text-primary border border-primary/30' : 'text-on-surface-variant hover:bg-surface-variant/30'
                      }`}>
                      <span className="flex items-center justify-between gap-2">
                        <span>{FR_PARAMETER_LABELS[key] || key.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] text-outline">{paramTables[key].length}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {topFrSignals.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <h3 className="font-label-caps text-[11px] text-on-surface-variant">Strongest FR Signals</h3>
                <div className="flex flex-col gap-2">
                  {topFrSignals.map((signal) => (
                    <div key={signal.key} className="bg-error-container/10 border border-error/25 rounded p-2">
                      <div className="flex justify-between gap-2 text-[11px] font-data-mono">
                        <span className="text-error">{signal.label}</span>
                        <span className="text-error font-bold">FR {signal.fr.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant mt-1 truncate">{signal.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Elevation profile + selected FR parameter detail */}
        <div className="absolute bottom-margin-page left-[380px] right-margin-page h-[160px] z-30 glass-panel rounded-xl shadow-2xl border border-outline-variant/30 bg-surface-container/70 backdrop-blur-md p-panel-padding flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-label-caps text-[11px] text-on-surface-variant tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">area_chart</span> 
              {selectedParam ? `FR Parameter: ${FR_PARAMETER_LABELS[selectedParam] || selectedParam.replace(/_/g, ' ')}` : 'Cross-Section Elevation Profile (West to East)'}
            </h3>
            <span className="font-data-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {selectedParam ? 'FR DATA' : 'LIVE TRANSECT'}
            </span>
          </div>
          
          {selectedParam && selectedRows.length > 0 ? (
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-[10px] font-data-mono">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    {Object.keys(selectedRows[0] || {}).map((col) => (
                      <th key={col} className="text-left text-on-surface-variant px-2 py-1">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row: any, ridx: number) => (
                    <tr key={ridx} className="border-b border-outline-variant/10 hover:bg-surface-variant/20">
                      {Object.values(row).map((val: any, cidx: number) => (
                        <td key={cidx} className="px-2 py-1 text-on-surface">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="flex-1 relative border-l border-b border-outline-variant/50 ml-6 mb-4 mt-2">
                <div className="absolute -left-6 top-0 text-[9px] font-data-mono text-on-surface-variant">320m</div>
                <div className="absolute -left-6 bottom-0 text-[9px] font-data-mono text-on-surface-variant">290m</div>
                <div className="absolute inset-0 w-full h-full flex items-end">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00dbe7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#173bab" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 20 Q 20 10 30 40 T 60 80 T 80 50 T 100 30 L 100 100 L 0 100 Z" fill="url(#elevGrad)" />
                    <path d="M 0 20 Q 20 10 30 40 T 60 80 T 80 50 T 100 30" fill="none" stroke="#00f2ff" strokeWidth="2" filter="drop-shadow(0 0 4px #00f2ff)" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="#ffb4ab" strokeDasharray="2,2" strokeWidth="0.5" />
                  </svg>
                </div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-[15%] top-[15%] flex flex-col items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim shadow-[0_0_8px_#ffb783]"></div>
                    <div className="w-[1px] h-4 bg-tertiary-fixed-dim/50"></div>
                    <span className="text-[8px] font-data-mono text-tertiary-fixed-dim bg-background/50 px-1 rounded">12k</span>
                  </div>
                  <div className="absolute left-[55%] top-[75%] flex flex-col items-center">
                    <span className="text-[8px] font-data-mono text-error bg-error-container/80 px-1 rounded border border-error/50 mb-1 z-10">28k (RISK)</span>
                    <div className="w-[1px] h-4 bg-error/50"></div>
                    <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_10px_#ffb4ab] animate-pulse"></div>
                  </div>
                  <div className="absolute left-[85%] top-[35%] flex flex-col items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim shadow-[0_0_8px_#00dbe7]"></div>
                    <div className="w-[1px] h-4 bg-primary-fixed-dim/50"></div>
                    <span className="text-[8px] font-data-mono text-primary-fixed-dim bg-background/50 px-1 rounded">21k</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between px-6 text-[9px] font-data-mono text-on-surface-variant uppercase">
                <span>West</span>
                <span>Central Basin</span>
                <span>East</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
