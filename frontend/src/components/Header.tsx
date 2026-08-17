export default function Header() {
  return (
    <header className="relative z-20 w-full border-b border-white/10 bg-gis-dark/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="JAL SETU Logo" className="h-10 w-auto object-contain mix-blend-screen" />
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
              JAL SETU
            </span>
            <span className="text-[10px] tracking-wider text-white/50 uppercase font-mono">
              Nagpur GIS Network
            </span>
          </div>
        </div>


      </div>
    </header>
  )
}
