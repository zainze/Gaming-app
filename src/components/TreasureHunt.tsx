import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, CheckCircle2, XCircle, Gift, Sparkles } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface TreasureHuntProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const TreasureHunt: React.FC<TreasureHuntProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 35, minBet = 10, multiplier = 3 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chests, setChests] = useState<('win' | 'loss' | null)[]>([null, null, null]);

  const handlePick = (index: number) => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setSelectedChest(index);
    onBet(bet);
    playSound('click');

    const isWin = Math.random() * 100 < winRate;
    
    setTimeout(() => {
      const newChests = [...chests];
      newChests[index] = isWin ? 'win' : 'loss';
      
      // Reveal others
      newChests.forEach((c, i) => {
        if (i !== index) {
          // Fill them randomly for visual effect
          newChests[i] = Math.random() > 0.5 ? 'win' : 'loss';
        }
      });
      
      setChests(newChests);
      
      if (isWin) {
        onWin(bet * multiplier);
        playSound('win');
      } else {
        playSound('lose');
      }

      setTimeout(() => {
        setChests([null, null, null]);
        setSelectedChest(null);
        setPlaying(false);
      }, 2000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#050608] text-white font-sans overflow-hidden">
      <header className="flex items-center justify-between px-4 h-16 bg-black/40 border-b border-white/5 shrink-0 z-10">
        <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <LogOut size={24} />
        </button>
        <span className="text-white font-bold text-base tracking-tight uppercase">Treasure Hunt</span>
        <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
          <span className="text-yellow-500 font-bold text-xs">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 relative">
        <div className="text-center space-y-2 relative z-10">
          <p className="text-yellow-500 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Pick a chest</p>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Win up to {multiplier}x</h2>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-md relative z-10">
          {[0, 1, 2].map((i) => (
            <motion.button
              key={i}
              whileHover={!playing ? { scale: 1.05, y: -5 } : {}}
              whileTap={!playing ? { scale: 0.95 } : {}}
              onClick={() => handlePick(i)}
              disabled={playing}
              className={`aspect-square rounded-[2rem] border-2 transition-all flex items-center justify-center relative overflow-hidden group ${
                selectedChest === i 
                  ? 'border-yellow-500 bg-yellow-500/10' 
                  : chests[i] === 'win'
                    ? 'border-green-500 bg-green-500/10'
                    : chests[i] === 'loss'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-white/10 bg-[#14161a] hover:border-white/20'
              }`}
            >
              {chests[i] === null ? (
                <Gift size={40} className={`text-white/20 transition-all ${!playing && 'group-hover:text-yellow-500 group-hover:scale-110'}`} />
              ) : chests[i] === 'win' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }}>
                  <Sparkles size={40} className="text-yellow-400" />
                </motion.div>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <XCircle size={40} className="text-red-500/50" />
                </motion.div>
              )}
              
              {selectedChest === i && chests[i] === null && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              )}
            </motion.button>
          ))}
        </div>

        <div className="w-full max-w-sm space-y-6 relative z-10">
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                 <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center active:scale-90">-</button>
                 <div className="text-center">
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block">Entry Fee</span>
                    <span className="text-xl font-black text-white">RS {bet}</span>
                 </div>
                 <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center active:scale-90">+</button>
            </div>
            
            <p className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest font-mono">
              Balance: RS {balance.toFixed(2)}
            </p>
        </div>

        {/* Decorative Background */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.05),_transparent_70%)] pointer-events-none" />
      </div>
    </div>
  );
};
