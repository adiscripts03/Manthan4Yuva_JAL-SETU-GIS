import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, HelpCircle, Activity, Droplet, Map, BarChart, ShieldCheck, X } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const [liveSensors, setLiveSensors] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { name: 'Drainage', path: '/drainage', icon: Droplet },
    { name: 'Rainfall', path: '/rainfall', icon: Activity },
    { name: 'Topography', path: '/topography', icon: Map },
    { name: 'Reports', path: '/reports', icon: BarChart },
    { name: 'CivicProof Ledger', path: '/civic-proof', icon: ShieldCheck },
  ];

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] z-50 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 shadow-2xl flex-col py-6 gap-6 justify-between transition-all">
        {/* Header Branding */}
        <div className="px-6 pb-6 border-b border-white/10 flex flex-col items-center gap-3">
          <div className="h-14 w-14 bg-slate-800/80 rounded-xl flex items-center justify-center border border-teal-500/30 overflow-hidden shadow-inner group cursor-pointer hover:bg-slate-800 transition-colors" title="JAL SETU">
            <svg className="w-8 h-8 drop-shadow-md group-hover:scale-110 transition-transform" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8 C 25 38, 15 55, 15 70 C 15 88, 30 95, 50 95 C 70 95, 85 88, 85 70 C 85 55, 75 38, 50 8 Z" fill="url(#waterGradSide)"/>
              <path d="M 15 65 Q 50 40, 85 65 L 85 80 Q 50 55, 15 80 Z" fill="white" opacity="0.95"/>
              <path d="M 30 60 L 30 80 M 50 50 L 50 70 M 70 60 L 70 80" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="waterGradSide" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="text-[11px] font-bold tracking-[0.2em] text-teal-400 uppercase font-sans hover:text-teal-300">Command Center</Link>
            <p className="text-slate-400 text-[9px] font-medium tracking-widest mt-1 opacity-80 uppercase">Hydraulic Sys.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 px-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-semibold tracking-wide transition-all ${active ? 'bg-teal-500/15 text-teal-300 border-l-2 border-teal-400 shadow-[inset_2px_0_0_rgba(45,212,191,0.5)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'} `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-5 flex flex-col gap-3 pb-4 border-t border-white/10 pt-6 mt-auto">
          <button onClick={() => setLiveSensors(!liveSensors)} className={`w-full border rounded-lg py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-2 mb-2 ${liveSensors ? 'bg-teal-500/10 border-teal-500/40 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${liveSensors ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse' : 'bg-slate-600'}`}></span> 
            {liveSensors ? 'Live Sensors On' : 'Sensors Offline'}
          </button>
          
          <div className="flex flex-col gap-1 -mx-2">
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-xs font-medium tracking-wide">
              <Settings className="w-4 h-4" /> System Settings
            </button>
            <button onClick={() => setSupportOpen(true)} className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-xs font-medium tracking-wide">
              <HelpCircle className="w-4 h-4" /> Operator Support
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-teal-400"/> General Settings</h3>
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-semibold text-slate-400 mb-1 block">Map Data Source</label>
                 <select className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-200 p-2 rounded-lg outline-none focus:border-teal-500">
                    <option>CartoDB Dark Matter</option>
                    <option>OpenStreetMap Topo</option>
                    <option>Satellite High-Res</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs font-semibold text-slate-400 mb-1 block">Telemetry Polling Rate (ms)</label>
                 <input type="number" defaultValue={2000} className="w-full bg-slate-800 border border-slate-700 text-sm text-slate-200 p-2 rounded-lg outline-none focus:border-teal-500" />
               </div>
               <div className="flex items-center gap-3 mt-2">
                 <input type="checkbox" id="alerts" defaultChecked className="w-4 h-4 accent-teal-500" />
                 <label htmlFor="alerts" className="text-sm font-medium text-slate-300">Enable Priority Alerts</label>
               </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors font-semibold shadow-md">Save Config</button>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {supportOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col items-center text-center">
            <button onClick={() => setSupportOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5"/>
            </button>
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6 text-blue-400"/>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Operator Support</h3>
            <p className="text-sm text-slate-400 mb-6">Need assistance with the Hydraulic Intelligence system? Contact the central engineering team.</p>
            <button onClick={() => setSupportOpen(false)} className="w-full py-2.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold shadow-md mb-2">Initiate Live Chat</button>
            <button onClick={() => setSupportOpen(false)} className="w-full py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700">View Documentation</button>
          </div>
        </div>
      )}
    </>
  );
}
