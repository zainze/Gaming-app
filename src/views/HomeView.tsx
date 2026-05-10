import { motion } from "motion/react";
import { Gift, TrendingUp, Users, Timer, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, increment, addDoc, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase";
import { db } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";
import { playSound } from "../lib/sounds";

export default function HomeView({ profile }: { profile: any }) {
  const [stats, setStats] = useState({
    level: 1,
    bonus: 0,
    referrals: 0
  });

  useEffect(() => {
    if (!profile) return;

    // Fetch Level and Bonus from transactions
    const qTxs = query(collection(db, "transactions"), where("userId", "==", profile.uid));
    const unsubscribeTxs = onSnapshot(qTxs, (snap) => {
      let totalWagered = 0;
      let totalBonus = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
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

  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusCooldown, setBonusCooldown] = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState(50);
  const [minBet, setMinBet] = useState(10);
  const [gamesConfig, setGamesConfig] = useState<Record<string, any>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(data);
        setBonusAmount(data.dailyBonus || 50);
        setMinBet(data.minBet || 10);
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

    if (!profile?.lastBonusClaimed) return () => { unsubGlobal(); unsubGames(); };
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
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });
      playSound('win');
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: reward,
        type: 'bonus',
        status: 'completed',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
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
    playSound('click');
    try {
      const codeRef = doc(db, "promo_codes", promoCode.toUpperCase().trim());
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists() || !codeSnap.data().active) {
        alert("Invalid or expired promo code!");
        return;
      }

      const codeData = codeSnap.data();
      const usedBy = codeData.usedBy || [];
      
      if (usedBy.includes(profile.uid)) {
        alert("You have already used this promo code!");
        return;
      }

      // If it's a daily code, we might need a separate check for today
      // For now, standard one-time use per user per code as defined in admin
      
      const reward = Number(codeData.value) || 0;

      if (codeData.type === 'balance') {
        await updateDoc(doc(db, "users", profile.uid), {
          balance: increment(reward)
        });
        await addDoc(collection(db, "transactions"), {
          userId: profile.uid,
          amount: reward,
          type: 'bonus',
          method: 'Promo Code: ' + promoCode,
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
        usedBy: [...usedBy, profile.uid]
      });

      playSound('win');
      alert(`Success! Reward logic applied: ${codeData.type === 'balance' ? `${formatCurrency(reward)} added!` : `24H Double Rewards active!`}`);
      setPromoCode("");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "promo_redemption");
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <motion.main 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`space-y-8 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''} text-white`}
    >
      {/* Welcome Hero Section */}
      <section className="px-6 pt-4">
        <div className="flex items-center justify-between gap-4">
           <div className="space-y-1">
              <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.3em] pl-0.5">
                {profile?.language === 'ur' ? 'خوش آمدید' : 'Live Status'}
              </h2>
              <p className="text-4xl font-black italic tracking-tighter uppercase leading-none truncate max-w-[220px]">
                {profile?.displayName?.split(' ')[0]}
              </p>
           </div>
           <div className="bg-[#14254f] border border-white/10 rounded-2xl p-2 px-4 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                 <TrendingUp size={12} className="text-green-400" />
                 <span className="font-black text-[10px] uppercase text-white/40 tracking-wider">Standing</span>
              </div>
              <p className="text-xl font-black italic tracking-tighter text-white">Level {stats.level}</p>
           </div>
        </div>
      </section>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 gap-4 px-6">
        <div className="bg-[#14254f] border border-white/5 rounded-3xl p-5 space-y-4 relative overflow-hidden group shadow-2xl">
          <div className="absolute -top-2 -right-2 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Sparkles size={60} className="text-orange-500" />
          </div>
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Gift size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">
              {profile?.language === 'ur' ? 'ڈیلی بونس' : 'Daily Rewards'}
            </p>
            {bonusCooldown ? (
              <div className="flex items-center gap-2 text-white/60 text-xs font-black uppercase tracking-tight">
                <Timer size={14} className="text-orange-500" /> {bonusCooldown}
              </div>
            ) : (
              <button 
                onClick={handleClaimBonus}
                disabled={bonusLoading}
                className="w-full text-[10px] font-black text-white bg-orange-500 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all hover:bg-orange-400"
              >
                {bonusLoading ? '...' : `CLAIM RS ${bonusAmount}`}
              </button>
            )}
          </div>
        </div>
        <div className="bg-[#14254f] border border-white/5 rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-2 -right-2 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Users size={60} className="text-blue-400" />
          </div>
          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Users size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">
              {profile?.language === 'ur' ? 'کل ریفرلز' : 'Active Referrals'}
            </p>
            <p className="text-2xl font-black text-white italic truncate">{stats.referrals}</p>
          </div>
        </div>
      </div>

      {/* Active Multiplier Banner */}
      {profile?.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > new Date() && (
        <div className="mx-6 p-6 rounded-[2.5rem] bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-between shadow-2xl shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
             <Sparkles size={80} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
              <Sparkles size={28} className="text-white drop-shadow-md" />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic tracking-tight">{profile?.rewardMultiplier || 2}X Protocol Engaged</p>
              <p className="text-[9px] font-bold uppercase opacity-80 tracking-tight">Hyper-Loot Multiplier Enabled</p>
            </div>
          </div>
          <div className="bg-black/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic relative z-10 border border-white/10">Active</div>
        </div>
      )}

      {/* Quick Launch Games Section */}
      <section className="space-y-6 px-6">
        <div className="flex items-center justify-between pl-1">
           <h3 className="font-black text-2xl italic tracking-tighter uppercase text-white">
             {profile?.language === 'ur' ? 'تیزی سے کھیلیں' : 'Top Selection'}
           </h3>
           <div className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded shadow-lg shadow-orange-500/20">Live</div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {[
            { id: 'aviator', name: 'Aviator', img: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778147101/aviator_banner_z0j7v8.png", category: "Hot" },
            { id: 'spin', name: 'Spin Wheel', img: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=400&auto=format&fit=crop", category: "Slot" },
            { id: 'coin', name: 'Coin Flip', img: "https://res.cloudinary.com/dpmjzqhdh/image/upload/v1778146981/game-coin-a-good-investment_lqjtaj.webp", category: "Blockchain" },
          ].map((game) => {
            const config = gamesConfig[game.id] || {};
            const displayImage = config.image || game.img;
            
            return (
              <div 
                key={game.name} 
                className="bg-[#14254f] border border-white/5 p-4 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:border-orange-500/50 transition-all shadow-xl hover:shadow-orange-500/5"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-[#0b0e11]">
                    <img src={displayImage} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black italic uppercase tracking-tighter text-xl text-white leading-none">{game.name}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black uppercase text-orange-500 tracking-wider font-mono">{game.category}</span>
                       <div className="w-1 h-1 bg-white/20 rounded-full" />
                       <p className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none">Min Bet: RS {config.minBet || minBet}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#0b0e11] px-5 py-2.5 rounded-2xl text-white/40 group-hover:text-white group-hover:bg-orange-500 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-inner border border-white/5">
                  Enter
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promo Code Section */}
      <section className="px-6">
         <div className="bg-[#14254f] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl space-y-4">
            <h4 className="font-black text-xs uppercase tracking-[0.3em] text-white/60 pl-1">Voucher Redemption</h4>
            <div className="relative">
               <input 
                 type="text"
                 value={promoCode}
                 onChange={(e) => setPromoCode(e.target.value)}
                 placeholder="INPUT VOUCHER CODE"
                 className="w-full bg-[#0b0e11] border border-white/5 focus:border-orange-500 outline-none rounded-2xl p-4 text-sm font-black uppercase tracking-widest placeholder:text-white/20 transition-all shadow-inner"
               />
               <button 
                 onClick={handleRedeemPromo}
                 disabled={promoLoading}
                 className="absolute right-2 top-2 bottom-2 bg-orange-500 hover:bg-orange-400 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all text-white"
               >
                 {promoLoading ? '...' : 'Process'}
               </button>
            </div>
         </div>
      </section>
    </motion.main>
  );
}
