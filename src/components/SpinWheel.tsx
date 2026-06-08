import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Plus, Minus, Coins, Trophy, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { playSound, stopSound } from "../lib/sounds";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface SpinWheelProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  balance: number;
  onExit: () => void;
  minBet?: number;
  winRate?: number;
  multiplier?: number;
}

interface WheelSegment {
  index: number;
  label: string;
  multiplier: number;
  color: string;
  accentColor: string;
}

export default function SpinWheel({
  onWin,
  onBet,
  balance,
  onExit,
  minBet = 10,
  winRate = 45,
  multiplier = 2
}: SpinWheelProps) {
  const [bet, setBet] = useState(minBet);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [landedSegment, setLandedSegment] = useState<WheelSegment | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin Custom configuration synced directly from games/spin_wheel doc
  const [gameConfig, setGameConfig] = useState<any>({
    winRate: winRate,
    multiplier: multiplier,
    minBet: minBet,
    sliceMultipliers: "0,1.5,0.2,3.0,0,2.0,0.5,10.0",
    sliceLabels: "LOSE,1.5x,0.2x,3x,LOSE,2x,0.5x,JACKPOT"
  });

  const wheelRef = useRef<SVGSVGElement | null>(null);

  // Sound triggers
  const playLocalSound = (key: 'click' | 'win' | 'lose' | 'spin' | 'plink' | 'success') => {
    if (soundEnabled) {
      playSound(key);
    }
  };

  // Live Sync the Game settings directly from Db
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", "spin_wheel"), (snap) => {
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

  // Assemble current 8 slices based on admin settings
  const multipliersArray = (gameConfig.sliceMultipliers || "0,1.5,0.2,3.0,0,2.0,0.5,10.0")
    .split(",")
    .map((v: string) => parseFloat(v) || 0);

  const labelsArray = (gameConfig.sliceLabels || "LOSE,1.5x,0.2x,3x,LOSE,2x,0.5x,JACKPOT")
    .split(",");

  const COLORS = [
    { bg: "#1E222D", text: "#F43F5E", accent: "#E11D48" }, // Red/Dark (Lose)
    { bg: "#8B5CF6", text: "#FFFFFF", accent: "#7C3AED" }, // Purple
    { bg: "#0D9488", text: "#FFFFFF", accent: "#0F766E" }, // Teal/Green
    { bg: "#D97706", text: "#F3F4F6", accent: "#B45309" }, // Golden
    { bg: "#1A1D26", text: "#E2E8F0", accent: "#334155" }, // Neutral Dark
    { bg: "#EC4899", text: "#FFFFFF", accent: "#DB2777" }, // Pink
    { bg: "#2563EB", text: "#FFFFFF", accent: "#1D4ED8" }, // Blue
    { bg: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)", bgHex: "#D97706", text: "#FFD700", accent: "#EF4444" } // Jackpot
  ];

  const segments: WheelSegment[] = Array.from({ length: 8 }).map((_, i) => ({
    index: i,
    label: labelsArray[i % labelsArray.length] || `${multipliersArray[i % multipliersArray.length]}x`,
    multiplier: multipliersArray[i % multipliersArray.length] ?? 0,
    color: COLORS[i % COLORS.length].bgHex || COLORS[i % COLORS.length].bg,
    accentColor: COLORS[i % COLORS.length].accent
  }));

  // Perform Spin
  const spin = async () => {
    if (spinning || balance < bet) return;

    // Trigger Firestore Bet
    const success = await onBet(bet);
    if (!success) return;

    setSpinning(true);
    setShowResult(false);
    setLandedSegment(null);
    playLocalSound('spin');

    const extraRotations = 7 + Math.floor(Math.random() * 4); // 7 to 10 full circles
    const activeWinRate = gameConfig.winRate ?? winRate;

    // Roll result based on winRate
    const roll = Math.random() * 100;
    const shouldWin = roll < activeWinRate;

    let chosenSegmentIndex = 0;
    if (shouldWin) {
      const winningSlices = segments.filter(s => s.multiplier > 1);
      if (winningSlices.length > 0) {
        const sorted = [...winningSlices].sort((a,b) => a.multiplier - b.multiplier);
        const subRoll = Math.random();
        if (subRoll < 0.6) {
          chosenSegmentIndex = sorted[0].index;
        } else if (subRoll < 0.9) {
          chosenSegmentIndex = sorted[Math.min(1, sorted.length - 1)].index;
        } else {
          chosenSegmentIndex = sorted[sorted.length - 1].index;
        }
      } else {
        chosenSegmentIndex = Math.floor(Math.random() * 8);
      }
    } else {
      const losingSlices = segments.filter(s => s.multiplier <= 1);
      if (losingSlices.length > 0) {
        chosenSegmentIndex = losingSlices[Math.floor(Math.random() * losingSlices.length)].index;
      } else {
        chosenSegmentIndex = Math.floor(Math.random() * 8);
      }
    }

    const matchedSegment = segments[chosenSegmentIndex];

    const sliceAngle = 45;
    const centerOffset = (Math.random() * 24) - 12; // visual jitter inside slice
    const destinationAngle = (360 * extraRotations) - (chosenSegmentIndex * sliceAngle) + centerOffset;

    let lastPegSector = -1;
    const startTime = performance.now();
    const duration = 4000;

    const animatePegTicks = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        const progress = 1 - Math.pow(1 - (elapsed / duration), 3); // easeOutCubic
        const currentRotation = progress * destinationAngle;
        const currentSector = Math.floor((currentRotation + 22.5) / 45) % 8;

        if (currentSector !== lastPegSector) {
          playLocalSound('plink');
          lastPegSector = currentSector;
        }
        requestAnimationFrame(animatePegTicks);
      }
    };
    requestAnimationFrame(animatePegTicks);

    setRotation(destinationAngle);

    setTimeout(() => {
      setSpinning(false);
      stopSound('spin');

      setLandedSegment(matchedSegment);
      setShowResult(true);

      const payout = Math.floor(bet * matchedSegment.multiplier);
      if (payout > 0) {
        playLocalSound('success');
        onWin(payout);
      } else {
        playLocalSound('lose');
      }
    }, duration);
  };

  const handleAdjustBet = (amount: number) => {
    playLocalSound('click');
    setBet(prev => Math.min(balance, Math.max(gameConfig.minBet || minBet, prev + amount)));
  };

  return (
    <div className="flex flex-col h-full bg-[#030712] text-white font-sans overflow-hidden relative">
      {/* Premium Ambient Background effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(245,158,11,0.08)_0%,_transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Mini top header bar */}
      <header className="flex items-center justify-between px-6 h-16 bg-[#090d1a]/80 backdrop-blur-md border-b border-white/5 relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-400 animate-bounce" size={18} />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 font-extrabold tracking-tight text-base uppercase">
            LUCKY CORNER SPIN
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sounds toggles */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/5 transition"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* User Cash Balances */}
          <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-1.5 border border-white/10 shadow-md">
            <Coins className="text-yellow-400" size={14} />
            <span className="text-emerald-400 font-black text-xs font-mono">
              RS {balance.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-500/10 text-rose-400 hover:text-rose-300 rounded-xl border border-red-500/20 active:scale-95 transition"
          >
            <span className="text-[10px] font-black uppercase tracking-wider">CLOSE</span>
          </button>
        </div>
      </header>

      {/* Main perfectly nested middle box */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-6">
          
          {/* SPINNING WHEEL STAGE */}
          <div className="relative w-72 h-72 sm:w-85 sm:h-85 flex items-center justify-center select-none shrink-0">
            {/* Outer LED Glowing Edge and Bezel */}
            <div className={`absolute inset-0 rounded-full border-[8px] border-[#0a0f26] shadow-[0_0_50px_rgba(245,158,11,0.25)] flex items-center justify-center`}>
              <div className="absolute -inset-1 rounded-full border border-yellow-400/30 animate-pulse" />
              
              {/* Outer LED peg decorators */}
              {Array.from({ length: 16 }).map((_, idx) => {
                const angle = (idx * 360) / 16;
                return (
                  <div
                    key={idx}
                    className={`absolute w-2 h-2 rounded-full transition-all duration-300 ${
                      spinning 
                        ? (idx % 2 === 0 ? "bg-yellow-400 shadow-[0_0_12px_#fbbf24]" : "bg-red-500 shadow-[0_0_12px_#ef4444]") 
                        : "bg-yellow-500/70"
                    }`}
                    style={{
                      transform: `rotate(${angle}deg) translateY(-138px)`
                    }}
                  />
                );
              })}
            </div>

            {/* Central Top Arrow Indicator pointer */}
            <div className="absolute top-0 z-30 flex flex-col items-center -translate-y-1.5">
              <div className="w-5 h-5 bg-gradient-to-b from-yellow-300 to-red-600 rounded-b-full shadow-lg flex items-center justify-center relative">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-red-600 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            </div>

            {/* SVG Interactive Wheel */}
            <svg
              ref={wheelRef}
              className="w-[90%] h-[90%] relative z-10 transition-transform shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-full border-4 border-[#070b19]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4000ms cubic-bezier(0.1, 0.8, 0.1, 1)" : "none"
              }}
              viewBox="0 0 200 200"
            >
              {segments.map((seg, idx) => {
                const angle = 45;
                const startAngle = idx * angle - 22.5; 
                const endAngle = startAngle + angle;
                
                const rad = Math.PI / 180;
                const x1 = 100 + 100 * Math.cos(startAngle * rad);
                const y1 = 100 + 100 * Math.sin(startAngle * rad);
                const x2 = 100 + 100 * Math.cos(endAngle * rad);
                const y2 = 100 + 100 * Math.sin(endAngle * rad);

                const d = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;

                const labelAngle = startAngle + angle / 2;
                const labelX = 100 + 64 * Math.cos(labelAngle * rad);
                const labelY = 100 + 64 * Math.sin(labelAngle * rad);

                return (
                  <g key={seg.index}>
                    <path
                      d={d}
                      fill={seg.color}
                      className="transition-all hover:brightness-105"
                    />
                    <line
                      x1="100"
                      y1="100"
                      x2={x1}
                      y2={y1}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="0.8"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      fill={seg.multiplier > 1 ? "#FFD700" : "#E2E8F0"}
                      fontSize="7"
                      fontWeight="900"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${labelAngle + 90}, ${labelX}, ${labelY})`}
                      className="font-sans uppercase tracking-tight select-none pointer-events-none"
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}

              {/* Central Metallic Bezel Hub */}
              <circle cx="100" cy="100" r="22" fill="#0c112b" stroke="#facc15" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="15" fill="url(#metallic-grad-sw)" />
              <circle cx="100" cy="100" r="8" fill="#facc15" />
              <circle cx="100" cy="100" r="3" fill="#030712" />

              <defs>
                <radialGradient id="metallic-grad-sw" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="55%" stopColor="#BBBBBB" />
                  <stop offset="100%" stopColor="#444444" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* BET CONFIGURATION & TRIGGER COMPONENT */}
          <div className="w-full bg-[#0d1222] border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            
            {/* Bet decider amount */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block text-center">
                DECIDE BET AMOUNT
              </label>

              <div className="flex bg-black/45 border border-white/10 rounded-2xl p-1.5 items-center justify-between">
                <button
                  disabled={spinning}
                  onClick={() => handleAdjustBet(-50)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 active:scale-90 text-white flex items-center justify-center rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                
                <div className="flex-1 flex flex-col items-center">
                  <input
                    type="number"
                    disabled={spinning}
                    value={bet}
                    min={gameConfig.minBet || minBet}
                    max={balance}
                    onChange={(e) => setBet(Math.min(balance, Math.max(gameConfig.minBet || minBet, Math.floor(parseFloat(e.target.value) || 0))))}
                    className="w-full bg-transparent text-center font-black text-base text-yellow-400 outline-none select-all"
                  />
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                    Enter any amount
                  </span>
                </div>

                <button
                  disabled={spinning}
                  onClick={() => handleAdjustBet(50)}
                  className="w-10 h-10 bg-white/5 hover:bg-white/10 active:scale-90 text-yellow-400 flex items-center justify-center rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Main call to actions */}
            <div className="flex gap-2.5">
              <button
                disabled={spinning}
                onClick={() => {
                  playLocalSound('click');
                  setBet(balance);
                }}
                className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase text-white/80 transition disabled:opacity-20 active:scale-95 cursor-pointer"
              >
                MAX BET
              </button>

              <button
                disabled={spinning || balance < bet}
                onClick={spin}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.150em] text-xs transition duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
                  spinning
                    ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed shadow-none'
                    : balance < bet
                    ? 'bg-red-500/20 text-rose-400 border border-red-500/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:brightness-110 text-black shadow-lg shadow-orange-500/10'
                }`}
              >
                <RefreshCw size={13} className={spinning ? "animate-spin" : ""} />
                {spinning ? "SPINNING..." : "SPIN NOW"}
              </button>
            </div>
          </div>

          {/* DYNAMIC RESULTS DIALOG BANNER CONTAINER */}
          <AnimatePresence>
            {showResult && landedSegment && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`w-full border rounded-3xl p-5 text-center shadow-2xl relative overflow-hidden backdrop-blur-md ${
                  landedSegment.multiplier > 1
                    ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-400'
                    : landedSegment.multiplier > 0
                    ? 'bg-blue-950/20 border-blue-500/30 text-blue-400'
                    : 'bg-rose-950/25 border-rose-500/30 text-rose-400'
                }`}
              >
                <h4 className="text-[9px] font-black tracking-[0.25em] uppercase opacity-60">SPIN DECISION RESULT</h4>
                
                {landedSegment.multiplier > 1 ? (
                  <div className="space-y-1 mt-2">
                    <p className="text-xl font-black italic uppercase tracking-tight">YOU WON!</p>
                    <p className="text-xs font-semibold font-mono">
                      Awarded <span className="text-yellow-400 font-black">{landedSegment.label}</span> • Cash RS <span className="text-emerald-400 font-extrabold">{(bet * landedSegment.multiplier).toLocaleString()}</span>
                    </p>
                  </div>
                ) : landedSegment.multiplier > 0 ? (
                  <div className="space-y-1 mt-2">
                    <p className="text-xl font-black italic uppercase tracking-tight">PARTIAL PAYBACK</p>
                    <p className="text-xs font-semibold font-mono">
                      Returned <span className="text-yellow-400 font-black">{landedSegment.label}</span> • Cash RS <span className="text-blue-400 font-extrabold">{(bet * landedSegment.multiplier).toLocaleString()}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 mt-2">
                    <p className="text-xl font-black italic uppercase tracking-tight text-rose-500 font-stroke">TRY AGAIN</p>
                    <p className="text-xs font-semibold font-mono">
                      Landed on <span className="text-rose-400 font-black">{landedSegment.label}</span>. Try another lucky spin!
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowResult(false)}
                  className="mt-4 px-5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-wider transition border border-white/5 cursor-pointer"
                >
                  OK
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
