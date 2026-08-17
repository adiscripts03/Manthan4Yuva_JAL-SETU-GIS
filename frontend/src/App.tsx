import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Hero from './components/Hero';
import RainfallIntelligence from './pages/RainfallIntelligence';
import DrainageNetwork from './pages/DrainageNetwork';
import CivicProofLedger from './pages/CivicProofLedger';
import AnalyticalReports from './pages/AnalyticalReports';
import TopographyIntelligence from './pages/TopographyIntelligence';
import MapSyncChatbot from './components/MapSyncChatbot';

export default function App() {
  const [globalSearch, setGlobalSearch] = useState('');

  const handleGlobalSearch = (query: string) => {
    setGlobalSearch(query);
    window.dispatchEvent(new CustomEvent('global_search_sync', { detail: query }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors">
      <TopBar onSearch={handleGlobalSearch} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/" element={
            <main className="flex flex-1 flex-col overflow-hidden w-full h-full">
              <Hero />
            </main>
          } />
          <Route path="/rainfall" element={<RainfallIntelligence />} />
          <Route path="/drainage" element={<DrainageNetwork searchFilter={globalSearch} />} />
          <Route path="/topography" element={<TopographyIntelligence />} />
          <Route path="/civic-proof" element={<CivicProofLedger />} />
          <Route path="/reports" element={<AnalyticalReports />} />
        </Routes>
      </div>

      <MapSyncChatbot />
    </div>
  );
}
