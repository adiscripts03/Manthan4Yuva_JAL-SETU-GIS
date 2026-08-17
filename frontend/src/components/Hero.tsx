import { useState, useCallback } from 'react'
import { ArrowRight, Droplet, Map, Radio, Activity } from 'lucide-react'
import GeoTransition from './GeoTransition'

const telemetryFeatures = [
  {
    icon: Droplet,
    label: 'Water Hotspots',
    status: 'Real-time Monitoring',
    color: 'text-blue-400',
    bg: 'bg-blue-400/20 border-blue-400/30',
    iconAnim: 'group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300',
  },
  {
    icon: Map,
    label: 'Drainage Core',
    status: 'Mapped & Verified',
    color: 'text-teal-400',
    bg: 'bg-teal-400/20 border-teal-400/30',
    iconAnim: 'group-hover:scale-110 transition-transform duration-300',
  },
  {
    icon: Radio,
    label: 'Telemetry Nodes',
    status: '48 Active Sensors',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/20 border-cyan-400/30',
    iconAnim: 'group-hover:animate-pulse shadow-[0_0_15px_rgba(34,211,238,0)] group-hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-300 rounded-full',
  },
  {
    icon: Activity,
    label: 'Live Hydrology',
    status: 'Operational',
    color: 'text-sky-400',
    bg: 'bg-sky-400/20 border-sky-400/30',
    iconAnim: 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300',
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

      {/* Real-world Hero Background (Drainage / Green Stream style) */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('/irrigation_canal.png')`,
          backgroundPosition: 'left 75%', // Perfect sweet spot to show both the pipe mouth and rest it near the ground
          transform: 'scaleX(-1)', // Flip horizontally so the pipe on the left moves to the unobstructed right side
          filter: 'brightness(0.9) contrast(1.1) saturate(1.1)' // Keep it vibrant
        }}
      />

      {/* Professional institutional Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950/85 via-slate-900/30 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-slate-950/90" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 sm:px-8 lg:px-16 xl:px-24 mx-auto w-full max-w-7xl pt-8 pb-4">

        {/* Header Branding - Made Prominent */}
        <div className="flex items-center gap-4 sm:gap-5 mb-8">
          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-900/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.2)] relative overflow-hidden group">
            {/* Simple glow effect on logo container */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-transparent pointer-events-none group-hover:opacity-75 transition-opacity"></div>

            {/* Custom Creative SVG Logo (Water Droplet + Bridge Arc) */}
            <svg className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 8 C 25 38, 15 55, 15 70 C 15 88, 30 95, 50 95 C 70 95, 85 88, 85 70 C 85 55, 75 38, 50 8 Z" fill="url(#waterGrad)" />
              <path d="M 15 65 Q 50 40, 85 65 L 85 80 Q 50 55, 15 80 Z" fill="white" opacity="0.95" />
              <path d="M 30 60 L 30 80 M 50 50 L 50 70 M 70 60 L 70 80" stroke="white" strokeWidth="5" strokeLinecap="round" />
              <circle cx="50" cy="28" r="6" fill="white" opacity="0.8" />
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-xs sm:text-sm font-bold tracking-[0.25em] text-teal-300 uppercase font-sans leading-tight">
              Department of Water Resources
            </h2>
            <p className="text-slate-300 text-[10px] sm:text-xs font-medium tracking-widest mt-1 opacity-90 border-l-2 border-teal-500/50 pl-2">
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
          <div className="inline-flex items-center rounded-r-full rounded-l-md bg-teal-500/15 border-l-4 border-teal-400 backdrop-blur-md px-4 py-1.5 sm:py-2 mb-6 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
            <div className="w-2 h-2 rounded-full bg-teal-300 mr-2.5 animate-pulse shadow-[0_0_8px_rgba(94,234,212,0.8)]"></div>
            <p className="text-[11px] sm:text-xs font-bold tracking-widest text-teal-200 uppercase">
              Urban Drainage & Topography Intelligence
            </p>
          </div>

          <p className="max-w-2xl text-sm sm:text-base font-normal leading-relaxed text-slate-200 drop-shadow-md mb-8">
            A unified enterprise platform providing comprehensive visibility into localized topography, hydrological telemetry, and high-fidelity drainage mapping across regional zones.
          </p>

          <button onClick={handleAccessSystem} className="group inline-flex items-center justify-center gap-3 rounded-xl bg-teal-600 px-7 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-teal-500 hover:shadow-[0_0_25px_rgba(13,148,136,0.6)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden relative transform hover:-translate-y-0.5 cursor-pointer">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-xl opacity-20 bg-gradient-to-b from-white/40 via-transparent to-black/60 pointer-events-none"></span>
            <span className="relative uppercase tracking-[0.2em]">Access System</span>
            <ArrowRight className="relative w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>

        {/* Telemetry Status Cards (Standardized) */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-[90rem]">
          {telemetryFeatures.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="group flex items-center p-3 sm:p-4 rounded-xl border border-slate-700/50 bg-slate-900/70 backdrop-blur-xl transition-all duration-300 hover:bg-slate-800/90 hover:border-slate-500/70 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-pointer"
              >
                {/* Dynamic Icon Container */}
                <div className={`mr-3 shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border ${item.bg} transition-all duration-300 shadow-inner`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color} ${item.iconAnim}`} />
                </div>
                {/* Card Text */}
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 group-hover:text-teal-300 mt-0.5 uppercase tracking-wider transition-colors line-clamp-1">
                    {item.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
