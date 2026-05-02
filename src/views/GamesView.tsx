import { motion, AnimatePresence } from "motion/react";
import { Gamepad2, Sparkles, Trophy, Users, Play, Radio, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { db } from "../lib/firebase";

// Game Components
import CoinFlip from "../components/CoinFlip";
import SpinWheel from "../components/SpinWheel";
import SwipeMaster from "../components/SwipeMaster";
import { LuckyChests } from "../components/LuckyChests";
import { DiceRoll } from "../components/DiceRoll";
import { ScratchCard } from "../components/ScratchCard";
import ThreeCardSlipper from "../components/ThreeCardSlipper";

export default function GamesView({ profile }: { profile: any }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setMinBet(snap.data().minBet || 10);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "system/config");
    });

    const unsubGames = onSnapshot(collection(db, "games"), (snap) => {
      const config: Record<string, any> = {};
      snap.docs.forEach(d => {
        config[d.id] = d.data();
      });
      setGamesConfig(config);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "games");
    });

    return () => {
      unsubGlobal();
      unsubGames();
    };
  }, []);

  const categories = [
    { name: "Classic", icon: Gamepad2, count: 2, color: "text-orange-500" },
    { name: "Skill", icon: Sparkles, count: 2, color: "text-purple-500" },
    { name: "Multiplayer", icon: Users, count: 0, color: "text-blue-500" },
  ];

  const games = [
    { 
      title: "Slipper Monte", 
      category: "Skill", 
      players: 342, 
      id: 'slipper', 
      image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9Z"/><path d="M9 22V12h6v10"/><path d="M2 13h20"/></svg>' 
    },
    { 
      title: "Spin Wheel", 
      category: "Classic", 
      players: 124, 
      id: 'spin', 
      image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.5L12 3l1 9.5h7L12 21l-1-9.5H4z"/></svg>' 
    },
    { 
      title: "Coin Flip", 
      category: "Classic", 
      players: 56, 
      id: 'coin', 
      image: "https://cdn-icons-png.flaticon.com/512/550/550614.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>' 
    },
    { 
      title: "Swipe Master", 
      category: "Skill", 
      players: 210, 
      id: 'swipe', 
      image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' 
    },
    { 
      title: "Lucky Chests", 
      category: "Classic", 
      players: 89, 
      id: 'chests', 
      image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>' 
    },
    { 
      title: "Dice Pro", 
      category: "Classic", 
      players: 156, 
      id: 'dice', 
      image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/></svg>' 
    },
    { 
      title: "Gold Scratch", 
      category: "Skill", 
      players: 243, 
      id: 'scratch', 
      image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>' 
    },
  ];

  const handleWin = async (amount: number) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(amount),
        winStreak: increment(1)
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      // Add transaction for history
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: amount,
        type: 'win',
        status: 'completed',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoss = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        winStreak: 0
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePenalty = async (amount: number) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(-amount)
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -amount,
        type: 'penalty',
        status: 'completed',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStreakBonus = async (amount: number) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(amount),
        winStreak: 0 // Reset streak after collecting bonus
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: amount,
        type: 'bonus',
        status: 'completed',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBet = async (amount: number) => {
    if (!profile || profile.balance < amount) return false;
    try {
      // Check Cycle Reset for penalties
      const lastReset = profile.lastCycleReset ? new Date(profile.lastCycleReset) : new Date();
      const now = new Date();
      const diffDays = (now.getTime() - lastReset.getTime()) / (1000 * 3600 * 24);
      
      const updates: any = {
        balance: increment(-amount),
        lossCount: increment(1)
      };

      if (diffDays >= 30) {
        updates.lossCount = 1; 
        updates.lastCycleReset = now.toISOString();
      }

      await updateDoc(doc(db, "users", profile.uid), updates).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      // Add transaction for history
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -amount,
        type: 'wager',
        status: 'completed',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {activeGame === 'slipper' && (
          <motion.div 
            key="slipper"
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <ThreeCardSlipper 
              onWin={handleWin} 
              onBet={handleBet} 
              onLoss={handleLoss}
              onPenalty={handlePenalty}
              onStreakBonus={handleStreakBonus}
              balance={profile?.balance || 0} 
              streak={profile?.winStreak || 0}
              losses={profile?.lossCount || 0}
              minBet={gamesConfig['slipper']?.minBet || minBet} 
              winMultiplier={gamesConfig['slipper']?.winMultiplier || 3}
              penaltyAmount={gamesConfig['slipper']?.penaltyAmount || 100}
            />
          </motion.div>
        )}

        {activeGame === 'coin' && (
          <motion.div 
            key="coin"
            initial={{ opacity: 0, x: 20, scale: 0.95 }} 
            animate={{ opacity: 1, x: 0, scale: 1 }} 
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <CoinFlip 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              minBet={gamesConfig['coin']?.minBet || minBet} 
              winRate={gamesConfig['coin']?.winRate || 50}
            />
          </motion.div>
        )}

        {activeGame === 'spin' && (
          <motion.div 
            key="spin"
            initial={{ opacity: 0, x: 20, scale: 0.95 }} 
            animate={{ opacity: 1, x: 0, scale: 1 }} 
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <SpinWheel 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              minBet={gamesConfig['spin']?.minBet || minBet} 
              winRate={gamesConfig['spin']?.winRate || 30}
              multiplier={gamesConfig['spin']?.multiplier || 5}
            />
          </motion.div>
        )}

        {activeGame === 'swipe' && (
          <motion.div 
            key="swipe"
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <SwipeMaster 
              betAmount={gamesConfig['swipe']?.minBet || minBet} 
              userBalance={profile?.balance || 0} 
              onWin={handleWin} 
              onBet={handleBet}
              winRate={gamesConfig['swipe']?.winRate || 40}
            />
          </motion.div>
        )}

        {activeGame === 'chests' && (
          <motion.div 
            key="chests"
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <LuckyChests 
              onWin={handleWin} 
              onLoss={(bet) => handleBet(bet)} 
              minBet={gamesConfig['chests']?.minBet || minBet} 
              balance={profile?.balance || 0} 
              winRate={gamesConfig['chests']?.winRate || 33}
              multiplier={gamesConfig['chests']?.multiplier || 3}
            />
          </motion.div>
        )}

        {activeGame === 'dice' && (
          <motion.div 
            key="dice"
            initial={{ opacity: 0, rotateY: 90 }} 
            animate={{ opacity: 1, rotateY: 0 }} 
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.4 }}
            className="p-4 space-y-4 [perspective:1000px]"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <DiceRoll 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              minBet={gamesConfig['dice']?.minBet || minBet} 
              winRate={gamesConfig['dice']?.winRate || 45}
              multiplier={gamesConfig['dice']?.multiplier || 2}
            />
          </motion.div>
        )}

        {activeGame === 'scratch' && (
          <motion.div 
            key="scratch"
            initial={{ opacity: 0, scale: 1.1 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
          >
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-black transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <ScratchCard 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              minBet={gamesConfig['scratch']?.minBet || minBet} 
              winRate={gamesConfig['scratch']?.winRate || 40}
              multiplier={gamesConfig['scratch']?.multiplier || 4}
            />
          </motion.div>
        )}

        {!activeGame && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-6"
          >
            <header className="space-y-1">
              <h2 className="text-3xl font-black italic uppercase">Game Lobby</h2>
              <p className="text-neutral-500 text-sm font-medium">Join over 2,000 players online</p>
            </header>

            {/* Categories */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide py-1">
              {categories.map((cat) => (
                <button key={cat.name} className="flex-shrink-0 bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-3 flex flex-col items-start gap-2 hover:border-neutral-200 active:scale-95 transition-all">
                  <cat.icon size={20} className={cat.color} />
                  <div className="text-left">
                    <p className="font-bold text-xs uppercase text-neutral-900">{cat.name}</p>
                    <p className="text-[10px] text-neutral-400">{cat.count} AVAILABLE</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-2 gap-4 pb-12">
              {games.map((game) => (
                <motion.div 
                  key={game.id} 
                  layoutId={game.id}
                  onClick={() => setActiveGame(game.id)}
                  className="bg-neutral-50 border border-neutral-100 rounded-3xl p-4 space-y-4 hover:border-orange-500/30 transition-colors group cursor-pointer shadow-sm"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-square border border-neutral-100 shadow-md">
                    <img 
                      src={game.image} 
                      alt={game.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 glass bg-white/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20">
                        <Play size={10} className="fill-black text-black" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-black">Play Now</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm truncate uppercase tracking-tight text-neutral-900">{game.title}</h5>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">Min Bet: RS {gamesConfig[game.id]?.minBet || minBet}</span>
                      <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                        <Users size={10} /> {game.players}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

