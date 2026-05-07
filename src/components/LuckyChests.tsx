import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Zap, Octagon, LogOut, Plus, Minus, RotateCcw } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface LuckyChestsProps {
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  minBet: number;
  balance: number;
  onExit: () => void;
  winRate?: number;
  multiplier?: number;
}

export const LuckyChests: React.FC<LuckyChestsProps> = ({ 
  onWin, 
  onLoss, 
  minBet, 
  balance, 
  onExit,
  winRate = 33, 
  multiplier = 3 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);

  const chests = [0, 1, 2];

  const handlePick = (index: number) => {
    if (playing || revealed !== null) return;
    if (balance < bet) return;

    playSound('click');
    setPlaying(true);
    playSound('spin');
    
    // Win logic based on winRate
    const isWin = Math.random() < (winRate / 100);
    let staticWinner: number;
    
    if (isWin) {
      staticWinner = index;
    } else {
      const otherIndices = chests.filter(i => i !== index);
      staticWinner = otherIndices[Math.floor(Math.random() * otherIndices.length)];
    }
    
    setWinningIndex(staticWinner);

    setTimeout(() => {
      stopSound('spin');
      setRevealed(index);
      setPlaying(false);

      if (index === staticWinner) {
        playSound('win');
        onWin(bet * multiplier);
      } else {
        playSound('lose');
        onLoss(bet);
      }
    }, 2000); // Longer for tension
  };

  const reset = () => {
    setRevealed(null);
    setWinningIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E11] text-white font-sans overflow-hidden relative">
      {/* Background with Interactive Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(124,58,237,0.15)_0%,_transparent_70%)]" />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full" 
        />
        
        {/* Animated Background Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: "110%", x: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{ 
              y: "-10%", 
              opacity: [0, 0.5, 0],
              x: `${Math.random() * 100}%`
            }}
            transition={{ 
              duration: 10 + Math.random() * 15, 
              repeat: Infinity, 
              delay: Math.random() * 5,
              ease: "linear"
            }}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
          />
        ))}
      </div>

      {/* Full Screen Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#14171A] border-b border-[#23262B] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-purple-500 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Lucky Chests</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#23262B] shadow-lg">
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

      {/* Main Game Interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">Mystery Chest</h2>
          <p className="text-[10px] font-black uppercase text-[#6B6D6F] tracking-[0.3em]">Fortune favors the bold</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 w-full max-w-2xl px-4">
          {chests.map((i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center"
            >
              <motion.button
                disabled={playing || revealed !== null}
                onClick={() => handlePick(i)}
                whileHover={!(playing || revealed !== null) ? { y: -15, scale: 1.05 } : {}}
                whileTap={!(playing || revealed !== null) ? { scale: 0.95 } : {}}
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] flex items-center justify-center transition-all duration-700 ${
                  revealed === i 
                    ? (i === winningIndex ? 'bg-green-500/20 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]' : 'bg-red-500/10 border-red-500/40 opacity-40 scale-95 grayscale') 
                    : 'bg-[#14171A] border-[#2C3238] border-2 hover:border-purple-500 shadow-2xl group'
                }`}
              >
                <AnimatePresence mode="wait">
                  {revealed === i ? (
                    <motion.div
                      key="result"
                      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
                      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="flex flex-col items-center"
                    >
                      {i === winningIndex ? (
                        <div className="flex flex-col items-center gap-3">
                          <Zap className="text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)]" size={48} />
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-green-400">WINNER!</span>
                            <span className="text-xs text-green-400/70 font-bold tracking-widest">3.00X</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Octagon className="text-red-400" size={48} />
                          <span className="text-sm font-black text-red-400 uppercase">Empty</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      animate={playing ? { 
                        rotate: [0, -10, 10, -10, 10, 0],
                        x: [0, -4, 4, -4, 4, 0],
                        scale: [1, 1.2, 1],
                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                      } : {
                        y: [0, -8, 0],
                      }}
                      transition={playing ? { 
                        repeat: Infinity, 
                        duration: 0.3,
                        ease: "easeInOut"
                      } : {
                        repeat: Infinity,
                        duration: 5,
                        ease: "easeInOut",
                        delay: i * 0.4
                      }}
                      className="relative"
                    >
                      <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
                        {/* Premium 3D Box Style */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-2xl border-[5px] border-[#FBCB35] shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                           <div className="absolute top-1/2 left-0 w-full h-[4px] bg-[#FBCB35]/40 z-10" />
                           <div className="absolute top-0 right-0 w-10 h-10 bg-[#FBCB35] rounded-bl-2xl" />
                           <div className="absolute bottom-0 left-0 w-10 h-10 bg-[#FBCB35] rounded-tr-2xl" />
                           <div className="absolute inset-0 flex items-center justify-center">
                             <span className="font-black text-5xl text-[#FBCB35] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">?</span>
                           </div>
                           
                           <motion.div 
                             animate={{ x: [-150, 300] }}
                             transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                             className="absolute top-0 bottom-0 w-12 bg-white/10 -skew-x-12" 
                           />
                        </div>
                        <div className="absolute -inset-3 border-2 border-[#FBCB35]/10 rounded-[2rem] animate-pulse pointer-events-none" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {revealed !== null && i === winningIndex && (
                  <motion.div 
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="absolute -top-5 -right-5 bg-green-500 text-[10px] font-black uppercase px-5 py-2 rounded-full text-white shadow-2xl border border-green-400 z-20"
                  >
                    Jackpot!
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>

        <div className="h-16 flex items-center justify-center mt-8">
          <AnimatePresence mode="wait">
            {playing ? (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(d => (
                    <motion.div 
                      key={d}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                      className="w-2.5 h-2.5 bg-purple-500 rounded-full"
                    />
                  ))}
                </div>
                <p className="text-[12px] font-black uppercase text-purple-400 tracking-[0.4em] animate-pulse">
                  Opening Chest
                </p>
              </motion.div>
            ) : revealed === null ? (
              <motion.p 
                key="waiting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-sm font-black uppercase text-[#6B6D6F] tracking-[0.3em]"
              >
                Choose your destiny box
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Control Panel */}
      <footer className="p-8 bg-[#14171A] border-t border-[#23262B] relative z-20 shrink-0">
        <div className="w-full max-w-xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 bg-[#0B0E11] p-3 rounded-3xl border border-[#23262B] flex items-center justify-between gap-6 shadow-inner">
              <button 
                disabled={playing || revealed !== null}
                onClick={() => {
                  playSound('click');
                  setBet(Math.max(minBet, bet - 10));
                }}
                className="w-16 h-16 rounded-2xl bg-[#1C2024] border border-[#2C3238] flex items-center justify-center font-black text-white hover:bg-[#23262B] active:scale-90 transition-all disabled:opacity-20 shadow-lg"
              >
                <Minus size={28} />
              </button>
              <div className="flex-1 flex flex-col items-center">
                 <span className="text-[10px] font-black uppercase text-[#6B6D6F] tracking-widest mb-1">Total Stake</span>
                 <div className="text-3xl font-black italic tracking-tighter text-[#32D74B]">
                   RS {bet}
                 </div>
              </div>
              <button 
                disabled={playing || revealed !== null}
                onClick={() => {
                  playSound('click');
                  setBet(bet + 10);
                }}
                className="w-16 h-16 rounded-2xl bg-[#1C2024] border border-[#2C3238] flex items-center justify-center font-black text-white hover:bg-[#23262B] active:scale-90 transition-all disabled:opacity-20 shadow-lg"
              >
                <Plus size={28} />
              </button>
            </div>

            <div className="flex-1 flex gap-4">
              {revealed !== null ? (
                <button 
                  onClick={reset}
                  className="flex-1 bg-[#32D74B] hover:bg-[#2BBF40] text-black font-black py-6 rounded-3xl shadow-[0_10px_25px_rgba(50,215,75,0.3)] uppercase tracking-widest text-sm active:scale-95 transition-all outline-none border-b-4 border-[#1E7E34] flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Next Round
                </button>
              ) : (
                 <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#23262B]/20 rounded-3xl border border-dashed border-[#23262B]">
                   <span className="text-[10px] font-black uppercase text-purple-400/60 text-center leading-tight">Pick a chest to reveal your mystery prize</span>
                 </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
