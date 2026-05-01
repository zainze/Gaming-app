import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Zap, Octagon } from 'lucide-react';

interface LuckyChestsProps {
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  minBet: number;
  balance: number;
}

export const LuckyChests: React.FC<LuckyChestsProps> = ({ onWin, onLoss, minBet, balance }) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);

  const chests = [0, 1, 2];

  const handlePick = (index: number) => {
    if (playing || revealed !== null) return;
    if (balance < bet) return;

    setPlaying(true);
    const winner = Math.floor(Math.random() * 3);
    setWinningIndex(winner);

    setTimeout(() => {
      setRevealed(index);
      setPlaying(false);

      if (index === winner) {
        onWin(bet * 2);
      } else {
        onLoss(bet);
      }
    }, 1000);
  };

  const reset = () => {
    setRevealed(null);
    setWinningIndex(null);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex justify-center gap-4 w-full px-4">
        {chests.map((i) => (
          <motion.button
            key={i}
            disabled={playing || revealed !== null}
            onClick={() => handlePick(i)}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-24 h-24 rounded-2xl flex items-center justify-center border-2 transition-all ${
              revealed === i 
                ? (i === winningIndex ? 'bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-red-500/20 border-red-500') 
                : 'bg-neutral-900 border-neutral-800 hover:border-orange-500/50'
            }`}
          >
            <AnimatePresence mode="wait">
              {revealed === i ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="flex flex-col items-center"
                >
                  {i === winningIndex ? (
                    <Zap className="text-green-500" size={32} />
                  ) : (
                    <Octagon className="text-red-500" size={32} />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  animate={playing ? { rotate: [0, -5, 5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                >
                  <Gift className="text-orange-500" size={40} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {revealed !== null && i === winningIndex && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full text-white">Winner</div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="w-full max-w-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <button 
            disabled={playing || revealed !== null}
            onClick={() => setBet(Math.max(minBet, bet - 10))}
            className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold"
          >-</button>
          <div className="flex-1 text-center font-black text-xl italic tracking-tighter">
            RS {bet}
          </div>
          <button 
            disabled={playing || revealed !== null}
            onClick={() => setBet(bet + 10)}
            className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold"
          >+</button>
        </div>

        {revealed !== null ? (
          <button 
            onClick={reset}
            className="w-full bg-orange-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-orange-500/20 uppercase tracking-widest text-xs"
          >
            Play Again
          </button>
        ) : (
          <p className="text-center text-[10px] font-black uppercase text-neutral-500 tracking-widest">
            {playing ? 'Searching Chest...' : 'Pick a Lucky Chest'}
          </p>
        )}
      </div>
    </div>
  );
};
