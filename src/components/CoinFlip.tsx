import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, Trophy, RefreshCcw } from "lucide-react";
import { playSound } from "../lib/sounds";

export default function CoinFlip({ onWin, onBet, balance, minBet = 10, winRate = 50, multiplier = 2 }: { 
  onWin: (amount: number) => void,
  onBet: (amount: number) => Promise<boolean>,
  balance: number,
  minBet?: number,
  winRate?: number,
  multiplier?: number
}) {
  const [side, setSide] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [bet, setBet] = useState(minBet);
  const [result, setResult] = useState<string | null>(null);

  const flip = async () => {
    if (flipping || balance < bet) return;
    
    playSound('click');
    const betSuccess = await onBet(bet);
    if (!betSuccess) return;

    setFlipping(true);
    setResult(null);
    playSound('chip');
    
    setTimeout(() => {
      const isWin = Math.random() < (winRate / 100);
      const finalSide = isWin ? 'heads' : 'tails';
      setSide(finalSide);
      setFlipping(false);
      
      if (finalSide === 'heads') {
        playSound('win');
        setResult("YOU WON!");
        onWin(bet * multiplier);
      } else {
        playSound('lose');
        setResult("TRY AGAIN");
      }
    }, 2000);
  };

  return (
    <div className="bg-white border border-neutral-100 p-8 rounded-3xl space-y-8 flex flex-col items-center shadow-sm">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black italic uppercase text-neutral-900">Coin Flip</h3>
        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest text-center">Double your money in 2 seconds</p>
      </div>

      <div className="relative w-40 h-40">
        <motion.div
          animate={flipping ? { 
            rotateY: [0, 720, 1440, 2160],
            y: [0, -100, 0]
          } : { rotateY: side === 'heads' ? 0 : 180 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="w-full h-full relative preserve-3d"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-orange-500/50 shadow-2xl overflow-hidden backface-hidden bg-neutral-100">
            <img 
              src="https://images.unsplash.com/photo-1621416848469-dc0f33851536?q=80&w=400&auto=format&fit=crop" 
              alt="Heads" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
              <span className="text-white font-black text-4xl italic drop-shadow-lg uppercase tracking-tighter">Heads</span>
            </div>
          </div>
          <div 
            className="absolute inset-0 rounded-full border-4 border-neutral-200 shadow-2xl overflow-hidden backface-hidden bg-neutral-100"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <img 
              src="https://images.unsplash.com/photo-1621416848469-dc0f33851536?q=80&w=400&auto=format&fit=crop" 
              alt="Tails" 
              className="w-full h-full object-cover grayscale"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
              <span className="text-white font-black text-4xl italic drop-shadow-lg uppercase tracking-tighter">Tails</span>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-black text-2xl uppercase italic ${result.includes('WON') ? 'text-green-500' : 'text-red-500'}`}
          >
            {result}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Input Bet</span>
          <span className="text-orange-500 font-bold">RS {bet}</span>
        </div>
        <div className="flex gap-2">
          {[minBet, minBet * 5, minBet * 10, minBet * 50].map(val => (
            <button 
              key={val}
              onClick={() => setBet(val)}
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] border transition-all ${bet === val ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:border-neutral-300'}`}
            >
              RS {val}
            </button>
          ))}
        </div>
        <button 
          onClick={flip}
          disabled={flipping}
          className="w-full bg-orange-500 hover:bg-orange-600 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-white"
        >
          {flipping ? <RefreshCcw className="animate-spin" /> : "Flip Coin"}
        </button>
      </div>
    </div>
  );
}
