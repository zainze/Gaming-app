import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, RotateCw, Trophy } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface WheelOfFortuneProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
}

const SECTORS = [
  { label: '0x', color: '#EF4444', mult: 0 },
  { label: '2x', color: '#10B981', mult: 2 },
  { label: '0x', color: '#EF4444', mult: 0 },
  { label: '5x', color: '#F59E0B', mult: 5 },
  { label: '0x', color: '#EF4444', mult: 0 },
  { label: '1.5x', color: '#3B82F6', mult: 1.5 },
  { label: '0x', color: '#EF4444', mult: 0 },
  { label: '3x', color: '#8B5CF6', mult: 3 },
];

export const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10 
}) => {
  const [bet, setBet] = useState(minBet);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const spin = () => {
    if (balance < bet || spinning) return;
    
    setSpinning(true);
    setResult(null);
    onBet(bet);
    playSound('spin');

    const isWin = Math.random() * 100 < winRate;
    let targetSectorIndex: number;

    if (isWin) {
      // Pick a sector with mult > 0
      const winSectors = SECTORS.map((s, i) => s.mult > 0 ? i : -1).filter(i => i !== -1);
      targetSectorIndex = winSectors[Math.floor(Math.random() * winSectors.length)];
    } else {
      // Pick a sector with mult === 0
      const lossSectors = SECTORS.map((s, i) => s.mult === 0 ? i : -1).filter(i => i !== -1);
      targetSectorIndex = lossSectors[Math.floor(Math.random() * lossSectors.length)];
    }

    const sectorAngle = 360 / SECTORS.length;
    const targetRotation = 360 * 5 + (360 - (targetSectorIndex * sectorAngle)) - (sectorAngle / 2);
    
    setRotation(prev => prev + targetRotation);

    setTimeout(() => {
      setSpinning(false);
      stopSound('spin');
      const winMultiplier = SECTORS[targetSectorIndex].mult;
      
      if (winMultiplier > 0) {
        onWin(bet * winMultiplier);
        setResult(bet * winMultiplier);
        playSound('win');
      } else {
        setResult(0);
        playSound('lose');
      }
    }, 4000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0510] text-white font-sans overflow-hidden relative">
      {/* Glamorous Stage Background */}
      <div className="absolute inset-0 z-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-purple-900/40 via-transparent to-black" />
      
      {/* Light Beams */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(circle_at_20%_0%,_rgba(168,85,247,0.3),_transparent_70%)]" />
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(circle_at_80%_0%,_rgba(236,72,153,0.3),_transparent_70%)]" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-white/5 backdrop-blur-xl shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Royal Wheel</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400/60">Grand Prize Stage</span>
        </div>
        <div className="bg-yellow-500/10 px-4 py-2 rounded-2xl border border-yellow-500/20 backdrop-blur-xl">
          <span className="text-yellow-400 font-black text-sm tracking-tight uppercase">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 relative z-10">
        <div className="relative">
          {/* Wheel Deco */}
          <div className="absolute -inset-10 border-[20px] border-white/5 rounded-full blur-2xl" />
          <div className="absolute -inset-6 border-4 border-yellow-500/10 rounded-full" />
          
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-20">
            <div className="w-8 h-12 bg-white rounded-b-full shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center justify-center">
              <div className="w-1.5 h-6 bg-red-600 rounded-full" />
            </div>
          </div>

          <motion.div 
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.45, 0.05, 0.55, 0.95] }}
            className="w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full border-[12px] border-[#222] shadow-[0_0_100px_rgba(147,51,234,0.3)] relative overflow-hidden"
            style={{ transformOrigin: 'center' }}
          >
            {SECTORS.map((s, i) => (
              <div 
                key={i}
                className="absolute top-1/2 left-1/2 w-full h-full origin-top-left"
                style={{ 
                  backgroundColor: s.color,
                  transform: `rotate(${i * (360/SECTORS.length)}deg) skewY(${90 - (360/SECTORS.length)}deg)`
                }}
              />
            ))}
            {SECTORS.map((s, i) => (
              <div 
                key={`label-${i}`}
                className="absolute w-full h-full flex items-start justify-center pt-8 text-xs font-black"
                style={{ transform: `rotate(${i * (360/SECTORS.length) + (360/SECTORS.length/2)}deg)` }}
              >
                <span style={{ transform: 'rotate(0deg)' }}>{s.label}</span>
              </div>
            ))}
            <div className="absolute inset-0 m-auto w-12 h-12 bg-[#050B14] rounded-full border-4 border-white/10 shadow-xl z-10 flex items-center justify-center">
               <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {result !== null && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`px-8 py-3 rounded-2xl font-black italic text-xl uppercase tracking-widest ${
                result > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {result > 0 ? `WIN RS ${result}` : 'Try Again'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-between bg-black/40 p-4 rounded-3xl border border-white/5">
            <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={spinning} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">-</button>
            <div className="text-center">
              <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block">Bet Amount</span>
              <span className="text-xl font-black">RS {bet}</span>
            </div>
            <button onClick={() => setBet(bet + 10)} disabled={spinning} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">+</button>
          </div>

          <button 
            onClick={spin}
            disabled={spinning || balance < bet}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black italic text-xl uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {spinning ? 'Spinning...' : 'Spin Wheel'}
          </button>
        </div>
      </div>
    </div>
  );
};
