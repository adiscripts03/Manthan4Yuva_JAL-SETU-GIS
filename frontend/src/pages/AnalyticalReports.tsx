import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import {
  getAnalyticsSummary,
  getFloodEvents,
  getFloodLocations,
  getWaterwayStats,
  getWards,
} from '../services/api';
import { FileText, Cpu, Printer, Calendar, MapPin, Layers, AlertCircle, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────
interface Ward { id: string; label: string; }

interface ReportConfig {
  ward: string;
  startDate: string;
  endDate: string;
  overlays: { waterlogging: boolean; drainage: boolean; precipitation: boolean; };
}

interface ReportData {
  events: number;
  hotspots: number;
  waterways: number;
  coverage: string | number;
  rainfall: string | number;
  cityName: string;
  highRiskPct: number;
  priorityHotspots: any[];
  hasData: boolean;
  generatedAt: string;
}

// ─── Hardcoded wards derived from the /api/wards description field ─────────────
// The DB holds a text description, not structured rows — so we enumerate the
// known named wards here and use the area names embedded in the text.
const KNOWN_WARDS: Ward[] = [
  { id: 'all', label: 'All Wards (City-wide)' },
  { id: '1', label: 'Ward 1 — Panjara Colony / Shuddhodhan Nagar' },
  { id: '4', label: 'Ward 4 — Bharat Nagar' },
  { id: '7', label: 'Ward 7 — Bezonbagh' },
  { id: '9', label: 'Ward 9 — Chhaoni' },
  { id: '13', label: 'Ward 13 — Ambazari Tank Area' },
  { id: '14', label: 'Ward 14 — Ramnagar / Civil Lines' },
  { id: '15', label: 'Ward 15 — Dhantoli' },
  { id: '17', label: 'Ward 17 — Ajni' },
  { id: '18', label: 'Ward 18 — Sakkardara' },
  { id: '21', label: 'Ward 21 — Shanti Nagar' },
  { id: '23', label: 'Ward 23 — Bhandewadi' },
  { id: '24', label: 'Ward 24 — Chikhli' },
  { id: '25', label: 'Ward 25 — Wathoda / Sakkardara Lake' },
  { id: '27', label: 'Ward 27 — Seminary Hills / Sadar' },
  { id: '29', label: 'Ward 29 — Vayusena Nagar' },
  { id: '31', label: 'Ward 31 — Dharampeth / Ambazari Lake' },
  { id: '32', label: 'Ward 32 — VNIT Campus / Hingna Road' },
  { id: '35', label: 'Ward 35 — Manewada / Hudkeshwar' },
  { id: '36', label: 'Ward 36 — Airport / Sonegaon' },
  { id: '38', label: 'Ward 38 — Butibori / MIHAN' },
];

// Map ward id → hotspot names that roughly belong to that area (from location data)
const WARD_HOTSPOT_MAP: Record<string, string[]> = {
  '1': ['Narendra Nagar'],
  '4': ['Manish Nagar', 'Rahul Nagar Nallah (area ref.)'],
  '7': ['Loha Pul'],
  '9': ['Omkar Nagar'],
  '13': ['Ambazari'],
  '18': ['Swavalambi Nagar'],
  '21': ['Mhalgi Nagar'],
  '23': ['Bhandewadi'],
  '24': ['Besa', 'Beltarodi'],
  '27': ['Seminary Hills'],
  '35': ['Hudkeshwar', 'Narsala', 'Jaitala'],
  '36': ['Pili Nadi (near Armour\'s Township ref.)'],
  'all': [],
};

// Data coverage date bounds
const DATA_MIN_DATE = '2013-01-01';
const DATA_MAX_DATE = '2026-12-31';

// sessionStorage key
const PERSIST_KEY = 'jalsetu_report_config';

// ─── Helpers ─────────────────────────────────────────────
function loadPersistedConfig(): Partial<ReportConfig> {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistConfig(cfg: ReportConfig) {
  try {
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(cfg));
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────
export default function AnalyticalReports() {
  // ── Load persisted config ──
  const saved = loadPersistedConfig();

  // ── Form state ──
  const [ward, setWard] = useState<string>(saved.ward ?? '');
  const [startDate, setStartDate] = useState(saved.startDate ?? '2019-01-01');
  const [endDate, setEndDate] = useState(saved.endDate ?? '2026-12-31');
  const [overlays, setOverlays] = useState({
    waterlogging: saved.overlays?.waterlogging ?? true,
    drainage: saved.overlays?.drainage ?? true,
    precipitation: saved.overlays?.precipitation ?? true,
  });

  // ── Inline field errors ──
  const [errors, setErrors] = useState<{ ward?: string; dates?: string; overlays?: string }>({});

  // ── Raw data cache ──
  const [allFloodEvents, setAllFloodEvents] = useState<any[]>([]);
  const [allFloodLocations, setAllFloodLocations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Report state ──
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null); // what was used to build the last report
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Ref to the printable region ──
  const reportRef = useRef<HTMLDivElement>(null);

  // ─── Load raw data once ───────────────────────────────
  useEffect(() => {
    async function boot() {
      setDataLoading(true);
      try {
        const [summaryRes, eventsRes, locRes] = await Promise.all([
          getAnalyticsSummary(),
          getFloodEvents(),
          getFloodLocations(),
        ]);
        setSummary(summaryRes.data);
        setAllFloodEvents(eventsRes.data ?? []);
        setAllFloodLocations(locRes.data ?? []);
      } catch {
        /* non-fatal — report page still usable with zeroed data */
      } finally {
        setDataLoading(false);
      }
    }
    boot();
  }, []);

  // ─── Persist config whenever inputs change ────────────
  useEffect(() => {
    persistConfig({ ward, startDate, endDate, overlays });
  }, [ward, startDate, endDate, overlays]);

  // ─── Derived: any overlays checked? ──────────────────
  const anyOverlayChecked = overlays.waterlogging || overlays.drainage || overlays.precipitation;

  // ─── Validation ──────────────────────────────────────
  function validate(): boolean {
    const e: typeof errors = {};
    if (!ward) e.ward = 'Please select a target ward.';
    if (!startDate || !endDate) {
      e.dates = 'Both start and end dates are required.';
    } else if (startDate >= endDate) {
      e.dates = 'Start date must be before end date.';
    }
    if (!anyOverlayChecked) e.overlays = 'Select at least one analytical overlay.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Compute report data from raw inputs ──────────────
  const computeReport = useCallback(
    (
      wardId: string,
      start: string,
      end: string,
      ovl: typeof overlays
    ): ReportData => {
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();

      // Filter flood events to date range
      const filteredEvents = allFloodEvents.filter((evt) => {
        if (!evt.date) return false;
        const evtMs = new Date(evt.date.slice(0, 10)).getTime();
        return evtMs >= startMs && evtMs <= endMs;
      });

      // Filter flood locations to ward (if not "all") + date range
      let filteredLocations = allFloodLocations.filter((loc) => {
        if (!loc.source_event) return true; // non-event refs — always include
        const evtDate = loc.source_event.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        if (!evtDate) return true;
        const ms = new Date(evtDate).getTime();
        return ms >= startMs && ms <= endMs;
      });

      if (wardId !== 'all' && wardId) {
        const wardHotspots = WARD_HOTSPOT_MAP[wardId] ?? [];
        if (wardHotspots.length > 0) {
          filteredLocations = filteredLocations.filter((loc) =>
            wardHotspots.some((h) =>
              loc.name?.toLowerCase().includes(h.toLowerCase()) ||
              h.toLowerCase().includes(loc.name?.toLowerCase())
            )
          );
        }
        // If no mapping exists for a ward, show empty — that ward has no recorded data
      }

      // Priority hotspots
      const priorityHotspots = filteredLocations
        .filter((loc: any) => {
          const cat = String(loc.category || '').toLowerCase();
          return cat.includes('flood') || cat.includes('chronic') || cat.includes('critical');
        })
        .slice(0, 5);

      // Susceptibility
      const susceptibilityClasses = summary?.susceptibility?.classes ?? [];
      const highRiskPct = susceptibilityClasses
        .filter((cls: any) => String(cls.class || '').toLowerCase().includes('high'))
        .reduce((sum: number, cls: any) => sum + Number(cls.area_pct || 0), 0);

      const waterwayCount =
        wardId === 'all'
          ? (summary?.waterways?.total ?? 0)
          : Math.round((summary?.waterways?.total ?? 0) / 38); // estimated per-ward

      const hasData = filteredEvents.length > 0 || filteredLocations.length > 0;

      return {
        events: filteredEvents.length,
        hotspots: filteredLocations.length,
        waterways: waterwayCount,
        coverage: summary?.city?.drainage_coverage_pct ?? '—',
        rainfall: summary?.city?.annual_avg_rainfall_mm ?? '—',
        cityName: summary?.city?.name ?? 'Nagpur',
        highRiskPct,
        priorityHotspots,
        hasData,
        generatedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      };
    },
    [allFloodEvents, allFloodLocations, summary]
  );

  // ─── Action: Run Analysis ────────────────────────────
  async function handleGenerate() {
    if (!validate()) return;
    setGenerating(true);
    // Simulate brief async work (re-fetching or processing)
    await new Promise((r) => setTimeout(r, 900));
    const result = computeReport(ward, startDate, endDate, overlays);
    setReportData(result);
    setReportConfig({ ward, startDate, endDate, overlays });
    setGenerating(false);
  }

  // ─── oklch → rgb resolver ─────────────────────────────
  // html2canvas does not understand oklch() (Tailwind v4 default color space).
  // We resolve every oklch value to an sRGB hex by letting the browser paint it
  // into a tiny off-screen canvas and reading back the pixel.
  function resolveColor(value: string): string {
    if (!value.includes('oklch')) return value;
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = 1;
      offscreen.height = 1;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return value;
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${r},${g},${b})`;
    } catch {
      return value;
    }
  }

  // Walk every element in a DOM tree and inline its computed color/background
  // properties as plain rgb() so html2canvas never sees oklch().
  function resolveOklchInClone(root: HTMLElement) {
    const COLOR_PROPS = [
      'color', 'backgroundColor', 'borderColor',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'fill', 'stroke',
    ] as const;

    const walk = (el: Element) => {
      if (!(el instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(el);
      for (const prop of COLOR_PROPS) {
        const val = computed[prop as keyof CSSStyleDeclaration] as string;
        if (val && val.includes('oklch')) {
          el.style[prop as any] = resolveColor(val);
        }
      }
      for (const child of Array.from(el.children)) walk(child);
    };

    walk(root);
  }

  // ─── Action: Export PDF ──────────────────────────────
  async function handleExportPDF() {
    if (!reportData || !reportRef.current) {
      showToast('error', 'Run analysis first to generate a report before exporting.');
      return;
    }
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_doc: Document, el: HTMLElement) => {
          // Force all oklch computed colors to rgb in the cloned subtree
          resolveOklchInClone(el);
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      // If content is taller than one A4 page, tile across multiple pages
      if (pdfH > pdf.internal.pageSize.getHeight()) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yOffset = 0;
        while (yOffset < pdfH) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH);
          yOffset += pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      }
      const wardLabel = KNOWN_WARDS.find((w) => w.id === ward)?.label?.replace(/[^a-zA-Z0-9]/g, '-') ?? 'report';
      pdf.save(`jal-setu-report-${wardLabel}-${startDate}.pdf`);
      showToast('success', 'PDF exported successfully.');
    } catch (err) {
      showToast('error', `Export failed: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  // ─── Derived action plan ─────────────────────────────
  function buildActionPlan(rd: ReportData, ovl: typeof overlays) {
    const items: { title: string; metric: string; detail: string }[] = [];
    if (ovl.drainage) {
      items.push({
        title: 'Pre-monsoon drain audit',
        metric: `${rd.waterways} mapped segments`,
        detail:
          'Verify desilting evidence and blockages along the mapped drainage network before the next heavy rainfall window.',
      });
    }
    if (ovl.waterlogging) {
      items.push({
        title: 'High-susceptibility response grid',
        metric: rd.highRiskPct
          ? `${rd.highRiskPct.toFixed(2)}% city area`
          : 'Model pending',
        detail:
          'Prioritize pumps, traffic diversions, and field crews near very-high and high susceptibility zones.',
      });
    }
    if (ovl.precipitation) {
      items.push({
        title: 'Hotspot evidence loop',
        metric: `${rd.priorityHotspots.length || rd.hotspots} priority sites`,
        detail:
          'Attach citizen reports, photos, work orders, and closure proofs to the same location record.',
      });
    }
    return items;
  }

  const selectedWardLabel = KNOWN_WARDS.find((w) => w.id === ward)?.label ?? '—';

  return (
    <div className="bg-[var(--bg-app)] text-[var(--text-primary)] font-sans h-screen w-screen overflow-hidden flex flex-col relative transition-colors">
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-4 duration-200 ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <main className="flex-1 md:ml-[240px] flex bg-[var(--bg-app)] relative z-10 overflow-hidden h-full">

        {/* ── Left Controls Panel ── */}
        <div className="w-full md:w-[380px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar z-20 shrink-0 shadow-sm transition-colors">
          <header>
            <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              Report Generator
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Configure parameters for hydraulic analysis.
            </p>
          </header>

          <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

            {/* ── Target Ward ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Target Ward
              </label>
              <select
                id="ward-select"
                value={ward}
                onChange={(e) => {
                  setWard(e.target.value);
                  setErrors((prev) => ({ ...prev, ward: undefined }));
                }}
                className={`bg-[var(--bg-app)] border text-xs text-[var(--text-primary)] p-2.5 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors ${
                  errors.ward ? 'border-red-400' : 'border-[var(--border-subtle)]'
                }`}
              >
                <option value="">— Select a ward —</option>
                {KNOWN_WARDS.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
              {errors.ward && (
                <span className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.ward}
                </span>
              )}
            </div>

            {/* ── Temporal Scope ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Temporal Scope
              </label>
              <div className="flex gap-2">
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  min={DATA_MIN_DATE}
                  max={DATA_MAX_DATE}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setErrors((prev) => ({ ...prev, dates: undefined }));
                  }}
                  className={`w-1/2 bg-[var(--bg-app)] border text-xs text-[var(--text-primary)] p-2 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors ${
                    errors.dates ? 'border-red-400' : 'border-[var(--border-subtle)]'
                  }`}
                />
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={DATA_MIN_DATE}
                  max={DATA_MAX_DATE}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setErrors((prev) => ({ ...prev, dates: undefined }));
                  }}
                  className={`w-1/2 bg-[var(--bg-app)] border text-xs text-[var(--text-primary)] p-2 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors ${
                    errors.dates ? 'border-red-400' : 'border-[var(--border-subtle)]'
                  }`}
                />
              </div>
              {errors.dates && (
                <span className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.dates}
                </span>
              )}
              <span className="text-[10px] text-[var(--text-muted)]">
                Data coverage: {DATA_MIN_DATE} to {DATA_MAX_DATE}
              </span>
            </div>

            {/* ── Analytical Overlays ── */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Analytical Overlays
              </label>
              <div
                className={`bg-[var(--bg-app)] border rounded-lg p-3 flex flex-col gap-2.5 ${
                  errors.overlays ? 'border-red-400' : 'border-[var(--border-subtle)]'
                }`}
              >
                {(
                  [
                    { key: 'waterlogging', label: 'Historical Waterlogging (5yr)' },
                    { key: 'drainage', label: 'Drainage Network Capacity' },
                    { key: 'precipitation', label: 'Precipitation Anomalies' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overlays[key]}
                      onChange={(e) => {
                        setOverlays((prev) => ({ ...prev, [key]: e.target.checked }));
                        setErrors((prev) => ({ ...prev, overlays: undefined }));
                      }}
                      className="accent-[var(--color-primary)]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {errors.overlays && (
                <span className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.overlays}
                </span>
              )}
              {!anyOverlayChecked && !errors.overlays && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select at least one analytical overlay.
                </span>
              )}
            </div>

            {/* ── Run Analysis button ── */}
            <button
              className="mt-2 w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              id="run-analysis-btn"
              onClick={handleGenerate}
              disabled={generating || dataLoading || !anyOverlayChecked}
              title={!anyOverlayChecked ? 'Select at least one analytical overlay' : ''}
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" /> Run Analysis
                </>
              )}
            </button>

            {/* ── Export PDF button ── */}
            <button
              className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              type="button"
              id="export-pdf-btn"
              onClick={handleExportPDF}
              disabled={exporting || !reportData}
              title={!reportData ? 'Run analysis first to enable PDF export' : ''}
            >
              {exporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[var(--text-secondary)]" /> Export PDF Report
                </>
              )}
            </button>

            {!reportData && (
              <p className="text-[10px] text-[var(--text-muted)] text-center">
                Run analysis first to enable PDF export.
              </p>
            )}
          </form>
        </div>

        {/* ── Right Preview Panel ── */}
        <div className="flex-1 p-6 md:p-10 bg-[var(--bg-app)] overflow-y-auto custom-scrollbar flex justify-center items-start z-10">

          {/* Placeholder before first analysis */}
          {!reportData && !generating && (
            <div className="w-full max-w-3xl flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center">
                <FileText className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">No report generated yet</h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                Select a ward, set the temporal scope, choose overlays, then click{' '}
                <strong>Run Analysis</strong> to generate the report preview.
              </p>
            </div>
          )}

          {/* Generating spinner overlay */}
          {generating && (
            <div className="w-full max-w-3xl flex flex-col items-center justify-center py-20 gap-4">
              <span className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Running analysis…</p>
            </div>
          )}

          {/* Report Preview */}
          {reportData && !generating && (
            <div
              ref={reportRef}
              className="w-full max-w-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 sm:p-10 shadow-lg flex flex-col gap-6 text-[var(--text-primary)]"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--color-primary)] tracking-tight">JAL SETU GIS</h2>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">HYDRAULIC INTELLIGENCE REPORT</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 uppercase tracking-wider block mb-1">
                    OFFICIAL ANALYSIS
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] block">CITY: {reportData.cityName}</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                    Generated: {reportData.generatedAt}
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Waterlogging Analysis Report</h1>

              {/* Config summary banner */}
              <div className="bg-blue-50 border-l-4 border-l-[var(--color-primary)] p-3 rounded-r-lg text-xs font-mono text-[var(--color-primary)] flex flex-wrap gap-x-4 gap-y-1">
                <span>Ward: {selectedWardLabel}</span>
                <span>Period: {reportConfig?.startDate} → {reportConfig?.endDate}</span>
                <span>Rainfall: {reportData.rainfall} mm/yr</span>
                <span>Drain Coverage: {reportData.coverage}%</span>
              </div>

              {/* Active overlays */}
              <div className="flex gap-2 flex-wrap">
                {overlays.waterlogging && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    ✓ Historical Waterlogging
                  </span>
                )}
                {overlays.drainage && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    ✓ Drainage Network Capacity
                  </span>
                )}
                {overlays.precipitation && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    ✓ Precipitation Anomalies
                  </span>
                )}
              </div>

              {/* No-data state */}
              {!reportData.hasData ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="font-semibold text-amber-700 text-sm">No data for this period</p>
                  <p className="text-xs text-amber-600">
                    No flood events or hotspots were recorded for{' '}
                    <strong>{selectedWardLabel}</strong> between{' '}
                    <strong>{reportConfig?.startDate}</strong> and{' '}
                    <strong>{reportConfig?.endDate}</strong>. Try widening the date range or selecting a different ward.
                  </p>
                </div>
              ) : (
                <>
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Events</span>
                      <span className="text-xl font-bold text-[var(--color-primary)]">{reportData.events}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">in range</span>
                    </div>
                    <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Hotspots</span>
                      <span className="text-xl font-bold text-[var(--color-primary)]">{reportData.hotspots}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">in ward</span>
                    </div>
                    <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Waterways</span>
                      <span className="text-xl font-bold text-[var(--color-primary)]">{reportData.waterways}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {ward === 'all' ? 'city-wide' : 'est. in ward'}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-subtle)] flex flex-col">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Coverage</span>
                      <span className="text-xl font-bold text-green-600">{reportData.coverage}%</span>
                      <span className="text-[9px] text-[var(--text-muted)]">drain infra</span>
                    </div>
                  </div>

                  {/* Priority Hotspots table */}
                  {reportData.priorityHotspots.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        Flood-Affected Locations
                      </h3>
                      <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                        <table className="w-full text-[11px] font-mono">
                          <thead>
                            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-subtle)]">
                              <th className="text-left p-2.5 text-[var(--text-muted)]">Location</th>
                              <th className="text-left p-2.5 text-[var(--text-muted)]">Category</th>
                              <th className="text-left p-2.5 text-[var(--text-muted)]">Source Event</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.priorityHotspots.map((loc: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-app)]"
                              >
                                <td className="p-2.5 text-[var(--text-primary)] font-semibold">{loc.name}</td>
                                <td className="p-2.5 text-[var(--text-secondary)] capitalize">
                                  {loc.category?.replace(/_/g, ' ') ?? '—'}
                                </td>
                                <td className="p-2.5 text-[var(--text-muted)]">{loc.source_event ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Priority Interventions */}
                  {buildActionPlan(reportData, overlays).length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        Priority Interventions
                      </h3>
                      <div className="flex flex-col gap-2.5">
                        {buildActionPlan(reportData, overlays).map((action, idx) => (
                          <div
                            key={idx}
                            className="bg-[var(--bg-app)] p-4 rounded-xl border border-[var(--border-subtle)] flex items-start gap-3"
                          >
                            <span className="text-xs font-mono font-bold text-[var(--color-primary)] mt-0.5">
                              0{idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                <span className="font-bold text-xs text-[var(--text-primary)]">
                                  {action.title}
                                </span>
                                <span className="text-[10px] font-mono text-[var(--color-primary)] bg-blue-50 px-2 py-0.5 rounded-full">
                                  {action.metric}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {action.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)] font-mono flex-wrap gap-2">
                <span>MODEL: VNIT Frequency Ratio Model</span>
                <span className="font-bold">JAL SETU URBAN INTELLIGENCE</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
