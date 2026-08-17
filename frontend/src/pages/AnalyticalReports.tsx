import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import {
  getAnalyticsSummary,
  getFloodEvents,
  getFloodLocations,
  getWaterwayStats,
  getWards,
  createAnalysisReport,
} from '../services/api';
import { FileText, Cpu, Printer, Calendar, MapPin, Layers, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
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
  const [recording, setRecording] = useState(false);
  const [recordedTxHash, setRecordedTxHash] = useState<string | null>(null);
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
    setRecordedTxHash(null); // Reset blockchain state for new report
    setGenerating(false);
  }

  // ─── Action: Export PDF (proper formatted document) ──
  async function handleExportPDF() {
    if (!reportData || !reportConfig) {
      showToast('error', 'Run analysis first to generate a report before exporting.');
      return;
    }
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 210 mm
      const H = pdf.internal.pageSize.getHeight();  // 297 mm
      const ML = 18; // margin left
      const MR = W - 18; // margin right
      const TW = MR - ML; // text width
      let y = 0;

      const ward_label = KNOWN_WARDS.find((w) => w.id === reportConfig.ward)?.label ?? reportConfig.ward;
      const actionPlan = buildActionPlan(reportData, reportConfig.overlays);

      // ── colour palette (all hex, no oklch) ───────────────
      const C_BRAND   = '#176B87' as const;
      const C_DARK    = '#0E1B24' as const;
      const C_MID     = '#475569' as const;
      const C_LIGHT   = '#64748B' as const;
      const C_RULE    = '#E2E8F0' as const;
      const C_BG_HDR  = '#E8F3F5' as const;
      const C_BG_STAT = '#F7F9F7' as const;
      const C_GREEN   = '#3A8F6B' as const;
      const C_WHITE   = '#FFFFFF' as const;
      const C_RED     = '#DC2626' as const;
      const C_AMBER   = '#D97706' as const;

      // ── helpers ──────────────────────────────────────────
      const setFont = (style: 'normal'|'bold'|'italic', size: number, color = C_DARK) => {
        pdf.setFont('helvetica', style);
        pdf.setFontSize(size);
        pdf.setTextColor(color);
      };
      const rule = (yy: number, color = C_RULE) => {
        pdf.setDrawColor(color);
        pdf.setLineWidth(0.3);
        pdf.line(ML, yy, MR, yy);
      };
      const rect = (x: number, yy: number, w: number, h: number, fill: string) => {
        pdf.setFillColor(fill);
        pdf.rect(x, yy, w, h, 'F');
      };
      const newPageIfNeeded = (needed: number) => {
        if (y + needed > H - 18) {
          pdf.addPage();
          y = 18;
        }
      };

      // ══════════════════════════════════════════════════════
      // PAGE 1 — COVER BAND + OVERVIEW
      // ══════════════════════════════════════════════════════

      // ── Full-width brand header band ─────────────────────
      rect(0, 0, W, 36, C_BRAND);
      setFont('bold', 20, C_WHITE);
      pdf.text('JAL SETU GIS', ML, 14);
      setFont('normal', 8, C_BG_HDR);
      pdf.text('HYDRAULIC INTELLIGENCE PLATFORM  ·  NAGPUR MUNICIPAL CORPORATION', ML, 20);
      setFont('bold', 11, C_WHITE);
      pdf.text('WATERLOGGING ANALYSIS REPORT', ML, 29);

      // Stamp top-right
      setFont('bold', 7, C_BG_HDR);
      pdf.text('OFFICIAL ANALYSIS', MR - 2, 14, { align: 'right' });
      setFont('normal', 7, C_BG_HDR);
      pdf.text(`Generated: ${reportData.generatedAt}`, MR - 2, 19, { align: 'right' });
      pdf.text(`City: ${reportData.cityName}`, MR - 2, 24, { align: 'right' });
      pdf.text('Model: VNIT Frequency Ratio', MR - 2, 29, { align: 'right' });

      y = 44;

      // ── Report scope banner ──────────────────────────────
      rect(ML, y, TW, 18, C_BG_HDR);
      pdf.setDrawColor(C_BRAND);
      pdf.setLineWidth(0.8);
      pdf.line(ML, y, ML, y + 18);
      pdf.setLineWidth(0.3);
      setFont('bold', 8, C_BRAND);
      pdf.text('REPORT SCOPE', ML + 3, y + 5);
      setFont('normal', 8, C_DARK);
      pdf.text(`Ward / Area :  ${ward_label}`, ML + 3, y + 10);
      pdf.text(
        `Temporal Scope :  ${reportConfig.startDate}  →  ${reportConfig.endDate}`,
        ML + 3, y + 15
      );
      // Active overlays on the right
      const activeOverlays = [
        reportConfig.overlays.waterlogging ? 'Historical Waterlogging' : null,
        reportConfig.overlays.drainage     ? 'Drainage Network Capacity' : null,
        reportConfig.overlays.precipitation? 'Precipitation Anomalies'  : null,
      ].filter(Boolean).join('  ·  ');
      setFont('normal', 7, C_MID);
      pdf.text(`Overlays: ${activeOverlays}`, MR - 2, y + 10, { align: 'right' });
      y += 24;

      // ── No-data short-circuit ─────────────────────────────
      if (!reportData.hasData) {
        newPageIfNeeded(40);
        rect(ML, y, TW, 28, '#FEF3C7');
        setFont('bold', 11, C_AMBER);
        pdf.text('No Data Available for This Period', ML + 4, y + 10);
        setFont('normal', 9, C_DARK);
        pdf.text(
          `No flood events or hotspot records were found for the selected ward and date range.`,
          ML + 4, y + 17
        );
        setFont('normal', 8, C_MID);
        pdf.text('Try widening the temporal scope or selecting a different ward.', ML + 4, y + 23);
        y += 34;
      } else {

        // ── Section 1: Key Statistics ─────────────────────
        setFont('bold', 9, C_BRAND);
        pdf.text('01  KEY STATISTICS', ML, y);
        rule(y + 2, C_BRAND);
        y += 7;

        // 4-column stat grid
        const stats = [
          { label: 'FLOOD EVENTS', value: String(reportData.events), sub: 'in period', color: C_BRAND },
          { label: 'HOTSPOTS', value: String(reportData.hotspots), sub: 'in ward', color: C_BRAND },
          { label: 'WATERWAYS', value: String(reportData.waterways),
            sub: reportConfig.ward === 'all' ? 'city-wide' : 'est. in ward', color: C_BRAND },
          { label: 'DRAIN COVERAGE', value: `${reportData.coverage}%`, sub: 'infra coverage', color: C_GREEN },
        ];
        const cellW = TW / 4;
        stats.forEach((s, i) => {
          const cx = ML + i * cellW;
          rect(cx, y, cellW - 1, 22, C_BG_STAT);
          pdf.setDrawColor(C_RULE);
          pdf.setLineWidth(0.25);
          pdf.rect(cx, y, cellW - 1, 22);
          setFont('bold', 6, C_LIGHT);
          pdf.text(s.label, cx + 2.5, y + 5.5);
          setFont('bold', 16, s.color);
          pdf.text(s.value, cx + 2.5, y + 15);
          setFont('normal', 6, C_LIGHT);
          pdf.text(s.sub, cx + 2.5, y + 20);
        });
        y += 28;

        // Supplementary metrics row
        const suppStats = [
          { label: 'Annual Avg Rainfall', value: `${reportData.rainfall} mm/yr` },
          { label: 'High-Risk Area (city)', value: reportData.highRiskPct ? `${reportData.highRiskPct.toFixed(1)}%` : '—' },
          { label: 'Drain Infra Coverage', value: `${reportData.coverage}%` },
        ];
        suppStats.forEach((s, i) => {
          const cx = ML + i * (TW / 3);
          setFont('bold', 7, C_MID);
          pdf.text(`${s.label}:`, cx, y);
          setFont('bold', 8, C_DARK);
          pdf.text(s.value, cx + 40, y);
        });
        y += 8;
        rule(y);
        y += 6;

        // ── Section 2: Flood Locations Table ─────────────
        if (reportData.priorityHotspots.length > 0) {
          newPageIfNeeded(20 + reportData.priorityHotspots.length * 8);
          setFont('bold', 9, C_BRAND);
          pdf.text('02  FLOOD-AFFECTED LOCATIONS', ML, y);
          rule(y + 2, C_BRAND);
          y += 7;

          // Table header
          const cols = [
            { label: 'LOCATION', x: ML,      w: 70 },
            { label: 'CATEGORY', x: ML + 70, w: 55 },
            { label: 'SOURCE EVENT', x: ML + 125, w: 65 },
          ];
          rect(ML, y, TW, 7, C_BRAND);
          cols.forEach((c) => {
            setFont('bold', 7, C_WHITE);
            pdf.text(c.label, c.x + 2, y + 4.8);
          });
          y += 7;

          reportData.priorityHotspots.forEach((loc: any, idx: number) => {
            newPageIfNeeded(9);
            const rowBg = idx % 2 === 0 ? C_WHITE : C_BG_STAT;
            rect(ML, y, TW, 7.5, rowBg);
            pdf.setDrawColor(C_RULE);
            pdf.setLineWidth(0.2);
            pdf.line(ML, y + 7.5, MR, y + 7.5);

            setFont('bold', 8, C_DARK);
            pdf.text(loc.name ?? '—', cols[0].x + 2, y + 5, { maxWidth: cols[0].w - 4 });
            setFont('normal', 7.5, C_MID);
            pdf.text(
              (loc.category ?? '—').replace(/_/g, ' '),
              cols[1].x + 2, y + 5,
              { maxWidth: cols[1].w - 4 }
            );
            pdf.text(
              loc.source_event ?? '—',
              cols[2].x + 2, y + 5,
              { maxWidth: cols[2].w - 4 }
            );
            y += 7.5;
          });
          y += 6;
          rule(y);
          y += 6;
        }

        // ── Section 3: Flood Events ───────────────────────
        newPageIfNeeded(30);
        setFont('bold', 9, C_BRAND);
        pdf.text('03  HISTORICAL FLOOD EVENTS', ML, y);
        rule(y + 2, C_BRAND);
        y += 7;

        const eventsInRange = allFloodEvents.filter((evt) => {
          if (!evt.date) return false;
          return evt.date.slice(0, 10) >= reportConfig.startDate &&
                 evt.date.slice(0, 10) <= reportConfig.endDate;
        });

        if (eventsInRange.length === 0) {
          setFont('normal', 8, C_LIGHT);
          pdf.text('No flood events recorded in the selected date range.', ML, y);
          y += 8;
        } else {
          eventsInRange.forEach((evt: any, idx: number) => {
            newPageIfNeeded(28);
            // Event header bar
            rect(ML, y, TW, 7, C_BG_HDR);
            setFont('bold', 8, C_BRAND);
            pdf.text(`Event ${idx + 1}  ·  ${evt.date ?? '—'}`, ML + 2, y + 5);
            if (evt.rainfall_mm) {
              setFont('normal', 7, C_MID);
              pdf.text(`Rainfall: ${evt.rainfall_mm} mm`, MR - 2, y + 5, { align: 'right' });
            }
            y += 9;

            // Event detail rows
            const rows: [string, string][] = [
              ['Deaths',           evt.deaths != null ? String(evt.deaths) : '—'],
              ['Evacuated',        evt.evacuated ?? '—'],
              ['Houses Affected',  evt.houses_affected != null ? String(evt.houses_affected) : '—'],
              ['Cause',            evt.cause ?? '—'],
              ['Relief Announced', evt.relief_announced ?? '—'],
            ];
            rows.forEach(([k, v]) => {
              newPageIfNeeded(7);
              setFont('bold', 7, C_MID);
              pdf.text(k, ML + 2, y);
              setFont('normal', 7.5, C_DARK);
              // wrap long values
              const lines = pdf.splitTextToSize(v, TW - 36);
              pdf.text(lines, ML + 36, y);
              y += Math.max(5.5, lines.length * 4.5);
            });
            y += 4;
            rule(y, C_RULE);
            y += 5;
          });
        }

        // ── Section 4: Flood Susceptibility ──────────────
        const susceptibilityClasses = summary?.susceptibility?.classes ?? [];
        if (susceptibilityClasses.length > 0) {
          newPageIfNeeded(16 + susceptibilityClasses.length * 8);
          setFont('bold', 9, C_BRAND);
          pdf.text('04  FLOOD SUSCEPTIBILITY MODEL', ML, y);
          rule(y + 2, C_BRAND);
          y += 7;
          setFont('normal', 8, C_MID);
          pdf.text('VNIT Frequency Ratio Model  ·  Source: VNIT Nagpur Flood Susceptibility Study', ML, y);
          y += 6;

          // Bar chart rows
          susceptibilityClasses.forEach((cls: any) => {
            newPageIfNeeded(9);
            const pct = parseFloat(cls.area_pct || '0');
            const isHigh = String(cls.class || '').toLowerCase().includes('high');
            setFont('bold', 7.5, isHigh ? C_RED : C_DARK);
            pdf.text(cls.class ?? '—', ML, y + 3.5);
            setFont('normal', 7.5, C_MID);
            pdf.text(`${cls.area_pct}%`, ML + 45, y + 3.5);
            // bar track
            rect(ML + 55, y, TW - 55, 4.5, C_RULE);
            // bar fill
            rect(ML + 55, y, Math.max(1, ((TW - 55) * pct) / 100), 4.5, isHigh ? C_RED : C_BRAND);
            y += 7;
          });
          y += 4;
          rule(y);
          y += 6;
        }

        // ── Section 5: Priority Interventions ────────────
        if (actionPlan.length > 0) {
          newPageIfNeeded(20 + actionPlan.length * 24);
          setFont('bold', 9, C_BRAND);
          pdf.text('05  PRIORITY INTERVENTIONS', ML, y);
          rule(y + 2, C_BRAND);
          y += 7;

          actionPlan.forEach((action, idx) => {
            newPageIfNeeded(26);
            // Numbered badge
            rect(ML, y, 8, 8, C_BRAND);
            setFont('bold', 8, C_WHITE);
            pdf.text(`0${idx + 1}`, ML + 1.5, y + 5.8);
            // Title + metric
            setFont('bold', 9, C_DARK);
            pdf.text(action.title, ML + 11, y + 4);
            setFont('bold', 7.5, C_BRAND);
            pdf.text(action.metric, MR - 2, y + 4, { align: 'right' });
            // Detail text
            y += 9;
            setFont('normal', 8, C_MID);
            const lines = pdf.splitTextToSize(action.detail, TW - 11);
            pdf.text(lines, ML + 11, y);
            y += lines.length * 4.5 + 5;
            rule(y, C_RULE);
            y += 5;
          });
        }
      } // end hasData block

      // ══════════════════════════════════════════════════════
      // FOOTER on every page
      // ══════════════════════════════════════════════════════
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        rect(0, H - 10, W, 10, C_DARK);
        setFont('normal', 6.5, C_MID);
        pdf.text('JAL SETU URBAN INTELLIGENCE  ·  VNIT Frequency Ratio Model  ·  Data: OpenStreetMap / NMC Nagpur', ML, H - 4.5);
        setFont('bold', 6.5, '#94A3B8');
        pdf.text(`Page ${p} of ${totalPages}`, MR - 2, H - 4.5, { align: 'right' });
      }

      // ── Save ──────────────────────────────────────────────
      const wardSlug = KNOWN_WARDS.find((w) => w.id === reportConfig.ward)
        ?.label?.replace(/[^a-zA-Z0-9]/g, '-') ?? 'report';
      pdf.save(`jal-setu-report-${wardSlug}-${reportConfig.startDate}.pdf`);
      showToast('success', 'PDF report exported successfully.');
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

  // ─── Action: Record on Blockchain ─────────────────────
  async function handleRecordBlockchain() {
    if (!reportData || !reportConfig) return;
    setRecording(true);
    try {
      const payload = {
        ward: reportConfig.ward,
        startDate: reportConfig.startDate,
        endDate: reportConfig.endDate,
        overlays: reportConfig.overlays,
        ...reportData
      };
      
      const res = await createAnalysisReport(payload);
      
      if (res.success && res.data.blockchain?.status === 'confirmed') {
        setRecordedTxHash(res.data.blockchain.tx_hash);
        showToast('success', `Report securely recorded on-chain (${res.data.blockchain.tx_hash.slice(0, 10)}...)`);
      } else {
        showToast('error', res.data.blockchain?.error || 'Failed to record on blockchain.');
      }
    } catch (err) {
      showToast('error', `Recording failed: ${(err as Error).message}`);
    } finally {
      setRecording(false);
    }
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

            {/* ── Record on Blockchain button ── */}
            <button
              className={`w-full border text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                recordedTxHash
                  ? 'bg-[var(--color-soft-green)] text-[var(--color-natural-green)] border-[var(--color-natural-green)]/30 hover:bg-[var(--color-soft-green)]'
                  : 'bg-[var(--bg-app)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              type="button"
              onClick={handleRecordBlockchain}
              disabled={recording || !reportData || !!recordedTxHash}
              title={recordedTxHash ? 'Already recorded on blockchain' : (!reportData ? 'Run analysis first to record it' : '')}
            >
              {recording ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Recording…
                </>
              ) : recordedTxHash ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Recorded On-Chain
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" /> Record on Blockchain
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
