import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Play, Sparkles } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface ColorMatchProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
];

export const ColorMatch: React.FC<ColorMatchProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 33, minBet = 10, multiplier = 2.5 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [targetColor, setTargetColor] = useState<string | null>(null);
  const [result, setResult] = useState<'win' | 'loss' | null>(null);

  const play = (colorName: string) => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setSelectedColor(colorName);
    setResult(null);
    setTargetColor(null);
    onBet(bet);
    playSound('click');

    const isWin = Math.random() * 100 < winRate;
    let finalColor: string;

    if (isWin) {
      finalColor = colorName;
    } else {
      const otherColors = COLORS.filter(c => c.name !== colorName);
      finalColor = otherColors[Math.floor(Math.random() * otherColors.length)].name;
    }

    setTimeout(() => {
      setTargetColor(finalColor);
      setPlaying(false);
      
      if (isWin) {
        setResult('win');
        onWin(bet * multiplier);
        playSound('win');
      } else {
        setResult('loss');
        playSound('lose');
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans overflow-hidden relative">
      {/* Dynamic Cyber Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_70%)]" />
      </div>

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-white/5 backdrop-blur-xl shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-cyan-400 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Prism Sync</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/60">Neural Matcher</span>
        </div>
        <div className="bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/20 backdrop-blur-xl">
          <span className="text-cyan-400 font-black text-sm tracking-tight uppercase">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative p-8 z-10 space-y-12">
        {/* Visual Pulse */}
        {playing && (
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute w-96 h-96 rounded-full blur-[100px] pointer-events-none"
                style={{ backgroundColor: COLORS.find(c => c.name === selectedColor)?.hex }}
            />
        )}
        <div className="relative w-48 h-48 rounded-[3rem] border-4 border-white/10 flex items-center justify-center overflow-hidden bg-black/40">
          <AnimatePresence mode="wait">
            {targetColor ? (
              <motion.div 
                key="target"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0"
                style={{ backgroundColor: COLORS.find(c => c.name === targetColor)?.hex }}
              >
                <div className="w-full h-full flex items-center justify-center font-black text-2xl uppercase italic drop-shadow-lg">
                  {targetColor}
                </div>
              </motion.div>
            ) : playing ? (
              <motion.div 
                key="spinner"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
              />
            ) : (
              <div className="text-center p-4">
                <Sparkles className="mx-auto mb-2 text-white/20" size={32} />
                <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Select a color to start</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          {COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => play(c.name)}
              disabled={playing}
              className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all active:scale-95 disabled:opacity-50 ${
                selectedColor === c.name && !result ? 'border-white bg-white/10' : 'border-transparent bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl shadow-lg" style={{ backgroundColor: c.hex }} />
              <span className="text-[10px] font-black uppercase tracking-widest">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="w-full max-w-sm space-y-6">
           <div className="flex items-center justify-between bg-black/40 p-4 rounded-3xl border border-white/5">
              <div className="text-center flex-1">
                 <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block">Multiplier</span>
                 <span className="text-xl font-black text-blue-400">{multiplier}x</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center flex-1">
                 <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block">Current Bet</span>
                 <span className="text-xl font-black text-white">RS {bet}</span>
              </div>
           </div>

           <div className="flex gap-2">
              {[10, 50, 100, 500].map(v => (
                <button 
                  key={v} 
                  onClick={() => setBet(v)}
                  disabled={playing}
                  className={`flex-1 py-3 rounded-xl border font-black text-[10px] transition-all ${bet === v ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                >
                  {v}
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
