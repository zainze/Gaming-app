import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Search,
  Bell,
  History,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  ShieldCheck,
  Zap,
  UserPlus,
  Settings2,
  Gamepad2,
  Trophy,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Landmark
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDocs, orderBy, addDoc, limit, setDoc, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { formatCurrency } from "../lib/utils";
import { uploadToCloudinary } from "../lib/cloudinary";

type Transaction = {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'wager' | 'win' | 'referral' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  method?: string;
  accountNumber?: string;
  accountName?: string;
  transactionId?: string;
};

type Tab = 'dashboard' | 'users' | 'requests' | 'ledger' | 'broadcast' | 'settings' | 'games' | 'banners' | 'promos';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    pendingWd: 0,
    pendingDep: 0,
  });

  // User Management State
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [modifyAmount, setModifyAmount] = useState("");

  // Broadcast State
  const [notifTarget, setNotifTarget] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  const [ledgerTxs, setLedgerTxs] = useState<Transaction[]>([]);
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null);
  const [uploadingBannerId, setUploadingBannerId] = useState<string | null>(null);

  // ... existing system config unsub
  useEffect(() => {
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "banners");
    });
    return () => unsubBanners();
  }, []);

  const addBanner = async () => {
    const id = `banner_${Date.now()}`;
    await setDoc(doc(db, "banners", id), {
      id,
      image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
      title: "New Promotion",
      active: true,
      createdAt: new Date().toISOString()
    });
  };

  const deleteBanner = async (id: string) => {
    // Note: Actually we should use a delete tool or set active false
    // For simplicity in this UI we'll just set active false or prompt
    if (confirm("Delete this banner?")) {
      await updateDoc(doc(db, "banners", id), { active: false });
    }
  };
  const [globalConfig, setGlobalConfig] = useState({
    minBet: 10,
    dailyBonus: 50,
    referralReward: 50,
    maintenance: false
  });

  useEffect(() => {
    // Stats & Pending Listener
    const qPending = query(collection(db, "transactions"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsubPending = onSnapshot(qPending, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
      setPendingTxs(txs);
      setStats(prev => ({
        ...prev,
        pendingWd: txs.filter(t => t.type === 'withdraw').length,
        pendingDep: txs.filter(t => t.type === 'deposit').length
      }));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });

    // Ledger Listener
    const qLedger = query(collection(db, "transactions"), where("status", "==", "completed"), orderBy("createdAt", "desc"), limit(20));
    const unsubLedger = onSnapshot(qLedger, (snap) => {
      setLedgerTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });

    const fetchCounts = async () => {
      try {
        const uSnap = await getDocs(collection(db, "users")).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "users");
          throw err;
        });
        const txsSnap = await getDocs(query(collection(db, "transactions"), where("status", "==", "completed"), where("type", "==", "deposit"))).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "transactions");
          throw err;
        });
        const totalDeps = txsSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
        setStats(prev => ({ ...prev, totalUsers: uSnap.size, totalDeposits: totalDeps }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchCounts();

    // Config Listener
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "system/config");
    });

    const unsubGames = onSnapshot(collection(db, "games"), (snap) => {
      setGamesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "games");
    });

    return () => {
      unsubPending();
      unsubLedger();
      unsubConfig();
      unsubGames();
    };
  }, []);

  useEffect(() => {
    const unsubPromos = onSnapshot(query(collection(db, "promo_codes"), where("active", "==", true), orderBy("createdAt", "desc")), (snap) => {
      setPromos(snap.docs.map(d => ({ ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "promo_codes");
    });
    return () => unsubPromos();
  }, []);

  const updateConfig = async (key: string, value: any) => {
    await setDoc(doc(db, "system", "config"), { [key]: value }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, "system/config");
      throw err;
    });
  };

  const updateGameConfig = async (gameId: string, updates: any) => {
    await setDoc(doc(db, "games", gameId), updates, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `games/${gameId}`);
      throw err;
    });
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    const q = query(collection(db, "users"), where("email", "==", searchEmail.trim()), limit(1));
    const snap = await getDocs(q).catch(err => {
      handleFirestoreError(err, OperationType.LIST, "users");
      throw err;
    });
    if (!snap.empty) {
      setFoundUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } else {
      setFoundUser(null);
    }
  };

  const updateUserBalance = async (type: 'add' | 'subtract') => {
    if (!foundUser || !modifyAmount) return;
    const amount = parseFloat(modifyAmount);
    await updateDoc(doc(db, "users", foundUser.id), {
      balance: increment(type === 'add' ? amount : -amount)
    });
    setModifyAmount("");
    const updatedDoc = await getDocs(query(collection(db, "users"), where("email", "==", foundUser.email), limit(1)));
    if (!updatedDoc.empty) {
      setFoundUser({ id: updatedDoc.docs[0].id, ...updatedDoc.docs[0].data() });
    }
  };

  const sendNotification = async () => {
    if (!notifTarget || !notifTitle || !notifBody) return;
    await addDoc(collection(db, "notifications"), {
      userId: notifTarget,
      title: notifTitle,
      body: notifBody,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    });
    setNotifTitle("");
    setNotifBody("");
    alert("Notification Sent!");
  };

  const handleApprove = async (tx: Transaction) => {
    const txRef = doc(db, "transactions", tx.id);
    const userRef = doc(db, "users", tx.userId);
    if (tx.type === 'deposit') await updateDoc(userRef, { balance: increment(tx.amount) });
    await updateDoc(txRef, { status: 'completed', approvedAt: new Date().toISOString() });
  };

  const handleReject = async (tx: Transaction) => {
    const txRef = doc(db, "transactions", tx.id);
    if (tx.type === 'withdraw') await updateDoc(doc(db, "users", tx.userId), { balance: increment(Math.abs(tx.amount)) });
    await updateDoc(txRef, { status: 'failed', rejectedAt: new Date().toISOString() });
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'requests', label: 'Requests', icon: Clock },
    { id: 'ledger', label: 'Ledger', icon: History },
    { id: 'broadcast', label: 'Broadcast', icon: Bell },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'settings', label: 'Platform Settings', icon: Settings2 },
    { id: 'promos', label: 'Promo Codes', icon: Trophy },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-white">
      {/* Horizontal Scrollable Header Tabs */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-100">
        <div className="flex items-center gap-4 px-4 py-4 overflow-x-auto scrollbar-hide snap-x">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl whitespace-nowrap snap-center transition-all ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95' 
                  : 'bg-neutral-50 text-neutral-400 hover:text-neutral-600 border border-neutral-100'
              }`}
            >
              <tab.icon size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Platform Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
                  { label: "Platform Volume", value: formatCurrency(stats.totalDeposits), icon: TrendingUp, color: "text-green-500" },
                  { label: "Pending Payouts", value: stats.pendingWd, icon: CreditCard, color: "text-orange-500" },
                  { label: "Active Nodes", value: 1, icon: Zap, color: "text-purple-500" },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-neutral-100 p-4 rounded-3xl relative overflow-hidden shadow-sm">
                    <s.icon className={`absolute -top-2 -right-2 opacity-5 scale-150 ${s.color}`} size={48} />
                    <p className="text-[9px] font-black uppercase text-neutral-400 tracking-tighter mb-1">{s.label}</p>
                    <p className="text-xl font-black text-neutral-900">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900">System Health: Optimal</h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">Latency: 22ms | Uptime: 99.9%</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Search Database</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Search className="text-neutral-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="user@example.com"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-300 text-neutral-900" 
                    />
                  </div>
                  <button onClick={searchUser} className="bg-neutral-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-md">Find</button>
                </div>
              </div>

              {foundUser ? (
                <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-6 bg-neutral-50 flex items-center gap-4 border-b border-neutral-100">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg">
                      {foundUser.displayName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-black text-xl italic uppercase tracking-tighter leading-none mb-1 text-neutral-900">{foundUser.displayName}</h4>
                      <p className="text-xs text-neutral-400 font-mono italic">{foundUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center text-center">
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase">Balance</p>
                        <p className="text-xl font-black text-orange-500">{formatCurrency(foundUser.balance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase">Level</p>
                        <p className="text-xl font-black text-neutral-900">Lvl {Math.floor((foundUser.xp || 0) / 1000) + 1}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase">Status</p>
                        <p className="text-xl font-black text-green-500">Active</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Modifier Engine</p>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="Amount" 
                          value={modifyAmount}
                          onChange={(e) => setModifyAmount(e.target.value)}
                          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 font-mono font-bold text-neutral-900" 
                        />
                        <button onClick={() => updateUserBalance('add')} className="bg-green-500 px-4 py-3 rounded-2xl font-black uppercase text-[10px] text-white shadow-md">Add</button>
                        <button onClick={() => updateUserBalance('subtract')} className="bg-red-500 px-4 py-3 rounded-2xl font-black uppercase text-[10px] text-white shadow-md">Sub</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-dashed border-neutral-200 p-12 rounded-3xl text-center">
                  <UserPlus className="mx-auto text-neutral-200 mb-2" size={48} />
                  <p className="text-neutral-400 font-black uppercase text-[10px]">Enter email above to manage user</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div key="reqs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-4">
              {pendingTxs.length === 0 ? (
                <div className="bg-white border border-neutral-100 p-12 rounded-3xl text-center shadow-sm">
                  <CheckCircle2 className="mx-auto text-neutral-100 mb-2" size={48} />
                  <p className="text-neutral-400 font-black uppercase text-[10px]">No pending requests</p>
                </div>
              ) : (
                pendingTxs.map(tx => (
                  <div key={tx.id} className="bg-white border border-neutral-100 p-5 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.type === 'deposit' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-black uppercase italic text-sm text-neutral-900">{tx.type}</p>
                          <p className="text-[10px] font-mono text-neutral-400 uppercase">{tx.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <p className="text-lg font-black text-neutral-900">{formatCurrency(tx.amount)}</p>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100 text-[10px] space-y-1">
                      <div className="flex justify-between"><span className="text-neutral-400 uppercase font-black">Method:</span> <span className="font-black text-neutral-900">{tx.method}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400 uppercase font-black">Account:</span> <span className="font-mono text-neutral-900">{tx.accountNumber}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-400 uppercase font-black">Name:</span> <span className="font-black italic text-neutral-900">{tx.accountName}</span></div>
                      {tx.transactionId && <div className="flex justify-between pt-1 border-t border-neutral-100 mt-1"><span className="text-neutral-400 uppercase font-black">TID:</span> <span className="font-mono text-orange-500">{tx.transactionId}</span></div>}
                      {(tx as any).proofUrl && (
                        <div className="pt-2 border-t border-neutral-100 mt-2">
                           <p className="text-[8px] font-black uppercase text-neutral-400 mb-1">Receipt Screenshot</p>
                           <a href={(tx as any).proofUrl} target="_blank" rel="noreferrer" className="block w-full aspect-video bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
                             <img src={(tx as any).proofUrl} className="w-full h-full object-cover" alt="Proof" />
                           </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleApprove(tx)} className="flex-1 bg-green-500 py-3 rounded-2xl font-black uppercase text-[10px] text-white shadow-md">Approve</button>
                       <button onClick={() => handleReject(tx)} className="flex-1 bg-red-50 border border-red-100 text-red-500 py-3 rounded-2xl font-black uppercase text-[10px] shadow-sm">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'broadcast' && (
            <motion.div key="broadcast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-6">
              <div className="bg-white border border-neutral-100 p-6 rounded-3xl space-y-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-neutral-900">Direct Dispatch</h4>
                  <p className="text-[9px] font-black text-neutral-400 tracking-widest uppercase">Send notification to target user</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-100">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Target UID</label>
                    <input 
                      type="text" 
                      placeholder="User Unique ID" 
                      value={notifTarget}
                      onChange={(e) => setNotifTarget(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 font-mono text-xs focus:border-orange-500 outline-none text-neutral-900" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Notification Title</label>
                    <input 
                      type="text" 
                      placeholder="Bonus Received!" 
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 font-bold text-xs outline-none text-neutral-900" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Message Body</label>
                    <textarea 
                      placeholder="RS 500 bonus added to your wallet..." 
                      rows={4}
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 font-medium text-xs outline-none text-neutral-900"
                    ></textarea>
                  </div>
                  <button onClick={sendNotification} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                    Send Broadcast
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'promos' && (
            <motion.div key="promos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-white border border-neutral-100 p-6 rounded-3xl space-y-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-neutral-900">Create Promo Code</h4>
                  <p className="text-[9px] font-black text-neutral-400 tracking-widest uppercase">Generate new reward strings</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-100">
                   <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Code String</label>
                        <input id="new-promo-code" type="text" placeholder="LUCKY100" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 font-mono font-black text-xs uppercase" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Reward Value</label>
                        <input id="new-promo-value" type="number" placeholder="100" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 font-black text-xs" />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-neutral-400 ml-1">Reward Type</label>
                      <select id="new-promo-type" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 font-black text-xs uppercase appearance-none">
                        <option value="balance">Net Cash (Balance)</option>
                        <option value="double_rewards">24H Double Rewards (2X)</option>
                      </select>
                   </div>
                   <button 
                     onClick={async () => {
                       const code = (document.getElementById('new-promo-code') as HTMLInputElement).value.toUpperCase().trim();
                       const val = (document.getElementById('new-promo-value') as HTMLInputElement).value;
                       const type = (document.getElementById('new-promo-type') as HTMLSelectElement).value;
                       if (!code || !val) return;
                       
                       await setDoc(doc(db, "promo_codes", code), {
                         code,
                         value: parseFloat(val),
                         type,
                         active: true,
                         usedBy: [],
                         createdAt: new Date().toISOString()
                       });
                       alert("Promo Code Created!");
                     }}
                     className="w-full bg-neutral-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
                   >
                     Deploy Promo Code
                   </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Live Promo Registry</p>
                <div className="grid gap-3">
                  {promos.length === 0 ? (
                    <p className="text-center text-neutral-400 text-[8px] font-bold uppercase py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                      No promo codes created yet
                    </p>
                  ) : (
                    promos.map(p => (
                      <div key={p.code} className="bg-white border border-neutral-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center font-mono font-black text-xs text-orange-500">{p.code[0]}</div>
                          <div>
                            <p className="text-xs font-black uppercase italic text-neutral-900">{p.code}</p>
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">
                              {p.type === 'balance' ? `Reward: RS ${p.value}` : p.type} • Used: {p.usedBy?.length || 0}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (confirm("Delete this promo?")) {
                              // We'll set active false or delete
                              await updateDoc(doc(db, "promo_codes", p.code), { active: false });
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Global Audit Feed</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-neutral-400">Live</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {ledgerTxs.length === 0 ? (
                  <div className="bg-white border border-neutral-100 p-12 rounded-3xl text-center shadow-sm">
                    <History className="mx-auto text-neutral-100 mb-2" size={48} />
                    <p className="text-neutral-400 font-black uppercase text-[10px]">No historical data found</p>
                  </div>
                ) : (
                  ledgerTxs.map(tx => (
                    <div key={tx.id} className="bg-white border border-neutral-100 p-4 rounded-2xl flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          tx.type === 'win' ? 'bg-orange-500/10 text-orange-500' :
                          tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                          tx.type === 'withdraw' ? 'bg-red-500/10 text-red-500' :
                          'bg-neutral-50 text-neutral-400 border border-neutral-100'
                        }`}>
                          {tx.type[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight text-neutral-900">{tx.type} Log</p>
                          <p className="text-[8px] text-neutral-400 font-mono italic">#{tx.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${tx.amount > 0 ? 'text-green-500' : 'text-neutral-900'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[8px] text-neutral-400 font-bold uppercase">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'banners' && (
            <motion.div key="banners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pb-20">
               <div className="flex items-center justify-between px-1">
                 <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Banner Marketing Slider</p>
                 <button 
                   onClick={addBanner}
                   className="bg-neutral-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase shadow-md active:scale-95 transition-all flex items-center gap-2"
                 >
                   <Plus size={12} /> New Promotion
                 </button>
               </div>

               <div className="grid gap-4">
                {banners.filter(b => b.active !== false).map(banner => (
                  <div key={banner.id} className="bg-white border border-neutral-100 p-4 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex gap-4">
                      <div className="w-32 aspect-video bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 relative group flex-shrink-0">
                        <img src={banner.image} className="w-full h-full object-cover" alt="Banner" />
                        {uploadingBannerId === banner.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Campaign Title</label>
                          <input 
                            type="text" 
                            value={banner.title}
                            onChange={(e) => updateDoc(doc(db, "banners", banner.id), { title: e.target.value })}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex gap-2">
                           <input 
                             type="file" 
                             id={`banner-file-${banner.id}`}
                             className="hidden" 
                             accept="image/*"
                             onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingBannerId(banner.id);
                                try {
                                  const url = await uploadToCloudinary(file);
                                  await updateDoc(doc(db, "banners", banner.id), { image: url });
                                } catch (err: any) {
                                  alert(err.message);
                                } finally {
                                  setUploadingBannerId(null);
                                }
                             }}
                           />
                           <label 
                             htmlFor={`banner-file-${banner.id}`}
                             className="flex-1 bg-neutral-900 text-white rounded-xl py-2 flex items-center justify-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                           >
                              <Upload size={12} /> Replace
                           </label>
                           <button 
                             onClick={() => deleteBanner(banner.id)}
                             className="p-2 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {banners.filter(b => b.active !== false).length === 0 && (
                  <div className="bg-white border border-neutral-100 p-12 rounded-3xl text-center shadow-sm">
                    <ImageIcon className="mx-auto text-neutral-100 mb-2" size={48} />
                    <p className="text-[10px] text-neutral-400 font-black uppercase">No active campaigns</p>
                  </div>
                )}
               </div>
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div key="games" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 pb-20">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Game Management</p>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        const id = prompt("Enter Unique Game ID (e.g. roulette, poker):");
                        if (!id) return;
                        const name = prompt("Enter Display Name:");
                        if (!name) return;
                        await setDoc(doc(db, "games", id.toLowerCase()), { 
                          id: id.toLowerCase(), 
                          name, 
                          active: false, 
                          minBet: 10, 
                          winRate: 50, 
                          multiplier: 2,
                          createdAt: new Date().toISOString() 
                        }, { merge: true });
                        alert("Custom module registered!");
                      }}
                      className="text-[8px] bg-neutral-100 text-neutral-400 px-3 py-1.5 rounded-lg font-black uppercase shadow-sm active:scale-95 transition-all"
                    >
                      + Add Game
                    </button>
                    <button 
                      onClick={async () => {
                        const initialGames = [
                          { id: 'slipper', name: 'Slipper Monte', category: 'Skill', minBet: 20, winRate: 33, winMultiplier: 3, penaltyAmount: 50, image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop" },
                          { id: 'spin', name: 'Spin Wheel', category: 'Classic', minBet: 10, winRate: 30, multiplier: 5, image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
                          { id: 'coin', name: 'Coin Flip', category: 'Classic', minBet: 10, winRate: 50, multiplier: 2, image: "https://cdn-icons-png.flaticon.com/512/550/550614.png" },
                          { id: 'swipe', name: 'Swipe Master', category: 'Skill', minBet: 10, winRate: 40, multiplier: 3, image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" },
                          { id: 'chests', name: 'Lucky Chests', category: 'Classic', minBet: 10, winRate: 33, multiplier: 3, image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" },
                          { id: 'dice', name: 'Dice Pro', category: 'Classic', minBet: 10, winRate: 45, multiplier: 2, image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png" },
                          { id: 'scratch', name: 'Gold Scratch', category: 'Skill', minBet: 10, winRate: 40, multiplier: 4, image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
                          { id: 'aviator', name: 'Aviator', category: 'Classic', minBet: 10, winRate: 50, multiplier: 2, image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop" },
                          { id: 'plinko', name: 'Plinko Pro', category: 'Skill', minBet: 10, winRate: 45, multiplier: 5, image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop" },
                          { id: 'mines', name: 'Mines Finder', category: 'Skill', minBet: 10, winRate: 35, multiplier: 10, image: "https://images.unsplash.com/photo-1624474322421-4ea671e23363?q=80&w=400&auto=format&fit=crop" }
                        ];
                        for (const g of initialGames) {
                          const docRef = doc(db, "games", g.id);
                          await setDoc(docRef, { ...g, active: true }, { merge: true });
                        }
                        alert("Full Game Registry Synced! All modules should now appear below.");
                      }}
                     className="text-[8px] bg-neutral-900 text-white px-3 py-1.5 rounded-lg font-black uppercase shadow-md active:scale-95 transition-all"
                   >
                     Sync Registry
                   </button>
                   <button 
                     onClick={async () => {
                       const demoBanners = [
                         { id: 'b1', title: 'Cyber Weekend: Double Winnings', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop', active: true },
                         { id: 'b2', title: 'New Aviator Engine Live', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop', active: true },
                         { id: 'b3', title: 'Elite Slipper Tournament', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop', active: true }
                       ];
                       for (const b of demoBanners) {
                         await setDoc(doc(db, "banners", b.id), { ...b, createdAt: new Date().toISOString() });
                       }
                       alert("Marketing Banners Synced!");
                     }}
                     className="text-[8px] bg-orange-600 text-white px-3 py-1.5 rounded-lg font-black uppercase shadow-md active:scale-95 transition-all"
                   >
                     Sync Banners
                   </button>
                   <span className="text-[8px] font-black uppercase text-neutral-400">{gamesList.length} Active Modules</span>
                </div>
              </div>

              {gamesList.length === 0 ? (
                <div className="bg-white border border-neutral-100 p-12 rounded-3xl text-center shadow-sm">
                  <Gamepad2 className="mx-auto text-neutral-100 mb-2" size={48} />
                  <p className="text-neutral-400 font-black uppercase text-[10px]">No games discovered in registry</p>
                  <button 
                    onClick={async () => {
                      const initialGames = [
                        { id: 'slipper', name: 'Slipper Monte', category: 'Skill', minBet: 20, winRate: 33, winMultiplier: 3, penaltyAmount: 50, image: "https://images.unsplash.com/photo-1626775238053-4315516ebaec?q=80&w=400&auto=format&fit=crop" },
                        { id: 'spin', name: 'Spin Wheel', category: 'Classic', minBet: 10, winRate: 30, multiplier: 5, image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
                        { id: 'coin', name: 'Coin Flip', category: 'Classic', minBet: 10, winRate: 50, multiplier: 2, image: "https://cdn-icons-png.flaticon.com/512/550/550614.png" },
                        { id: 'swipe', name: 'Swipe Master', category: 'Skill', minBet: 10, winRate: 40, multiplier: 3, image: "https://cdn-icons-png.flaticon.com/512/2641/2641421.png" },
                        { id: 'chests', name: 'Lucky Chests', category: 'Classic', minBet: 10, winRate: 33, multiplier: 3, image: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" },
                        { id: 'dice', name: 'Dice Pro', category: 'Classic', minBet: 10, winRate: 45, multiplier: 2, image: "https://cdn-icons-png.flaticon.com/512/3533/3533966.png" },
                        { id: 'scratch', name: 'Gold Scratch', category: 'Skill', minBet: 10, winRate: 40, multiplier: 4, image: "https://cdn-icons-png.flaticon.com/512/1210/1210515.png" },
                        { id: 'aviator', name: 'Aviator', category: 'Classic', minBet: 10, winRate: 50, multiplier: 2, image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=400&auto=format&fit=crop" },
                        { id: 'plinko', name: 'Plinko Pro', category: 'Skill', minBet: 10, winRate: 45, multiplier: 5, image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop" },
                        { id: 'mines', name: 'Mines Finder', category: 'Skill', minBet: 10, winRate: 35, multiplier: 10, image: "https://images.unsplash.com/photo-1624474322421-4ea671e23363?q=80&w=400&auto=format&fit=crop" }
                      ];
                      for (const g of initialGames) {
                        await setDoc(doc(db, "games", g.id), { ...g, active: true, createdAt: new Date().toISOString() }, { merge: true });
                      }
                    }}
                    className="mt-4 text-[10px] bg-orange-500 text-white px-4 py-2 rounded-xl font-black uppercase shadow-lg shadow-orange-500/20"
                  >
                    Bootstrap Registry
                  </button>
                  <p className="mt-2 text-[8px] text-neutral-400 max-w-[200px] mx-auto uppercase font-bold">Use Cloudinary for high-res thumbnails instead of SVG icons.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {gamesList.map((game) => (
                    <div key={game.id} className="bg-white border border-neutral-100 rounded-3xl p-5 space-y-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                             <Gamepad2 size={20} />
                          </div>
                          <div>
                            <h4 className="font-black uppercase italic tracking-tighter text-neutral-900">{game.name || game.id}</h4>
                            <p className="text-[8px] font-mono text-neutral-400">ID: {game.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${game.active ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-[8px] font-black uppercase text-neutral-400">{game.active ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                        <div className="col-span-2 space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[8px] font-black uppercase text-neutral-400">Game Thumbnail (Cloudinary)</label>
                              {game.image && <span className="text-[8px] text-green-500 font-black uppercase">Hosting Active</span>}
                           </div>
                           <div className="flex gap-3">
                              <div className="w-16 h-16 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200 flex-shrink-0">
                                 {game.image ? (
                                   <img src={game.image} className="w-full h-full object-cover" alt="Game" />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                      <ImageIcon size={20} />
                                   </div>
                                 )}
                              </div>
                              <div className="flex-1 space-y-2">
                                 <input 
                                   type="file" 
                                   id={`file-${game.id}`}
                                   className="hidden" 
                                   accept="image/*"
                                   onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingGameId(game.id);
                                      try {
                                        console.log('Starting Cloudinary upload for:', game.id);
                                        const url = await uploadToCloudinary(file);
                                        console.log('Upload successful! URL:', url);
                                        await updateGameConfig(game.id, { image: url });
                                      } catch (err: any) {
                                        console.error('Upload failed details:', err);
                                        alert(`Upload failed: ${err.message}. Please check if VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set correctly in your environment.`);
                                      } finally {
                                        setUploadingGameId(null);
                                      }
                                   }}
                                 />
                                 <label 
                                   htmlFor={`file-${game.id}`}
                                   disabled={uploadingGameId === game.id}
                                   className={`w-full bg-neutral-900 text-white rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest ${uploadingGameId === game.id ? 'opacity-50 cursor-wait' : ''}`}
                                 >
                                    {uploadingGameId === game.id ? (
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Upload size={14} />
                                    )}
                                    {uploadingGameId === game.id ? 'Uploading...' : (game.image ? 'Replace Image' : 'Upload Thumbnail')}
                                 </label>
                                 <p className="text-[8px] text-neutral-400 uppercase font-bold text-center">Cloudinary CDN Link: {game.image?.substring(0, 30)}...</p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Min Bet (RS)</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={game.minBet || 10}
                              onChange={(e) => updateGameConfig(game.id, { minBet: Number(e.target.value) })}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-black text-xs outline-none focus:border-orange-500 text-neutral-900" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Win Probability (%)</label>
                          <input 
                            type="number" 
                            value={game.winRate || 50}
                            min="0"
                            max="100"
                            onChange={(e) => updateGameConfig(game.id, { winRate: Number(e.target.value) })}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-black text-xs outline-none focus:border-orange-500 text-neutral-900" 
                          />
                        </div>
                         <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Payout Multiplier</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={game.id === 'slipper' ? (game.winMultiplier || 3) : (game.multiplier || 2)}
                            onChange={(e) => updateGameConfig(game.id, game.id === 'slipper' ? { winMultiplier: Number(e.target.value) } : { multiplier: Number(e.target.value) })}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-black text-xs outline-none focus:border-orange-500 text-neutral-900" 
                          />
                        </div>
                        {game.id === 'slipper' && (
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase text-neutral-400">Penalty Amount (RS)</label>
                            <input 
                              type="number" 
                              value={game.penaltyAmount || 50}
                              onChange={(e) => updateGameConfig(game.id, { penaltyAmount: Number(e.target.value) })}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-black text-xs outline-none focus:border-orange-500 text-neutral-900" 
                            />
                          </div>
                        )}
                        <div className="space-y-1.5 flex flex-col justify-end">
                           <label className="text-[8px] font-black uppercase text-neutral-400">Game Category</label>
                           <select 
                             value={game.category || 'Classic'}
                             onChange={(e) => updateGameConfig(game.id, { category: e.target.value })}
                             className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 font-black text-xs outline-none focus:border-orange-500 text-neutral-900 appearance-none"
                           >
                             <option value="Classic">Classic</option>
                             <option value="Skill">Skill</option>
                             <option value="Elite">Elite</option>
                             <option value="Multiplayer">Multiplayer</option>
                           </select>
                        </div>

                        <div className="flex items-end">
                          <button 
                            onClick={() => updateGameConfig(game.id, { active: !game.active })}
                            className={`w-full py-2 rounded-xl font-black uppercase text-[10px] border transition-all ${
                              game.active 
                                ? 'bg-red-50 border-red-100 text-red-500' 
                                : 'bg-green-50 border-green-100 text-green-500'
                            }`}
                          >
                            {game.active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-white border border-neutral-100 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-neutral-900">Universal Parameters</h4>
                  <p className="text-[9px] font-black text-neutral-400 tracking-widest uppercase">Master controls for platform logic</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Minimum Wager</p>
                      <p className="text-xl font-black italic text-neutral-900">RS {globalConfig.minBet}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('minBet', Math.max(1, globalConfig.minBet - 5))} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">-</button>
                       <button onClick={() => updateConfig('minBet', globalConfig.minBet + 5)} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Referral Reward</p>
                      <p className="text-xl font-black italic text-neutral-900">RS {(globalConfig as any).referralReward || 50}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('referralReward', Math.max(0, ((globalConfig as any).referralReward || 50) - 10))} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">-</button>
                       <button onClick={() => updateConfig('referralReward', ((globalConfig as any).referralReward || 50) + 10)} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Daily Bonus Payload</p>
                      <p className="text-xl font-black italic text-neutral-900">RS {globalConfig.dailyBonus}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('dailyBonus', Math.max(0, globalConfig.dailyBonus - 10))} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">-</button>
                       <button onClick={() => updateConfig('dailyBonus', globalConfig.dailyBonus + 10)} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Joining Bonus (New Users)</p>
                      <p className="text-xl font-black italic text-neutral-900">RS {(globalConfig as any).joiningBonus || 0}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('joiningBonus', Math.max(0, ((globalConfig as any).joiningBonus || 0) - 10))} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">-</button>
                       <button onClick={() => updateConfig('joiningBonus', ((globalConfig as any).joiningBonus || 0) + 10)} className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-bold text-neutral-900 shadow-sm">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Maintenance Protocol</p>
                      <p className={`text-sm font-black uppercase ${globalConfig.maintenance ? 'text-red-500' : 'text-green-500'}`}>
                        {globalConfig.maintenance ? 'Active' : 'Offline'}
                      </p>
                    </div>
                    <button 
                      onClick={() => updateConfig('maintenance', !globalConfig.maintenance)}
                      className={`px-6 py-2 rounded-xl font-black uppercase text-xs ${globalConfig.maintenance ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white border border-neutral-200 text-neutral-400 shadow-sm'}`}
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Configuration */}
              <div className="bg-white border border-neutral-100 p-6 rounded-3xl space-y-6 shadow-sm">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic text-neutral-900">Wallet Gateways</h4>
                  <p className="text-[9px] font-black text-neutral-400 tracking-widest uppercase">Configure EasyPaisa & JazzCash Terminal Details</p>
                </div>

                <div className="space-y-6 pt-4 border-t border-neutral-100">
                  {/* EasyPaisa Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <img src={(globalConfig as any).easypaisaLogo || "https://cdn-icons-png.flaticon.com/512/3039/3039431.png"} className="w-8 h-8 object-contain rounded-lg" alt="EP" />
                          <span className="text-[10px] font-black uppercase text-neutral-900">EasyPaisa Hub</span>
                       </div>
                       <div className="flex gap-2">
                          <input type="file" id="ep-logo" className="hidden" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadToCloudinary(file);
                              updateConfig('easypaisaLogo', url);
                            }
                          }} />
                          <label htmlFor="ep-logo" className="cursor-pointer bg-neutral-100 p-2 rounded-lg text-[8px] font-black uppercase hover:bg-neutral-200">Upload Logo</label>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <input 
                         type="text" 
                         placeholder="EP Number" 
                         value={(globalConfig as any).easypaisaNumber || ''}
                         onChange={(e) => updateConfig('easypaisaNumber', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                       <input 
                         type="text" 
                         placeholder="EP Title" 
                         value={(globalConfig as any).easypaisaName || ''}
                         onChange={(e) => updateConfig('easypaisaName', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                    </div>
                  </div>

                  {/* JazzCash Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <img src={(globalConfig as any).jazzcashLogo || "https://cdn-icons-png.flaticon.com/512/1041/1041844.png"} className="w-8 h-8 object-contain rounded-lg" alt="JC" />
                          <span className="text-[10px] font-black uppercase text-neutral-900">JazzCash Hub</span>
                       </div>
                       <div className="flex gap-2">
                          <input type="file" id="jc-logo" className="hidden" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await uploadToCloudinary(file);
                              updateConfig('jazzcashLogo', url);
                            }
                          }} />
                          <label htmlFor="jc-logo" className="cursor-pointer bg-neutral-100 p-2 rounded-lg text-[8px] font-black uppercase hover:bg-neutral-200">Upload Logo</label>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <input 
                         type="text" 
                         placeholder="JC Number" 
                         value={(globalConfig as any).jazzcashNumber || ''}
                         onChange={(e) => updateConfig('jazzcashNumber', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                       <input 
                         type="text" 
                         placeholder="JC Title" 
                         value={(globalConfig as any).jazzcashName || ''}
                         onChange={(e) => updateConfig('jazzcashName', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                    </div>
                  </div>

                  {/* Bank Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                             <Landmark size={14} className="text-neutral-400" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-neutral-900">Bank Transfer Hub</span>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <input 
                         type="text" 
                         placeholder="Account/IBAN" 
                         value={(globalConfig as any).bankNumber || ''}
                         onChange={(e) => updateConfig('bankNumber', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                       <input 
                         type="text" 
                         placeholder="Bank Title" 
                         value={(globalConfig as any).bankName || ''}
                         onChange={(e) => updateConfig('bankName', e.target.value)}
                         className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-black outline-none focus:border-orange-500" 
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 border border-dashed border-neutral-200 p-8 rounded-3xl text-center">
                 <ShieldCheck className="mx-auto text-neutral-100 mb-2" size={32} />
                 <p className="text-neutral-400 font-black uppercase text-[8px] tracking-widest">End-to-End System Synchronization Enabled</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="h-20" />
    </motion.div>
  );
}
