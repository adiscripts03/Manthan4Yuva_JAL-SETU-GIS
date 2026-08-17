import { useEffect, useRef } from 'react'

interface Point3D {
  x: number
  y: number
  z: number
}

interface Projected {
  x: number
  y: number
  z: number
  scale: number
}

function latLonToXYZ(lat: number, lon: number, r: number): Point3D {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  }
}

function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: p.x * cos + p.z * sin,
    y: p.y,
    z: -p.x * sin + p.z * cos,
  }
}

function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: p.x,
    y: p.y * cos - p.z * sin,
    z: p.y * sin + p.z * cos,
  }
}

function project(
  p: Point3D,
  cx: number,
  cy: number,
  radius: number,
): Projected {
  const scale = 2.2 / (2.2 + p.z)
  return {
    x: cx + p.x * scale * radius,
    y: cy + p.y * scale * radius,
    z: p.z,
    scale,
  }
}

function generateContinentDots(): Point3D[] {
  const dots: Point3D[] = []
  const r = 1

  const regions: [number, number, number, number, number][] = [
    [15, 72, -130, -55, 0.55],
    [-55, 15, -82, -34, 0.5],
    [36, 72, -12, 42, 0.55],
    [-35, 37, -18, 52, 0.5],
    [5, 75, 25, 145, 0.6],
    [-45, -8, 112, 154, 0.5],
    [60, 82, -50, 70, 0.35],
  ]

  for (const [latMin, latMax, lonMin, lonMax, density] of regions) {
    for (let lat = latMin; lat <= latMax; lat += 2.2) {
      for (let lon = lonMin; lon <= lonMax; lon += 2.2) {
        const hash = Math.sin(lat * 127.1 + lon * 311.7) * 43758.5453
        if ((hash - Math.floor(hash)) < density) {
          const jLat = (Math.sin(lat * 53.7) * 0.5) * 0.8
          const jLon = (Math.cos(lon * 29.3) * 0.5) * 0.8
          dots.push(latLonToXYZ(lat + jLat, lon + jLon, r))
        }
      }
    }
  }

  return dots
}

const hubs = [
  { lat: 21.15, lon: 79.09, highlight: true },
  { lat: 28.61, lon: 77.21 },
  { lat: 19.08, lon: 72.88 },
  { lat: 51.51, lon: -0.13 },
  { lat: 40.71, lon: -74.01 },
  { lat: 35.68, lon: 139.69 },
  { lat: -33.87, lon: 151.21 },
  { lat: 1.35, lon: 103.82 },
  { lat: 25.2, lon: 55.27 },
  { lat: -23.55, lon: -46.63 },
  { lat: 48.86, lon: 2.35 },
  { lat: 37.77, lon: -122.42 },
]

interface Arc {
  from: Point3D
  to: Point3D
  progress: number
  speed: number
}

function buildArcs(): Arc[] {
  const pairs: [number, number][] = [
    [0, 1], [0, 2], [0, 8], [1, 4], [2, 5], [3, 6],
    [4, 7], [5, 8], [6, 9], [0, 10], [1, 11], [3, 4],
    [5, 7], [8, 9], [10, 11], [0, 3], [2, 10],
  ]

  return pairs.map(([a, b]) => ({
    from: latLonToXYZ(hubs[a].lat, hubs[a].lon, 1),
    to: latLonToXYZ(hubs[b].lat, hubs[b].lon, 1),
    progress: Math.random(),
    speed: 0.004 + Math.random() * 0.005,
  }))
}

function arcPoint(from: Point3D, to: Point3D, t: number, lift: number): Point3D {
  const x = from.x + (to.x - from.x) * t
  const y = from.y + (to.y - from.y) * t
  const z = from.z + (to.z - from.z) * t
  const len = Math.sqrt(x * x + y * y + z * z) || 1
  const bulge = Math.sin(t * Math.PI) * lift
  const s = (1 + bulge) / len
  return { x: x * s, y: y * s, z: z * s }
}

export default function AnimatedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const continentDots = generateContinentDots()
    const arcs = buildArcs()
    const hubPoints = hubs.map((h) => ({
      point: latLonToXYZ(h.lat, h.lon, 1),
      highlight: h.highlight ?? false,
    }))

    const networkPairs: [number, number][] = []
    for (let i = 0; i < hubPoints.length; i++) {
      for (let j = i + 1; j < hubPoints.length; j++) {
        const a = hubPoints[i].point
        const b = hubPoints[j].point
        const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        if (dist < 1.15) networkPairs.push([i, j])
      }
    }

    const startTime = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, rect.width * dpr)
      canvas.height = Math.max(1, rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w === 0 || h === 0) {
        frameRef.current = requestAnimationFrame(draw)
        return
      }

      const elapsed = (now - startTime) / 1000
      const rotation = elapsed * 0.12
      const tilt = -0.28

      const isMobile = w < 768
      const globeCx = isMobile ? w * 0.5 : w * 0.32
      const globeCy = h * 0.52
      const globeR = Math.min(w * (isMobile ? 0.45 : 0.52), h * 0.46)

      ctx.clearRect(0, 0, w, h)

      const transform = (p: Point3D) => {
        let pt = rotateY(p, rotation)
        pt = rotateX(pt, tilt)
        return project(pt, globeCx, globeCy, globeR)
      }

      // Outer glow
      const glow = ctx.createRadialGradient(
        globeCx, globeCy, globeR * 0.5,
        globeCx, globeCy, globeR * 1.5,
      )
      glow.addColorStop(0, 'rgba(74, 144, 226, 0.18)')
      glow.addColorStop(0.6, 'rgba(74, 144, 226, 0.06)')
      glow.addColorStop(1, 'rgba(74, 144, 226, 0)')
      ctx.beginPath()
      ctx.arc(globeCx, globeCy, globeR * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Sphere outline
      ctx.beginPath()
      ctx.arc(globeCx, globeCy, globeR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(74, 144, 226, 0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Graticule
      for (let lat = -60; lat <= 60; lat += 15) {
        ctx.beginPath()
        let drawing = false
        for (let lon = -180; lon <= 180; lon += 3) {
          const pt = transform(latLonToXYZ(lat, lon, 1))
          if (pt.z > -0.05) {
            if (!drawing) { ctx.moveTo(pt.x, pt.y); drawing = true }
            else ctx.lineTo(pt.x, pt.y)
          } else drawing = false
        }
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.12)'
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      for (let lon = -180; lon < 180; lon += 15) {
        ctx.beginPath()
        let drawing = false
        for (let lat = -80; lat <= 80; lat += 3) {
          const pt = transform(latLonToXYZ(lat, lon, 1))
          if (pt.z > -0.05) {
            if (!drawing) { ctx.moveTo(pt.x, pt.y); drawing = true }
            else ctx.lineTo(pt.x, pt.y)
          } else drawing = false
        }
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.12)'
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      // Continent dots
      const sortedDots = continentDots
        .map((d) => transform(d))
        .filter((d) => d.z > -0.15)
        .sort((a, b) => a.z - b.z)

      for (const pt of sortedDots) {
        const depth = Math.min(1, (pt.z + 0.2) * 1.1)
        const size = (1.4 + depth * 0.8) * pt.scale
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100, 170, 255, ${depth * 0.9})`
        ctx.fill()
      }

      // Network lines between hubs
      for (const [i, j] of networkPairs) {
        const a = transform(hubPoints[i].point)
        const b = transform(hubPoints[j].point)
        if (a.z < -0.05 && b.z < -0.05) continue

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(74, 144, 226, ${Math.min(a.scale, b.scale) * 0.45})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // Animated arcs
      for (const arc of arcs) {
        const fromP = transform(arc.from)
        const toP = transform(arc.to)
        if (fromP.z < -0.3 && toP.z < -0.3) continue

        ctx.beginPath()
        for (let s = 0; s <= 50; s++) {
          const t = s / 50
          const pt = transform(arcPoint(arc.from, arc.to, t, 0.4))
          if (s === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.strokeStyle = `rgba(120, 180, 255, ${Math.max(fromP.scale, toP.scale) * 0.5})`
        ctx.lineWidth = 1.2
        ctx.stroke()

        arc.progress += arc.speed
        if (arc.progress > 1) arc.progress = 0

        const pulse = transform(arcPoint(arc.from, arc.to, arc.progress, 0.4))
        if (pulse.z > -0.1) {
          ctx.beginPath()
          ctx.arc(pulse.x, pulse.y, 3.5 * pulse.scale, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(180, 220, 255, ${pulse.scale})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(pulse.x, pulse.y, 8 * pulse.scale, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(74, 144, 226, ${pulse.scale * 0.35})`
          ctx.fill()
        }
      }

      // Hub nodes
      for (const hub of hubPoints) {
        const p = transform(hub.point)
        if (p.z < -0.05) continue

        const pulse = 0.75 + Math.sin(elapsed * 2.5 + hub.point.x * 3) * 0.25
        const r = hub.highlight ? 5 : 3.5

        ctx.beginPath()
        ctx.arc(p.x, p.y, r * p.scale * pulse, 0, Math.PI * 2)
        ctx.fillStyle = hub.highlight
          ? `rgba(255, 255, 255, ${p.scale})`
          : `rgba(140, 200, 255, ${p.scale * pulse})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, (r + 5) * p.scale, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(74, 144, 226, ${p.scale * 0.25})`
        ctx.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
