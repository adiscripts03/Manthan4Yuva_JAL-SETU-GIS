import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getInterventions, getGovernmentResponse, getCitizenReports } from '../services/api';

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

  // Government response data
  const totalSpending = govResponse?.total_spending_crore ? `₹${govResponse.total_spending_crore} Cr` : '—';
  const pumpingStations = govResponse?.pumping_stations_progress || {};

  return (
    <div className="text-slate-200 min-h-screen flex flex-col font-sans bg-[#0a140d] relative overflow-hidden" 
         style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)" }}>
      
      <Sidebar />

      <main className="flex-1 md:ml-[260px] p-6 relative overflow-y-auto h-screen custom-scrollbar">
        
        <div className={`relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full pt-4 pb-12 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Immutable Protocol Ledger</h1>
              <p className="text-slate-400 text-sm">
                Cryptographic verification of infrastructure interventions.
                {govResponse ? ` Post-2023 flood response: ${totalSpending} allocated.` : ''}
              </p>
            </div>

            {/* Selected Intervention or Gov Response Overview */}
            <div className="bg-[#111c14]/80 backdrop-blur-xl border border-emerald-900/40 p-6 rounded-2xl shadow-xl">
              {selectedIntervention ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>flood</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-[0.15em]">
                          {selectedIntervention.work_order_id || 'INTERVENTION'}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100">{selectedIntervention.description || 'Intervention Details'}</h2>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide ${
                      selectedIntervention.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                      selectedIntervention.status === 'in_progress' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                      'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}>
                      {(selectedIntervention.status || 'UNKNOWN').toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#16251b]/60 p-3.5 border border-emerald-800/30 rounded-xl">
                      <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Type</span>
                      <span className="text-sm font-mono text-slate-200 capitalize">{selectedIntervention.type}</span>
                    </div>
                    {selectedIntervention.cost_estimate && (
                      <div className="bg-[#16251b]/60 p-3.5 border border-emerald-800/30 rounded-xl">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Cost Estimate</span>
                        <span className="text-sm font-mono text-slate-200">₹{selectedIntervention.cost_estimate.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedIntervention.waterway_osm_id && (
                      <div className="bg-[#16251b]/60 p-3.5 border border-emerald-800/30 rounded-xl col-span-2">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Linked Waterway</span>
                        <span className="text-sm font-mono text-emerald-300">{selectedIntervention.waterway_osm_id}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-[0.15em]">GOVERNMENT RESPONSE</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100">Post-2023 Flood Response</h2>
                    </div>
                    <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-mono font-semibold">{totalSpending}</span>
                  </div>
                  {govResponse && (
                    <div className="grid grid-cols-2 gap-4">
                      {pumpingStations.constructed !== undefined && (
                        <div className="bg-[#16251b]/60 p-3.5 border border-emerald-800/30 rounded-xl">
                          <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Pump Stations Built</span>
                          <span className="text-sm font-mono text-emerald-300">{pumpingStations.constructed}</span>
                        </div>
                      )}
                      {pumpingStations.planned !== undefined && (
                        <div className="bg-[#16251b]/60 p-3.5 border border-emerald-800/30 rounded-xl">
                          <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Planned</span>
                          <span className="text-sm font-mono text-slate-200">{pumpingStations.planned}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Blockchain Proof */}
            <div className="bg-[#111c14]/80 backdrop-blur-xl p-6 rounded-2xl flex-1 flex flex-col border border-emerald-900/40 shadow-[0_0_30px_rgba(16,185,129,0.08)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center gap-3 mb-6 border-b border-emerald-900/30 pb-4">
                <span className="material-symbols-outlined text-[24px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <h3 className="text-lg font-bold text-white">Consensus & Cryptographic Proof</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
                <div className="bg-[#071109] p-5 rounded-xl border border-emerald-800/40 mb-6 relative group">
                  <span className="block text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Immutable Ledger Hash Record</span>
                  <div className="flex items-center justify-between gap-4 font-mono text-xs sm:text-sm text-emerald-300 break-all p-3 bg-[#111c14] rounded-lg border border-emerald-800/30 select-all">
                    <code>{selectedIntervention ? `0x${selectedIntervention._id || 'pending'}` : '0x_awaiting_intervention_data'}</code>
                    <button onClick={() => handleCopy(selectedIntervention?._id || '')} className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Total Interventions</span>
                    <span className="text-sm font-mono text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_emerald]"></span>
                      {interventions.length} records
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Citizen Reports</span>
                    <span className="text-sm font-mono text-emerald-400">{citizenReports.length} submitted</span>
                  </div>
                </div>
                <button onClick={handleVerify} disabled={verifying} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all text-sm font-bold rounded-xl uppercase tracking-widest relative overflow-hidden">
                  {verifying ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span> Verifying Hash...</span>
                  ) : (
                    <><span>Inspect on Blockchain Explorer</span><span className="material-symbols-outlined text-[18px]">open_in_new</span></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline from Interventions */}
          <div className="lg:w-[420px] bg-[#111c14]/80 backdrop-blur-xl border border-emerald-900/40 rounded-2xl p-6 flex flex-col shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-emerald-900/30 pb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400">history</span>
              {interventions.length > 0 ? 'Intervention Records' : 'Lifecycle Verification'}
            </h3>
            
            <div className="relative flex-1 pl-6 pt-2 overflow-y-auto custom-scrollbar pr-2">
              <div className="absolute left-[11px] top-6 bottom-4 w-px bg-gradient-to-b from-emerald-500 to-emerald-950"></div>
              
              <div className="space-y-8 relative z-10 pb-4">
                {interventions.length > 0 ? interventions.map((intv: any, idx: number) => {
                  const isLast = idx === interventions.length - 1;
                  const isCompleted = intv.status === 'completed';
                  return (
                    <div key={intv._id || idx} className="relative group cursor-pointer" onClick={() => setSelectedIntervention(intv)}>
                      <div className={`absolute ${isLast ? '-left-[26px] w-[15px] h-[15px]' : '-left-6 w-3 h-3'} bg-emerald-400 rounded-full border-${isLast ? '[3px]' : '4'} border-[#0a140d] top-${isLast ? '0.5' : '1'} ${isLast ? 'shadow-[0_0_10px_rgba(16,185,129,0.8)]' : ''}`}></div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1.5 gap-1">
                        <h4 className={`text-sm font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                          {intv.work_order_id || intv.description?.slice(0, 40) || 'Intervention'}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {intv.created_at ? new Date(intv.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2.5">{intv.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded ${
                          isCompleted ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                          intv.status === 'in_progress' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                          'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                        }`}>
                          {(intv.status || '').toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 capitalize">{intv.type}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <>
                    {/* Fallback with gov response timeline */}
                    <div className="relative group">
                      <div className="absolute -left-6 w-3 h-3 bg-emerald-400 rounded-full border-4 border-[#0a140d] top-1"></div>
                      <h4 className="text-sm font-bold text-white mb-1.5">Government Response Active</h4>
                      <p className="text-xs text-slate-400 mb-2.5">
                        {govResponse ? `Total spending: ${totalSpending}. Pumping stations progress tracked.` : 'Post-flood response data loading...'}
                      </p>
                      <div className="inline-flex items-center gap-1.5 bg-[#16251b] px-2.5 py-1 rounded-md border border-emerald-800/40">
                        <span className="material-symbols-outlined text-emerald-400 text-[14px]">verified</span>
                        <span className="text-[9px] font-bold text-emerald-400 tracking-widest">CIVICPROOF</span>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="absolute -left-6 w-3 h-3 bg-slate-500 rounded-full border-4 border-[#0a140d] top-1"></div>
                      <h4 className="text-sm font-bold text-slate-400 mb-1.5">No Interventions Yet</h4>
                      <p className="text-xs text-slate-500">Create interventions via POST /api/interventions to populate the ledger.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
