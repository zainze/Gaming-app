import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Play, Sparkles, Trophy, Zap, History, MousePointer2, RefreshCw } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';
import confetti from 'canvas-confetti';

interface GoldScratchProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

export const GoldScratch: React.FC<GoldScratchProps> = ({ 
  onWin, 
  onBet, 
  balance, 
  onExit,
  minBet = 10, 
  winRate = 35, 
  multiplier = 5 
}) => {
  const [bet, setBet] = useState(minBet);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [history, setHistory] = useState<{ type: 'win' | 'loss'; amount: number }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratching = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize Scratch Layer
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Premium Gold Metallic Texture
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#D4AF37'); // Metallic Gold
    gradient.addColorStop(0.2, '#F9E27E'); // Light highlight
    gradient.addColorStop(0.5, '#B8860B'); // Darker gold
    gradient.addColorStop(0.8, '#FFD700'); // Pure Gold
    gradient.addColorStop(1, '#8B4513'); // Deep shadows
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative sparkles / noise
    for (let i = 0; i < 200; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';
        ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Label
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#451a03';
    ctx.font = '900 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH TO REVEAL', canvas.width / 2, canvas.height / 2);
    
    ctx.font = 'bold 12px Inter';
    ctx.fillText('WIN UP TO ' + (bet * multiplier) + ' RS', canvas.width / 2, (canvas.height / 2) + 30);
  }, [bet, multiplier]);

  useEffect(() => {
    if (isPlaying && !revealed) {
      const timer = setTimeout(initCanvas, 50);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, revealed, initCanvas]);

  const startScratching = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying || revealed) return;
    isScratching.current = true;
    lastPoint.current = getCoordinates(e);
    playSound('scratch');
  };

  const stopScratching = () => {
    isScratching.current = false;
    lastPoint.current = null;
    stopSound('scratch');
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
    ctx.lineWidth = 45; // Thicker scratch for better feel

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
    
    // Periodically check progress while scratching for reactivity
    if (Math.random() > 0.9) checkProgress();
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

    // Performance optimization: check every 100th pixel
    for (let i = 3; i < pixels.length; i += 400) {
      if (pixels[i] === 0) transparentCount++;
    }

    const progress = (transparentCount / (pixels.length / 400)) * 100;
    setScratchProgress(progress);

    if (progress > 60) {
      handleCompleteReveal();
    }
  };

  const handleCompleteReveal = () => {
    if (revealed) return;
    setRevealed(true);
    isScratching.current = false;
    stopSound('scratch');
    
    if (isWinner) {
      playSound('win');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FBCB35', '#FFFFFF', '#FFD700']
      });
      onWin(bet * multiplier);
      setHistory(prev => [{ type: 'win', amount: bet * multiplier }, ...prev].slice(0, 5));
    } else {
      playSound('lose');
      setHistory(prev => [{ type: 'loss', amount: bet }, ...prev].slice(0, 5));
    }
  };

  const startGame = async () => {
    if (isPlaying || balance < bet) return;
    const success = await onBet(bet);
    if (!success) return;

    setIsPlaying(true);
    setRevealed(false);
    setScratchProgress(0);
    setIsWinner(Math.random() < (winRate / 100));
    playSound('chip');
  };

  return (
    <div className="flex flex-col h-full bg-[#050B14] text-white font-sans overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 blur-[120px] rounded-full" />
      </div>

      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-400" size={20} />
          <span className="text-amber-400 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Gold Scratch</span>
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

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 min-h-0">
        {/* Main Stage */}
        <div className="w-full max-w-lg aspect-[5/4] bg-[#0a121e] border-4 border-[#1a2b45] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
          {/* Card Decorations */}
          <div className="absolute top-4 left-6 flex flex-col gap-0.5 opacity-20">
             <span className="text-[8px] font-black uppercase font-mono tracking-widest text-amber-500">PlayHub Secure Ticket</span>
             <span className="text-[6px] font-mono text-white">#GS-{Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>
          <div className="absolute bottom-4 right-6 opacity-20">
             <div className="w-12 h-12 border border-white/20 rounded flex items-center justify-center text-[6px] font-mono text-center leading-none">
                VERIFIED<br/>GENUINE
             </div>
          </div>
          
          <AnimatePresence mode="wait">
            {!isPlaying ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6"
              >
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                  <Trophy size={48} className="text-amber-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Golden Fortune</h2>
                  <p className="text-white/40 uppercase text-[10px] font-black tracking-[0.3em]">Purchase a ticket to start scratching</p>
                </div>
                <button 
                  onClick={startGame}
                  disabled={balance < bet}
                  className="bg-amber-500 text-black font-black px-12 py-4 rounded-2xl text-sm uppercase tracking-widest shadow-[0_8px_0_#92400e] active:shadow-none active:translate-y-1 transition-all"
                >
                  Buy Ticket (RS {bet})
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full relative group"
              >
                {/* Underneath Content (Prize) */}
                <div className="absolute inset-0 bg-[#070d18] rounded-3xl overflow-hidden border border-[#23354d] flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      {isWinner ? (
                        <motion.div 
                          key="win"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center gap-4"
                        >
                           <motion.div
                             animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                             transition={{ duration: 0.5, repeat: revealed ? Infinity : 0 }}
                           >
                            <Trophy size={80} className="text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
                           </motion.div>
                           <div className="text-center">
                             <div className="text-amber-400 font-black text-4xl italic tracking-tighter">RS {bet * multiplier}</div>
                             <div className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/60">Grand Prize</div>
                           </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="loss"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-2 opacity-20"
                        >
                           <Zap size={64} className="text-white" />
                           <div className="font-black text-xl italic uppercase tracking-widest">Try Again</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                    className="absolute inset-0 z-10 cursor-crosshair rounded-3xl touch-none shadow-2xl"
                  />
                )}

                {/* Guide overlay */}
                {!revealed && scratchProgress < 5 && (
                  <motion.div 
                    animate={{ x: [-20, 20, -20], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                  >
                    <div className="flex flex-col items-center gap-2">
                       <MousePointer2 size={32} className="text-white/50" />
                       <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Scratch Here</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Panel during game */}
        <AnimatePresence>
          {revealed ? (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <button 
                onClick={() => { setIsPlaying(false); setRevealed(false); }}
                className="bg-amber-500 text-black font-black px-12 py-4 rounded-2xl text-sm uppercase tracking-widest shadow-[0_8px_0_#92400e] active:shadow-none active:translate-y-1 transition-all"
              >
                Buy New Ticket
              </button>
            </motion.div>
          ) : isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8"
            >
              <button 
                onClick={handleCompleteReveal}
                className="bg-white/5 hover:bg-white/10 text-white/40 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={12} /> Reveal All
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History / Multiplier Info */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
           <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Wager List</span>
              <div className="flex gap-2">
                {history.map((h, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border ${h.type === 'win' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                    {h.type === 'win' ? 'W' : 'L'}
                  </div>
                ))}
              </div>
           </div>
           
           <div className="text-right">
              <div className="text-amber-400 font-black text-2xl italic tracking-tighter">{multiplier}x</div>
              <div className="text-[10px] font-black uppercase text-white/20 tracking-widest">Payout Rate</div>
           </div>
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="p-4 bg-[#0a121e] border-t border-[#1a2b45] relative z-30 shrink-0">
        <div className="max-w-xl mx-auto flex items-center gap-4">
           {/* Amount Control */}
           <div className="flex-1 bg-black/40 rounded-2xl border border-[#1a2b45] flex items-center justify-between p-2 shadow-inner">
              <button 
                disabled={isPlaying}
                onClick={() => { playSound('click'); setBet(Math.max(minBet, bet - 10)); }}
                className="w-12 h-12 rounded-xl bg-[#14233a] flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-20"
              >
                <Minus size={20} />
              </button>
              
              <div className="flex-1 text-center">
                <span className="block text-[9px] font-black uppercase text-white/30 tracking-widest">Wager Amount</span>
                <span className="text-2xl font-black italic text-amber-400">RS {bet}</span>
              </div>

              <button 
                disabled={isPlaying}
                onClick={() => { playSound('click'); setBet(bet + 10); }}
                className="w-12 h-12 rounded-xl bg-[#14233a] flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-20"
              >
                <Plus size={20} />
              </button>
           </div>

           <button 
             onClick={startGame}
             disabled={isPlaying || balance < bet}
             className="w-40 bg-amber-500 hover:bg-amber-600 text-black font-black py-4 rounded-2xl shadow-[0_8px_0_#92400e] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
           >
             <Play size={20} className="fill-current" />
             Buy
           </button>
        </div>
      </footer>
    </div>
  );
};
