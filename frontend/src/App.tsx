import { Routes, Route } from 'react-router-dom';
import Hero from './components/Hero';
import RainfallIntelligence from './pages/RainfallIntelligence';
import DrainageNetwork from './pages/DrainageNetwork';
import CivicProofLedger from './pages/CivicProofLedger';
import AnalyticalReports from './pages/AnalyticalReports';
import TopographyIntelligence from './pages/TopographyIntelligence';
import MapSyncChatbot from './components/MapSyncChatbot';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={
          <div className="flex h-screen w-full flex-col overflow-hidden bg-gis-dark text-white">
            <main className="flex flex-1 flex-col overflow-hidden">
              <Hero />
            </main>
          </div>
        } />
        <Route path="/rainfall" element={<RainfallIntelligence />} />
        <Route path="/drainage" element={<DrainageNetwork />} />
        <Route path="/topography" element={<TopographyIntelligence />} />
        <Route path="/civic-proof" element={<CivicProofLedger />} />
        <Route path="/reports" element={<AnalyticalReports />} />
      </Routes>
      <MapSyncChatbot />
    </>
  )
}
