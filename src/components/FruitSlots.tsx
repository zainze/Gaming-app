import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Play, Sparkles, Trophy, Star } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface FruitSlotsProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const ITEMS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

export const FruitSlots: React.FC<FruitSlotsProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 40, minBet = 10, multiplier = 5 
}) => {
  const [bet, setBet] = useState(minBet);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);

  const spin = async () => {
    if (balance < bet || spinning) return;
    
    setSpinning(true);
    setResult(null);
    onBet(bet);
    playSound('spin');

    // Determine result based on winRate
    const isWin = Math.random() * 100 < winRate;
    let finalReels: string[];

    if (isWin) {
      const winningItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      finalReels = [winningItem, winningItem, winningItem];
    } else {
      // Generate guaranteed non-matching reels
      finalReels = [
        ITEMS[Math.floor(Math.random() * ITEMS.length)],
        ITEMS[Math.floor(Math.random() * ITEMS.length)],
        ITEMS[Math.floor(Math.random() * ITEMS.length)]
      ];
      // If by chance they match, shift one
      if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        const idx = ITEMS.indexOf(finalReels[2]);
        finalReels[2] = ITEMS[(idx + 1) % ITEMS.length];
      }
    }

    // Animation sequence
    const duration = 2000;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      setReels([
        ITEMS[Math.floor(Math.random() * ITEMS.length)],
        ITEMS[Math.floor(Math.random() * ITEMS.length)],
        ITEMS[Math.floor(Math.random() * ITEMS.length)]
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setReels(finalReels);
      setSpinning(false);
      stopSound('spin');

      if (isWin) {
        setResult('win');
        onWin(bet * multiplier);
        playSound('win');
      } else {
        setResult('loss');
        playSound('lose');
      }
    }, duration);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0216] text-white font-sans overflow-hidden relative">
      {/* Neon City Background */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-purple-900/60 via-transparent to-black" />
      
      {/* Floating Particles/Lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <header className="flex items-center justify-between px-6 h-20 bg-black/40 border-b border-purple-500/20 backdrop-blur-xl shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/40">
             <Star size={20} className="text-purple-400 animate-pulse" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Neon Slots</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400/60">Midnight Wins</span>
          </div>
        </div>
        <div className="bg-purple-500/10 px-4 py-2 rounded-2xl border border-purple-500/30 backdrop-blur-xl">
          <span className="text-purple-400 font-black text-sm tracking-tight uppercase">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative p-8 z-10 space-y-12">
        {/* Machine Glow */}
        <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-lg bg-[#1a0a25] rounded-[3rem] p-8 shadow-[0_0_100px_rgba(168,85,247,0.2)] border border-purple-500/20 relative overflow-hidden backdrop-blur-3xl">
            {/* Inner Border Deco */}
            <div className="absolute inset-4 border border-white/5 rounded-[2rem] pointer-events-none" />
            
            <div className="flex justify-center gap-5 relative z-10">
              {reels.map((item, i) => (
                <div key={i} className="flex-1">
                  <div className="bg-black/60 rounded-[2rem] h-40 flex items-center justify-center text-7xl shadow-inner border border-white/5 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={item}
                        initial={{ y: spinning ? 40 : 0, opacity: spinning ? 0 : 1 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                      >
                        {item}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`px-8 py-3 rounded-2xl font-black italic text-xl uppercase tracking-widest ${
                result === 'win' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {result === 'win' ? (
                <div className="flex items-center gap-3">
                  <Trophy size={24} />
                  <span>WIN RS {bet * multiplier}</span>
                </div>
              ) : 'Better luck!'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm bg-[#1C1F3D] rounded-[2.5rem] p-6 border border-white/5 space-y-6">
          <div className="flex items-center justify-between bg-black/40 p-2 rounded-2xl border border-white/5">
            <button 
              onClick={() => setBet(Math.max(minBet, bet - 10))}
              disabled={spinning}
              className="w-12 h-12 rounded-xl bg-[#1C1F3D] flex items-center justify-center active:scale-95 disabled:opacity-30 transition-all border border-white/5"
            >
              <Minus size={20} />
            </button>
            <div className="text-center flex-1">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block">Stake Amount</span>
              <span className="text-2xl font-black italic">RS {bet}</span>
            </div>
            <button 
              onClick={() => setBet(bet + 10)}
              disabled={spinning}
              className="w-12 h-12 rounded-xl bg-[#1C1F3D] flex items-center justify-center active:scale-95 disabled:opacity-30 transition-all border border-white/5"
            >
              <Plus size={20} />
            </button>
          </div>

          <button 
            onClick={spin}
            disabled={spinning || balance < bet}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-black italic text-xl uppercase tracking-[0.2em] shadow-xl hover:shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-3">
              {spinning ? 'Spinning...' : (
                <>
                  <Play fill="currentColor" size={20} />
                  <span>Spin Reels</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
