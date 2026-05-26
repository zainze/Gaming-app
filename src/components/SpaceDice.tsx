import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Zap, Target, Binary } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface SpaceDiceProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const SpaceDice: React.FC<SpaceDiceProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 50, minBet = 10, multiplier = 1.9 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [prediction, setPrediction] = useState<'over' | 'under'>('over');
  const [result, setResult] = useState<'win' | 'lose' | null>(null);

  const rollDice = () => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setResult(null);
    onBet(bet);
    playSound('click');

    const isWin = Math.random() * 100 < winRate;
    let finalValue: number;

    if (prediction === 'over') {
        finalValue = isWin ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1;
    } else {
        finalValue = isWin ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4;
    }

    setTimeout(() => {
      setDiceValue(finalValue);
      setPlaying(false);
      
      if (isWin) {
        setResult('win');
        onWin(bet * multiplier);
        playSound('win');
      } else {
        setResult('lose');
        playSound('lose');
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#050914] text-white font-sans overflow-hidden relative">
      {/* Space Background */}
      <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050914_90%)]" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 z-1 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,186,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,186,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-cyan-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Binary size={20} className="text-cyan-400 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Space Dice</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/60">Quantum Roller</span>
        </div>
        <div className="bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/30 backdrop-blur-xl">
          <span className="text-cyan-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 space-y-12">
        <div className="relative">
            {/* Dice Container */}
            <div className="absolute -inset-20 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
            <motion.div 
                animate={playing ? { 
                    rotateX: [0, 360, 720, 1080], 
                    rotateY: [0, 360, 720, 1080],
                    scale: [1, 1.2, 1]
                } : {}}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.3)] flex items-center justify-center text-6xl font-black border-4 border-white/20"
            >
                {diceValue}
            </motion.div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="flex w-full gap-2">
                <button 
                    onClick={() => setPrediction('under')}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest border transition-all ${prediction === 'under' ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                    Under 4
                </button>
                <button 
                    onClick={() => setPrediction('over')}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest border transition-all ${prediction === 'over' ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                    Over 3
                </button>
            </div>

            <div className="w-full bg-black/60 p-4 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                      <Minus size={18} className="text-white" />
                    </button>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block">Quantum Stake</span>
                        <span className="text-2xl font-black">RS {bet}</span>
                    </div>
                    <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                      <Plus size={18} className="text-white" />
                    </button>
                </div>
            </div>

            <button 
                onClick={rollDice}
                disabled={playing || balance < bet}
                className="w-full h-20 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-[2rem] font-black italic text-xl uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 active:scale-95 transition-all disabled:opacity-50"
            >
                {playing ? 'Initializing...' : 'Engage Roll'}
            </button>
        </div>

        <AnimatePresence>
            {result && (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className={`text-6xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] ${
                        result === 'win' ? 'text-green-400' : 'text-red-500'
                    }`}
                >
                    {result === 'win' ? 'MATCH' : 'MISALIGNED'}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
