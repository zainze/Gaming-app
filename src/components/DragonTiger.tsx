import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, Trophy, HelpCircle, Volume2, VolumeX, Coins, RotateCcw, Flame, Sparkles, Star, ArrowLeft } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface DragonTigerProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

interface Suit {
  symbol: string;
  name: string;
  color: string;
}

interface CardData {
  value: number; // 1 to 13
  label: string; // "A", "2".."10", "J", "Q", "K"
  suit: Suit;
}

const SUITS: Suit[] = [
  { symbol: '♠', name: 'spades', color: 'text-zinc-900' },
  { symbol: '♥', name: 'hearts', color: 'text-red-600' },
  { symbol: '♦', name: 'diamonds', color: 'text-red-600' },
  { symbol: '♣', name: 'clubs', color: 'text-zinc-900' }
];

const CHIPS = [10, 50, 100, 500, 1000, 5000];

export const DragonTiger: React.FC<DragonTigerProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'betting' | 'dealing' | 'result'>('betting');
  
  // Dynamic cards state
  const [dragonCard, setDragonCard] = useState<CardData | null>(null);
  const [tigerCard, setTigerCard] = useState<CardData | null>(null);
  const [dealingDragon, setDealingDragon] = useState(false);
  const [dealingTiger, setDealingTiger] = useState(false);
  
  // Selection can be 'dragon' | 'tiger' | 'tie'
  const [selection, setSelection] = useState<'dragon' | 'tiger' | 'tie'>('dragon');
  
  // Game outcomes
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [roundWinner, setRoundWinner] = useState<'dragon' | 'tiger' | 'tie' | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<string>('');
  
  // Sound toggle override (uses sound setting defaults but provides in-game toggle easily)
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Trend roadmap beads (e.g. 'D', 'T', 'Tie')
  const [roadMap, setRoadMap] = useState<('D' | 'T' | 'Tie')[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-generate some history on load to make the bead plate look alive and professional!
  useEffect(() => {
    const historicalOptions: ('D' | 'T' | 'Tie')[] = ['D', 'T', 'D', 'T', 'D', 'Tie', 'T', 'D', 'T', 'T'];
    const prefilled: ('D' | 'T' | 'Tie')[] = [];
    for (let i = 0; i < 9; i++) {
      const idx = Math.floor(Math.random() * historicalOptions.length);
      prefilled.push(historicalOptions[idx]);
    }
    setRoadMap(prefilled);
  }, []);

  const createCard = (val: number): CardData => {
    const labelMap: Record<number, string> = {
      1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
    };
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return {
      value: val,
      label: labelMap[val] || val.toString(),
      suit: randomSuit
    };
  };

  const addChipToBet = (amount: number) => {
    if (playing) return;
    playSound('chip');
    
    // Add chip price to current bet value
    const newBet = bet + amount;
    if (newBet <= balance) {
      setBet(newBet);
    } else {
      setBet(balance > minBet ? Math.floor(balance) : minBet);
    }
  };

  const doubleBet = () => {
    if (playing) return;
    playSound('chip');
    const doubled = bet * 2;
    if (doubled <= balance) {
      setBet(doubled);
    } else {
      setBet(Math.floor(balance) > minBet ? Math.floor(balance) : minBet);
    }
  };

  const clearBet = () => {
    if (playing) return;
    playSound('chip');
    setBet(minBet);
  };

  const handleStartGame = () => {
    if (playing) return;
    if (balance < bet) {
      playSound('error');
      alert("Insufficient Balance. Please add funds to place bet!");
      return;
    }

    setPlaying(true);
    setStage('dealing');
    setGameResult(null);
    setRoundWinner(null);
    setDragonCard(null);
    setTigerCard(null);
    setDealingDragon(true);
    setDealingTiger(false);
    setPayoutMessage('');

    // Deduct standard stake
    onBet(bet);
    if (soundEnabled) playSound('chip');

    // 1. Determine if this round is a win based on global winRate
    const isWin = Math.random() * 100 < winRate;
    let dVal: number;
    let tVal: number;

    // Standard card generation conforming strictly to the outcome
    if (selection === 'dragon') {
      if (isWin) {
        // Dragon wins: dVal > tVal
        dVal = 3 + Math.floor(Math.random() * 11); // 3 to 13
        tVal = 1 + Math.floor(Math.random() * (dVal - 1)); // 1 to dVal-1
      } else {
        // Lose: Tiger wins or Tie
        // Give 8% organic Tie chance for more casino realism!
        const isTie = Math.random() < 0.08;
        if (isTie) {
          dVal = 2 + Math.floor(Math.random() * 11); // 2 to 12
          tVal = dVal;
        } else {
          tVal = 3 + Math.floor(Math.random() * 11); // 3 to 13
          dVal = 1 + Math.floor(Math.random() * (tVal - 1)); // 1 to tVal-1
        }
      }
    } else if (selection === 'tiger') {
      if (isWin) {
        // Tiger wins: tVal > dVal
        tVal = 3 + Math.floor(Math.random() * 11); // 3 to 13
        dVal = 1 + Math.floor(Math.random() * (tVal - 1)); // 1 to tVal-1
      } else {
        // Lose: Dragon wins or Tie
        const isTie = Math.random() < 0.08;
        if (isTie) {
          dVal = 2 + Math.floor(Math.random() * 11);
          tVal = dVal;
        } else {
          dVal = 3 + Math.floor(Math.random() * 11); // 3 to 13
          tVal = 1 + Math.floor(Math.random() * (dVal - 1)); // 1 to dVal-1
        }
      }
    } else {
      // User bet on Tie!
      if (isWin) {
        // Generate same value (Tie)
        dVal = 2 + Math.floor(Math.random() * 11); // 2 to 12
        tVal = dVal;
      } else {
        // Generate different values (Tiger or Dragon wins)
        dVal = 2 + Math.floor(Math.random() * 11);
        tVal = 2 + Math.floor(Math.random() * 11);
        if (dVal === tVal) {
          tVal = dVal === 13 ? dVal - 1 : dVal + 1;
        }
      }
    }

    const dCard = createCard(dVal);
    const tCard = createCard(tVal);

    // Timeline deal sequence
    // Step 1: Fly out and flip Dragon Card
    setTimeout(() => {
      setDragonCard(dCard);
      setDealingDragon(false);
      setDealingTiger(true);
      if (soundEnabled) playSound('click');

      // Step 2: Fly out and flip Tiger Card
      setTimeout(() => {
        setTigerCard(tCard);
        setDealingTiger(false);
        if (soundEnabled) playSound('click');

        // Step 3: Resolve Winner and distribute payouts
        setTimeout(() => {
          let winner: 'dragon' | 'tiger' | 'tie' = 'dragon';
          if (dVal > tVal) {
            winner = 'dragon';
          } else if (tVal > dVal) {
            winner = 'tiger';
          } else {
            winner = 'tie';
          }

          setRoundWinner(winner);
          setStage('result');
          setPlaying(false);

          // Append to bead plate history
          const char = winner === 'dragon' ? 'D' : winner === 'tiger' ? 'T' : 'Tie';
          setRoadMap(prev => [...prev.slice(-11), char]); // Keep last 12 rounds on plate

          // Calculate payouts
          if (selection === winner) {
            setGameResult('win');
            if (soundEnabled) playSound('win');

            if (selection === 'tie') {
              // Tie payouts pay 9.0x total stake
              const winAmt = bet * 9;
              onWin(winAmt);
              setPayoutMessage(`Super tie! Won RS ${winAmt.toFixed(0)} (9x Payout)`);
            } else {
              // Dragon/Tiger wins standard multiplier
              const winAmt = bet * multiplier;
              onWin(winAmt);
              setPayoutMessage(`Victory! Won RS ${winAmt.toFixed(0)} (2x Payout)`);
            }
          } else if (winner === 'tie' && (selection === 'dragon' || selection === 'tiger')) {
            // Tie refund classic rule: 50% refund returned
            setGameResult('tie');
            if (soundEnabled) playSound('levelUp');
            const refundAmt = bet * 0.5;
            onWin(refundAmt);
            setPayoutMessage(`Imperial Tie! 50% Refunded: RS ${refundAmt.toFixed(0)}`);
          } else {
            setGameResult('lose');
            if (soundEnabled) playSound('lose');
            setPayoutMessage(`Loss. High card was ${winner.toUpperCase()}`);
          }

        }, 900);
      }, 900);
    }, 900);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0404] text-zinc-100 font-sans overflow-hidden select-none relative">
      
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1540324155974-7523202daa3f?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-[#0e0303]" />

      {/* Elegant Aviator-style Header */}
      <header className="flex items-center justify-between px-3 h-14 bg-[#0a121e] border-b border-[#1a2b45] relative z-20 shrink-0">
        
        {/* Left Aspect: Go Back button and Game Title Brand */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onExit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#15243f] hover:bg-[#1a2c4c] text-zinc-350 rounded-lg border border-[#1e345c] active:scale-95 transition-all hover:text-white shadow-lg text-[10px] font-black uppercase tracking-wider"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <span>Go Back</span>
          </button>

          <div className="h-4 w-[1px] bg-[#1a2b45] hidden xxs:block" />

          <div className="hidden xxs:flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-red-655 bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-xs">🐉</span>
            </div>
            <div className="flex flex-col select-none">
              <div className="flex items-center gap-1">
                <span className="text-red-500 font-extrabold italic tracking-tighter text-xs uppercase">Dragon Tiger</span>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[6px] font-sans font-extrabold tracking-widest px-0.5 rounded scale-90">LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Aspect: Aviator styled Balance Indicator */}
        <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5 border border-[#1a2b45] shadow-lg">
          <div className="w-3 px-0.5 aspect-square rounded-full bg-[#FBCB35] flex items-center justify-center shadow-[0_0_10px_rgba(251,203,53,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#14171A]" />
          </div>
          <span className="text-[#32D74B] font-black text-xs leading-none">RS {balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
        </div>

        {/* Right Aspect: Rules & Mute toggler */}
        <div className="flex items-center gap-1.5">
          {/* Audio toggle control */}
          <button 
            onClick={() => {
              playSound('click');
              setSoundEnabled(!soundEnabled);
            }} 
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95 shadow"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={13} className="text-amber-500 animate-pulse" /> : <VolumeX size={13} />}
          </button>

          {/* Guidelines toggle */}
          <button 
            onClick={() => {
              playSound('click');
              setShowHelp(!showHelp);
            }} 
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-805 text-[#9EA0A3] hover:text-white transition-all active:scale-95 shadow"
            title="Show Guide"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </header>

      {/* Guide explanation Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              className="bg-zinc-950 border border-red-900/60 p-6 rounded-3xl max-w-md w-full text-zinc-200 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-red-900/40 pb-3">
                <h3 className="text-lg font-serif font-black text-amber-500 tracking-wide flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500" /> Imperial Game Rules
                </h3>
                <button onClick={() => { playSound('click'); setShowHelp(false); }} className="text-zinc-500 hover:text-white text-xs font-bold uppercase p-1">Close</button>
              </div>
              <div className="space-y-2.5 text-xs text-zinc-400 leading-relaxed font-sans">
                <p>1. <strong className="text-red-500">Dragon Tiger</strong> is the ultimate simplified two-card deck casino game.</p>
                <p>2. A single card is dealt to the <strong className="text-red-400">Dragon</strong>, and a single card is dealt to the <strong className="text-orange-400">Tiger</strong>.</p>
                <p>3. Whichever card is of **higher value** wins the round! Ties result in rank matches.</p>
                <p>4. <strong className="text-zinc-100">Card Rankings:</strong> Aces are lowest (value 1), Kings are highest (value 13). Suit symbols have no value comparison.</p>
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-850 space-y-1">
                  <p className="text-amber-400 font-extrabold">Payout Multipliers:</p>
                  <p>• <strong className="text-red-500">Dragon:</strong> pays <strong className="text-zinc-100">2x</strong> total bet (1:1 profit)</p>
                  <p>• <strong className="text-orange-400">Tiger:</strong> pays <strong className="text-zinc-100">2x</strong> total bet (1:1 profit)</p>
                  <p>• <strong className="text-yellow-500">Tie:</strong> pays <strong className="text-zinc-100">9x</strong> total bet (8:1 payout)</p>
                </div>
                <p className="text-[11px] italic text-zinc-500 border-t border-zinc-900 pt-2">
                  *Imperial Rule: In the event of a <span className="text-yellow-500 font-bold">Tie</span> outcome, any player bets on Dragon or Tiger are refunded <span className="text-green-400 font-black">50% of their stake</span> instantly.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll-free viewport of the game */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 px-3 py-2 justify-between space-y-2 sm:space-y-3">
        
        {/* ROADMAP BEAD PLATE (HISTORIC WIN TRENDS) - shifted to top side (Aviator style!) */}
        <div className="shrink-0 w-full bg-[#0a121e]/85 border border-[#1a2b45] rounded-xl p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 z-10 shadow-lg">
          <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Rounds Win Trends</span>
          </div>
          
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 justify-start sm:justify-end no-scrollbar">
            {roadMap.length === 0 ? (
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Awaiting First Round</span>
            ) : (
              roadMap.map((winner, idx) => (
                <div 
                  key={idx} 
                  className={`w-5.5 h-5.5 shrink-0 rounded-full flex items-center justify-center font-serif text-[9px] font-black text-white shadow border ${
                    winner === 'D' ? 'bg-red-600 border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.25)]' : winner === 'T' ? 'bg-orange-600 border-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.25)]' : 'bg-yellow-600 border-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.25)]'
                  }`}
                  title={winner}
                >
                  {winner[0]}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 sm:mt-0 justify-between text-[8px] text-zinc-400 font-mono font-black border-t border-zinc-900 sm:border-0 pt-0.5 sm:pt-0">
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600" /> D:{roadMap.filter(x => x === 'D').length}</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> T:{roadMap.filter(x => x === 'T').length}</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Tie:{roadMap.filter(x => x === 'Tie').length}</span>
          </div>
        </div>
        
        {/* UPPER BOARD: Upper live arena */}
        <div className="relative flex-1 min-h-0 min-h-[180px] bg-gradient-to-b from-[#180404] via-[#0d0101] to-[#120202] border border-red-500/10 rounded-2xl p-4 flex flex-col justify-center items-center shadow-[0_4px_24px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Background dragon & tiger decoration */}
          <div className="absolute top-2 left-2 opacity-5 pointer-events-none select-none text-6xl">🐉</div>
          <div className="absolute bottom-2 right-2 opacity-5 pointer-events-none select-none text-6xl">🐯</div>

          {/* Tiny Dealer Shoe Deck representation at top */}
          <div className="absolute top-2 right-4 flex items-center gap-1 scale-90 sm:scale-100">
            <span className="text-[7.5px] uppercase text-amber-500/50 font-bold tracking-[0.1em]">Imperial Shoe</span>
            <div className="w-10 h-7 bg-gradient-to-br from-[#d4af37]/20 to-red-950/20 rounded border border-amber-500/20 p-0.5 flex justify-center items-center relative">
              <div className="w-8 h-4 bg-zinc-900 border border-red-800 rounded flex items-center justify-center">
                <span className="text-amber-500 text-[6px] font-bold">DECK</span>
              </div>
            </div>
          </div>

          {/* Arena Cards Grid */}
          <div className="flex items-center justify-between w-full max-w-lg px-2 sm:px-6 relative z-10">
            
            {/* Dragon card section */}
            <div className="flex flex-col items-center space-y-1 sm:space-y-2 flex-1">
              <span className="text-[10px] font-black text-red-500 tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-505 bg-red-500" /> Dragon
              </span>

              {/* CARD CONTAINER */}
              <div className={`relative w-22 h-30 xs:w-26 xs:h-36 sm:w-30 sm:h-42 bg-gradient-to-b from-zinc-950 to-neutral-900 border-2 rounded-2xl p-1 flex items-center justify-center transition-all duration-300 ${
                selection === 'dragon' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-red-950/30'
              }`}>
                <AnimatePresence mode="wait">
                  {dealingDragon ? (
                    <motion.div 
                      key="dealing"
                      initial={{ scale: 0.1, y: -200, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                      exit={{ scale: 1.1, opacity: 0 }}
                      className="absolute inset-1 bg-gradient-to-br from-red-950 to-[#0c0303] border border-red-500/30 rounded-xl flex flex-col items-center justify-center p-2 text-red-500/30"
                    >
                      <div className="w-full h-full border border-red-500/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                        <span className="text-xl animate-pulse">🐉</span>
                      </div>
                    </motion.div>
                  ) : dragonCard ? (
                    <motion.div 
                      key="card"
                      initial={{ rotateY: -180, scale: 0.6 }}
                      animate={{ rotateY: 0, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-1 bg-white text-zinc-900 rounded-xl shadow-lg flex flex-col justify-between p-2"
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col items-center leading-none">
                          <span className={`${dragonCard.suit.color} text-base xs:text-lg font-black font-serif`}>{dragonCard.label}</span>
                          <span className={`${dragonCard.suit.color} text-xs leading-none`}>{dragonCard.suit.symbol}</span>
                        </div>
                        <span className="text-[7px] bg-red-50 text-red-700 px-1 rounded font-bold uppercase scale-90">DRG</span>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <span className="text-2xl text-red-650">🐉</span>
                        <span className={`text-lg ${dragonCard.suit.color} leading-none mt-0.5`}>{dragonCard.suit.symbol}</span>
                      </div>

                      <div className="flex justify-between items-end w-full leading-none rotate-180">
                        <div className="flex flex-col items-center leading-none">
                          <span className={`${dragonCard.suit.color} text-base xs:text-lg font-black font-serif`}>{dragonCard.label}</span>
                          <span className={`${dragonCard.suit.color} text-xs leading-none`}>{dragonCard.suit.symbol}</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-red-900/15 py-4 space-y-1">
                      <span className="text-3xl opacity-30">🐉</span>
                      <span className="text-[8px] font-black tracking-widest uppercase">WAITING</span>
                    </div>
                  )}
                </AnimatePresence>

                {dragonCard && stage === 'result' && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-red-650 text-white font-black px-2 py-0.5 rounded-full text-[8px] shadow border border-red-400 z-10 whitespace-nowrap">
                    Val: {dragonCard.value}
                  </div>
                )}
              </div>

              {stage === 'result' && roundWinner === 'dragon' && (
                <div className="text-[8px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Winner
                </div>
              )}
            </div>

            {/* VS Divider column */}
            <div className="flex flex-col items-center px-2 shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-red-500/20 bg-black/60 shadow-md flex items-center justify-center relative">
                {stage === 'dealing' && (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0.5 rounded-full border-t border-r border-amber-500"
                  />
                )}
                <span className="font-serif font-black italic text-xs text-amber-500">VS</span>
              </div>
            </div>

            {/* Tiger card section */}
            <div className="flex flex-col items-center space-y-1 sm:space-y-2 flex-1">
              <span className="text-[10px] font-black text-orange-400 tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" /> Tiger
              </span>

              {/* CARD CONTAINER */}
              <div className={`relative w-22 h-30 xs:w-26 xs:h-36 sm:w-30 sm:h-42 bg-gradient-to-b from-zinc-950 to-neutral-900 border-2 rounded-2xl p-1 flex items-center justify-center transition-all duration-300 ${
                selection === 'tiger' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-orange-950/30'
              }`}>
                <AnimatePresence mode="wait">
                  {dealingTiger ? (
                    <motion.div 
                      key="dealing"
                      initial={{ scale: 0.1, y: -200, opacity: 0, rotate: 45 }}
                      animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                      exit={{ scale: 1.1, opacity: 0 }}
                      className="absolute inset-1 bg-gradient-to-br from-orange-950 to-[#0c0303] border border-orange-500/30 rounded-xl flex flex-col items-center justify-center p-2 text-orange-500/30"
                    >
                      <div className="w-full h-full border border-orange-500/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                        <span className="text-xl animate-pulse">🐯</span>
                      </div>
                    </motion.div>
                  ) : tigerCard ? (
                    <motion.div 
                      key="card"
                      initial={{ rotateY: -180, scale: 0.6 }}
                      animate={{ rotateY: 0, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-1 bg-white text-zinc-900 rounded-xl shadow-lg flex flex-col justify-between p-2"
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col items-center leading-none">
                          <span className={`${tigerCard.suit.color} text-base xs:text-lg font-black font-serif`}>{tigerCard.label}</span>
                          <span className={`${tigerCard.suit.color} text-xs leading-none`}>{tigerCard.suit.symbol}</span>
                        </div>
                        <span className="text-[7px] bg-orange-50 text-orange-700 px-1 rounded font-bold uppercase scale-90">TGR</span>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <span className="text-2xl text-orange-500">🐯</span>
                        <span className={`text-lg ${tigerCard.suit.color} leading-none mt-0.5`}>{tigerCard.suit.symbol}</span>
                      </div>

                      <div className="flex justify-between items-end w-full leading-none rotate-180">
                        <div className="flex flex-col items-center leading-none">
                          <span className={`${tigerCard.suit.color} text-base xs:text-lg font-black font-serif`}>{tigerCard.label}</span>
                          <span className={`${tigerCard.suit.color} text-xs leading-none`}>{tigerCard.suit.symbol}</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-orange-900/15 py-4 space-y-1">
                      <span className="text-3xl opacity-30">🐯</span>
                      <span className="text-[8px] font-black tracking-widest uppercase">WAITING</span>
                    </div>
                  )}
                </AnimatePresence>

                {tigerCard && stage === 'result' && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-orange-650 text-white font-black px-2 py-0.5 rounded-full text-[8px] shadow border border-orange-400 z-10 whitespace-nowrap">
                    Val: {tigerCard.value}
                  </div>
                )}
              </div>

              {stage === 'result' && roundWinner === 'tiger' && (
                <div className="text-[8px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Winner
                </div>
              )}
            </div>

          </div>

          {/* Victory Result overlay card inside */}
          <AnimatePresence>
            {stage === 'result' && gameResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-20 flex flex-col justify-center items-center backdrop-blur-md bg-black/85 p-4 text-center space-y-3"
              >
                <div className="space-y-1">
                  {gameResult === 'win' && (
                    <div className="flex items-center justify-center gap-1 text-yellow-500">
                      <Sparkles className="animate-spin text-yellow-400" size={20} />
                      <h4 className="text-2xl sm:text-3xl font-serif font-black italic tracking-wider animate-bounce text-yellow-405 text-yellow-400">VICTORY</h4>
                      <Sparkles className="text-yellow-400" size={20} />
                    </div>
                  )}
                  {gameResult === 'tie' && (
                    <h4 className="text-2xl sm:text-3xl font-serif font-black text-amber-500 italic tracking-wider">TIE DRAW</h4>
                  )}
                  {gameResult === 'lose' && (
                    <h4 className="text-2xl sm:text-3xl font-sans font-extrabold text-zinc-500 uppercase tracking-tighter">DEFEAT</h4>
                  )}
                  
                  <p className="text-xs sm:text-sm font-bold text-white max-w-xs mx-auto">{payoutMessage}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
                    High: {roundWinner === 'tie' ? 'Tie Draw' : `${roundWinner?.toUpperCase()} (${roundWinner === 'dragon' ? dragonCard?.label : tigerCard?.label})`}
                  </p>
                </div>

                <button 
                  onClick={() => {
                    playSound('chip');
                    setStage('betting');
                    setDragonCard(null);
                    setTigerCard(null);
                  }}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  Confirm / Rebet
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTROLS & BETS MODULE */}
        <div className="shrink-0 w-full bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 flex flex-col space-y-2.5">
          
          {/* Section info / wager total */}
          <div className="flex justify-between items-center text-[9px] uppercase font-bold text-zinc-400 leading-tight">
            <span>Place Wager Stake</span>
            <span className="text-yellow-400 font-black tracking-tight font-mono text-xs">Total Wager: RS {bet}</span>
          </div>

          {/* Chips list horizontally */}
          <div className="flex items-center justify-between gap-1.5 bg-black/40 p-1 rounded-xl border border-zinc-900/60 overflow-x-auto no-scrollbar">
            {CHIPS.map((chipVal) => {
              const colors: Record<number, string> = {
                10: 'from-zinc-500 to-zinc-700 text-zinc-100 border-zinc-405/40',
                50: 'from-blue-600 to-blue-800 text-blue-100 border-blue-400/40',
                100: 'from-red-600 to-red-800 text-red-100 border-red-400/40',
                500: 'from-teal-600 to-teal-800 text-teal-100 border-teal-400/40',
                1000: 'from-purple-600 to-purple-800 text-purple-100 border-purple-400/40',
                5000: 'from-amber-600 to-amber-700 text-amber-100 border-yellow-400/40'
              };
              return (
                <button
                  key={chipVal}
                  disabled={playing}
                  onClick={() => addChipToBet(chipVal)}
                  className={`relative shrink-0 rounded-full w-9 h-9 xs:w-10 h-10 bg-gradient-to-br border flex flex-col items-center justify-center font-mono font-black shadow transition-all text-[10px] active:scale-90 disabled:opacity-45 select-none ${
                    colors[chipVal] || 'from-zinc-800 to-zinc-950 border-zinc-700'
                  }`}
                >
                  <span className="text-[5.5px] uppercase opacity-70 leading-none">Chip</span>
                  <span className="text-[10px] leading-none block font-bold mt-0.5">{chipVal}</span>
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-white/10 pointer-events-none" />
                </button>
              );
            })}
          </div>

          {/* Side Choices: Dragon, Tie, Tiger */}
          <div className="grid grid-cols-3 gap-2">
            
            {/* Dragon Betting Spot */}
            <button
              disabled={playing}
              onClick={() => { playSound('chip'); setSelection('dragon'); }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-2 transition-all h-13 relative overflow-hidden select-none ${
                selection === 'dragon' 
                  ? 'bg-red-950/20 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                  : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-805 hover:bg-zinc-900/50'
              }`}
            >
              <span className={`text-[8px] font-black uppercase tracking-wider ${selection === 'dragon' ? 'text-red-400' : 'text-zinc-500'}`}>
                Dragon
              </span>
              <span className="text-base filter drop-shadow">🐉</span>
              <span className="text-[8px] font-mono opacity-80 leading-none mt-0.5">1:1</span>
              {selection === 'dragon' && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {/* Tie Betting Spot */}
            <button
              disabled={playing}
              onClick={() => { playSound('chip'); setSelection('tie'); }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-2 transition-all h-13 relative overflow-hidden select-none ${
                selection === 'tie' 
                  ? 'bg-amber-950/15 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                  : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-805 hover:bg-zinc-900/50'
              }`}
            >
              <span className={`text-[8px] font-black uppercase tracking-wider ${selection === 'tie' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                Tie Spot
              </span>
              <span className="text-base filter drop-shadow">☯️</span>
              <span className="text-[8px] font-mono text-amber-400 font-bold leading-none mt-0.5">8:1</span>
              {selection === 'tie' && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>

            {/* Tiger Betting Spot */}
            <button
              disabled={playing}
              onClick={() => { playSound('chip'); setSelection('tiger'); }}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-2 transition-all h-13 relative overflow-hidden select-none ${
                selection === 'tiger' 
                  ? 'bg-orange-950/20 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]' 
                  : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:border-zinc-805 hover:bg-zinc-900/50'
              }`}
            >
              <span className={`text-[8px] font-black uppercase tracking-wider ${selection === 'tiger' ? 'text-orange-400' : 'text-zinc-500'}`}>
                Tiger
              </span>
              <span className="text-base filter drop-shadow">🐯</span>
              <span className="text-[8px] font-mono opacity-80 leading-none mt-0.5">1:1</span>
              {selection === 'tiger' && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>

          </div>

          {/* Quick Double + Reset + DEAL button in a compact single horizontal layout! */}
          <div className="flex gap-2 items-center">
            <button 
              disabled={playing}
              onClick={doubleBet}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 rounded-xl text-[9px] font-black uppercase border border-zinc-800 transition-all select-none flex items-center justify-center whitespace-nowrap active:scale-95 shrink-0"
            >
              Double
            </button>
            <button 
              disabled={playing}
              onClick={clearBet}
              className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 rounded-xl text-[9px] font-black uppercase border border-zinc-800 transition-all select-none flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 shrink-0"
            >
              Reset
            </button>
            
            <button 
              onClick={handleStartGame}
              disabled={playing}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs font-serif font-black italic uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 select-none active:scale-[0.98] ${
                playing 
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/20 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 via-amber-500 to-orange-650 hover:from-red-500 hover:to-orange-500 text-white cursor-pointer shadow-red-950/40 hover:shadow-lg'
              }`}
            >
              <Flame size={12} className={playing ? "" : "animate-bounce text-yellow-300"} />
              <span>
                {playing ? 'Dealing...' : `Bet: RS ${bet}`}
              </span>
            </button>
          </div>

          <div className="flex justify-between items-center text-[8.5px] text-zinc-500 uppercase font-mono tracking-wider px-1">
            <span>Bet On: {selection.toUpperCase()}</span>
            <span>Ref/Draw: 50%</span>
          </div>

        </div>

      </div>
    </div>
  );
};
