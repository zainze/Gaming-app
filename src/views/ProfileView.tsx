import { motion } from "motion/react";
import { LogOut, Share2, Shield, Globe, Bell, ChevronRight, Copy, Check, ArrowLeft, Zap } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, increment, addDoc, writeBatch, getDoc, setDoc } from "firebase/firestore";
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
      className={`space-y-8 pb-24 ${profile?.language === 'ur' ? 'font-urdu' : ''} text-white`}
    >
      <header className="flex flex-col items-center py-8 space-y-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-orange-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
          <div className="relative w-24 h-24 rounded-3xl border-2 border-white/10 p-1 shadow-2xl bg-[#14254f]">
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt="Profile" 
              className="w-full h-full rounded-2xl object-cover bg-[#0b0e11]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#0b0e11] border border-white/10 p-2 rounded-full shadow-xl">
            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b0e11] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{profile?.displayName}</h2>
          <div className="flex items-center justify-center gap-3">
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">{profile?.role}</p>
            <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">{profile?.email?.split('@')[0]}</p>
          </div>
        </div>
      </header>

      {/* Admin Section */}
      {(profile?.role === 'admin' || isAdminEmail) && (
        <section className="mx-6 bg-[#14254f] border border-white/10 rounded-[2.5rem] p-6 space-y-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
             <Shield size={120} className="text-blue-500" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <h3 className="font-black text-white text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                <Shield size={16} className="text-blue-500" /> System Core
              </h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Administrative Privileges Active</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-blue-600/20 active:scale-95 transition-all relative z-10"
          >
            Launch Command Center
          </button>
        </section>
      )}

      {/* Invite & Social */}
      <section className="mx-6 bg-[#14254f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-black text-white uppercase text-xs tracking-[0.2em] flex items-center gap-3">
              <Share2 size={16} className="text-orange-500" /> Alliance Network
            </h3>
          </div>
          <div className="px-3 py-1 bg-green-500/10 rounded-full text-[9px] font-black text-green-400 uppercase tracking-widest border border-green-500/20">Active</div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1 opacity-40 pl-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Signature Identification</p>
            </div>
            <div 
              onClick={copyToClipboard}
              className="flex items-center justify-between bg-[#0b0e11] border border-white/10 p-5 rounded-2xl cursor-pointer group hover:border-orange-500/50 transition-all shadow-inner"
            >
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Invite Hash</span>
                 <span className="font-mono font-black text-2xl tracking-[0.3em] text-white italic">{profile?.inviteCode}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl text-white/40 group-hover:text-white group-hover:bg-orange-500 transition-all">
                <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'Synced' : 'Clone'}</span>
                {copied ? <Check size={16} className="text-white" /> : <Copy size={16} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration Grid */}
      <section className="px-6 space-y-3">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] pl-2 mb-4">System Protocols</h3>
        
        {[
          { id: 'notifications', icon: Bell, label: "Relay Settings", color: "text-blue-500", badge: notifications.filter(n => !n.read).length, desc: "Notification control" },
          { id: 'privacy', icon: Shield, label: "Network Security", color: "text-green-500", desc: "Encryption & sessions" },
          { id: 'language', icon: Globe, label: "Language Modules", color: "text-orange-500", desc: "Localized interfaces" },
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveSection(item.id as ActiveSection)}
            className="w-full flex items-center justify-between bg-[#14254f] px-6 py-5 rounded-3xl hover:bg-[#1a2c5a] transition-all group border border-white/5 shadow-xl hover:shadow-2xl"
          >
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl bg-[#0b0e11] flex items-center justify-center ${item.color} shadow-inner border border-white/5`}>
                <item.icon size={20} />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-black text-sm text-white uppercase tracking-tighter">{item.label}</span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">{item.desc}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {item.badge ? (
                <span className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-black shadow-lg shadow-red-500/20">{item.badge}</span>
              ) : null}
              <ChevronRight size={18} className="text-white/10 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </section>

      <div className="px-6 pt-6 pb-12">
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-[#0b0e11] border border-red-500/20 text-red-500 py-5 rounded-[2rem] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-2xl active:scale-95 group text-xs"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" /> 
          Terminate Session
        </button>
      </div>
    </motion.div>
  );
}
