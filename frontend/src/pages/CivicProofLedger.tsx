import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getInterventions, getGovernmentResponse, getCitizenReports } from '../services/api';
import { ShieldCheck, Copy, Check, ExternalLink, Activity, Layers } from 'lucide-react';

export default function CivicProofLedger() {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [govResponse, setGovResponse] = useState<any>(null);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [intRes, govRes, crRes] = await Promise.all([
          getInterventions(),
          getGovernmentResponse(),
          getCitizenReports({ limit: 20 }),
        ]);
        setInterventions(intRes.data || []);
        setGovResponse(govRes.data || null);
        setCitizenReports(crRes.data || []);
        if (intRes.data?.length > 0) setSelectedIntervention(intRes.data[0]);
      } catch (e) {
        console.error('Failed to load civic ledger data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => setVerifying(false), 1500);
  };

  const totalSpending = govResponse?.total_spending_crore ? `₹${govResponse.total_spending_crore} Cr` : '—';
  const pumpingStations = govResponse?.pumping_stations_progress || {};

  return (
    <div className="bg-[var(--bg-app)] text-[var(--text-primary)] min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors">
      
      <Sidebar />

      <main className="flex-1 md:ml-[240px] p-6 relative overflow-y-auto h-[calc(100vh-56px)] custom-scrollbar bg-[var(--bg-app)] transition-colors">
        
        <div className={`relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full pt-2 pb-12 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-1">
                <ShieldCheck className="w-6 h-6 text-[var(--color-natural-green)]" />
                Immutable Protocol Ledger
              </h1>
              <p className="text-[var(--text-secondary)] text-xs">
                Cryptographic verification of infrastructure interventions.
                {govResponse ? ` Post-2023 flood response: ${totalSpending} allocated.` : ''}
              </p>
            </div>

            {/* Selected Intervention or Gov Response Overview */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 rounded-2xl shadow-sm transition-colors">
              {selectedIntervention ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-[var(--color-natural-green)]" />
                        <span className="text-[10px] uppercase font-bold text-[var(--color-natural-green)] tracking-wider">
                          {selectedIntervention.work_order_id || 'INTERVENTION'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedIntervention.description || 'Intervention Details'}</h2>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide ${
                      selectedIntervention.status === 'completed' ? 'bg-[var(--color-soft-green)] text-[var(--color-natural-green)] border border-[var(--color-natural-green)]/30' :
                      selectedIntervention.status === 'in_progress' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}>
                      {(selectedIntervention.status || 'UNKNOWN').toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-app)] p-3 border border-[var(--border-subtle)] rounded-xl">
                      <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Type</span>
                      <span className="text-xs font-mono text-[var(--text-primary)] capitalize">{selectedIntervention.type}</span>
                    </div>
                    {selectedIntervention.cost_estimate && (
                      <div className="bg-[var(--bg-app)] p-3 border border-[var(--border-subtle)] rounded-xl">
                        <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Cost Estimate</span>
                        <span className="text-xs font-mono text-[var(--text-primary)]">₹{selectedIntervention.cost_estimate.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedIntervention.waterway_osm_id && (
                      <div className="bg-[var(--bg-app)] p-3 border border-[var(--border-subtle)] rounded-xl col-span-2">
                        <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Linked Waterway</span>
                        <span className="text-xs font-mono text-[var(--color-primary)]">{selectedIntervention.waterway_osm_id}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] tracking-wider">GOVERNMENT RESPONSE</span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">Post-2023 Flood Response</h2>
                    </div>
                    <span className="bg-[var(--color-soft-blue)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 px-3 py-1 rounded-full text-xs font-mono font-semibold">{totalSpending}</span>
                  </div>
                  {govResponse && (
                    <div className="grid grid-cols-2 gap-3">
                      {pumpingStations.constructed !== undefined && (
                        <div className="bg-[var(--bg-app)] p-3 border border-[var(--border-subtle)] rounded-xl">
                          <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Pump Stations Built</span>
                          <span className="text-xs font-mono text-[var(--color-natural-green)]">{pumpingStations.constructed}</span>
                        </div>
                      )}
                      {pumpingStations.planned !== undefined && (
                        <div className="bg-[var(--bg-app)] p-3 border border-[var(--border-subtle)] rounded-xl">
                          <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Planned</span>
                          <span className="text-xs font-mono text-[var(--text-primary)]">{pumpingStations.planned}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Blockchain Proof */}
            <div className="bg-[var(--bg-surface)] p-6 rounded-2xl flex-1 flex flex-col border border-[var(--border-subtle)] shadow-sm relative overflow-hidden text-[var(--text-primary)] transition-colors">
              <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-subtle)] pb-4">
                <ShieldCheck className="w-5 h-5 text-[var(--color-natural-green)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Consensus & Cryptographic Proof</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
                <div className="bg-[var(--bg-app)] p-4 rounded-xl border border-[var(--border-subtle)] mb-6">
                  <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">Immutable Ledger Hash Record</span>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs text-[var(--color-primary)] font-semibold break-all p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] select-all">
                    <code>{selectedIntervention ? `0x${selectedIntervention._id || 'pending'}` : '0x_awaiting_intervention_data'}</code>
                    <button onClick={() => handleCopy(selectedIntervention?._id || '')} className="text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors shrink-0">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Total Interventions</span>
                    <span className="text-xs font-mono text-[var(--text-primary)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-natural-green)] animate-pulse"></span>
                      {interventions.length} records
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Citizen Reports</span>
                    <span className="text-xs font-mono text-[var(--color-primary)]">{citizenReports.length} submitted</span>
                  </div>
                </div>
                <button onClick={handleVerify} disabled={verifying} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white transition-all text-xs font-bold rounded-xl uppercase tracking-wider shadow-sm">
                  {verifying ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Verifying Hash...</span>
                  ) : (
                    <><span>Inspect on Blockchain Explorer</span><ExternalLink className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline from Interventions */}
          <div className="lg:w-[380px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 flex flex-col shadow-sm transition-colors text-[var(--text-primary)]">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-primary)]" />
              {interventions.length > 0 ? 'Intervention Records' : 'Lifecycle Verification'}
            </h3>
            
            <div className="relative flex-1 pl-4 pt-2 overflow-y-auto custom-scrollbar pr-2">
              <div className="absolute left-[7px] top-4 bottom-4 w-px bg-[var(--border-subtle)]"></div>
              
              <div className="space-y-4 relative z-10 pb-4">
                {interventions.length > 0 ? interventions.map((intv: any, idx: number) => {
                  const isCompleted = intv.status === 'completed';
                  return (
                    <div key={intv._id || idx} className="relative cursor-pointer bg-[var(--bg-app)] p-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary)]/40 transition-colors" onClick={() => setSelectedIntervention(intv)}>
                      <div className={`absolute -left-4 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] top-3 ${isCompleted ? 'bg-[var(--color-natural-green)]' : 'bg-[var(--color-primary)]'}`}></div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1 gap-1">
                        <h4 className={`text-xs font-bold ${isCompleted ? 'text-[var(--color-natural-green)]' : 'text-[var(--text-primary)]'}`}>
                          {intv.work_order_id || intv.description?.slice(0, 35) || 'Intervention'}
                        </h4>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                          {intv.created_at ? new Date(intv.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">{intv.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded ${
                          isCompleted ? 'bg-[var(--color-soft-green)] text-[var(--color-natural-green)]' :
                          intv.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                          'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                        }`}>
                          {(intv.status || '').toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] capitalize">{intv.type}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-xs text-[var(--text-secondary)]">No interventions yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
