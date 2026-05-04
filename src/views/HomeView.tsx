import { motion } from "motion/react";
import { Gift, TrendingUp, Users, Zap, ExternalLink, Timer, Sparkles, Bell, Trophy, Landmark, Plus, MessageCircle, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, increment, addDoc, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
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
      alert(`Success! Reward logic applied: ${codeData.type === 'balance' ? `RS ${reward} added!` : `24H Double Rewards active!`}`);
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
      className={`p-4 space-y-6 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''}`}
    >
      {/* Welcome Section */}
      <section className="space-y-1">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
          {profile?.language === 'ur' ? 'خوش آمدید' : 'Welcome Back'}
        </h2>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-black truncate max-w-[200px]">{profile?.displayName}</p>
          <div className="bg-white border border-neutral-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <TrendingUp size={16} className="text-green-500" />
            <span className="font-bold text-xs uppercase tracking-tighter text-neutral-600">Level {stats.level}</span>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2 relative overflow-hidden group shadow-sm">
          <div className="absolute -top-1 -right-1 opacity-5 group-hover:scale-110 transition-transform">
            <Sparkles size={40} className="text-orange-500" />
          </div>
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
            <Gift size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-400 uppercase">
              {profile?.language === 'ur' ? 'ڈیلی بونس' : 'Daily Bonus'}
            </p>
            {bonusCooldown ? (
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-bold uppercase tracking-tighter">
                <Timer size={12} /> {bonusCooldown}
              </div>
            ) : (
              <button 
                onClick={handleClaimBonus}
                disabled={bonusLoading}
                className="text-xs font-black text-white bg-orange-500 px-3 py-1 rounded-lg shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                {bonusLoading ? '...' : `CLAIM RS ${bonusAmount}`}
              </button>
            )}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2 shadow-sm">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase">
              {profile?.language === 'ur' ? 'کل ریفرلز' : 'Total Referrals'}
            </p>
            <p className="text-xl font-black text-neutral-900">{stats.referrals}</p>
          </div>
        </div>
      </div>

      {/* Active Boost Banner */}
      {profile?.doubleRewardsUntil && new Date(profile.doubleRewardsUntil) > new Date() && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black uppercase italic italic">{profile?.rewardMultiplier || 2}X Rewards Active</p>
              <p className="text-[8px] font-bold uppercase opacity-80">All winnings are being multiplied! Ends soon.</p>
            </div>
          </div>
          <div className="bg-black/20 px-3 py-1 rounded-full text-[8px] font-black uppercase">Active</div>
        </div>
      )}

      {/* Gaming Channels Dock */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest italic">Official Channels</p>
          <div className="flex gap-1 items-center">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
            <p className="text-[8px] font-black text-green-500 uppercase">Live Now</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[1, 2, 3, 4].map((i) => {
            const key = `social${i}`;
            const label = systemConfig?.[`${key}Label`];
            const link = systemConfig?.[`${key}Link`];
            const iconUrl = systemConfig?.[`${key}Icon`];
            const isActive = systemConfig?.[`${key}Active`];
            
            if (!isActive || !label || !link) return null;

            return (
              <a 
                key={i}
                href={link} 
                target="_blank" 
                rel="noreferrer"
                className="flex-shrink-0 flex flex-col items-center gap-1 group"
              >
                <div className={`w-12 h-12 ${i === 1 ? 'bg-green-500 shadow-green-500/20 border-green-700' : 'bg-neutral-900 shadow-neutral-900/20 border-black'} rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform relative overflow-hidden border-b-4`}>
                   {iconUrl ? (
                     <img 
                       src={iconUrl} 
                       alt={label} 
                       className="w-full h-full object-cover" 
                       referrerPolicy="no-referrer" 
                       onError={(e) => {
                         // Fallback if image fails to load
                         (e.target as any).src = "https://cdn-icons-png.flaticon.com/512/3242/3242095.png";
                       }}
                     />
                   ) : (
                     <Zap size={18} />
                   )}
                   <div className="absolute top-0 right-0 p-0.5">
                     <Sparkles size={8} className="text-white/40" />
                   </div>
                </div>
                <span className={`text-[8px] font-black uppercase transition-colors ${i === 1 ? 'text-green-600' : 'text-neutral-900'} truncate max-w-[48px]`}>{label}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* Quick Launch Games */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg text-neutral-900">{profile?.language === 'ur' ? 'تیزی سے کھیلیں' : 'Quick Launch'}</h3>
        <div className="space-y-3">
          {[
            { id: 'aviator', name: 'Aviator', img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop" },
            { id: 'spin', name: 'Spin Wheel', img: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
            { id: 'coin', name: 'Coin Flip', img: "https://cdn-icons-png.flaticon.com/512/550/550614.png" },
          ].map((game) => {
            const config = gamesConfig[game.id] || {};
            const displayImage = config.image || game.img;
            
            return (
              <div key={game.name} className="bg-white border border-neutral-200 p-3 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-orange-500/30 transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-neutral-50 rounded-xl overflow-hidden shadow-sm border border-neutral-100">
                    <img src={displayImage} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-tight text-sm text-neutral-900">{game.name}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Min Bet: RS {config.minBet || minBet}</p>
                  </div>
                </div>
                <button className="bg-neutral-50 px-4 py-2 rounded-xl text-neutral-400 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-colors font-bold text-[10px] uppercase tracking-widest border border-neutral-100">
                  Launch
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </motion.main>
  );
}
