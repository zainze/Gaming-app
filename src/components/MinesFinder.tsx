import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bomb, Diamond, Play, Shield, Trophy } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface MinesProps {
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  balance: number;
  config: any;
}

export const MinesFinder: React.FC<MinesProps> = ({ onWin, onLoss, balance, config }) => {
  const [betAmount, setBetAmount] = useState(config.minBet || 10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<(string | null)[]>(Array(25).fill(null));
  const [mines, setMines] = useState<number[]>([]);
  const [cashoutAmount, setCashoutAmount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [history, setHistory] = useState<{ type: 'win' | 'loss'; amount: number }[]>([]);

  const startNewGame = () => {
    if (balance < betAmount) return;
    playSound('click');
    
    const mineCount = Math.max(1, Math.floor(10 * (1 - (config.winRate / 100 || 0.45))));
    const minePositions: number[] = [];
    while (minePositions.length < mineCount) {
      const pos = Math.floor(Math.random() * 25);
      if (!minePositions.includes(pos)) minePositions.push(pos);
    }
    
    setMines(minePositions);
    setGrid(Array(25).fill(null));
    setIsPlaying(true);
    setStatus('playing');
    setCashoutAmount(betAmount);
    playSound('chip');
  };

  const revealCell = (index: number) => {
    if (grid[index] || status !== 'playing') return;

    const newGrid = [...grid];
    if (mines.includes(index)) {
      playSound('lose');
      newGrid[index] = 'bomb';
      setGrid(newGrid);
      setStatus('lost');
      setIsPlaying(false);
      onLoss(betAmount);
      setHistory(prev => [{ type: 'loss', amount: betAmount }, ...prev].slice(0, 5));
    } else {
      playSound('click');
      newGrid[index] = 'diamond';
      setGrid(newGrid);
      
      const foundDiamonds = newGrid.filter(c => c === 'diamond').length;
      const step = (config.multiplier || 6) / 12; 
      const multiplier = 1 + (foundDiamonds * step);
      setCashoutAmount(Math.floor(betAmount * multiplier));

      if (foundDiamonds === 25 - mines.length) {
          cashOut();
      }
    }
  };

  const cashOut = () => {
    if (status !== 'playing') return;
    playSound('win');
    setStatus('won');
    setIsPlaying(false);
    onWin(cashoutAmount - betAmount);
    setHistory(prev => [{ type: 'win', amount: cashoutAmount }, ...prev].slice(0, 5));
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 text-neutral-900 border border-neutral-100 shadow-2xl relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 blur-[80px] -ml-16 -mt-16 rounded-full" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center bg-neutral-50 px-5 py-4 rounded-[2rem] border border-neutral-100 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Return Value</p>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-orange-500" />
              <p className="text-2xl font-black italic text-neutral-900">¢{cashoutAmount}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1">
               {history.map((h, i) => (
                 <div key={i} className={`w-2 h-2 rounded-full ${h.type === 'win' ? 'bg-green-500' : 'bg-red-400'}`} />
               ))}
            </div>
            <p className="text-[8px] font-black uppercase text-neutral-400 tracking-tighter">Safe Passage Zone</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 aspect-square bg-neutral-50/50 p-4 rounded-[2rem] border border-neutral-100 shadow-inner relative">
          {status === 'playing' && (
              <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-px bg-orange-500/20 z-0 pointer-events-none"
              />
          )}
          {grid.map((cell, i) => (
            <motion.button
              key={i}
              whileHover={!cell && status === 'playing' ? { scale: 1.05, y: -2, rotate: 0.5 } : {}}
              whileTap={!cell && status === 'playing' ? { scale: 0.95 } : {}}
              onClick={() => revealCell(i)}
              disabled={status !== 'playing' || cell !== null}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden border-2 ${
                cell === 'diamond' ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-500/30' :
                cell === 'bomb' ? 'bg-neutral-900 border-black shadow-[0_0_20px_rgba(0,0,0,0.4)]' :
                'bg-white border-neutral-100 hover:border-neutral-200 shadow-sm'
              }`}
            >
              <AnimatePresence>
                {cell === 'diamond' && (
                  <motion.div 
                    initial={{ scale: 0, rotate: -45 }} 
                    animate={{ scale: 1, rotate: 0 }}
                    className="relative"
                  >
                    <Diamond size={24} className="text-white drop-shadow-md" />
                    <motion.div 
                      animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 2] }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 bg-white rounded-full blur-md"
                    />
                  </motion.div>
                )}
                {cell === 'bomb' && (
                  <motion.div 
                    initial={{ scale: 0, y: 10 }} 
                    animate={{ scale: 1, y: 0 }} 
                    className="flex flex-col items-center"
                  >
                    <Bomb size={24} className="text-white animate-bounce" />
                  </motion.div>
                )}
              </AnimatePresence>
              {!cell && status === 'playing' && (
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              )}
              {!cell && status === 'playing' && (
                 <div className="w-1 h-1 bg-neutral-100 rounded-full opacity-50" />
              )}
            </motion.button>
          ))}
        </div>

        <div className="space-y-4">
          {status !== 'playing' ? (
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-neutral-50 p-4 rounded-[2rem] border border-neutral-100 flex flex-col justify-center">
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1 ml-1">Stake</label>
                    <div className="flex items-center justify-between">
                        <input 
                            type="number" 
                            value={betAmount || 0}
                            onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
                            className="bg-transparent font-black text-2xl text-neutral-900 outline-none w-full"
                        />
                        <div className="flex gap-1">
                            <button onClick={() => setBetAmount(a => Math.max(10, a/2))} className="w-8 h-8 rounded-xl bg-white border border-neutral-200 text-[10px] font-black uppercase shadow-sm">½</button>
                            <button onClick={() => setBetAmount(a => a*2)} className="w-8 h-8 rounded-xl bg-white border border-neutral-200 text-[10px] font-black uppercase shadow-sm">2x</button>
                        </div>
                    </div>
               </div>
               <button 
                onClick={startNewGame}
                disabled={balance < betAmount}
                className="h-full bg-neutral-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group"
               >
                 <Play size={18} className="fill-current group-hover:scale-110 transition-transform" />
                 Explore Grid
               </button>
            </div>
          ) : (
            <button 
              onClick={cashOut}
              className="w-full h-16 bg-gradient-to-r from-orange-600 to-orange-400 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Trophy size={20} className="drop-shadow-md" /> 
              <span>Secure Earnings ¢{cashoutAmount}</span>
            </button>
          )}
        </div>

        <AnimatePresence>
          {status === 'lost' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3"
            >
              <Bomb size={16} className="text-red-500" />
              <p className="text-red-600 font-black uppercase italic text-[10px] tracking-widest leading-none">Scout Team Eliminated! Bet Lost</p>
            </motion.div>
          )}
          {status === 'won' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3"
            >
              <Shield size={16} className="text-green-600" />
              <p className="text-green-600 font-black uppercase italic text-[10px] tracking-widest leading-none">Extraction Successful! Profit: ¢{cashoutAmount - betAmount}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
