import { motion } from "motion/react";
import { Gift, TrendingUp, Users, Zap, ExternalLink, Timer, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, increment, addDoc, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { db } from "../lib/firebase";
import { formatCurrency } from "../lib/utils";

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

  useEffect(() => {
    const unsubGlobal = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
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

  const banners = [
    { id: 1, color: "from-orange-500 to-red-600", title: "Double Rewards", description: "Use code LUCKY20 for 2x bonus on spin!", code: "LUCKY20" },
    { id: 2, color: "from-blue-600 to-purple-600", title: "Join Discord", description: "Get exclusive coupons and daily rewards.", code: "SOCIAL" },
  ];

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
          <div className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-inner">
            <TrendingUp size={16} className="text-green-500" />
            <span className="font-bold text-xs uppercase tracking-tighter">Level {stats.level}</span>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute -top-1 -right-1 opacity-10 group-hover:scale-110 transition-transform">
            <Sparkles size={40} className="text-orange-500" />
          </div>
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
            <Gift size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase">
              {profile?.language === 'ur' ? 'ڈیلی بونس' : 'Daily Bonus'}
            </p>
            {bonusCooldown ? (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-bold uppercase tracking-tighter">
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">
              {profile?.language === 'ur' ? 'کل ریفرلز' : 'Total Referrals'}
            </p>
            <p className="text-xl font-black">{stats.referrals}</p>
          </div>
        </div>
      </div>

      {/* Horizontal Banner Coupons */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{profile?.language === 'ur' ? 'خصوصی پیشکش' : 'Special Offers'}</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className={`min-w-[280px] h-40 bg-gradient-to-br ${banner.color} rounded-3xl p-6 flex flex-col justify-between shadow-2xl shadow-neutral-900/50 snap-center relative overflow-hidden group`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Zap size={120} />
              </div>
              <div className="space-y-1 relative z-10">
                <h4 className="text-2xl font-black leading-tight uppercase italic">{banner.title}</h4>
                <p className="text-white/80 text-xs font-medium max-w-[200px]">{banner.description}</p>
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg px-3 py-1 font-mono text-sm font-bold tracking-widest uppercase">
                  {banner.code}
                </div>
                <button className="p-2 bg-white rounded-full text-neutral-900 shadow-lg active:scale-90 transition-transform">
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Launch Games */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg">{profile?.language === 'ur' ? 'تیزی سے کھیلیں' : 'Quick Launch'}</h3>
        <div className="space-y-3">
          {[
            { id: 'spin', name: 'Spin Wheel', img: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
            { id: 'coin', name: 'Coin Flip', img: "https://cdn-icons-png.flaticon.com/512/550/550614.png" },
            { id: 'swipe', name: 'Swipe Master', img: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" }
          ].map((game) => (
            <div key={game.name} className="bg-neutral-900 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-orange-500/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-neutral-800 rounded-xl overflow-hidden shadow-lg">
                   <img src={game.img} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="font-bold uppercase tracking-tight text-sm">{game.name}</p>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Min Bet: RS {gamesConfig[game.id]?.minBet || minBet}</p>
                </div>
              </div>
              <button className="bg-neutral-800 px-4 py-2 rounded-xl text-neutral-400 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-colors font-bold text-[10px] uppercase tracking-widest">
                Launch
              </button>
            </div>
          ))}
        </div>
      </section>
    </motion.main>
  );
}
