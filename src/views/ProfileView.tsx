import { motion } from "motion/react";
import { LogOut, Share2, Shield, User as UserIcon, Heart, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Languages, Trash2, Zap } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc, writeBatch, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import PrivacyView from "./PrivacyView";

type ActiveSection = 'main' | 'notifications' | 'privacy' | 'language' | 'favorites';

export default function ProfileView({ profile }: { profile: any }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('main');
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();

  const isAdminEmail = profile?.email === 'zainzeb333@gmail.com';

  useEffect(() => {
    // Auto-fix for legacy users missing invite code or registry
    if (profile && !profile.inviteCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const batch = writeBatch(db);
      batch.update(doc(db, "users", profile.uid), { inviteCode: code });
      batch.set(doc(db, "invite_codes", code), { uid: profile.uid });
      batch.commit().catch(console.error);
    } else if (profile?.inviteCode) {
      // Ensure it's in the registry
      getDoc(doc(db, "invite_codes", profile.inviteCode)).then(snap => {
        if (!snap.exists()) {
          setDoc(doc(db, "invite_codes", profile.inviteCode), { uid: profile.uid });
        }
      });
    }

    if (!profile) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "notifications");
    });
    return () => unsubscribe();
  }, [profile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`https://playhub.pro/i/${profile?.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleLanguage = async (lang: 'en' | 'ur') => {
    if (!profile) return;
    await updateDoc(doc(db, "users", profile.uid), { language: lang });
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const [referralCode, setReferralCode] = useState("");
  const [refStatus, setRefStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [systemConfig, setSystemConfig] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) setSystemConfig(snap.data());
    });
    return () => unsub();
  }, []);

  const referralReward = systemConfig?.referralReward || 50;

  const submitReferral = async () => {
    if (!referralCode.trim() || profile?.referredBy) return;
    setRefStatus('loading');
    const inputRaw = referralCode.trim();
    // Extract code if it's a full URL or path (e.g., https://playhub.pro/i/CODE -> CODE)
    const inputCode = (inputRaw.includes('/') ? inputRaw.replace(/\/+$/, '').split('/').pop() : inputRaw)?.toUpperCase().trim() || "";
    
    if (!inputCode) {
      setRefStatus('error');
      return;
    }

    try {
      // 1. Try Referral Code (invite_codes registry)
      let referrerId: string | null = null;
      const codeDoc = await getDoc(doc(db, "invite_codes", inputCode));
      
      if (codeDoc.exists()) {
        referrerId = codeDoc.data().uid;
      } else {
        // Fallback: Search users collection for this inviteCode
        const userQ = query(collection(db, "users"), where("inviteCode", "==", inputCode), limit(1));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          referrerId = userSnap.docs[0].id;
          // While we're here, let's fix the registry for future fast lookups
          setDoc(doc(db, "invite_codes", inputCode), { uid: referrerId });
        }
      }
      
      if (referrerId) {
        if (referrerId === profile.uid) {
          setRefStatus('error');
          return;
        }

        const batch = writeBatch(db);
        
        // Mark current user as referred
        batch.update(doc(db, "users", profile.uid), { referredBy: referrerId });

        // Add reward to referrer balance
        batch.update(doc(db, "users", referrerId), { balance: increment(referralReward) });

        // Create referral record
        const refId = `${profile.uid}_${referrerId}`;
        batch.set(doc(db, "referrals", refId), {
          referrerId: referrerId,
          referredId: profile.uid,
          rewardAmount: referralReward,
          createdAt: new Date().toISOString()
        });

        // Create transaction for referrer
        batch.set(doc(collection(db, "transactions")), {
          userId: referrerId,
          amount: referralReward,
          type: 'referral',
          status: 'completed',
          createdAt: new Date().toISOString()
        });

        // Notification
        batch.set(doc(collection(db, "notifications")), {
          userId: referrerId,
          title: "Referral Reward! 🎉",
          body: `Congratulations! ${profile.displayName} used your code. RS ${referralReward} added to balance.`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString()
        });

        await batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, "referral_batch");
          throw err;
        });
        setRefStatus('success');
        return;
      }

    // 2. Try Promo Code (promo_codes)
    const promoDoc = await getDoc(doc(db, "promo_codes", inputCode)).catch(err => {
      handleFirestoreError(err, OperationType.GET, `promo_codes/${inputCode}`);
      throw err;
    });
    if (promoDoc.exists()) {
      const promo = promoDoc.data();
      if (!promo.active || (promo.usedBy && promo.usedBy.includes(profile.uid))) {
        setRefStatus('error');
        return;
      }

      const batch = writeBatch(db);
      
      // Reward Type Handling
      if (promo.type === 'balance') {
         batch.update(doc(db, "users", profile.uid), { balance: increment(promo.value) });
         batch.set(doc(collection(db, "transactions")), {
           userId: profile.uid,
           amount: promo.value,
           type: 'bonus',
           status: 'completed',
           createdAt: new Date().toISOString(),
           promoCode: inputCode
         });
      } else if (promo.type === 'double_rewards') {
         // Set double rewards for 24 hours
         const expiry = new Date();
         expiry.setHours(expiry.getHours() + 24);
         batch.update(doc(db, "users", profile.uid), { 
           doubleRewardsUntil: expiry.toISOString(),
           rewardMultiplier: 2
         });
         batch.set(doc(collection(db, "transactions")), {
           userId: profile.uid,
           amount: 0,
           type: 'bonus',
           status: 'completed',
           createdAt: new Date().toISOString(),
           promoCode: inputCode,
           note: "Double Rewards Activated (24h)"
         });
      }
      
      // Record Usage
      batch.update(doc(db, "promo_codes", inputCode), {
        usedBy: [...(promo.usedBy || []), profile.uid]
      });

      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "promo_batch");
        throw err;
      });
      setRefStatus('success');
      return;
    }

    setRefStatus('error');
  } catch (err) {
    console.error("Referral/Promo error:", err);
    // Already handled by throw from handleFirestoreError
    setRefStatus('error');
  }
};

  if (activeSection === 'privacy') return <PrivacyView onBack={() => setActiveSection('main')} />;

  if (activeSection === 'notifications') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase text-neutral-900">Notifications</h2>
        </header>
        <div className="space-y-3 font-urdu">
          {notifications.length === 0 ? (
            <div className="bg-white border border-neutral-100 p-8 rounded-3xl text-center">
              <Bell className="mx-auto text-neutral-200 mb-2" size={32} />
              <p className="text-neutral-400 font-bold uppercase text-[10px]">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={`p-4 rounded-2xl border ${n.read ? 'bg-neutral-50/50 border-neutral-100' : 'bg-white border-orange-500/20 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className={`font-bold text-sm ${n.read ? 'text-neutral-700' : 'text-orange-500'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-orange-500 rounded-full mt-1" />}
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{n.body}</p>
                <p className="text-[8px] text-neutral-400 font-bold uppercase mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  if (activeSection === 'language') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase text-neutral-900">Language / زبان</h2>
        </header>
        <div className="space-y-4">
          <button 
            onClick={() => toggleLanguage('en')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'en' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-900'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-neutral-900">EN</div>
              <span className="font-bold">English (US)</span>
            </div>
            {profile?.language === 'en' && <Check size={20} />}
          </button>
          <button 
            onClick={() => toggleLanguage('ur')}
            className={`w-full p-6 rounded-3xl border flex items-center justify-between group transition-all ${profile?.language === 'ur' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-900'}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-urdu font-black text-lg text-neutral-900">اردو</div>
              <div className="text-left">
                <p className="font-bold">Urdu</p>
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest font-urdu">اردو زبان منتخب کریں</p>
              </div>
            </div>
            {profile?.language === 'ur' && <Check size={20} />}
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeSection === 'favorites') {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSection('main')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-900">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-black italic uppercase text-neutral-900">Favorites</h2>
        </header>
        <div className="space-y-4">
          {(!profile?.favorites || profile.favorites.length === 0) ? (
            <div className="bg-white border border-neutral-100 p-12 rounded-3xl text-center space-y-4">
              <Heart className="mx-auto text-neutral-100" size={48} />
              <p className="text-neutral-400 font-bold uppercase text-xs">No favorites added yet</p>
            </div>
          ) : (
            profile.favorites.map((fav: string) => (
              <div key={fav} className="bg-white border border-neutral-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                    <Zap size={18} />
                  </div>
                  <span className="font-bold uppercase text-sm text-neutral-900">{fav}</span>
                </div>
                <button className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 space-y-6 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''}`}
    >
      <header className="flex flex-col items-center py-8 space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-orange-500 p-1 shadow-xl shadow-orange-500/10">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover bg-neutral-100"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute bottom-0 right-0 bg-white border border-neutral-200 p-1.5 rounded-full text-green-500">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-neutral-900">{profile?.displayName}</h2>
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">{profile?.role}</p>
        </div>
      </header>

      {/* Admin Section */}
      {(profile?.role === 'admin' || isAdminEmail) && (
        <section className="bg-white border border-orange-500/20 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold flex items-center gap-2 text-orange-500">
                <Shield size={18} /> Admin Dashboard
              </h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">Main Admin: zainzeb333@gmail.com</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="w-full bg-orange-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            Enter Admin Panel
          </button>
        </section>
      )}

      {/* Referral Section */}
      <section className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 bg-gradient-to-br from-orange-500/5 to-transparent flex items-center justify-between border-b border-neutral-100">
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2 text-neutral-900">
              <Share2 size={18} className="text-orange-500" /> Promo & Referral
            </h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">Earn RS {referralReward} on every friend's registration</p>
          </div>
          <div className="bg-orange-50 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Active</div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Redeem Promo Code or Invite</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="PROMO OR INVITE"
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-mono font-bold text-sm uppercase placeholder:text-neutral-300 focus:border-orange-500 outline-none transition-colors text-neutral-900"
              />
              <button 
                onClick={submitReferral}
                disabled={refStatus === 'loading' || (refStatus === 'success' && !!profile?.referredBy)}
                className={`w-full sm:w-auto px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all active:scale-95 flex-shrink-0 ${refStatus === 'success' ? 'bg-green-500 text-white' : 'bg-neutral-900 text-white'}`}
              >
                {refStatus === 'loading' ? 'Processing...' : refStatus === 'success' ? 'Applied Successfully' : 'Redeem Code'}
              </button>
            </div>
            {refStatus === 'error' && <p className="text-red-500 text-[10px] font-bold uppercase pl-1 animate-pulse">Invalid or expired code</p>}
          </div>

          <div className="pt-2">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1 mb-2">Your Invite Code</p>
            <div 
              onClick={copyToClipboard}
              className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-4 rounded-2xl cursor-pointer group hover:border-orange-500/30 transition-colors"
            >
              <span className="font-mono font-black text-lg tracking-widest text-orange-500">{profile?.inviteCode}</span>
              <div className="flex items-center gap-2 text-neutral-400 group-hover:text-neutral-600">
                <span className="text-[10px] font-bold uppercase">{copied ? 'Copied' : 'Copy'}</span>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Grid */}
      <section className="grid grid-cols-1 gap-2">
        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-4 mb-2">Account Settings</h3>
        
        {[
          { id: 'notifications', icon: Bell, label: "Notifications", color: "text-blue-500", badge: notifications.filter(n => !n.read).length },
          { id: 'privacy', icon: Shield, label: "Security & Privacy", color: "text-green-500" },
          { id: 'language', icon: Globe, label: "Language / زبان", color: "text-purple-500" },
          { id: 'favorites', icon: Heart, label: "Favorites", color: "text-red-500" },
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveSection(item.id as ActiveSection)}
            className="flex items-center justify-between bg-white p-4 rounded-2xl hover:bg-neutral-50 transition-colors group border border-neutral-100 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center ${item.color} relative`}>
                <item.icon size={20} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">{item.badge}</span>
                ) : null}
              </div>
              <span className="font-bold text-sm text-neutral-900">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-neutral-300 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </section>

      <div className="pt-4 pb-12">
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-red-50 border border-red-100 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} /> Sign Out
        </button>
      </div>
    </motion.div>
  );
}
