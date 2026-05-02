import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { Coins, Target, Zap, AlertTriangle } from "lucide-react";

export default function SwipeMaster({ onWin, onBet, userBalance, betAmount, winRate = 40, multiplier = 3 }: { 
  onWin: (amount: number) => void, 
  onBet: (amount: number) => Promise<boolean>,
  userBalance: number,
  betAmount: number,
  winRate?: number,
  multiplier?: number
}) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [result, setResult] = useState<{ multiplier: number; win: number } | null>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-25, 25]);
  const opacity = useTransform(x, [-150, -100, 0, 100, 150], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (gameState !== 'playing') return;

    const swipeThreshold = 80;
    const { x: xOffset, y: yOffset } = info.offset;
    const { x: xVelocity, y: yVelocity } = info.velocity;
    
    if (Math.abs(xOffset) > swipeThreshold || Math.abs(xVelocity) > 500) {
      const swipedCorrectly = xOffset > swipeThreshold || yOffset < -swipeThreshold || xVelocity > 500 || yVelocity < -500;
      
      // Luck check based on winRate
      const luckCheck = Math.random() < (winRate / 100);
      const isWin = swipedCorrectly && luckCheck;
      
      const sessionMultiplier = isWin ? multiplier : 0;
      
      setResult({ multiplier: sessionMultiplier, win: betAmount * sessionMultiplier });
      setGameState('result');
      
      if (sessionMultiplier > 0) {
        onWin(betAmount * sessionMultiplier);
      }
    } else {
      x.set(0);
      y.set(0);
    }
  };

  const startLevel = async () => {
    if (userBalance < betAmount) return;
    const betSuccess = await onBet(betAmount);
    if (!betSuccess) return;

    setGameState('playing');
    setResult(null);
    x.set(0);
    y.set(0);
  };

  return (
    <div className="bg-white border border-neutral-100 p-8 rounded-[2.5rem] space-y-8 flex flex-col items-center overflow-hidden shadow-sm">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black italic uppercase text-neutral-900">Swipe Master</h3>
        <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest text-center italic">Swipe the lucky coin into the bonus zone</p>
      </div>

      <div className="relative w-full h-64 flex items-center justify-center">
        {/* Target Zones */}
        <div className="absolute inset-x-0 flex justify-between px-4">
          <div className="w-16 h-16 border-2 border-dashed border-red-500/10 rounded-full flex items-center justify-center text-red-500/20 font-black text-[10px]">MISS</div>
          <div className="w-16 h-16 border-2 border-dashed border-green-500/10 rounded-full flex items-center justify-center text-green-500/20 font-black text-[10px]">WIN</div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'idle' || gameState === 'result' ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="space-y-6 text-center z-10"
            >
              {result && (
                <div className={`space-y-1 mb-4`}>
                    <p className={`text-4xl font-black italic ${result.multiplier > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {result.multiplier > 0 ? `+ RS ${result.win.toFixed(2)}` : 'WASTED'}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">Multiplier: {result.multiplier}x</p>
                </div>
              )}
              <button 
                onClick={startLevel}
                className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
              >
                Play for RS {betAmount}
              </button>
            </motion.div>
          ) : (
            <motion.div
              drag
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              style={{ x, y, rotate, opacity }}
              whileHover={{ scale: 1.05 }}
              whileDrag={{ 
                scale: 1.1, 
                rotate: 15,
                boxShadow: "0px 10px 30px rgba(249, 115, 22, 0.4)",
                cursor: 'grabbing' 
              }}
              className="w-36 h-36 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-orange-500/50 cursor-grab z-20 relative overflow-hidden"
            >
              <img 
                src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=200&auto=format&fit=crop" 
                alt="Chip" 
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 via-transparent to-blue-500/40" />
              <Zap size={48} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] relative z-10" />
              <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-[pulse_1.5s_infinite] opacity-40" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full grid grid-cols-3 gap-2">
        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex flex-col items-center">
            <Target size={16} className="text-orange-500 mb-1" />
            <span className="text-[8px] font-bold text-neutral-400 uppercase">Skill</span>
        </div>
        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex flex-col items-center">
            <Zap size={16} className="text-blue-500 mb-1" />
            <span className="text-[8px] font-bold text-neutral-400 uppercase">Fast</span>
        </div>
        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex flex-col items-center">
            <AlertTriangle size={16} className="text-red-500 mb-1" />
            <span className="text-[8px] font-bold text-neutral-400 uppercase">Risk</span>
        </div>
      </div>
    </div>
  );
}
