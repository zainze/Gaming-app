import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eraser, Zap, Trophy, Coins } from 'lucide-react';

interface ScratchCardProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  minBet = 10, 
  winRate = 40, 
  multiplier = 4 
}) => {
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [bet, setBet] = useState(minBet);

  const startScratch = async () => {
    if (playing) return;
    const success = await onBet(bet);
    if (!success) return;

    setPlaying(true);
    setRevealed(false);
    setIsWinner(Math.random() < (winRate / 100));
  };

  const handleScratch = () => {
    if (!playing || revealed) return;
    setRevealed(true);
    if (isWinner) {
      onWin(bet * multiplier);
    }
  };

  const reset = () => {
    setPlaying(false);
    setRevealed(false);
    setIsWinner(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6 flex flex-col items-center w-full max-w-sm mx-auto">
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-orange-500">Gold Scratch</h3>
        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Scratch to reveal your prize</p>
      </div>

      <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden border-4 border-neutral-800 shadow-2xl">
        {!playing ? (
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 animate-pulse">
                <Eraser size={32} />
             </div>
             <p className="text-neutral-400 font-bold uppercase text-xs">Ready to test your luck?</p>
             <button 
               onClick={startScratch}
               className="bg-orange-500 text-white px-6 py-2 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20"
             >
               Buy for RS {bet}
             </button>
          </div>
        ) : (
          <div className="absolute inset-0">
            {/* Prize Layer */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 space-y-2 ${isWinner ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
               {isWinner ? (
                 <>
                   <Trophy size={64} className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                   <p className="font-black text-2xl italic uppercase text-yellow-500">RS {bet * multiplier}</p>
                 </>
               ) : (
                 <>
                   <Zap size={64} className="text-neutral-700" />
                   <p className="font-black text-xl italic uppercase text-neutral-700">Better Luck</p>
                 </>
               )}
            </div>

            {/* Scratch Layer */}
            <AnimatePresence>
              {!revealed && (
                <motion.div 
                  exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                  onClick={handleScratch}
                  className="absolute inset-0 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900 cursor-pointer group"
                >
                   <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 blur-2xl bg-orange-500/20 group-hover:bg-orange-500/40 transition-all" />
                        <motion.div 
                          animate={{ rotate: [0, -2, 2, 0] }} 
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-24 h-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md"
                        >
                           <Eraser className="text-white/40" size={40} />
                        </motion.div>
                      </div>
                      <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.2em]">Touch to Scratch</p>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="w-full space-y-4">
        {playing && revealed && (
           <button 
             onClick={reset}
             className="w-full bg-neutral-800 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-neutral-700"
           >
             Continue Playing
           </button>
        )}
        
        {!playing && (
          <div className="flex gap-2">
            {[minBet, minBet * 5, minBet * 10].map(val => (
              <button 
                key={val}
                onClick={() => setBet(val)}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] border transition-all ${bet === val ? 'bg-orange-500 border-orange-400 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-500'}`}
              >
                RS {val}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
