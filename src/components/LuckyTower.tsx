import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Sparkles, HelpCircle, Trophy, Coins, Lock, Check, Zap, Flame, Skull } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface LuckyTowerProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  minBet?: number;
}

// Floor multipliers
const MULTIPLIERS = [1.2, 1.8, 2.7, 4.0, 6.0, 9.0, 13.5, 20.0];
const NUM_FLOORS = 8;
const TILES_PER_FLOOR = 3;

// Rocket asset
const ROCKET_IMAGE = "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1777971975/air-force_do6cuq.png";

export const LuckyTower: React.FC<LuckyTowerProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  minBet = 10,
}) => {
  const [bet, setBet] = useState(minBet);
  const [gameState, setGameState] = useState<'idle' | 'climbing' | 'failed' | 'cashed_out'>('idle');
  const [currentFloor, setCurrentFloor] = useState(0); // 0 to 7
  const [history, setHistory] = useState<number[]>([1.8, 13.5, 1.2, 4.0, 1.2, 2.7]);
  const [showHelp, setShowHelp] = useState(false);
  const [towerData, setTowerData] = useState<{
    id: number;
    multiplier: number;
    safeIndices: number[]; // 2 safe indices on each floor
    revealedIndex: number | null;
  }[]>([]);

  // Auto-generate tower data when game starts
  const startClimb = () => {
    if (balance < bet) {
      playSound('lose');
      return;
    }
    if (gameState === 'climbing') return;

    onBet(bet);
    playSound('click');

    const tower = Array.from({ length: NUM_FLOORS }).map((_, fIdx) => {
      // 2 safe tiles, 1 trap tile
      const indices = [0, 1, 2];
      const badIndex = Math.floor(Math.random() * 3);
      const safeIndices = indices.filter(idx => idx !== badIndex);

      return {
        id: fIdx,
        multiplier: MULTIPLIERS[fIdx],
        safeIndices,
        revealedIndex: null,
      };
    });

    setTowerData(tower);
    setCurrentFloor(0);
    setGameState('climbing');
    playSound('spin');
  };

  const selectTile = (floorIdx: number, tileIdx: number) => {
    if (gameState !== 'climbing' || floorIdx !== currentFloor) return;

    const floorData = towerData[floorIdx];
    if (floorData.revealedIndex !== null) return;

    const updatedTower = [...towerData];
    updatedTower[floorIdx] = {
      ...floorData,
      revealedIndex: tileIdx,
    };
    setTowerData(updatedTower);

    const isSafe = floorData.safeIndices.includes(tileIdx);

    if (isSafe) {
      playSound('mine_gem');
      
      if (currentFloor === NUM_FLOORS - 1) {
        // Peak Reached!
        const finalPayout = bet * MULTIPLIERS[NUM_FLOORS - 1];
        onWin(finalPayout);
        setGameState('cashed_out');
        setHistory(prev => [MULTIPLIERS[NUM_FLOORS - 1], ...prev].slice(0, 10));
        playSound('win');
      } else {
        setCurrentFloor(prev => prev + 1);
      }
    } else {
      // Failed climb
      playSound('mine_boom');
      setGameState('failed');
      const finalRecordedMultiplier = currentFloor === 0 ? 1.0 : MULTIPLIERS[currentFloor - 1];
      setHistory(prev => [finalRecordedMultiplier, ...prev].slice(0, 10));
    }
  };

  const handleCashOut = () => {
    if (gameState !== 'climbing' || currentFloor === 0) return;

    const activeMultiplier = MULTIPLIERS[currentFloor - 1];
    const winPayout = bet * activeMultiplier;
    onWin(winPayout);
    setGameState('cashed_out');
    setHistory(prev => [activeMultiplier, ...prev].slice(0, 10));
    playSound('win');
  };

  const updateBetAmount = (val: number) => {
    if (gameState === 'climbing') return;
    setBet(Math.max(minBet, Number(val.toFixed(0))));
  };

  const currentMultiplier = currentFloor === 0 ? 1.0 : MULTIPLIERS[currentFloor - 1];
  const nextMultiplier = MULTIPLIERS[currentFloor] || MULTIPLIERS[NUM_FLOORS - 1];

  return (
    <div className="flex flex-col h-full bg-[#08070d] text-[#9EA0A3] font-sans relative overflow-hidden select-none">
      
      {/* Theme Decorative Background Grid pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-[radial-gradient(circle_at_50%_0%,_rgba(147,51,234,0.08)_0%,_rgba(236,72,153,0.04)_50%,_transparent_100%)]" />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Aviator-Styled Master Header with identical proportions & colors as Slipper */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a0614] border-b border-[#22133a] relative z-20 shrink-0 shadow-xl">
        <div className="flex items-center gap-2">
          <Zap className="text-purple-400 fill-purple-400 animate-pulse -rotate-12" size={18} />
          <span className="text-white font-extrabold italic tracking-tight text-lg uppercase bg-gradient-to-r from-purple-400 via-pink-500 to-amber-300 bg-clip-text text-transparent">
            NEON ASCENT
          </span>
        </div>
        
        {/* Real-time Green Balance Indicator */}
        <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 border border-[#22133a] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#32D74B] flex items-center justify-center shadow-[0_0_10px_rgba(50,215,75,0.4)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0a0614]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none font-mono">RS {balance.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { playSound('click'); setShowHelp(true); }}
            className="p-2 bg-[#2d1b4e]/30 border border-[#432371] hover:bg-[#2d1b4e]/60 rounded-xl transition active:scale-95 text-purple-300"
          >
            <HelpCircle size={16} />
          </button>
          
          <button 
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 active:scale-95 transition-all hover:bg-red-500/20 shadow"
          >
            <LogOut size={13} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Multiplier History Ribbon */}
      <div className="h-10 bg-black/40 border-b border-[#1b1c24]/50 flex items-center px-4 gap-2 overflow-x-auto scrollbar-none shrink-0 relative z-10 font-mono">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest whitespace-nowrap mr-2 border-r border-white/5 pr-2">History</span>
        {history.map((val, idx) => (
          <span 
            key={idx} 
            className={`px-3 py-0.5 rounded-full text-[10px] font-black tracking-tight border shadow-sm ${
              val < 2.0 
                ? 'text-[#3498db] bg-[#3498db]/10 border-[#3498db]/15' 
                : val < 10.0 
                ? 'text-[#9b59b6] bg-[#9b59b6]/10 border-[#9b59b6]/15' 
                : 'text-amber-400 bg-amber-500/10 border-amber-500/15'
            }`}
          >
            {val.toFixed(1)}x
          </span>
        ))}
      </div>

      {/* Responsive interactive stage — scroll on mobile, sticky on desktop */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden relative z-10 p-3 gap-3">
        
        {/* Left Aspect: Climb visualization & rocket telemetry (compact h-32 on mobile!) */}
        <div className="h-32 md:h-auto md:flex-1 bg-[#0f0e13] border border-[#22133a]/30 rounded-2xl p-3 flex flex-col relative overflow-hidden shadow-xl justify-between shrink-0">
          
          {/* Decorative radar lines */}
          <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute bottom-0 left-0 w-full h-[1px] bg-white" style={{ bottom: `${i * 25}%` }} />
            ))}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute top-0 left-0 h-full w-[1px] bg-white" style={{ left: `${i * 25}%` }} />
            ))}
          </div>

          {/* Current multiplier flight stats */}
          <div className="absolute top-3 left-3 z-10 flex flex-col pointer-events-none">
            <span className="text-[7.5px] font-mono font-black text-zinc-500 tracking-widest uppercase">Rocket Elevation</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl md:text-4xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
                {currentMultiplier.toFixed(1)}
              </span>
              <span className="text-md font-black text-purple-400">x</span>
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 text-right pointer-events-none">
            <span className="text-[7.5px] font-mono font-black text-zinc-500 tracking-widest uppercase block">Next Tier</span>
            <span className="text-xs md:text-sm font-black text-emerald-400 font-mono">{nextMultiplier.toFixed(1)}x</span>
          </div>

          {/* Flying rocket cockpit stage */}
          <div className="flex-1 relative flex items-end justify-center z-10 min-h-[60px] md:min-h-[140px]">
            
            {/* Height track path */}
            <div className="absolute inset-y-4 md:inset-y-8 left-6 md:left-10 w-1 bg-purple-500/20 rounded-full">
              <motion.div 
                className="w-full bg-purple-400 rounded-full" 
                style={{ height: `${(currentFloor / (NUM_FLOORS - 1)) * 100}%` }}
                layoutId="altitudeLine"
              />
            </div>

            {/* Jet handle */}
            <motion.div 
              className="absolute flex flex-col items-center"
              style={{ bottom: `${5 + (currentFloor / NUM_FLOORS) * 75}%` }}
              animate={{ 
                y: gameState === 'climbing' ? [0, -3, 0] : 0,
                scale: gameState === 'failed' ? [1, 1.25, 0] : 1
              }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            >
              {gameState === 'failed' && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 2.5, opacity: [1, 0] }}
                  className="w-6 h-6 rounded-full bg-purple-600 absolute -top-4 z-20 pointer-events-none flex items-center justify-center"
                >
                  <Skull className="text-white" size={10} />
                </motion.div>
              )}

              {gameState === 'climbing' && (
                <div className="absolute top-10 flex flex-col items-center">
                  <motion.div 
                    animate={{ height: [12, 28, 12], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                    className="w-1.5 bg-gradient-to-b from-purple-400 via-pink-500 to-transparent rounded-full blur-[1px]" 
                  />
                  <Flame size={10} className="text-rose-500 -mt-1 animate-pulse fill-rose-500" />
                </div>
              )}

              <img 
                src={ROCKET_IMAGE} 
                alt="rocket" 
                className={`w-10 h-10 md:w-16 md:h-16 object-contain z-10 transition-transform ${gameState === 'climbing' ? '-rotate-12 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}`}
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Overlay messages */}
            <div className="absolute bottom-1 inset-x-0 text-center pointer-events-none select-none">
              <AnimatePresence mode="wait">
                {gameState === 'idle' && (
                  <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-purple-400 animate-pulse">
                    COCKPIT SECURED. LAUNCH ACTIVE
                  </span>
                )}
                {gameState === 'climbing' && (
                  <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-emerald-400 animate-pulse">
                    VERTICAL ROCKET CRUISE CURRENT
                  </span>
                )}
                {gameState === 'failed' && (
                  <span className="text-[9px] font-black tracking-wide uppercase text-red-500 font-mono">
                    ROCKET FLIGHT DAMAGED / SHUTDOWN
                  </span>
                )}
                {gameState === 'cashed_out' && (
                  <span className="text-[9px] font-black tracking-wide uppercase text-emerald-400 font-mono">
                    ALTITUDE PAYOUT TRANSACTED
                  </span>
                )}
              </AnimatePresence>
            </div>
            
          </div>
        </div>

        {/* Right Aspect: Ascending climb grid matrix & control pads */}
        <div className="w-full md:w-[340px] flex flex-col gap-3 shrink-0">
          
          {/* Choice Grid Matrix */}
          <div className="bg-[#0f0e13] border border-[#22133a]/30 p-3 rounded-2xl flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#22133a]/20 mb-2">
              <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Ascent Choice Matrix</span>
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Floor 8 = Peak</span>
            </div>

            {/* Floors container */}
            <div className="space-y-1 max-h-[220px] md:max-h-none overflow-y-auto pr-0.5 scrollbar-thin">
              {Array.from({ length: NUM_FLOORS }).map((_, rIdx) => {
                const floorIdx = NUM_FLOORS - 1 - rIdx;
                const isFloorActive = gameState === 'climbing' && floorIdx === currentFloor;
                const isFloorPassed = gameState === 'climbing' && floorIdx < currentFloor;
                const floorData = towerData[floorIdx];

                return (
                  <div 
                    key={floorIdx}
                    className={`flex items-center justify-between p-1 rounded-xl transition-all border ${
                      isFloorActive 
                        ? 'bg-[#220f3e]/40 border-purple-500/30' 
                        : isFloorPassed
                        ? 'bg-purple-950/5 border-purple-950/15 opacity-60'
                        : 'bg-[#121118]/40 border-transparent opacity-40'
                    }`}
                  >
                    {/* Badge */}
                    <div className="flex items-center gap-1.5 w-14">
                      <span className="text-[8px] font-black font-mono text-[#6B6D6F]">F{floorIdx + 1}</span>
                      <span className={`text-[9px] font-mono font-black px-1 rounded ${
                        isFloorActive 
                          ? 'bg-purple-500 text-white' 
                          : isFloorPassed 
                          ? 'bg-purple-950/30 text-purple-400' 
                          : 'bg-[#18171f] text-zinc-500'
                      }`}>
                        {MULTIPLIERS[floorIdx]}x
                      </span>
                    </div>

                    {/* 3 Interactive Grid Tiles */}
                    <div className="flex-1 grid grid-cols-3 gap-1.5 max-w-[180px] mx-auto">
                      {Array.from({ length: TILES_PER_FLOOR }).map((_, tileIdx) => {
                        const isRevealed = floorData?.revealedIndex === tileIdx;
                        
                        let tileBg = 'bg-[#18171f] border-zinc-800';
                        let labelComponent = <Lock size={10} className="text-zinc-700 opacity-40" />;

                        if (gameState === 'climbing') {
                          if (isFloorActive) {
                            tileBg = 'bg-gradient-to-b from-[#2d1b4e] to-[#120a1f] border-purple-500/40 cursor-pointer hover:border-purple-400 active:scale-95 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
                            labelComponent = <span className="text-[8px] font-black text-purple-300">TAP</span>;
                          } else if (isFloorPassed && isRevealed) {
                            tileBg = 'bg-emerald-500/10 border-emerald-500/30';
                            labelComponent = <Check size={11} className="text-emerald-400 stroke-[3]" />;
                          }
                        } else if (gameState === 'failed') {
                          if (floorIdx === currentFloor && isRevealed) {
                            tileBg = 'bg-red-500/20 border-red-500/50';
                            labelComponent = <Skull size={11} className="text-red-400 animate-pulse" />;
                          } else if (floorData && floorData.safeIndices.includes(tileIdx)) {
                            tileBg = 'bg-zinc-800/10 border-transparent opacity-20';
                            labelComponent = <Check size={10} className="text-zinc-600" />;
                          }
                        } else if (gameState === 'cashed_out') {
                          if (floorIdx < currentFloor && isRevealed) {
                            tileBg = 'bg-emerald-500/15 border-emerald-500/20';
                            labelComponent = <Check size={11} className="text-emerald-400 stroke-[3]" />;
                          }
                        }

                        return (
                          <div
                            key={tileIdx}
                            onClick={() => selectTile(floorIdx, tileIdx)}
                            className={`h-7 rounded-lg border flex items-center justify-center transition-all ${tileBg}`}
                          >
                            {labelComponent}
                          </div>
                        );
                      })}
                    </div>

                    {/* Status marker */}
                    <div className="w-10 text-right pr-1">
                      {isFloorActive && (
                        <span className="text-[6.5px] font-mono bg-purple-600 text-white font-bold px-0.5 rounded animate-pulse">
                          PLAY
                        </span>
                      )}
                      {isFloorPassed && (
                        <Check size={10} className="text-emerald-400 inline stroke-[3]" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Stake Panel */}
          <div className="bg-[#0f0e13] border border-[#22133a]/30 p-4 rounded-3xl flex flex-col gap-3 shadow-xl">
            
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-black uppercase text-zinc-400">Bet cost wager</span>
              <span className="text-[8px] font-mono text-purple-400">MIN RS {minBet}</span>
            </div>

            {/* Input with Plus/Minus controls */}
            <div className="bg-black/40 border border-[#22133a]/30 rounded-full flex items-center p-1 shadow-inner h-11">
              <button 
                onClick={() => updateBetAmount(bet - 10)} 
                disabled={gameState === 'climbing'}
                className="w-9 h-9 rounded-full border border-[#22133a]/30 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Minus size={13} />
              </button>
              <input 
                type="number" 
                value={bet} 
                disabled={gameState === 'climbing'}
                onChange={(e) => updateBetAmount(Number(e.target.value))} 
                className="flex-1 bg-transparent text-center font-black text-white text-md outline-none disabled:text-zinc-600 font-mono" 
              />
              <button 
                onClick={() => updateBetAmount(bet + 10)} 
                disabled={gameState === 'climbing'}
                className="w-9 h-9 rounded-full border border-[#22133a]/30 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* multipliers shortcuts */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Half', action: () => updateBetAmount(bet / 2) },
                { label: 'Double', action: () => updateBetAmount(bet * 2) },
                { label: '+50', action: () => updateBetAmount(bet + 50) },
                { label: '+100', action: () => updateBetAmount(bet + 100) },
              ].map((btn, bIdx) => (
                <button
                  key={bIdx}
                  disabled={gameState === 'climbing'}
                  onClick={btn.action}
                  className="bg-[#18112b] hover:bg-[#25173f] rounded-xl py-2 text-[9px] font-black text-purple-300 border border-purple-500/10 transition-all disabled:opacity-20 cursor-pointer active:scale-95"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Action launcher */}
            {gameState !== 'climbing' ? (
              <button
                onClick={startClimb}
                disabled={balance < bet}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition duration-150 active:scale-95 border-b-[4px] shadow-lg ${
                  balance < bet 
                    ? 'bg-red-500/10 border-red-500/20 text-rose-500/50 cursor-not-allowed'
                    : 'bg-[#2fb84e] hover:brightness-110 text-white border-green-800 shadow-green-500/10 cursor-pointer'
                }`}
              >
                {balance < bet ? 'INSUFFICIENT FUNDS' : 'START ASCENT CLIMB'}
              </button>
            ) : (
              <button
                onClick={handleCashOut}
                disabled={currentFloor === 0}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition duration-150 active:scale-95 flex flex-col items-center justify-center border-b-[4px] ${
                  currentFloor === 0
                    ? 'bg-zinc-800/40 border-zinc-900 text-zinc-600 cursor-not-allowed'
                    : 'bg-[#ffb01f] hover:brightness-110 text-white border-amber-700 shadow-amber-500/10 cursor-pointer'
                }`}
              >
                <span className="leading-none text-[11px]">CASH OUT</span>
                {currentFloor > 0 && (
                  <span className="text-[9px] font-semibold mt-0.5 opacity-90 font-mono">
                    RS {(bet * MULTIPLIERS[currentFloor - 1]).toFixed(1)} ({MULTIPLIERS[currentFloor - 1]}x)
                  </span>
                )}
              </button>
            )}
            
          </div>
          
        </div>

      </div>

      {/* Outcome panels overlay */}
      <AnimatePresence>
        {gameState === 'failed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <div className="bg-[#180a0a] border border-red-500/20 p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl relative">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Skull size={24} className="animate-bounce" />
              </div>
              <span className="text-[8px] font-mono text-red-400 font-extrabold tracking-widest block uppercase">CRITICAL SYSTEM ERROR</span>
              <h3 className="text-md font-black text-white uppercase italic tracking-tight mt-1">ELEVATION BREACHED</h3>
              <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                You chose a locked sector block. Your rocket suffered engine lock default and your cargo of <b className="text-white">RS {bet}</b> exploded.
              </p>
              <button 
                onClick={() => { playSound('click'); setGameState('idle'); }}
                className="mt-5 w-full py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                DEPLOY NEXT ROCKET
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'cashed_out' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <div className="bg-[#0b1c11] border border-emerald-500/20 p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl relative">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy size={24} className="text-emerald-400 animate-pulse" />
              </div>
              <span className="text-[8px] font-mono text-emerald-400 font-extrabold tracking-widest block uppercase">CREDIT SECURED</span>
              <h3 className="text-md font-black text-white uppercase italic tracking-tight mt-1">MISSION CLEAR</h3>
              <p className="text-[10px] text-zinc-300 mt-2 leading-relaxed">
                You completed altitude docking at <b className="text-[#32D74B] font-mono">{currentMultiplier.toFixed(1)}x</b> multiplication level.
              </p>
              <div className="bg-black/60 border border-white/5 py-2 px-4 rounded-xl mt-3 inline-block">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">TOTAL REWARD</span>
                <span className="text-xl font-black text-[#32D74B] font-mono">RS {(bet * currentMultiplier).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => { playSound('click'); setGameState('idle'); }}
                className="mt-5 w-full py-2.5 bg-emerald-500 hover:bg-[#4fe36c] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 font-sans"
              >
                NEXT RUN DEPLOY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules dialog */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm bg-[#110a24] border border-purple-500/20 rounded-3xl p-6 text-left space-y-4"
            >
              <h3 className="text-lg font-black uppercase text-white tracking-widest">How to ascension climb</h3>
              <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p>1. Enter your preferred stake size using standard input controls.</p>
                <p>2. Tap <b>START ASCENT CLIMB</b> to launch the rocket at lowest floor (Floor 1).</p>
                <p>3. Tap 1 of the 3 tiles on the active highlighted floor row.</p>
                <p>4. <b>2 tiles are Safe</b> (advances altitude and unlocks next tier) and <b>1 is a Trap</b> (explodes rocket, loses wager!).</p>
                <p>5. At any active level, press <b>CASH OUT</b> to secure accumulated tier multiplier rewards safely.</p>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-purple-500/15">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Floors Multipliers Grid</span>
                <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-center text-zinc-400">
                  {MULTIPLIERS.map((mul, idx) => (
                    <div key={idx} className="bg-white/5 py-1 rounded">
                      <span className="block text-[8px] text-zinc-500">F{idx+1}</span>
                      <span className="text-[#32D74B] font-bold">{mul}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { playSound('click'); setShowHelp(false); }}
                className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest cursor-pointer active:scale-95"
              >
                GOT IT
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
