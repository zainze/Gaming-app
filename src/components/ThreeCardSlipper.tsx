import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { Trophy, AlertCircle, Zap, Shield, Sparkles, Coins, RotateCw, CheckCircle2, ChevronUp, LogOut } from "lucide-react";
import { playSound, stopSound } from "../lib/sounds";

interface ThreeCardSlipperProps {
  onWin: (amount: number) => void;
  onBet: (amount: number) => Promise<boolean>;
  onLoss: () => void;
  onPenalty: (amount: number) => void;
  onStreakBonus: (amount: number) => void;
  balance: number;
  streak: number;
  losses: number;
  minBet?: number;
  winMultiplier?: number;
  penaltyAmount?: number;
  onExit: () => void;
}

// Compact Royal Card suit SVG paths
const SuitSpade = ({ className = "w-5 h-5", fill = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 2s-5.5 6.5-5.5 9.5c0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-5.5-9.5-5.5-9.5zm-1.5 15h3L13.2 21h-2.4l-.3-4z" />
  </svg>
);

const SuitHeart = ({ className = "w-5 h-5", fill = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const SuitDiamond = ({ className = "w-5 h-5", fill = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 2L2 12l10 10 10-10L12 2z" />
  </svg>
);

const SuitClub = ({ className = "w-5 h-5", fill = "currentColor" }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill}>
    <path d="M12 8.5a2.5 2.5 0 1 0-2.5-2.5c0 .3.05.6.15.85a3 3 0 1 0-.65 4.65V12.5a2.5 2.5 0 1 0 3.5 2.3c0-.1 0-.15-.05-.25a3 3 0 1 0-.6-4.6c.1-.25.15-.55.15-.85zM8.5 14.5c.1-.1.1-.3 0-.4a.4.4 0 0 0-.4 0v.4h.4zm7 0v-.4l-.4.2c0 .1.2.2.4.2zm-4.75 3h2.5L13 21h-2l-.25-3.5z" />
  </svg>
);

interface CardInfo {
  id: number; // Logical card spot (0, 1, 2)
  rank: 'J' | 'Q' | 'K' | 'A';
  suitType: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  label: string;
}

// Unique Royal combinations to randomize each game round
const DEPLOYED_ROYALS: CardInfo[][] = [
  [
    { id: 0, rank: 'J', suitType: 'clubs', label: 'J♣' },
    { id: 1, rank: 'Q', suitType: 'hearts', label: 'Q♥' }, // TARGET
    { id: 2, rank: 'K', suitType: 'spades', label: 'K♠' }
  ],
  [
    { id: 0, rank: 'J', suitType: 'diamonds', label: 'J♦' },
    { id: 1, rank: 'K', suitType: 'clubs', label: 'K♣' },
    { id: 2, rank: 'A', suitType: 'spades', label: 'A♠' } // TARGET
  ],
  [
    { id: 0, rank: 'Q', suitType: 'clubs', label: 'Q♣' },
    { id: 1, rank: 'K', suitType: 'diamonds', label: 'K♦' }, // TARGET
    { id: 2, rank: 'J', suitType: 'spades', label: 'J♠' }
  ],
  [
    { id: 0, rank: 'J', suitType: 'hearts', label: 'J♥' }, // TARGET
    { id: 1, rank: 'Q', suitType: 'spades', label: 'Q♠' },
    { id: 2, rank: 'K', suitType: 'clubs', label: 'K♣' }
  ],
  [
    { id: 0, rank: 'K', suitType: 'hearts', label: 'K♥' },
    { id: 1, rank: 'A', suitType: 'hearts', label: 'A♥' }, // TARGET
    { id: 2, rank: 'Q', suitType: 'clubs', label: 'Q♣' }
  ]
];

export default function ThreeCardSlipper({ 
  onWin, 
  onBet, 
  onLoss,
  onPenalty,
  onStreakBonus,
  balance, 
  streak = 0,
  losses = 0,
  minBet = 10, 
  winMultiplier = 3,
  penaltyAmount = 100,
  onExit
}: ThreeCardSlipperProps) {
  const [gameState, setGameState] = useState<'idle' | 'deal' | 'shuffling' | 'picking' | 'result'>('idle');
  const [bet, setBet] = useState(minBet);
  const [dealerMsg, setDealerMsg] = useState("Place bet & memorise target card!");
  
  // High fidelity state cards
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [winningId, setWinningId] = useState<number>(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Animation coordinates
  const [shufflePositions, setShufflePositions] = useState<number[]>([0, 1, 2]);
  const [shuffleHeightOffsets, setShuffleHeightOffsets] = useState<number[]>([0, 0, 0]);
  const [shake, setShake] = useState(false);

  // Deck selector
  const activeDeck = useMemo(() => {
    return DEPLOYED_ROYALS[activeDeckIndex];
  }, [activeDeckIndex]);

  // Win condition card tracker
  const targetCard = useMemo(() => {
    return activeDeck.find(c => c.id === winningId) || activeDeck[1];
  }, [activeDeck, winningId]);

  // Initial deal targets
  useEffect(() => {
    const randomTargetId = Math.floor(Math.random() * 3);
    setWinningId(randomTargetId);
  }, [activeDeckIndex]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const startShuffle = async () => {
    if (gameState !== 'idle') return;
    
    if (balance < bet) {
      triggerShake();
      playSound('error');
      setDealerMsg("Insufficient Balance!");
      return;
    }

    const success = await onBet(bet);
    if (!success) {
      playSound('error');
      return;
    }

    // Memorization state first
    setGameState('deal');
    setSelectedIndex(null);
    setDealerMsg(`Lock eyes on: ${targetCard.rank}${targetCard.label.slice(1)}`);
    playSound('ready');

    // 1.8 seconds memorizing pause
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Shuffling running state
    setGameState('shuffling');
    setDealerMsg("Dealer shuffles... Follow it!");
    playSound('spin');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let step = 0; step < 8; step++) {
      let card1 = Math.floor(Math.random() * 3);
      let card2 = Math.floor(Math.random() * 3);
      while (card1 === card2) {
        card2 = Math.floor(Math.random() * 3);
      }

      setShuffleHeightOffsets(prev => {
        const next = [...prev];
        next[card1] = -40;
        next[card2] = 40;
        return next;
      });

      setShufflePositions(prev => {
        const next = [...prev];
        const tmp = next[card1];
        next[card1] = next[card2];
        next[card2] = tmp;
        return next;
      });

      playSound('plink');
      await delay(200);

      setShuffleHeightOffsets([0, 0, 0]);
      await delay(80);
    }

    stopSound('spin');
    setGameState('picking');
    setDealerMsg(`Find the target card: ${targetCard.rank}${targetCard.label.slice(1)}! Swipe up to select.`);
    playSound('ready');
  };

  const selectCard = (cardId: number) => {
    if (gameState !== 'picking') return;
    
    setSelectedIndex(cardId);
    setGameState('result');

    if (cardId === winningId) {
      playSound('win');
      setDealerMsg(`VICTORY! Found the ${targetCard.rank}${targetCard.label.slice(1)}!`);
      onWin(bet * winMultiplier);
      if (streak + 1 >= 30) {
        onStreakBonus(5000);
      }
    } else {
      playSound('lose');
      setDealerMsg(`Lost! It was in slot #${shufflePositions[winningId] + 1}.`);
      onLoss();
      if (losses + 1 >= 2) {
        triggerShake();
        onPenalty(penaltyAmount);
      }
    }
  };

  const getSuitColor = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs') => {
    return (suit === 'hearts' || suit === 'diamonds') ? 'text-red-500' : 'text-neutral-900';
  };

  const renderSuit = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', sizeClass = "w-5 h-5") => {
    switch (suit) {
      case 'spades': return <SuitSpade className={sizeClass} fill="#171717" />;
      case 'hearts': return <SuitHeart className={sizeClass} fill="#e11d48" />;
      case 'diamonds': return <SuitDiamond className={sizeClass} fill="#ef4444" />;
      case 'clubs': return <SuitClub className={sizeClass} fill="#262626" />;
    }
  };

  // Sleek SVG Court Portraits
  const drawRoyalPortrait = (rank: 'J' | 'Q' | 'K' | 'A', suit: string) => {
    const isRed = suit === 'hearts' || suit === 'diamonds';
    const mainColor = isRed ? "#dc2626" : "#171717";
    const accentColor = isRed ? "#f43f5e" : "#404040";

    switch (rank) {
      case 'J':
        return (
          <svg className="w-14 h-24 object-contain" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="140" rx="10" fill="#fafafa" stroke="#e5e5e5" strokeWidth="2" />
            <path d="M50 35 L68 50 L68 75 L32 75 L32 50 Z" fill={accentColor} />
            <circle cx="50" cy="55" r="12" fill="#fed7aa" />
            <rect x="47" y="67" width="6" height="35" fill="#f59e0b" />
            <path d="M42 35 L45 20 L50 28 L55 20 L58 35 Z" fill="#eab308" />
            <path d="M30 45 L20 120 M70 45 L80 120" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="20" cy="115" r="5" fill="#eab308" />
            <circle cx="80" cy="115" r="5" fill="#eab308" />
            <text x="50" y="125" textAnchor="middle" fill={mainColor} fontSize="11" fontWeight="bold">JACK</text>
          </svg>
        );
      case 'Q':
        return (
          <svg className="w-14 h-24 object-contain" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="140" rx="10" fill="#fafafa" stroke="#e5e5e5" strokeWidth="2" />
            <path d="M50 40 L65 55 L58 80 L42 80 L35 55 Z" fill="#fda4af" />
            <path d="M38 40 L44 20 L50 28 L56 20 L62 40 Z" fill="#eab308" />
            <circle cx="50" cy="55" r="10" fill="#ffedd5" />
            <circle cx="44" cy="20" r="2" fill="#ef4444" />
            <circle cx="50" cy="28" r="2" fill="#ef4444" />
            <circle cx="56" cy="20" r="2" fill="#ef4444" />
            <path d="M50 80 Q65 105 50 120" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <circle cx="50" cy="118" r="7" fill="#f43f5e" />
            <text x="50" y="137" textAnchor="middle" fill={mainColor} fontSize="11" fontWeight="bold">QUEEN</text>
          </svg>
        );
      case 'K':
        return (
          <svg className="w-14 h-24 object-contain" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="140" rx="10" fill="#fafafa" stroke="#e5e5e5" strokeWidth="2" />
            <path d="M50 32 L72 45 L72 82 L28 82 L28 45 Z" fill="#fbbf24" fillOpacity="0.8" />
            <path d="M32 32 L41 12 L50 25 L59 12 L68 32 Z" fill="#ea580c" />
            <circle cx="50" cy="48" r="13" fill="#ffedd5" />
            <path d="M40 54 Q50 72 60 54 Z" fill="#cbd5e1" />
            <rect x="47" y="82" width="6" height="40" fill="#ea580c" />
            <circle cx="50" cy="65" r="14" stroke="#eab308" strokeWidth="2" fill="none" />
            <text x="50" y="135" textAnchor="middle" fill={mainColor} fontSize="11" fontWeight="bold">KING</text>
          </svg>
        );
      case 'A':
        return (
          <svg className="w-14 h-24 object-contain" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="90" height="140" rx="10" fill="#fafafa" stroke="#e5e5e5" strokeWidth="2" />
            <circle cx="50" cy="70" r="26" fill={isRed ? "#fff1f2" : "#f5f5f5"} stroke={mainColor} strokeWidth="1.5" strokeDasharray="3 3" />
            <polygon points="50,42 55,56 70,56 58,66 62,80 50,71 38,80 42,66 30,56 45,56" fill="#f59e0b" fillOpacity="0.25" />
            <g transform="translate(38, 58) scale(1.1)">
              {suit === 'spades' && <SuitSpade className="w-6 h-6" fill={mainColor} />}
              {suit === 'hearts' && <SuitHeart className="w-6 h-6" fill={mainColor} />}
              {suit === 'diamonds' && <SuitDiamond className="w-6 h-6" fill={mainColor} />}
              {suit === 'clubs' && <SuitClub className="w-6 h-6" fill={mainColor} />}
            </g>
            <text x="50" y="122" textAnchor="middle" fill={mainColor} fontSize="12" fontWeight="black" letterSpacing="2">ACE</text>
          </svg>
        );
    }
  };

  return (
    <div className={`w-full h-full bg-[#0d0e10] text-[#9EA0A3] font-sans relative flex flex-col overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      
      {/* Immersive radial glow behind the gaming screen */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      </div>

      {/* Aviator-Styled Master Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="text-emerald-500 animate-pulse" size={20} />
          <span className="text-emerald-500 font-black italic tracking-tighter text-lg uppercase whitespace-nowrap">Slipper</span>
        </div>
        
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
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

      {/* Main viewport-wrapped container designed to never scroll */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 flex flex-col justify-between py-4 relative z-10 min-h-0">
        
        {/* Helper status text bar */}
        <div className="bg-[#141516]/90 border border-[#2C2D2E]/40 rounded-2xl p-3 text-center flex items-center justify-between shadow-lg shrink-0">
          <div className="text-left">
            <span className="block text-[8px] font-black text-neutral-400 tracking-wider uppercase">DEALER STATUS</span>
            <span className="text-xs font-bold text-white tracking-tight">{dealerMsg}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
            <span className="text-[7.5px] font-bold uppercase text-neutral-400">TARGET:</span>
            <span className="text-[11px] font-black text-emerald-400">{targetCard.rank}{targetCard.label.slice(1)}</span>
          </div>
        </div>

        {/* Dynamic Velvet Playing felt screen */}
        <div className="flex-1 my-4 bg-gradient-to-b from-[#0e1626] to-[#080d15] rounded-3xl border border-[#1c2e4f]/80 shadow-2xl relative flex items-center justify-center overflow-hidden min-h-[220px]">
          
          <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#10b981]/20">Tactile Monte Tables</span>
          </div>

          <div className="relative w-full h-full flex items-center justify-center">
            {activeDeck.map((card) => {
              const isWinner = card.id === winningId;
              const isPicked = card.id === selectedIndex;
              const isFaceDown = gameState === 'shuffling' || gameState === 'picking';
              
              const gridPos = shufflePositions[card.id];
              const heightOffset = shuffleHeightOffsets[card.id];

              const dragY = useMotionValue(0);

              const handleDragEnd = (_e: any, info: any) => {
                if (gameState !== 'picking') return;
                if (info.offset.y < -45 || info.velocity.y < -120) {
                  selectCard(card.id);
                }
              };

              return (
                <motion.div
                  key={card.id}
                  layout
                  drag={gameState === 'picking' ? "y" : false}
                  dragConstraints={{ top: -140, bottom: 0 }}
                  dragElastic={{ top: 0.4, bottom: 0.1 }}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    y: dragY
                  }}
                  onDragEnd={handleDragEnd}
                  animate={{
                    x: `${(gridPos - 1) * 110}%`,
                    scale: isPicked && gameState === 'result' ? 1.05 : 1,
                    rotateY: isFaceDown ? 180 : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 22
                  }}
                  onClick={() => {
                    if (gameState === 'picking') {
                      selectCard(card.id);
                    }
                  }}
                  className={`absolute w-28 h-40 md:w-32 md:h-46 cursor-grab active:cursor-grabbing preserve-3d group`}
                >
                  
                  {/* FACE-UP ROYAL CARD */}
                  <div 
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-white via-neutral-50 to-neutral-200 border-2 shadow-xl p-2 flex flex-col justify-between backface-hidden select-none ${
                      gameState === 'result' && isWinner ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-neutral-300'
                    }`}
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="flex justify-between items-start leading-none pointer-events-none">
                      <div className={`flex flex-col items-center ${getSuitColor(card.suitType)}`}>
                        <span className="font-extrabold text-[#111] text-base leading-none">{card.rank}</span>
                        {renderSuit(card.suitType, "w-3 h-3 mt-0.5")}
                      </div>
                      
                      {isWinner && (
                        <div className="bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center">
                          <CheckCircle2 className="w-2 h-2 text-emerald-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex items-center justify-center p-0.5 pointer-events-none">
                      {drawRoyalPortrait(card.rank, card.suitType)}
                    </div>

                    <div className="flex justify-between items-end leading-none pointer-events-none rotate-180">
                      <div className={`flex flex-col items-center ${getSuitColor(card.suitType)}`}>
                        <span className="font-extrabold text-[#111] text-base leading-none">{card.rank}</span>
                        {renderSuit(card.suitType, "w-3 h-3 mt-0.5")}
                      </div>
                    </div>
                  </div>

                  {/* HIGH-STAKES CARD BACK */}
                  <div 
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#101c34] to-[#04060b] border-2 border-emerald-500/30 p-2 flex flex-col justify-between"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <div className="absolute inset-0.5 rounded-xl border border-emerald-500/5 pointer-events-none" />
                    <div className="flex justify-between pointer-events-none">
                      <Sparkles className="w-3 h-3 text-emerald-400/20" />
                      <Sparkles className="w-3 h-3 text-emerald-400/20" />
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-emerald-500/20 flex items-center justify-center p-0.5 relative">
                        <div className="w-full h-full rounded-full border border-dashed border-emerald-400/20 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-emerald-400/80 rotate-12" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pointer-events-none rotate-180">
                      <div className="flex flex-col items-center gap-0.5 opacity-40">
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                        <span className="text-[5.5px] font-black uppercase text-emerald-400 tracking-wider">SWIPE UP</span>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400/20" />
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stake choosing chips and Main action trigger bar */}
        <div className="space-y-3 shrink-0">
          
          {/* Quick result panel */}
          <AnimatePresence>
            {gameState === 'result' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setGameState('idle')}
                className={`py-3 rounded-xl border text-center font-black uppercase text-xs cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  selectedIndex === winningId 
                    ? 'bg-emerald-500 border-emerald-400 text-neutral-900' 
                    : 'bg-red-500 border-red-400 text-white'
                }`}
              >
                {selectedIndex === winningId ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                    <span>WIN! +{bet * winMultiplier} RS • TAP TO RESET</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>SLIPPED! • TAP TO RE-BET</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between text-[10px] font-black uppercase text-neutral-400 tracking-wider px-1">
            <span>SELECT PRE-BET COIN</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">🔥 STREAK: {streak}</span>
              {losses > 0 && <span className="text-red-400">⚠️ LIVES: {losses}/2</span>}
            </div>
          </div>

          {/* Chips Selector */}
          <div className="flex gap-2.5">
            {[minBet, minBet * 2, minBet * 5, minBet * 10, minBet * 50].map((v) => {
              const activeAndSelected = bet === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={gameState !== 'idle'}
                  onClick={() => {
                    playSound('chip');
                    setBet(v);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase border-2 text-xs flex flex-col items-center justify-center transition-all ${
                    activeAndSelected 
                      ? 'bg-emerald-500 border-emerald-300 text-neutral-900 shadow-lg shadow-emerald-500/20 -translate-y-[1px]' 
                      : 'border-white/10 bg-[#141516]/40 text-[#6B6D6F] hover:border-white/20 hover:text-white disabled:opacity-40'
                  }`}
                >
                  <span className="text-[7px] font-bold block mb-0.5">CHIP</span>
                  <span className="font-extrabold text-xs">{v}</span>
                </button>
              );
            })}
          </div>

          {/* Direct Deal and Shuffle start button */}
          <button
            type="button"
            onClick={startShuffle}
            disabled={gameState !== 'idle'}
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 font-extrabold text-[#050912] rounded-2xl tracking-wider text-sm flex items-center justify-center gap-2 shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {gameState === 'idle' ? (
              <>
                <RotateCw className="w-4 h-4 text-neutral-900 animate-spin" />
                <span>DEAL & SHUFFLE CARDS ({bet} RS)</span>
              </>
            ) : gameState === 'deal' ? (
              <span>MEMORIZE THE TARGET...</span>
            ) : gameState === 'shuffling' ? (
              <span>SHUFFLING CARDS...</span>
            ) : (
              <span className="text-[#050912] font-black uppercase flex items-center gap-1.5 animate-pulse">
                <ChevronUp className="w-4 h-4" /> SWIPE UP TO SLIP YOUR TARGET!
              </span>
            )}
          </button>
        </div>

      </div>

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.1s ease-in-out; }
      `}</style>
    </div>
  );
}
