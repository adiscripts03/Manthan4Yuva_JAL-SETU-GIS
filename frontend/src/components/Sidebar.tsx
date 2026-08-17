import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, HelpCircle, Activity, Droplet, Map, BarChart, ShieldCheck, X } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
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
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] z-50 bg-[#0b140f]/95 backdrop-blur-xl border-r border-emerald-900/40 shadow-2xl flex-col py-6 gap-6 justify-between transition-all">
        {/* Header Branding */}
        <div className="px-6 pb-6 border-b border-emerald-900/30 flex flex-col items-center gap-3">
          <div className="h-14 w-14 bg-[#132017] rounded-xl flex items-center justify-center border border-emerald-500/30 overflow-hidden shadow-inner group cursor-pointer hover:bg-[#1a2b1f] transition-colors" title="JAL SETU">
            <svg className="w-8 h-8 drop-shadow-md group-hover:scale-110 transition-transform" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8 C 25 38, 15 55, 15 70 C 15 88, 30 95, 50 95 C 70 95, 85 88, 85 70 C 85 55, 75 38, 50 8 Z" fill="url(#waterGradSide)"/>
              <path d="M 15 65 Q 50 40, 85 65 L 85 80 Q 50 55, 15 80 Z" fill="white" opacity="0.95"/>
              <path d="M 30 60 L 30 80 M 50 50 L 50 70 M 70 60 L 70 80" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="waterGradSide" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="text-[13px] font-bold tracking-[0.15em] text-emerald-400 uppercase font-sans hover:text-emerald-300">JAL-SETU-GIS</Link>
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-semibold tracking-wide transition-all ${active ? 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400 shadow-[inset_2px_0_0_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:bg-emerald-950/30 hover:text-slate-200'} `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-5 flex flex-col gap-3 pb-4 border-t border-emerald-900/30 pt-6 mt-auto">
          <div className="flex flex-col gap-1 -mx-2">
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-emerald-950/30 hover:text-slate-200 transition-colors text-xs font-medium tracking-wide">
              <Settings className="w-4 h-4" /> System Settings
            </button>
            <button onClick={() => setSupportOpen(true)} className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-emerald-950/30 hover:text-slate-200 transition-colors text-xs font-medium tracking-wide">
              <HelpCircle className="w-4 h-4" /> Operator Support
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b140f] border border-emerald-900/40 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-400"/> System Settings</h3>
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-semibold text-slate-400 mb-1 block">Theme Mode</label>
                 <select className="w-full bg-[#132017] border border-emerald-800/40 text-sm text-slate-200 p-2 rounded-lg outline-none focus:border-emerald-500" defaultValue="dark">
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                 </select>
               </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-semibold shadow-md">Save Config</button>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {supportOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <AgentChatModal onClose={() => setSupportOpen(false)} />
        </div>
      )}
    </>
  );
}

function AgentChatModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string, link?: string}[]>([
    { role: 'ai', text: 'Hello! I am the JalSetu AI engine. I can automatically escalate support tickets to engineering, or map raw GIS reports directly to the screen. Paste your report or issue below!' }
  ]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;
    
    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5050/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, forced_intent: 'support' })
      });
      const data = await res.json();
      
      let aiResponseText = "";
      let previewLink = undefined;

      if (data.success) {
        previewLink = data.preview_url;
        if (data.intent === 'support') {
           aiResponseText = `✅ ${data.summary || 'Your concern has been drafted and escalated.'}`;
        } else if (data.intent === 'data_upload') {
           aiResponseText = `✅ ${data.summary || 'Data extracted successfully.'}`;
           if (data.result) {
              const synthData = {
                ...data.result,
                synthetic_markers: [
                  { id: "ai_mark_1", lat: 21.1458, lng: 79.0882, desc: "Critical Flooding Zone (AI Predicted)" },
                  { id: "ai_mark_2", lat: 21.1558, lng: 79.0982, desc: "Secondary Blockage Node" }
                ]
              };
              window.dispatchEvent(new CustomEvent('ai_map_sync', { detail: synthData }));
              if (!window.location.pathname.includes('/drainage')) {
                 window.location.href = '/drainage';
              }
           }
        } else {
           aiResponseText = `✅ ${data.summary || 'Query processed.'}`;
        }
        
        if (data.errors && data.errors.length > 0) {
           aiResponseText += `\n⚠️ Partial errors: ${data.errors.join(', ')}`;
        }
      } else {
        aiResponseText = `❌ Error: ${data.error?.message || 'Processing failed. Check backend logs.'}`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponseText, link: previewLink }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Network error: Backend AI service unreachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0b140f] border border-emerald-900/50 rounded-2xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="bg-[#132017]/90 backdrop-blur border-b border-emerald-900/40 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/30">
            <span className="material-symbols-outlined text-emerald-400">smart_toy</span>
          </div>
          <div>
            <h3 className="text-white font-bold tracking-wide">JalSetu AI Agent</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-[#192a1e] p-2 rounded-lg border border-emerald-800/30">
          <X className="w-5 h-5"/>
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0e1b12] to-[#060c08]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
            <div className={`p-3 rounded-2xl text-sm shadow-md whitespace-pre-wrap ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-[#142319] text-slate-200 border border-emerald-800/40 rounded-tl-sm'}`}>
              {msg.text}
              {msg.link && (
                <a href={msg.link} target="_blank" rel="noopener noreferrer" className="mt-3 block w-full py-2 px-3 text-center bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition-colors">
                  View Live Email Preview
                </a>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex self-start max-w-[85%]">
             <div className="p-4 rounded-2xl bg-[#142319] border border-emerald-800/40 rounded-tl-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#132017] border-t border-emerald-900/40 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
             type="text"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Type a concern or paste report data..."
             className="flex-1 bg-[#0b140f] border border-emerald-800/40 text-sm text-slate-200 px-4 py-3 rounded-xl outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
             disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1a291f] disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-lg"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
