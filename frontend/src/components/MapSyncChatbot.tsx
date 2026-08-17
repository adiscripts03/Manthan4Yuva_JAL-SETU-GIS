import React, { useState } from 'react';
import { X, MapPin, Send } from 'lucide-react';

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
                { id: "ai_mark_1", lat: 21.1065, lng: 79.0658, desc: "AI Detected Area of Interest" }
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
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Network error: Platform unreachable Service unavailable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-[350px] h-[450px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 transition-colors">
          {/* Header */}
          <div className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center bg-[var(--color-soft-blue)] rounded-full text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] text-xs font-bold tracking-wide">Map Intelligence Agent</h3>
                <span className="text-[9px] text-[var(--color-natural-green)] font-semibold uppercase">Online</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-app)] p-1.5 rounded-lg border border-[var(--border-subtle)]"
            >
              <X size={15}/>
            </button>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar bg-[var(--bg-app)]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`p-3 rounded-xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-[var(--color-primary)] text-white rounded-tr-sm font-medium' 
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex self-start max-w-[85%]">
                 <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-tl-sm flex items-center gap-1.5">
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
                 placeholder="Command map sync..."
                 className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] px-3 py-2 rounded-lg outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--text-muted)]"
                 disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !query.trim()}
                className="w-9 h-9 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--border-strong)] disabled:text-[var(--text-muted)] text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Map Intelligence Agent"
        className={`w-13 h-13 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-[var(--bg-surface)] text-[var(--color-primary)] border border-[var(--border-subtle)]' 
            : 'bg-[var(--color-primary)] text-white border-2 border-white/20 hover:bg-[var(--color-primary-hover)]'
        }`}
      >
        <MapPin size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
