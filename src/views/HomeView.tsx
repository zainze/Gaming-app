import { motion } from "motion/react";
import { Gift, TrendingUp, Users, Timer, Sparkles, CheckCircle2, AlertCircle, Trophy, UserPlus, Coins, Radio, Gem } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, getDoc, arrayUnion } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase";
import { db } from "../lib/firebase";
import { playSound } from "../lib/sounds";
import { AnimatePresence } from "motion/react";
import InvestmentView from "./InvestmentView";
import ReferralView from "./ReferralView";
import NewPlayerView from "./NewPlayerView";

export default function HomeView({ profile, onNavigate }: { profile: any, onNavigate: (view: string) => void }) {
  const [stats, setStats] = useState({
    level: 1,
    bonus: 0,
    referrals: 0
  });

  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusCooldown, setBonusCooldown] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState(50);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoStatus, setPromoStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [showVIP, setShowVIP] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showNewPlayers, setShowNewPlayers] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Fetch Level and Bonus from transactions
    const qTxs = query(collection(db, "transactions"), where("userId", "==", profile.uid));
    const unsubscribeTxs = onSnapshot(qTxs, (snap) => {
      let totalWagered = 0;
      let totalBonus = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.type === 'wager' && data.status === 'completed') {
          totalWagered += Math.abs(data.amount);
        }
        if (data.type === 'referral' && data.status === 'completed') {
          totalBonus += data.amount;
        }
      });
      
      setStats(prev => ({
        ...prev,
        level: Math.floor(totalWagered / 1000) + 1,
        bonus: totalBonus
      }));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });

    // Fetch Referral count
    const qRefs = query(collection(db, "referrals"), where("referrerId", "==", profile.uid));
    const unsubscribeRefs = onSnapshot(qRefs, (snap) => {
      setStats(prev => ({ ...prev, referrals: snap.size }));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "referrals");
    });

    return () => {
      unsubscribeTxs();
      unsubscribeRefs();
    };
  }, [profile]);

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(data);
        setBonusAmount(data.dailyBonus || 50);
        setMinBet(data.minBet || 10);
      }
    });

    const unsubGames = onSnapshot(collection(db, "games"), (snap) => {
      const config: Record<string, any> = {};
      snap.docs.forEach(d => {
        config[d.id] = d.data();
      });
      setGamesConfig(config);
    });

    return () => {
      unsubGlobal();
      unsubGames();
    };
  }, []);

  useEffect(() => {
    if (!profile?.lastBonusClaimed) return;
    const updateCooldown = () => {
      const last = new Date(profile.lastBonusClaimed).getTime();
      const now = new Date().getTime();
      const diff = 24 * 60 * 60 * 1000 - (now - last);
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setBonusCooldown(`${hours}h ${mins}m`);
      } else {
        setBonusCooldown(null);
      }
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [profile?.lastBonusClaimed]);

  const handleClaimBonus = async () => {
    if (!profile || bonusCooldown || bonusLoading) return;
    playSound('click');
    setBonusLoading(true);
    try {
      const reward = bonusAmount;
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(reward),
        lastBonusClaimed: new Date().toISOString()
      });
      playSound('win');
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: reward,
        type: 'bonus',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setBonusLoading(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!profile || !promoCode || promoLoading) return;
    setPromoLoading(true);
    setPromoStatus({ type: null, message: "" });
    playSound('click');
    try {
      const codeRef = doc(db, "promo_codes", promoCode.toUpperCase().trim());
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists() || !codeSnap.data().active) {
        setPromoStatus({ type: 'error', message: "Invalid or expired code!" });
        return;
      }

      const codeData = codeSnap.data();
      const usedBy = codeData.usedBy || [];
      
      if (usedBy.includes(profile.uid)) {
        setPromoStatus({ type: 'error', message: "Already redeemed by you!" });
        return;
      }
      
      const reward = Number(codeData.value) || 0;

      if (codeData.type === 'balance') {
        await updateDoc(doc(db, "users", profile.uid), {
          balance: increment(reward)
        });
        await addDoc(collection(db, "transactions"), {
          userId: profile.uid,
          amount: reward,
          type: 'bonus',
          method: 'Voucher: ' + promoCode.toUpperCase().trim(),
          status: 'completed',
          createdAt: new Date().toISOString()
        });
      } else if (codeData.type === 'double_rewards') {
        const until = new Date();
        until.setHours(until.getHours() + 24);
        await updateDoc(doc(db, "users", profile.uid), {
          doubleRewardsUntil: until.toISOString(),
          rewardMultiplier: reward || 2
        });
      }

      await updateDoc(codeRef, {
        usedBy: arrayUnion(profile.uid)
      });

      playSound('win');
      setPromoStatus({ 
        type: 'success', 
        message: codeData.type === 'balance' ? `RS ${reward} Added!` : `Double Rewards Active!` 
      });
      setPromoCode("");
      setTimeout(() => setPromoStatus({ type: null, message: "" }), 5000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "promo_redemption");
      setPromoStatus({ type: 'error', message: "System error." });
    } finally {
      setPromoLoading(false);
    }
  };

  const quickLinks = [
    { name: "Invitation", icon: UserPlus, color: "from-green-400 to-green-600", action: () => setShowReferral(true) },
    { name: "Newplayer", icon: Gift, color: "from-blue-400 to-blue-600", action: () => setShowNewPlayers(true) },
    { name: "Deposit", icon: Coins, color: "from-yellow-400 to-yellow-600", action: () => onNavigate('wallet') },
    { name: "Spins", icon: Radio, color: "from-orange-400 to-orange-600", action: () => onNavigate('games') },
    { name: "VIP", icon: Gem, color: "from-purple-400 to-purple-600", action: () => setShowVIP(true) },
  ];

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {showVIP && <InvestmentView profile={profile} onBack={() => setShowVIP(false)} />}
        {showReferral && <ReferralView profile={profile} onBack={() => setShowReferral(false)} />}
        {showNewPlayers && <NewPlayerView onBack={() => setShowNewPlayers(false)} />}
      </AnimatePresence>

      <motion.main 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`space-y-12 pb-32 ${profile?.language === 'ur' ? 'font-urdu' : ''} text-white overflow-x-hidden`}
      >
        <header className="px-6 pt-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none drop-shadow-2xl">
            {profile?.displayName?.split(' ')[0]}<span className="text-orange-500">.</span>
          </h2>

          <div className="flex items-center gap-3 mt-6">
                <div className="flex-1 bg-[#14254f] border border-white/5 rounded-2xl p-3.5 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
                     <TrendingUp size={30} className="text-green-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <TrendingUp size={12} className="text-green-400" />
                     </div>
                     <span className="font-black text-[7px] uppercase text-white/30 tracking-[0.2em] font-mono">Rank</span>
                  </div>
                  <p className="text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-green-400 transition-colors">Tier {stats.level}</p>
                </div>

                <div className="flex-1 bg-[#14254f] border border-white/5 rounded-2xl p-3.5 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
                     <Users size={30} className="text-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                     <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Users size={12} className="text-blue-400" />
                     </div>
                     <span className="font-black text-[7px] uppercase text-white/30 tracking-[0.2em] font-mono">Network</span>
                  </div>
                  <p className="text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-blue-400 transition-colors">{stats.referrals} Units</p>
                </div>
             </div>
        </header>

        <section className="px-6">
          <div className="grid grid-cols-5 gap-2">
             {quickLinks.map((link) => (
               <button 
                key={link.name} 
                onClick={link.action}
                className="flex flex-col items-center gap-1.5 group active:scale-90 transition-all font-mono"
               >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${link.color} flex items-center justify-center border border-white/5 relative overflow-hidden shadow-lg`}>
                     <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                     <link.icon className="text-white drop-shadow-lg" size={18} />
                  </div>
                  <span className="text-[7px] font-black text-white/30 uppercase tracking-tighter text-center">{link.name}</span>
               </button>
             ))}
          </div>
        </section>

        <div className="px-6">
          <div className="bg-[#14254f] border border-white/5 rounded-[1.8rem] p-5 space-y-5 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
              <Gift size={100} className="text-orange-500" />
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl">
                  <Gift size={24} />
               </div>
               <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] font-mono">Yield Protocol</p>
                  <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Harvest Daily</h3>
               </div>
            </div>

            <div className="relative z-10 pt-1">
              {bonusCooldown ? (
                <div className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-2.5 text-orange-500">
                    <Timer size={14} className="animate-pulse" />
                    <span className="font-mono font-black text-sm tracking-tighter italic">{bonusCooldown}</span>
                  </div>
                  <span className="text-[7px] font-black uppercase text-white/10 tracking-widest font-mono">COOLDOWN</span>
                </div>
              ) : (
                <button 
                  onClick={handleClaimBonus}
                  disabled={bonusLoading}
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white py-4 rounded-xl font-black italic uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all text-[10px] relative overflow-hidden"
                >
                  {bonusLoading ? 'SYNCING...' : `CLAIM RS ${bonusAmount}`}
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="space-y-6 px-6">
          <div className="flex items-center justify-between px-1">
             <div className="space-y-0.5">
                <h3 className="font-black text-2xl italic tracking-tighter uppercase text-white leading-none">Top Picks<span className="text-orange-500">.</span></h3>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] font-mono">Trending Operations</p>
             </div>
             <button onClick={() => onNavigate('games')} className="px-3 py-1.5 bg-white/5 rounded-lg text-[8px] font-black text-white/30 uppercase tracking-widest border border-white/5 hover:text-white transition-all">All &gt;</button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'aviator', name: 'Aviator', img: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778147101/aviator_banner_z0j7v8.png", category: "Active" },
              { id: 'fruit_ninja', name: 'Fruit Ninja', img: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=400&auto=format&fit=crop", category: "New" },
              { id: 'teen_patti', name: 'Teen Patti', img: "https://images.unsplash.com/photo-1541275322896-180a3a780b62?q=80&w=400&auto=format&fit=crop", category: "Hot" },
              { id: 'mines', name: 'Mines Finder', img: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=400&auto=format&fit=crop", category: "Popular" },
            ].map((game) => {
              const config = gamesConfig[game.id] || {};
              const displayImage = config.image || game.img;
              
              return (
                <div 
                  key={game.id} 
                  onClick={() => onNavigate('games')}
                  className="bg-[#14254f] border border-white/5 rounded-[1.5rem] p-3.5 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/5 bg-[#0b0e11] group-hover:scale-105 transition-transform">
                      <img src={displayImage} alt={game.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-1">
                       <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                          <span className="text-[8px] font-black uppercase text-orange-500 tracking-[0.1em] font-mono">{game.category}</span>
                       </div>
                       <p className="font-black italic uppercase tracking-tighter text-xl text-white leading-none">{game.name}</p>
                       <p className="text-[8px] text-white/20 font-black uppercase tracking-widest font-mono">Min: RS {config.minBet || minBet}</p>
                    </div>
                  </div>
                  <div className="px-5 py-2 rounded-xl text-white/30 group-hover:text-white group-hover:bg-orange-500 transition-all font-black text-[9px] uppercase tracking-[0.2em] relative z-10 border border-white/5">
                    Start
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-6">
          <div className="bg-[#14254f] border border-white/5 rounded-[1.5rem] p-6 space-y-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                 <Trophy size={80} className="text-orange-500" />
              </div>
              
              <div className="flex flex-col gap-0.5 relative z-10 pl-1">
                 <h4 className="font-black italic text-base uppercase tracking-tight text-white">Injection Key</h4>
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] font-mono">System Protocol</p>
              </div>

              <div className="relative z-10 pt-1">
                 <input 
                   type="text"
                   value={promoCode}
                   onChange={(e) => setPromoCode(e.target.value)}
                   disabled={promoLoading}
                   placeholder="CODE_HASH"
                   className={`w-full bg-black/20 border ${promoStatus.type === 'error' ? 'border-red-500/20' : promoStatus.type === 'success' ? 'border-green-500/20' : 'border-white/5 focus:border-orange-500/30'} outline-none rounded-xl p-3.5 text-xs font-black uppercase tracking-[0.2em] font-mono placeholder:text-white/5 transition-all text-white`}
                 />
                 <button 
                   onClick={handleRedeemPromo}
                   disabled={promoLoading}
                   className="mt-3 w-full bg-white text-black hover:bg-neutral-100 py-3 rounded-xl font-black italic text-[10px] uppercase tracking-[0.3em] active:scale-[0.98] transition-all"
                 >
                   {promoLoading ? 'BUSY...' : 'ACTIVATE'}
                 </button>
              </div>
          </div>
        </section>
      </motion.main>
    </div>
  );
}
