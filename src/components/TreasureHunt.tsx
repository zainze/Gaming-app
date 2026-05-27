import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, LogOut, Sparkles, Coins, HelpCircle, Shield, RotateCcw, AlertCircle, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { playSound } from "../lib/sounds";

interface TreasureHuntProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

export const TreasureHunt: React.FC<TreasureHuntProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 35,
  minBet = 10,
  multiplier = 3
}) => {
  const [bet, setBet] = useState(minBet);
  const [gameState, setGameState] = useState<"idle" | "scanning" | "revealed">("idle");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [chests, setChests] = useState<("win" | "loss" | null)[]>([null, null, null]);
  const [statusMsg, setStatusMsg] = useState("Configure your ante & touch a chest to scan for gold!");
  const [shake, setShake] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePick = async (index: number) => {
    if (gameState !== "idle" || revealing) return;

    if (balance < bet) {
      triggerShake();
      playSound("error");
      setStatusMsg("Insufficient Balance! Choose a smaller coin chip.");
      return;
    }

    setRevealing(true);
    setStatusMsg("Decrypting locks... Scanning chamber structure!");
    playSound("click");

    const success = await onBet(bet);
    if (!success) {
      playSound("error");
      setRevealing(false);
      return;
    }

    setGameState("scanning");
    setSelectedIdx(index);

    // Simulated scanner timing
    setTimeout(() => {
      const isWin = Math.random() * 100 < winRate;
      const finalChests = [null, null, null] as ("win" | "loss" | null)[];
      finalChests[index] = isWin ? "win" : "loss";

      // Fill secondary unselected chests with random logical outcome
      for (let i = 0; i < 3; i++) {
        if (i !== index) {
          finalChests[i] = Math.random() < 0.45 ? "win" : "loss";
        }
      }

      setChests(finalChests);
      setGameState("revealed");
      setRevealing(false);

      if (isWin) {
        playSound("win");
        onWin(bet * multiplier);
        setStatusMsg(`EUREKA! Located ancient relic treasures (+RS ${bet * multiplier})!`);
      } else {
        playSound("lose");
        setStatusMsg("Chamber was empty! Vault dust triggered traps.");
      }
    }, 1500);
  };

  const resetGame = () => {
    if (revealing) return;
    setGameState("idle");
    setSelectedIdx(null);
    setChests([null, null, null]);
    setStatusMsg("Locks re-sealed! Touch an unexplored tomb to scan.");
    playSound("chip");
  };

  return (
    <div className={`w-full h-full bg-[#0a0c10] text-[#9EA0A3] font-sans relative flex flex-col overflow-hidden ${shake ? "animate-shake" : ""}`}>
      
      {/* Ancient Aztec Crypt Relic Ambient Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_35%,rgba(217,119,6,0.06),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "100px 100px" }} />
      </div>

      {/* Professional Dashboard Top Bar Navigation */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a0d14] border-b border-[#21160a] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-500 animate-pulse animate-spin-slow" size={20} />
          <span className="text-yellow-500 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Treasure Hunt</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1f1a12] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#111]" />
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

      {/* Main Container Viewport to guarantee zero vertical scrolling */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 flex flex-col justify-between py-4 relative z-10 min-h-0">
        
        {/* Status helper banner */}
        <div className="bg-[#111215]/90 border border-[#231e17] rounded-3xl p-3 text-center flex items-center justify-between shadow-lg shrink-0">
          <div className="text-left">
            <span className="block text-[8px] font-black text-[#a68652] tracking-wider uppercase">TOMBS RADAR SCANNER</span>
            <span className="text-xs font-bold text-white tracking-tight leading-tight">{statusMsg}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl shrink-0">
            <span className="text-[7.5px] font-bold uppercase text-neutral-400">PAYOUT:</span>
            <span className="text-[11px] font-black text-yellow-500">{multiplier}X</span>
          </div>
        </div>

        {/* Dynamic Sand Gaming Floor grid screen */}
        <div className="flex-1 my-3 bg-gradient-to-b from-[#11100e] to-[#070709] rounded-3xl border border-[#2d1f11]/60 shadow-2xl relative flex flex-col justify-center items-center overflow-hidden min-h-[250px]">
          
          <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#eab308]/15">Aztec Vault Glimmers</span>
          </div>

          {/* Core Interactive chests selector floor */}
          <div className="w-full px-4 grid grid-cols-3 gap-3.5 max-w-md relative z-10">
            {[0, 1, 2].map((idx) => {
              const isPicked = idx === selectedIdx;
              const cellState = chests[idx];

              return (
                <div key={idx} className="flex flex-col items-center">
                  <motion.button
                    whileHover={gameState === "idle" && !revealing ? { scale: 1.05, y: -6 } : {}}
                    whileTap={gameState === "idle" && !revealing ? { scale: 0.94 } : {}}
                    onClick={() => handlePick(idx)}
                    disabled={gameState !== "idle" || revealing}
                    className={`relative w-full aspect-[4/5] rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border-2 select-none ${
                      isPicked && gameState === "scanning"
                        ? "border-yellow-400 bg-yellow-500/10 ring-4 ring-yellow-500/10 animate-pulse"
                        : cellState === "win"
                          ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                          : cellState === "loss"
                            ? "border-neutral-800 bg-neutral-900/10 opacity-40 scale-95"
                            : "border-[#2d2216] bg-[#121316] hover:border-yellow-700/60 shadow-lg"
                    }`}
                  >
                    {/* Glowing highlight loop under interactive tombstones */}
                    {gameState === "idle" && (
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/[0.02] to-transparent pointer-events-none group-hover:opacity-100" />
                    )}

                    {/* DYNAMIC CHEST VECTOR SVG RENDER */}
                    <AnimatePresence mode="wait">
                      {isPicked && gameState === "scanning" ? (
                        <motion.div
                          key="scanning"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin flex items-center justify-center p-0.5" />
                          <span className="text-[8px] font-black tracking-widest text-yellow-500/80 animate-pulse uppercase">READING</span>
                        </motion.div>
                      ) : cellState === "win" ? (
                        <motion.div
                          key="win"
                          initial={{ scale: 0.5, y: 15, rotate: -15 }}
                          animate={{ scale: 1, y: 0, rotate: 0 }}
                          className="w-full h-full p-2 flex flex-col items-center justify-center"
                        >
                          <WinChestSVG />
                          {isPicked && (
                            <span className="text-[7px] font-extrabold text-[#32D74B] bg-[#32D74B]/10 px-1.5 py-0.5 rounded uppercase mt-1">
                              YOUR PICK
                            </span>
                          )}
                        </motion.div>
                      ) : cellState === "loss" ? (
                        <motion.div
                          key="loss"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 0.85 }}
                          className="w-full h-full p-2 flex flex-col items-center justify-center"
                        >
                          <LossChestSVG />
                          {isPicked && (
                            <span className="text-[7.5px] font-extrabold text-red-500 bg-red-500/10 px-1 py-0.5 rounded uppercase mt-1">
                              EMPTY
                            </span>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="closed"
                          className="w-full h-full p-2 flex flex-col items-center justify-center relative"
                        >
                          {/* Idle floating effect internally */}
                          <motion.div
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: idx * 0.4
                            }}
                            className="w-full flex justify-center"
                          >
                            <ClosedChestSVG />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              );
            })}
          </div>

          {/* Middle status indicator board when decoded results are show casing */}
          <div className="h-10 mt-1 flex items-center justify-center z-10 w-full">
            {gameState === "revealed" && selectedIdx !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  chests[selectedIdx] === "win"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-[#32D74B]"
                    : "bg-red-500/10 border-red-500/30 text-rose-500"
                }`}
              >
                {chests[selectedIdx] === "win" ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>WIN +RS {bet * multiplier}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    <span>BET DESTROYED</span>
                  </>
                )}
              </motion.div>
            )}
          </div>

        </div>

        {/* BOTTOM ANTE AND MASTER SWITCH CTA */}
        <div className="space-y-3 shrink-0">
          
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#8B8D8F] tracking-wider px-1">
            <span>SELECT RADAR CHIP</span>
            <span className="text-yellow-500">BOOSTER: {multiplier}X</span>
          </div>

          {/* Quick stake coins tray */}
          <div className="flex gap-2.5">
            {[minBet, minBet * 2, minBet * 5, minBet * 10, minBet * 50].map((v) => {
              const active = bet === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={gameState !== "idle" || revealing}
                  onClick={() => {
                    playSound("chip");
                    setBet(v);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase border-2 text-xs flex flex-col items-center justify-center transition-all ${
                    active
                      ? "bg-yellow-500 border-yellow-300 text-neutral-900 shadow-lg shadow-yellow-500/20 -translate-y-[1px]"
                      : "border-white/10 bg-[#121316]/60 text-[#55585b] hover:border-white/20 hover:text-white disabled:opacity-40"
                  }`}
                >
                  <span className="text-[7.5px] font-bold block mb-0.5">CHIP</span>
                  <span className="font-extrabold text-xs">{v}</span>
                </button>
              );
            })}
          </div>

          {/* Main game Action trigger triggers "Play Again / Rebet" seamlessly */}
          <button
            type="button"
            disabled={revealing}
            onClick={() => {
              if (gameState === "revealed") {
                resetGame();
              } else {
                // If IDLE, let player click first chest randomly rather than block
                const rand = Math.floor(Math.random() * 3);
                handlePick(rand);
              }
            }}
            className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-600 font-extrabold text-[#0a110d] rounded-2xl tracking-wider text-sm flex items-center justify-center gap-2 shadow-2xl hover:brightness-115 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {revealing ? (
              <span>GRID DECRYPTING...</span>
            ) : gameState === "revealed" ? (
              <>
                <RotateCcw size={16} className="text-[#0a110d] animate-spin-slow" />
                <span>PLAY AGAIN / REBET (RS {bet})</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>SCAN THE GRID (RS {bet})</span>
              </>
            )}
          </button>

        </div>

      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.1s ease-in-out; }
      `}</style>
    </div>
  );
};

// ======================== HIGH FIDELITY PURE SVG VECTORS ========================

// 1. Closed Royal Aztec Wood & Brass Lockbox
const ClosedChestSVG = () => (
  <svg className="w-14 h-14 object-contain" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Chest main body base shadow */}
    <ellipse cx="50" cy="85" rx="30" ry="6" fill="#000" fillOpacity="0.4" />
    
    {/* Lower box panel */}
    <rect x="18" y="46" width="64" height="34" rx="4" fill="#583412" stroke="#2a1608" strokeWidth="2" />
    <rect x="22" y="50" width="56" height="26" fill="#42250c" />
    
    {/* Brass corner brackets */}
    <rect x="18" y="46" width="8" height="34" fill="#ea580c" />
    <rect x="74" y="46" width="8" height="34" fill="#ea580c" />
    <rect x="18" y="70" width="64" height="10" fill="#ea580c" />

    {/* Upper vault dome structure */}
    <path d="M18 46 C18 20 82 20 82 46 Z" fill="#784318" stroke="#2a1608" strokeWidth="2" />
    
    {/* Gold bands crossing lid */}
    <path d="M26 27 C34 22 40 22 40 46 H34 C34 26 26 28 26 27 Z" fill="#fbbf24" />
    <path d="M60 46 C60 22 66 22 74 27 C74 28 66 26 66 46 Z" fill="#fbbf24" />

    {/* Heavy golden lock core plate */}
    <rect x="42" y="38" width="16" height="18" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    <circle cx="50" cy="45" r="3" fill="#1c1917" />
    <path d="M49 45 L51 45 L52 52 L48 52 Z" fill="#1c1917" />
    
    {/* Brass Studs */}
    <circle cx="22" cy="54" r="1.5" fill="#fef08a" />
    <circle cx="22" cy="74" r="1.5" fill="#fef08a" />
    <circle cx="78" cy="54" r="1.5" fill="#fef08a" />
    <circle cx="78" cy="74" r="1.5" fill="#fef08a" />
  </svg>
);

// 2. Exploded Master Gold Winning Loot Chest
const WinChestSVG = () => (
  <svg className="w-18 h-18 object-contain" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Radial beams of radiant yellow rays behind loot */}
    <g opacity="0.6">
      <path d="M50 40 L30 15 L26 20 Z" fill="#fbbf24" />
      <path d="M50 40 L70 15 L74 20 Z" fill="#fbbf24" />
      <path d="M50 40 L10 35 L12 42 Z" fill="#fbbf24" />
      <path d="M50 40 L90 35 L88 42 Z" fill="#fbbf24" />
      <path d="M50 40 L50 10 H54 Z" fill="#fbbf24" />
    </g>

    {/* Overflowing wealth inside open lid */}
    <circle cx="50" cy="40" r="14" fill="#fbbf24" />
    <circle cx="44" cy="44" r="5" fill="#fcd34d" stroke="#d97706" />
    <circle cx="56" cy="44" r="5" fill="#fcd34d" stroke="#d97706" />
    <circle cx="50" cy="36" r="6" fill="#fcd34d" stroke="#d97706" />
    <circle cx="40" cy="38" r="4" fill="#fef08a" />
    <circle cx="60" cy="38" r="4" fill="#fef08a" />
    
    {/* Lower box base panel */}
    <rect x="18" y="46" width="64" height="34" rx="4" fill="#583412" stroke="#1c1917" strokeWidth="2" />
    <rect x="18" y="46" width="8" height="34" fill="#b45309" />
    <rect x="74" y="46" width="8" height="34" fill="#b45309" />
    
    {/* Lifted lid top segment showing contents inside */}
    <path d="M18 34 C18 10 82 10 82 34 Z" fill="#784318" stroke="#1c1917" strokeWidth="2" transform="translate(0, -10) scale(1, 0.85)" />
    
    {/* Golden locking core plate split */}
    <rect x="42" y="34" width="16" height="10" rx="1" fill="#fbbf24" />

    {/* Sparkles of pure wealth rising from the gold pile */}
    <polygon points="26,24 28,30 34,30 29,34 31,40 26,36 21,40 23,34 18,30 24,30" fill="#fef08a" />
    <polygon points="76,20 78,25 83,25 79,28 81,33 76,30 72,33 74,28 70,25 75,25" fill="#fef08a" />
  </svg>
);

// 3. Open Dust Cracked Trapped Loss Lockbox
const LossChestSVG = () => (
  <svg className="w-14 h-14 object-contain" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cobwebs and grey cracks empty panel */}
    <path d="M30 46 L38 32 M40 38 L54 36" stroke="#4a5568" strokeWidth="1" />
    
    {/* Low-saturation dark mahogany lower box base */}
    <rect x="18" y="46" width="64" height="34" rx="4" fill="#2d1c0e" stroke="#1c1917" strokeWidth="2" />
    <rect x="18" y="46" width="8" height="34" fill="#241407" />
    <rect x="74" y="46" width="8" height="34" fill="#241407" />

    {/* Pitch black emptiness inside the chest vacuum */}
    <rect x="22" y="44" width="56" height="6" fill="#0c0a09" />
    
    {/* Lifeless fallen lid top segment */}
    <path d="M18 34 C18 15 82 15 82 34 Z" fill="#3c2415" stroke="#1c1917" strokeWidth="1.5" transform="translate(0, -12) scale(1, 0.8)" />

    {/* Cobweb in the corner */}
    <path d="M78 46 L68 56 M78 52 L72 56 M72 46 L68 50" stroke="#718096" strokeWidth="1.2" opacity="0.6" />

    {/* Whimsical small dusty cloud bubble */}
    <circle cx="50" cy="42" r="5" fill="#4a5568" fillOpacity="0.4" />
    <circle cx="53" cy="44" r="3" fill="#4a5568" fillOpacity="0.3" />
  </svg>
);
