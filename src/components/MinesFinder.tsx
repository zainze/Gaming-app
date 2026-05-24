import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bomb, Diamond, LogOut, Plus, Minus, Play, Shield, Clock, Coins, Flame, ChevronRight, Check } from 'lucide-react';
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

  // Timer states (Update the time requirement)
  const [activeSecs, setActiveSecs] = useState(0);
  const [localTime, setLocalTime] = useState(new Date());

  // Tick current time
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Tick round elapsed time
  useEffect(() => {
    let t: any = null;
    if (isPlaying) {
      setActiveSecs(0);
      t = setInterval(() => {
        setActiveSecs(prev => prev + 1);
      }, 1000);
    } else {
      setActiveSecs(0);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [isPlaying]);

  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 0;
    let prob = 1;
    for(let i = 0; i < revealed; i++) {
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
      const newRevealedCount = revealedCount + 1;
      setRevealedCount(newRevealedCount);
      playSound('mine_gem');
      
      // If we cleared all safe gems, cash out automatically!
      if (newRevealedCount === 25 - mineCount) {
        handleCashout();
      }
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

  const formatSecs = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E11] text-white font-sans overflow-y-auto">
      {/* Dynamic Casino Top Nav bar header */}
      <header className="flex items-center justify-between px-4 h-16 bg-[#14171A] border-b border-[#23262B] relative z-20 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-xl shadow-lg shadow-amber-500/10">
            <Bomb className="text-black stroke-[2.5]" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 font-black italic tracking-tighter text-base leading-none uppercase">Mines Finder</span>
            <span className="text-[8.5px] font-bold text-white/30 uppercase tracking-[0.25em] mt-0.5">Premium Stake Edition</span>
          </div>
        </div>

        {/* Dynamic Balance indicator */}
        <div className="flex items-center gap-2 bg-black/40 rounded-full px-4 py-2 border border-[#23262B] shadow-inner">
          <div className="w-1.5 h-1.5 rounded-full bg-[#32D74B] animate-pulse" />
          <span className="text-[#32D74B] font-black text-xs font-mono">RS {balance.toLocaleString()}</span>
        </div>

        {/* Exit lobby button */}
        <button 
          onClick={onExit} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest shadow-md"
        >
          <LogOut size={13} />
          <span>Exit</span>
        </button>
      </header>

      {/* Dynamic live clock + Match play timer banner */}
      <div className="bg-[#14171A]/95 px-5 py-2.5 border-b border-[#23262B] flex items-center justify-between text-[11px] font-bold tracking-tight text-white/60 relative z-10 shrink-0">
        <div className="flex items-center gap-2 font-mono">
          <Clock size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>LIVETIME: {localTime.toLocaleTimeString()}</span>
        </div>

        {isPlaying ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[#32D74B] font-bold text-[10px] uppercase font-mono tracking-wider animate-pulse">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
            <span>SESSION TIME: {formatSecs(activeSecs)}</span>
          </div>
        ) : (
          <span className="text-[9px] uppercase tracking-widest text-[#FBCB35]/70 bg-[#FBCB35]/5 px-2.5 py-0.5 rounded-full border border-[#FBCB35]/10 font-bold">READY TO PLAY</span>
        )}
      </div>

      {/* Main gaming arena center layout */}
      <div className="flex-1 flex flex-col justify-start items-center p-4 py-6 space-y-5 min-h-0 bg-[#0B0E11] w-full max-w-lg mx-auto pb-28">
        
        {/* Dynamic Multiplier Progress strip */}
        <div className="w-full max-w-[420px] shrink-0 bg-[#14171A] border border-[#23262B]/80 rounded-2xl p-3 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-black block">Active Combo</span>
              <span className="text-xl font-extrabold italic font-mono text-white tracking-tight">
                {revealedCount > 0 ? `${currentMultiplier}x` : '0x'}
              </span>
            </div>
            
            {/* Profit display overlay */}
            {isPlaying && revealedCount > 0 && (
              <div className="bg-[#32D74B]/10 rounded-xl px-3 py-1.5 text-right border border-[#32D74B]/20">
                <span className="text-[9px] text-[#32D74B] uppercase tracking-wide font-bold block">Current Profit</span>
                <span className="text-base font-black text-[#32D74B] font-mono leading-none">RS {profit.toLocaleString()}</span>
              </div>
            )}

            <div className="text-right">
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-black block">Next Diamond</span>
              <span className="text-sm font-extrabold font-mono text-amber-400">
                {nextMultiplier}x
              </span>
            </div>
          </div>
        </div>

        {/* 5x5 Mines Tile Grid Arena */}
        <div className="relative w-full max-w-[420px] aspect-square shrink-0 bg-[#14171A] border border-[#23262B] p-3 rounded-3xl shadow-xl flex items-center justify-center">
          
          {/* Win / Burst full absolute cover screen alerts */}
          <AnimatePresence>
            {status === 'burst' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-2 z-[30] rounded-2xl bg-[#0B0E11]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 border border-red-500/30"
              >
                <motion.div 
                  initial={{ scale: 0.5, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }} 
                  className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-3 text-red-500 shadow-lg border border-red-500/20"
                >
                  <Bomb size={36} fill="currentColor" />
                </motion.div>
                <h3 className="text-2xl font-black tracking-tighter text-red-500 uppercase italic">BOOMED!</h3>
                <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mt-1">Explosion occurred! Lost RS {bet}</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-4 px-6 py-2.5 bg-[#23262B] hover:bg-[#2C3035] text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors shadow-lg active:scale-95 duration-200 border border-white/5"
                >
                  Accept Loss
                </button>
              </motion.div>
            )}

            {status === 'cashout' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-2 z-[30] rounded-2xl bg-[#0B0E11]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 border border-[#32D74B]/30"
              >
                <motion.div 
                  initial={{ scale: 0.5, y: -20 }}
                  animate={{ scale: 1, y: 0 }} 
                  className="w-16 h-16 bg-[#32D74B]/10 rounded-full flex items-center justify-center mb-3 text-[#32D74B] shadow-lg border border-[#32D74B]/20"
                >
                  <Shield size={36} fill="currentColor" />
                </motion.div>
                <h3 className="text-2xl font-black tracking-tighter text-[#32D74B] uppercase italic">WINNING CASHOUT!</h3>
                <p className="text-[11px] font-bold text-white/50 tracking-wider uppercase mt-1">Success! Gained RS {profit} at {currentMultiplier}x</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-4 px-6 py-2.5 bg-[#32D74B] hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg active:scale-95 duration-200"
                >
                  Collect Loot
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Mines Board Tiles */}
          <div className="grid grid-cols-5 gap-2 w-full h-full">
            {grid.map((cell, idx) => {
              const isDisabled = !isPlaying || cell !== null || status !== 'playing';
              return (
                <motion.button
                  key={idx}
                  disabled={isDisabled}
                  whileHover={isPlaying && !cell ? { y: -2, scale: 1.04 } : {}}
                  whileTap={isPlaying && !cell ? { scale: 0.95 } : {}}
                  onClick={() => handleReveal(idx)}
                  className={`relative rounded-xl transition-all duration-300 w-full h-full select-none ${
                    cell === 'diamond' 
                      ? 'bg-gradient-to-tr from-[#32D74B] to-[#4AF364] shadow-[0_0_22px_rgba(50,215,75,0.4)] border-2 border-green-300 z-10' 
                      : cell === 'boom' 
                      ? 'bg-gradient-to-tr from-red-600 to-red-500 shadow-[0_0_24px_rgba(239,68,68,0.7)] border-2 border-red-300 z-10' 
                      : cell === 'mine' 
                      ? 'bg-[#181a1d] border border-red-500/40 opacity-100' 
                      : cell === 'mine-hidden' 
                      ? 'bg-[#181a1d] border border-white/5 opacity-30 scale-95' 
                      : 'bg-[#23262B] hover:bg-[#2C3035] border-b-[3px] border-black/55 hover:border-b-4 duration-150 shadow-inner'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {cell === 'diamond' && (
                      <motion.div 
                        key="diamond"
                        initial={{ scale: 0, rotate: -60 }} 
                        animate={{ scale: 1, rotate: 0 }}
                        className="flex items-center justify-center"
                      >
                        <Diamond size={24} className="text-black fill-black filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                      </motion.div>
                    )}

                    {(cell === 'boom' || cell === 'mine') && (
                      <motion.div 
                        key="bomb"
                        initial={{ scale: 0, bounce: 0.8 }} 
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center animate-bounce"
                      >
                        <Bomb size={24} className={cell === 'boom' ? "text-white fill-white" : "text-red-500 fill-red-500"} />
                      </motion.div>
                    )}

                    {cell === 'mine-hidden' && (
                      <div className="flex items-center justify-center opacity-40">
                        <Bomb size={16} className="text-red-500/40 fill-red-500/20" />
                      </div>
                    )}

                    {!cell && (
                      <div className="w-1.5 h-1.5 bg-white/5 hover:bg-white/20 rounded-full mx-auto" />
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 
          Downside: Custom Betting Logic Console section
          All betting logic selected at down, down, downside of the grid.
        */}
        <div className="w-full max-w-[420px] shrink-0 bg-[#14171A] border border-[#23262B] rounded-2xl p-4 space-y-4 shadow-2xl relative z-10">
          
          {/* Row 1: Bet controls inside block with inline presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40 tracking-widest px-1">
              <span>Bet Stake Amount</span>
              <span className="text-[#32D74B] font-mono">RS {bet}</span>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center bg-black/30 border border-[#23262B]/80 p-1 px-2 rounded-xl">
              {/* Minus wager Button */}
              <button 
                type="button"
                disabled={isPlaying} 
                onClick={() => setBet(Math.max(minBet, bet - 10))} 
                className="col-span-2 h-9 rounded-lg bg-[#23262B] hover:bg-[#2C3035] active:scale-95 duration-100 flex items-center justify-center disabled:opacity-30 border border-white/5 shadow"
              >
                <Minus size={13} className="text-white" />
              </button>

              {/* Display text box input style styling */}
              <div className="col-span-5 text-center text-sm font-black italic tracking-tight font-mono text-white select-none">
                RS {bet.toLocaleString()}
              </div>

              {/* Plus wager Button */}
              <button 
                type="button"
                disabled={isPlaying} 
                onClick={() => setBet(bet + 10)} 
                className="col-span-2 h-9 rounded-lg bg-[#23262B] hover:bg-[#2C3035] active:scale-95 duration-100 flex items-center justify-center disabled:opacity-30 border border-white/5 shadow"
              >
                <Plus size={13} className="text-white" />
              </button>

              {/* Quick Half / Double Multipliers */}
              <button
                type="button"
                disabled={isPlaying}
                onClick={() => setBet(Math.max(minBet, Math.floor(bet / 2)))}
                className="col-span-1.5 col-start-10 h-9 rounded-lg bg-black/40 text-[9px] font-black text-white/50 hover:bg-[#23262B] hover:text-white transition-colors uppercase disabled:opacity-10"
              >
                ½½
              </button>

              <button
                type="button"
                disabled={isPlaying}
                onClick={() => setBet(Math.min(balance > 0 ? balance : 100000, bet * 2))}
                className="col-span-1.5 h-9 rounded-lg bg-[#23262B]/60 text-[9px] font-black text-white/50 hover:bg-[#23262B] hover:text-white transition-colors uppercase disabled:opacity-10"
              >
                2x
              </button>
            </div>
          </div>

          {/* Row 2: Select Mines Selector controls dropdown styled */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40 tracking-widest px-1">
              <span>Mines count Danger Level</span>
              <span className="text-red-400 font-mono font-bold uppercase">{mineCount} Mines</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 shrink-0">
              {[1, 3, 5, 10, 24].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isPlaying}
                  onClick={() => {
                    playSound('click');
                    setMineCount(num);
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all border ${
                    mineCount === num 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                      : 'bg-[#23262B]/50 text-white/40 border-[#23262B]'
                  } disabled:opacity-50`}
                >
                  {num === 24 ? "24 RISK" : `${num} Mine`}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Action Start Bet Button */}
          <div className="pt-1.5 shrink-0">
            {!isPlaying ? (
              <button 
                onClick={startGame} 
                disabled={balance < bet} 
                className="w-full h-13 rounded-xl bg-gradient-to-r from-[#2196F3] to-[#9C27B0] text-white font-black uppercase text-xs tracking-[0.2em] shadow-[0_4px_0_#1E40AF] active:shadow-none active:translate-y-1 transition-all duration-100 disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-95"
              >
                <Play size={13} fill="currentColor" />
                <span>START MINE ROUND</span>
              </button>
            ) : (
              <button 
                onClick={handleCashout} 
                disabled={revealedCount === 0 || status !== 'playing'} 
                className="w-full h-13 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 text-black font-black uppercase tracking-[0.1em] shadow-[0_4px_0_#9A3412] active:shadow-none active:translate-y-1 transition-all duration-100 disabled:opacity-40 flex flex-col items-center justify-center leading-tight hover:opacity-95"
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Shield size={13} fill="currentColor" />
                  <span>CASH OUT REWARD</span>
                </div>
                <span className="text-[10px] font-medium opacity-80 font-mono">RS {profit.toLocaleString()} ({currentMultiplier}x)</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Footer layout */}
      <footer className="h-10 bg-[#0B0E11] border-t border-[#23262B] flex items-center justify-between px-4 text-[9px] font-black uppercase text-white/30 tracking-widest shrink-0 mt-auto">
        <div className="flex gap-4">
           <span>RTP STATUS: 99.4%</span>
           <span>PROOF HASH: STAKE_MINE_891</span>
        </div>
        <div className="flex gap-1.5">
           {history.slice(0, 5).map((h, i) => (
             <span key={i} className={`w-2 h-2 rounded-full ${h.type === 'win' ? 'bg-[#32D74B]' : 'bg-red-500'}`} />
           ))}
        </div>
      </footer>
    </div>
  );
};
