import { useState, useCallback } from 'react'
import { ArrowRight, ArrowUpRight, Droplet, Map, CloudRain, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GeoTransition from './GeoTransition'

const telemetryFeatures = [
  {
    index: '01',
    category: 'HYDRAULIC',
    icon: Droplet,
    label: 'Drainage',
    metric: '3,420 km Mapped',
    status: 'Flow Vectors Active',
    path: '/drainage',
  },
  {
    index: '02',
    category: 'METEOROLOGY',
    icon: CloudRain,
    label: 'Rainwater',
    metric: '18 Sensor Catchments',
    status: 'Precipitation Live',
    path: '/rainfall',
  },
  {
    index: '03',
    category: 'GEOSPATIAL',
    icon: Map,
    label: 'Topography',
    metric: '1m DEM Elevation',
    status: 'Contours & Slopes',
    path: '/topography',
  },
  {
    index: '04',
    category: 'IMMUTABLE AUDIT',
    icon: ShieldCheck,
    label: 'CivicProof Ledger',
    metric: '100% Verified Blocks',
    status: 'Cryptographic Record',
    path: '/civic-proof',
  },
]

export default function Hero() {
  const [showTransition, setShowTransition] = useState(false)
  const navigate = useNavigate()

  const handleAccessSystem = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setShowTransition(true)
  }, [])

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-900">
      {/* GeoTransition overlay */}
      {showTransition && (
        <GeoTransition onComplete={() => setShowTransition(false)} />
      )}

      {/* Real-world Hero Background (Drainage / Green Stream style) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('/irrigation_canal.png')`,
          backgroundPosition: 'left 75%',
          transform: 'scaleX(-1)',
          filter: 'brightness(0.9) contrast(1.1) saturate(1.1)'
        }}
      />

      {/* Professional institutional Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/95" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 sm:px-8 lg:px-16 xl:px-24 mx-auto w-full max-w-7xl pt-8 pb-4">

        {/* Header Branding */}
        <div className="flex items-center gap-4 sm:gap-5 mb-8">
          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-900/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent pointer-events-none group-hover:opacity-75 transition-opacity"></div>

            {/* Custom SVG Logo */}
            <svg className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8 C 25 38, 15 55, 15 70 C 15 88, 30 95, 50 95 C 70 95, 85 88, 85 70 C 85 55, 75 38, 50 8 Z" fill="url(#waterGrad)" />
              <path d="M 15 65 Q 50 40, 85 65 L 85 80 Q 50 55, 15 80 Z" fill="white" opacity="0.95" />
              <path d="M 30 60 L 30 80 M 50 50 L 50 70 M 70 60 L 70 80" stroke="white" strokeWidth="5" strokeLinecap="round" />
              <circle cx="50" cy="28" r="6" fill="white" opacity="0.8" />
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-xs sm:text-sm font-bold tracking-[0.25em] text-emerald-400 uppercase font-sans leading-tight">
              Department of Water Resources
            </h2>
            <p className="text-slate-300 text-[10px] sm:text-xs font-medium tracking-widest mt-1 opacity-90 border-l-2 border-emerald-500/50 pl-2">
              Hydro-Informatics Command Center
            </p>
          </div>
        </div>

        {/* Huge Title */}
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1] drop-shadow-xl font-sans mb-5 transition-transform">
            JAL SETU
          </h1>

          {/* Subtitle Badge */}
          <div className="inline-flex items-center rounded-r-full rounded-l-md bg-emerald-500/15 border-l-4 border-emerald-400 backdrop-blur-md px-4 py-1.5 sm:py-2 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="w-2 h-2 rounded-full bg-emerald-300 mr-2.5 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-emerald-200 uppercase">
              Urban Drainage & Topography Intelligence
            </p>
          </div>

          <p className="max-w-2xl text-sm sm:text-base font-normal leading-relaxed text-slate-200 drop-shadow-md mb-8">
            A unified enterprise platform providing comprehensive visibility into localized topography, hydrological telemetry, and high-fidelity drainage mapping across regional zones.
          </p>

          <button onClick={handleAccessSystem} className="group inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden relative transform hover:-translate-y-0.5 cursor-pointer">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-xl opacity-20 bg-gradient-to-b from-white/40 via-transparent to-black/60 pointer-events-none"></span>
            <span className="relative uppercase tracking-[0.2em]">Access System</span>
            <ArrowRight className="relative w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>

        {/* Telemetry Console Cards (Command-Center Industrial Design) */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full max-w-[90rem]">
          {telemetryFeatures.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                onClick={() => navigate(item.path)}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:bg-slate-850 hover:border-emerald-500/50 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45),0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-1 cursor-pointer overflow-hidden"
              >
                {/* Top Subtle Hover Accent Light */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-400 transition-all duration-500" />
                
                {/* Top Meta Line */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-emerald-400 tracking-wider">
                      {item.index}
                    </span>
                    <span className="text-[9px] font-mono font-medium text-slate-400 tracking-widest uppercase border-l border-slate-700/70 pl-2">
                      {item.category}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/50 group-hover:text-emerald-300 transition-all duration-300">
                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="mb-3">
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                    {item.label}
                  </h3>
                  <div className="text-xs font-mono font-medium text-slate-300 mt-1">
                    {item.metric}
                  </div>
                </div>

                {/* Footer Status Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-300 tracking-wide">
                      {item.status}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
