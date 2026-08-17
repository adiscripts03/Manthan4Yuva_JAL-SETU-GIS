import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAnalyticsSummary, getFloodEvents, getFloodLocations } from '../services/api';
import { FileText, Cpu, Printer, Calendar, MapPin, Layers } from 'lucide-react';

export default function AnalyticalReports() {
  const [summary, setSummary] = useState<any>(null);
  const [floodEvents, setFloodEvents] = useState<any[]>([]);
  const [floodLocations, setFloodLocations] = useState<any[]>([]);
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
      const [summaryRes, eventsRes, locationsRes] = await Promise.all([
        getAnalyticsSummary(),
        getFloodEvents(),
        getFloodLocations(),
      ]);
      setSummary(summaryRes.data);
      setFloodEvents(eventsRes.data || []);
      setFloodLocations(locationsRes.data || []);
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
    <div className="bg-[var(--bg-app)] text-[var(--text-primary)] font-sans h-full w-full overflow-hidden flex flex-col relative transition-colors">
      <Sidebar />

      <main className="flex-1 md:ml-[240px] flex bg-[var(--bg-app)] relative z-10 overflow-hidden h-full">
        {/* Left Controls Panel */}
        <div className="w-full md:w-[380px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar z-20 shrink-0 shadow-sm transition-colors">
          <header>
            <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              Report Generator
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Configure parameters for AI-driven hydraulic analysis.</p>
          </header>

          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Target Ward
              </label>
              <select className="bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] p-2.5 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors">
                <option>Dharampeth (Ward 14)</option>
                <option>Laxmi Nagar (Ward 12)</option>
                <option>Mahal (Ward 8)</option>
                <option>Sitabuldi (Ward 15)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Temporal Scope
              </label>
              <div className="flex gap-2">
                <input className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] p-2 rounded-lg outline-none" type="date" defaultValue="2023-06-01"/>
                <input className="w-1/2 bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] p-2 rounded-lg outline-none" type="date" defaultValue="2023-09-30"/>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Analytical Overlays
              </label>
              <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
                  <span>Historical Waterlogging (5yr)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
                  <span>Drainage Network Capacity</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[var(--color-primary)]" />
                  <span>Precipitation Anomalies</span>
                </label>
              </div>
            </div>

            <button
              className="mt-2 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              type="button"
              onClick={handleGenerate}
              disabled={generating || loading}
            >
              {generating ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Generating...</>
              ) : (
                <><Cpu className="w-4 h-4" /> Run Analysis</>
              )}
            </button>

            <button
              className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 text-[var(--text-secondary)]" /> Export PDF Report
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        {/* Right Preview Panel */}
        <div className="flex-1 p-6 md:p-10 bg-[var(--bg-app)] overflow-y-auto custom-scrollbar flex justify-center items-start z-10">
          <div className={`w-full max-w-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 sm:p-10 shadow-lg flex flex-col gap-6 text-[var(--text-primary)] transition-opacity duration-300 ${loading ? 'opacity-50' : ''}`}>
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--color-primary)] tracking-tight">JAL SETU GIS</h2>
                <span className="text-xs font-mono text-[var(--text-secondary)]">HYDRAULIC INTELLIGENCE REPORT</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[var(--color-natural-green)] bg-[var(--color-soft-green)] px-2.5 py-1 rounded-full border border-[var(--color-natural-green)]/20 uppercase tracking-wider block mb-1">
                  OFFICIAL ANALYSIS
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] block">CITY: {cityName}</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Waterlogging Analysis Report</h1>
            
            {/* Summary Banner */}
            <div className="bg-[var(--color-soft-blue)] border-l-4 border-l-[var(--color-primary)] p-3 rounded-r-lg text-xs font-mono text-[var(--color-primary)]">
              {cityName} • Rainfall {rainfall} mm/yr • Drainage Coverage {drainageCoverage}%
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Events</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">{totalEvents}</span>
              </div>
              <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Hotspots</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">{totalLocations}</span>
              </div>
              <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Waterways</span>
                <span className="text-xl font-bold text-[var(--color-primary)]">{waterwayCount}</span>
              </div>
              <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Coverage</span>
                <span className="text-xl font-bold text-[var(--color-natural-green)]">{drainageCoverage}%</span>
              </div>
            </div>

            {/* Action Plan */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Priority Interventions</h3>
              <div className="flex flex-col gap-2.5">
                {actionPlan.map((action, idx) => (
                  <div key={idx} className="bg-[var(--bg-app)] p-4 rounded-xl border border-[var(--border-subtle)] flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-[var(--color-primary)] mt-0.5">0{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-[var(--text-primary)]">{action.title}</span>
                        <span className="text-[10px] font-mono text-[var(--color-primary)] bg-[var(--color-soft-blue)] px-2 py-0.5 rounded-full">{action.metric}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{action.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)] font-mono">
              <span>MODEL: VNIT Frequency Ratio Model</span>
              <span className="font-bold">JAL SETU URBAN INTELLIGENCE</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
