import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus, Minus, CreditCard, Award, Info } from 'lucide-react';
import { playSound, stopSound } from '../lib/sounds';

interface TeenPattiProps {
  balance: number;
  onWin: (amount: number) => void;
  onBet: (amount: number) => void;
  onExit: () => void;
  winRate?: number;
  minBet?: number;
  multiplier?: number;
}

type Card = { suit: string; rank: string; value: number };
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<string, number> = { 
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 
    'J': 11, 'Q': 12, 'K': 13, 'A': 14 
};

export const TeenPatti: React.FC<TeenPattiProps> = ({ 
  balance, onWin, onBet, onExit, 
  winRate = 45, minBet = 10, multiplier = 2 
}) => {
  const [bet, setBet] = useState(minBet);
  const [playing, setPlaying] = useState(false);
  const [stage, setStage] = useState<'betting' | 'dealing' | 'revealed'>('betting');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);

  const getHandScore = (cards: Card[]) => {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const ranks = sorted.map(c => c.value);
    const suits = sorted.map(c => c.suit);
    
    const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
    const isPureSequence = (ranks[0] === ranks[1] + 1 && ranks[1] === ranks[2] + 1) && (suits[0] === suits[1] && suits[1] === suits[2]);
    const isSequence = (ranks[0] === ranks[1] + 1 && ranks[1] === ranks[2] + 1);
    const isColor = (suits[0] === suits[1] && suits[1] === suits[2]);
    const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

    if (isTrail) return 600 + ranks[0];
    if (isPureSequence) return 500 + ranks[0];
    if (isSequence) return 400 + ranks[0];
    if (isColor) return 300 + ranks[0];
    if (isPair) return 200 + (ranks[0] === ranks[1] ? ranks[0] : ranks[1]);
    return 100 + ranks[0];
  };

  const dealCards = () => {
    if (balance < bet || playing) return;
    
    onBet(bet);
    setPlaying(true);
    setStage('dealing');
    setResult(null);
    playSound('chip');

    const generateHand = () => {
        const hand: Card[] = [];
        while(hand.length < 3) {
            const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
            const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
            if (!hand.some(c => c.suit === suit && c.rank === rank)) {
                hand.push({ suit, rank, value: RANK_VALUES[rank] });
            }
        }
        return hand;
    };

    // Logic for winRate rigging
    let playerHand = generateHand();
    let dealerHand = generateHand();
    
    const isWin = Math.random() * 100 < winRate;
    
    // Simple rigging: if winRate says win, make sure playerHand > dealerHand
    for (let i = 0; i < 20; i++) {
        const pScore = getHandScore(playerHand);
        const dScore = getHandScore(dealerHand);
        if (isWin && pScore > dScore) break;
        if (!isWin && dScore > pScore) break;
        playerHand = generateHand();
        dealerHand = generateHand();
    }

    setPlayerCards(playerHand);
    setDealerCards(dealerHand);

    setTimeout(() => {
      setStage('revealed');
      const pScore = getHandScore(playerHand);
      const dScore = getHandScore(dealerHand);
      
      if (pScore > dScore) {
        setResult('win');
        onWin(bet * multiplier);
        playSound('win');
      } else if (dScore > pScore) {
        setResult('lose');
        playSound('lose');
      } else {
        setResult('tie');
        onWin(bet); // Refund on tie
      }
      setPlaying(false);
    }, 2000);
  };

  const getHandName = (cards: Card[]) => {
    const score = getHandScore(cards);
    if (score >= 600) return 'Trail';
    if (score >= 500) return 'Pure Sequence';
    if (score >= 400) return 'Sequence';
    if (score >= 300) return 'Color';
    if (score >= 200) return 'Pair';
    return 'High Card';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a2e1f] text-white font-sans overflow-hidden relative">
      {/* Casino Table Texture */}
      <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1596838132731-dd36a19f04aa?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
      <div className="absolute inset-0 z-1 bg-[radial-gradient(circle_at_50%_40%,_transparent_20%,_rgba(0,0,0,0.6)_90%)]" />
      
      {/* Table Border */}
      <div className="absolute inset-4 border-[12px] border-yellow-900/30 rounded-[3rem] pointer-events-none z-1 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]" />

      <header className="flex items-center justify-between px-6 h-20 bg-black/40 border-b border-yellow-500/20 backdrop-blur-md flex-shrink-0 z-50">
        <button onClick={onExit} className="p-2.5 bg-white/5 text-white/50 rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-90">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
            <span className="text-yellow-500 font-black italic tracking-tighter text-2xl uppercase drop-shadow-lg">Teen Patti Elite</span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/60">Grand Casino</span>
        </div>
        <div className="bg-black/60 px-4 py-2 rounded-2xl border border-yellow-500/30 backdrop-blur-xl shadow-inner">
          <span className="text-yellow-400 font-black text-sm tracking-tight">RS {balance.toFixed(0)}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-between p-8 relative z-10">
        {/* Dealer Hand */}
        <div className="w-full flex flex-col items-center gap-6">
           <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-white/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 drop-shadow-md">The Dealer</span>
              <div className="h-px w-12 bg-white/20" />
           </div>
           <div className="flex gap-4 h-32 sm:h-40">
             {dealerCards.length > 0 ? (
               dealerCards.map((card, i) => (
                 <CardView key={i} card={card} hidden={stage === 'revealed' ? false : true} delay={i * 0.1} />
               ))
             ) : (
                [0, 1, 2].map(i => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-20 sm:w-28 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm" 
                    />
                ))
             )}
           </div>
           <AnimatePresence>
                {stage === 'revealed' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-1 bg-black/40 rounded-full border border-white/10">
                        <span className="text-[10px] font-black uppercase text-white/60 tracking-wider font-mono">{getHandName(dealerCards)}</span>
                    </motion.div>
                )}
           </AnimatePresence>
        </div>

        {/* Center Info */}
        <div className="text-center relative">
           <AnimatePresence mode="wait">
             {result && (
               <motion.div 
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className={`text-6xl font-black italic uppercase tracking-tighter drop-shadow-2xl ${
                   result === 'win' ? 'text-yellow-400' : result === 'tie' ? 'text-blue-400' : 'text-red-500'
                 }`}
               >
                 {result === 'win' ? 'Winner!' : result === 'tie' ? 'Tie!' : 'Dealer Wins'}
               </motion.div>
             )}
             {!result && stage === 'dealing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 font-mono">Shuffling Deck...</span>
                </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4">
           {stage === 'revealed' && (
             <span className="text-xs font-black uppercase text-yellow-400 tracking-wider h-4">{getHandName(playerCards)}</span>
           )}
           <div className="flex gap-4 h-40">
             {playerCards.map((card, i) => (
               <CardView key={i} card={card} delay={0.5 + i * 0.1} />
             ))}
             {playerCards.length === 0 && [0,1,2].map(i => (
                <div key={i} className="w-28 rounded-2xl bg-white/5 border border-white/10" />
             ))}
           </div>
           <div className="flex items-center gap-2 mt-2">
              <div className="h-px w-12 bg-yellow-500/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/60 font-mono italic">Your Hand</span>
              <div className="h-px w-12 bg-yellow-500/20" />
           </div>
        </div>

        {/* Betting Controls */}
        <div className="w-full max-w-sm space-y-6 pb-6">
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-[2rem] border border-white/5 shadow-2xl">
                 <button onClick={() => setBet(Math.max(minBet, bet - 10))} disabled={playing} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">-</button>
                 <div className="text-center">
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest block mb-1">Game Ante</span>
                    <span className="text-2xl font-black italic">RS {bet}</span>
                 </div>
                 <button onClick={() => setBet(bet + 10)} disabled={playing} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all">+</button>
            </div>

            <button 
              onClick={dealCards}
              disabled={playing || balance < bet}
              className="w-full py-5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black rounded-[2rem] font-black italic text-xl uppercase tracking-[0.2em] shadow-xl shadow-yellow-900/40 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale mb-2"
            >
              {stage === 'betting' || stage === 'revealed' ? 'Deal Cards' : 'Dealing...'}
            </button>
        </div>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(16,185,129,0.1),_transparent_70%)] pointer-events-none" />
    </div>
  );
};

const CardView: React.FC<{ card: Card; hidden?: boolean; delay: number }> = ({ card, hidden, delay }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
        <motion.div 
            initial={{ y: 50, opacity: 0, rotateY: 180 }}
            animate={{ y: 0, opacity: 1, rotateY: hidden ? 180 : 0 }}
            transition={{ duration: 0.5, delay, ease: "backOut" }}
            className="w-20 sm:w-28 h-full bg-white rounded-xl sm:rounded-2xl shadow-xl flex flex-col items-center justify-between p-2 sm:p-4 text-black relative group preserve-3d"
        >
            <div className={`absolute inset-0 bg-red-800 rounded-xl sm:rounded-2xl border-4 border-white backface-hidden ${hidden ? '' : 'hidden'}`}>
                <div className="w-full h-full border-2 border-white/20 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center opacity-20">
                        <CreditCard size={16} className="text-white" />
                    </div>
                </div>
            </div>

            {!hidden && (
                <>
                    <div className="w-full text-left leading-none">
                        <span className={`text-lg sm:text-2xl font-black block ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</span>
                        <span className={`text-xs ${isRed ? 'text-red-500' : 'text-black/60'}`}>{card.suit}</span>
                    </div>
                    <div className={`text-3xl sm:text-5xl ${isRed ? 'text-red-500' : 'text-black'}`}>{card.suit}</div>
                    <div className="w-full text-right rotate-180 leading-none">
                        <span className={`text-lg sm:text-2xl font-black block ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</span>
                        <span className={`text-xs ${isRed ? 'text-red-500' : 'text-black/30'}`}>{card.suit}</span>
                    </div>
                </>
            )}
        </motion.div>
    );
};
