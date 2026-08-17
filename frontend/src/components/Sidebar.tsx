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

  const handleThemeSelect = (mode: string) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  };

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-14 h-[calc(100vh-56px)] w-[240px] z-30 bg-[var(--bg-surface-translucent)] backdrop-blur-md border-r border-[var(--border-subtle)] shadow-sm flex-col py-4 justify-between transition-colors">
        
        {/* Navigation Rail */}
        <div className="flex flex-col gap-1 px-3">
          <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            GIS Modules
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    active 
                      ? 'bg-[var(--color-soft-blue)] text-[var(--color-primary)] font-bold shadow-sm' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="px-3 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-1">
          <button 
            onClick={() => setSettingsOpen(true)} 
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors text-xs font-medium"
          >
            <Settings className="w-4 h-4 text-[var(--text-muted)]" /> 
            <span>System Settings</span>
          </button>
          <button 
            onClick={() => setSupportOpen(true)} 
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors text-xs font-medium"
          >
            <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" /> 
            <span>Operator Support</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-[var(--text-primary)]">
            <button onClick={() => setSettingsOpen(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
              <Settings className="w-4 h-4 text-[var(--color-primary)]"/> System Settings
            </h3>
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Appearance Theme</label>
                 <select 
                   className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] p-2.5 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors" 
                   defaultValue={(localStorage.getItem('theme') as string) || 'light'}
                   onChange={(e) => handleThemeSelect(e.target.value)}
                 >
                    <option value="light">Light Theme (Crisp Civic)</option>
                    <option value="dark">Dark Theme (Command Center)</option>
                 </select>
               </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Close</button>
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg transition-colors font-semibold shadow-sm">Save Preferences</button>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {supportOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg h-[580px] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--color-soft-blue)] rounded-full flex items-center justify-center border border-[var(--color-primary)]/20">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">smart_toy</span>
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-bold text-sm tracking-wide">JalSetu AI Support Agent</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-natural-green)] animate-pulse"></span>
              <span className="text-[10px] text-[var(--color-natural-green)] font-medium uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-lg">
          <X className="w-4 h-4"/>
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-[var(--bg-app)]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
            <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' 
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-sm'
            }`}>
              {msg.text}
              {msg.link && (
                <a href={msg.link} target="_blank" rel="noopener noreferrer" className="mt-2.5 block w-full py-2 px-3 text-center bg-[var(--color-soft-blue)] hover:opacity-90 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg font-medium transition-colors">
                  View Live Email Preview
                </a>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex self-start max-w-[85%]">
             <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-tl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
             type="text"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Type a concern or paste report data..."
             className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] px-3 py-2.5 rounded-xl outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-muted)]"
             disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="w-10 h-10 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--border-strong)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
