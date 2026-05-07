import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Plus, Minus, LogOut } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface AviatorProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
}

interface UserBet {
  id: string;
  user: string;
  amount: number;
  multiplier?: number;
  win?: number;
  status: 'pending' | 'cashed' | 'lost';
}

const JET_ICON_URL = "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1777971975/air-force_do6cuq.png";

export const Aviator: React.FC<AviatorProps> = ({ balance, onWin, onBet, onExit }) => {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'running' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([4.02, 1.00, 1.14, 1.20, 6.72, 1.89, 1.04, 1.00]);
  const [crashPoint, setCrashPoint] = useState(0);
  
  const [bet, setBet] = useState({ amount: 1.00, active: false, activeInRound: false, hasFinished: false });
  const [bet2, setBet2] = useState({ amount: 1.00, active: false, activeInRound: false, hasFinished: false });
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'top'>('all');
  const [localBets, setLocalBets] = useState<UserBet[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const generateCrashPoint = () => {
    const r = Math.random();
    if (r < 0.03) return 1.0;
    return Math.max(1.0, 0.98 / (1.0 - Math.random()));
  };

  const startRound = useCallback(() => {
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    setGameState('running');
    setMultiplier(1.00);
    playSound('spin');
    startTimeRef.current = performance.now();

    // Mark current bets as active for this specific round
    setBet(prev => ({ ...prev, activeInRound: prev.active, hasFinished: false }));
    setBet2(prev => ({ ...prev, activeInRound: prev.active, hasFinished: false }));

    const names = ['User_733', 'LuckyPro', 'Zenith', 'PakWinner', 'GoldDigger', 'ShadowBoxer'];
    const newBets: UserBet[] = names.map((name, i) => ({
      id: `social_${Date.now()}_${i}`,
      user: name,
      amount: Math.floor(Math.random() * 50) + 10,
      status: 'pending'
    }));
    setLocalBets(newBets);
  }, []);

  const handleAction = (isPanel2: boolean = false) => {
    const currentBet = isPanel2 ? bet2 : bet;
    const setBetFn = isPanel2 ? setBet2 : setBet;

    if (currentBet.active) {
      // If round is running and user is participating in IT, they can cash out
      if (gameState === 'running' && currentBet.activeInRound) {
        const win = currentBet.amount * multiplier;
        onWin(win);
        playSound('win');
        setBetFn(prev => ({ ...prev, active: false, activeInRound: false, hasFinished: true }));
      } else if (gameState !== 'running') {
        // Can cancel bet if round hasn't started
        setBetFn(prev => ({ ...prev, active: false, activeInRound: false }));
      }
      // If gameState is running but NOT activeInRound, it's a bet for NEXT round, 
      // so clicking button again should just cancel that future bet
      else if (gameState === 'running' && !currentBet.activeInRound) {
        setBetFn(prev => ({ ...prev, active: false }));
      }
    } else {
      // Prevent betting if already finished this specific round
      if (gameState === 'running' && currentBet.hasFinished) return;

      if (balance < currentBet.amount) return;
      onBet(currentBet.amount);
      playSound('click');
      
      // If we bet during waiting/idle, it will be picked up by startRound
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
        const nextMultiplier = Math.pow(1.12, elapsed);
        
        if (nextMultiplier >= crashPoint) {
          stopSound('spin');
          playSound('lose');
          setGameState('crashed');
          setHistory(prev => [crashPoint, ...prev].slice(0, 15));
          
          // Reset round participation. 
          // If they were active in THIS round, they lost, so set active to false.
          // If they were just 'active' (bet for next round), they stay 'active'.
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
        
        if (Math.random() < 0.015) {
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

  const pathD = useMemo(() => {
    const baseX = 50;
    const baseY = 550;
    const x = baseX + (graphProgress * 850 * 0.85);
    const y = baseY - (Math.pow(graphProgress, 1.2) * 450);
    const cpX = baseX + (x - baseX) * 0.4;
    return `M ${baseX} ${baseY} Q ${cpX} ${baseY} ${x} ${y}`;
  }, [graphProgress]);

  const jetPos = useMemo(() => {
    const baseX = 50;
    const baseY = 550;
    const x = baseX + (graphProgress * 850 * 0.85);
    const y = baseY - (Math.pow(graphProgress, 1.2) * 450);
    return { x, y };
  }, [graphProgress]);

  return (
    <div className="flex flex-col h-full bg-[#101112] text-[#9EA0A3] font-sans">
      <header className="grid grid-cols-3 items-center px-4 h-12 bg-[#1B1C1D] border-b border-[#2C2D2E] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#D92121] font-black italic tracking-tighter text-xl uppercase whitespace-nowrap">Aviator Pro</span>
          <div className="w-5 h-5 rounded-full border border-[#494B4D] flex items-center justify-center text-[#9EA0A3] cursor-pointer">
            <span className="text-[10px] font-bold">i</span>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-black rounded-full px-3 py-1 flex items-center gap-2 h-8 border border-[#2C2D2E]">
            <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#141516]" />
            </div>
            <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toFixed(0)}</span>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#D92121]/10 text-[#D92121] rounded-lg border border-[#D92121]/20 active:scale-95 transition-all hover:bg-[#D92121]/20"
          >
            <LogOut size={14} />
            <span className="text-[10px] font-black uppercase">Quit</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 1. History Bar (Fixed) */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#141516] border-b border-[#2C2D2E] h-10 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {history.map((val, idx) => (
              <span key={idx} className={`px-3 py-0.5 rounded-full text-[9px] font-black border transition-all ${val < 2 ? 'text-[#3498db] bg-[#1a2b3c] border-[#3498db]/30' : val < 10 ? 'text-[#9b59b6] bg-[#2a1b3c] border-[#9b59b6]/30' : 'text-[#f1c40f] bg-[#3c361b] border-[#f1c40f]/30'}`}>
                {val.toFixed(2)}x
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#2C2D2E]/50 cursor-pointer">
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#6B6D6F]" />
          </div>
        </div>

        {/* 2. Scrollable Game Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col bg-[#101112]">
          {/* Flight Area */}
          <section className="relative w-full aspect-[16/10] bg-black border-b border-[#141516] overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_rgba(217,33,33,0.15),_transparent_70%)]" />
            
            <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D92121" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#D92121" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g opacity="0.3">
                {[...Array(10)].map((_, i) => (
                  <circle key={i} cx={100 + i * 85} cy="500" r="1.5" fill="#2C2D2E" />
                ))}
              </g>

              {gameState === 'running' && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.path d={pathD} fill="none" stroke="#D92121" strokeWidth="6" strokeLinecap="round" />
                  <motion.path d={`${pathD} L ${jetPos.x} 550 L 50 550 Z`} fill="url(#grad)" />
                  <motion.image href={JET_ICON_URL} width="140" height="140" x={jetPos.x - 70} y={jetPos.y - 70} animate={{ rotate: -(graphProgress * 15) }} />
                </motion.g>
              )}
            </svg>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                {gameState === 'running' && (
                  <motion.div key="mult" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                    <span className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">{multiplier.toFixed(2)}x</span>
                  </motion.div>
                )}
                {gameState === 'crashed' && (
                  <motion.div key="crash" initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-center">
                    <div className="bg-[#D92121] px-10 py-2 rounded-full mb-2"><p className="text-white text-3xl font-black uppercase italic tracking-widest">Flew Away!</p></div>
                    <p className="text-white text-6xl font-black">{multiplier.toFixed(2)}x</p>
                  </motion.div>
                )}
                {gameState === 'waiting' && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-t-[#D92121] border-[#2C2D2E] rounded-full animate-spin" />
                    <div className="text-white text-[12px] font-black uppercase tracking-[0.2em] italic opacity-60">Wait for next round</div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Betting Section (VITAL: Always visible and scrollable) */}
          <div className="px-4 py-4 bg-[#101112] flex flex-col gap-4 items-center flex-shrink-0 min-h-0">
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

          {/* Statistics Section */}
          <section className="bg-[#1B1C1D] rounded-t-[2.5rem] border-t border-[#2C2D2E] flex flex-col p-4 flex-shrink-0 min-h-[400px]">
               <div className="pb-2">
                  <div className="flex bg-[#141516] p-1 rounded-full shadow-inner">
                    {['All Bets', 'My Bets', 'Top'].map((l, i) => {
                      const t = ['all', 'my', 'top'][i] as any;
                      return <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-[#494B4D] text-white shadow-lg' : 'text-[#6B6D6F] hover:text-white'}`}>{l}</button>;
                    })}
                  </div>
               </div>
               
               <div className="px-0 pt-2">
                  <div className="flex justify-between items-center text-[7px] font-black uppercase text-[#6B6D6F] tracking-widest border-b border-[#2C2D2E] pb-2 mb-2">
                     <span className="w-1/3">User</span>
                     <span className="w-1/4 text-right">Bet USD</span>
                     <span className="w-1/4 text-right">Mult</span>
                     <span className="w-1/4 text-right">Cashout</span>
                  </div>
                  <div className="space-y-1.5 pb-10">
                    {localBets.map(b => (
                      <div key={b.id} className={`flex items-center text-[10px] py-2 px-3 rounded-xl border transition-all ${b.status === 'cashed' ? 'bg-[#273523]/50 border-[#32D74B]/20' : 'bg-[#141516]/50 border-transparent'}`}>
                         <div className="w-1/3 flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-[#2C2D2E] flex items-center justify-center text-[9px] font-black text-white">{b.user[0]}</div><span className="truncate text-[#9EA0A3] font-medium">{b.user}</span></div>
                         <div className="w-1/4 text-right font-black text-white">{b.amount.toFixed(2)}</div>
                         <div className="w-1/4 text-right">{b.status === 'cashed' && <span className="px-2 py-0.5 rounded-full font-bold bg-[#3498db]/10 text-[#3498db] border border-[#3498db]/20">{b.multiplier?.toFixed(2)}x</span>}</div>
                         <div className="w-1/4 text-right font-black text-[#32D74B]">{b.status === 'cashed' ? (b.win?.toFixed(2)) : ''}</div>
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
    <div className="bg-[#1B1C1D] p-4 rounded-[1.5rem] border border-[#2C2D2E] space-y-4 shadow-2xl relative overflow-hidden flex flex-col items-stretch">
      <div className="flex justify-center border-b border-[#2C2D2E] -mx-4 pb-2">
         <div className="flex bg-[#141516] p-0.5 rounded-full gap-4 px-6 border border-[#2C2D2E]">
            <span className="text-[10px] font-black uppercase text-white border-b-2 border-[#D92121] pb-0.5">Bet</span>
            <span className="text-[10px] font-black uppercase text-[#6B6D6F]">Auto</span>
         </div>
      </div>

      <div className="space-y-4">
        {/* Top: Controls */}
        <div className="space-y-2">
          <div className="bg-[#141516] border border-[#2C2D2E] rounded-full flex items-center p-1 shadow-inner h-11">
            <button 
              onClick={() => onAmountChange(Math.max(1, data.amount - 1))} 
              disabled={data.active || isFinished}
              className="w-9 h-9 rounded-full border border-[#2C2D2E] flex items-center justify-center text-[#9EA0A3] active:scale-95 bg-[#1B1C1D]/50 disabled:opacity-30"
            >
              <Minus size={16} />
            </button>
            <input 
              type="number" 
              value={data.amount} 
              disabled={data.active || isFinished}
              onChange={(e) => onAmountChange(Number(e.target.value))} 
              className="flex-1 bg-transparent text-center font-black text-white text-xl outline-none disabled:text-[#6B6D6F]" 
            />
            <button 
              onClick={() => onAmountChange(data.amount + 1)} 
              disabled={data.active || isFinished}
              className="w-9 h-9 rounded-full border border-[#2C2D2E] flex items-center justify-center text-[#9EA0A3] active:scale-95 bg-[#1B1C1D]/50 disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex justify-between gap-1.5">
            {[10, 20, 50, 100].map(v => (
              <button 
                key={v} 
                onClick={() => onAmountChange(v)} 
                disabled={data.active || isFinished}
                className="flex-1 bg-[#242526] hover:bg-[#2C2D2E] rounded-xl py-2 text-[10px] font-black text-[#6B6D6F] border border-[#2C2D2E] transition-colors disabled:opacity-30"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom: Action Button */}
        <button 
          onClick={onAction} 
          disabled={(data.active && gameState === 'waiting') || isFinished} 
          className={`w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-black uppercase shadow-xl transition-all active:scale-95 border-b-[5px] ${
            isCashingOut 
              ? 'bg-[#FFB000] border-[#D69200] text-white' 
              : isWaitingForNext
                ? 'bg-[#D92121] border-[#A81A1A] text-white opacity-80'
                : isFinished
                   ? 'bg-[#141516] border-[#2C2D2E] text-[#6B6D6F] cursor-not-allowed'
                   : data.active 
                     ? 'bg-[#D92121] border-[#A81A1A] text-white' 
                     : 'bg-[#28A745] border-[#1E7E34] text-white shadow-green-500/20'
          }`}
        >
          {isCashingOut ? (
            <>
              <span className="text-[12px] opacity-80">CASHOUT</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl leading-none">{(data.amount * multiplier).toFixed(2)}</span>
                <span className="text-[10px] opacity-60">USD</span>
              </div>
            </>
          ) : isWaitingForNext ? (
            <>
              <span className="text-sm opacity-80">WAITING...</span>
              <span className="text-xs leading-none opacity-60">NEXT ROUND</span>
            </>
          ) : isFinished ? (
            <>
              <span className="text-sm">WAIT FOR</span>
              <span className="text-xs">NEXT ROUND</span>
            </>
          ) : (
            <>
              <span className="text-lg leading-none">{data.active ? 'CANCEL' : 'BET'}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl leading-none">{data.amount.toFixed(2)}</span>
                <span className="text-[10px] opacity-60">USD</span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
