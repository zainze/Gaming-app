import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Moon, Star, Ghost } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface MoonCrashProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
}

interface UserBet {
  id: string;
  user: string;
  amount: number;
  multiplier?: number;
  win?: number;
  status: 'pending' | 'cashed' | 'lost';
}

export const MoonCrash: React.FC<MoonCrashProps> = ({ balance, onWin, onBet, onExit, winRate = 50 }) => {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'running' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([1.12, 12.04, 1.05, 2.10, 1.50, 6.42, 1.00, 1.99]);
  const [crashPoint, setCrashPoint] = useState(0);
  
  const [bet, setBet] = useState({ amount: 10.00, active: false, activeInRound: false, hasFinished: false });
  const [bet2, setBet2] = useState({ amount: 10.00, active: false, activeInRound: false, hasFinished: false });
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
  const [localBets, setLocalBets] = useState<UserBet[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const generateCrashPoint = () => {
    const r = Math.random();
    const houseEdge = (100 - winRate) / 100;
    if (r < (0.04 + houseEdge * 0.15)) return 1.0;
    const point = Math.max(1.0, (1 - houseEdge * 0.08) / (1.0 - Math.random()));
    return Number(point.toFixed(2));
  };

  const startRound = useCallback(() => {
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    setGameState('running');
    setMultiplier(1.00);
    playSound('spin');
    startTimeRef.current = performance.now();

    setBet(prev => ({ ...prev, activeInRound: prev.active, hasFinished: false }));
    setBet2(prev => ({ ...prev, activeInRound: prev.active, hasFinished: false }));

    const names = ['Astro_99', 'LunarBase', 'Apollo_11', 'OrbitMaster', 'GalaxyX', 'StarCoder'];
    const newBets: UserBet[] = names.map((name, i) => ({
      id: `lunar_${Date.now()}_${i}`,
      user: name,
      amount: Math.floor(Math.random() * 200) + 50,
      status: 'pending'
    }));
    setLocalBets(newBets);
  }, [winRate]);

  const handleAction = (isPanel2: boolean = false) => {
    const currentBet = isPanel2 ? bet2 : bet;
    const setBetFn = isPanel2 ? setBet2 : setBet;

    if (currentBet.active) {
      if (gameState === 'running' && currentBet.activeInRound) {
        const win = currentBet.amount * multiplier;
        onWin(win);
        playSound('win');
        setBetFn(prev => ({ ...prev, active: false, activeInRound: false, hasFinished: true }));
      } else if (gameState !== 'running') {
        setBetFn(prev => ({ ...prev, active: false, activeInRound: false }));
      } else if (gameState === 'running' && !currentBet.activeInRound) {
        setBetFn(prev => ({ ...prev, active: false }));
      }
    } else {
      if (gameState === 'running' && currentBet.hasFinished) return;
      if (balance < currentBet.amount) return;
      onBet(currentBet.amount);
      playSound('click');
      setBetFn(prev => ({ ...prev, active: true }));

      if (gameState === 'idle' || gameState === 'crashed') {
        setGameState('waiting');
        setTimeout(startRound, 3000);
      }
    }
  };

  useEffect(() => {
    if (gameState === 'running') {
      const update = (time: number) => {
        const elapsed = (time - startTimeRef.current) / 1000;
        const nextMultiplier = Math.pow(1.10, elapsed); // Slightly slower buildup for "lunar" feel
        
        if (nextMultiplier >= crashPoint) {
          stopSound('spin');
          playSound('lose');
          setGameState('crashed');
          setHistory(prev => [crashPoint, ...prev].slice(0, 15));
          
          setBet(prev => ({ 
            ...prev, 
            active: prev.activeInRound ? false : prev.active,
            activeInRound: false, 
            hasFinished: false 
          }));
          setBet2(prev => ({ 
            ...prev, 
            active: prev.activeInRound ? false : prev.active,
            activeInRound: false, 
            hasFinished: false 
          }));
          
          setLocalBets(prev => prev.map(b => ({ ...b, status: b.status === 'pending' ? 'lost' : b.status })));
          setTimeout(() => setGameState('idle'), 3000);
          return;
        }

        setMultiplier(nextMultiplier);
        
        if (Math.random() < 0.01) {
          setLocalBets(prev => {
            const pending = prev.filter(b => b.status === 'pending');
            if (pending.length === 0) return prev;
            const target = pending[Math.floor(Math.random() * pending.length)];
            return prev.map(b => b.id === target.id ? { 
              ...b, 
              status: 'cashed', 
              multiplier: nextMultiplier, 
              win: b.amount * nextMultiplier 
            } : b);
          });
        }

        requestRef.current = requestAnimationFrame(update);
      };
      requestRef.current = requestAnimationFrame(update);
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        stopSound('spin');
      };
    }
  }, [gameState, crashPoint, onWin]);

  const graphProgress = useMemo(() => {
    return Math.min((multiplier - 1) / 4, 1.2);
  }, [multiplier]);

  const moonPos = useMemo(() => {
    const baseX = 50;
    const baseY = 520;
    const x = baseX + (graphProgress * 850 * 0.95);
    const y = baseY - (Math.pow(graphProgress, 1.2) * 400);
    return { x, y };
  }, [graphProgress]);

  return (
    <div className="flex flex-col h-full bg-[#050608] text-[#9EA0A3] font-sans overflow-hidden">
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a0d14] border-b border-[#1a1f2e] flex-shrink-0 relative z-50">
        <div className="flex items-center gap-2">
          <Moon className="text-yellow-200" size={24} fill="currentColor" />
          <span className="text-white font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Moon Crash</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-4 py-1.5 border border-[#1a1f2e]">
          <span className="text-yellow-400 font-black text-xs leading-none">RS {balance.toFixed(0)}</span>
        </div>

        <button 
          onClick={onExit}
          className="p-2 text-[#D92121] hover:bg-red-500/10 rounded-full transition-all"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#020305] border-b border-[#1a1f2e] h-10 overflow-x-auto scrollbar-hide">
            {history.map((val, idx) => (
              <span key={idx} className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all ${val < 2 ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5' : val < 10 ? 'text-indigo-400 border-indigo-400/20 bg-indigo-400/5' : 'text-pink-500 border-pink-500/20 bg-pink-500/5'}`}>
                {val.toFixed(2)}x
              </span>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#050608] relative">
          {/* Deep Space Canvas Area */}
          <section className="relative w-full aspect-[16/9] bg-[#020305] overflow-hidden flex-shrink-0">
            {/* Twinkling Stars */}
            {[...Array(30)].map((_, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0.1 }}
                animate={{ opacity: [0.1, 0.8, 0.1] }}
                transition={{ repeat: Infinity, duration: Math.random() * 3 + 2 }}
                className="absolute w-0.5 h-0.5 bg-white rounded-full"
                style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
              />
            ))}

            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-blue-900/10 to-transparent" />

            {/* Trailing path */}
            <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full pointer-events-none">
               <defs>
                  <filter id="moon-glow">
                     <feGaussianBlur stdDeviation="5" result="blur" />
                     <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
               </defs>
               {gameState === 'running' && (
                 <g>
                    {/* Simplified path line */}
                    <circle cx={moonPos.x} cy={moonPos.y} r="30" fill="rgba(254, 240, 138, 0.2)" filter="url(#moon-glow)" />
                    <foreignObject width="60" height="60" x={moonPos.x - 30} y={moonPos.y - 30}>
                       <Moon className="w-full h-full text-yellow-200 drop-shadow-[0_0_10px_rgba(254,240,138,0.8)]" fill="currentColor" />
                    </foreignObject>
                 </g>
               )}
            </svg>

            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {gameState === 'running' && (
                  <motion.div key="mult" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                    <span className="text-8xl font-black text-white/90 font-mono tracking-tighter">{multiplier.toFixed(2)}x</span>
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.5em] mt-1">Gaining Altitude</p>
                  </motion.div>
                )}
                {gameState === 'crashed' && (
                  <motion.div key="crash" initial={{ rotate: 10, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} className="text-center bg-black/80 backdrop-blur-md p-8 rounded-[2rem] border border-red-900/30">
                    <Ghost size={48} className="mx-auto text-red-500 mb-2 animate-bounce" />
                    <p className="text-red-500 text-2xl font-black uppercase tracking-widest mb-1 italic">Lost Connection</p>
                    <p className="text-white text-6xl font-black font-mono">{multiplier.toFixed(2)}x</p>
                  </motion.div>
                )}
                {gameState === 'waiting' && (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Moon size={60} className="text-white/5" fill="currentColor" />
                    </motion.div>
                    <div className="flex gap-1">
                       {[0, 1, 2].map(i => (
                         <motion.div 
                           key={i}
                           animate={{ scaleY: [1, 2, 1] }}
                           transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                           className="w-1 h-3 bg-blue-500 rounded-full"
                         />
                       ))}
                    </div>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.4em]">Next Module Charging</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Interactive UI */}
          <div className="px-6 py-8 flex flex-col gap-8 flex-shrink-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                <BetPanel data={bet} gameState={gameState} multiplier={multiplier} onAction={() => handleAction(false)} onAmountChange={(v: any) => setBet(p => ({ ...p, amount: v }))} />
                <BetPanel data={bet2} gameState={gameState} multiplier={multiplier} onAction={() => handleAction(true)} onAmountChange={(v: any) => setBet2(p => ({ ...p, amount: v }))} />
             </div>
          </div>

          <section className="bg-[#0a0d14] rounded-t-[3rem] border-t border-[#1a1f2e] p-6 flex flex-col min-h-[500px]">
              <div className="flex bg-[#050608] p-1.5 rounded-2xl border border-[#1a1f2e] mb-6">
                 {['Global Feed', 'My Missions'].map((l, i) => (
                   <button key={l} onClick={() => setActiveTab(i === 0 ? 'all' : 'my')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === (i === 0 ? 'all' : 'my') ? 'bg-blue-600 text-white' : 'text-[#495057] hover:text-white'}`}>{l}</button>
                 ))}
              </div>

              <div className="space-y-4 pb-24">
                 {localBets.map(b => (
                   <div key={b.id} className="flex items-center justify-between p-4 bg-[#050608]/50 rounded-2xl border border-[#1a1f2e]">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-500/10">
                            <Star size={14} className="text-blue-400" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-white uppercase">{b.user}</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Stake: RS {b.amount}</p>
                         </div>
                      </div>
                      {b.status === 'cashed' ? (
                        <div className="text-right">
                           <p className="text-green-500 font-black text-sm">+{b.win?.toFixed(0)}</p>
                           <p className="text-[8px] font-black text-green-500/40 uppercase font-mono">{b.multiplier?.toFixed(2)}x</p>
                        </div>
                      ) : b.status === 'lost' ? (
                        <span className="text-[10px] font-black text-red-500/50 uppercase italic">Collapsed</span>
                      ) : (
                        <span className="text-[10px] font-black text-blue-500/50 uppercase animate-pulse">Wait...</span>
                      )}
                   </div>
                 ))}
              </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const BetPanel: React.FC<any> = ({ data, gameState, multiplier, onAction, onAmountChange }) => {
  const isCashingOut = data.activeInRound && gameState === 'running';
  const isActive = data.active;
  const isFinished = data.hasFinished && gameState === 'running';

  return (
    <div className="bg-[#0a0d14] p-6 rounded-[2.5rem] border border-[#1a1f2e] space-y-5 shadow-2xl">
       <div className="flex items-center justify-between bg-[#050608] rounded-2xl p-2 border border-[#1a1f2e]">
          <button onClick={() => onAmountChange(Math.max(10, data.amount - 10))} disabled={isActive} className="w-10 h-10 bg-[#0a0d14] rounded-xl flex items-center justify-center text-white disabled:opacity-20">-</button>
          <div className="text-center">
             <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Amount</p>
             <p className="text-xl font-black text-white font-mono">{data.amount}</p>
          </div>
          <button onClick={() => onAmountChange(data.amount + 10)} disabled={isActive} className="w-10 h-10 bg-[#0a0d14] rounded-xl flex items-center justify-center text-white disabled:opacity-20">+</button>
       </div>

       <div className="grid grid-cols-4 gap-2">
          {[10, 50, 100, 500].map(v => (
            <button key={v} onClick={() => onAmountChange(v)} disabled={isActive} className="py-2.5 rounded-xl border border-[#1a1f2e] text-[10px] font-black text-white/40 hover:bg-white/5 hover:text-white transition-all disabled:opacity-10">{v}</button>
          ))}
       </div>

       <button 
         onClick={onAction}
         className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1 ${
           isCashingOut 
            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-yellow-500/20' 
            : isActive
              ? 'bg-red-600 text-white border-b-4 border-red-800'
              : 'bg-blue-600 text-white border-b-4 border-blue-800'
         }`}
       >
         {isCashingOut ? (
           <>
             <span className="text-xs">Claim Reward</span>
             <span className="text-2xl">{(data.amount * multiplier).toFixed(0)}</span>
           </>
         ) : isActive ? (
           <>
             <span className="text-sm">{gameState === 'running' ? 'Abort Next' : 'Abort'}</span>
             <span className="text-[10px] opacity-60 italic">{data.amount} RS</span>
           </>
         ) : (
           <>
             <span className="text-sm">Initiate</span>
             <span className="text-[10px] opacity-60 italic">{data.amount} RS</span>
           </>
         )}
       </button>
    </div>
  );
};
