import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Sparkles,
  Coins,
  ChevronRight
} from 'lucide-react';
import { playSound, setSoundActiveGameId } from '../lib/sounds';

interface MinesProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number; 
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation: number;
  spin: number;
  gravity: number;
  decay: number;
  type: 'star' | 'ember' | 'smoke';
}

export const MinesFinder: React.FC<MinesProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 5
}) => {
  const [bet, setBet] = useState(minBet);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<(string | null)[]>(Array(16).fill(null));
  const [mines, setMines] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'cashout' | 'burst'>('idle');
  const [revealedCount, setRevealedCount] = useState(0);

  // Progressive jackpot ticker
  const [jackpot, setJackpot] = useState(20894.59);

  // sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shakeScreen, setShakeScreen] = useState(false);

  // particle parameters
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextParticleId = useRef(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    setSoundActiveGameId('mines');
    return () => {
      setSoundActiveGameId(null);
    };
  }, []);

  // Update particles physics loop
  useEffect(() => {
    const updateParticles = () => {
      setParticles((prev) => {
        if (prev.length === 0) return prev;
        return prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + p.gravity,
            alpha: p.alpha - p.decay,
            rotation: p.rotation + p.spin,
          }))
          .filter((p) => p.alpha > 0.05);
      });
      requestRef.current = requestAnimationFrame(updateParticles);
    };

    requestRef.current = requestAnimationFrame(updateParticles);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Slowly increment the jackpot for standard casinos visual realism
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpot(prev => prev + (Math.random() * 0.15) + 0.02);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const spawnParticles = (clientX: number, clientY: number, count: number, type: 'star' | 'ember') => {
    const colors = type === 'star' 
      ? ['#FBBF24', '#FCD34D', '#F59E0B', '#F75B00', '#FFFBEB', '#34D399']
      : ['#EF4444', '#F87171', '#F59E0B', '#FFA500', '#7F1D1D'];

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7;
      newParticles.push({
        id: nextParticleId.current++,
        x: clientX,
        y: clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'star' ? 1.4 : 2.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: type === 'star' ? 4 + Math.random() * 5 : 5 + Math.random() * 6,
        alpha: 1.0,
        rotation: Math.random() * Math.PI,
        spin: -0.12 + Math.random() * 0.24,
        gravity: 0.16,
        decay: 0.018 + Math.random() * 0.02,
        type: type,
      });
    }

    if (type === 'ember') {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 2;
        newParticles.push({
          id: nextParticleId.current++,
          x: clientX,
          y: clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          color: 'rgba(55, 65, 81, 0.45)',
          size: 18 + Math.random() * 18,
          alpha: 0.55,
          rotation: Math.random() * Math.PI,
          spin: -0.01 + Math.random() * 0.02,
          gravity: -0.02,
          decay: 0.012,
          type: 'smoke',
        });
      }
    }

    setParticles((prev) => [...prev, ...newParticles].slice(0, 130));
  };

  const playLocalSound = (name: 'click' | 'win' | 'lose' | 'spin' | 'chip' | 'coin' | 'ready' | 'mine_gem' | 'mine_boom') => {
    if (soundEnabled) playSound(name);
  };

  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 0;
    let prob = 1;
    for (let i = 0; i < revealed; i++) {
      prob *= (16 - mineCount - i) / (16 - i);
    }
    return Math.floor((1 / prob) * 0.97 * 100) / 100; // House edge of 3%
  };

  const currentMultiplier = calculateMultiplier(revealedCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1);
  const profit = Math.floor(bet * currentMultiplier);

  const startGame = async () => {
    if (isPlaying || balance < bet) return;
    
    const success = await onBet(bet);
    if (!success) {
      playLocalSound('lose');
      return;
    }

    playLocalSound('chip');
    
    const minePositions: number[] = [];
    while (minePositions.length < mineCount) {
      const pos = Math.floor(Math.random() * 16);
      if (!minePositions.includes(pos)) minePositions.push(pos);
    }
    
    setMines(minePositions);
    setGrid(Array(16).fill(null));
    setRevealedCount(0);
    setIsPlaying(true);
    setStatus('playing');
  };

  const handleReveal = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isPlaying || grid[index] || status !== 'playing') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;

    if (mines.includes(index)) {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 320);

      const newGrid = [...grid];
      mines.forEach((m) => {
        newGrid[m] = 'mine';
      });
      newGrid[index] = 'boom';
      setGrid(newGrid);
      setStatus('burst');
      setIsPlaying(false);
      
      spawnParticles(clickX, clickY, 32, 'ember');
      playLocalSound('mine_boom');
    } else {
      const newGrid = [...grid];
      newGrid[index] = 'diamond';
      setGrid(newGrid);
      const newRevealedCount = revealedCount + 1;
      setRevealedCount(newRevealedCount);
      playLocalSound('mine_gem');
      
      spawnParticles(clickX, clickY, 18, 'star');

      if (newRevealedCount === 16 - mineCount) {
        handleCashout();
      }
    }
  };

  const handleCashout = () => {
    if (!isPlaying || status !== 'playing' || revealedCount === 0) return;
    
    playLocalSound('win');
    setStatus('cashout');
    setIsPlaying(false);
    onWin(profit);

    const newGrid = [...grid];
    mines.forEach((m) => {
      if (!newGrid[m]) newGrid[m] = 'mine-hidden';
    });
    setGrid(newGrid);
  };

  // Cycle bet sizing like standard coin selectors
  const cycleBetValue = () => {
    if (isPlaying) return;
    playLocalSound('click');
    const betSteps = [5, 10, 20, 50, 100, 200, 500, 1000];
    const currentIndex = betSteps.indexOf(bet);
    if (currentIndex === -1 || currentIndex === betSteps.length - 1) {
      setBet(betSteps[0]);
    } else {
      const nextVal = betSteps[currentIndex + 1];
      if (nextVal <= balance) {
        setBet(nextVal);
      } else {
        setBet(betSteps[0]);
      }
    }
  };

  // Cycle mines limit between 1 and 15
  const cycleMinesValue = () => {
    if (isPlaying) return;
    playLocalSound('click');
    const minesCycle = [1, 2, 3, 5, 8, 10, 12, 14, 15];
    const currentIndex = minesCycle.indexOf(mineCount);
    if (currentIndex === -1 || currentIndex === minesCycle.length - 1) {
      setMineCount(minesCycle[0]);
    } else {
      setMineCount(minesCycle[currentIndex + 1]);
    }
  };

  // Custom golden repeat/double bet actions
  const handleRepeatDouble = () => {
    if (isPlaying) return;
    playLocalSound('click');
    if (bet * 2 <= balance) {
      setBet(bet * 2);
    } else {
      setBet(minBet);
    }
  };

  // 3D Shiny Metallic Gold Coin with star
  const GoldStarCoin = () => (
    <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] filter drop-shadow-[0_4px_7px_rgba(0,0,0,0.65)] animate-fade-in">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="30%" stopColor="#FFB300" />
          <stop offset="70%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#FF6F00" />
        </linearGradient>
        <linearGradient id="goldRim" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="50%" stopColor="#FFF59D" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FFF9C4" />
          <stop offset="85%" stopColor="#FFEB3B" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>
      </defs>
      {/* Outer 3D Gold Rim */}
      <circle cx="50" cy="50" r="46" fill="url(#goldRim)" stroke="#78350F" strokeWidth="2.5" />
      {/* Shadow inner ring */}
      <circle cx="50" cy="50" r="41" fill="#451A03" />
      {/* Dynamic Gold Face */}
      <circle cx="50" cy="50" r="39" fill="url(#goldGrad)" stroke="#F59E0B" strokeWidth="1" />
      {/* Secondary Internal ring */}
      <circle cx="50" cy="50" r="30" fill="none" stroke="#B45309" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Embossed star shape */}
      <polygon 
        points="50,16 60,37 83,40 66,56 71,79 50,67 29,79 34,56 17,40 40,37" 
        fill="url(#starGrad)" 
        stroke="#78350F" 
        strokeWidth="2" 
        strokeLinejoin="round"
      />
      <polygon 
        points="50,20 58,37 77,40 63,53 67,71 50,61 33,71 37,53 23,40 42,37" 
        fill="#FFE082" 
        opacity="0.4"
      />
    </svg>
  );

  // High fidelity realistic dark navy metallic bomb with fuse
  const RealisticBomb = ({ isBoomed = false }) => (
    <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]">
      <defs>
        <radialGradient id="bombBody" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="40%" stopColor="#1E293B" />
          <stop offset="85%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <linearGradient id="fuseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* Fuse structure */}
      <path 
        d="M50,28 C50,14 66,13 65,4" 
        fill="none" 
        stroke="url(#fuseGrad)" 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      
      {/* Fuse Tip spark glowing flame */}
      <circle cx="65" cy="4" r="8" fill="#F97316" className="animate-ping" opacity="0.8" />
      <circle cx="65" cy="4" r="5" fill="#EF4444" />
      <circle cx="65" cy="4" r="2.5" fill="#FDE047" />

      {/* Golden metallic neck collar */}
      <rect x="42" y="24" width="16" height="6" rx="2" fill="#E2E8F0" stroke="#475569" strokeWidth="1" />
      <rect x="44" y="25" width="12" height="2" fill="#FCD34D" />

      {/* Main iron ball */}
      <circle cx="50" cy="56" r="32" fill="url(#bombBody)" stroke={isBoomed ? "#EF4444" : "#334155"} strokeWidth="2.5" />
      
      {/* Specular curved shine highlight */}
      <path 
        d="M26,44 A24,24 0 0,1 46,26" 
        fill="none" 
        stroke="#E2E8F0" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        opacity="0.25" 
      />

      <polygon points="53,42 47,56 55,56 46,68 56,68 44,80" fill="#EF4444" opacity="0.5" />
    </svg>
  );

  return (
    <div className={`flex flex-col h-screen max-h-screen bg-gradient-to-b from-[#0F1D36] via-[#0B1528] to-[#050C18] text-[#E2E8F0] font-sans overflow-hidden select-none relative ${shakeScreen ? 'animate-bounce' : ''}`}>
      
      {/* Subtle blue/purple dynamic atmosphere radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#1E3A8A]/15 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute -bottom-10 left-10 w-96 h-96 bg-[#3B82F6]/5 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Cyber ambient particles canvas simulator layer */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {particles.map((p) => {
          if (p.type === 'smoke') {
            return (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none blur-md"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  opacity: p.alpha,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          }
          return (
            <div
              key={p.id}
              className="absolute pointer-events-none"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.alpha,
                transform: `translate(-50%, -50%) rotate(${p.rotation}rad)`,
                boxShadow: `0 0 10px ${p.color}`,
                borderRadius: p.type === 'star' ? '50% 0 50% 0' : '2px', // real dynamic star sparkle shard
              }}
            />
          );
        })}
      </div>

      {/* INTEGRATED PERSISTENT LOBBY HEADER (same design layout as standard screen header shell) */}
      <header className="flex items-center justify-between px-4 h-14 bg-[#0A1222]/95 border-b border-[#1E2D4A] z-20 shrink-0 shadow-lg backdrop-blur-md">
        
        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#17253F] hover:bg-[#203254] text-gray-300 hover:text-white rounded-xl border border-[#2B3E63] active:scale-95 transition-all text-xs font-bold"
        >
          <LogOut size={13} className="text-rose-500 stroke-[3]" />
          <span>Exit Game</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 bg-black/35 rounded-full border border-[#1E2D4A]">
          <span className="text-[10px] text-gray-400 font-extrabold tracking-widest uppercase">BALANCE:</span>
          <span className="font-mono text-[13px] font-black tracking-tight text-[#10B981]">
            RS {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <button 
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playLocalSound('click');
          }}
          className="p-2 rounded-xl bg-[#17253F] text-gray-400 hover:text-white border border-[#2B3E63] transition-all"
        >
          {soundEnabled ? <Volume2 size={15} className="text-amber-400" /> : <VolumeX size={15} />}
        </button>

      </header>

      {/* GAME SCREEN MAIN DIVISION CONTROLLERS VIEWPORT */}
      <div className="flex-1 w-full max-w-[440px] mx-auto flex flex-col justify-between p-3.5 relative z-10 overflow-hidden">
        
        {/* TOP COMPACT MODULE: "MINES JACKPOT" (from reference image) */}
        <div className="text-center mt-2 flex flex-col items-center">
          
          {/* Main Titles */}
          <div className="relative">
            <h1 className="text-4xl font-extrabold italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFF59D] via-[#FFD54F] to-[#FF8F00] leading-none uppercase filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              MINES
            </h1>
            <h2 className="text-lg font-black italic tracking-widest text-[#5C85BD] uppercase leading-none mt-1">
              JACKPOT
            </h2>
          </div>

          {/* Bet 100 to unlock info badge & value */}
          <div className="mt-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-950/40 via-[#0A1528] to-blue-950/40 rounded-full border border-[#162D55] shadow-inner text-center">
            <div className="text-[9px] text-[#A0C0EC] font-bold tracking-wider leading-none">
              Bet <span className="text-amber-400 font-black">100</span> to unlock
            </div>
            <div className="text-[17px] font-black text-[#FFD54F] font-mono tracking-tight leading-none mt-1">
              Rs {jackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* DUAL DISPLAY BAR: GEMS FOUND (LEFT) & MINES PLANTED (RIGHT) */}
          <div className="w-full grid grid-cols-2 gap-3 mt-4">
            
            {/* Left Box: Gold coin with current diamonds found */}
            <div className="bg-gradient-to-b from-[#14233C] to-[#0C1526] rounded-2xl p-2.5 border border-[#1F355E] flex items-center gap-3 relative overflow-hidden shadow-lg shadow-black/40">
              <div className="w-10 h-10 bg-[#FFB300]/10 rounded-xl border border-[#FFB300]/25 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                  <circle cx="50" cy="50" r="46" fill="url(#goldGrad)" stroke="#78350F" strokeWidth="2.5" />
                  <polygon points="50,18 59,38 81,40 64,55 69,77 50,65 31,77 36,55 19,40 41,38" fill="#FFF9C4" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-[#5C85BD] font-black tracking-widest uppercase">SAFE GEMS</span>
                <span className="text-xl font-mono font-black text-[#FFB300] leading-tight">
                  {isPlaying ? revealedCount : (16 - mineCount)}
                </span>
              </div>
            </div>

            {/* Right Box: Dark Bomb showing total current mines */}
            <div className="bg-gradient-to-b from-[#14233C] to-[#0C1526] rounded-2xl p-2.5 border border-[#1F355E] flex items-center gap-3 relative overflow-hidden shadow-lg shadow-black/40">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl border border-rose-500/25 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-7 h-7 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
                  <path d="M50,28 C50,14 66,13 65,4" fill="none" stroke="#E2E8F0" strokeWidth="5" />
                  <circle cx="50" cy="56" r="32" fill="#1E293B" stroke="#334155" />
                  <circle cx="65" cy="4" r="5" fill="#EF4444" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-[#5C85BD] font-black tracking-widest uppercase">MINES</span>
                <span className="text-xl font-mono font-black text-rose-500 leading-tight">
                  {mineCount}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* MULTIPLIER CURRENT LADDER CORNER (Stake style horizontal scrolling container ribbon) */}
        <div className="my-2.5 bg-[#091122]/90 border border-[#172744] rounded-xl py-2 px-3 flex gap-2 items-center overflow-x-auto no-scrollbar relative shadow-inner">
          <div className="flex gap-2 py-0.5 whitespace-nowrap overflow-x-auto no-scrollbar w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((stepCount) => {
              const mult = calculateMultiplier(stepCount);
              const isCleared = revealedCount >= stepCount;
              const isNext = revealedCount + 1 === stepCount;
              return (
                <div
                  key={stepCount}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-center shrink-0 select-none transition-all ${
                    isCleared 
                      ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/10 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)] font-black'
                      : isNext && isPlaying
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 animate-pulse font-extrabold scale-102'
                      : 'bg-[#0E172B] border-[#1D2B44] text-slate-500 text-[10.5px]'
                  }`}
                >
                  <span className="text-[8.5px] opacity-50 block leading-none font-bold">#{stepCount}</span>
                  <span className="text-xs font-black leading-none">{mult}x</span>
                </div>
              );
            })}
          </div>
          <ChevronRight size={13} className="text-[#5C85BD] shrink-0" />
        </div>

        {/* INTERACTIVE 4x4 CORE BOARD PLAYGRID CANVAS */}
        <div className="flex-1 w-full bg-[#0A1221]/90 border border-[#1C2C4A] rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center min-h-[290px]">
          
          <AnimatePresence>
            
            {/* EXPLODE INTERCEPTION FULL-FRAME ALERTS POPUP */}
            {status === 'burst' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#060B14]/98 flex flex-col items-center justify-center text-center p-5 rounded-2xl border border-rose-500/10"
              >
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/30 text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                  <svg viewBox="0 0 100 100" className="w-9 h-9">
                    <path d="M50,28 C50,14 66,13 65,4" fill="none" stroke="#EF4444" strokeWidth="5" />
                    <circle cx="50" cy="56" r="32" fill="#0F172A" stroke="#EF4444" strokeWidth="3" />
                    <circle cx="65" cy="4" r="5" fill="#FDE047" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-rose-500 uppercase italic tracking-wide">MINE BLAST!</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-semibold">
                  Decryption collapsed! Stake of <span className="text-white font-black">RS {bet}</span> exploded.
                </p>
                
                <button 
                  onClick={() => {
                    playLocalSound('click');
                    setStatus('idle');
                  }}
                  className="mt-6 px-10 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-orange-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-black/60 active:scale-95 transition-all duration-200"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* CASHOUT SUCCESS SCREEN POPUP */}
            {status === 'cashout' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#060B14]/98 flex flex-col items-center justify-center text-center p-5 rounded-2xl border border-emerald-500/10"
              >
                <div className="w-16 h-16 bg-[#FFB300]/10 rounded-full flex items-center justify-center mb-4 border border-[#FFB300]/30 text-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
                  <svg viewBox="0 0 100 100" className="w-9 h-9">
                    <circle cx="50" cy="50" r="46" fill="url(#goldGrad)" stroke="#B45309" strokeWidth="2.5" />
                    <polygon points="50,18 59,38 81,40 64,55 69,77 50,65 31,77 36,55 19,40 41,38" fill="#FFFBEB" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-[#FFB300] uppercase italic tracking-wide">JACKPOT PAYOUT!</h3>
                
                <div className="bg-gradient-to-b from-[#101F37] to-[#0A1322] px-6 py-3.5 rounded-2xl border border-[#233A5E] font-mono text-center space-y-1 mt-3 shadow-inner">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest leading-none">CASHED OUT PROFIT</span>
                  <span className="text-2xl font-black text-[#10B981] leading-none block">RS {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[11px] text-[#FFB300] font-black block leading-none pt-1">At {currentMultiplier}x Multiplier!</span>
                </div>

                <button 
                  onClick={() => {
                    playLocalSound('click');
                    setStatus('idle');
                  }}
                  className="mt-6 px-11 py-3.5 bg-gradient-to-r from-[#FFB300] to-[#FF8F00] hover:from-[#FFE082] hover:to-[#FFA000] text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-black/60 active:scale-95 transition-all duration-200"
                >
                  Claim Credits
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* THE 4x4 GRID LAYOUT */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-[340px] aspect-square">
            {grid.map((cell, idx) => {
              const isDisabled = !isPlaying || cell !== null || status !== 'playing';
              
              let backgroundStyleClass = '';
              if (cell === 'diamond') {
                backgroundStyleClass = 'bg-gradient-to-b from-[#FFF59D] via-[#FFD54F] to-[#FF8F00] border-[#FFE082] border-2 shadow-[0_0_15px_rgba(251,191,36,0.35)]';
              } else if (cell === 'boom') {
                backgroundStyleClass = 'bg-radial from-[#1E293B] to-rose-955 border-rose-500 border-2 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
              } else if (cell === 'mine') {
                backgroundStyleClass = 'bg-[#180A0F] border border-rose-500/35 scale-95 opacity-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]';
              } else if (cell === 'mine-hidden') {
                backgroundStyleClass = 'bg-[#0E1524] border border-[#2B3E63]/25 scale-95 opacity-55 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]';
              } else {
                // Closed cell background
                backgroundStyleClass = 'bg-gradient-to-b from-[#1C2C4A] to-[#121E33] border-[#22365A] hover:border-[#FFD54F]/50 border-b-[4px] border-b-[#0B1221] hover:border-b-[4px] shadow-lg active:scale-95 duration-100';
              }

              return (
                <motion.button
                  key={idx}
                  disabled={isDisabled}
                  whileHover={isPlaying && !cell ? { y: -1 } : {}}
                  whileTap={isPlaying && !cell ? { scale: 0.95 } : {}}
                  onClick={(e) => handleReveal(idx, e)}
                  className={`relative rounded-2xl w-full h-full select-none ${backgroundStyleClass} flex items-center justify-center`}
                >
                  <AnimatePresence mode="wait">
                    
                    {/* Diamond -> Golden Star Stamp Card Coin */}
                    {cell === 'diamond' && (
                      <motion.div 
                        key="diamond"
                        initial={{ scale: 0, rotate: -45 }} 
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        <GoldStarCoin />
                      </motion.div>
                    )}

                    {/* Exploded Bomb */}
                    {(cell === 'boom' || cell === 'mine') && (
                      <motion.div 
                        key="bomb"
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        <RealisticBomb isBoomed={cell === 'boom'} />
                      </motion.div>
                    )}

                    {/* Hidden bomb reveal */}
                    {cell === 'mine-hidden' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-[65%] h-[65%] opacity-40">
                          <circle cx="50" cy="56" r="32" fill="#475569" stroke="#334155" />
                        </svg>
                      </div>
                    )}

                    {/* Default closed star stamp watermark outline design */}
                    {!cell && (
                      <div className="w-9 h-9 rounded-full border border-[#2E436A] flex items-center justify-center opacity-65 group-hover:opacity-100 transition-opacity">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2A3F65] flex items-center justify-center">
                          <svg viewBox="0 0 10 10" className="w-2 h-2">
                            <polygon points="5,1 6,3 8,3 6.5,4.5 7,6.5 5,5.5 3,6.5 3.5,4.5 2,3 4,3" fill="#FFC107" opacity="0.3" />
                          </svg>
                        </div>
                      </div>
                    )}

                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

        </div>

        {/* INTERMEDIARY METRIC FOOTER BAR: BALANCE + STATS */}
        <div className="my-2 px-1 flex justify-between items-center text-xs font-extrabold uppercase tracking-wider text-[#A0C0EC]">
          <div>
            Balance: <span className="text-[#10B981] font-mono">Rs {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            WIN: <span className="text-[#FFC107] font-mono">Rs {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* BOTTOM SLOT-MACHINE INSPIRED CONTROL CONSOLE AREA (from reference image) */}
        <div className="grid grid-cols-4 gap-2 px-1 pb-2 shrink-0">
          
          {/* Button unit 1: Bet Value select controller */}
          <button 
            type="button"
            disabled={isPlaying}
            onClick={cycleBetValue}
            className="flex flex-col items-center justify-center py-2 bg-[#1C2C4A] hover:bg-[#25395E] text-white rounded-xl border border-[#2B3E63] active:scale-95 transition-all shadow-md text-left"
          >
            <div className="flex items-center gap-1.5 text-[8px] tracking-widest uppercase text-[#5C85BD] font-black leading-none">
              <Coins size={10} className="text-amber-400 stroke-[3]" />
              <span>Bet</span>
            </div>
            <span className="text-xs font-mono font-black mt-1 leading-none text-white">
              Rs {bet}
            </span>
          </button>

          {/* Button unit 2: Mines preset select controller */}
          <button 
            type="button"
            disabled={isPlaying}
            onClick={cycleMinesValue}
            className="flex flex-col items-center justify-center py-2 bg-[#1C2C4A] hover:bg-[#25395E] text-white rounded-xl border border-[#2B3E63] active:scale-95 transition-all shadow-md text-left"
          >
            <div className="flex items-center gap-1.5 text-[8px] tracking-widest uppercase text-[#5C85BD] font-black leading-none">
              <span className="text-rose-500 font-extrabold font-mono text-[9px]">💣</span>
              <span>Mines</span>
            </div>
            <span className="text-xs font-mono font-black mt-1 leading-none text-rose-500">
              {mineCount}
            </span>
          </button>

          {/* Button unit 3: MAIN NEON GREEN CYCLE/SPIN CASHOUT CTAs */}
          <button 
            type="button"
            onClick={!isPlaying ? startGame : handleCashout}
            disabled={isPlaying && (revealedCount === 0 || status !== 'playing')}
            className="bg-gradient-to-b from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-black font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center flex-col py-2 border border-[#34D399] z-10"
          >
            {!isPlaying ? (
              <>
                <span className="text-[9px] font-black tracking-widest uppercase text-black leading-none">SPIN</span>
                <span className="text-xs font-black uppercase text-black font-mono mt-0.5 leading-none">START</span>
              </>
            ) : (
              <>
                <span className="text-[8px] font-black tracking-widest uppercase text-black leading-none">CLAIM</span>
                <span className="text-[11px] font-black uppercase text-black font-mono mt-0.5 leading-none">Rs {profit}</span>
              </>
            )}
          </button>

          {/* Button unit 4: Double / Repeat Bet Action controller */}
          <button 
            type="button"
            disabled={isPlaying}
            onClick={handleRepeatDouble}
            className="flex flex-col items-center justify-center py-2 bg-[#FFB300] hover:bg-[#FFE082] text-black rounded-xl border border-[#FFF59D] active:scale-95 transition-all shadow-md"
            title="Double Bet size"
          >
            <RotateCcw size={14} className="stroke-[3] text-black" />
            <span className="text-[9px] font-black tracking-wider uppercase text-black mt-1 leading-none">
              2x/Repeat
            </span>
          </button>

        </div>

      </div>

    </div>
  );
};
