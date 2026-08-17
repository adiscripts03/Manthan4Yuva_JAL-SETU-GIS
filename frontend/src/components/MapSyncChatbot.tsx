import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';

export default function MapSyncChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hi! I am the Map Sync Agent. Describe a condition (e.g. "Show me the condition of Manish Nagar" or "Pili Nadi rainfall is 40mm") and I will instantly project it onto the map for you!' }
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
        // Explicitly force mapping intent
        body: JSON.stringify({ query: userMsg, forced_intent: 'data_upload' })
      });
      const data = await res.json();
      
      let aiResponseText = "";
      if (data.success) {
         aiResponseText = `✅ ${data.summary || 'Command processed and map synchronized.'}`;
         if (data.result) {
            const synthData = {
              ...data.result,
              synthetic_markers: [
                { id: "ai_mark_1", lat: 21.1065, lng: 79.0658, desc: "AI Detected Area of Interest" } // Approximate Manish Nagar coordinates
              ]
            };
            window.dispatchEvent(new CustomEvent('ai_map_sync', { detail: synthData }));
            if (!window.location.pathname.includes('/drainage')) {
               window.location.href = '/drainage';
            }
         }
      } else {
        aiResponseText = `❌ Error: ${data.error?.message || 'Processing failed.'}`;
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponseText }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Network error: Platform unreachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 bg-[#0b140f] border border-emerald-900/50 rounded-2xl w-[350px] h-[450px] flex flex-col shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#132017]/90 border-b border-emerald-900/40 p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 rounded-full text-emerald-400">
                <MapPin size={16} />
              </div>
              <h3 className="text-white text-sm font-bold tracking-wide">Map Intelligence Agent</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-[#192a1e] p-1.5 rounded-lg border border-emerald-800/30">
              <X size={16}/>
            </button>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-[#0b140f]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`p-2.5 rounded-xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-[#142319] text-slate-200 border border-emerald-800/40 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex self-start max-w-[85%]">
                 <div className="p-3 rounded-xl bg-[#142319] border border-emerald-800/40 rounded-tl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
                 </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#132017] border-t border-emerald-900/40 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input 
                 type="text"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Command map sync..."
                 className="flex-1 bg-[#0b140f] border border-emerald-800/40 text-xs text-slate-200 px-3 py-2.5 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                 disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !query.trim()}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1a291f] disabled:text-slate-500 text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${isOpen ? 'bg-[#132017] text-emerald-400 border border-emerald-500/50' : 'bg-emerald-500 text-slate-900 border-2 border-emerald-400/50 hover:bg-emerald-400 glow-pulse'}`}
      >
        <MapPin size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
