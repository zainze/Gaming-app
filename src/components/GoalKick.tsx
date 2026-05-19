import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Zap, Trophy, Target } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface PenaltyRoyaleProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const GoalKick: React.FC<PenaltyRoyaleProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10, multiplier = 1.9 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'ready' | 'acting' | 'result'>('ready');
  const [ballState, setBallState] = useState<'idle' | 'shot'>('idle');
  const [shotTarget, setShotTarget] = useState<'left' | 'center' | 'right' | null>(null);
  const [keeperPos, setKeeperPos] = useState<'left' | 'center' | 'right'>('center');
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);

  const shoot = (target: 'left' | 'center' | 'right') => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setShotTarget(target);
    onBet(bet);
    playSound('click');

    const isWin = Math.random() * 100 < winRate;
    const keeperTargets: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    let finalKeeperPos: 'left' | 'center' | 'right';

    if (isWin) {
        finalKeeperPos = keeperTargets.filter(t => t !== target)[Math.floor(Math.random() * 2)];
    } else {
        finalKeeperPos = target;
    }

    setBallState('shot');
    setTimeout(() => {
        setKeeperPos(finalKeeperPos);
        playSound('swipe');
        
        setTimeout(() => {
            setStage('result');
            setPlaying(false);
            if (isWin) {
                setGameResult('win');
                onWin(bet * multiplier);
                playSound('win');
            } else {
                setGameResult('lose');
                playSound('lose');
            }
        }, 1000);
    }, 500);
  };

  const reset = () => {
    setBallState('idle');
    setShotTarget(null);
    setKeeperPos('center');
    setStage('ready');
    setGameResult(null);
    setPlaying(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#072418] text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-black/80 via-transparent to-[#072418]" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-green-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-green-500 font-black italic tracking-tighter text-2xl uppercase">Penalty Royale</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500/60">Champions League</span>
        </div>
        <div className="bg-green-500/10 px-4 py-2 rounded-2xl border border-green-500/30 backdrop-blur-xl">
          <span className="text-green-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-between p-8 relative z-10">
        {/* Goal Area */}
        <div className="w-full max-w-2xl aspect-[2/1] relative border-x-8 border-t-8 border-white rounded-t-xl bg-green-900/20 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 20px)', backgroundSize: '20px 20px' }} />
            
            {/* Goalkeeper */}
            <motion.div 
                animate={{ 
                    x: keeperPos === 'left' ? -200 : keeperPos === 'right' ? 200 : 0,
                    y: keeperPos === 'center' ? 0 : 50,
                    rotate: keeperPos === 'left' ? -45 : keeperPos === 'right' ? 45 : 0
                }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-8xl"
            >
                🧤
            </motion.div>

            {/* Ball in Goal */}
            <AnimatePresence>
                {ballState === 'shot' && (
                    <motion.div 
                        initial={{ scale: 0.2, y: 300, x: 0 }}
                        animate={{ 
                            scale: 0.8, 
                            y: 50, 
                            x: shotTarget === 'left' ? -200 : shotTarget === 'right' ? 200 : 0 
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl z-20"
                    >
                        ⚽
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clickable Zones */}
            {stage === 'ready' && (
                <div className="absolute inset-0 flex">
                    <button onClick={() => shoot('left')} className="flex-1 hover:bg-white/10 transition-colors flex items-center justify-center group">
                        <Target className="text-white/0 group-hover:text-white/20" size={48} />
                    </button>
                    <button onClick={() => shoot('center')} className="flex-1 hover:bg-white/10 transition-colors flex items-center justify-center group border-x border-white/5">
                        <Target className="text-white/0 group-hover:text-white/20" size={48} />
                    </button>
                    <button onClick={() => shoot('right')} className="flex-1 hover:bg-white/10 transition-colors flex items-center justify-center group">
                        <Target className="text-white/0 group-hover:text-white/20" size={48} />
                    </button>
                </div>
            )}
        </div>

        {/* Result UI */}
        <AnimatePresence>
            {stage === 'result' && (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
                    <span className={`text-7xl font-black italic uppercase tracking-tighter ${gameResult === 'win' ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'text-red-500'}`}>
                        {gameResult === 'win' ? 'GOAL!' : 'SAVED!'}
                    </span>
                    <button onClick={reset} className="px-10 py-3 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Next Shot</button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Betting Controls */}
        <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center justify-between bg-black/60 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
                <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">-</button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block mb-1">STAKE</span>
                    <span className="text-3xl font-black italic tracking-tight">RS {bet}</span>
                </div>
                <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">+</button>
            </div>
            
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 animate-pulse">Select target to shoot</p>
            </div>
        </div>
      </div>
    </div>
  );
};
