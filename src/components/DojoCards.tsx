import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Swords, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface DojoCardsProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const CARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A

export const DojoCards: React.FC<DojoCardsProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 48, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [currentCard, setCurrentCard] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [nextCard, setNextCard] = useState<number | null>(null);

  const play = (prediction: 'high' | 'low') => {
    if (balance < bet || playing) return;
    
    setPlaying(true);
    setResult(null);
    setNextCard(null);
    onBet(bet);
    playSound('click');

    const isWin = Math.random() * 100 < winRate;
    let newCard: number;

    if (prediction === 'high') {
      if (isWin) {
        newCard = Math.min(14, currentCard + Math.floor(Math.random() * (14 - currentCard)) + 1);
      } else {
        newCard = Math.max(2, currentCard - Math.floor(Math.random() * (currentCard - 2)) - 1);
      }
    } else {
      if (isWin) {
        newCard = Math.max(2, currentCard - Math.floor(Math.random() * (currentCard - 2)) - 1);
      } else {
        newCard = Math.min(14, currentCard + Math.floor(Math.random() * (14 - currentCard)) + 1);
      }
    }

    setTimeout(() => {
      setNextCard(newCard);
      setPlaying(false);
      
      if (isWin) {
        setResult('win');
        onWin(bet * multiplier);
        playSound('win');
      } else {
        setResult('lose');
        playSound('lose');
      }
      
      setTimeout(() => {
        setCurrentCard(newCard);
        setNextCard(null);
        setResult(null);
      }, 2000);
    }, 800);
  };

  const getCardLabel = (val: number) => {
    if (val <= 10) return val.toString();
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return 'A';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f0d] text-white font-sans overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1552084117-56a987666449?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0d]/90 via-transparent to-[#0a0f0d]" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-green-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Swords size={20} className="text-green-500 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Dojo Hi-Lo</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500/60">Honor & Fortune</span>
        </div>
        <div className="bg-green-500/10 px-4 py-2 rounded-2xl border border-green-500/30 backdrop-blur-xl">
          <span className="text-green-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 space-y-12">
        <div className="flex gap-6 items-center">
            {/* Current Card */}
            <div className="relative group">
                <div className="absolute -inset-4 bg-green-500/10 blur-2xl rounded-full opacity-50" />
                <motion.div 
                    animate={playing ? { rotateY: 180 } : { rotateY: 0 }}
                    className="w-32 h-48 bg-white text-black rounded-2xl shadow-2xl flex flex-col items-center justify-between p-4 border-2 border-green-900/20"
                >
                    <span className="self-start text-2xl font-black">{getCardLabel(currentCard)}</span>
                    <Swords size={48} className="text-green-800/10" />
                    <span className="self-end text-2xl font-black rotate-180">{getCardLabel(currentCard)}</span>
                </motion.div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">Current Stance</div>
            </div>

            <div className="text-green-500/20">
                <Swords size={32} />
            </div>

            {/* Next Card Slot */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    {nextCard !== null ? (
                        <motion.div 
                            key="next"
                            initial={{ x: 50, opacity: 0, rotateY: 90 }}
                            animate={{ x: 0, opacity: 1, rotateY: 0 }}
                            className="w-32 h-48 bg-white text-black rounded-2xl shadow-2xl flex flex-col items-center justify-between p-4 border-2 border-green-500"
                        >
                            <span className="self-start text-2xl font-black">{getCardLabel(nextCard)}</span>
                            <Trophy size={48} className="text-yellow-500/20" />
                            <span className="self-end text-2xl font-black rotate-180">{getCardLabel(nextCard)}</span>
                        </motion.div>
                    ) : (
                        <div className="w-32 h-48 rounded-2xl bg-black/40 border-2 border-dashed border-white/10 flex items-center justify-center">
                            <span className="text-3xl opacity-10">?</span>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <div className="flex gap-4 w-full max-w-sm">
            <button 
                onClick={() => play('low')}
                disabled={playing}
                className="flex-1 h-24 bg-red-600/80 hover:bg-red-500 rounded-3xl border-b-4 border-red-900 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
            >
                <ChevronDown size={32} />
                <span className="text-xs font-black uppercase tracking-widest">Lower</span>
            </button>
            <button 
                onClick={() => play('high')}
                disabled={playing}
                className="flex-1 h-24 bg-green-600/80 hover:bg-green-500 rounded-3xl border-b-4 border-green-900 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
            >
                <ChevronUp size={32} />
                <span className="text-xs font-black uppercase tracking-widest">Higher</span>
            </button>
        </div>

        <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center justify-between bg-black/60 p-4 rounded-3xl border border-white/5 shadow-2xl">
                <button onClick={() => setBet(Math.max(minBet, bet - 10))} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center disabled:opacity-30" disabled={playing}>-</button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block mb-1">Honor Stakes</span>
                    <span className="text-2xl font-black italic">RS {bet}</span>
                </div>
                <button onClick={() => setBet(bet + 10)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center disabled:opacity-30" disabled={playing}>+</button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {result && (
            <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] px-12 py-6 rounded-[3rem] font-black italic text-4xl uppercase tracking-widest backdrop-blur-3xl border-4 ${
                    result === 'win' ? 'text-green-500 bg-green-500/20 border-green-500/30' : 'text-red-500 bg-red-500/20 border-red-500/30'
                }`}
            >
                {result === 'win' ? 'Victory' : 'Defeat'}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
