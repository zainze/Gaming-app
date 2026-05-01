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
  Settings2
} from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDocs, orderBy, addDoc, limit, setDoc, getDoc } from "firebase/firestore";
import { formatCurrency } from "../lib/utils";

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

type Tab = 'dashboard' | 'users' | 'requests' | 'ledger' | 'broadcast' | 'settings';

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

  // System Settings State
  const [globalConfig, setGlobalConfig] = useState({
    minBet: 10,
    dailyBonus: 50,
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
    });

    // Ledger Listener
    const qLedger = query(collection(db, "transactions"), where("status", "==", "completed"), orderBy("createdAt", "desc"), limit(20));
    const unsubLedger = onSnapshot(qLedger, (snap) => {
      setLedgerTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
    });

    const fetchCounts = async () => {
      const uSnap = await getDocs(collection(db, "users"));
      const txsSnap = await getDocs(query(collection(db, "transactions"), where("status", "==", "completed"), where("type", "==", "deposit")));
      const totalDeps = txsSnap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
      setStats(prev => ({ ...prev, totalUsers: uSnap.size, totalDeposits: totalDeps }));
    };
    fetchCounts();

    // Config Listener
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data() as any);
      }
    });

    return () => {
      unsubPending();
      unsubLedger();
      unsubConfig();
    };
  }, []);

  const updateConfig = async (key: string, value: any) => {
    await setDoc(doc(db, "system", "config"), { [key]: value }, { merge: true });
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    const q = query(collection(db, "users"), where("email", "==", searchEmail.trim()), limit(1));
    const snap = await getDocs(q);
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
    { id: 'settings', label: 'Control', icon: Settings2 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-black">
      {/* Horizontal Scrollable Header Tabs */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="flex items-center gap-4 px-4 py-4 overflow-x-auto scrollbar-hide snap-x">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl whitespace-nowrap snap-center transition-all ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 active:scale-95' 
                  : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'
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
                  <div key={s.label} className="bg-neutral-900 border border-neutral-800 p-4 rounded-3xl relative overflow-hidden">
                    <s.icon className={`absolute -top-2 -right-2 opacity-5 scale-150 ${s.color}`} size={48} />
                    <p className="text-[9px] font-black uppercase text-neutral-500 tracking-tighter mb-1">{s.label}</p>
                    <p className="text-xl font-black">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">System Health: Optimal</h4>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Latency: 22ms | Uptime: 99.9%</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-1">Search Database</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Search className="text-neutral-600" size={18} />
                    <input 
                      type="text" 
                      placeholder="user@example.com"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-700" 
                    />
                  </div>
                  <button onClick={searchUser} className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase text-xs">Find</button>
                </div>
              </div>

              {foundUser ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-6 bg-gradient-to-br from-neutral-800/10 to-transparent flex items-center gap-4">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl font-black">
                      {foundUser.displayName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-black text-xl italic uppercase tracking-tighter leading-none mb-1">{foundUser.displayName}</h4>
                      <p className="text-xs text-neutral-500 font-mono italic">{foundUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center text-center">
                      <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase">Balance</p>
                        <p className="text-xl font-black text-orange-500">{formatCurrency(foundUser.balance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase">Level</p>
                        <p className="text-xl font-black">Lvl {Math.floor((foundUser.xp || 0) / 1000) + 1}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase">Status</p>
                        <p className="text-xl font-black text-green-500">Active</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest text-center">Modifier Engine</p>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="Amount" 
                          value={modifyAmount}
                          onChange={(e) => setModifyAmount(e.target.value)}
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 font-mono font-bold" 
                        />
                        <button onClick={() => updateUserBalance('add')} className="bg-green-600 px-4 py-3 rounded-2xl font-black uppercase text-[10px] text-white">Add</button>
                        <button onClick={() => updateUserBalance('subtract')} className="bg-red-600 px-4 py-3 rounded-2xl font-black uppercase text-[10px] text-white">Sub</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/30 border border-dashed border-neutral-800 p-12 rounded-3xl text-center">
                  <UserPlus className="mx-auto text-neutral-800 mb-2" size={48} />
                  <p className="text-neutral-600 font-black uppercase text-[10px]">Enter email above to manage user</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div key="reqs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-4">
              {pendingTxs.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl text-center">
                  <CheckCircle2 className="mx-auto text-neutral-800 mb-2" size={48} />
                  <p className="text-neutral-500 font-black uppercase text-[10px]">No pending requests</p>
                </div>
              ) : (
                pendingTxs.map(tx => (
                  <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.type === 'deposit' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-black uppercase italic text-sm">{tx.type}</p>
                          <p className="text-[10px] font-mono text-neutral-500 uppercase">{tx.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <p className="text-lg font-black">{formatCurrency(tx.amount)}</p>
                    </div>
                    <div className="bg-black/50 p-3 rounded-2xl border border-neutral-800 text-[10px] space-y-1">
                      <div className="flex justify-between"><span className="text-neutral-600 uppercase font-black">Method:</span> <span className="font-black">{tx.method}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-600 uppercase font-black">Account:</span> <span className="font-mono">{tx.accountNumber}</span></div>
                      <div className="flex justify-between"><span className="text-neutral-600 uppercase font-black">Name:</span> <span className="font-black italic">{tx.accountName}</span></div>
                      {tx.transactionId && <div className="flex justify-between pt-1 border-t border-neutral-800 mt-1"><span className="text-neutral-600 uppercase font-black">TID:</span> <span className="font-mono text-orange-500">{tx.transactionId}</span></div>}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleApprove(tx)} className="flex-1 bg-green-500 py-3 rounded-2xl font-black uppercase text-[10px]">Approve</button>
                       <button onClick={() => handleReject(tx)} className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 py-3 rounded-2xl font-black uppercase text-[10px]">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'broadcast' && (
            <motion.div key="broadcast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic">Direct Dispatch</h4>
                  <p className="text-[9px] font-black text-neutral-500 tracking-widest uppercase">Send notification to target user</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-600 ml-1">Target UID</label>
                    <input 
                      type="text" 
                      placeholder="User Unique ID" 
                      value={notifTarget}
                      onChange={(e) => setNotifTarget(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 font-mono text-xs focus:border-orange-500 outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-600 ml-1">Notification Title</label>
                    <input 
                      type="text" 
                      placeholder="Bonus Received!" 
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 font-bold text-xs outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-neutral-600 ml-1">Message Body</label>
                    <textarea 
                      placeholder="RS 500 bonus added to your wallet..." 
                      rows={4}
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 font-medium text-xs outline-none"
                    ></textarea>
                  </div>
                  <button onClick={sendNotification} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                    Send Broadcast
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ledger' && (
            <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: -10 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-1">Global Audit Feed</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-neutral-500">Live</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {ledgerTxs.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-3xl text-center">
                    <History className="mx-auto text-neutral-800 mb-2" size={48} />
                    <p className="text-neutral-500 font-black uppercase text-[10px]">No historical data found</p>
                  </div>
                ) : (
                  ledgerTxs.map(tx => (
                    <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          tx.type === 'win' ? 'bg-orange-500/10 text-orange-500' :
                          tx.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                          tx.type === 'withdraw' ? 'bg-red-500/10 text-red-500' :
                          'bg-neutral-800 text-neutral-400'
                        }`}>
                          {tx.type[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">{tx.type} Log</p>
                          <p className="text-[8px] text-neutral-600 font-mono italic">#{tx.id.substring(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${tx.amount > 0 ? 'text-green-500' : 'text-neutral-100'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-[8px] text-neutral-600 font-bold uppercase">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
                <div className="space-y-1">
                  <h4 className="font-black uppercase italic">Universal Parameters</h4>
                  <p className="text-[9px] font-black text-neutral-500 tracking-widest uppercase">Master controls for platform logic</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-neutral-800">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Minimum Wager</p>
                      <p className="text-xl font-black italic">RS {globalConfig.minBet}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('minBet', Math.max(1, globalConfig.minBet - 5))} className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold">-</button>
                       <button onClick={() => updateConfig('minBet', globalConfig.minBet + 5)} className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-neutral-800">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Daily Bonus Payload</p>
                      <p className="text-xl font-black italic">RS {globalConfig.dailyBonus}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => updateConfig('dailyBonus', Math.max(0, globalConfig.dailyBonus - 10))} className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold">-</button>
                       <button onClick={() => updateConfig('dailyBonus', globalConfig.dailyBonus + 10)} className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-neutral-800">
                    <div>
                      <p className="text-[10px] font-black uppercase text-neutral-400">Maintenance Protocol</p>
                      <p className={`text-sm font-black uppercase ${globalConfig.maintenance ? 'text-red-500' : 'text-green-500'}`}>
                        {globalConfig.maintenance ? 'Active' : 'Offline'}
                      </p>
                    </div>
                    <button 
                      onClick={() => updateConfig('maintenance', !globalConfig.maintenance)}
                      className={`px-6 py-2 rounded-xl font-black uppercase text-xs ${globalConfig.maintenance ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-950/50 border border-dashed border-neutral-800 p-8 rounded-3xl text-center">
                 <ShieldCheck className="mx-auto text-neutral-800 mb-2" size={32} />
                 <p className="text-neutral-600 font-black uppercase text-[8px] tracking-widest">End-to-End System Synchronization Enabled</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="h-20" />
    </motion.div>
  );
}
