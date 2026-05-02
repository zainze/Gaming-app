import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, TrendingUp, Wallet, Zap, RotateCcw, AlertTriangle, Trophy, Play } from 'lucide-react';

interface AviatorProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
}

export const Aviator: React.FC<AviatorProps> = ({ balance, onWin, onBet }) => {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'running' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [betAmount, setBetAmount] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const generateCrashPoint = () => {
    // Standard Aviator logic: 99% / (1 - random)
    // We add a house edge (~3%)
    const r = Math.random();
    return Math.max(1.0, 0.97 / (1.0 - r));
  };

  const startRound = useCallback(() => {
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    setGameState('running');
    setMultiplier(1.0);
    startTimeRef.current = performance.now();
  }, []);

  const handleBet = () => {
    if (balance < betAmount) return;
    onBet(betAmount);
    setHasBet(true);
    if (gameState === 'idle' || gameState === 'crashed') {
      setGameState('waiting');
      // Start round after 3 seconds of "waiting"
      setTimeout(startRound, 2000);
    }
  };

  const handleCashOut = () => {
    if (gameState !== 'running' || !hasBet) return;
    const winAmount = betAmount * multiplier;
    onWin(winAmount);
    setHasBet(false);
    // User cashed out, but game continues until crash
  };

  // Game Loop
  useEffect(() => {
    if (gameState === 'running') {
      const update = (time: number) => {
        const elapsed = (time - startTimeRef.current) / 1000;
        // Exponential growth: multiplier = 1.05^t
        const nextMultiplier = Math.pow(1.15, elapsed);
        
        if (nextMultiplier >= crashPoint) {
          setGameState('crashed');
          setHistory(prev => [crashPoint, ...prev].slice(0, 5));
          setHasBet(false);
          // Wait 3 seconds then go to idle
          setTimeout(() => setGameState('idle'), 3000);
          return;
        }

        setMultiplier(nextMultiplier);
        draw(nextMultiplier);
        requestRef.current = requestAnimationFrame(update);
      };
      requestRef.current = requestAnimationFrame(update);
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [gameState, crashPoint]);

  const draw = (currentMult: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 10) * i);
      ctx.lineTo(w, (h / 10) * i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((w / 10) * i, 0);
      ctx.lineTo((w / 10) * i, h);
      ctx.stroke();
    }

    // Draw Curve
    const progress = Math.min((currentMult - 1) / 5, 1); // Scale curve to 5x
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 4;
    ctx.moveTo(50, h - 50);
    
    const cp1x = 50 + (w - 100) * 0.5;
    const cp1y = h - 50;
    const endX = 50 + (w - 100) * progress;
    const endY = (h - 50) - (h - 100) * progress;

    ctx.quadraticCurveTo(cp1x * progress, cp1y, endX, endY);
    ctx.stroke();

    // Fill Under Curve
    ctx.lineTo(endX, h - 50);
    ctx.lineTo(50, h - 50);
    const grad = ctx.createLinearGradient(0, endY, 0, h - 50);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  };

  return (
    <div className="bg-white p-4 space-y-6 relative overflow-hidden h-full">
      {/* Decorative background elements for "proper graphics" feel */}
      <div className="absolute top-20 left-0 w-full h-px bg-neutral-100" />
      <div className="absolute top-40 left-0 w-full h-px bg-neutral-100" />
      <div className="absolute top-60 left-0 w-full h-px bg-neutral-100" />
      
      {/* Header / History */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 border-b border-neutral-50 relative z-10 px-2 bg-neutral-50/50 rounded-2xl">
        <TrendingUp size={14} className="text-orange-500 shrink-0 mx-2" />
        {history.map((h, i) => (
          <span 
            key={i} 
            className={`px-3 py-1 rounded-full text-[10px] font-black italic border shrink-0 ${h >= 2 ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white border-neutral-100 text-neutral-400'}`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main Game Screen */}
      <div className="relative aspect-[4/3] bg-neutral-50 rounded-[3rem] border border-neutral-100 overflow-hidden shadow-inner group">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={450} 
          className="w-full h-full"
        />
        
        {/* Sky gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-neutral-50 to-orange-100/20 pointer-events-none" />

        {/* Multiplier Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <AnimatePresence mode="wait">
            {gameState === 'running' && (
              <motion.div 
                key="mult"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <span className="text-8xl font-black italic text-neutral-900 tracking-tighter drop-shadow-sm">
                  {multiplier.toFixed(2)}x
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/50">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">In Flight</p>
                </div>
              </motion.div>
            )}
            {gameState === 'crashed' && (
              <motion.div 
                key="crash"
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="bg-red-500 text-white px-6 py-2 rounded-2xl rotate-[-2deg] shadow-xl shadow-red-500/20">
                    <p className="font-black italic text-4xl uppercase tracking-tighter">Flew Away!</p>
                </div>
                <p className="text-neutral-400 text-sm font-black mt-4 uppercase tracking-[0.3em]">Crashed at {multiplier.toFixed(2)}x</p>
              </motion.div>
            )}
            {gameState === 'waiting' && (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-neutral-100 rounded-full" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <Plane className="absolute inset-0 m-auto text-orange-500" size={24} fill="currentColor" />
                </div>
                <div className="text-center">
                    <p className="text-neutral-900 font-black italic text-2xl uppercase tracking-tight">Preparing Run</p>
                    <p className="text-neutral-400 font-black uppercase text-[8px] tracking-widest mt-1">Engines Spooling up...</p>
                </div>
              </motion.div>
            )}
            {gameState === 'idle' && (
                <motion.div 
                   key="idle"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex flex-col items-center gap-4"
                >
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-neutral-50">
                        <Zap size={32} className="text-orange-500" fill="currentColor" />
                    </div>
                     <div className="text-center">
                        <p className="text-neutral-900 font-black italic text-2xl uppercase tracking-tight">Ready for Takeoff</p>
                        <p className="text-neutral-400 font-black uppercase text-[8px] tracking-widest mt-1">Deploy bet to begin sequence</p>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plane Icon following the curve */}
        {gameState === 'running' && (
           <motion.div 
             className="absolute bottom-12 left-12 text-orange-500 z-10"
             animate={{ 
               x: Math.min((multiplier - 1) * 60, 240),
               y: Math.max(-(multiplier - 1) * 40, -160),
               rotate: -15
             }}
             transition={{ duration: 0.1, ease: "linear" }}
           >
             <div className="relative">
                <Plane size={48} fill="currentColor" className="drop-shadow-xl" />
                {/* Engine exhaust effect */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 flex gap-1 mr-2">
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 0.2 }} className="w-4 h-1 bg-orange-400 rounded-full blur-sm" />
                    <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 0.15 }} className="w-2 h-1 bg-orange-300 rounded-full blur-sm" />
                </div>
             </div>
           </motion.div>
        )}
      </div>

      {/* Control Panel */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            {/* Bet Amount Selector */}
            <div className="bg-neutral-50 p-4 rounded-3xl border border-neutral-100 flex flex-col justify-center">
               <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Wager Space</span>
                    <div className="flex gap-1">
                        <button onClick={() => setBetAmount(a => Math.max(10, a/2))} className="w-6 h-6 rounded-lg bg-white border border-neutral-200 text-[8px] font-black">½</button>
                        <button onClick={() => setBetAmount(a => a*2)} className="w-6 h-6 rounded-lg bg-white border border-neutral-200 text-[8px] font-black">2x</button>
                    </div>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-[10px] font-black text-orange-500">RS</span>
                 <input 
                    type="number" 
                    value={betAmount} 
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="bg-transparent text-3xl font-black italic text-neutral-900 outline-none w-full"
                 />
               </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col h-full">
              {hasBet && gameState === 'running' ? (
                <button 
                  onClick={handleCashOut}
                  className="h-full bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-black flex flex-col items-center justify-center shadow-xl shadow-orange-500/20 active:scale-95 transition-all group"
                >
                  <span className="text-[10px] uppercase font-bold text-orange-200 mb-1 group-hover:scale-110 transition-transform">Collect Profits</span>
                  <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-white" />
                    <span className="text-2xl italic tracking-tighter">RS {(betAmount * multiplier).toFixed(1)}</span>
                  </div>
                </button>
              ) : (
                <button 
                  onClick={handleBet}
                  disabled={hasBet || gameState === 'running' || gameState === 'waiting' || balance < betAmount}
                  className="h-full bg-neutral-900 hover:bg-black disabled:bg-neutral-100 disabled:text-neutral-400 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                  {hasBet ? 'Deployment Confirmed' : 'Initiate Mission'}
                  {!hasBet && <Play size={14} className="fill-current" />}
                </button>
              )}
            </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-neutral-400 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-100">
                <Wallet size={14} className="text-green-500" />
                <span className="text-[9px] font-black uppercase">Vault: RS {balance.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-100">
                <RotateCcw size={14} className="text-orange-500" />
                <span className="text-[9px] font-black uppercase">Instant Payouts</span>
            </div>
        </div>
      </div>
    </div>
  );
};
