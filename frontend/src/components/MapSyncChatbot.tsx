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
        <div className="mb-4 bg-slate-900 border border-teal-500/50 rounded-2xl w-[350px] h-[450px] flex flex-col shadow-[0_0_30px_rgba(20,184,166,0.15)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-slate-800/90 border-b border-teal-500/20 p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-teal-500/20 rounded-full text-teal-400">
                <MapPin size={16} />
              </div>
              <h3 className="text-white text-sm font-bold tracking-wide">Map Intelligence Agent</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg">
              <X size={16}/>
            </button>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-slate-900">
            {messages.map((msg, i) => (
              <div key={i} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`p-2.5 rounded-xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex self-start max-w-[85%]">
                 <div className="p-3 rounded-xl bg-slate-800 border border-slate-700/50 rounded-tl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
                 </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-800 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input 
                 type="text"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Command map sync..."
                 className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2.5 rounded-lg outline-none focus:border-teal-500 transition-colors"
                 disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !query.trim()}
                className="w-10 h-10 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center justify-center transition-colors"
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
        className={`w-14 h-14 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${isOpen ? 'bg-slate-800 text-teal-400 border border-teal-500/50' : 'bg-teal-500 text-slate-900 border-2 border-teal-400/50 hover:bg-teal-400 glow-pulse'}`}
      >
        <MapPin size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
