import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Zap, UtensilsCrossed } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface SushiStrikeProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const SushiStrike: React.FC<SushiStrikeProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 33, minBet = 10, multiplier = 2.8 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<number | null>(null);
  const [revealedPlate, setRevealedPlate] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);

  const pickPlate = (index: number) => {
    if (balance < bet || playing) return;
    
    setSelectedPlate(index);
    setPlaying(true);
    setRevealedPlate(null);
    setOutcome(null);
    onBet(bet);
    playSound('chip');

    const isWin = Math.random() * 100 < winRate;
    const finalWinningPlate = isWin ? index : (Math.floor(Math.random() * 3));

    setTimeout(() => {
        setRevealedPlate(finalWinningPlate);
        setPlaying(false);
        if (finalWinningPlate === index) {
            setOutcome('win');
            onWin(bet * multiplier);
            playSound('win');
        } else {
            setOutcome('lose');
            playSound('lose');
        }
        
        setTimeout(() => {
            setSelectedPlate(null);
            setRevealedPlate(null);
            setOutcome(null);
        }, 2000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#120a0a] text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-1" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-orange-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-orange-500 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Sushi Strike</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">Midnight Diner</span>
        </div>
        <div className="bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/30 backdrop-blur-xl">
          <span className="text-orange-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 space-y-16">
        <div className="flex gap-8 justify-center items-end">
            {[0, 1, 2].map((i) => (
                <motion.button
                    key={i}
                    onClick={() => pickPlate(i)}
                    disabled={playing || selectedPlate !== null}
                    animate={selectedPlate === i ? { y: -20, scale: 1.1 } : { y: 0, scale: 1 }}
                    className="relative group"
                >
                    {/* Plate Shadow */}
                    <div className="absolute -bottom-2 inset-x-2 h-4 bg-black/40 blur-xl rounded-full" />
                    
                    {/* Plate Cover */}
                    <motion.div 
                        initial={false}
                        animate={revealedPlate !== null ? { y: -100, rotate: 45, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full border-b-8 border-gray-600 shadow-2xl flex items-center justify-center relative z-20"
                    >
                         <div className="w-4 h-8 bg-gray-400 rounded-t-full absolute -top-4 border-t border-white/20" />
                    </motion.div>

                    {/* Content */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 text-5xl">
                        {revealedPlate === i ? '🍣' : ''}
                    </div>

                    {selectedPlate === i && !revealedPlate && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-orange-500 font-black animate-bounce text-sm">SELECT</div>
                    )}
                </motion.button>
            ))}
        </div>

        <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Find the Gold Sushi</h3>
                <p className="text-orange-500/60 text-xs font-black uppercase tracking-[0.3em]">3 Covers • 1 Prize • 2.8x Reward</p>
            </div>

            <div className="bg-black/60 p-5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-between">
                <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">-</button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block mb-1">STAKE</span>
                    <span className="text-3xl font-black italic tracking-tight">RS {bet}</span>
                </div>
                <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all">+</button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {outcome && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`fixed inset-center z-50 text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${
                    outcome === 'win' ? 'text-green-500' : 'text-red-500'
                }`}
            >
                {outcome === 'win' ? 'DELICIOUS' : 'EMPTY'}
                <div className="text-center text-sm font-black text-white/40 mt-2">
                    {outcome === 'win' ? `+RS ${bet * multiplier}` : 'TRY AGAIN'}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
