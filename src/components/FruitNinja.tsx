import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Zap, Target, Swords, Trophy } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface FruitNinjaProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

const FRUITS = [
  { char: '🍎', color: '#EF4444' },
  { char: '🍊', color: '#F97316' },
  { char: '🍋', color: '#FACC15' },
  { char: '🍉', color: '#22C55E' },
  { char: '🍓', color: '#F43F5E' },
  { char: '🍍', color: '#EAB308' }
];

export const FruitNinja: React.FC<FruitNinjaProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 40, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'ready' | 'active' | 'result'>('ready');
  const [activeFruits, setActiveFruits] = useState<{ id: number; char: string; color: string; x: number; y: number; type: 'fruit' | 'bomb' }[]>([]);
  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [slicedCount, setSlicedCount] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const nextId = useRef(0);
  const splashId = useRef(0);

  const spawnFruit = useCallback((forceBomb = false) => {
    const isBomb = forceBomb || (Math.random() * 100 > winRate && Math.random() > 0.85);
    const fruitType = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const newFruit = {
      id: nextId.current++,
      char: isBomb ? '💣' : fruitType.char,
      color: isBomb ? '#000000' : fruitType.color,
      x: 15 + Math.random() * 70, 
      y: 110,
      type: (isBomb ? 'bomb' : 'fruit') as 'fruit' | 'bomb'
    };
    setActiveFruits(prev => [...prev, newFruit]);
  }, [winRate]);

  const startGame = () => {
    if (balance < bet || playing) return;
    
    onBet(bet);
    setPlaying(true);
    setStage('active');
    setSlicedCount(0);
    setGameResult(null);
    setActiveFruits([]);
    setSplashes([]);
    playSound('click');

    let count = 0;
    const maxFruits = 7;
    
    const interval = setInterval(() => {
      if (count >= maxFruits) {
        clearInterval(interval);
        setTimeout(() => {
          if (playing) {
             setGameResult('win');
             setStage('result');
             onWin(bet * multiplier);
             playSound('win');
             setPlaying(false);
          }
        }, 2500);
        return;
      }
      
      const shouldBeBomb = (count > 2) && (Math.random() * 100 > winRate);
      spawnFruit(shouldBeBomb);
      count++;
    }, 1200); 

    timerRef.current = interval;
  };

  const handleSlice = (id: number, type: 'fruit' | 'bomb', x: number, y: number, color: string) => {
    if (!playing || stage !== 'active') return;

    if (type === 'bomb') {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameResult('lose');
      setStage('result');
      setPlaying(false);
      playSound('mine_boom');
      return;
    }

    // Add splash effect
    const newSplash = { id: splashId.current++, x, y, color };
    setSplashes(prev => [...prev, newSplash]);
    setTimeout(() => {
        setSplashes(prev => prev.filter(s => s.id !== newSplash.id));
    }, 600);

    setActiveFruits(prev => prev.filter(f => f.id !== id));
    setSlicedCount(prev => prev + 1);
    playSound('plink');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1a0f0a] text-white font-sans overflow-hidden relative">
      {/* Ninja Dojo Background */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542324391-2ca29c0f2aef?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      
      {/* Japanese Patterns */}
      <div className="absolute inset-0 z-1 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <header className="flex items-center justify-between px-6 h-20 bg-black/40 border-b border-orange-500/20 backdrop-blur-md shrink-0 z-50">
        <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-xl transition-colors border border-white/5">
          <LogOut size={24} className="text-white/70" />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
                <Swords size={20} className="text-orange-500 animate-pulse" />
                <span className="text-white font-black italic tracking-tighter text-2xl uppercase">Dojo Slasher</span>
            </div>
            <div className="flex gap-1.5 mt-1">
                {[...Array(7)].map((_, i) => (
                    <motion.div 
                        key={i} 
                        initial={false}
                        animate={{ scale: i < slicedCount ? [1, 1.3, 1] : 1 }}
                        className={`w-3 h-1.5 rounded-full ${i < slicedCount ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-white/10'}`} 
                    />
                ))}
            </div>
        </div>

        <div className="bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/30 backdrop-blur-xl">
          <span className="text-orange-400 font-black text-sm tracking-tight uppercase">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative p-6 z-10">
        {/* Splashes */}
        {splashes.map(s => (
            <motion.div
                key={s.id}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 4, opacity: 0 }}
                className="absolute w-16 h-16 rounded-full blur-2xl pointer-events-none"
                style={{ 
                    left: `${s.x}%`, 
                    top: `${s.y}%`, 
                    backgroundColor: s.color,
                    transform: 'translate(-50%, -50%)' 
                }}
            />
        ))}

        {/* Game Area */}
        <div className="absolute inset-0 overflow-hidden cursor-crosshair">
           <AnimatePresence>
              {activeFruits.map((fruit) => (
                <motion.div
                  key={fruit.id}
                  initial={{ y: '110%', x: `${fruit.x}%`, rotate: 0 }}
                  animate={{ y: '-20%', rotate: 720 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (parentRect) {
                        const relX = ((rect.left + rect.width/2 - parentRect.left) / parentRect.width) * 100;
                        const relY = ((rect.top + rect.height/2 - parentRect.top) / parentRect.height) * 100;
                        handleSlice(fruit.id, fruit.type, relX, relY, fruit.color);
                      }
                  }}
                  onTouchStart={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (parentRect) {
                      const relX = ((rect.left + rect.width/2 - parentRect.left) / parentRect.width) * 100;
                      const relY = ((rect.top + rect.height/2 - parentRect.top) / parentRect.height) * 100;
                      handleSlice(fruit.id, fruit.type, relX, relY, fruit.color);
                    }
                  }}
                  className="absolute p-6 text-7xl select-none drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] filter"
                >
                  {fruit.char}
                  {fruit.type === 'bomb' && (
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="absolute inset-0 bg-red-600/20 rounded-full blur-xl -z-10" 
                    />
                  )}
                </motion.div>
              ))}
           </AnimatePresence>
        </div>

        {stage === 'ready' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 z-20"
          >
            <div className="relative">
                <div className="w-40 h-40 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/30 animate-pulse">
                   <Target size={80} className="text-orange-500" />
                </div>
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-orange-500/20 rounded-full scale-125" 
                />
            </div>
            <div>
               <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">Begin Trial</h2>
               <p className="text-orange-500/60 text-sm font-black uppercase tracking-[0.3em] mt-3">Slice 7 fruits • Avoid Bombs • 2x Win</p>
            </div>
          </motion.div>
        )}

        {stage === 'result' && (
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-center space-y-6 z-20 bg-black/60 p-10 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl"
           >
              <div className={`text-7xl font-black italic uppercase tracking-tighter ${gameResult === 'win' ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}>
                 {gameResult === 'win' ? 'YOU WIN!' : 'YOU LOSE'}
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-2xl font-black uppercase tracking-widest text-white/90">
                    {gameResult === 'win' ? `+RS ${bet * multiplier}` : 'BOMB DETONATED'}
                </p>
                <p className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">
                    {gameResult === 'win' ? 'Your blade is unmatched' : 'Focus your spirit'}
                </p>
              </div>
              <button 
                onClick={() => setStage('ready')}
                className="w-full mt-4 h-16 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Trophy size={20} />
                <span>Play Again</span>
              </button>
           </motion.div>
        )}

        {/* Controls */}
        {stage !== 'active' && (
            <div className="mt-auto w-full max-w-sm space-y-6 z-20 pb-10">
                <div className="flex items-center justify-between bg-black/60 p-5 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
                    <button 
                      onClick={() => setBet(Math.max(minBet, bet - 10))} 
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <Minus size={24} />
                    </button>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] block mb-1">STAKE</span>
                        <span className="text-3xl font-black italic tracking-tight">RS {bet}</span>
                    </div>
                    <button 
                      onClick={() => setBet(bet + 10)} 
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <button 
                  onClick={startGame}
                  className="w-full h-20 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-50 hover:to-red-500 rounded-[2rem] font-black italic text-2xl uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/40 active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-orange-800"
                >
                  <Swords size={28} />
                  <span>Enter Dojo</span>
                </button>
            </div>
        )}

        {stage === 'active' && (
            <div className="absolute top-20 text-center animate-bounce">
                <p className="text-[12px] font-black uppercase tracking-[0.6em] text-orange-500/60 drop-shadow-md">SWIPE TO SLICE</p>
            </div>
        )}
      </div>

      {/* Vibe Overlays */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
    </div>
  );
};

