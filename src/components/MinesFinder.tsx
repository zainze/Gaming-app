import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bomb, Diamond, LogOut, Plus, Minus, Play, Shield } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface MinesProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number; 
}

export const MinesFinder: React.FC<MinesProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10,
  winRate = 70
}) => {
  const [bet, setBet] = useState(minBet);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<(string | null)[]>(Array(25).fill(null));
  const [mines, setMines] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'cashout' | 'burst'>('idle');
  const [revealedCount, setRevealedCount] = useState(0);
  const [history, setHistory] = useState<{ type: 'win' | 'loss'; amount: number }[]>([]);

  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 0;
    let prob = 1;
    for(let i=0; i<revealed; i++) {
        prob *= (25 - mineCount - i) / (25 - i);
    }
    return Math.floor((1 / prob) * 0.95 * 100) / 100;
  };

  const currentMultiplier = calculateMultiplier(revealedCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1);
  const profit = Math.floor(bet * currentMultiplier);

  const startGame = async () => {
    if (isPlaying || balance < bet) return;
    const success = await onBet(bet);
    if (!success) return;

    playSound('click');
    const minePositions: number[] = [];
    while (minePositions.length < mineCount) {
      const pos = Math.floor(Math.random() * 25);
      if (!minePositions.includes(pos)) minePositions.push(pos);
    }
    
    setMines(minePositions);
    setGrid(Array(25).fill(null));
    setRevealedCount(0);
    setIsPlaying(true);
    setStatus('playing');
    playSound('chip');
  };

  const handleReveal = (index: number) => {
    if (!isPlaying || grid[index] || status !== 'playing') return;

    if (mines.includes(index)) {
      explode(index);
    } else {
      const newGrid = [...grid];
      newGrid[index] = 'diamond';
      setGrid(newGrid);
      setRevealedCount(prev => prev + 1);
      playSound('mine_gem');
      if (revealedCount + 1 === 25 - mineCount) handleCashout();
    }
  };

  const explode = (index: number) => {
    const newGrid = [...grid];
    mines.forEach(m => { newGrid[m] = 'mine'; });
    newGrid[index] = 'boom';
    setGrid(newGrid);
    setStatus('burst');
    setIsPlaying(false);
    playSound('mine_boom');
    setHistory(prev => [{ type: 'loss', amount: bet }, ...prev].slice(0, 10));
  };

  const handleCashout = () => {
    if (!isPlaying || status !== 'playing' || revealedCount === 0) return;
    playSound('win');
    setStatus('cashout');
    setIsPlaying(false);
    onWin(profit);
    setHistory(prev => [{ type: 'win', amount: profit }, ...prev].slice(0, 10));
    const newGrid = [...grid];
    mines.forEach(m => { if (!newGrid[m]) newGrid[m] = 'mine-hidden'; });
    setGrid(newGrid);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E11] text-white font-sans overflow-hidden">
      <header className="flex items-center justify-between px-3 h-14 bg-[#14171A] border-b border-[#23262B] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Bomb className="text-[#FBCB35]" size={20} />
          <span className="text-[#FBCB35] font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Mines Finder</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#23262B] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toFixed(0)}</span>
        </div>
        <button onClick={onExit} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow-lg">
          <LogOut size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Quit</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row relative z-10 min-h-0">
        <div className="w-full md:w-80 bg-[#14171A] border-r border-[#23262B] flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto">
          <div className="space-y-4">
             <div className="bg-black/40 p-4 rounded-2xl border border-[#23262B] space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest">
                  <span>Bet Amount</span>
                  <span className="text-[#32D74B]">RS {bet}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button disabled={isPlaying} onClick={() => setBet(Math.max(minBet, bet - 10))} className="w-10 h-10 rounded-xl bg-[#23262B] flex items-center justify-center hover:bg-[#2C3035] transition-colors disabled:opacity-20">
                    <Minus size={16} />
                  </button>
                  <div className="flex-1 text-center font-black text-xl italic tracking-tighter">RS {bet}</div>
                  <button disabled={isPlaying} onClick={() => setBet(bet + 10)} className="w-10 h-10 rounded-xl bg-[#23262B] flex items-center justify-center hover:bg-[#2C3035] transition-colors disabled:opacity-20">
                    <Plus size={16} />
                  </button>
                </div>
             </div>
             <div className="bg-black/40 p-4 rounded-2xl border border-[#23262B] space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 tracking-widest">
                  <span>Mines</span>
                  <span className="text-[#FBCB35]">{mineCount}</span>
                </div>
                <select disabled={isPlaying} value={mineCount} onChange={(e) => setMineCount(Number(e.target.value))} className="w-full bg-[#23262B] border border-[#2C3035] rounded-xl px-4 py-2.5 outline-none font-black text-sm text-center appearance-none cursor-pointer hover:bg-[#2C3035] transition-colors disabled:opacity-50">
                  {[1, 3, 5, 10, 15, 20, 24].map(num => (
                    <option key={num} value={num}>{num} Mines</option>
                  ))}
                </select>
             </div>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            {!isPlaying ? (
              <button onClick={startGame} disabled={balance < bet} className="w-full bg-[#32D74B] hover:bg-[#2BBF40] text-black font-black py-4 rounded-2xl shadow-[0_4px_0_#1E7E34] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-sm disabled:opacity-50">
                Bet
              </button>
            ) : (
              <button onClick={handleCashout} disabled={revealedCount === 0 || status !== 'playing'} className="w-full bg-[#FBCB35] hover:bg-[#F9C110] text-black font-black py-4 rounded-2xl shadow-[0_4px_0_#C99A0D] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-sm disabled:opacity-50 flex flex-col items-center justify-center">
                <span>Cashout</span>
                <span className="text-[10px] opacity-70">RS {profit} ({currentMultiplier}x)</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 min-h-0 bg-[#0B0E11] relative">
          <AnimatePresence>
            {isPlaying && revealedCount > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-10 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-[#14171A] border border-[#23262B] rounded-full px-6 py-2 shadow-2xl flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-[8px] font-black uppercase text-white/40 tracking-widest">Multiplier</div>
                    <div className="text-[#FBCB35] font-black text-xl italic">{currentMultiplier}x</div>
                  </div>
                  <div className="w-px h-8 bg-[#23262B]" />
                  <div className="text-center">
                    <div className="text-[8px] font-black uppercase text-white/40 tracking-widest">Next</div>
                    <div className="text-white/60 font-black text-lg italic">{nextMultiplier}x</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
             {status === 'burst' && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-40 bg-[#0B0E11]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                  <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.4 }} className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Bomb size={64} className="text-red-500" />
                  </motion.div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-red-500 mb-2">BOOM!</h2>
                  <p className="text-white/60 font-black uppercase tracking-[0.3em] text-xs">Mine Tripped. RS {bet} lost.</p>
                  <button onClick={() => setStatus('idle')} className="mt-8 px-8 py-3 bg-[#23262B] rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#2C3035] transition-colors">Dismiss</button>
                </motion.div>
             )}
             {status === 'cashout' && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-40 bg-[#0B0E11]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 bg-[#32D74B]/10 rounded-full flex items-center justify-center mb-6">
                    <Shield size={64} className="text-[#32D74B]" />
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#32D74B] mb-2">RS {profit}</h2>
                  <p className="text-white/60 font-black uppercase tracking-[0.3em] text-xs">Successfully Cashed Out at {currentMultiplier}x</p>
                  <button onClick={() => setStatus('idle')} className="mt-8 px-8 py-3 bg-[#23262B] rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#2C3035] transition-colors">Dismiss</button>
                </motion.div>
             )}
          </AnimatePresence>

          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-[450px] w-full aspect-square">
              {grid.map((cell, i) => (
                <motion.button
                  key={i}
                  disabled={!isPlaying || cell !== null || status !== 'playing'}
                  whileHover={isPlaying && !cell ? { y: -2, scale: 1.02 } : {}}
                  whileTap={isPlaying && !cell ? { scale: 0.95 } : {}}
                  onClick={() => handleReveal(i)}
                  className={`relative rounded-xl transition-all duration-300 ${
                    cell === 'diamond' ? 'bg-[#32D74B] shadow-[0_0_20px_rgba(50,215,75,0.4)] border-2 border-[#4AF364]' :
                    cell === 'boom' ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] border-2 border-red-400 z-10' :
                    cell === 'mine' ? 'bg-[#14171A] border-2 border-red-500/50 opacity-100' :
                    cell === 'mine-hidden' ? 'bg-[#14171A] border-2 border-white/5 opacity-40' :
                    'bg-[#23262B] hover:bg-[#2C3035] border-b-4 border-black/40'
                  }`}
                >
                   <AnimatePresence mode="wait">
                      {cell === 'diamond' && (
                        <motion.div key="d" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}>
                           <Diamond size={32} className="text-black drop-shadow-md" fill="black" />
                        </motion.div>
                      )}
                      {(cell === 'boom' || cell === 'mine') && (
                        <motion.div key="m" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                           <Bomb size={32} className={cell === 'boom' ? "text-white" : "text-red-500"} fill="currentColor" />
                        </motion.div>
                      )}
                      {cell === 'mine-hidden' && (
                         <div className="opacity-50">
                            <Bomb size={24} className="text-red-500/50" />
                         </div>
                      )}
                      {!cell && <div className="w-2 h-2 bg-white/5 rounded-full" />}
                   </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-10 bg-[#0B0E11] border-t border-[#23262B] flex items-center justify-between px-4 text-[9px] font-black uppercase text-white/30 tracking-widest shrink-0">
        <div className="flex gap-4">
           <span>RTP: 99%</span>
           <span>Hash: {Math.random().toString(36).substring(7).toUpperCase()}</span>
        </div>
        <div className="flex gap-1">
           {history.slice(0, 5).map((h, i) => (
             <div key={i} className={`w-1.5 h-1.5 rounded-full ${h.type === 'win' ? 'bg-[#32D74B]' : 'bg-red-500'}`} />
           ))}
        </div>
      </div>
    </div>
  );
};
