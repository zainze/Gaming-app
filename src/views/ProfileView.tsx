import { motion } from "motion/react";
import { LogOut, Share2, Shield, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Zap } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc, writeBatch, getDoc, setDoc } from "firebase/firestore";
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

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 space-y-6 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''}`}
    >
      <header className="flex flex-col items-center py-6 space-y-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl border-2 border-neutral-100 p-1 shadow-sm">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt="Profile" 
              className="w-full h-full rounded-xl object-cover bg-neutral-50"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white border border-neutral-100 p-1.5 rounded-full shadow-sm">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">{profile?.displayName}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{profile?.role}</p>
            <div className="w-1 h-1 bg-neutral-300 rounded-full" />
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{profile?.email?.split('@')[0]}</p>
          </div>
        </div>
      </header>

      {/* Admin Section */}
      {(profile?.role === 'admin' || isAdminEmail) && (
        <section className="bg-neutral-900 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Shield size={14} className="text-blue-400" /> Admin Access
              </h3>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-tight">System Management Console</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            Launch Admin Panel
          </button>
        </section>
      )}

      {/* Vouchers & Referrals */}
      <section className="bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-black text-neutral-900 uppercase text-xs flex items-center gap-2">
              <Zap size={14} className="text-orange-500" /> Account Rewards
            </h3>
          </div>
          <div className="px-2 py-0.5 bg-neutral-200 rounded text-[8px] font-black text-neutral-500 uppercase tracking-wider">Verified</div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Redeem Voucher Code</p>
             <div className="flex gap-2">
                <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl focus-within:border-neutral-900 transition-all">
                  <input 
                    type="text" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter code..."
                    className="w-full bg-transparent px-4 py-3 font-mono font-black text-sm uppercase placeholder:text-neutral-300 outline-none text-neutral-900"
                  />
                </div>
                <button 
                  onClick={submitReferral}
                  disabled={refStatus === 'loading' || (refStatus === 'success' && !!profile?.referredBy)}
                  className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex-shrink-0 ${refStatus === 'success' ? 'bg-green-600 text-white' : 'bg-neutral-900 text-white'}`}
                >
                  {refStatus === 'loading' ? '...' : refStatus === 'success' ? 'Applied' : 'Redeem'}
                </button>
             </div>
             {refStatus === 'error' && <p className="text-red-500 text-[9px] font-black uppercase pl-1">Invalid or expired code</p>}
          </div>

          <div className="pt-6 border-t border-neutral-100">
            <div className="flex items-center gap-2 mb-3">
              <Share2 size={14} className="text-neutral-400" />
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Share Invite Code</p>
            </div>
            <div 
              onClick={copyToClipboard}
              className="flex items-center justify-between border border-neutral-200 p-4 rounded-xl cursor-pointer group hover:border-neutral-900 transition-all"
            >
              <span className="font-mono font-black text-lg tracking-widest text-neutral-900">{profile?.inviteCode}</span>
              <div className="flex items-center gap-2 text-neutral-400 group-hover:text-neutral-900 transition-colors">
                <span className="text-[9px] font-black uppercase">{copied ? 'Copied' : 'Copy'}</span>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Grid */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] pl-2 mb-3">Preferences</h3>
        
        {[
          { id: 'notifications', icon: Bell, label: "Notification Settings", color: "text-blue-500", badge: notifications.filter(n => !n.read).length },
          { id: 'privacy', icon: Shield, label: "Security & Privacy", color: "text-neutral-900" },
          { id: 'language', icon: Globe, label: "Display Language", color: "text-neutral-900" },
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveSection(item.id as ActiveSection)}
            className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl hover:bg-neutral-50 transition-colors group border border-neutral-100"
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center ${item.color}`}>
                <item.icon size={16} />
              </div>
              <span className="font-bold text-sm text-neutral-900">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              {item.badge ? (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black">{item.badge}</span>
              ) : null}
              <ChevronRight size={16} className="text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
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
