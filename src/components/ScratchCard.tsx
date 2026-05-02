import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eraser, Zap, Trophy, Coins, Sparkles } from 'lucide-react';

interface ScratchCardProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

// Audio assets
const SOUNDS = {
  scratch: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  loss: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
};

export const ScratchCard: React.FC<ScratchCardProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  minBet = 10, 
  winRate = 40, 
  multiplier = 4 
}) => {
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [bet, setBet] = useState(minBet);
  const [scratchProgress, setScratchProgress] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const scratchAudio = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    scratchAudio.current = new Audio(SOUNDS.scratch);
    scratchAudio.current.loop = true;
    scratchAudio.current.volume = 0.3;
    
    return () => {
      scratchAudio.current?.pause();
      scratchAudio.current = null;
    };
  }, []);

  const playSound = (type: keyof typeof SOUNDS) => {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = type === 'scratch' ? 0.3 : 0.5;
    audio.play().catch(() => {});
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Background - Metallic Gold Texture
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#fde68a'); // Amber 200
    gradient.addColorStop(0.5, '#fbbf24'); // Amber 400
    gradient.addColorStop(1, '#d97706'); // Amber 600
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative "Gold" pattern
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Label
    ctx.fillStyle = '#92400e';
    ctx.font = '900 12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);
  }, []);

  useEffect(() => {
    if (playing && !revealed) {
      // Delay slightly to ensure canvas is in DOM
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [playing, revealed, initCanvas]);

  const startScratching = (e: React.MouseEvent | React.TouchEvent) => {
    isScratching.current = true;
    lastPoint.current = getCoordinates(e);
    scratchAudio.current?.play().catch(() => {});
  };

  const stopScratching = () => {
    isScratching.current = false;
    lastPoint.current = null;
    scratchAudio.current?.pause();
    if (scratchAudio.current) scratchAudio.current.currentTime = 0;
    checkProgress();
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isScratching.current || !canvasRef.current || revealed) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCoordinates(e);
    if (!lastPoint.current) {
        lastPoint.current = currentPoint;
        return;
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 30;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentCount = 0;

    // Check alpha channel of every 20th pixel for performance
    for (let i = 3; i < pixels.length; i += 80) {
      if (pixels[i] === 0) transparentCount++;
    }

    const progress = (transparentCount / (pixels.length / 80)) * 100;
    setScratchProgress(progress);

    if (progress > 50) {
      handleCompleteReveal();
    }
  };

  const handleCompleteReveal = () => {
    if (revealed) return;
    setRevealed(true);
    isScratching.current = false;
    scratchAudio.current?.pause();
    
    if (isWinner) {
      playSound('win');
      onWin(bet * multiplier);
    } else {
      playSound('loss');
    }
  };

  const startScratch = async () => {
    if (playing) return;
    const success = await onBet(bet);
    if (!success) return;

    setPlaying(true);
    setRevealed(false);
    setScratchProgress(0);
    setIsWinner(Math.random() < (winRate / 100));
  };

  const reset = () => {
    setPlaying(false);
    setRevealed(false);
    setIsWinner(false);
    setScratchProgress(0);
  };

  return (
    <div className="bg-white border border-neutral-100 p-8 rounded-3xl space-y-6 flex flex-col items-center w-full max-w-sm mx-auto shadow-sm">
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-orange-500 flex items-center justify-center gap-2">
          <Sparkles className="text-amber-400" size={20} />
          Gold Scratch
        </h3>
        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Wipe to reveal the fortune</p>
      </div>

      <div className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden border-4 border-neutral-100 shadow-xl bg-neutral-50 group">
        {!playing ? (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center space-y-4">
             <div className="w-16 h-16 bg-orange-500/5 rounded-full flex items-center justify-center text-orange-400 animate-bounce">
                <Coins size={32} />
             </div>
             <p className="text-neutral-500 font-bold uppercase text-xs text-center tracking-tight">Try your luck with the golden ticket</p>
             <button 
               onClick={startScratch}
               className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all hover:bg-orange-600"
             >
               Buy for RS {bet}
             </button>
          </div>
        ) : (
          <div className="absolute inset-0 bg-white touch-none">
            {/* Prize Layer */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 space-y-2 transition-colors duration-500 ${isWinner ? 'bg-amber-50' : 'bg-neutral-50'}`}>
               {isWinner ? (
                 <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                 >
                   <Trophy size={64} className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
                   <p className="font-black text-3xl italic uppercase text-amber-600 tracking-tighter mt-2">RS {bet * multiplier}</p>
                   <p className="text-[10px] font-bold text-amber-500 uppercase">Jackpot Hit!</p>
                 </motion.div>
               ) : (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                 >
                   <Zap size={64} className="text-neutral-200" />
                   <p className="font-black text-xl italic uppercase text-neutral-300">Poor Luck</p>
                 </motion.div>
               )}
            </div>

            {/* Scratch Layer */}
            {!revealed && (
              <canvas
                ref={canvasRef}
                onMouseDown={startScratching}
                onMouseMove={scratch}
                onMouseUp={stopScratching}
                onMouseLeave={stopScratching}
                onTouchStart={startScratching}
                onTouchMove={scratch}
                onTouchEnd={stopScratching}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
              />
            )}
            
            {/* Reveal Animation overlay */}
            <AnimatePresence>
                {revealed && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"
                    >
                        {isWinner && (
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0] }}
                                transition={{ duration: 0.8 }}
                                className="w-full h-full bg-white/20"
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Progress Bar (Only during play) */}
      <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div 
            animate={{ width: `${playing ? scratchProgress : 0}%` }}
            className={`h-full transition-colors ${scratchProgress > 40 ? 'bg-orange-500' : 'bg-neutral-300'}`}
          />
      </div>

      <div className="w-full space-y-4">
        {playing && revealed && (
           <button 
             onClick={reset}
             className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-neutral-800 shadow-xl active:scale-95 transition-all"
           >
             Continue Playing
           </button>
        )}
        
        {!playing && (
          <div className="flex gap-2">
            {[minBet, minBet * 5, minBet * 10, minBet * 50].map(val => (
              <button 
                key={val}
                onClick={() => setBet(val)}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] border transition-all ${bet === val ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-neutral-50 border-neutral-100 text-neutral-400 hover:bg-neutral-100'}`}
              >
                RS {val}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
