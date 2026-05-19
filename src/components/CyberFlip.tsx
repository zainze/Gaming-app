import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Zap, Coins } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface CyberFlipProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const CyberFlip: React.FC<CyberFlipProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 48, minBet = 10, multiplier = 1.95 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);

  const flip = (selectedSide: 'heads' | 'tails') => {
    if (balance < bet || playing) return;
    
    setSide(selectedSide);
    setPlaying(true);
    setResult(null);
    setOutcome(null);
    onBet(bet);
    playSound('chip');

    const isWin = Math.random() * 100 < winRate;
    const finalResult = isWin ? selectedSide : (selectedSide === 'heads' ? 'tails' : 'heads');

    setTimeout(() => {
      setResult(finalResult);
      setPlaying(false);
      
      if (isWin) {
        setOutcome('win');
        onWin(bet * multiplier);
        playSound('win');
      } else {
        setOutcome('lose');
        playSound('lose');
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans overflow-hidden relative">
      {/* Matrix-like Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,255,100,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505] z-1" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-green-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Coins size={20} className="text-green-400 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Cyber Flip</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-400/60">Binary Outcome</span>
        </div>
        <div className="bg-green-500/10 px-4 py-2 rounded-2xl border border-green-500/30 backdrop-blur-xl">
          <span className="text-green-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 space-y-16">
        <div className="relative perspective-1000">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={playing ? 'flipping' : (result || 'idle')}
                    initial={{ rotateX: 0, scale: 0.8, opacity: 0 }}
                    animate={playing ? { 
                        rotateX: [0, 360, 720, 1080], 
                        y: [0, -150, 0],
                        scale: [1, 1.2, 1],
                        opacity: 1
                    } : { 
                        rotateX: 0,
                        scale: 1,
                        opacity: 1
                    }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className={`w-48 h-48 rounded-full border-8 flex items-center justify-center text-6xl shadow-[0_0_50px_rgba(34,211,238,0.2)] bg-gradient-to-br from-gray-800 to-black ${
                        outcome === 'win' ? 'border-green-500 text-green-500' : outcome === 'lose' ? 'border-red-500 text-red-500' : 'border-green-500/30 text-green-500/40'
                    }`}
                >
                    {result === 'heads' ? '0' : result === 'tails' ? '1' : playing ? '?' : '∅'}
                </motion.div>
            </AnimatePresence>
            
            {/* Glow effect */}
            <div className="absolute -inset-10 bg-green-500/5 rounded-full blur-[60px] -z-10" />
        </div>

        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="flex w-full gap-3">
                <button 
                  onClick={() => flip('heads')}
                  disabled={playing}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 ${side === 'heads' ? 'bg-green-500 text-black border-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                    Node 0
                </button>
                <button 
                  onClick={() => flip('tails')}
                  disabled={playing}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 ${side === 'tails' ? 'bg-green-500 text-black border-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                    Node 1
                </button>
            </div>

            <div className="w-full bg-black/60 p-4 rounded-[2rem] border border-white/5">
                <div className="flex items-center justify-between">
                    <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">-</button>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block">Stake</span>
                        <span className="text-xl font-black italic">RS {bet}</span>
                    </div>
                    <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">+</button>
                </div>
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Win 1.95x on match</p>
        </div>
      </div>
    </div>
  );
};
