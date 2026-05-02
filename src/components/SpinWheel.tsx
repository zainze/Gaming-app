import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCcw, Zap } from "lucide-react";

export default function SpinWheel({ onWin, onBet, balance, minBet = 10, winRate = 30, multiplier = 5 }: { 
  onWin: (amount: number) => void,
  onBet: (amount: number) => Promise<boolean>,
  balance: number,
  minBet?: number,
  winRate?: number,
  multiplier?: number
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const BET_COST = minBet;

  const winSegments = [`RS${minBet}`, `RS${minBet * 2}`, `RS${minBet * 5}`, `RS${minBet * 10}`];
  const segments = ["MISS", winSegments[0], "MISS", winSegments[2], "MISS", winSegments[1], "MISS", winSegments[3]];

  const spin = async () => {
    if (spinning || balance < BET_COST) return;

    const betSuccess = await onBet(BET_COST);
    if (!betSuccess) return;

    setSpinning(true);
    setResult(null);

    const isWin = Math.random() < (winRate / 100);
    const segmentWidth = 360 / segments.length;
    
    let targetSector: number;
    if (isWin) {
      // Pick one of the win sectors (1, 3, 5, 7)
      const winSectors = [1, 3, 5, 7];
      targetSector = winSectors[Math.floor(Math.random() * winSectors.length)];
    } else {
      // Pick one of the miss sectors (0, 2, 4, 6)
      const missSectors = [0, 2, 4, 6];
      targetSector = missSectors[Math.floor(Math.random() * missSectors.length)];
    }

    // Logic: sector 0 is at top? current logic says segments[segments.length - 1 - sector]
    // Let's simplify: 
    // targetRotation should end such that segments[targetSector] is under the needle
    const extraRots = 5 + Math.floor(Math.random() * 5);
    const targetBaseRotation = (segments.length - 1 - targetSector) * segmentWidth;
    const finalRot = rotation + extraRots * 360 + targetBaseRotation + (Math.random() * (segmentWidth * 0.8) + (segmentWidth * 0.1));
    
    setRotation(finalRot);

    setTimeout(() => {
      setSpinning(false);
      const sector = Math.floor(((finalRot % 360)) / segmentWidth);
      const win = segments[segments.length - 1 - sector];
      setResult(win === "MISS" ? "Better Luck Next Time" : `YOU WON ${win}!`);
      if (win !== "MISS") {
        onWin(parseInt(win.replace('RS', '')));
      }
    }, 4000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-8 flex flex-col items-center overflow-hidden">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black italic uppercase">Super Spin</h3>
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest text-center">Spin to win up to RS {minBet * 10}</p>
      </div>

      <div className="relative">
        <div className="absolute top-0 left-1/2 -ml-2 -mt-4 w-4 h-8 bg-white rounded-full z-20 shadow-2xl border-2 border-orange-500" />
          <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.1, 0, 0, 1] }}
          className="w-72 h-72 border-8 border-neutral-950 rounded-full relative shadow-[0_0_50px_rgba(249,115,22,0.2)]"
          style={{ 
            background: 'conic-gradient(from 0deg, #f97316 0deg 45deg, #171717 45deg 90deg, #ea580c 90deg 135deg, #262626 135deg 180deg, #f97316 180deg 225deg, #171717 225deg 270deg, #ea580c 270deg 315deg, #262626 315deg 360deg)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          {segments.map((s, i) => (
            <div 
              key={i} 
              className="absolute top-0 left-1/2 -ml-4 w-8 h-36 flex flex-col items-center pt-6 origin-bottom font-black text-xs text-white drop-shadow-md"
              style={{ transform: `rotate(${i * (360 / segments.length)}deg)` }}
            >
              <span className="rotate-0 uppercase tracking-tighter">{s}</span>
            </div>
          ))}
          <div className="absolute inset-0 m-auto w-16 h-16 bg-neutral-900 rounded-full border-4 border-orange-600 flex items-center justify-center z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
            <Zap size={24} className="text-orange-500 fill-orange-500/20" />
          </div>
          {/* Decorative lights */}
          {[...Array(16)].map((_, i) => (
            <div 
              key={i}
              className="absolute top-0 left-1/2 -ml-1 w-2 h-2 rounded-full bg-white/40 origin-[center_144px]"
              style={{ transform: `rotate(${i * 22.5}deg) translateY(4px)` }}
            />
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`font-black text-lg uppercase italic text-center ${result.includes('WON') ? 'text-green-500' : 'text-red-500'}`}
          >
            {result}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={spin}
        disabled={spinning}
        className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {spinning ? <RefreshCcw className="animate-spin" /> : `Spin RS ${BET_COST}`}
      </button>
    </div>
  );
}
