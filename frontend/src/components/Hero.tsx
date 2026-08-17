import { useState, useCallback } from 'react'
import { ArrowRight, Droplet, Map, CloudRain, ShieldCheck } from 'lucide-react'
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

      {/* Hero Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none filter brightness-90 contrast-105"
      >
        <source src="/textures/create_a_video_for_me_like_im.mp4" type="video/mp4" />
      </video>

      {/* Professional institutional Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/95" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 sm:px-8 lg:px-16 xl:px-24 mx-auto w-full max-w-7xl pt-8 pb-4">

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

        {/* Telemetry Console Cards (Informational Only) */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full max-w-[90rem]">
          {telemetryFeatures.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Top Subtle Accent Light */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

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
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="mb-3">
                  <h3 className="text-base font-bold text-white tracking-tight">
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
                    <span className="text-[10px] font-mono text-slate-400 tracking-wide">
                      {item.status}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">INFO</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
