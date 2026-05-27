import { useState, useMemo } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { Trophy, Zap, Sparkles, LogOut, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { playSound, stopSound } from "../lib/sounds";

interface SwipeMasterProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  userBalance: number;
  betAmount: number; // minBet
  winRate?: number;
  multiplier?: number;
  onExit: () => void;
}

export default function SwipeMaster({ 
  onWin, 
  onBet, 
  userBalance, 
  betAmount = 10, 
  winRate = 40, 
  multiplier = 3,
  onExit 
}: SwipeMasterProps) {
  const [gameState, setGameState] = useState<'idle' | 'charged' | 'swiped' | 'result'>('idle');
  const [bet, setBet] = useState(betAmount);
  const [result, setResult] = useState<{ isWin: boolean; wonAmount: number } | null>(null);
  const [statusMsg, setStatusMsg] = useState("Place your stake & charge the lucky core!");
  const [shake, setShake] = useState(false);

  // Motion physics parameters for interactive dragging
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Dynamic visual feedback transforms based on target distance
  const scale = useTransform(dragX, [-150, 0, 150], [1.1, 1, 1.1]);
  const dragRotate = useTransform(dragX, [-180, 180], [-35, 35]);
  
  // High fidelity glows depending on swipe directions
  const leftGlowOpacity = useTransform(dragX, [-150, 0], [0.8, 0]);
  const rightGlowOpacity = useTransform(dragX, [0, 150], [0, 0.8]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const chargeCore = async () => {
    if (gameState !== 'idle') return;

    if (userBalance < bet) {
      triggerShake();
      playSound('error');
      setStatusMsg("Insufficient balance! Choose lower chip.");
      return;
    }

    const success = await onBet(bet);
    if (!success) {
      playSound('error');
      return;
    }

    // Set interactive ready state
    setGameState('charged');
    setResult(null);
    setStatusMsg("Core charged! FLING / SWIPE to the green WIN zone!");
    playSound('ready');
  };

  const handleDragEnd = (_e: any, info: any) => {
    if (gameState !== 'charged') return;

    const threshold = 70;
    const { x: xOffset, y: yOff } = info.offset;
    const { x: xVel } = info.velocity;

    // Detect powerful horizontal flicks
    if (Math.abs(xOffset) > threshold || Math.abs(xVel) > 400) {
      const swipedRight = xOffset > threshold || xVel > 400;
      
      setGameState('swiped');
      
      // Determine final state based on mathematically true chance rate
      const roll = Math.random() * 100;
      const isWin = swipedRight && roll < winRate;
      const payout = isWin ? bet * multiplier : 0;

      setTimeout(() => {
        setResult({ isWin, wonAmount: payout });
        setGameState('result');

        if (isWin) {
          playSound('win');
          onWin(payout);
          setStatusMsg(`JACKPOT! core aligned successfully (+${payout} RS)`);
        } else {
          playSound('lose');
          setStatusMsg(swipedRight ? "Alignment failed! Cosmic friction." : "Wrong zone! Core destabilized.");
        }
      }, 300);

    } else {
      // Re-center if gesture criteria not met
      dragX.set(0);
      dragY.set(0);
    }
  };

  return (
    <div className={`w-full h-full bg-[#0d0e10] text-[#9EA0A3] font-sans relative flex flex-col overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      
      {/* Background Ambience Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.06),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      {/* Aviator Professional Top Navigation Bar */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-500 animate-pulse" size={20} />
          <span className="text-blue-500 font-extrabold italic tracking-tighter text-lg uppercase whitespace-nowrap">Swipe Master</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {userBalance.toFixed(0)}</span>
        </div>

        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow-lg"
        >
          <LogOut size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Quit</span>
        </button>
      </header>

      {/* Structured Screen Viewport Wrapper */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 flex flex-col justify-between py-4 relative z-10 min-h-0">
        
        {/* Helper status bar */}
        <div className="bg-[#141516]/90 border border-[#2C2D2E]/45 rounded-2xl p-3 text-center flex items-center justify-between shadow-lg shrink-0">
          <div className="text-left">
            <span className="block text-[8px] font-black text-neutral-400 tracking-wider uppercase">LAUNCH CONTROLLER</span>
            <span className="text-xs font-bold text-white tracking-tight">{statusMsg}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-xl">
            <span className="text-[7.5px] font-bold uppercase text-neutral-400">MULTIPLIER:</span>
            <span className="text-[11px] font-black text-blue-400">{multiplier}X</span>
          </div>
        </div>

        {/* Dynamic Launch Felt/Arena */}
        <div className="flex-1 my-4 bg-gradient-to-b from-[#09111c] to-[#04070c] rounded-3xl border border-[#14233a]/80 shadow-2xl relative flex items-center justify-center overflow-hidden min-h-[220px]">
          
          {/* Dynamic Laser guidelines & reactive glows */}
          <div className="absolute inset-0 pointer-events-none flex justify-between items-center z-0 px-6">
            {/* MISS zone visual marker */}
            <motion.div 
              style={{ opacity: leftGlowOpacity }}
              className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-red-600/20 to-transparent blur-[12px]" 
            />
            {/* WIN zone visual marker */}
            <motion.div 
              style={{ opacity: rightGlowOpacity }}
              className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-emerald-600/20 to-transparent blur-[12px]" 
            />

            {/* Left label zone */}
            <div className="flex flex-col items-center gap-1 opacity-25">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 flex items-center justify-center">
                <ArrowLeft className="text-red-500 w-5 h-5 animate-pulse" />
              </div>
              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">MISS POINT</span>
            </div>

            {/* Right label zone */}
            <div className="flex flex-col items-center gap-1 opacity-25">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-500 flex items-center justify-center">
                <ArrowRight className="text-emerald-500 w-5 h-5 animate-pulse" />
              </div>
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">WIN LIMIT</span>
            </div>
          </div>

          {/* Tactical core track center decoration */}
          <div className="absolute inset-x-8 h-[2px] bg-gradient-to-r from-red-500/20 via-blue-500/30 to-emerald-500/20" />

          {/* Core Interactive Fling Widget */}
          <div className="relative w-full h-full flex items-center justify-center">
            
            <AnimatePresence>
              {gameState === 'idle' || gameState === 'result' ? (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="z-10 flex flex-col items-center text-center space-y-4"
                >
                  {result && (
                    <div className="space-y-1">
                      <p className={`text-4xl font-extrabold tracking-tighter italic ${result.isWin ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]' : 'text-rose-500'}`}>
                        {result.isWin ? `+ RS ${result.wonAmount}` : 'LOST'}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
                        {result.isWin ? "ALIGNMENT LOCKED" : "DESTABILIZED"}
                      </p>
                    </div>
                  )}

                  {gameState === 'result' && (
                    <button 
                      onClick={() => setGameState('idle')}
                      className="bg-[#141d2d] hover:bg-[#1a263b] text-blue-400 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-500/30 flex items-center gap-2 shadow-lg"
                    >
                      <RefreshCw size={14} className="animate-spin" />
                      Play Again
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -180, right: 180 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  style={{ x: dragX, y: dragY, scale, rotate: dragRotate }}
                  whileHover={{ scale: 1.05 }}
                  whileDrag={{ scale: 1.15, cursor: "grabbing" }}
                  className="w-28 h-28 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-gradient-to-br from-[#1c2e4f] to-[#04070c] border-4 border-blue-500 cursor-grab z-20 relative flex items-center justify-center relative select-none"
                >
                  {/* Energy ripple effects within core chip */}
                  <div className="absolute inset-1.5 rounded-full border border-dashed border-blue-400/40 animate-spin-slow" />
                  
                  {/* Neon light source core particle */}
                  <div className="relative z-10 flex flex-col items-center text-center pointer-events-none">
                    <Zap size={32} className="text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.8)] animate-pulse" />
                    <span className="text-[6.5px] font-black uppercase tracking-wider text-blue-300 mt-0.5">SLIDE COIN</span>
                  </div>

                  {/* Aesthetic glowing orbits */}
                  <div className="absolute inset-0.5 rounded-full bg-blue-500/5 filter blur-[3px] animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Sticky Action and Chip Selector Panels */}
        <div className="space-y-3 shrink-0">
          
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-neutral-400 tracking-wider px-1">
            <span>SELECT COIN CHIP</span>
            <span className="text-blue-400">WIN RATE: {winRate}%</span>
          </div>

          {/* Professional standard quick launch chips */}
          <div className="flex gap-2.5">
            {[betAmount, betAmount * 2, betAmount * 5, betAmount * 10, betAmount * 50].map((v) => {
              const active = bet === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={gameState !== 'idle'}
                  onClick={() => {
                    playSound('chip');
                    setBet(v);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase border-2 text-xs flex flex-col items-center justify-center transition-all ${
                    active 
                      ? 'bg-blue-500 border-blue-300 text-neutral-900 shadow-md shadow-blue-500/20 -translate-y-[1px]' 
                      : 'border-white/10 bg-[#141516]/40 text-[#6B6D6F] hover:border-white/20 hover:text-white disabled:opacity-40'
                  }`}
                >
                  <span className="text-[7px] font-bold block mb-0.5">CHIP</span>
                  <span className="font-extrabold text-xs">{v}</span>
                </button>
              );
            })}
          </div>

          {/* Master trigger launcher */}
          <button
            type="button"
            onClick={chargeCore}
            disabled={gameState !== 'idle'}
            className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 font-extrabold text-[#050912] rounded-2xl tracking-wider text-sm flex items-center justify-center gap-2 shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {gameState === 'idle' ? (
              <>
                <Zap className="w-4 h-4 text-neutral-900 animate-pulse" />
                <span>CHARGE & STAKE COIN ({bet} RS)</span>
              </>
            ) : gameState === 'charged' ? (
              <span className="text-[#050912] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <ArrowRight className="w-4 h-4" /> SWIPE THE COIN TO DIRECT THE BONUS!
              </span>
            ) : (
              <span>DESTABILIZING MAGNETIC CORE...</span>
            )}
          </button>

        </div>

      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.1s ease-in-out; }
      `}</style>
    </div>
  );
}
