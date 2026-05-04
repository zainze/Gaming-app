import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleDot, Play, RefreshCw, Trophy } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface PlinkoProps {
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  balance: number;
  config: any;
}

export const PlinkoPro: React.FC<PlinkoProps> = ({ onWin, onLoss, balance, config }) => {
  const [betAmount, setBetAmount] = useState(config.minBet || 10);
  const [balls, setBalls] = useState<{ id: number; path: { x: number; y: number }[] }[]>([]);
  const [lastMultipliers, setLastMultipliers] = useState<{ id: number; val: number }[]>([]);

  const rows = 9;
  const baseMultipliers = [10, 5, 2, 0.5, 0.2, 0.5, 2, 5, 10];
  const multipliers = baseMultipliers.map(m => Number((m * (config.multiplier / 2 || 1)).toFixed(1)));

  const [hitPins, setHitPins] = useState<Record<string, boolean>>({});

  const spawnBall = () => {
    if (balance < betAmount) return;
    playSound('click');
    
    const path: { x: number; y: number }[] = [{ x: 0, y: -40 }];
    let currentX = 0;
    const winBias = (config.winRate / 100) || 0.45;
    const ballId = Date.now() + Math.random();

    for (let i = 0; i < rows; i++) {
        const rowY = (i + 1) * 38;
        const direction = Math.random() < winBias ? (Math.random() > 0.5 ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1);
        currentX += direction * 16;
        
        path.push({ x: currentX, y: rowY });

        // Trigger pin animation
        const pinKey = `${i}-${Math.floor(((currentX / 16) + (i + 1)) / 2)}`;
        setTimeout(() => {
            setHitPins(prev => ({ ...prev, [pinKey]: true }));
            setTimeout(() => {
                setHitPins(prev => {
                    const next = { ...prev };
                    delete next[pinKey];
                    return next;
                });
            }, 200);
        }, (i + 1) * 300);
    }

    setBalls(prev => [...prev, { id: ballId, path }]);
    playSound('chip');

    // Determine Result
    const index = Math.floor(((currentX / 16) + (rows - 1)) / 2) + 1;
    const boundedIndex = Math.max(0, Math.min(multipliers.length - 1, index));
    const mult = multipliers[boundedIndex];

    setTimeout(() => {
      setLastMultipliers(prev => [{ id: ballId, val: mult }, ...prev].slice(0, 5));
      const totalWin = betAmount * mult;
      if (totalWin > betAmount) {
        playSound('win');
        onWin(totalWin - betAmount);
      } else if (totalWin < betAmount) {
        playSound('lose');
        onLoss(betAmount - totalWin);
      } else {
        // Break even, maybe a click?
        playSound('click');
      }
      setBalls(prev => prev.filter(b => b.id !== ballId));
    }, 2800);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 text-neutral-900 border border-neutral-100 shadow-2xl relative overflow-hidden">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[80px] -mr-16 -mt-16 rounded-full" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center bg-neutral-50/50 backdrop-blur-sm px-5 py-4 rounded-3xl border border-neutral-100/50">
          <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Recent Hits</span>
              <div className="flex gap-1.5 mt-2">
                <AnimatePresence>
                  {lastMultipliers.map((m) => (
                    <motion.div 
                      key={m.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`px-2 py-1 rounded-lg text-[9px] font-black border ${m.val >= 1 ? 'bg-orange-500 border-orange-600 text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-400'}`}
                    >
                      {m.val}x
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
          </div>
          <div className="text-right">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Top Prize</span>
              <p className="text-xl font-black italic text-orange-500">{multipliers[0]}x</p>
          </div>
        </div>

        <div className="relative aspect-[4/5] bg-neutral-50/30 rounded-[2.5rem] p-8 flex flex-col items-center overflow-hidden border border-neutral-100 shadow-inner">
          {/* Pins with glow effect */}
          <div className="flex-1 w-full flex flex-col justify-between py-6">
            {[...Array(rows)].map((_, r) => (
              <div key={r} className="flex justify-center gap-9">
                {[...Array(r + 2)].map((_, p) => {
                  const isHit = hitPins[`${r}-${p}`];
                  return (
                    <motion.div 
                      key={p} 
                      animate={isHit ? { scale: 1.5, backgroundColor: "#f97316" } : { scale: 1, backgroundColor: "#e5e5e5" }}
                      className="w-2 h-2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.05)] relative"
                    >
                      <div className="absolute inset-0 bg-white/50 blur-[2px] rounded-full" />
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Slots with reactive glow */}
          <div className="w-full flex gap-1.5 mt-6 px-1">
              {multipliers.map((m, i) => {
                  const isLastHit = lastMultipliers[0]?.val === m;
                  return (
                    <div key={i} className={`flex-1 h-10 rounded-xl flex items-center justify-center text-[8px] font-black border-2 transition-all duration-300 relative overflow-hidden ${
                        isLastHit ? 'scale-110 -translate-y-2 bg-orange-500 border-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.3)]' : 
                        m >= 1 ? 'bg-white border-orange-100 text-orange-600' : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                    }`}>
                        {isLastHit && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0], scale: [1, 2, 3] }}
                                className="absolute inset-0 bg-white"
                            />
                        )}
                        {m}x
                    </div>
                  );
              })}
          </div>

          {/* Dropping Balls */}
          <AnimatePresence>
            {balls.map((ball) => (
              <motion.div
                key={ball.id}
                initial={{ y: -40, x: 0 }}
                animate={{ 
                  x: ball.path.map(p => p.x),
                  y: ball.path.map(p => p.y)
                }}
                transition={{ duration: 2.8, ease: [0.45, 0.05, 0.55, 0.95] }}
                className="absolute top-8 w-4 h-4 bg-orange-500 rounded-full shadow-[0_8px_16px_rgba(249,115,22,0.4)] z-10 border-2 border-white"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent rounded-full" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-50 p-4 rounded-[2rem] border border-neutral-100 flex flex-col justify-center">
             <p className="text-[10px] font-black uppercase text-neutral-400 mb-1 ml-1">Wager</p>
             <div className="flex items-center justify-between">
                <input 
                  type="number" 
                  value={betAmount || 0} 
                  onChange={(e) => setBetAmount(Number(e.target.value) || 0)}
                  className="bg-transparent text-2xl font-black italic text-neutral-900 outline-none w-full"
                />
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setBetAmount(a => Math.max(10, a/2))} className="w-8 h-8 rounded-xl bg-white border border-neutral-200 text-[10px] font-black hover:bg-neutral-900 hover:text-white transition-colors">½</button>
                  <button onClick={() => setBetAmount(a => a*2)} className="w-8 h-8 rounded-xl bg-white border border-neutral-200 text-[10px] font-black hover:bg-neutral-900 hover:text-white transition-colors">2x</button>
                </div>
             </div>
          </div>

          <button 
            onClick={spawnBall}
            disabled={balance < betAmount}
            className="h-full bg-neutral-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            <Play size={18} className="fill-current group-hover:scale-110 transition-transform" />
            Drop Ball
          </button>
        </div>
      </div>
    </div>
  );
};
