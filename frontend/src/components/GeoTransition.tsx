import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, Group, MathUtils, BackSide, Mesh } from 'three';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function EarthController({ phase, setReady }: { phase: number, setReady: (v: boolean) => void }) {
  const earthGroupRef = useRef<Group>(null);
  const atmosphereRef = useRef<Mesh>(null);
  
  // Load texture
  const texture = useLoader(TextureLoader, '/textures/earth.jpg');
  
  useEffect(() => {
    if (texture) {
      setReady(true);
    }
  }, [texture, setReady]);

  useFrame((state) => {
    if (!earthGroupRef.current) return;
    
    let targetCameraZ = 15;
    let targetRotX = 0;
    let targetRotY = 0;
    
    if (phase === 1) {
      targetCameraZ = 8;
      targetRotX = 0.2;
      targetRotY = -0.5; // Somewhere over Africa/Europe
    }
    else if (phase === 2) {
      // Rotate to India
      targetRotY = - (79.0882 * (Math.PI / 180)) - (Math.PI / 2); // Added offset for texture alignment
      targetRotX = (21.1458 * (Math.PI / 180));
      targetCameraZ = 4;
    }
    else if (phase >= 3) {
      // Zoom into Nagpur
      targetRotY = - (79.0882 * (Math.PI / 180)) - (Math.PI / 2);
      targetRotX = (21.1458 * (Math.PI / 180));
      targetCameraZ = 1.05; // Very close to surface (radius 1)
    }

    // Smooth interpolation
    const ease = 0.03;
    state.camera.position.z = MathUtils.lerp(state.camera.position.z, targetCameraZ, ease);
    earthGroupRef.current.rotation.x = MathUtils.lerp(earthGroupRef.current.rotation.x, targetRotX, ease);
    earthGroupRef.current.rotation.y = MathUtils.lerp(earthGroupRef.current.rotation.y, targetRotY, ease);
    
    // Slowly rotate atmosphere for effect
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={earthGroupRef}>
      {/* The Earth */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.1} />
      </mesh>
      
      {/* Atmosphere Glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshBasicMaterial color="#4477ff" transparent opacity={0.15} side={BackSide} blending={2} />
      </mesh>
    </group>
  );
}

export default function GeoTransition({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const runSequence = async () => {
      // Phase 0: Fade in overlay
      setStatusText('ESTABLISHING SECURE CONNECTION...');
      await sleep(800);
      
      // Phase 1: Show Earth
      setPhase(1);
      setStatusText('ACCESSING GEOSPATIAL NETWORK...');
      await sleep(1500);
      
      // Phase 2: Rotate to India
      setPhase(2);
      setStatusText('LOCATING REGION: ASIA / INDIA...');
      await sleep(2000);
      
      // Phase 3: Zoom to Nagpur
      setPhase(3);
      setStatusText('ACQUIRING TARGET: MAHARASHTRA / NAGPUR...');
      await sleep(2500);
      
      // Phase 4: Marker appears
      setPhase(4);
      setStatusText('TARGET LOCKED: NAGPUR METROPOLITAN AREA');
      await sleep(1500);
      
      // Phase 5: Initialization
      setPhase(5);
      setStatusText('JAL SETU SYSTEM INITIALIZING...');
      await sleep(1500);
      
      // Phase 6: Transition to app
      setPhase(6);
      await sleep(500);
      
      if (onComplete) onComplete();
      navigate('/rainfall');
    };

    if (ready) {
      runSequence();
    }
  }, [ready, navigate, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-1000">
      
      {/* Background radial gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black opacity-80" />

      {/* 3D Canvas */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <Suspense fallback={null}>
            {/* Brighter overall ambient light */}
            <ambientLight intensity={1.2} />
            
            {/* Main sun light - much brighter */}
            <directionalLight position={[5, 3, 5]} intensity={2.5} color="#ffffff" />
            
            {/* Fill light from the other side to prevent pitch-black shadows */}
            <directionalLight position={[-5, 0, -5]} intensity={0.8} color="#ffffff" />
            
            <EarthController phase={phase} setReady={setReady} />
          </Suspense>
        </Canvas>
      </div>

      {/* HUD & Overlays */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 sm:p-12">
        {/* Top left tech text */}
        <div className={`font-mono text-xs sm:text-sm text-teal-400/80 transition-opacity duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            SYS.STATUS: ONLINE
          </div>
          <div>LAT: 21.1458° N</div>
          <div>LON: 79.0882° E</div>
        </div>

        {/* Center Crosshair / Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
          {/* Target Reticle (always there but scales in) */}
          <div className={`w-32 h-32 border border-teal-500/20 rounded-full flex items-center justify-center transition-all duration-1000 ${phase >= 3 ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}`}>
            <div className="w-1 h-4 bg-teal-500/40 absolute top-0" />
            <div className="w-1 h-4 bg-teal-500/40 absolute bottom-0" />
            <div className="w-4 h-1 bg-teal-500/40 absolute left-0" />
            <div className="w-4 h-1 bg-teal-500/40 absolute right-0" />
          </div>

          {/* Location Marker */}
          <div className={`absolute flex flex-col items-center transition-all duration-500 delay-300 ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <MapPin className="text-teal-400 w-8 h-8 mb-2 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
            <div className="bg-slate-900/80 backdrop-blur border border-teal-500/30 text-teal-400 px-4 py-1 rounded text-sm font-bold tracking-widest shadow-[0_0_15px_rgba(45,212,191,0.2)]">
              NAGPUR
            </div>
          </div>
        </div>

        {/* Bottom Status Text */}
        <div className="text-center w-full">
          <div className={`inline-block font-mono text-sm sm:text-base tracking-widest transition-all duration-300 ${phase === 5 ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse' : 'text-teal-400/80'}`}>
            {statusText}
          </div>
          {/* Progress bar */}
          <div className="w-64 h-1 bg-slate-800 mx-auto mt-4 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-[8000ms] ease-linear"
              style={{ width: phase >= 1 ? '100%' : '0%' }}
            />
          </div>
        </div>
      </div>
      
      {/* Final White Flash Transition */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-500 ${phase === 6 ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
