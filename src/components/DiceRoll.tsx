import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, RotateCcw, Box } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface DiceRollProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

const DiceFace = ({ value }: { value: number }) => {
  const pips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  }[value as keyof typeof pips] || [];

  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-white rounded-xl shadow-inner w-full h-full">
      {[...Array(9)].map((_, i) => (
        <div 
          key={i} 
          className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
            pips.includes(i) 
              ? (value === 1 ? 'bg-red-600 scale-110' : 'bg-[#14171A]') 
              : 'bg-transparent'
          }`} 
        />
      ))}
    </div>
  );
};

export const DiceRoll: React.FC<DiceRollProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10, 
  winRate = 45, 
  multiplier = 2 
}) => {
  const [rolling, setRolling] = useState(false);
  const [diceValues, setDiceValues] = useState([1, 1]);
  const [bet, setBet] = useState(minBet);
  const [showResult, setShowResult] = useState(false);
  const [isWin, setIsWin] = useState(false);

  const roll = async () => {
    if (rolling) return;
    
    playSound('click');
    const success = await onBet(bet);
    if (!success) return;

    setRolling(true);
    setShowResult(false);
    playSound('spin');

    // Win logic
    const willWin = Math.random() < (winRate / 100);
    
    // Simulate rolling values
    const interval = setInterval(() => {
      setDiceValues([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      stopSound('spin');
      
      let v1, v2;
      if (willWin) {
        // High sum if win
        const sums = [7, 8, 9, 10, 11, 12];
        const targetSum = sums[Math.floor(Math.random() * sums.length)];
        v1 = Math.min(6, Math.max(1, Math.floor(Math.random() * (targetSum - 1)) + 1));
        v2 = targetSum - v1;
        if (v2 > 6) { v1 += (v2 - 6); v2 = 6; }
        if (v1 > 6) { v2 += (v1 - 6); v1 = 6; }
      } else {
        // Low sum if lose
        const sums = [2, 3, 4, 5, 6];
        const targetSum = sums[Math.floor(Math.random() * sums.length)];
        v1 = Math.min(6, Math.max(1, Math.floor(Math.random() * (targetSum - 1)) + 1));
        v2 = targetSum - v1;
      }

      setDiceValues([v1, v2]);
      setRolling(false);
      setShowResult(true);
      setIsWin(willWin);

      if (willWin) {
        playSound('win');
        onWin(bet * multiplier);
      } else {
        playSound('lose');
      }
    }, 1800);
  };

  const getSum = () => diceValues[0] + diceValues[1];

  return (
    <div className="flex flex-col h-full bg-[#051a0d] text-white font-sans overflow-hidden relative">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(50,215,75,0.1)_0%,_transparent_70%)]" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-20"
          style={{ background: 'conic-gradient(from 0deg, transparent, rgba(50,215,75,0.05), transparent 40%)' }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a2514] border-b border-[#163822] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#32D74B] font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Dice Pro</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#163822] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toFixed(0)}</span>
        </div>

        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow-lg"
        >
          <LogOut size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Quit</span>
        </button>
      </header>

      {/* Main Game Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="mb-12 h-20 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {!rolling && (
              <motion.div
                key="sum"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="text-[#FBCB35] text-6xl font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                  {getSum()}
                </div>
                {showResult && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    className={`mt-2 font-black uppercase tracking-[0.3em] text-sm ${isWin ? 'text-[#32D74B]' : 'text-red-500'}`}
                  >
                    {isWin ? `WINNER! RS ${bet * multiplier}` : 'TRY AGAIN'}
                  </motion.div>
                )}
              </motion.div>
            )}
            {rolling && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2"
              >
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-[#FBCB35] rounded-full"
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-8 sm:gap-16 items-center justify-center perspective-1000 mb-16">
          {diceValues.map((val, idx) => (
            <motion.div
              key={idx}
              animate={rolling ? {
                rotateX: [0, 360, 720, 1080],
                rotateY: [0, 360, 720, 1080],
                scale: [1, 1.2, 1],
                y: [0, -40, 0]
              } : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                y: 0
              }}
              transition={rolling ? {
                duration: 1.8,
                ease: "easeInOut",
              } : {
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="w-28 h-28 sm:w-36 sm:h-36 relative"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="w-full h-full relative">
                <DiceFace value={val} />
                {/* 3D Sides shadow simulation */}
                <div className="absolute top-0 left-0 w-full h-full bg-black/10 rounded-xl transform translate-z-[-4px] pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={roll}
          disabled={rolling || balance < bet}
          className="w-64 h-20 bg-white hover:bg-neutral-100 text-[#14171A] rounded-2xl flex items-center justify-center font-black text-3xl uppercase tracking-tighter shadow-[0_10px_0_#d1d5db] active:shadow-none active:translate-y-[10px] transition-all disabled:opacity-50"
        >
          {rolling ? 'Rolling...' : 'Roll'}
        </button>
      </div>

      {/* Footer Controls */}
      <footer className="p-8 bg-[#0a2514] border-t border-[#163822] relative z-20 shrink-0">
        <div className="w-full max-w-xl mx-auto flex flex-col sm:flex-row gap-6">
          <div className="flex-1 bg-black/40 p-3 rounded-3xl border border-[#163822] flex items-center justify-between gap-6">
            <button 
              disabled={rolling}
              onClick={() => { playSound('click'); setBet(Math.max(minBet, bet - 10)); }}
              className="w-14 h-14 rounded-2xl bg-[#163822] border border-[#1f4e2f] flex items-center justify-center font-black text-white hover:bg-[#1f4e2f] active:scale-90 transition-all disabled:opacity-20"
            >
              <Minus size={24} />
            </button>
            <div className="flex-1 flex flex-col items-center">
               <span className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Total Bet</span>
               <div className="text-3xl font-black italic tracking-tighter text-[#32D74B]">
                 RS {bet}
               </div>
            </div>
            <button 
              disabled={rolling}
              onClick={() => { playSound('click'); setBet(bet + 10); }}
              className="w-14 h-14 rounded-2xl bg-[#163822] border border-[#1f4e2f] flex items-center justify-center font-black text-white hover:bg-[#1f4e2f] active:scale-90 transition-all disabled:opacity-20"
            >
              <Plus size={24} />
            </button>
          </div>
          
          <div className="flex items-center justify-center px-6">
            <div className="text-center">
              <div className="text-[10px] font-black uppercase text-white/40 tracking-[.2em] mb-1">Multiplier</div>
              <div className="text-2xl font-black text-[#FBCB35] italic">{multiplier.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

