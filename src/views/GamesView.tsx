import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, 
  Sparkles, 
  Trophy, 
  Users, 
  Play, 
  Radio, 
  ChevronLeft, 
  Flame, 
  Dice5, 
  LayoutGrid, 
  Dices, 
  Trophy as TrophyIcon, 
  Star, 
  ThumbsUp,
  Volume2,
  Mail,
  Gift,
  UserPlus,
  Coins,
  Gem,
  ExternalLink,
  MessageCircleMore
} from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

// Game Components
import CoinFlip from "../components/CoinFlip";
import SpinWheel from "../components/SpinWheel";
import SwipeMaster from "../components/SwipeMaster";
import { LuckyChests } from "../components/LuckyChests";
import { DiceRoll } from "../components/DiceRoll";
import ThreeCardSlipper from "../components/ThreeCardSlipper";
import { Aviator } from "../components/Aviator";
import { BannerSlider } from "../components/BannerSlider";
import { PlinkoPro } from "../components/PlinkoPro";
import { MinesFinder } from "../components/MinesFinder";
import { GoldScratch } from "../components/GoldScratch";

export default function GamesView({ profile }: { profile: any }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [arcadeGames, setArcadeGames] = useState<any[]>([]);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMinBet(data.minBet || 10);

        const moreGames: any[] = [];
        for (let i = 1; i <= 10; i++) {
          const title = data[`moreGame${i}Title`];
          const url = data[`moreGame${i}Url`];
          const image = data[`moreGame${i}Thumbnail`] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop";
          const time = parseInt(data[`moreGame${i}Time`]) || 60;
          const reward = parseFloat(data[`moreGame${i}Reward`]) || 10;
          
          if (url) {
            moreGames.push({ id: `arcade_${i}`, title, url, image, time, reward, category: "Arcade" });
          }
        }
        
        // Add defaults if none configured
        if (moreGames.length === 0) {
          moreGames.push(
            { id: 'web_cyber', title: "Cyber City", url: "https://www.crazygames.com/embed/block-rush", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop", time: 60, reward: 25, category: "Arcade" },
            { id: 'web_drift', title: "Drift King", url: "https://www.crazygames.com/embed/cyber-surfer", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop", time: 45, reward: 20, category: "Arcade" }
          );
        }
        setArcadeGames(moreGames);
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
    { name: "All", icon: LayoutGrid, color: "text-white" },
    { name: "Hot", icon: Flame, color: "text-orange-500" },
    { name: "Slot", icon: LayoutGrid, color: "text-yellow-500" },
    { name: "Blockchain", icon: Dice5, color: "text-blue-500" },
    { name: "Cards", icon: Dices, color: "text-purple-500" },
    { name: "Sports", icon: TrophyIcon, color: "text-green-500" },
    { name: "Arcade", icon: Gamepad2, color: "text-red-500" },
  ];

  const quickLinks = [
    { name: "Invitation", icon: UserPlus, color: "from-green-400 to-green-600" },
    { name: "Newplayer", icon: Gift, color: "from-blue-400 to-blue-600" },
    { name: "Deposit", icon: Coins, color: "from-yellow-400 to-yellow-600" },
    { name: "Spins", icon: Radio, color: "from-orange-400 to-orange-600" },
    { name: "VIP", icon: Gem, color: "from-purple-400 to-purple-600" },
  ];

  const defaultGamesMeta: Record<string, any> = {
    slipper: { title: "Slipper Monte", category: "Cards", image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop" },
    spin: { title: "Spin Wheel", category: "Slot", image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
    coin: { title: "Coin Flip", category: "Blockchain", image: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778146981/game-coin-a-good-investment_lqjtaj.webp" },
    swipe: { title: "Swipe Master", category: "Hot", image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" },
    chests: { title: "Lucky Chests", category: "Slot", image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" },
    dice: { title: "Dice Pro", category: "Blockchain", image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png" },
    scratch: { title: "Gold Scratch", category: "Slot", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop" },
    aviator: { title: "Aviator", category: "Hot", image: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778147101/aviator_banner_z0j7v8.png" },
    plinko: { title: "Plinko Pro", category: "Slot", image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=400&auto=format&fit=crop" },
    mines: { title: "Mines Finder", category: "Hot", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=400&auto=format&fit=crop" },
    web_cyber: { title: "Cyber City", category: "Arcade", url: "https://www.crazygames.com/embed/block-rush", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop", time: 60, reward: 25 },
    web_drift: { title: "Drift King", category: "Arcade", url: "https://www.crazygames.com/embed/cyber-surfer", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop", time: 45, reward: 20 },
  };

  const displayedGames = [...gamesList, ...arcadeGames].map(g => ({
    ...g,
    title: g.title || g.name || defaultGamesMeta[g.id]?.title || g.id,
    category: g.category || defaultGamesMeta[g.id]?.category || "Slot",
    image: g.image || defaultGamesMeta[g.id]?.image || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop",
    players: Math.floor(Math.random() * 500) + 100
  }));

  const filteredGames = displayedGames.filter(g => 
    activeCategory === "All" || 
    g.category === activeCategory || 
    (activeCategory === "Hot" && (g.id === "aviator" || g.id === "mines" || g.id === "swipe" || g.id === "slipper"))
  );

  const handleWin = async (amount: number) => {
    if (!profile) return;
    let finalAmount = amount;
    const now = new Date();
    const isDoubleActive = profile.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > now;
    if (isDoubleActive) finalAmount *= (profile.rewardMultiplier || 2);

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(finalAmount),
        winStreak: increment(1)
      });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: finalAmount,
        type: 'win',
        status: 'completed',
        createdAt: new Date().toISOString(),
        note: isDoubleActive ? "Double Rewards Applied" : ""
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoss = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), { winStreak: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePenalty = async (amount: number) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), { balance: increment(-amount) });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -amount,
        type: 'penalty',
        status: 'completed',
        createdAt: new Date().toISOString()
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
        winStreak: 0
      });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: amount,
        type: 'bonus',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBet = async (amount: number) => {
    if (!profile || profile.balance < amount) return false;
    try {
      const updates: any = { balance: increment(-amount), lossCount: increment(1) };
      await updateDoc(doc(db, "users", profile.uid), updates);
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -amount,
        type: 'wager',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleLaunchWebGame = async (game: any) => {
    if (!profile) return;
    try {
      const userId = profile.uid || profile.id;
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        arcadeSession: {
          title: game.title,
          startTime: new Date().toISOString(),
          duration: game.time,
          reward: game.reward,
          status: 'active'
        }
      });
      window.open(game.url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  const isFullScreen = activeGame === 'aviator' || activeGame === 'mines' || activeGame === 'plinko' || activeGame === 'scratch' || activeGame === 'coin';

  return (
    <div className={`relative w-full h-full bg-[#1b2a5c] ${isFullScreen ? 'overflow-hidden' : ''} text-white`}>
      <AnimatePresence mode="wait">
        {activeGame === 'slipper' && (
          <motion.div key="slipper" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[100] bg-[#050B14] p-4 flex flex-col">
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-white transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <div className="flex-1 overflow-y-auto">
              <ThreeCardSlipper onWin={handleWin} onBet={handleBet} onLoss={handleLoss} onPenalty={handlePenalty} onStreakBonus={handleStreakBonus} balance={profile?.balance || 0} streak={profile?.winStreak || 0} losses={profile?.lossCount || 0} minBet={gamesConfig['slipper']?.minBet || minBet} winMultiplier={gamesConfig['slipper']?.winMultiplier || 3} penaltyAmount={gamesConfig['slipper']?.penaltyAmount || 100} />
            </div>
          </motion.div>
        )}

        {/* ... Other game components handleFullScreen similarly if needed ... */}
        {activeGame === 'coin' && (
          <motion.div key="coin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050B14]">
            <CoinFlip onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} minBet={gamesConfig['coin']?.minBet || minBet} winRate={gamesConfig['coin']?.winRate || 50} onExit={() => setActiveGame(null)} />
          </motion.div>
        )}

        {activeGame === 'spin' && (
          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0E11] p-4 flex flex-col">
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-white transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <div className="flex-1 overflow-y-auto">
               <SpinWheel onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} minBet={gamesConfig['spin']?.minBet || minBet} winRate={gamesConfig['spin']?.winRate || 30} multiplier={gamesConfig['spin']?.multiplier || 5} />
            </div>
          </motion.div>
        )}

        {activeGame === 'swipe' && (
          <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0E11] p-4 flex flex-col">
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 text-neutral-400 font-bold uppercase text-xs mb-4 hover:text-white transition-colors group">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Lobby
            </button>
            <div className="flex-1 overflow-y-auto">
               <SwipeMaster betAmount={gamesConfig['swipe']?.minBet || minBet} userBalance={profile?.balance || 0} onWin={handleWin} onBet={handleBet} winRate={gamesConfig['swipe']?.winRate || 40} />
            </div>
          </motion.div>
        )}

        {/* ... LuckyChests, DiceRoll, GoldScratch, Aviator, PlinkoPro, MinesFinder all use fixed inset-0 already ... */}
        {activeGame === 'chests' && (
          <motion.div key="chests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0E11]">
            <LuckyChests onWin={handleWin} onLoss={(bet) => handleBet(bet)} minBet={gamesConfig['chests']?.minBet || minBet} balance={profile?.balance || 0} winRate={gamesConfig['chests']?.winRate || 33} multiplier={gamesConfig['chests']?.multiplier || 3} onExit={() => setActiveGame(null)} />
          </motion.div>
        )}

        {activeGame === 'dice' && (
          <motion.div key="dice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0E11]">
            <DiceRoll onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} minBet={gamesConfig['dice']?.minBet || minBet} winRate={gamesConfig['dice']?.winRate || 45} multiplier={gamesConfig['dice']?.multiplier || 2} onExit={() => setActiveGame(null)} />
          </motion.div>
        )}

        {activeGame === 'scratch' && (
          <motion.div key="scratch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050B14]">
            <GoldScratch onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} minBet={gamesConfig['scratch']?.minBet || minBet} winRate={gamesConfig['scratch']?.winRate || 40} multiplier={gamesConfig['scratch']?.multiplier || 4} />
          </motion.div>
        )}

        {activeGame === 'aviator' && (
          <motion.div key="aviator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#101112]">
            <Aviator onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} />
          </motion.div>
        )}

        {activeGame === 'plinko' && (
          <motion.div key="plinko" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050B14]">
            <PlinkoPro onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} minBet={gamesConfig['plinko']?.minBet || minBet} winRate={gamesConfig['plinko']?.winRate || 45} />
          </motion.div>
        )}

        {activeGame === 'mines' && (
          <motion.div key="mines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0E11]">
            <MinesFinder onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} minBet={gamesConfig['mines']?.minBet || minBet} winRate={gamesConfig['mines']?.winRate || 70} />
          </motion.div>
        )}

        {!activeGame && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col pb-24 h-full">
            {/* Quick Links Row */}
            <div className="grid grid-cols-5 gap-2 px-4 py-6 bg-[#1a2c5a]">
               {quickLinks.map((link) => (
                 <div key={link.name} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${link.color} flex items-center justify-center border-4 border-[#14254f] shadow-lg`}>
                       <link.icon className="text-white" size={24} />
                    </div>
                    <span className="text-[9px] font-bold text-white/80 uppercase tracking-tighter text-center">{link.name}</span>
                 </div>
               ))}
            </div>

            {/* Banner Section */}
            <div className="px-4">
               <BannerSlider />
            </div>

            {/* Announcement Bar */}
            <div className="mt-4 px-4">
              <div className="bg-blue-900/40 border border-blue-400/20 rounded-full px-4 py-2 flex items-center gap-3 overflow-hidden">
                 <Volume2 size={16} className="text-yellow-500 shrink-0" />
                 <div className="flex-1 text-[11px] font-bold text-blue-200 whitespace-nowrap animate-marquee">
                    Welcome to 988win! Invite friends to earn Rs 5,000 bonus daily. New players get up to Rs 8,888 on deposit!
                 </div>
                 <Mail size={16} className="text-white/60 shrink-0" />
              </div>
            </div>

            {/* Category Tab Row */}
            <div className="mt-8 px-4 flex gap-6 overflow-x-auto scrollbar-hide border-b border-white/5 pb-2">
              {categories.map((cat) => (
                <button 
                  key={cat.name} 
                  onClick={() => setActiveCategory(cat.name)} 
                  className={`flex flex-col items-center gap-2 min-w-[60px] pb-2 relative transition-all ${
                    activeCategory === cat.name ? 'scale-110 opacity-100' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  <cat.icon size={24} className={activeCategory === cat.name ? 'text-orange-500' : 'text-white'} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeCategory === cat.name ? 'text-orange-500' : 'text-white'}`}>
                    {cat.name}
                  </span>
                  {activeCategory === cat.name && (
                    <motion.div layoutId="activeCat" className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Section Header */}
            <div className="px-4 mt-8 mb-4 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  {activeCategory === "Hot" ? <Flame className="text-orange-500" size={20} fill="currentColor" /> : <LayoutGrid className="text-blue-400" size={20} />}
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">{activeCategory}</h2>
               </div>
               <button onClick={() => setActiveCategory("All")} className="text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-white transition-colors">All &gt;</button>
            </div>

            {/* Enhanced Game Grid (2 Columns) */}
            <div className="grid grid-cols-2 gap-3 px-4 pb-24">
              {filteredGames.map((game, idx) => {
                const config = gamesConfig[game.id] || {};
                const displayImage = config.image || game.image;
                return (
                  <motion.div 
                    key={game.id} 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.05 }} 
                    onClick={() => game.url ? handleLaunchWebGame(game) : setActiveGame(game.id)} 
                    className="relative group cursor-pointer"
                  >
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-[#14254f] shadow-xl relative">
                      <img 
                        src={displayImage} 
                        alt={game.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                      
                      {/* Badges from Screenshot */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <div className="bg-orange-500 flex items-center justify-center p-1 rounded-sm shadow-md">
                           <ThumbsUp size={10} className="text-white" fill="currentColor" />
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <div className="bg-black/40 backdrop-blur-md flex items-center justify-center p-1 rounded-full border border-white/20">
                           <Star size={10} className="text-yellow-500" fill="currentColor" />
                        </div>
                      </div>

                      {/* Game Title Bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md p-2 text-center border-t border-white/5 space-y-1">
                         <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate leading-none text-white">{game.title}</p>
                            {game.category === "Arcade" && (
                              <div className="mt-1 flex items-center justify-center gap-2 border border-white/10 bg-black/20 px-2 py-0.5 rounded-sm">
                                <span className="text-[7px] font-black text-orange-500 uppercase tracking-tighter">{game.time}S</span>
                                <div className="w-[1px] h-2 bg-white/10" />
                                <span className="text-[7px] font-black text-green-400 uppercase tracking-tighter">RS {game.reward}</span>
                              </div>
                            )}
                         </div>
                         <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest leading-none">{game.category}</p>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                           <Play size={20} className="fill-black text-black ml-1" />
                         </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Floating Action Button (WhatsApp) */}
            <div className="fixed right-4 bottom-28 z-40 space-y-4">
               <motion.button
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20 relative"
               >
                 <MessageCircleMore className="text-white" size={32} />
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">2</span>
               </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

