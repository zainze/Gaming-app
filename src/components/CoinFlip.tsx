import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Plus, Minus, Coins, RotateCcw } from "lucide-react";
import { playSound, stopSound } from "../lib/sounds";

interface CoinFlipProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

export default function CoinFlip({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10, 
  winRate = 50, 
  multiplier = 2 
}: CoinFlipProps) {
  const [selectedChoice, setSelectedChoice] = useState<'heads' | 'tails' | 'heads_and_tails'>('heads');
  const [side, setSide] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [bet, setBet] = useState(minBet);
  const [showResult, setShowResult] = useState(false);
  const [isWin, setIsWin] = useState(false);

  const COIN_IMAGE = "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778146981/game-coin-a-good-investment_lqjtaj.webp";

  const flip = async () => {
    if (flipping || balance < bet) return;
    
    playSound('click');
    const betSuccess = await onBet(bet);
    if (!betSuccess) return;

    setFlipping(true);
    setShowResult(false);
    playSound('coin');
    
    setTimeout(() => {
      stopSound('coin');
      
      let finalSide: 'heads' | 'tails' = 'heads';
      let willWin = false;
      let payoutMultiplier = multiplier;

      if (selectedChoice === 'heads_and_tails') {
        willWin = true;
        payoutMultiplier = 1; // 1x returns the bet (since both options are covered)
        finalSide = Math.random() < 0.5 ? 'heads' : 'tails';
      } else {
        willWin = Math.random() * 100 < winRate;
        finalSide = willWin ? selectedChoice : (selectedChoice === 'heads' ? 'tails' : 'heads');
      }

      setSide(finalSide);
      setFlipping(false);
      setShowResult(true);
      setIsWin(willWin);
      
      if (willWin) {
        playSound('win');
        onWin(bet * payoutMultiplier);
      } else {
        playSound('lose');
      }
    }, 1500);
  };

  const reset = () => {
    setSide(null);
    setShowResult(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#050B14] text-white font-sans overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(251,191,36,0.08)_0%,_transparent_70%)]" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-amber-500/5 blur-[120px] rounded-full"
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Coins className="text-amber-500" size={20} />
          <span className="text-amber-500 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Coin Flip</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
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
        <div className="mb-12 min-h-[140px] flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {!flipping && side === null && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 flex flex-col items-center"
              >
                <div className="space-y-1">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">Heads or Tails?</h2>
                  <p className="text-[10px] font-black uppercase text-[#6B6D6F] tracking-[.3em]">Pick one and try your luck</p>
                </div>
                
                 {/* Select Option HEADS / TAILS / HEAD & TAIL */}
                 <div className="flex bg-black/40 rounded-2xl p-1 border border-[#1a2b45] w-80 shadow-inner">
                   <button
                     onClick={() => { setSelectedChoice('heads'); playSound('click'); }}
                     className={`flex-1 py-2 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${
                       selectedChoice === 'heads'
                         ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-bold scale-[1.03]'
                         : 'text-neutral-400 hover:text-white'
                     }`}
                   >
                     Heads
                   </button>
                   <button
                     onClick={() => { setSelectedChoice('tails'); playSound('click'); }}
                     className={`flex-1 py-2 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${
                       selectedChoice === 'tails'
                         ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-bold scale-[1.03]'
                         : 'text-neutral-400 hover:text-white'
                     }`}
                   >
                     Tails
                   </button>
                   <button
                     onClick={() => { setSelectedChoice('heads_and_tails'); playSound('click'); }}
                     className={`flex-1 py-2 px-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all duration-300 ${
                       selectedChoice === 'heads_and_tails'
                         ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-bold scale-[1.03]'
                         : 'text-neutral-400 hover:text-white'
                     }`}
                   >
                     Both
                   </button>
                 </div>
              </motion.div>
            )}
            
            {flipping && (
              <motion.div
                key="flipping"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-3 h-3 bg-amber-500 rounded-full"
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase text-amber-500 tracking-[0.4em] animate-pulse">
                    Flipping Coin...
                  </p>
                   <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    BET ON: {selectedChoice === 'heads_and_tails' ? 'BOTH HEADS & TAILS' : selectedChoice.toUpperCase()}
                  </p>
                </div>
              </motion.div>
            )}

            {showResult && (
              <motion.div
                key="result"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className={`text-5xl font-black italic tracking-tighter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] ${isWin ? 'text-[#32D74B]' : 'text-red-500'}`}>
                  {isWin ? 'YOU WIN!' : 'YOU LOSE'}
                </div>
                <div className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[#6B6D6F]">
                  {isWin 
                    ? `WIN! You picked ${selectedChoice === 'heads_and_tails' ? 'Both' : selectedChoice.toUpperCase()} and won RS ${bet * (selectedChoice === 'heads_and_tails' ? 1 : multiplier)}` 
                    : `Pick: ${selectedChoice === 'heads_and_tails' ? 'Both' : selectedChoice.toUpperCase()} | Coin: ${side?.toUpperCase()}`
                  }
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3D Coin Container */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 perspective-1000">
          <motion.div
            animate={flipping ? { 
              rotateY: [0, 720, 1440, 2160, 2880],
              y: [0, -180, -220, -180, 0],
              scale: [1, 1.2, 1.3, 1.2, 1],
              filter: ["brightness(1)", "brightness(1.8)", "brightness(2)", "brightness(1.8)", "brightness(1)"]
            } : { 
              rotateY: side === 'tails' ? 180 : 0,
              y: [0, -10, 0]
            }}
            transition={flipping ? { 
              duration: 1.5, 
              ease: [0.45, 0.05, 0.55, 0.95] 
            } : {
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              rotateY: { type: "spring", stiffness: 200, damping: 20 }
            }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Heads Side */}
            <div className="absolute inset-0 w-full h-full backface-hidden rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-4 border-amber-400 group overflow-hidden">
              <img 
                src={COIN_IMAGE} 
                alt="Heads" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-600/40 via-transparent to-white/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-black text-4xl italic drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] uppercase tracking-tighter">Heads</span>
              </div>
              <motion.div 
                animate={{ x: [-100, 400] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                className="absolute top-0 bottom-0 w-12 bg-white/20 -skew-x-12 blur-md" 
              />
            </div>

            {/* Tails Side */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-4 border-neutral-600 overflow-hidden"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <img 
                src={COIN_IMAGE} 
                alt="Tails" 
                className="w-full h-full object-cover grayscale brightness-50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-neutral-400 font-black text-4xl italic drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] uppercase tracking-tighter">Tails</span>
              </div>
            </div>
          </motion.div>
          
          {/* Shadow below coin */}
          <motion.div 
            animate={flipping ? { 
              scale: [1, 0.4, 0.2, 0.4, 1],
              opacity: [0.3, 0.1, 0.05, 0.1, 0.3]
            } : { 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.4, 0.3]
            }}
            transition={{ duration: flipping ? 1.8 : 4, repeat: flipping ? 0 : Infinity }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/40 blur-xl rounded-full"
          />
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="p-8 bg-[#0a121e] border-t border-[#1a2b45] relative z-20 shrink-0">
        <div className="w-full max-w-xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 bg-black/40 p-3 rounded-3xl border border-[#1a2b45] flex items-center justify-between gap-6 shadow-inner">
              <button 
                disabled={flipping}
                onClick={() => {
                  playSound('click');
                  setBet(Math.max(minBet, bet - 10));
                }}
                className="w-14 h-14 rounded-2xl bg-[#14233a] border border-[#1a2b45] flex items-center justify-center font-black text-white hover:bg-[#1c2e4d] active:scale-90 transition-all disabled:opacity-20 shadow-lg"
              >
                <Minus size={24} />
              </button>
              <div className="flex-1 flex flex-col items-center">
                 <span className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Total Bet</span>
                 <div className="text-3xl font-black italic tracking-tighter text-amber-500">
                   RS {bet}
                 </div>
              </div>
              <button 
                disabled={flipping}
                onClick={() => {
                  playSound('click');
                  setBet(bet + 10);
                }}
                className="w-14 h-14 rounded-2xl bg-[#14233a] border border-[#1a2b45] flex items-center justify-center font-black text-white hover:bg-[#1c2e4d] active:scale-90 transition-all disabled:opacity-20 shadow-lg"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="flex-1 flex gap-4">
              {showResult ? (
                <button 
                  onClick={reset}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-5 rounded-3xl shadow-[0_10px_25px_rgba(245,158,11,0.3)] uppercase tracking-widest text-sm active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-700"
                >
                  <RotateCcw size={18} />
                  Play Again
                </button>
              ) : (
                <button 
                  onClick={flip}
                  disabled={flipping || balance < bet}
                  className="flex-1 bg-[#32D74B] hover:bg-[#2BBF40] text-black font-black py-5 rounded-3xl shadow-[0_10px_25px_rgba(50,215,75,0.3)] uppercase tracking-widest text-sm active:scale-95 transition-all disabled:opacity-50 border-b-4 border-[#1E7E34]"
                >
                  {flipping ? "Flipping..." : "Flip Coin"}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

