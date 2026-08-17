import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Search } from 'lucide-react';

interface TopBarProps {
  onSearch?: (query: string) => void;
}

export default function TopBar({ onSearch }: TopBarProps) {
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new CustomEvent('theme_change', { detail: theme }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/drainage': return 'Drainage Infrastructure Network';
      case '/rainfall': return 'Meteorological & Rainfall Telemetry';
      case '/topography': return 'Topography & Flood Risk Model';
      case '/reports': return 'Analytical GIS Reports';
      case '/civic-proof': return 'Immutable CivicProof Protocol Ledger';
      default: return 'Urban GIS Command Center';
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="h-14 bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)] px-4 flex items-center justify-between z-40 shrink-0 transition-colors">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-soft-blue)] border border-[var(--color-primary)]/20 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-[var(--color-primary)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8 C 25 38, 15 55, 15 70 C 15 88, 30 95, 50 95 C 70 95, 85 88, 85 70 C 85 55, 75 38, 50 8 Z" fill="currentColor"/>
              <path d="M 15 65 Q 50 40, 85 65 L 85 80 Q 50 55, 15 80 Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-[var(--text-primary)] font-sans leading-none">
              JAL SETU
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] tracking-wider uppercase mt-0.5">
              Nagpur Flood Intelligence
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2 border-l border-[var(--border-subtle)] pl-4 ml-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Right: Search + Controls + Theme Switcher */}
      <div className="flex items-center gap-3">


        {/* Status indicator */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[var(--color-soft-green)] px-2.5 py-1 rounded-full text-[11px] font-medium text-[var(--color-natural-green)] border border-[var(--color-natural-green)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-natural-green)] animate-pulse"></span>
          <span>Telemetry Active</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="btn-control !w-9 !h-9 text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
}
