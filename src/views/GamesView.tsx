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
  MessageCircleMore,
  User
} from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc, increment, addDoc, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import InvestmentView from "./InvestmentView";
import ReferralView from "./ReferralView";
import NewPlayerView from "./NewPlayerView";
import { setSoundActiveGameId } from "../lib/sounds";

// Game Components
import CoinFlip from "../components/CoinFlip";
import SpinWheel from "../components/SpinWheel";
import SwipeMaster from "../components/SwipeMaster";
import { LuckyChests } from "../components/LuckyChests";
import { DiceRoll } from "../components/DiceRoll";
import ThreeCardSlipper from "../components/ThreeCardSlipper";
import { Aviator } from "../components/Aviator";
import { RocketCrash } from "../components/RocketCrash";
import { MoonCrash } from "../components/MoonCrash";
import { FruitSlots } from "../components/FruitSlots";
import { TreasureHunt } from "../components/TreasureHunt";
import { WheelOfFortune } from "../components/WheelOfFortune";
import { ColorMatch } from "../components/ColorMatch";
import { FruitNinja } from "../components/FruitNinja";
import { TeenPatti } from "../components/TeenPatti";
import { BannerSlider } from "../components/BannerSlider";
import { PlinkoPro } from "../components/PlinkoPro";
import { MinesFinder } from "../components/MinesFinder";
import { GoldScratch } from "../components/GoldScratch";
import { DojoCards } from "../components/DojoCards";
import { SpaceDice } from "../components/SpaceDice";
import { DragonTiger } from "../components/DragonTiger";
import { GoalKick } from "../components/GoalKick";
import { SushiStrike } from "../components/SushiStrike";
import { SnakeGame } from "../components/SnakeGame";
import { GameExplainer } from "../components/GameExplainer";

export default function GamesView({ profile, onNavigate }: { profile: any, onNavigate: (view: string) => void }) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [explainingGame, setExplainingGame] = useState<any | null>(null);
  const [arcadeGames, setArcadeGames] = useState<any[]>([]);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showVIP, setShowVIP] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showNewPlayers, setShowNewPlayers] = useState(false);
  const [latestPlayers, setLatestPlayers] = useState<any[]>([]);

  useEffect(() => {
    setSoundActiveGameId(activeGame);
  }, [activeGame]);

  useEffect(() => {
    // Listen for new players
    const qPlayers = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(10));
    const unsubPlayers = onSnapshot(qPlayers, (snap) => {
      setLatestPlayers(snap.docs.map(d => d.data()));
    });

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
          const cost = parseFloat(data[`moreGame${i}Cost`]) || 0;
          
          if (url) {
            moreGames.push({ id: `arcade_${i}`, title, url, image, time, reward, cost, category: "Arcade" });
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

  const defaultGamesMeta: Record<string, any> = {
    slipper: { title: "Slipper Monte", category: "Cards", image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop" },
    spin: { title: "Spin Wheel", category: "Slot", image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
    coin: { title: "Coin Flip", category: "Blockchain", image: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778146981/game-coin-a-good-investment_lqjtaj.webp" },
    swipe: { title: "Swipe Master", category: "Hot", image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" },
    chests: { title: "Lucky Chests", category: "Slot", image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" },
    dice: { title: "Dice Pro", category: "Blockchain", image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png" },
    scratch: { title: "Gold Scratch", category: "Slot", image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=400&auto=format&fit=crop" },
    aviator: { title: "Aviator", category: "Hot", image: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778147101/aviator_banner_z0j7v8.png" },
    rocket_crash: { title: "Rocket Crash", category: "Hot", image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=400&auto=format&fit=crop" },
    moon_crash: { title: "Moon Crash", category: "Hot", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=400&auto=format&fit=crop" },
    fruit_slots: { title: "Fruit Slots", category: "Classic", image: "https://images.unsplash.com/photo-1596838132731-dd36a19f04aa?q=80&w=400&auto=format&fit=crop" },
    treasure_hunt: { title: "Treasure Hunt", category: "Classic", image: "https://images.unsplash.com/photo-1563212417-640306232938?q=80&w=400&auto=format&fit=crop" },
    wheel_fortune: { title: "Wheel Fortune", category: "Hot", image: "https://images.unsplash.com/photo-1596838132731-dd36a19f04aa?q=80&w=400&auto=format&fit=crop" },
    color_match: { title: "Color Match", category: "Hot", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop" },
    fruit_ninja: { title: "Fruit Ninja", category: "Hot", image: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=400&auto=format&fit=crop" },
    teen_patti: { title: "Teen Patti", category: "Hot", image: "https://images.unsplash.com/photo-1541275322896-180a3a780b62?q=80&w=400&auto=format&fit=crop" },
    plinko: { title: "Plinko Pro", category: "Slot", image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=400&auto=format&fit=crop" },
    mines: { title: "Mines Finder", category: "Hot", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=400&auto=format&fit=crop" },
    dojo_cards: { title: "Dojo Hi-Lo", category: "Cards", image: "https://images.unsplash.com/photo-1552084117-56a987666449?q=80&w=400&auto=format&fit=crop" },
    space_dice: { title: "Space Dice", category: "Blockchain", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop" },
    dragon_tiger: { title: "Dragon Tiger", category: "Cards", image: "https://images.unsplash.com/photo-1540324155974-7523202daa3f?q=80&w=400&auto=format&fit=crop" },
    goal_kick: { title: "Penalty Royale", category: "Skill", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=400&auto=format&fit=crop" },
    sushi_strike: { title: "Sushi Strike", category: "Classic", image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=400&auto=format&fit=crop" },
    snake_league: { title: "Python League", category: "Skill", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=400&auto=format&fit=crop" },
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

  const triggerGameExplanation = (gameOrId: any) => {
    if (!gameOrId) return;
    if (typeof gameOrId === "string") {
      const found = displayedGames.find(g => g.id === gameOrId) || { id: gameOrId, title: defaultGamesMeta[gameOrId]?.title || gameOrId };
      setExplainingGame(found);
    } else {
      setExplainingGame(gameOrId);
    }
  };

  const quickLinks = [
    { name: "Invitation", icon: UserPlus, color: "from-green-400 to-green-600", action: () => setShowReferral(true) },
    { name: "Newplayer", icon: Gift, color: "from-blue-400 to-blue-600", action: () => setShowNewPlayers(true) },
    { name: "Deposit", icon: Coins, color: "from-yellow-400 to-yellow-600", action: () => onNavigate('wallet') },
    { name: "Spins", icon: Radio, color: "from-orange-400 to-orange-600", action: () => triggerGameExplanation('spin') },
    { name: "VIP", icon: Gem, color: "from-purple-400 to-purple-600", action: () => setShowVIP(true) },
  ];

  const filteredGames = displayedGames.filter(g => 
    activeCategory === "All" || 
    g.category === activeCategory || 
    (activeCategory === "Hot" && (g.id === "aviator" || g.id === "mines" || g.id === "swipe" || g.id === "slipper" || g.id === "rocket_crash" || g.id === "moon_crash" || g.id === "fruit_slots" || g.id === "treasure_hunt" || g.id === "wheel_fortune" || g.id === "color_match" || g.id === "fruit_ninja" || g.id === "teen_patti" || g.id === "dojo_cards" || g.id === "space_dice" || g.id === "dragon_tiger" || g.id === "goal_kick" || g.id === "sushi_strike" || g.id === "snake_league"))
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
    
    // Check if session already active for this game
    if (profile.arcadeSession?.status === 'active' && profile.arcadeSession?.gameId === game.id) {
       window.open(game.url, '_blank');
       return;
    }

    const cost = game.cost || 0;
    if (profile.balance < cost) {
       alert(`Insufficient balance! You need RS ${cost} to play this game.`);
       return;
    }

    try {
      const userId = profile.uid || profile.id;
      const userRef = doc(db, "users", userId);
      
      // Deduct bet if > 0
      if (cost > 0) {
        const success = await handleBet(cost);
        if (!success) {
           alert("Transactional error! Please try again.");
           return;
        }
      }

      await updateDoc(userRef, {
        arcadeSession: {
          gameId: game.id,
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

  const handleClaimArcadeReward = async () => {
    if (!profile || !profile.arcadeSession || profile.arcadeSession.status !== 'active') return;
    
    const { startTime, duration, reward } = profile.arcadeSession;
    const elapsed = (new Date().getTime() - new Date(startTime).getTime()) / 1000;
    
    if (elapsed < duration) {
      alert(`Please play for ${Math.ceil(duration - elapsed)} more seconds to claim your reward!`);
      return;
    }

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(reward),
        arcadeSession: { status: 'completed', claimedAt: new Date().toISOString() }
      });
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: reward,
        type: 'win',
        status: 'completed',
        createdAt: new Date().toISOString(),
        note: `Arcade Reward: ${profile.arcadeSession.title}`
      });
      alert(`Success! You earned RS ${reward}`);
    } catch (err) {
      console.error(err);
    }
  };

  const isFullScreen = activeGame === 'aviator' || activeGame === 'mines' || activeGame === 'plinko' || activeGame === 'scratch' || activeGame === 'coin';

  return (
    <div className={`relative w-full h-full bg-[#1b2a5c] ${isFullScreen ? 'overflow-hidden' : ''} text-white`}>
      <AnimatePresence mode="wait">
        {explainingGame && (
          <GameExplainer 
            gameId={explainingGame.id}
            gameTitle={explainingGame.title}
            minBet={gamesConfig[explainingGame.id]?.minBet || minBet}
            winRate={gamesConfig[explainingGame.id]?.winRate || 45}
            multiplier={gamesConfig[explainingGame.id]?.multiplier || 2.5}
            onClose={() => setExplainingGame(null)}
            onPlay={() => {
              const game = explainingGame;
              setExplainingGame(null);
              if (game.url) {
                handleLaunchWebGame(game);
              } else {
                setActiveGame(game.id);
              }
            }}
          />
        )}

        {showVIP && (
           <InvestmentView profile={profile} onBack={() => setShowVIP(false)} />
        )}

        {showReferral && (
           <ReferralView profile={profile} onBack={() => setShowReferral(false)} />
        )}

        {showNewPlayers && (
           <NewPlayerView onBack={() => setShowNewPlayers(false)} />
        )}

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
            <Aviator onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} winRate={gamesConfig['aviator']?.winRate || 50} />
          </motion.div>
        )}

        {activeGame === 'rocket_crash' && (
          <motion.div key="rocket_crash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0a0b0d]">
            <RocketCrash onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} winRate={gamesConfig['rocket_crash']?.winRate || 50} />
          </motion.div>
        )}

        {activeGame === 'moon_crash' && (
          <motion.div key="moon_crash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050608]">
            <MoonCrash onWin={handleWin} onBet={handleBet} balance={profile?.balance || 0} onExit={() => setActiveGame(null)} winRate={gamesConfig['moon_crash']?.winRate || 50} />
          </motion.div>
        )}

        {activeGame === 'fruit_slots' && (
          <motion.div key="fruit_slots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0B0D18]">
            <FruitSlots 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['fruit_slots']?.winRate || 40}
              minBet={gamesConfig['fruit_slots']?.minBet || 10}
              multiplier={gamesConfig['fruit_slots']?.multiplier || 5}
            />
          </motion.div>
        )}

        {activeGame === 'treasure_hunt' && (
          <motion.div key="treasure_hunt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050608]">
            <TreasureHunt 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['treasure_hunt']?.winRate || 35}
              minBet={gamesConfig['treasure_hunt']?.minBet || 10}
              multiplier={gamesConfig['treasure_hunt']?.multiplier || 3}
            />
          </motion.div>
        )}

        {activeGame === 'wheel_fortune' && (
          <motion.div key="wheel_fortune" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050B14]">
            <WheelOfFortune 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['wheel_fortune']?.winRate || 45}
              minBet={gamesConfig['wheel_fortune']?.minBet || 10}
            />
          </motion.div>
        )}

        {activeGame === 'color_match' && (
          <motion.div key="color_match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050608]">
            <ColorMatch 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['color_match']?.winRate || 33}
              minBet={gamesConfig['color_match']?.minBet || 10}
              multiplier={gamesConfig['color_match']?.multiplier || 2.5}
            />
          </motion.div>
        )}

        {activeGame === 'fruit_ninja' && (
          <motion.div key="fruit_ninja" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0a0a0a]">
            <FruitNinja 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['fruit_ninja']?.winRate || 40}
              minBet={gamesConfig['fruit_ninja']?.minBet || 10}
              multiplier={gamesConfig['fruit_ninja']?.multiplier || 2}
            />
          </motion.div>
        )}

        {activeGame === 'teen_patti' && (
          <motion.div key="teen_patti" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#072418]">
            <TeenPatti 
              onWin={handleWin} 
              onBet={handleBet} 
              balance={profile?.balance || 0} 
              onExit={() => setActiveGame(null)} 
              winRate={gamesConfig['teen_patti']?.winRate || 45}
              minBet={gamesConfig['teen_patti']?.minBet || 10}
              multiplier={gamesConfig['teen_patti']?.multiplier || 2}
            />
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

        {activeGame === 'dojo_cards' && (
          <motion.div key="dojo_cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0a0f0d]">
             <DojoCards 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               winRate={gamesConfig['dojo_cards']?.winRate || 48}
               minBet={gamesConfig['dojo_cards']?.minBet || 10}
               multiplier={gamesConfig['dojo_cards']?.multiplier || 2}
             />
          </motion.div>
        )}

        {activeGame === 'space_dice' && (
          <motion.div key="space_dice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#050914]">
             <SpaceDice 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               winRate={gamesConfig['space_dice']?.winRate || 50}
               minBet={gamesConfig['space_dice']?.minBet || 10}
               multiplier={gamesConfig['space_dice']?.multiplier || 1.9}
             />
          </motion.div>
        )}

        {activeGame === 'dragon_tiger' && (
          <motion.div key="dragon_tiger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#1a0505]">
             <DragonTiger 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               winRate={gamesConfig['dragon_tiger']?.winRate || 45}
               minBet={gamesConfig['dragon_tiger']?.minBet || 10}
               multiplier={gamesConfig['dragon_tiger']?.multiplier || 2}
             />
          </motion.div>
        )}

        {activeGame === 'goal_kick' && (
          <motion.div key="goal_kick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#072418]">
             <GoalKick 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               winRate={gamesConfig['goal_kick']?.winRate || 45}
               minBet={gamesConfig['goal_kick']?.minBet || 10}
               multiplier={gamesConfig['goal_kick']?.multiplier || 1.9}
             />
          </motion.div>
        )}



        {activeGame === 'sushi_strike' && (
          <motion.div key="sushi_strike" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#120a0a]">
             <SushiStrike 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               winRate={gamesConfig['sushi_strike']?.winRate || 33}
               minBet={gamesConfig['sushi_strike']?.minBet || 10}
               multiplier={gamesConfig['sushi_strike']?.multiplier || 2.8}
             />
          </motion.div>
        )}

        {activeGame === 'snake_league' && (
          <motion.div key="snake_league" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#05110a]">
             <SnakeGame 
               onWin={handleWin} 
               onBet={handleBet} 
               balance={profile?.balance || 0} 
               onExit={() => setActiveGame(null)} 
               difficulty={gamesConfig['snake_league']?.difficulty || 'low'}
               targetScore={gamesConfig['snake_league']?.targetScore || 15}
               minBet={gamesConfig['snake_league']?.minBet || 10}
               multiplier={gamesConfig['snake_league']?.multiplier || 2.5}
             />
          </motion.div>
        )}



        {!activeGame && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col pb-24 h-full">
            {/* Premium Quick Links Row */}
            <div className="px-6 py-6 bg-[#1a2c5a] border-b border-white/5">
               <div className="grid grid-cols-5 gap-4">
                  {quickLinks.map((link) => (
                    <button 
                     key={link.name} 
                     onClick={link.action}
                     className="flex flex-col items-center gap-1.5 group active:scale-90 transition-all"
                    >
                       <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${link.color} flex items-center justify-center border border-white/10 shadow-xl relative overflow-hidden group-hover:rotate-3 transition-transform transition-all`}>
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <link.icon className="text-white drop-shadow-md" size={18} />
                       </div>
                       <span className="text-[7px] font-black text-white/40 uppercase tracking-widest text-center">{link.name}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* New Player Ticker Display */}
            <div className="px-6 py-2 bg-black/40 flex items-center gap-3 overflow-hidden border-b border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 shrink-0 border-r border-white/10 pr-3">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-white/40 font-mono tracking-widest">LIVE</span>
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="flex gap-10 animate-marquee">
                      {latestPlayers.map((u, i) => (
                        <div key={i} className="flex items-center gap-2 shrink-0">
                           <div className="w-4 h-4 rounded-md bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                              {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <User size={8} />}
                           </div>
                           <span className="text-[8px] font-black text-blue-200/50 uppercase tracking-[0.15em] font-mono">
                             {u.displayName?.split(' ')[0] || 'GUEST'}_NODE JOINED
                           </span>
                        </div>
                      ))}
                   </div>
                </div>
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
            <div className="mt-6 px-6 flex gap-8 overflow-x-auto scrollbar-hide border-b border-white/5 pb-1">
              {categories.map((cat) => (
                <button 
                  key={cat.name} 
                  onClick={() => setActiveCategory(cat.name)} 
                  className={`flex flex-col items-center gap-1.5 min-w-[50px] pb-3 relative transition-all ${
                    activeCategory === cat.name ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                  }`}
                >
                  <cat.icon size={18} className={activeCategory === cat.name ? 'text-orange-500' : 'text-white'} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${activeCategory === cat.name ? 'text-orange-500' : 'text-white'}`}>
                    {cat.name}
                  </span>
                  {activeCategory === cat.name && (
                    <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Section Header */}
            <div className="px-6 mt-6 mb-3 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black italic uppercase tracking-tighter text-white/90">{activeCategory} Selection</h2>
               </div>
               <button onClick={() => setActiveCategory("All")} className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] border border-white/5 px-3 py-1 rounded-full hover:bg-white/5 transition-all">All Nodes</button>
            </div>

            {/* Enhanced Game Grid */}
            <div className="grid grid-cols-2 gap-3 px-6 pb-24">
              {filteredGames.map((game, idx) => {
                const config = gamesConfig[game.id] || {};
                const displayImage = config.image || game.image;
                const isArcade = game.category === "Arcade";
                
                return (
                  <motion.div 
                    key={game.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.03 }} 
                    onClick={() => triggerGameExplanation(game)} 
                    className={`relative group cursor-pointer ${isArcade ? 'col-span-2' : ''}`}
                  >
                    <div className={`${isArcade ? 'aspect-[21/9]' : 'aspect-[3/4.2]'} rounded-[1.5rem] overflow-hidden border border-white/5 bg-[#14254f] shadow-2xl relative transition-transform duration-500 group-hover:scale-[1.02]`}>
                      <img 
                        src={displayImage} 
                        alt={game.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${isArcade ? 'from-black/90 via-black/20' : 'from-black/90 via-transparent'} to-transparent`} />
                      
                      {/* Badges from Screenshot */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <div className="bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-xl translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                           <Play size={12} fill="currentColor" />
                        </div>
                      </div>

                      {/* Game Info Overlay */}
                      {isArcade ? (
                        <>
                          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                            <div className="space-y-1">
                               <p className="text-xs font-black italic uppercase text-white tracking-tight">{game.title}</p>
                               <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 opacity-60">
                                    <Coins size={10} className="text-yellow-400" />
                                    <span className="text-[10px] font-black text-white">{game.cost || 0}</span>
                                  </div>
                                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Arcade</span>
                               </div>
                            </div>
                            
                            {profile?.arcadeSession?.status === 'active' && profile?.arcadeSession?.gameId === game.id ? (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleClaimArcadeReward();
                                 }}
                                 className="bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-2xl animate-pulse"
                               >
                                 Claim {game.reward}
                               </button>
                            ) : (
                               <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                  <span className="text-[10px] font-black text-white/60">Play & Earn</span>
                               </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-black to-transparent">
                           <div className="space-y-1">
                              <p className="text-xs font-black italic uppercase text-white tracking-tight leading-none truncate">{game.title}</p>
                              <div className="flex items-center justify-between">
                                 <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{game.category}</span>
                                 <span className="text-[8px] font-black text-white/30 uppercase font-mono">ID_{game.id.substr(0,4)}</span>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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

