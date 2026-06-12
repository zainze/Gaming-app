import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Sparkles, HelpCircle, Trophy, Coins, RefreshCw } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface LuckyScratchProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
}

interface ScratchSymbol {
  id: number;
  name: string;
  label: string;
  icon: string;
  multiplier: number;
  color: string;
  shadow: string;
}

const SYMBOLS: ScratchSymbol[] = [
  { id: 1, name: 'diamond', label: '10x Diamond', icon: '💎', multiplier: 10, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/25', shadow: 'shadow-cyan-500/10' },
  { id: 2, name: 'crown', label: '5x Crown', icon: '👑', multiplier: 5, color: 'text-amber-400 bg-amber-950/40 border-amber-500/25', shadow: 'shadow-amber-500/10' },
  { id: 3, name: 'clover', label: '3x Clover', icon: '🍀', multiplier: 3, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/25', shadow: 'shadow-emerald-500/10' },
  { id: 4, name: 'coin', label: '2x Coin', icon: '🪙', multiplier: 2, color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/25', shadow: 'shadow-yellow-500/10' },
  { id: 5, name: 'cherry', label: '1.5x Cherry', icon: '🍒', multiplier: 1.5, color: 'text-rose-400 bg-rose-950/40 border-rose-500/25', shadow: 'shadow-rose-500/10' },
];

const LOSE_SYMBOL = { id: 6, name: 'skull', label: 'Dust', icon: '❌', multiplier: 0, color: 'text-zinc-500 bg-zinc-950/40 border-zinc-500/10', shadow: 'shadow-zinc-500/5' };

// Individual Canvas Cell Component for rich physical scratch rendering
interface ScratchCanvasCellProps {
  symbol: ScratchSymbol;
  scratched: boolean;
  onScratchComplete: () => void;
  gameState: 'idle' | 'ready' | 'scratching' | 'completed';
}

const ScratchCanvasCell: React.FC<ScratchCanvasCellProps> = ({
  symbol,
  scratched,
  onScratchComplete,
  gameState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullyRevealed, setFullyRevealed] = useState(false);

  // Synchronize with bulk actions like "Quick Scratch All"
  useEffect(() => {
    if (scratched) {
      setFullyRevealed(true);
    } else {
      setFullyRevealed(false);
    }
  }, [scratched]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || fullyRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 110;
    const height = 110;
    canvas.width = width;
    canvas.height = height;

    // Draw luxury metallic gold scratch-off pattern
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#e5c060'); 
    gradient.addColorStop(0.25, '#fcfaeb'); 
    gradient.addColorStop(0.5, '#b88b2d'); 
    gradient.addColorStop(0.75, '#f7eaa6'); 
    gradient.addColorStop(1, '#8c6414'); 

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Grid pattern for texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += 12) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#8c6414';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);

    // LOGO "SCRATCH!"
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#3a2002';
    ctx.font = 'black uppercase 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH!', width / 2, height / 2 - 8);
    ctx.restore();

    // Glitter emoji icon
    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨', width / 2, height / 2 + 10);
    ctx.restore();
  }, [fullyRevealed]);

  const checkScratchedPercentage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    
    let transparentCount = 0;
    const totalPixels = width * height;
    // Walk through and sample 120 nodes swiftly
    const sampleStep = Math.max(1, Math.floor(totalPixels / 120));
    for (let i = 3; i < data.length; i += sampleStep * 4) {
      if (data[i] === 0) {
        transparentCount++;
      }
    }
    const totalSamples = data.length / (sampleStep * 4);
    return transparentCount / totalSamples;
  };

  const revealCell = () => {
    setFullyRevealed(true);
    onScratchComplete();
  };

  const startScratching = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'scratching' || fullyRevealed) return;
    isDrawingRef.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    scratch(e);
  };

  const endScratching = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (checkScratchedPercentage(canvas, ctx) > 0.30) {
          revealCell();
        }
      }
    }
  };

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || fullyRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (Math.random() < 0.12) {
      playSound('chip');
    }

    const pct = checkScratchedPercentage(canvas, ctx);
    if (pct > 0.35) {
      revealCell();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative aspect-square w-full h-full rounded-2xl overflow-hidden select-none touch-none border border-white/5 shadow-inner"
    >
      {/* Background Revealed Content */}
      <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300 ${
        fullyRevealed ? `${symbol.color} ${symbol.shadow} border-white/10` : 'bg-zinc-950/80 border-transparent'
      }`}>
        {fullyRevealed ? (
          <motion.div 
            initial={{ scale: 0.3, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            className="flex flex-col items-center justify-center"
          >
            <span className="text-3xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] mb-1">{symbol.icon}</span>
            <span className="text-[8px] font-black font-mono tracking-wider text-purple-200/90 uppercase">{symbol.name}</span>
          </motion.div>
        ) : (
          <span className="text-xl font-bold font-mono text-white/5 animate-pulse">?</span>
        )}
      </div>

      {/* Foreground Interactive Canvas Foil overlay */}
      <AnimatePresence>
        {!fullyRevealed && (
          <motion.canvas
            ref={canvasRef}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.25 }}
            onPointerDown={startScratching}
            onPointerUp={endScratching}
            onPointerCancel={endScratching}
            onPointerMove={scratch}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none rounded-2xl"
          />
        )}
      </AnimatePresence>
    </div>
  );
};


export const LuckyScratch: React.FC<LuckyScratchProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 45,
  minBet = 10,
}) => {
  const [bet, setBet] = useState(minBet);
  const [gameState, setGameState] = useState<'idle' | 'ready' | 'scratching' | 'completed'>('idle');
  const [cardGrid, setCardGrid] = useState<{ symbol: any; scratched: boolean }[]>([]);
  const [scratchedCount, setScratchedCount] = useState(0);
  const [gameResult, setGameResult] = useState<{ isWin: boolean; payout: number; winningSymbolName?: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const buyCard = () => {
    if (balance < bet || gameState === 'scratching') {
      playSound('lose');
      return;
    }

    onBet(bet);
    playSound('spin');

    // Generate Card Grid: 6 nodes
    const isWinOutcome = Math.random() * 100 < winRate;
    let grid: any[] = [];

    if (isWinOutcome) {
      // Choose winning symbol
      const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      // Include exactly 3 matching symbols
      for (let i = 0; i < 3; i++) {
        grid.push({ ...winSymbol });
      }
      // Fill remainder safely
      const nonWinningPool = SYMBOLS.filter(s => s.name !== winSymbol.name).concat(LOSE_SYMBOL as any);
      while (grid.length < 6) {
        const rand = nonWinningPool[Math.floor(Math.random() * nonWinningPool.length)];
        const count = grid.filter(g => g.name === rand.name).length;
        if (count < 2) {
          grid.push({ ...rand });
        }
      }
    } else {
      // Guaranteed lose: Ensure NO symbol appears 3 times
      while (grid.length < 6) {
        const rand = SYMBOLS.concat(LOSE_SYMBOL as any)[Math.floor(Math.random() * (SYMBOLS.length + 1))];
        const count = grid.filter(g => g.name === rand.name).length;
        if (count < 2) {
          grid.push({ ...rand });
        }
      }
    }

    // Shuffle grid
    grid = grid.sort(() => Math.random() - 0.5).map((symbol) => ({
      symbol,
      scratched: false,
    }));

    setCardGrid(grid);
    setScratchedCount(0);
    setGameResult(null);
    setGameState('scratching');
  };

  const handleCellScratchComplete = (idx: number) => {
    if (gameState !== 'scratching') return;

    const newGrid = [...cardGrid];
    if (newGrid[idx].scratched) return;
    newGrid[idx].scratched = true;
    setCardGrid(newGrid);

    const nextCount = scratchedCount + 1;
    setScratchedCount(nextCount);
    playSound('click');

    // Check if 6 tiles are revealed
    if (nextCount === 6) {
      evaluateOutcome(newGrid);
    }
  };

  const scratchAll = () => {
    if (gameState !== 'scratching') return;

    const newGrid = cardGrid.map(item => ({ ...item, scratched: true }));
    setCardGrid(newGrid);
    setScratchedCount(6);
    playSound('spin');

    setTimeout(() => {
      evaluateOutcome(newGrid);
    }, 350);
  };

  const evaluateOutcome = (grid: { symbol: any; scratched: boolean }[]) => {
    const counts: Record<string, number> = {};
    let winningSym: any = null;

    grid.forEach(item => {
      const name = item.symbol.name;
      counts[name] = (counts[name] || 0) + 1;
      if (counts[name] >= 3 && name !== 'skull') {
        winningSym = item.symbol;
      }
    });

    if (winningSym) {
      const payout = bet * winningSym.multiplier;
      onWin(payout);
      setGameResult({
        isWin: true,
        payout,
        winningSymbolName: winningSym.label,
      });
      playSound('win');
    } else {
      setGameResult({
        isWin: false,
        payout: 0,
      });
      playSound('lose');
    }

    setGameState('completed');
  };

  const adjustBet = (amount: number) => {
    if (gameState === 'scratching') return;
    setBet(prev => Math.max(minBet, prev + amount));
  };

  return (
    <div className="flex flex-col h-full bg-[#07050e] text-[#9EA0A3] font-sans relative overflow-hidden select-none">
      
      {/* Immersive Dark Vegas Casino Backdrop Wallpaper */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center brightness-[0.22] saturate-[1.4] blur-[3px]"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07050e] via-transparent to-[#07050e]/95" />
      </div>

      {/* Aviator-Styled Master Header - Exact design consistency with Slipper */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0c0819] border-b border-[#2d1b4e] relative z-20 shrink-0 shadow-xl">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-400 fill-amber-400 animate-pulse" size={20} />
          <span className="text-amber-400 font-extrabold italic tracking-tight text-lg uppercase bg-gradient-to-r from-amber-400 via-rose-500 to-purple-400 bg-clip-text text-transparent">
            GOLD SCRATCH
          </span>
        </div>
        
        {/* Real-time Green Balance Indicator */}
        <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 border border-[#2d1b4e] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#32D74B] flex items-center justify-center shadow-[0_0_10px_rgba(50,215,75,0.4)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0c0819]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { playSound('click'); setShowHelp(true); }}
            className="p-2 sm:px-3 bg-[#2d1b4e]/30 border border-[#432371] hover:bg-[#2d1b4e]/60 rounded-xl transition active:scale-95 text-purple-300"
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

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col items-center justify-center space-y-4 relative z-10">
        
        {/* Play HUD Panel */}
        <div className="flex items-center justify-between w-full max-w-sm bg-black/60 border border-[#2d1b4e]/30 rounded-2xl p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-purple-400 animate-bounce" />
            <div className="text-left leading-none">
              <span className="text-[8px] font-semibold text-zinc-500 uppercase block">Ticket Price</span>
              <span className="text-sm font-black text-white font-mono">RS {bet}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
            <div className="text-left leading-none">
              <span className="text-[8px] font-semibold text-zinc-500 uppercase block">Max Winning Multiplier</span>
              <span className="text-sm font-black text-amber-400 font-mono">10x payout</span>
            </div>
          </div>
        </div>

        {/* The Scratch Card Grid Component */}
        <div className="w-full max-w-sm bg-gradient-to-br from-[#1b152d] to-[#0c0819] border-2 border-[#432371]/50 rounded-3xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden">
          {/* Sparkle Ambient Gradients */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

          {gameState === 'idle' || gameState === 'ready' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-[#0c0819]/80 backdrop-blur-[3px] transition-all">
              <motion.div 
                animate={{ scale: [1, 1.06, 1], rotate: [0, 5, -5, 0] }} 
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-purple-500/10 mb-4 border border-white/20"
              >
                <Sparkles size={24} className="text-white fill-white/10" />
              </motion.div>
              <h3 className="text-sm font-black uppercase text-white tracking-widest mb-1.5">Purchase Scratch Ticket</h3>
              <p className="text-[10px] text-zinc-400 max-w-[220px] leading-relaxed">
                Unlock gold layout using your stake. Rub off nodes to match 3 identical symbols for huge payouts!
              </p>
            </div>
          ) : null}

          {/* Interactive Core Scratch Card Slots Grid */}
          <div className="grid grid-cols-3 gap-3 flex-1 relative min-h-[220px]">
            {gameState !== 'idle' && gameState !== 'ready' && cardGrid.map((item, idx) => (
              <ScratchCanvasCell
                key={idx}
                symbol={item.symbol}
                scratched={item.scratched}
                onScratchComplete={() => handleCellScratchComplete(idx)}
                gameState={gameState}
              />
            ))}

            {/* Inactive Pre-stage Blocks */}
            {(gameState === 'idle' || gameState === 'ready') && Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="aspect-square rounded-2xl bg-[#0d0716] border border-purple-950 flex flex-col items-center justify-center text-zinc-800">
                <span className="text-xs font-mono font-bold opacity-30">?</span>
              </div>
            ))}
          </div>

          {/* Card status footer */}
          <div className="mt-4 border-t border-[#2d1b4e]/30 pt-3 flex items-center justify-between shrink-0">
            <span className="text-[8px] font-mono tracking-wider text-purple-400 uppercase">Interactive Gold Series</span>
            
            {gameState === 'scratching' && (
              <span className="text-[9px] font-mono text-zinc-400">
                Rubbed off nodes: <b className="text-amber-400 font-black">{scratchedCount}/6</b>
              </span>
            )}

            {gameState === 'completed' && gameResult && (
              <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                gameResult.isWin ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-zinc-500 bg-zinc-950'
              }`}>
                {gameResult.isWin ? `Win RS ${gameResult.payout.toFixed(0)}` : 'No match rounds'}
              </span>
            )}
          </div>
        </div>

        {/* Quick reveal help control */}
        {gameState === 'scratching' && (
          <button 
            onClick={scratchAll}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-white flex items-center gap-1.5 cursor-pointer hover:brightness-110"
          >
            <RefreshCw size={11} className="animate-spin-slow" />
            Instant Reveal Card
          </button>
        )}

        {/* Win/Loss Transacted Notification Block */}
        <AnimatePresence>
          {gameState === 'completed' && gameResult && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm border p-4 rounded-3xl flex items-center justify-between shadow-2xl relative overflow-hidden ${
                gameResult.isWin ? 'bg-[#0f1d13] border-emerald-500/30 text-white' : 'bg-[#151012] border-red-500/10 text-zinc-500'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-mono tracking-widest text-[#65E902] block uppercase font-bold">VERIFIED TICKET RESULT</span>
                {gameResult.isWin ? (
                  <>
                    <h3 className="text-sm font-black text-white uppercase italic">MATCH 3 REVEALED!</h3>
                    <p className="text-[10px] text-zinc-300">
                      Won with <b>{gameResult.winningSymbolName}</b>
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-black text-zinc-400 uppercase italic">CARD NO WIN</h3>
                    <p className="text-[10px] text-zinc-600">Scratch again for lucky matches</p>
                  </>
                )}
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Payout</span>
                <span className={`text-xl font-extrabold ${gameResult.isWin ? 'text-[#32D74B]' : 'text-zinc-600 font-mono'}`}>
                  RS {gameResult.payout.toFixed(0)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stake and Buy Controls Panel */}
        <div className="w-full max-w-sm bg-black/40 border border-[#2d1b4e]/20 rounded-2xl p-4 flex flex-col space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-zinc-400">Select Stake Size</span>
            <span className="text-[9px] font-mono text-purple-400">Min RS {minBet}</span>
          </div>

          {/* Plus/Minus Stake Row */}
          <div className="flex items-center justify-between gap-3 bg-[#0d0a1b] p-1 border border-[#2d1b4e]/30 rounded-xl height-11">
            <button
              onClick={() => adjustBet(-10)}
              disabled={gameState === 'scratching'}
              className="w-10 h-10 rounded-lg bg-[#181131] border border-purple-500/10 hover:bg-purple-900/15 text-purple-300 disabled:opacity-20 cursor-pointer active:scale-95 transition"
            >
              <Minus size={14} />
            </button>

            <div className="flex-1 text-center py-1">
              <span className="text-[8px] font-mono text-zinc-500 block uppercase font-bold">STAKE COST</span>
              <span className="text-sm font-black text-purple-300 font-mono">RS {bet}</span>
            </div>

            <button
              onClick={() => adjustBet(10)}
              disabled={gameState === 'scratching'}
              className="w-10 h-10 rounded-lg bg-[#181131] border border-purple-500/10 hover:bg-purple-900/15 text-purple-300 disabled:opacity-20 cursor-pointer active:scale-95 transition"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Play/Buy Button */}
          <button
            onClick={buyCard}
            disabled={gameState === 'scratching' || balance < bet}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all transform duration-150 text-center shadow-xl ${
              gameState === 'scratching'
                ? 'bg-purple-900/10 text-purple-400/40 border border-purple-500/10 cursor-not-allowed'
                : balance < bet
                ? 'bg-red-500/10 text-rose-500/50 border border-red-500/15 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 hover:brightness-110 text-white cursor-pointer active:scale-95 shadow-purple-500/10'
            }`}
          >
            {balance < bet ? (
              'INSUFFICIENT BALANCE'
            ) : gameState === 'scratching' ? (
              'SCRATCHING CARD IN PROGRESS...'
            ) : (
              'BUY & PLAY NEW CARD'
            )}
          </button>
        </div>

      </div>

      {/* Rules / Tutorial dialog */}
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
              className="w-full max-w-sm bg-[#110a24] border border-purple-500/20 rounded-3xl p-6 text-left space-y-4 shadow-3xl"
            >
              <h3 className="text-lg font-black uppercase text-white tracking-widest">Scratch & Match rules</h3>
              <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p>1. Select your preferred single-card ticket cost at the bottom control bar.</p>
                <p>2. Tap <b>BUY & PLAY NEW CARD</b> to purchase a luxury glitter ticket.</p>
                <p>3. Rub your cursor or touch pointer directly over the gold foil surface to scratch and uncover symbols.</p>
                <p>4. Match <b>3 identical symbols</b> in the same ticket grid to instantly score the multiplier payoff!</p>
                <p>5. Press <b>"Instant Reveal Card"</b> to clear all golden foil pieces instantly.</p>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-purple-500/15">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1.5">Prize Multipliers Table</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                  {SYMBOLS.map(sym => (
                    <div key={sym.id} className="flex items-center gap-1.5 text-zinc-300">
                      <span>{sym.icon}</span>
                      <span className="text-zinc-400">{sym.name}</span>
                      <span className="text-[#32D74B] font-bold ml-auto">{sym.multiplier}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { playSound('click'); setShowHelp(false); }}
                className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 cursor-pointer shadow-lg shadow-purple-500/20"
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
