import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAnalyticsSummary, getDataSources, getFloodEvents, getFloodLocations } from '../services/api';

export default function AnalyticalReports() {
  const [summary, setSummary] = useState<any>(null);
  const [floodEvents, setFloodEvents] = useState<any[]>([]);
  const [floodLocations, setFloodLocations] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, eventsRes, locationsRes, sourcesRes] = await Promise.all([
        getAnalyticsSummary(),
        getFloodEvents(),
        getFloodLocations(),
        getDataSources(),
      ]);
      setSummary(summaryRes.data);
      setFloodEvents(eventsRes.data || []);
      setFloodLocations(locationsRes.data || []);
      setDataSources(sourcesRes.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    setGenerating(true);
    await loadData();
    setGenerating(false);
  };

  const totalEvents = summary?.flood_events?.total || floodEvents.length;
  const totalLocations = summary?.flood_locations?.total || floodLocations.length;
  const cityName = summary?.city?.name || 'Nagpur';
  const drainageCoverage = summary?.city?.drainage_coverage_pct || '—';
  const rainfall = summary?.city?.annual_avg_rainfall_mm || '—';
  const waterwayCount = summary?.waterways?.total || 0;
  const ingestedSources = dataSources.filter((source: any) => source.status === 'ingested');
  const pendingSources = dataSources.filter((source: any) => source.status !== 'ingested');
  const susceptibilityClasses = summary?.susceptibility?.classes || [];
  const highRiskPct = susceptibilityClasses
    .filter((cls: any) => String(cls.class || '').toLowerCase().includes('high'))
    .reduce((sum: number, cls: any) => sum + Number(cls.area_pct || 0), 0);
  const priorityHotspots = floodLocations
    .filter((loc: any) => {
      const category = String(loc.category || '').toLowerCase();
      return category.includes('chronic') || category.includes('critical') || category.includes('flood');
    })
    .slice(0, 5);
  const actionPlan = [
    {
      title: 'Pre-monsoon drain audit',
      metric: `${waterwayCount} mapped segments`,
      detail: 'Verify desilting evidence and blockages along the mapped drainage network before the next heavy rainfall window.',
    },
    {
      title: 'High-susceptibility response grid',
      metric: highRiskPct ? `${highRiskPct.toFixed(2)}% city area` : 'Pending model area',
      detail: 'Prioritize pumps, traffic diversions, and field crews near very-high and high susceptibility zones.',
    },
    {
      title: 'Hotspot evidence loop',
      metric: `${priorityHotspots.length || totalLocations} priority sites`,
      detail: 'Attach citizen reports, photos, work orders, and closure proofs to the same location record.',
    },
  ];

  return (
    <div className="bg-background text-on-surface font-body-sm antialiased h-screen w-screen overflow-hidden flex flex-col relative">
      <Sidebar />

      <main className="flex-1 md:ml-[260px] flex bg-[#0A0C10] relative z-10 overflow-hidden h-screen">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(0, 219, 231, 0.2) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
        
        {/* Left Controls Panel */}
        <div className="w-full md:w-[400px] border-r border-outline-variant/20 bg-surface/50 backdrop-blur-md p-6 flex flex-col gap-6 overflow-y-auto z-20">
          <header>
            <h1 className="font-headline-md text-headline-md text-primary mb-1">Report Generator</h1>
            <p className="text-on-surface-variant font-body-sm text-body-sm">Configure parameters for AI-driven hydraulic analysis.</p>
          </header>
          <form className="flex flex-col gap-5">
            {/* Ward Selection */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">location_city</span> Target Ward
              </label>
              <select className="bg-surface-container-high border-b border-primary/50 text-on-surface font-body-sm p-2 outline-none focus:border-primary focus:bg-surface-bright transition-colors rounded-t">
                <option>Dharampeth (Ward 14)</option>
                <option>Laxmi Nagar (Ward 12)</option>
                <option>Mahal (Ward 8)</option>
                <option>Sitabuldi (Ward 15)</option>
              </select>
            </div>
            {/* Date Range */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">calendar_month</span> Temporal Scope
              </label>
              <div className="flex gap-2">
                <input className="w-1/2 bg-surface-container-high border-b border-primary/50 text-on-surface font-body-sm p-2 outline-none focus:border-primary rounded-t" type="date" defaultValue="2023-06-01"/>
                <input className="w-1/2 bg-surface-container-high border-b border-primary/50 text-on-surface font-body-sm p-2 outline-none focus:border-primary rounded-t" type="date" defaultValue="2023-09-30"/>
              </div>
            </div>
            {/* GIS Layers */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[14px]">layers</span> Analytical Overlays
              </label>
              <div className="glass-panel rounded p-3 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-primary flex items-center justify-center rounded-sm bg-primary/20">
                    <span className="material-symbols-outlined text-[12px] text-primary">check</span>
                  </div>
                  <span className="font-body-sm text-on-surface group-hover:text-primary transition-colors">Historical Waterlogging (5yr)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-primary flex items-center justify-center rounded-sm bg-primary/20">
                    <span className="material-symbols-outlined text-[12px] text-primary">check</span>
                  </div>
                  <span className="font-body-sm text-on-surface group-hover:text-primary transition-colors">Drainage Network Capacity</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-outline-variant flex items-center justify-center rounded-sm hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-[12px] text-transparent">check</span>
                  </div>
                  <span className="font-body-sm text-on-surface-variant group-hover:text-primary transition-colors">Topographic Depression Zones</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 border border-primary flex items-center justify-center rounded-sm bg-primary/20">
                    <span className="material-symbols-outlined text-[12px] text-primary">check</span>
                  </div>
                  <span className="font-body-sm text-on-surface group-hover:text-primary transition-colors">Precipitation Anomalies</span>
                </label>
              </div>
            </div>
            {/* Run Button */}
            <button
              className="mt-4 w-full bg-primary/10 border border-primary text-primary font-label-caps text-label-caps py-3 rounded hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(0,219,231,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
              onClick={handleGenerate}
              disabled={generating || loading}
            >
              {generating ? (
                <><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span> ANALYZING...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">memory</span> GENERATE ANALYSIS</>
              )}
            </button>
          </form>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-[12px] font-data-mono p-3 rounded">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">error</span>
              {error}
            </div>
          )}
        </div>
        
        {/* Right Preview Panel */}
        <div className="flex-1 p-8 bg-surface-container-lowest overflow-y-auto flex justify-center items-start z-20">
          <div className={`pdf-preview w-full max-w-[850px] min-h-[1100px] p-10 flex flex-col relative transition-opacity duration-300 ${loading ? 'opacity-50' : ''}`}>
            {/* Report Header */}
            <div className="flex justify-between items-start border-b border-outline-variant/30 pb-6 mb-8">
              <div>
                <div className="font-display-lg text-[28px] font-bold text-primary tracking-tight leading-none mb-2">JAL SETU GIS</div>
                <div className="font-data-mono text-data-mono text-on-surface-variant">HYDRAULIC INTELLIGENCE SYSTEM</div>
              </div>
              <div className="text-right">
                <div className="font-label-caps text-label-caps text-primary-fixed-dim bg-primary/10 px-2 py-1 rounded inline-block mb-1 border border-primary/20">DATA-DRIVEN REPORT</div>
                <div className="font-data-mono text-[11px] text-on-surface-variant block">CITY: {cityName}</div>
                <div className="font-data-mono text-[11px] text-on-surface-variant block">DATE: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
              </div>
            </div>
            {/* Document Title */}
            <h1 className="font-headline-lg text-[28px] font-semibold text-on-surface mb-2">Waterlogging Analysis Report</h1>
            <p className="font-data-mono text-data-mono text-primary mb-8 border-l-2 border-primary pl-3 py-1 bg-primary/5">{cityName} • Rainfall {rainfall} mm/yr • Drainage Coverage {drainageCoverage}%</p>
            {/* Grid Layout for Content */}
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Data & Insights */}
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                <section>
                  <h3 className="font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant/20 pb-1 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">timeline</span> EXECUTIVE SUMMARY
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface/90 leading-relaxed">
                    Analysis of {totalEvents} documented flood events across {totalLocations} verified flood-prone locations.
                    The city's drainage infrastructure covers {drainageCoverage}% of the municipal area with {waterwayCount} mapped waterway segments (rivers, drains, canals, streams).
                    {summary?.city?.built_up_pct ? ` Built-up area stands at ${summary.city.built_up_pct}%, contributing to increased surface runoff.` : ''}
                  </p>
                </section>
                <section className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded flex flex-col gap-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">FLOOD EVENTS</span>
                    <span className="font-headline-md text-[24px] font-semibold text-primary">{totalEvents}</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">Documented incidents</span>
                  </div>
                  <div className="glass-panel p-4 rounded flex flex-col gap-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">FLOOD HOTSPOTS</span>
                    <span className="font-headline-md text-[24px] font-semibold text-primary">{totalLocations}</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">Known locations</span>
                  </div>
                  <div className="glass-panel p-4 rounded flex flex-col gap-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">WATERWAYS MAPPED</span>
                    <span className="font-headline-md text-[24px] font-semibold text-primary">{waterwayCount}</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">OSM verified segments</span>
                  </div>
                  <div className="glass-panel p-4 rounded flex flex-col gap-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">DRAINAGE</span>
                    <span className="font-headline-md text-[24px] font-semibold text-primary">{drainageCoverage}%</span>
                    <span className="font-data-mono text-[10px] text-on-surface-variant">Infrastructure coverage</span>
                  </div>
                </section>

                <section>
                  <h3 className="font-label-caps text-label-caps text-primary border-b border-primary/30 pb-1 mb-3 flex items-center gap-2 mt-4">
                    <span className="material-symbols-outlined text-[14px]">assignment_turned_in</span> PRIORITY ACTION PLAN
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {actionPlan.map((action, idx) => (
                      <div key={action.title} className="glass-panel p-4 rounded border border-primary/15">
                        <div className="flex items-start gap-3">
                          <span className="font-data-mono text-primary font-bold mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-on-surface">{action.title}</span>
                              <span className="font-data-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">{action.metric}</span>
                            </div>
                            <p className="text-on-surface-variant text-[13px] leading-relaxed">{action.detail}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recent Flood Events */}
                {floodEvents.length > 0 && (
                  <section>
                    <h3 className="font-label-caps text-label-caps text-error border-b border-error/30 pb-1 mb-3 flex items-center gap-2 mt-4">
                      <span className="material-symbols-outlined text-[14px]">warning</span> HISTORICAL FLOOD EVENTS
                    </h3>
                    <div className="bg-error/10 border border-error/20 p-4 rounded font-body-sm text-on-surface flex flex-col gap-3">
                      {floodEvents.slice(0, 4).map((evt: any, idx: number) => (
                        <div key={idx}>
                          {idx > 0 && <div className="w-full h-px bg-error/20 mb-3"></div>}
                          <div className="flex gap-3 items-start">
                            <span className="font-data-mono text-error font-bold mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                            <div>
                              <div className="font-bold text-error">{evt.date || evt.year || 'Event'}</div>
                              <div className="text-on-surface/80 text-[13px]">
                                {evt.description || evt.event || evt.cause || 'No description available'}
                                {evt.damage_estimate && <span className="text-error ml-1">(₹{evt.damage_estimate})</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Susceptibility + Locations */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                {/* Waterway type breakdown */}
                {summary?.waterways?.by_type && (
                  <div className="glass-panel rounded border border-outline-variant/30 p-4 flex flex-col">
                    <span className="font-label-caps text-[10px] text-on-surface-variant mb-3">WATERWAYS BY TYPE</span>
                    <div className="flex flex-col gap-2">
                      {Object.entries(summary.waterways.by_type).map(([type, count]: [string, any]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="font-data-mono text-[12px] text-on-surface capitalize">{type}</span>
                          <span className="font-data-mono text-[12px] text-primary font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Susceptibility classes */}
                {susceptibilityClasses.length > 0 && (
                  <div className="glass-panel rounded border border-outline-variant/30 p-4 flex flex-col">
                    <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">FLOOD SUSCEPTIBILITY CLASSES</span>
                    <span className="font-data-mono text-[10px] text-error mb-3">
                      High + Very High: {highRiskPct.toFixed(2)}%
                    </span>
                    <div className="flex flex-col gap-2">
                      {susceptibilityClasses.map((cls: any, idx: number) => {
                        const pct = parseFloat(cls.area_pct || cls.percentage || '0');
                        const isHigh = (cls.class || '').toLowerCase().includes('high');
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-[11px] font-data-mono mb-1">
                              <span className={isHigh ? 'text-error' : 'text-on-surface-variant'}>{cls.class}</span>
                              <span className={isHigh ? 'text-error font-bold' : 'text-on-surface'}>{cls.area_pct || cls.percentage}%</span>
                            </div>
                            <div className="w-full bg-surface-variant rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${isHigh ? 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]' : 'bg-primary-fixed-dim'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Flood locations sample */}
                {floodLocations.length > 0 && (
                  <div className="glass-panel rounded border border-outline-variant/30 p-4 flex flex-col">
                    <span className="font-label-caps text-[10px] text-on-surface-variant mb-3">VERIFIED FLOOD HOTSPOTS</span>
                    <div className="flex flex-col gap-2">
                      {floodLocations.slice(0, 6).map((loc: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px]">
                          <span className="material-symbols-outlined text-error text-[14px] mt-0.5">location_on</span>
                          <div>
                            <div className="font-bold text-on-surface">{loc.name}</div>
                            <div className="text-on-surface-variant">{loc.category}{loc.source_event ? ` — ${loc.source_event}` : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dataSources.length > 0 && (
                  <div className="glass-panel rounded border border-outline-variant/30 p-4 flex flex-col">
                    <span className="font-label-caps text-[10px] text-on-surface-variant mb-1">DATA SOURCE STATUS</span>
                    <span className="font-data-mono text-[10px] text-primary mb-3">
                      {ingestedSources.length} ingested • {pendingSources.length} pending
                    </span>
                    <div className="flex flex-col gap-2">
                      {dataSources.map((source: any) => {
                        const isIngested = source.status === 'ingested';
                        return (
                          <div key={source.id} className="border-b border-outline-variant/10 last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-on-surface text-[12px]">{source.name}</span>
                              <span className={`font-data-mono text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                                isIngested ? 'text-primary bg-primary/10' : 'text-tertiary-fixed-dim bg-tertiary-fixed-dim/10'
                              }`}>
                                {String(source.status || '').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div className="text-on-surface-variant text-[11px] mt-1 leading-snug">{source.provider}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="mt-auto pt-8 border-t border-outline-variant/20 flex justify-between items-end opacity-50">
              <div className="font-data-mono text-[10px] flex flex-col gap-1">
                <span>MODEL: VNIT Frequency Ratio (Gaurkhede & Adane 2023)</span>
                <span>DATA: MongoDB + OSM Overpass Turbo</span>
              </div>
              <div className="text-[20px] font-bold tracking-widest font-display-lg">JAL SETU</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
