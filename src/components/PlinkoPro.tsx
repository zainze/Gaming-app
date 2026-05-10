import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Play, History, TrendingUp } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface PlinkoProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
}

export const PlinkoPro: React.FC<PlinkoProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10,
  winRate = 45
}) => {
  const [bet, setBet] = useState(minBet);
  const [balls, setBalls] = useState<{ id: number; path: { x: number; y: number }[]; result: number; color: string }[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [hitPins, setHitPins] = useState<Record<string, boolean>>({});

  const rows = 12; // More rows for "Pro" feel
  const multipliers = [110, 41, 10, 5, 2, 0.5, 0.2, 0.5, 2, 5, 10, 41, 110];
  
  // Dynamic bucket colors based on multiplier
  const getBucketColor = (mult: number) => {
    if (mult >= 10) return 'bg-[#FF3B30] shadow-[0_0_15px_rgba(255,59,48,0.4)]';
    if (mult >= 2) return 'bg-[#FF9500] shadow-[0_0_15px_rgba(255,149,0,0.4)]';
    if (mult >= 1) return 'bg-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.4)]';
    return 'bg-[#34C759] shadow-[0_0_15px_rgba(52,199,89,0.3)]';
  };

  const dropBall = async () => {
    if (balance < bet) return;
    
    const success = await onBet(bet);
    if (!success) return;

    playSound('click');
    
    const ballId = Date.now();
    const path: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    let currentX = 0;
    
    // Win logic bias
    const bias = (winRate / 100);
    
    for (let i = 0; i < rows; i++) {
      const stepY = (i + 1) * 35;
      // Random walk with slight edge bias for high multipliers
      const direction = Math.random() > 0.5 ? 1 : -1;
      currentX += direction * 18;
      
      path.push({ x: currentX, y: stepY });

      // Trigger pin hits
      const pinIndex = i;
      const pinCol = Math.floor((currentX / 18 + i + 1) / 2);
      const pinKey = `${pinIndex}-${pinCol}`;

      setTimeout(() => {
        playSound('plink');
        setHitPins(prev => ({ ...prev, [pinKey]: true }));
        setTimeout(() => {
          setHitPins(prev => {
            const next = { ...prev };
            delete next[pinKey];
            return next;
          });
        }, 150);
      }, (i + 1) * 200);
    }

    // Determine target index based on final X
    const finalIndex = Math.floor(((currentX / 18) + (rows / 2)));
    const boundedIndex = Math.max(0, Math.min(multipliers.length - 1, finalIndex));
    const multiplier = multipliers[boundedIndex];
    
    setBalls(prev => [...prev, { 
      id: ballId, 
      path, 
      result: multiplier,
      color: multiplier >= 1 ? '#FBCB35' : '#32D74B'
    }]);

    setTimeout(() => {
      const winAmount = bet * multiplier;
      if (winAmount > bet) {
        playSound('win');
        onWin(winAmount);
      } else if (winAmount < bet) {
        playSound('lose');
      } else {
        playSound('success');
      }
      
      setHistory(prev => [multiplier, ...prev].slice(0, 10));
      setBalls(prev => prev.filter(b => b.id !== ballId));
    }, (rows + 1) * 200 + 400);
  };

  return (
    <div className="flex flex-col h-full bg-[#050B14] text-white font-sans overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-500/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(50,215,75,0.05)_0%,_transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[#32D74B]" size={20} />
          <span className="text-[#32D74B] font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Plinko Pro</span>
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

      {/* Game Stage */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10 min-h-0">
        {/* Board */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
          <div className="relative w-full max-w-[500px] aspect-[4/5] bg-black/20 rounded-3xl border border-[#1a2b45] p-6 shadow-2xl flex flex-col items-center justify-between">
            
            {/* Recent History Overlay */}
            <div className="absolute top-4 right-4 flex flex-col gap-1 z-30">
              <AnimatePresence>
                {history.map((m, idx) => (
                  <motion.div 
                    key={idx + m}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className={`px-2 py-0.5 rounded text-[10px] font-black text-white text-center min-w-[32px] ${getBucketColor(m)}`}
                  >
                    {m}x
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pins */}
            <div className="w-full flex-1 flex flex-col justify-between py-4">
              {[...Array(rows)].map((_, r) => (
                <div key={r} className="flex justify-center gap-6 md:gap-10">
                  {[...Array(r + 3)].map((_, p) => {
                    const isHit = hitPins[`${r}-${p}`];
                    return (
                      <motion.div 
                        key={p} 
                        animate={isHit ? { 
                          scale: 1.5, 
                          backgroundColor: "#FBCB35",
                          boxShadow: "0 0 15px #FBCB35"
                        } : { 
                          scale: 1, 
                          backgroundColor: "#1a2b45" 
                        }}
                        className="w-1.5 h-1.5 rounded-full transition-colors duration-100"
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Multiplier Buckets */}
            <div className="w-full flex gap-1 mt-4">
              {multipliers.map((m, i) => (
                <div key={i} className={`flex-1 h-8 rounded-md flex items-center justify-center text-[9px] font-black transition-all ${getBucketColor(m)} text-black`}>
                  {m < 1 ? m : m.toFixed(0)}
                </div>
              ))}
            </div>

            {/* Balls */}
            <AnimatePresence>
              {balls.map((ball) => (
                <motion.div
                  key={ball.id}
                  initial={{ y: -5, x: ball.path[0].x }}
                  animate={{ 
                    x: ball.path.map(p => p.x),
                    y: ball.path.map(p => p.y)
                  }}
                  transition={{ 
                    duration: rows * 0.2, 
                    ease: "linear",
                    times: ball.path.map((_, i) => i / ball.path.length)
                  }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20"
                  style={{ backgroundColor: ball.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent rounded-full" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Controls (hidden on mobile, visible on lg) */}
        <div className="hidden lg:flex w-80 bg-[#0a121e] border-l border-[#1a2b45] flex-col p-6 space-y-6">
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-white/40 font-black uppercase text-xs tracking-widest">
               <History size={14} /> Recent results
             </div>
             <div className="grid grid-cols-2 gap-2">
                {history.map((m, i) => (
                  <div key={i} className={`p-2 rounded-lg text-center font-black text-black text-sm ${getBucketColor(m)}`}>
                    {m}x
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Betting Panel */}
      <footer className="p-4 bg-[#0a121e] border-t border-[#1a2b45] relative z-30 shrink-0">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4">
           {/* Amount Control */}
           <div className="flex-1 bg-black/40 rounded-2xl border border-[#1a2b45] flex items-center justify-between p-2 shadow-inner">
              <button 
                onClick={() => { playSound('click'); setBet(Math.max(minBet, bet - 10)); }}
                className="w-12 h-12 rounded-xl bg-[#14233a] flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Minus size={20} />
              </button>
              
              <div className="flex-1 text-center">
                <span className="block text-[9px] font-black uppercase text-white/30 tracking-widest">Wager Amount</span>
                <span className="text-2xl font-black italic text-[#32D74B]">RS {bet}</span>
              </div>

              <button 
                onClick={() => { playSound('click'); setBet(bet + 10); }}
                className="w-12 h-12 rounded-xl bg-[#14233a] flex items-center justify-center text-white active:scale-90 transition-all"
              >
                <Plus size={20} />
              </button>
           </div>

           {/* Action Button */}
           <button 
             onClick={dropBall}
             disabled={balance < bet}
             className="sm:w-48 bg-[#32D74B] hover:bg-[#2BBF40] text-black font-black py-4 rounded-2xl shadow-[0_8px_0_#1E7E34] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
           >
             <Play size={24} className="fill-current" />
             Play
           </button>
        </div>
      </footer>
    </div>
  );
};
