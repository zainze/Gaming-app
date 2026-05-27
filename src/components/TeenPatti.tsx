import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, LogOut, Award, RefreshCw, ChevronUp, CheckCircle2, AlertCircle, Info, Coins, Shield, Sparkles } from "lucide-react";
import { playSound } from "../lib/sounds";

interface TeenPattiProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

type Card = { suit: string; rank: string; value: number };
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

export const TeenPatti: React.FC<TeenPattiProps> = ({
  balance,
  onWin,
  onBet,
  onExit,
  winRate = 45,
  minBet = 10,
  multiplier = 2
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<"betting" | "dealing" | "revealed">("betting");
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [result, setResult] = useState<"win" | "lose" | "tie" | null>(null);
  const [dealerMsg, setDealerMsg] = useState("Place your ante & deal the royal hand!");
  const [shake, setShake] = useState(false);

  const getHandScore = (cards: Card[]) => {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const ranks = sorted.map((c) => c.value);
    const suits = sorted.map((c) => c.suit);

    const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
    const isPureSequence =
      ranks[0] === ranks[1] + 1 &&
      ranks[1] === ranks[2] + 1 &&
      suits[0] === suits[1] &&
      suits[1] === suits[2];
    const isSequence = ranks[0] === ranks[1] + 1 && ranks[1] === ranks[2] + 1;
    const isColor = suits[0] === suits[1] && suits[1] === suits[2];
    const isPair =
      ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

    if (isTrail) return 600 + ranks[0];
    if (isPureSequence) return 500 + ranks[0];
    if (isSequence) return 400 + ranks[0];
    if (isColor) return 300 + ranks[0];
    if (isPair) return 200 + (ranks[0] === ranks[1] ? ranks[0] : ranks[1]);
    return 100 + ranks[0];
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const dealCards = async () => {
    if (playing) return;

    if (balance < bet) {
      triggerShake();
      playSound("error");
      setDealerMsg("Insufficient Balance!");
      return;
    }

    setPlaying(true);
    setStage("dealing");
    setResult(null);
    setDealerMsg("Dealer is shuffling the deck...");
    playSound("ready");

    const success = await onBet(bet);
    if (!success) {
      playSound("error");
      setPlaying(false);
      setStage("betting");
      setDealerMsg("Wager authorization error.");
      return;
    }

    const generateHand = () => {
      const hand: Card[] = [];
      while (hand.length < 3) {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        if (!hand.some((c) => c.suit === suit && c.rank === rank)) {
          hand.push({ suit, rank, value: RANK_VALUES[rank] });
        }
      }
      return hand;
    };

    // Ripped calculations to respect the rigged win rate mathematically
    let playerHand = generateHand();
    let dealerHand = generateHand();
    const isWin = Math.random() * 100 < winRate;

    for (let i = 0; i < 30; i++) {
      const pScore = getHandScore(playerHand);
      const dScore = getHandScore(dealerHand);
      if (isWin && pScore > dScore) break;
      if (!isWin && dScore > pScore) break;
      playerHand = generateHand();
      dealerHand = generateHand();
    }

    setPlayerCards(playerHand);
    setDealerCards(dealerHand);

    // Dynamic delay steps to simulate physical casino dealer actions
    setTimeout(() => {
      setStage("revealed");
      const pScore = getHandScore(playerHand);
      const dScore = getHandScore(dealerHand);

      if (pScore > dScore) {
        setResult("win");
        onWin(bet * multiplier);
        playSound("win");
        setDealerMsg(`Victory! Your ${getHandName(playerHand)} beats Dealer's ${getHandName(dealerHand)}!`);
      } else if (dScore > pScore) {
        setResult("lose");
        playSound("lose");
        setDealerMsg(`Dealer Wins! ${getHandName(dealerHand)} beats your ${getHandName(playerHand)}.`);
      } else {
        setResult("tie");
        onWin(bet); // Refund the wager on ties
        playSound("ready");
        setDealerMsg("It is a draw tie hand! Your wager was refunded.");
      }
      setPlaying(false);
    }, 2000);
  };

  const getHandName = (cards: Card[]) => {
    const score = getHandScore(cards);
    if (score >= 600) return "Trail (Three of a Kind)";
    if (score >= 500) return "Pure Sequence";
    if (score >= 400) return "Sequence (Run)";
    if (score >= 300) return "Color (Flush)";
    if (score >= 200) return "Pair";
    return "High Card";
  };

  return (
    <div className={`w-full h-full bg-[#05110a] text-[#a1b8ab] font-sans relative flex flex-col overflow-hidden ${shake ? "animate-shake" : ""}`}>
      
      {/* Cinematic Felt Table Lighting and luxury subtle grids */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.08),transparent_75%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "90px 90px" }} />
      </div>

      {/* Aviator-Style Master Casino Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#020a06] border-b border-[#0f2e1b] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Award className="text-yellow-500 animate-pulse" size={20} />
          <span className="text-yellow-500 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Teen Patti</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#113a22] shadow-lg">
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

      {/* Main Single Screen Layout Container - Absolutely No Scrolling */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 flex flex-col justify-between py-4 relative z-10 min-h-0">
        
        {/* Dealer status display header */}
        <div className="bg-[#050f09]/90 border border-[#11321d] rounded-2xl p-3 text-center flex items-center justify-between shadow-lg shrink-0">
          <div className="text-left">
            <span className="block text-[8px] font-black text-[#518765] tracking-wider uppercase">DEALER TABLE</span>
            <span className="text-xs font-bold text-white tracking-tight">{dealerMsg}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl">
            <span className="text-[7.5px] font-bold uppercase text-neutral-400">WIN MULTIPLIER:</span>
            <span className="text-[11px] font-black text-yellow-400">{multiplier}X</span>
          </div>
        </div>

        {/* Dynamic Velvet Game Board Felt */}
        <div className="flex-1 my-3 bg-gradient-to-b from-[#061e11] to-[#031109] rounded-3xl border border-[#0f341d] shadow-2xl relative flex flex-col justify-between p-4 overflow-hidden min-h-[300px]">
          
          {/* Subtle gold watermark centered */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <Award size={180} className="text-yellow-500" />
          </div>

          {/* DEALER FIELD CONTAINER */}
          <div className="w-full flex flex-col items-center space-y-2 z-10">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#558e69]">DEALER HAND</span>
            <div className="flex justify-center gap-3 relative">
              {dealerCards.length > 0 ? (
                dealerCards.map((card, idx) => (
                  <CardView key={idx} card={card} hidden={stage !== "revealed"} delay={idx * 0.15} />
                ))
              ) : (
                [0, 1, 2].map((i) => (
                  <div key={i} className="w-20 h-28 md:w-24 md:h-34 rounded-xl border border-[#0b2615] bg-black/20 flex items-center justify-center text-xs opacity-20">
                    <Shield size={16} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIDDLE DYNAMIC STATUS RING & NOTIFICATIONS */}
          <div className="h-14 flex items-center justify-center z-10">
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <span className={`text-2xl font-black italic uppercase tracking-wider drop-shadow-[0_0_12px_rgba(234,179,8,0.3)] ${
                    result === "win" ? "text-yellow-400" : result === "tie" ? "text-blue-400" : "text-rose-500"
                  }`}>
                    {result === "win" ? "★ PLAYER WINS ★" : result === "tie" ? "■ TIE REFUNDED ■" : "✗ DEALER WINS ✗"}
                  </span>
                </motion.div>
              )}

              {!result && stage === "dealing" && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-[#06150c] px-4 py-1.5 rounded-full border border-yellow-500/20"
                >
                  <RefreshCw size={14} className="text-yellow-500 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/80 font-mono">Shuffling Deck...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PLAYER FIELD CONTAINER */}
          <div className="w-full flex flex-col items-center space-y-2 z-10">
            <div className="flex justify-center gap-3 relative">
              {playerCards.length > 0 ? (
                playerCards.map((card, idx) => (
                  <CardView key={idx} card={card} hidden={false} delay={0.4 + idx * 0.15} />
                ))
              ) : (
                [0, 1, 2].map((i) => (
                  <div key={i} className="w-20 h-28 md:w-24 md:h-34 rounded-xl border border-[#0b2615] bg-black/20 flex items-center justify-center text-xs opacity-20">
                    <Shield size={16} />
                  </div>
                ))
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#558e69]">YOUR ROYAL HAND</span>
          </div>

        </div>

        {/* BOTTOM ACTION BAR & ANTE COINS */}
        <div className="space-y-3 shrink-0">
          
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-neutral-400 tracking-wider px-1">
            <span>SELECT PRE-BET COIN</span>
            <span className="text-yellow-500">ANTE STAKE</span>
          </div>

          {/* Casino Coin chip selecting tabs */}
          <div className="flex gap-2.5">
            {[minBet, minBet * 2, minBet * 5, minBet * 10, minBet * 50].map((v) => {
              const active = bet === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={playing}
                  onClick={() => {
                    playSound("chip");
                    setBet(v);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase border-2 text-xs flex flex-col items-center justify-center transition-all ${
                    active
                      ? "bg-yellow-500 border-yellow-300 text-neutral-900 shadow-lg shadow-yellow-500/20 -translate-y-[1px]"
                      : "border-white/10 bg-[#071910]/60 text-[#557160] hover:border-white/20 hover:text-white disabled:opacity-40"
                  }`}
                >
                  <span className="text-[7.5px] font-bold block mb-0.5">CHIP</span>
                  <span className="font-extrabold text-xs">{v}</span>
                </button>
              );
            })}
          </div>

          {/* Giant high-fidelity button container that changes into instant Replay action seamlessly */}
          <button
            type="button"
            onClick={dealCards}
            disabled={playing}
            className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-600 font-extrabold text-[#09150f] rounded-2xl tracking-wider text-sm flex items-center justify-center gap-2 shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {playing ? (
              <span>DEALING CARDS...</span>
            ) : stage === "revealed" ? (
              <>
                <RefreshCw size={16} className="text-[#09150f] animate-spin-slow" />
                <span>PLAY AGAIN / REBET (RS {bet})</span>
              </>
            ) : (
              <>
                <Coins size={16} />
                <span>DEAL HAND (RS {bet})</span>
              </>
            )}
          </button>

        </div>

      </div>

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
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

const CardView: React.FC<{ card: Card; hidden?: boolean; delay: number }> = ({ card, hidden, delay }) => {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <motion.div
      initial={{ y: 35, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: hidden ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 18, delay }}
      className="w-20 h-28 md:w-24 md:h-34 bg-white rounded-xl shadow-2xl flex flex-col justify-between p-2 text-black relative preserve-3d"
    >
      {/* CARD BACK DESIGN FOR UNREVEALED DEALER CARDS */}
      <div
        className={`absolute inset-0 rounded-xl bg-gradient-to-br from-[#0c2415] via-[#113a22] to-[#040c07] border-2 border-yellow-500/30 p-2 flex flex-col justify-between backface-hidden ${
          hidden ? "" : "hidden"
        }`}
        style={{ backfaceVisibility: "hidden" }}
      >
        <div className="absolute inset-0.5 rounded-lg border border-yellow-500/5 pointer-events-none" />
        <div className="flex justify-between pointer-events-none">
          <Sparkles className="w-2.5 h-2.5 text-yellow-500/20" />
          <Sparkles className="w-2.5 h-2.5 text-yellow-500/20" />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-yellow-500/20 flex items-center justify-center relative">
            <Shield size={12} className="text-yellow-500/80 animate-pulse" />
          </div>
        </div>

        <div className="flex justify-between pointer-events-none rotate-180">
          <Sparkles className="w-2.5 h-2.5 text-yellow-500/20" />
          <Sparkles className="w-2.5 h-2.5 text-yellow-500/20" />
        </div>
      </div>

      {/* FRONT OF THE ROYAL CARD */}
      {!hidden && (
        <>
          <div className="w-full text-left leading-none">
            <span className={`text-base font-black block leading-none ${isRed ? "text-red-600" : "text-neutral-900"}`}>
              {card.rank}
            </span>
            <span className={`text-[11px] font-black ${isRed ? "text-red-500" : "text-neutral-600"}`}>
              {card.suit}
            </span>
          </div>

          <div className={`text-3xl font-black text-center self-center my-0.5 ${isRed ? "text-red-500" : "text-neutral-900"}`}>
            {card.suit}
          </div>

          <div className="w-full text-right rotate-180 leading-none">
            <span className={`text-base font-black block leading-none ${isRed ? "text-red-600" : "text-neutral-900"}`}>
              {card.rank}
            </span>
            <span className={`text-[11px] font-black ${isRed ? "text-red-500" : "text-neutral-600"}`}>
              {card.suit}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
};
