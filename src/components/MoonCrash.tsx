import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Volume2, 
  VolumeX, 
  Zap, 
  Flame, 
  History, 
  Coins, 
  Sparkles,
  TrendingUp,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface MoonCrashProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface SmokeParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const MoonCrash: React.FC<MoonCrashProps> = ({ 
  balance, 
  onWin, 
  onBet, 
  onExit, 
  winRate = 50 
}) => {
  // Game state core
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'running' | 'cashed' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [betAmount, setBetAmount] = useState<number>(50);
  const [history, setHistory] = useState<number[]>([1.45, 2.10, 1.08, 14.20, 1.89, 3.40, 1.02, 5.75, 1.12]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(3);
  const [isExploding, setIsExploding] = useState<boolean>(false);
  const [showWinCelebration, setShowWinCelebration] = useState<boolean>(false);
  const [celebrationAmount, setCelebrationAmount] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Hidden generated target point
  const crashPointRef = useRef<number>(2.5);

  // Animation and physics refs
  const frameRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<SmokeParticle[]>([]);
  const particleIdCounter = useRef<number>(0);

  // Star initialization for beautiful parallax backdrop
  useEffect(() => {
    const list: Star[] = Array.from({ length: 60 }).map((_, idx) => ({
      id: idx,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      speed: 0.15 + Math.random() * 0.45,
      opacity: 0.3 + Math.random() * 0.7
    }));
    starsRef.current = list;
  }, []);

  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'ready' | 'chip') => {
    if (soundEnabled) {
      playSound(name);
    }
  };

  // Safe game crash multiplier picker
  const generateCrashPoint = useCallback(() => {
    const r = Math.random();
    // Adjusted house edge mapping based on global project preferences
    const houseEdge = (100 - winRate) / 100;
    // 4% direct crash factor to keep gaming tension high
    if (r < (0.04 + houseEdge * 0.10)) return 1.00;
    
    const randomFactor = Math.random();
    const point = Math.max(1.01, (1.00 - houseEdge * 0.04) / (1.00 - randomFactor));
    return Number(Math.min(250, point).toFixed(2));
  }, [winRate]);

  // Adjust Quick Bets safety
  const adjustBet = (type: 'half' | 'double' | 'min' | 'max' | number) => {
    if (gameState === 'running' || gameState === 'countdown') return;
    playLocalSound('chip');
    if (type === 'half') {
      setBetAmount(prev => Math.max(10, Math.floor(prev / 2)));
    } else if (type === 'double') {
      setBetAmount(prev => Math.min(Math.max(10, balance), prev * 2));
    } else if (type === 'min') {
      setBetAmount(10);
    } else if (type === 'max') {
      setBetAmount(Math.min(1000, balance));
    } else if (typeof type === 'number') {
      setBetAmount(Math.min(Math.max(10, balance), type));
    }
  };

  // Main Firing loop trigger
  const triggerLaunch = () => {
    if (gameState === 'running' || gameState === 'countdown') return;
    if (balance < betAmount) {
      playLocalSound('lose');
      return;
    }

    // Process Bet deduct securely
    onBet(betAmount);
    playLocalSound('ready');
    setGameState('countdown');
    setCountdown(3);
    setMultiplier(1.00);
    setIsExploding(false);
    setShowWinCelebration(false);
    particlesRef.current = [];

    // Trigger 3 second launch ignition countdown
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playLocalSound('click');
      } else {
        clearInterval(interval);
        // Fire Booster ignition!
        commenceFlight();
      }
    }, 850);
  };

  // Launch the core high frequency physics animation ticks
  const commenceFlight = () => {
    crashPointRef.current = generateCrashPoint();
    setGameState('running');
    startTimeRef.current = performance.now();
    playLocalSound('spin');
  };

  // Dynamic Trajectory and Star coordinates update inside RequestAnimationFrame
  useEffect(() => {
    if (gameState !== 'running') {
      if (gameState !== 'countdown' && frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    const physicsLoop = (time: number) => {
      const elapsedSeconds = (time - startTimeRef.current) / 1000;
      
      // Accelerating hyper-drive physics rate scaling curve
      const nextMultiplier = Math.pow(1.08, elapsedSeconds) + (elapsedSeconds * 0.12);
      
      // Check for explosion / crash intercept event
      if (nextMultiplier >= crashPointRef.current) {
        // BOOM!
        stopSound('spin');
        playLocalSound('lose');
        setGameState('crashed');
        setIsExploding(true);
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 550);

        setHistory(prev => [crashPointRef.current, ...prev].slice(0, 10));
        
        // Spawn massive explosion shock particles
        const crashX = 100 + Math.min(600, elapsedSeconds * 65);
        const crashY = 400 - Math.min(250, Math.pow(elapsedSeconds, 1.25) * 35);
        
        for (let i = 0; i < 45; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 12;
          particlesRef.current.push({
            id: particleIdCounter.current++,
            x: crashX,
            y: crashY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.random() * 14,
            color: Math.random() > 0.4 ? '#EF4444' : Math.random() > 0.5 ? '#F59E0B' : '#FFFFFF',
            alpha: 1.0,
            life: 0,
            maxLife: 30 + Math.random() * 40
          });
        }
        return;
      }

      setMultiplier(nextMultiplier);

      // Rocket flame emission physics coordinates
      // Trajectory follows: Bottom-left (100, 420) heading diagonally over time to top-right
      const rocketX = 100 + Math.min(600, elapsedSeconds * 65);
      const rocketY = 400 - Math.min(250, Math.pow(elapsedSeconds, 1.25) * 35);

      // Emit rocket booster plume exhaust particles
      if (Math.random() < 0.6) {
        // Red, Amber and deep smoke blends
        particlesRef.current.push({
          id: particleIdCounter.current++,
          x: rocketX - 12,
          y: rocketY + 8,
          vx: -2 - Math.random() * 5,
          vy: 1.5 + Math.random() * 4,
          size: 4 + Math.random() * 8,
          color: Math.random() > 0.5 ? '#F59E0B' : Math.random() > 0.3 ? '#EF4444' : '#64748B',
          alpha: 0.9,
          life: 0,
          maxLife: 20 + Math.random() * 25
        });
      }

      // Update smoke particle dynamics (lifespans and fading)
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.05, // minor downward gravity drift
          life: p.life + 1,
          alpha: Math.max(0, 1.0 - (p.life / p.maxLife))
        }))
        .filter(p => p.life < p.maxLife);

      // Run parallax stellar backdrop speeds dynamically based on rocket warp speed!
      const warpModifier = Math.max(1.0, nextMultiplier * 2.5);
      starsRef.current = starsRef.current.map(s => {
        let nextX = s.x - s.speed * warpModifier * 0.4;
        let nextY = s.y + s.speed * warpModifier * 0.2;
        
        // Wrap stars around screen limits
        if (nextX < 0) nextX = 100;
        if (nextY > 100) nextY = 0;
        
        return { ...s, x: nextX, y: nextY };
      });

      frameRef.current = requestAnimationFrame(physicsLoop);
    };

    frameRef.current = requestAnimationFrame(physicsLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [gameState, generateCrashPoint, soundEnabled]);

  // Cashout / Secure orbit winnings handler
  const handleCashout = () => {
    if (gameState !== 'running') return;
    
    stopSound('spin');
    const winningPayout = Number((betAmount * multiplier).toFixed(2));
    onWin(winningPayout);
    playLocalSound('win');

    setCelebrationAmount(winningPayout);
    setShowWinCelebration(true);
    setGameState('cashed');

    // Deliver rocket safely warp particles
    const elapsedSeconds = (performance.now() - startTimeRef.current) / 1000;
    const rocketX = 100 + Math.min(600, elapsedSeconds * 65);
    const rocketY = 400 - Math.min(250, Math.pow(elapsedSeconds, 1.25) * 35);

    // Blast celebratory star sparklers
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particlesRef.current.push({
        id: particleIdCounter.current++,
        x: rocketX,
        y: rocketY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 7,
        color: '#10B981', // Neon green matrix color wins
        alpha: 1.0,
        life: 0,
        maxLife: 25 + Math.random() * 30
      });
    }
  };

  // Reset core console back to ready flight mode
  const handleReset = () => {
    setGameState('idle');
    setMultiplier(1.00);
    setIsExploding(false);
    setShowWinCelebration(false);
    particlesRef.current = [];
  };

  // Beautiful calculated flight variables
  const computedWinnings = useMemo(() => {
    return (betAmount * multiplier).toFixed(2);
  }, [betAmount, multiplier]);

  // Rocket position coordinates
  const elapsedSecondsForPosition = gameState === 'running' ? (performance.now() - startTimeRef.current) / 1000 : 0;
  const rocketX = useMemo(() => {
    if (gameState === 'idle' || gameState === 'countdown') return 100;
    const t = (multiplier - 1) * 15;
    return 100 + Math.min(600, t * 5);
  }, [gameState, multiplier]);

  const rocketY = useMemo(() => {
    if (gameState === 'idle' || gameState === 'countdown') return 410;
    const t = (multiplier - 1) * 15;
    return 410 - Math.min(260, Math.pow(t, 1.15) * 3);
  }, [gameState, multiplier]);

  return (
    <div className={`w-full h-full flex flex-col bg-[#050814] text-slate-100 font-sans select-none overflow-hidden relative ${screenShake ? 'animate-[shake_0.4s_ease-in-out_infinite]' : ''}`}>
      
      {/* Dynamic Keyframe style definition for screen shake explosion impact */}
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>

      {/* SUBTLE SPACE BACKDROP NEBULA OVERLAYS */}
      <div className="absolute inset-0 bg-transparent opacity-30 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[500px] h-[500px] bg-indigo-900/15 rounded-full filter blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-[#0E1A33]/20 rounded-full filter blur-[120px]" />
      </div>

      {/* TOP HEADER CONTROLS HUD */}
      <header className="flex items-center justify-between px-6 h-14 bg-[#090E1F]/80 border-b border-[#142343] relative z-40 backdrop-blur-md shrink-0">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#1E3A8A] border border-blue-500/30 flex items-center justify-center shadow-lg">
            <Flame className="text-amber-400 stroke-[2.5]" size={16} />
          </div>
          <div>
            <h1 className="text-white font-black tracking-wider text-xs uppercase">MOON ROCKET</h1>
            <p className="text-[9px] text-blue-400/70 font-bold uppercase tracking-widest leading-none mt-0.5">LAUNCH MODULE</p>
          </div>
        </div>

        {/* STATS AND TOGGLES */}
        <div className="flex items-center gap-4">
          
          {/* USER WALLET BALANCE DISPLAY */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#030611] rounded-lg border border-[#16274D] shadow-inner">
            <Coins className="text-emerald-400" size={13} />
            <span className="text-[10px] font-black text-[#5C7CB3] tracking-wide">CREDITS:</span>
            <span className="font-mono text-xs font-extrabold text-[#10B981]">
              RS {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Sound enable button */}
          <button 
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playLocalSound('click');
            }}
            className="p-1.5 bg-[#101935] hover:bg-[#1C2C5A] text-[#7E96CC] hover:text-white rounded-lg border border-[#1C2D5A] transition-all active:scale-95"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={14} className="text-amber-400" /> : <VolumeX size={14} />}
          </button>

          {/* CLOSE OUT DISMISS GAME */}
          <button 
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#251214] hover:bg-[#3D1419] text-rose-400 hover:text-white rounded-lg border border-rose-950/40 active:scale-95 transition-all text-[11px] font-bold"
          >
            <LogOut size={12} className="text-rose-500" />
            <span>Close</span>
          </button>

        </div>

      </header>

      {/* QUICK MULTIPLIERS BAR */}
      <div className="flex items-center gap-2 px-6 py-2 bg-[#040713]/90 border-b border-[#111A31] h-9 shrink-0 relative z-30 overflow-x-auto no-scrollbar justify-between">
        
        <div className="flex items-center gap-1.5">
          <History size={11} className="text-[#5C7CB3]" />
          <span className="text-[9px] font-extrabold text-[#5C7CB3] uppercase tracking-wider mr-1">Rounds:</span>
          <div className="flex items-center gap-1 whitespace-nowrap">
            {history.map((val, idx) => (
              <span 
                key={idx} 
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  val < 1.5 
                    ? 'text-cyan-400 border-cyan-500/10 bg-cyan-950/10' 
                    : val < 3.0 
                      ? 'text-indigo-400 border-indigo-500/10 bg-indigo-950/10' 
                      : 'text-amber-400 border-amber-500/20 bg-amber-950/15'
                }`}
              >
                {val.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-[#5C7CB3]">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span>Provably Fair Engine Active</span>
        </div>

      </div>

      {/* INTERACTIVE FULL SCREEN COSMIC DECK SIMULATION */}
      <div className="flex-1 relative z-10 overflow-hidden flex flex-col min-h-0 bg-[#02040D]">
        
        {/* PARALLAX STARFIELD CANVASES Background elements */}
        <div className="absolute inset-0 z-0">
          {starsRef.current.map(s => (
            <div 
              key={s.id}
              className="absolute bg-white rounded-full transition-all duration-300"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                opacity: s.opacity,
                boxShadow: gameState === 'running' && multiplier > 3.0 ? '0 0 6px #FFF' : 'none'
              }}
            />
          ))}

          {/* SMOKE & EXPLOSION FLAME DUST INDIVIDUAL PARTICLE DOTS */}
          {particlesRef.current.map(p => (
            <div 
              key={p.id}
              className="absolute rounded-full pointer-events-none filter blur-[1px]"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.alpha,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>

        {/* LUNAR ORBIT (THE MOON DESIGN ELEMENT - HIGH GLOW ON TOP-RIGHT) */}
        <div className="absolute top-8 right-12 w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-[#1E293B] border border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.12)] p-2 pointer-events-none z-10 flex items-center justify-center">
          
          {/* Lunar Crater overlays */}
          <div className="absolute inset-0 w-full h-full rounded-full opacity-15 overflow-hidden">
            <div className="absolute top-10 left-12 w-10 h-10 rounded-full bg-slate-950/40 border border-black/20" />
            <div className="absolute top-1/2 left-8 w-14 h-14 rounded-full bg-slate-950/40 border border-black/20" />
            <div className="absolute top-24 right-14 w-8 h-8 rounded-full bg-slate-950/40 border border-black/20" />
            <div className="absolute bottom-10 left-1/2 w-6 h-6 rounded-full bg-slate-950/40 border border-black/20" />
          </div>

          {/* Inner ambient nuclear core */}
          <div className="w-full h-full rounded-full bg-transparent border-4 border-dashed border-white/5 animate-[spin_50s_linear_infinite]" />
          
          <div className="absolute -top-3 left-4 px-2 py-0.5 rounded bg-amber-500/80 text-[8px] font-black tracking-widest text-[#050814] uppercase leading-none border border-amber-400">
            LUNAR ORBIT
          </div>

          {/* Glowing trajectory ring */}
          <div className="absolute -inset-8 border border-white/5 rounded-full animate-pulse pointer-events-none" />

        </div>

        {/* BASE BOOSTER LAUNCH MECHANISM (BOTTOM-LEFT IDLE) */}
        {(gameState === 'idle' || gameState === 'countdown') && (
          <div className="absolute left-[70px] bottom-[50px] z-10 flex flex-col items-center pointer-events-none">
            {/* Scaffolding structure tower */}
            <div className="w-1.5 h-20 bg-gradient-to-b from-[#25324D] to-transparent border-l border-slate-700/60 relative">
              <div className="absolute top-2 left-0 w-8 h-1 bg-[#1A253A] border-y border-slate-600" />
              <div className="absolute top-12 left-0 w-6 h-1 bg-[#1A253A] border-y border-slate-600" />
            </div>
            {/* Booster Plate launch pad */}
            <div className="w-20 h-2 bg-[#1A243D] border border-[#2B3E68] rounded shadow-xl flex items-center justify-center">
              <div className="w-8 h-0.5 bg-yellow-400/40 animate-pulse" />
            </div>
          </div>
        )}

        {/* DYNAMIC SCENERY ROCKET RENDER & CRASH DETECTOR */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {!isExploding && (gameState === 'running' || gameState === 'cashed' || gameState === 'idle' || gameState === 'countdown') && (
            <div 
              className="absolute transition-all duration-75 ease-out"
              style={{
                left: `${rocketX}px`,
                top: `${rocketY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              
              {/* Actual Rocket styling layout */}
              <div className={`relative flex flex-col items-center ${gameState === 'running' ? 'animate-[pulse_0.1s_infinite]' : ''}`}>
                
                {/* Visual pilot avatar banner */}
                <span className="absolute -top-8 bg-[#090E1F]/90 border border-[#1C2C4E] text-white font-extrabold text-[8px] py-0.5 px-2 rounded-full whitespace-nowrap uppercase tracking-widest shadow-lg">
                  COMMAND-01
                </span>

                {/* Booster Ignition Flame exhaust under rocket body */}
                {(gameState === 'running' || gameState === 'countdown') && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                    <div className="w-3.5 h-10 bg-gradient-to-t from-transparent via-red-500 to-amber-400 rounded-b-xl animate-[pulse_0.08s_infinite] shadow-[0_0_15px_#EF4444]" />
                    <Sparkles className="text-yellow-400 shrink-0 mt-0.5 animate-pulse" size={10} />
                  </div>
                )}

                {/* Rocket Capsule Graphics structure */}
                <div className="w-9 h-14 bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 rounded-t-full border-x-2 border-t-2 border-slate-400/80 shadow-[2px_2px_10px_black] p-1 flex items-center justify-center relative">
                  
                  {/* Glass viewport cockpit panel */}
                  <div className="w-4 h-4 rounded-full bg-cyan-400/70 border border-slate-600 flex items-center justify-center shadow-inner overflow-hidden">
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60 absolute top-1 left-1" />
                    <span className="text-[7.5px] font-black text-[#010614]">🤖</span>
                  </div>

                  {/* Interstellar Delta fins left and right */}
                  <div className="absolute -left-2.5 bottom-0 w-2.5 h-6 bg-red-600 rounded-tl-lg rounded-bl-sm border-l border-b border-red-800" />
                  <div className="absolute -right-2.5 bottom-0 w-2.5 h-6 bg-red-600 rounded-tr-lg rounded-br-sm border-r border-b border-red-800" />

                </div>

              </div>

            </div>
          )}
        </div>

        {/* HUD SCREEN CENTER MULTIPLIER/RISK VALUE */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none text-center p-4">
          <AnimatePresence mode="wait">
            
            {gameState === 'running' && (
              <motion.div 
                key="running-multiplier"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <span className="text-7xl sm:text-8xl font-black text-white font-mono tracking-tighter drop-shadow-[0_4px_15px_rgba(0,0,0,0.95)]">
                    {multiplier.toFixed(2)}x
                  </span>
                  {/* Live status ping indicators */}
                  <div className="absolute -top-4 -right-2 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-black/75 rounded-full border border-[#16274D]/80">
                  <span className="text-[10px] font-black text-yellow-500 tracking-widest uppercase animate-pulse">
                    ASCENDING ORBIT (MULTIPLE)
                  </span>
                </div>

                <p className="text-[10px] font-mono text-slate-400 font-bold mt-1 max-w-[280px]">
                  Estimated Payload Value: <span className="text-emerald-400 font-bold">RS {computedWinnings}</span>
                </p>

              </motion.div>
            )}

            {gameState === 'crashed' && (
              <motion.div 
                key="crashed-multiplier"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center bg-[#070103]/95 border border-red-950/70 py-6 px-10 rounded-2xl max-w-sm"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] mb-2.5">
                  <ShieldAlert size={20} className="stroke-[2.5]" />
                </div>
                <h3 className="text-red-500 text-sm font-black uppercase tracking-widest leading-none">COLLISION METEOR</h3>
                <p className="text-[9px] text-[#5C7CB3] font-bold uppercase tracking-wide leading-none mt-1">THE ROCKET DISINTEGRATED AT</p>
                <span className="text-5xl font-black font-mono text-white mt-3.5">
                  {crashPointRef.current.toFixed(2)}x
                </span>
                
                <button 
                  onClick={handleReset}
                  className="mt-4 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all text-white rounded-lg text-[10px] font-black uppercase tracking-widest pointer-events-auto"
                >
                  Clear Command
                </button>
              </motion.div>
            )}

            {/* SECURED WIN RE-ENTRY HUD STATE */}
            {gameState === 'cashed' && (
              <motion.div 
                key="secured-multiplier"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center bg-[#010905]/95 border border-emerald-950/70 py-6 px-10 rounded-2xl max-w-sm"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-2.5 animate-bounce">
                  <Sparkles size={20} className="stroke-[2.5]" />
                </div>
                <h3 className="text-emerald-400 text-sm font-black uppercase tracking-widest leading-none">PAYLOAD EXTREME SECURED!</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-none mt-1">ORBIT ACHIEVED VELOCITY</p>
                <span className="text-5xl font-black font-mono text-white mt-3.5">
                  {multiplier.toFixed(2)}x
                </span>

                <div className="mt-2.5 text-xs font-black text-emerald-400 font-mono">
                  +RS {celebrationAmount.toLocaleString()} CREDITS!
                </div>
                
                <button 
                  onClick={handleReset}
                  className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white rounded-lg text-[10px] font-black uppercase tracking-widest pointer-events-auto"
                >
                  Proceed to Next Launch
                </button>
              </motion.div>
            )}

            {gameState === 'countdown' && (
              <motion.div 
                key="countdown-stage"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2 flex items-center justify-center">
                  <div className="absolute w-20 h-20 border-2 border-dashed border-yellow-500/20 rounded-full animate-spin" />
                  <span className="text-4xl sm:text-5xl text-yellow-400 font-extrabold font-mono">
                    {countdown}
                  </span>
                </div>
                <h3 className="text-white text-[11px] font-black uppercase tracking-widest">BOOSTER PRESSURE CHARGING</h3>
                <p className="text-[#5C7CB3] text-[9px] font-bold tracking-wider leading-none mt-1 uppercase">
                  READY IGNITION COILS LOCKDOWN...
                </p>
              </motion.div>
            )}

            {gameState === 'idle' && (
              <motion.div 
                key="idle-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center pointer-events-auto cursor-pointer group"
                onClick={triggerLaunch}
              >
                <div className="w-14 h-14 bg-gradient-to-tr from-[#1E293B] to-[#0F172A] rounded-full border border-slate-600/50 flex items-center justify-center shadow-lg active:scale-95 transition-all group-hover:border-yellow-500 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <ArrowUpRight className="text-yellow-400 stroke-[3] transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" size={24} />
                </div>
                <h3 className="text-white text-xs font-black tracking-widest mt-3.5 uppercase">INITIATE ROCKET THRUSTER</h3>
                <p className="text-[9px] text-[#5C7CB3] font-bold tracking-wide uppercase mt-1 leading-none">
                  Adjust stake details and click "FIRE" below
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* FOOTER SINGLE COMMAND CENTRE FOR QUICK USER ACTION BETTING */}
      <footer className="bg-[#070B18] border-t border-[#12203F] px-6 py-4 relative z-30 shrink-0 select-none">
        
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          
          {/* QUICK CHIPS SELECTION PANEL */}
          <div className="flex flex-col gap-2 border-r border-[#152445]/50 pr-0 md:pr-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins size={12} className="text-blue-400" />
                <span className="text-[9.5px] font-extrabold text-[#5C7CB3] uppercase tracking-wider">Stake Selection:</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-white">
                Min: RS 10 | Max: RS 1000
              </span>
            </div>

            {/* Quick increase/decrease buttons */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#030611] rounded-lg border border-[#16274D] p-1.5 flex items-center justify-between">
                
                <button 
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet(Math.max(10, betAmount - 10))}
                  className="px-2 py-0.5 bg-[#121E36] hover:bg-[#1C2F52] text-white rounded font-bold text-xs active:scale-95 transition-transform disabled:opacity-40"
                >
                  -10
                </button>

                <input 
                  type="number"
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  value={betAmount}
                  onChange={(e) => adjustBet(parseInt(e.target.value) || 10)}
                  className="w-18 bg-transparent text-center font-mono text-xs font-black text-white focus:outline-none"
                />

                <button 
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet(Math.min(balance, betAmount + 10))}
                  className="px-2 py-0.5 bg-[#121E36] hover:bg-[#1C2F52] text-white rounded font-bold text-xs active:scale-95 transition-transform disabled:opacity-40"
                >
                  +10
                </button>

              </div>

              {/* multiplier multiples */}
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet('half')}
                  className="px-2.5 py-2 bg-[#121E36] hover:bg-[#1C2F52] rounded text-[10px] text-slate-300 font-extrabold active:scale-95 disabled:opacity-40"
                >
                  1/2
                </button>
                <button 
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet('double')}
                  className="px-2.5 py-2 bg-[#121E36] hover:bg-[#1C2F52] rounded text-[10px] text-slate-300 font-extrabold active:scale-95 disabled:opacity-40"
                >
                  2x
                </button>
                <button 
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet('max')}
                  className="px-2.5 py-2 bg-[#2D0B0F] hover:bg-[#431015] border border-rose-950 rounded text-[10px] text-rose-300 font-black active:scale-95 disabled:opacity-40"
                >
                  MAX
                </button>
              </div>

            </div>

            {/* Quick Multi-choice preset badges */}
            <div className="flex items-center gap-1.5 mt-0.5 overflow-x-auto no-scrollbar py-0.5">
              {[10, 20, 50, 100, 200, 500].map(amt => (
                <button
                  key={amt}
                  disabled={gameState === 'running' || gameState === 'countdown'}
                  onClick={() => adjustBet(amt)}
                  className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-bold transition-all shrink-0 ${
                    betAmount === amt 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-[#101932] hover:bg-[#17254A] text-[#8699B5] border border-slate-700/30'
                  }`}
                >
                  RS {amt}
                </button>
              ))}
            </div>

          </div>

          {/* MAIN BIG ACTION MULTI TRIGGER BUTTON */}
          <div className="w-full">
            {gameState === 'idle' && (
              <button
                onClick={triggerLaunch}
                disabled={balance < betAmount}
                className="w-full h-14 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 active:scale-[0.98] transition-all rounded-xl border border-yellow-400 font-black text-sm text-[#090E20] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                <Zap size={16} fill="#090E20" />
                <span>LAUNCH ROCKET FIGHT</span>
              </button>
            )}

            {gameState === 'countdown' && (
              <button
                disabled
                className="w-full h-14 bg-[#142240] rounded-xl border border-[#213766] text-slate-400 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <div className="w-4.5 h-4.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mr-1" />
                <span>IGNITION PRE-COUNTDOWN: {countdown}s</span>
              </button>
            )}

            {gameState === 'running' && (
              <button
                onClick={handleCashout}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all rounded-xl border border-emerald-400 font-black text-sm text-[#010905] uppercase tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center select-none"
              >
                <span className="leading-none text-xs tracking-tight font-black opacity-80">EXTRACT SECURE PILOT CORES</span>
                <span className="leading-none text-sm font-black mt-1 font-mono tracking-widest uppercase">
                  CASH OUT RS {computedWinnings} CREDITS
                </span>
              </button>
            )}

            {(gameState === 'cashed' || gameState === 'crashed') && (
              <button
                onClick={handleReset}
                className="w-full h-14 bg-[#11192E] hover:bg-[#1D2B4A] active:scale-[0.98] transition-all rounded-xl border border-slate-700/60 font-black text-sm text-slate-200 uppercase tracking-widest flex items-center justify-center gap-1"
              >
                <RotateCcw size={15} />
                <span>RESET STABILITY DECK</span>
              </button>
            )}
          </div>

        </div>

        {/* Quick Help manual info footnote strip */}
        <div className="max-w-[1000px] mx-auto mt-3.5 pt-3 border-t border-[#111A31] flex items-center gap-2 text-[9px] text-[#5C7CB3] justify-center text-center">
          <Info size={10} className="text-blue-400" />
          <span>How to Win: Fire the main thrust engine and cash out inside orbit before a solar flare or random deep space meteor collides the booster.</span>
        </div>

      </footer>

    </div>
  );
};
