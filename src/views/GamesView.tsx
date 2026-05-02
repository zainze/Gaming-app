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
import { Aviator } from "../components/Aviator";
import { BannerSlider } from "../components/BannerSlider";
import { PlinkoPro } from "../components/PlinkoPro";
import { MinesFinder } from "../components/MinesFinder";

export default function GamesView({ profile }: { profile: any }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});

  const [gamesList, setGamesList] = useState<any[]>([]);

  useEffect(() => {
    // ... existing system config unsub omitted for brevity or I should just include it ...
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setMinBet(snap.data().minBet || 10);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "system/config");
    });

    const unsubGames = onSnapshot(collection(db, "games"), (snap) => {
      const config: Record<string, any> = {};
      const list: any[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        config[d.id] = data;
        if (data.active !== false) {
          list.push({ id: d.id, ...data });
        }
      });
      setGamesConfig(config);
      setGamesList(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "games");
    });

    return () => {
      unsubGlobal();
      unsubGames();
    };
  }, []);

  const categories = [
    { name: "All", icon: Gamepad2, color: "text-orange-500" },
    { name: "Skill", icon: Users, color: "text-blue-500" },
  ];

  // Merge hardcoded meta if needed, but prefer Firestore
  const defaultGamesMeta: Record<string, any> = {
    slipper: { title: "Slipper Monte", category: "Skill", image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop" },
    spin: { title: "Spin Wheel", category: "Classic", image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
    coin: { title: "Coin Flip", category: "Classic", image: "https://cdn-icons-png.flaticon.com/512/550/550614.png" },
    swipe: { title: "Swipe Master", category: "Skill", image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" },
    chests: { title: "Lucky Chests", category: "Classic", image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" },
    dice: { title: "Dice Pro", category: "Classic", image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png" },
    scratch: { title: "Gold Scratch", category: "Skill", image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
    aviator: { title: "Aviator", category: "Classic", image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop" },
    plinko: { title: "Plinko Pro", category: "Skill", image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=400&auto=format&fit=crop" },
    mines: { title: "Mines Finder", category: "Skill", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=400&auto=format&fit=crop" },
  };

  const [activeCategory, setActiveCategory] = useState("All");

  const displayedGames = gamesList.map(g => ({
    ...g,
    title: g.name || defaultGamesMeta[g.id]?.title || g.id,
    category: g.category || defaultGamesMeta[g.id]?.category || "Classic",
    image: g.image || defaultGamesMeta[g.id]?.image || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop",
    players: Math.floor(Math.random() * 500) + 100 // Randomized live players for effect
  }));

  const filteredGames = displayedGames.filter(g => 
    activeCategory === "All" || g.category === activeCategory
  );


  const handleWin = async (amount: number) => {
    if (!profile) return;
    
    let finalAmount = amount;
    const now = new Date();
    const isDoubleActive = profile.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > now;
    
    if (isDoubleActive) {
      finalAmount *= (profile.rewardMultiplier || 2);
    }

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(finalAmount),
        winStreak: increment(1)
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      // Add transaction for history
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: finalAmount,
        type: 'win',
        status: 'completed',
        createdAt: new Date().toISOString(),
        note: isDoubleActive ? "Double Rewards Applied" : undefined
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

  const isFullScreen = activeGame === 'aviator' || activeGame === 'mines' || activeGame === 'plinko';

  return (
    <div className={`relative w-full h-full ${isFullScreen ? 'overflow-hidden' : ''}`}>
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
            
            {profile?.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > new Date() && (
              <motion.div 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-orange-500 text-white p-3 rounded-2xl flex items-center justify-between mb-4 shadow-lg shadow-orange-500/20"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">2X Multiplier Applied!</span>
                </div>
                <div className="text-[8px] font-bold bg-black/20 px-2 py-0.5 rounded text-white/90">DOUBLE LOOT</div>
              </motion.div>
            )}

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

        {activeGame === 'aviator' && (
          <motion.div 
            key="aviator"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white"
          >
            <div className="h-full flex flex-col pointer-events-auto">
              <div className="p-4 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white">
                <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-black uppercase text-[10px] hover:text-black transition-colors">
                  <ChevronLeft size={16} /> Exit Game
                </button>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Active Game</span>
                   <span className="text-xs font-black italic">Aviator Pro</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-white">
                <Aviator 
                  onWin={handleWin} 
                  onBet={handleBet} 
                  balance={profile?.balance || 0} 
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeGame === 'plinko' && (
          <motion.div 
            key="plinko"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white"
          >
             <div className="h-full flex flex-col pointer-events-auto">
              <div className="p-4 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white">
                <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-black uppercase text-[10px] hover:text-black transition-colors">
                  <ChevronLeft size={16} /> Exit Game
                </button>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Active Game</span>
                   <span className="text-xs font-black italic">Plinko Pro</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-white">
                <div className="p-4">
                  <PlinkoPro 
                    onWin={handleWin} 
                    onLoss={handleLoss} 
                    balance={profile?.balance || 0} 
                    config={gamesConfig['plinko'] || { minBet: 10, winRate: 45 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeGame === 'mines' && (
          <motion.div 
            key="mines"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white"
          >
             <div className="h-full flex flex-col pointer-events-auto">
              <div className="p-4 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white">
                <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-black uppercase text-[10px] hover:text-black transition-colors">
                  <ChevronLeft size={16} /> Exit Game
                </button>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Active Game</span>
                   <span className="text-xs font-black italic">Mines Finder</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-white">
                <div className="p-4">
                  <MinesFinder 
                    onWin={handleWin} 
                    onLoss={handleLoss} 
                    balance={profile?.balance || 0} 
                    config={gamesConfig['mines'] || { minBet: 10, winRate: 35 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {!activeGame && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
          >
            {/* Categories at Top */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button 
                  key={cat.name} 
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex-shrink-0 border rounded-xl px-4 py-2 flex items-center gap-2 active:scale-95 transition-all ${
                    activeCategory === cat.name 
                      ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <cat.icon size={14} className={activeCategory === cat.name ? 'text-white' : cat.color} />
                  <p className="font-black text-[10px] uppercase tracking-widest">{cat.name}</p>
                </button>
              ))}
            </div>

            <header className="space-y-1">
              <h2 className="text-3xl font-black italic uppercase">Game Lobby</h2>
            </header>

            <BannerSlider />

            {profile?.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > new Date() && (
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-orange-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase italic italic">2X Rewards Active</p>
                    <p className="text-[8px] font-bold uppercase opacity-80">All winnings are currently being doubled!</p>
                  </div>
                </div>
                <div className="bg-black/20 px-3 py-1 rounded-full text-[8px] font-black uppercase">Boosted</div>
              </div>
            )}

            {/* Game Grid */}
            <div className="grid grid-cols-2 gap-4 pb-12">
              {filteredGames.map((game) => {
                const config = gamesConfig[game.id] || {};
                const displayImage = config.image || game.image;
                
                return (
                  <motion.div 
                    key={game.id} 
                    layoutId={game.id}
                    onClick={() => setActiveGame(game.id)}
                    className="bg-neutral-50 border border-neutral-100 rounded-3xl p-4 space-y-4 hover:border-orange-500/30 transition-colors group cursor-pointer shadow-sm"
                  >
                    <div className="relative rounded-2xl overflow-hidden aspect-square border border-neutral-100 shadow-md">
                      <img 
                        src={displayImage} 
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
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Min Bet: RS {config.minBet || minBet}</span>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                          <Users size={10} /> {game.players}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

