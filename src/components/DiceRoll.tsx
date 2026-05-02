import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Trophy, AlertCircle } from 'lucide-react';

interface DiceRollProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

export const DiceRoll: React.FC<DiceRollProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  minBet = 10, 
  winRate = 45, 
  multiplier = 2 
}) => {
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [bet, setBet] = useState(minBet);
  const [result, setResult] = useState<string | null>(null);

  const roll = async () => {
    if (rolling) return;
    const success = await onBet(bet);
    if (!success) return;

    setRolling(true);
    setResult(null);

    // Dynamic win logic
    const isWin = Math.random() < (winRate / 100);
    
    setTimeout(() => {
      // If win, dice value 4-6, else 1-3
      const finalValue = isWin 
        ? Math.floor(Math.random() * 3) + 4 
        : Math.floor(Math.random() * 3) + 1;
      
      setDiceValue(finalValue);
      setRolling(false);

      if (isWin) {
        setResult(`YOU WON RS ${bet * multiplier}!`);
        onWin(bet * multiplier);
      } else {
        setResult("TRY AGAIN");
      }
    }, 1500);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-8 flex flex-col items-center">
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Dice Pro</h3>
        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Roll high to win big</p>
      </div>

      <div className="relative w-32 h-32 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={diceValue + (rolling ? 'rolling' : 'idle')}
            initial={{ rotateX: 0, rotateY: 0, scale: 0.8, opacity: 0 }}
            animate={rolling 
              ? { 
                  rotateX: [0, 360, 720], 
                  rotateY: [0, 360, 720],
                  scale: 1,
                  opacity: 1
                } 
              : { rotateX: 0, rotateY: 0, scale: 1, opacity: 1 }
            }
            transition={rolling ? { repeat: Infinity, duration: 0.5, ease: "linear" } : { type: "spring", stiffness: 300 }}
            className={`w-24 h-24 bg-white rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center border-4 border-neutral-200`}
          >
            <div className="grid grid-cols-3 gap-2 p-4">
              {/* Simple Dice Pip Logic */}
              {[...Array(9)].map((_, i) => {
                const pips = {
                  1: [4],
                  2: [0, 8],
                  3: [0, 4, 8],
                  4: [0, 2, 6, 8],
                  5: [0, 2, 4, 6, 8],
                  6: [0, 2, 3, 5, 6, 8]
                }[diceValue as keyof typeof pips] || [];
                return (
                  <div key={i} className={`w-3 h-3 rounded-full ${pips.includes(i) ? 'bg-black' : 'bg-transparent'}`} />
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {result && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
          <p className={`font-black text-lg italic uppercase ${result.includes('WON') ? 'text-green-500' : 'text-red-500'}`}>{result}</p>
        </motion.div>
      )}

      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black text-neutral-500 uppercase">Wager</span>
          <span className="text-orange-500 font-black italic">RS {bet}</span>
        </div>
        <div className="flex gap-2">
          {[minBet, minBet * 2, minBet * 5, minBet * 10].map(val => (
            <button 
              key={val}
              onClick={() => setBet(val)}
              disabled={rolling}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] border transition-all ${bet === val ? 'bg-orange-500 border-orange-400 text-white shadow-lg' : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
            >
              RS {val}
            </button>
          ))}
        </div>
        <button
          onClick={roll}
          disabled={rolling || balance < bet}
          className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all active:scale-95"
        >
          {rolling ? 'Rolling...' : `Roll Dice`}
        </button>
      </div>
    </div>
  );
};
