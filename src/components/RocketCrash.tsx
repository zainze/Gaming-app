import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Plus, Minus, LogOut, Rocket } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface RocketCrashProps {
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

const ROCKET_ICON_URL = "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1777971975/air-force_do6cuq.png"; // Placeholder or use Lucide

export const RocketCrash: React.FC<RocketCrashProps> = ({ balance, onWin, onBet, onExit, winRate = 50 }) => {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'running' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([1.52, 2.00, 1.14, 3.20, 1.72, 1.89, 4.04, 1.00]);
  const [crashPoint, setCrashPoint] = useState(0);
  
  const [bet, setBet] = useState({ amount: 10.00, active: false, activeInRound: false, hasFinished: false });
  const [bet2, setBet2] = useState({ amount: 10.00, active: false, activeInRound: false, hasFinished: false });
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
  const [localBets, setLocalBets] = useState<UserBet[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const generateCrashPoint = () => {
    // Admin control: winRate affects the crash point
    // Lower winRate = higher chance of instant crash or lower multipliers
    const r = Math.random();
    const houseEdge = (100 - winRate) / 100;
    
    // 3% guaranteed instant crash + house edge factor
    if (r < (0.03 + houseEdge * 0.1)) return 1.0;
    
    // Normal distribution but slightly weighted by house edge
    const point = Math.max(1.0, (1 - houseEdge * 0.05) / (1.0 - Math.random()));
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

    const names = ['CryptoWhale', 'RocketBoy', 'MoonWalker', 'SaturnV', 'MarsBase', 'ElonFan'];
    const newBets: UserBet[] = names.map((name, i) => ({
      id: `social_${Date.now()}_${i}`,
      user: name,
      amount: Math.floor(Math.random() * 500) + 100,
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
      }
      else if (gameState === 'running' && !currentBet.activeInRound) {
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
        const nextMultiplier = Math.pow(1.15, elapsed); // Slightly faster than aviator potentially
        
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
        
        if (Math.random() < 0.02) {
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
    return Math.min((multiplier - 1) / 5, 1.2);
  }, [multiplier]);

  const pathD = useMemo(() => {
    const baseX = 50;
    const baseY = 550;
    const x = baseX + (graphProgress * 850 * 0.9);
    const y = baseY - (Math.pow(graphProgress, 1.5) * 500);
    const cpX = baseX + (x - baseX) * 0.5;
    return `M ${baseX} ${baseY} Q ${cpX} ${baseY} ${x} ${y}`;
  }, [graphProgress]);

  const rocketPos = useMemo(() => {
    const baseX = 50;
    const baseY = 550;
    const x = baseX + (graphProgress * 850 * 0.9);
    const y = baseY - (Math.pow(graphProgress, 1.5) * 500);
    return { x, y };
  }, [graphProgress]);

  return (
    <div className="flex flex-col h-full bg-[#0a0b0d] text-[#e1e1e1] font-sans">
      <header className="flex items-center justify-between px-3 h-14 bg-[#14161a] border-b border-[#25282e] flex-shrink-0 relative z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
            <Rocket size={18} fill="currentColor" />
          </div>
          <span className="text-white font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Rocket Crash</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#25282e] shadow-inner">
          <div className="w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-black" />
          </div>
          <span className="text-orange-500 font-bold text-xs leading-none">RS {balance.toFixed(0)}</span>
        </div>

        <button 
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 text-red-500 rounded-lg border border-red-600/20 active:scale-95 transition-all hover:bg-red-600/20"
        >
          <LogOut size={14} />
          <span className="text-[10px] font-black uppercase">Exit</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f1114] border-b border-[#25282e] h-10 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {history.map((val, idx) => (
              <span key={idx} className={`px-3 py-0.5 rounded-full text-[9px] font-black border transition-all ${val < 2 ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : val < 10 ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'}`}>
                {val.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#0a0b0d]">
          <section className="relative w-full aspect-[16/10] bg-black/40 border-b border-[#14161a] overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_rgba(234,88,12,0.1),_transparent_70%)]" />
            
            {/* Stars background */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ 
                  top: `${Math.random() * 100}%`, 
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`
                }} />
              ))}
            </div>

            <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="rocket-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ea580c" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g opacity="0.1">
                {[...Array(11)].map((_, i) => (
                  <line key={i} x1="50" y1={100 + i * 40} x2="950" y2={100 + i * 40} stroke="#25282e" strokeWidth="1" />
                ))}
              </g>

              {gameState === 'running' && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.path d={pathD} fill="none" stroke="#ea580c" strokeWidth="8" strokeLinecap="round" />
                  <motion.path d={`${pathD} L ${rocketPos.x} 550 L 50 550 Z`} fill="url(#rocket-grad)" />
                  
                  {/* Rocket Visual */}
                  <motion.g x={rocketPos.x} y={rocketPos.y} animate={{ rotate: -45 - (graphProgress * 20) }}>
                     <foreignObject width="100" height="100" x={rocketPos.x - 50} y={rocketPos.y - 50}>
                        <div className="w-full h-full flex items-center justify-center text-orange-500 drop-shadow-[0_0_15px_rgba(234,88,12,0.8)]">
                           <Rocket size={60} fill="currentColor" strokeWidth={1} style={{ transform: 'rotate(-45deg)' }} />
                           {/* Flame effect */}
                           <motion.div 
                             animate={{ scale: [1, 1.2, 1] }} 
                             transition={{ repeat: Infinity, duration: 0.1 }}
                             className="absolute bottom-4 left-4 w-6 h-10 bg-orange-600 blur-sm rounded-full origin-top"
                           />
                        </div>
                     </foreignObject>
                  </motion.g>
                </motion.g>
              )}
            </svg>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                {gameState === 'running' && (
                  <motion.div key="mult" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                    <span className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(234,88,12,0.6)]">{multiplier.toFixed(2)}x</span>
                  </motion.div>
                )}
                {gameState === 'crashed' && (
                  <motion.div key="crash" initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-center">
                    <div className="bg-orange-600 px-10 py-2 rounded-2xl mb-2 shadow-xl shadow-orange-600/30">
                      <p className="text-white text-3xl font-black uppercase italic tracking-widest">BOOM! CRASHED</p>
                    </div>
                    <p className="text-white text-6xl font-black">{multiplier.toFixed(2)}x</p>
                  </motion.div>
                )}
                {gameState === 'waiting' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                       <div className="w-16 h-16 border-4 border-t-orange-600 border-white/10 rounded-full animate-spin" />
                       <Rocket className="absolute inset-0 m-auto text-orange-600" size={24} />
                    </div>
                    <div className="text-orange-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Ignition in progress...</div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <div className="px-4 py-6 bg-[#0a0b0d] flex flex-col gap-6 items-center flex-shrink-0">
            <div className="w-full max-w-sm">
              <BetPanel 
                data={bet} 
                gameState={gameState} 
                multiplier={multiplier} 
                onAction={() => handleAction(false)} 
                onAmountChange={(val: number) => setBet(p => ({ ...p, amount: Number(val.toFixed(2)) }))} 
              />
            </div>
            <div className="w-full max-w-sm">
              <BetPanel 
                data={bet2} 
                gameState={gameState} 
                multiplier={multiplier} 
                onAction={() => handleAction(true)} 
                onAmountChange={(val: number) => setBet2(p => ({ ...p, amount: Number(val.toFixed(2)) }))} 
              />
            </div>
          </div>

          <section className="bg-[#14161a] rounded-t-[3rem] border-t border-[#25282e] flex flex-col p-6 flex-shrink-0 min-h-[500px]">
               <div className="pb-4">
                  <div className="flex bg-[#0f1114] p-1 rounded-2xl border border-[#25282e]">
                    {['All Bets', 'My Hub', 'Top'].map((l, i) => {
                      const t = ['all', 'my', 'top'][i] as any;
                      return <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-[#6B6D6F] hover:text-white'}`}>{l}</button>;
                    })}
                  </div>
               </div>
               
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase text-[#6B6D6F] tracking-widest px-2">
                     <span className="w-1/3">Astronaut</span>
                     <span className="w-1/4 text-right">Fuel (RS)</span>
                     <span className="w-1/4 text-right">Target</span>
                     <span className="w-1/4 text-right">Profit</span>
                  </div>
                  <div className="space-y-2 pb-20">
                    {localBets.map(b => (
                      <div key={b.id} className={`flex items-center text-[11px] py-3 px-4 rounded-2xl border transition-all ${b.status === 'cashed' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#0f1114] border-transparent'}`}>
                         <div className="w-1/3 flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-[#25282e] flex items-center justify-center text-[10px] font-black text-white">{b.user[0]}</div><span className="truncate text-white/60 font-black uppercase tracking-tight">{b.user}</span></div>
                         <div className="w-1/4 text-right font-black text-white">{b.amount.toFixed(0)}</div>
                         <div className="w-1/4 text-right">{b.status === 'cashed' && <span className="px-2 py-0.5 rounded-lg font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{b.multiplier?.toFixed(2)}x</span>}</div>
                         <div className="w-1/4 text-right font-black text-green-500">{b.status === 'cashed' ? (b.win?.toFixed(0)) : ''}</div>
                      </div>
                    ))}
                  </div>
               </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const BetPanel: React.FC<any> = ({ data, gameState, multiplier, onAction, onAmountChange }) => {
  const isCashingOut = data.activeInRound && gameState === 'running';
  const isWaitingForNext = data.active && !data.activeInRound && gameState === 'running';
  const isFinished = data.hasFinished && gameState === 'running';

  return (
    <div className="bg-[#14161a] p-5 rounded-[2rem] border border-[#25282e] space-y-4 shadow-2xl relative overflow-hidden flex flex-col items-stretch">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="bg-[#0a0b0d] border border-[#25282e] rounded-2xl flex items-center p-1.5 h-12">
            <button 
              onClick={() => onAmountChange(Math.max(10, data.amount - 10))} 
              disabled={data.active || isFinished}
              className="w-10 h-10 rounded-xl border border-[#25282e] flex items-center justify-center text-white active:scale-95 bg-[#14161a] disabled:opacity-30"
            >
              <Minus size={18} />
            </button>
            <input 
              type="number" 
              value={data.amount} 
              disabled={data.active || isFinished}
              onChange={(e) => onAmountChange(Number(e.target.value))} 
              className="flex-1 bg-transparent text-center font-black text-white text-2xl outline-none disabled:text-[#6B6D6F]" 
            />
            <button 
              onClick={() => onAmountChange(data.amount + 10)} 
              disabled={data.active || isFinished}
              className="w-10 h-10 rounded-xl border border-[#25282e] flex items-center justify-center text-white active:scale-95 bg-[#14161a] disabled:opacity-30"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="flex justify-between gap-2">
            {[10, 50, 100, 500].map(v => (
              <button 
                key={v} 
                onClick={() => onAmountChange(v)} 
                disabled={data.active || isFinished}
                className="flex-1 bg-[#0a0b0d] hover:bg-[#1f2229] rounded-xl py-2.5 text-[10px] font-black text-white border border-[#25282e] transition-colors disabled:opacity-30"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onAction} 
          disabled={(data.active && gameState === 'waiting') || isFinished} 
          className={`w-full py-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 font-black uppercase shadow-xl transition-all active:scale-95 border-b-[6px] ${
            isCashingOut 
              ? 'bg-yellow-500 border-yellow-700 text-black' 
              : isWaitingForNext
                ? 'bg-orange-600 border-orange-800 text-white opacity-80'
                : isFinished
                   ? 'bg-[#0f1114] border-[#25282e] text-[#6B6D6F] cursor-not-allowed'
                   : data.active 
                     ? 'bg-red-600 border-red-800 text-white' 
                     : 'bg-green-600 border-green-800 text-white'
          }`}
        >
          {isCashingOut ? (
            <>
              <span className="text-[14px] leading-tight opacity-80">EJECT (CASHOUT)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl leading-none">{(data.amount * multiplier).toFixed(0)}</span>
                <span className="text-[10px] opacity-60">RS</span>
              </div>
            </>
          ) : isWaitingForNext ? (
            <>
              <span className="text-lg leading-none">STAGED</span>
              <span className="text-[10px] leading-none opacity-60">FOR NEXT FLIGHT</span>
            </>
          ) : isFinished ? (
            <>
              <span className="text-sm">IN FLIGHT...</span>
              <span className="text-xs">STANDBY</span>
            </>
          ) : (
            <>
              <span className="text-2xl leading-none">{data.active ? 'ABORT' : 'COUPLE'}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl leading-none">{data.amount.toFixed(0)}</span>
                <span className="text-[10px] opacity-60">RS</span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
