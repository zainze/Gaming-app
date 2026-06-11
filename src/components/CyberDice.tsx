import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, Coins, Sparkles, Volume2, VolumeX, Shield, Camera, MapPin, Activity, Check, Loader2 } from "lucide-react";
import { playSound, stopSound } from "../lib/sounds";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface CyberDiceProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

// Map each face value to standard 3D transforms
const faceRotations: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },         // Front
  2: { x: 0, y: 180 },       // Back
  3: { x: 0, y: -90 },       // Right
  4: { x: 0, y: 90 },        // Left
  5: { x: -90, y: 0 },       // Top
  6: { x: 90, y: 0 }         // Bottom
};

function White3DDie({ rotation }: { rotation: { x: number; y: number; z: number } }) {
  const cubeStyle: React.CSSProperties = {
    position: 'relative',
    width: '64px',
    height: '64px',
    transformStyle: 'preserve-3d',
    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
    transition: 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
  };

  // Modern luxury polished white-resin look with realistic inner borders and shadows
  const faceStyleBase = "absolute w-full h-full bg-gradient-to-br from-white via-neutral-100 to-neutral-200 border border-neutral-300 rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.18),_0_3px_6px_rgba(0,0,0,0.15)] p-2.5 flex flex-col justify-between items-center";

  return (
    <div style={cubeStyle}>
      {/* FACE 1 (Front - crimson classic casino dot inside) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateY(0deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-700 to-red-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),_0_0_4px_rgba(239,68,68,0.3)]" />
        </div>
      </div>

      {/* FACE 2 (Back) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateY(180deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-x-0 inset-y-0 p-2.5 flex flex-col justify-between">
          <div className="flex justify-between w-full">
            <div className="w-3 h-3 rounded-full bg-neutral-800 shadow-inner" />
            <div className="w-3 h-3 rounded-full opacity-0" />
          </div>
          <div className="flex justify-between w-full mt-auto">
            <div className="w-3 h-3 rounded-full opacity-0" />
            <div className="w-3 h-3 rounded-full bg-neutral-800 shadow-inner" />
          </div>
        </div>
      </div>

      {/* FACE 3 (Right) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateY(90deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-x-0 inset-y-0 p-2.5 flex flex-col justify-between">
          <div className="flex justify-start w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
          </div>
          <div className="flex justify-center w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
          </div>
          <div className="flex justify-end w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
          </div>
        </div>
      </div>

      {/* FACE 4 (Left) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateY(-90deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-x-0 inset-y-0 p-2 flex flex-col justify-between">
          <div className="flex justify-between w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
          </div>
          <div className="flex justify-between w-full mt-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
          </div>
        </div>
      </div>

      {/* FACE 5 (Top) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateX(90deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-x-0 inset-y-0 p-2 flex flex-col justify-between">
          <div className="flex justify-between w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
          </div>
          <div className="flex justify-center w-full -my-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
          </div>
          <div className="flex justify-between w-full">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/90 shadow-inner" />
          </div>
        </div>
      </div>

      {/* FACE 6 (Bottom) */}
      <div 
        className={faceStyleBase}
        style={{ transform: 'rotateX(-90deg) translateZ(32px)', backfaceVisibility: 'hidden' }}
      >
        <div className="absolute inset-x-0 inset-y-0 p-2 flex justify-between h-full">
          <div className="flex flex-col justify-between h-full py-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
          </div>
          <div className="flex flex-col justify-between h-full py-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shadow-inner" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CyberDice({
  onWin,
  onBet,
  balance,
  onExit,
  minBet = 10,
  winRate = 48,
  multiplier = 2
}: CyberDiceProps) {
  const [bet, setBet] = useState(minBet);
  const [spinning, setSpinning] = useState(false);
  
  // Independent rotations for realistic raw 3D tumble angles
  const [dice1Rotation, setDice1Rotation] = useState({ x: 12, y: 35, z: -10 });
  const [dice2Rotation, setDice2Rotation] = useState({ x: -18, y: -42, z: 15 });
  
  // Prediction: LOW (2-6), MID (7), HIGH (8-12)
  const [prediction, setPrediction] = useState<"low" | "mid" | "high">("low");
  
  // States
  const [rolledValueSum, setRolledValueSum] = useState<number | null>(null);
  const [diceValues, setDiceValues] = useState<{ d1: number; d2: number } | null>(null);
  const [resultState, setResultState] = useState<{ won: boolean; payout: number } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Firestore parameters
  const [gameConfig, setGameConfig] = useState<any>({
    winRate: winRate,
    minBet: minBet,
    multiplier: multiplier
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", "cyber_dice"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameConfig((prev: any) => ({
          ...prev,
          ...data
        }));
        if (data.minBet && bet < data.minBet) {
          setBet(data.minBet);
        }
      }
    });
    return () => unsub();
  }, []);

  const playLocalSound = (key: 'click' | 'win' | 'lose' | 'spin' | 'plink' | 'success') => {
    if (soundEnabled) {
      playSound(key);
    }
  };

  const handleAdjustBet = (amount: number) => {
    playLocalSound('click');
    const limit = gameConfig.minBet || minBet;
    setBet(prev => Math.min(balance, Math.max(limit, prev + amount)));
  };

  const handleRollDice = async () => {
    if (spinning || balance < bet) return;

    const success = await onBet(bet);
    if (!success) return;

    setSpinning(true);
    setResultState(null);
    setRolledValueSum(null);
    setDiceValues(null);
    playLocalSound('spin');

    // Simulate authentic chaotic multi-axis tumbling loop
    let count = 0;
    const interval = setInterval(() => {
      setDice1Rotation(prev => ({
        x: prev.x + (Math.random() * 110 + 60),
        y: prev.y + (Math.random() * 110 + 60),
        z: prev.z + (Math.random() * 80 + 30)
      }));
      setDice2Rotation(prev => ({
        x: prev.x - (Math.random() * 110 + 60),
        y: prev.y - (Math.random() * 110 + 60),
        z: prev.z - (Math.random() * 80 + 30)
      }));
      playLocalSound('plink');
      count++;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      stopSound('spin');

      // Odds Check corresponding to high/low parameters & admin controls
      const activeWinRate = gameConfig.winRate || winRate;
      const willWin = Math.random() * 100 < activeWinRate;

      // Group totals according to ranges
      // LOW: 2-6, MID: 7, HIGH: 8-12
      let outcomeSum = 7;
      
      const getSumForCondition = (isWinning: boolean, pred: "low" | "mid" | "high"): number => {
        const lowSums = [2, 3, 4, 5, 6];
        const midSums = [7];
        const highSums = [8, 9, 10, 11, 12];
        
        let winningCollection: number[] = [];
        let losingCollection: number[] = [];

        if (pred === "low") {
          winningCollection = lowSums;
          losingCollection = [...midSums, ...highSums];
        } else if (pred === "mid") {
          winningCollection = midSums;
          losingCollection = [...lowSums, ...highSums];
        } else {
          winningCollection = highSums;
          losingCollection = [...lowSums, ...midSums];
        }

        const pool = isWinning ? winningCollection : losingCollection;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      outcomeSum = getSumForCondition(willWin, prediction);

      // Distribute the total sum across two 6-sided dice (values 1 to 6)
      let d1 = 1;
      let d2 = 1;

      // Get all possible valid dice combinations for the outcomeSum
      const combos: Array<[number, number]> = [];
      for (let i = 1; i <= 6; i++) {
        for (let j = 1; j <= 6; j++) {
          if (i + j === outcomeSum) {
            combos.push([i, j]);
          }
        }
      }

      if (combos.length > 0) {
        const chosen = combos[Math.floor(Math.random() * combos.length)];
        d1 = chosen[0];
        d2 = chosen[1];
      }

      setDiceValues({ d1, d2 });
      setRolledValueSum(outcomeSum);

      // Snap to perfect alignment with extreme natural revolutions
      const dest1 = faceRotations[d1];
      const dest2 = faceRotations[d2];

      setDice1Rotation({
        x: dest1.x + 1080,
        y: dest1.y + 1080,
        z: 360
      });
      setDice2Rotation({
        x: dest2.x - 1080,
        y: dest2.y - 1080,
        z: -360
      });

      // Calculate exact multiplier based on chosen zone
      let targetMultiplier = gameConfig.multiplier || multiplier || 2;
      if (prediction === "mid") {
        targetMultiplier = gameConfig.multiplier_mid || 5; // Mid value 7 delivers 5.0x
      }

      const gameWon = (prediction === "low" && outcomeSum <= 6) ||
                      (prediction === "mid" && outcomeSum === 7) ||
                      (prediction === "high" && outcomeSum >= 8);

      const totalPayout = gameWon ? Math.floor(bet * targetMultiplier) : 0;

      setTimeout(() => {
        setSpinning(false);
        setResultState({
          won: gameWon,
          payout: totalPayout
        });

        if (gameWon) {
          playLocalSound('success');
          onWin(totalPayout);
        } else {
          playLocalSound('lose');
        }
      }, 400);

    }, 1800);
  };

  return (
    <div id="cyber_dice_view" className="flex flex-col h-full bg-[#030614] text-white font-sans overflow-hidden relative select-none">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-x-0 top-0 h-[30%] bg-[radial-gradient(circle_at_50%_0%,_rgba(147,51,234,0.12)_0%,_transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 opacity-40" />
      </div>

      {/* Header bar - Responsive compact style */}
      <header id="cyber_dice_header" className="flex items-center justify-between px-4 h-14 bg-[#090b1c]/95 border-b border-purple-500/10 relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-400 animate-pulse" size={16} />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 font-black tracking-tight text-sm uppercase">
            3D CASINO DICE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="cyber_dice_sound_btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg border border-white/5 transition"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          <div id="cyber_dice_balance_badge" className="flex items-center gap-1.5 bg-black/55 rounded-full px-3 py-1 border border-purple-500/20 shadow-lg">
            <Coins className="text-yellow-400 animate-spin-slow" size={12} />
            <span className="text-emerald-400 font-extrabold text-[11px] font-mono">
              RS {balance.toLocaleString()}
            </span>
          </div>

          <button
            id="cyber_dice_close"
            onClick={onExit}
            className="flex items-center justify-center px-3 py-1 bg-red-500/10 text-rose-400 hover:text-rose-300 rounded-lg border border-red-500/20 transition-all font-black uppercase text-[9px] tracking-wider"
          >
            CLOSE
          </button>
        </div>
      </header>

      {/* Main viewport - Sized strictly to fit one screen with absolutely no scrolling */}
      <main id="cyber_dice_gameplay" className="flex-1 flex flex-col items-center justify-center p-3 relative z-10 overflow-hidden">
        <div className="w-full max-w-xs flex flex-col items-center justify-center space-y-4">
          
          {/* THE 3D INTERACTIVE ROLLING DICE CONTAINER (Compact size) */}
          <div className="relative w-full h-36 flex items-center justify-center select-none shrink-0 perspective-[1000px] gap-8">
            {/* Ambient neon radial glow */}
            <div className={`absolute w-44 h-24 rounded-full filter blur-[25px] opacity-25 transition-all duration-700 ${
              spinning 
                ? "bg-purple-600 scale-110" 
                : resultState?.won 
                ? "bg-emerald-500 scale-125" 
                : resultState 
                ? "bg-red-500 scale-95" 
                : "bg-purple-800 scale-100"
            }`} />

            {/* Realistic Casino Green Felt Plate Shadow */}
            <div className="absolute bottom-1 w-56 h-3.5 bg-purple-500/10 border border-purple-500/15 rounded-full rotate-x-[80deg] filter blur-[1px]" />

            {/* DIE 1 */}
            <div className="relative transform-style-preserve-3d">
              <White3DDie rotation={dice1Rotation} />
            </div>

            {/* DIE 2 */}
            <div className="relative transform-style-preserve-3d">
              <White3DDie rotation={dice2Rotation} />
            </div>
          </div>

          {/* COMPACT DECISION ENGINE (Designed to have no scroll) */}
          <div id="cyber_dice_controls" className="w-full bg-[#0b0c1e] border border-purple-500/10 rounded-2xl p-3.5 shadow-xl space-y-3 shrink-0">
            
            {/* Prediction Zones Selector: LOW (2-6), MID (7), HIGH (8-12) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="cyber_dice_select_low"
                disabled={spinning}
                onClick={() => {
                  playLocalSound('click');
                  setPrediction("low");
                }}
                className={`py-2 rounded-xl border-2 font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  prediction === "low"
                    ? "bg-purple-600/20 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10"
                    : "bg-white/5 border-transparent text-white/50 hover:bg-white/10"
                }`}
              >
                <span className="text-[10px] tracking-wider">LOW (2-6)</span>
                <span className="text-[8px] font-mono opacity-60">Payout {gameConfig.multiplier || multiplier || 2}x</span>
              </button>

              <button
                id="cyber_dice_select_mid"
                disabled={spinning}
                onClick={() => {
                  playLocalSound('click');
                  setPrediction("mid");
                }}
                className={`py-2 rounded-xl border-2 font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  prediction === "mid"
                    ? "bg-amber-600/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10 text-glow"
                    : "bg-white/5 border-transparent text-white/50 hover:bg-white/10"
                }`}
              >
                <span className="text-[10px] tracking-wider text-amber-300">MID (7)</span>
                <span className="text-[8px] font-mono text-amber-400 opacity-90">Payout {gameConfig.multiplier_mid || 5}x</span>
              </button>

              <button
                id="cyber_dice_select_high"
                disabled={spinning}
                onClick={() => {
                  playLocalSound('click');
                  setPrediction("high");
                }}
                className={`py-2 rounded-xl border-2 font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  prediction === "high"
                    ? "bg-purple-600/20 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10"
                    : "bg-white/5 border-transparent text-white/50 hover:bg-white/10"
                }`}
              >
                <span className="text-[10px] tracking-wider">HIGH (8-12)</span>
                <span className="text-[8px] font-mono opacity-60">Payout {gameConfig.multiplier || multiplier || 2}x</span>
              </button>
            </div>

            {/* Stake Amount setup - Simple Row layout */}
            <div className="flex bg-black/45 border border-purple-500/15 rounded-xl p-1.5 items-center justify-between">
              <button
                id="cyber_dice_bet_minus"
                disabled={spinning}
                onClick={() => handleAdjustBet(-50)}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 active:scale-90 text-white flex items-center justify-center rounded-lg text-xs font-black transition cursor-pointer disabled:opacity-30"
              >
                <Minus size={12} />
              </button>
              
              <div className="flex-1 flex flex-col items-center px-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/40 font-bold font-mono">RS</span>
                  <input
                    id="cyber_dice_bet_input"
                    type="number"
                    disabled={spinning}
                    value={bet}
                    min={gameConfig.minBet || minBet}
                    max={balance}
                    onChange={(e) => setBet(Math.min(balance, Math.max(gameConfig.minBet || minBet, Math.floor(parseFloat(e.target.value) || 0))))}
                    className="w-20 bg-transparent text-center font-black text-sm text-purple-300 outline-none select-all"
                  />
                </div>
                <span className="text-[7.5px] font-bold text-white/30 uppercase tracking-widest leading-none mt-0.5">
                  STAKE AMOUNT
                </span>
              </div>

              <button
                id="cyber_dice_bet_plus"
                disabled={spinning}
                onClick={() => handleAdjustBet(50)}
                className="w-8 h-8 bg-white/5 hover:bg-white/10 active:scale-90 text-purple-300 flex items-center justify-center rounded-lg text-xs font-black transition cursor-pointer disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Master Play Actions - Row Layout */}
            <div className="flex gap-2.5">
              <button
                id="cyber_dice_all_in"
                disabled={spinning}
                onClick={() => {
                  playLocalSound('click');
                  setBet(balance);
                }}
                className="px-3.5 bg-[#11132d] hover:bg-purple-950/20 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase text-white/80 transition disabled:opacity-20 active:scale-95 cursor-pointer"
              >
                ALL IN
              </button>

              <button
                id="cyber_dice_roll_btn"
                disabled={spinning || balance < bet}
                onClick={handleRollDice}
                className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                  spinning
                    ? 'bg-purple-900/10 text-purple-500/30 border border-purple-500/10 cursor-not-allowed'
                    : balance < bet
                    ? 'bg-red-500/20 text-rose-400 border border-red-500/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:brightness-110 text-white shadow-lg shadow-purple-500/15'
                }`}
              >
                {spinning ? "ROLLING..." : "ROLL DICE"}
              </button>
            </div>
          </div>

          {/* DYNAMIC COMPACT RESULTS INLINE */}
          <div className="h-[76px] w-full relative shrink-0">
            <AnimatePresence mode="wait">
              {resultState && rolledValueSum !== null && diceValues && (
                <motion.div
                  id="cyber_dice_outcome_pnl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute inset-0 border rounded-2xl p-3 flex items-center justify-between shadow-lg backdrop-blur-md ${
                    resultState.won
                      ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-950/25 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black tracking-widest uppercase opacity-60">Result Outcome</span>
                    <span className="text-sm font-black italic uppercase leading-tight mt-0.5">
                      Rolled {rolledValueSum} &nbsp;<span className="text-xs font-mono font-medium not-italic text-white/50">({diceValues.d1} + {diceValues.d2})</span>
                    </span>
                    <span className="text-[10px] font-medium font-mono text-white/80 mt-1">
                      {resultState.won ? (
                        <>Correct! Payout <span className="text-yellow-400 font-extrabold">RS {resultState.payout.toLocaleString()}</span></>
                      ) : (
                        "No match. Try again!"
                      )}
                    </span>
                  </div>

                  <button
                    id="cyber_dice_outcome_ok"
                    onClick={() => setResultState(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider transition border border-white/5 cursor-pointer"
                  >
                    OK
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </div>
  );
}
