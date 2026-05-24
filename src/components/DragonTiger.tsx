import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Swords, Trophy, Activity } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface DragonTigerProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const CARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export const DragonTiger: React.FC<DragonTigerProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'betting' | 'dealing' | 'result'>('betting');
  const [dragonCard, setDragonCard] = useState<number | null>(null);
  const [tigerCard, setTigerCard] = useState<number | null>(null);
  const [selection, setSelection] = useState<'dragon' | 'tiger' | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'tie' | null>(null);

  const startGame = (side: 'dragon' | 'tiger') => {
    if (balance < bet || playing) return;
    
    setSelection(side);
    setPlaying(true);
    setStage('dealing');
    setGameResult(null);
    setDragonCard(null);
    setTigerCard(null);
    onBet(bet);
    playSound('chip');

    const isWin = Math.random() * 100 < winRate;
    let dVal: number;
    let tVal: number;

    if (side === 'dragon') {
        if (isWin) {
            dVal = 4 + Math.floor(Math.random() * 10);
            tVal = 2 + Math.floor(Math.random() * (dVal - 2));
        } else {
            tVal = 4 + Math.floor(Math.random() * 10);
            dVal = 2 + Math.floor(Math.random() * (tVal - 2));
        }
    } else {
        if (isWin) {
            tVal = 4 + Math.floor(Math.random() * 10);
            dVal = 2 + Math.floor(Math.random() * (tVal - 2));
        } else {
            dVal = 4 + Math.floor(Math.random() * 10);
            tVal = 2 + Math.floor(Math.random() * (dVal - 2));
        }
    }

    setTimeout(() => {
        setDragonCard(dVal);
        playSound('click');
        setTimeout(() => {
            setTigerCard(tVal);
            playSound('click');
            
            setTimeout(() => {
                setStage('result');
                setPlaying(false);
                if (isWin) {
                    setGameResult('win');
                    onWin(bet * multiplier);
                    playSound('win');
                } else {
                    setGameResult('lose');
                    playSound('lose');
                }
            }, 800);
        }, 1000);
    }, 1000);
  };

  const getLabel = (v: number) => RANKS[v - 2];

  return (
    <div className="flex flex-col h-full bg-[#1a0505] text-white font-sans overflow-hidden relative">
      {/* Oriental Silk Background */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1540324155974-7523202daa3f?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-black/80 via-transparent to-black" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/60 border-b border-red-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 transition-all active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-red-500 font-black italic tracking-tighter text-2xl uppercase">Dragon Tiger</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/60">Imperial Edition</span>
        </div>
        <div className="bg-red-500/10 px-4 py-2 rounded-2xl border border-red-500/30 backdrop-blur-xl shadow-inner">
          <span className="text-red-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 space-y-16">
        <div className="flex w-full max-w-4xl justify-between items-center px-10">
            {/* Dragon Side */}
            <div className="flex flex-col items-center gap-6">
                <div className={`w-32 h-48 sm:w-40 sm:h-56 bg-white text-black rounded-2xl shadow-2xl flex flex-col items-center justify-between p-6 border-4 transition-all ${selection === 'dragon' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-black/5'}`}>
                    <AnimatePresence mode="wait">
                        {dragonCard ? (
                            <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="flex flex-col items-center justify-between h-full w-full">
                                <span className="self-start text-4xl font-black text-red-600">{getLabel(dragonCard)}</span>
                                <span className="text-6xl text-red-600">🐉</span>
                                <span className="self-end text-4xl font-black text-red-600 rotate-180">{getLabel(dragonCard)}</span>
                            </motion.div>
                        ) : (
                            <div className="w-full h-full bg-red-900/10 rounded-xl flex items-center justify-center">
                                <span className="text-red-900/20 font-black text-2xl">DRAGON</span>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
                <button 
                  onClick={() => startGame('dragon')}
                  disabled={playing}
                  className={`px-12 py-3 rounded-full border-2 font-black uppercase tracking-widest transition-all ${selection === 'dragon' ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-black/40 border-red-500/30 text-red-500/60 hover:bg-red-500/10'}`}
                >
                    Dragon
                </button>
            </div>

            <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center">
                    <Activity size={32} className="text-white/10 animate-pulse" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/20">VERSUS</span>
            </div>

            {/* Tiger Side */}
            <div className="flex flex-col items-center gap-6">
                <div className={`w-32 h-48 sm:w-40 sm:h-56 bg-white text-black rounded-2xl shadow-2xl flex flex-col items-center justify-between p-6 border-4 transition-all ${selection === 'tiger' ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)]' : 'border-black/5'}`}>
                   <AnimatePresence mode="wait">
                        {tigerCard ? (
                            <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="flex flex-col items-center justify-between h-full w-full">
                                <span className="self-start text-4xl font-black text-orange-600">{getLabel(tigerCard)}</span>
                                <span className="text-6xl text-orange-600">🐯</span>
                                <span className="self-end text-4xl font-black text-orange-600 rotate-180">{getLabel(tigerCard)}</span>
                            </motion.div>
                        ) : (
                            <div className="w-full h-full bg-orange-900/10 rounded-xl flex items-center justify-center">
                                <span className="text-orange-900/20 font-black text-2xl">TIGER</span>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
                <button 
                  onClick={() => startGame('tiger')}
                  disabled={playing}
                  className={`px-12 py-3 rounded-full border-2 font-black uppercase tracking-widest transition-all ${selection === 'tiger' ? 'bg-orange-600 border-orange-400 text-white shadow-lg' : 'bg-black/40 border-orange-500/30 text-orange-500/60 hover:bg-orange-500/10'}`}
                >
                    Tiger
                </button>
            </div>
        </div>

        {/* Global Result Overlay */}
        <AnimatePresence>
            {gameResult && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-center z-50 pointer-events-none">
                    <div className={`text-8xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] ${gameResult === 'win' ? 'text-yellow-400' : 'text-white/20'}`}>
                        {gameResult === 'win' ? 'YOU WIN!' : 'YOU LOSE'}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center justify-between bg-black/60 p-4 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
                <button onClick={() => setBet(Math.max(minBet, bet - 10))} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">-</button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block mb-1">STAKE</span>
                    <span className="text-3xl font-black italic tracking-tight font-mono">RS {bet}</span>
                </div>
                <button onClick={() => setBet(bet + 10)} className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">+</button>
            </div>
        </div>
      </div>
    </div>
  );
};
