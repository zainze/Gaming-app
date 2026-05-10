import { motion } from "motion/react";
import { Plus, Minus, History, CreditCard, ArrowDownCircle, ArrowUpCircle, QrCode, Smartphone, Landmark, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatCurrency } from "../lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../lib/cloudinary";

type Transaction = {
  id: string;
  type: 'deposit' | 'withdraw' | 'wager' | 'win' | 'referral';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any;
  method?: string;
  accountNumber?: string;
  accountName?: string;
  transactionId?: string;
  proofUrl?: string;
};

export default function WalletView({ profile }: { profile: any }) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositMethod, setDepositMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank'>('EasyPaisa');
  const [withdrawMethod, setWithdrawMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank'>('EasyPaisa');
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  
  // Form States
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setPaymentConfig(snap.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "system/config");
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountNumber || !accountName || !transactionId) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setLoading(true);
    try {
      let proofUrl = "";
      if (proofFile) {
        proofUrl = await uploadToCloudinary(proofFile);
      }

      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: parseFloat(amount),
        type: 'deposit',
        method: depositMethod,
        accountNumber,
        accountName,
        transactionId,
        proofUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });
      setMessage({ type: 'success', text: 'Deposit request submitted!' });
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      setTransactionId("");
      setProofFile(null);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to submit request' });
    }
    setLoading(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (!amount || !accountNumber || !accountName) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (withdrawAmount > (profile?.balance || 0)) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setLoading(true);
    try {
      // Create withdrawal request
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -withdrawAmount,
        type: 'withdraw',
        method: withdrawMethod,
        accountNumber,
        accountName,
        status: 'pending',
        createdAt: new Date().toISOString()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, "transactions");
        throw err;
      });

      // Deduct balance immediately to prevent double spending
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        balance: profile.balance - withdrawAmount
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
        throw err;
      });

      setMessage({ type: 'success', text: 'Withdrawal request submitted!' });
      setAmount("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to submit request' });
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-24 text-white"
    >
      <header className="px-6 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em]">Vault Security active</span>
        </div>
        <h2 className="text-5xl font-black italic tracking-tighter uppercase text-white leading-none">Wallet<span className="text-orange-500">.</span></h2>
        
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-tight ${message.type === 'success' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </motion.div>
        )}
      </header>

      {/* Main Balance Card - Dark Premium Version */}
      <div className="px-6">
        <div className="bg-[#14254f] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-1000">
            <CreditCard size={140} className="text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Engaged Capital</span>
                <div className="w-8 h-0.5 bg-orange-500 rounded-full" />
              </div>
              <div className="bg-orange-500 px-3 py-1 text-[9px] uppercase font-black text-white italic rounded-lg">Verified</div>
            </div>
            <div className="text-6xl font-black tracking-tighter text-white italic truncate pr-4 leading-none">
              {formatCurrency(profile?.balance || 0).replace('RS ', '')}<span className="text-2xl not-italic ml-1 opacity-40">RS</span>
            </div>
            <div className="flex gap-3 pt-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Yields</p>
                <p className="font-black text-lg text-green-400 italic">
                  +{formatCurrency(transactions.filter(t => t.type === 'win').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).replace('RS ', '')}
                </p>
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Transit</p>
                <p className="font-black text-lg text-orange-400 italic">
                  {formatCurrency(transactions.filter(t => t.status === 'pending' && t.type === 'withdraw').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).replace('RS ', '')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="px-6">
        <div className="bg-[#14254f] p-1.5 rounded-[2.5rem] flex border border-white/5 shadow-2xl">
          {(['deposit', 'withdraw', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 relative ${
                tab === t ? 'bg-orange-500 text-white shadow-xl translate-y-[-2px]' : 'text-white/40 hover:text-white'
              }`}
            >
              {t}
              {tab === t && (
                <motion.div layoutId="tab-pill" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-white/40 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6">
        {tab === 'deposit' && (
          <form onSubmit={handleDeposit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[#14254f] border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Channel Protocol</label>
                  <span className="text-[9px] font-black text-green-400 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" /> Realtime
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'EasyPaisa', name: 'EasyPaisa', icon: paymentConfig?.easypaisaLogo || 'https://cdn-icons-png.flaticon.com/512/3039/3039431.png' },
                    { id: 'JazzCash', name: 'JazzCash', icon: paymentConfig?.jazzcashLogo || 'https://cdn-icons-png.flaticon.com/512/1041/1041844.png' },
                    { id: 'Bank', name: 'Bank', icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
                  ].map((m) => (
                    <button 
                      type="button"
                      key={m.id} 
                      onClick={() => setDepositMethod(m.id as any)}
                      className={`relative p-5 rounded-3xl border flex flex-col items-center gap-4 transition-all group ${
                        depositMethod === m.id 
                        ? 'border-orange-500 bg-orange-500/10 shadow-2xl' 
                        : 'border-white/5 bg-[#0b0e11] hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2.5 transition-transform duration-700 ${depositMethod === m.id ? 'scale-110' : 'group-hover:scale-105 opacity-40'}`}>
                         <img 
                           src={m.icon} 
                           alt={m.name} 
                           className={`w-full h-full object-contain ${depositMethod === m.id ? '' : 'grayscale'}`} 
                         />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${depositMethod === m.id ? 'text-white' : 'text-white/20'}`}>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b0e11] rounded-3xl p-6 border border-white/5 space-y-4 shadow-inner">
                <p className="text-[10px] font-black uppercase text-white/20 text-center tracking-[0.2em]">Deployment Destination</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Account ID</span>
                      <span className="text-sm font-black italic text-white select-all">
                        {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaNumber || "0300 0000000" : 
                         depositMethod === 'JazzCash' ? paymentConfig?.jazzcashNumber || "0300 0000000" : 
                         paymentConfig?.bankNumber || "Not Set"}
                      </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Descriptor</span>
                      <span className="text-sm font-black italic text-white">
                        {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaName || "ADMIN" : 
                         depositMethod === 'JazzCash' ? paymentConfig?.jazzcashName || "ADMIN" : 
                         paymentConfig?.bankName || "ADMIN"}
                      </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Amount Units</label>
                  <div className="relative">
                     <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="ENTER UNITS" 
                      className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-5 text-2xl font-black italic tracking-tighter focus:border-orange-500 outline-none text-white shadow-inner" 
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-white/20 italic">RS</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Source Account</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="SENDER NUMBER" 
                    className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:border-orange-500 outline-none text-white shadow-inner" 
                  />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Legal Identity</label>
                   <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="SENDER NAME" 
                    className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:border-orange-500 outline-none text-white shadow-inner" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Proof Protocol ID</label>
                  <input 
                    type="text" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="TID / TRANSACTION HASH" 
                    className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-[0.2em] focus:border-orange-500 outline-none font-mono text-white shadow-inner" 
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/20 active:scale-95 transition-all text-xs"
              >
                {loading ? "PROCESSING..." : "COMMIT DEPOSIT"}
              </button>
            </div>
          </form>
        )}

        {tab === 'withdraw' && (
          <form onSubmit={handleWithdraw} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="bg-[#14254f] border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Vault Exit Protocol</label>
                   <span className="text-[9px] font-black text-orange-500 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" /> Verified Only
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'EasyPaisa', name: 'EasyPaisa', icon: paymentConfig?.easypaisaLogo || 'https://cdn-icons-png.flaticon.com/512/3039/3039431.png' },
                    { id: 'JazzCash', name: 'JazzCash', icon: paymentConfig?.jazzcashLogo || 'https://cdn-icons-png.flaticon.com/512/1041/1041844.png' },
                    { id: 'Bank', name: 'Bank', icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
                  ].map((m) => (
                    <button 
                      type="button"
                      key={m.id} 
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`relative p-5 rounded-3xl border flex flex-col items-center gap-4 transition-all group ${
                        withdrawMethod === m.id 
                        ? 'border-orange-500 bg-orange-500/10 shadow-2xl' 
                        : 'border-white/5 bg-[#0b0e11] hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2.5 transition-transform duration-700 ${withdrawMethod === m.id ? 'scale-110' : 'group-hover:scale-105 opacity-40'}`}>
                         <img 
                           src={m.icon} 
                           alt={m.name} 
                           className={`w-full h-full object-contain ${withdrawMethod === m.id ? '' : 'grayscale'}`} 
                         />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${withdrawMethod === m.id ? 'text-white' : 'text-white/20'}`}>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Egress Amount</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-5 text-2xl font-black italic tracking-tighter focus:border-orange-500 outline-none text-white shadow-inner" 
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-white/20 italic">RS</div>
                  </div>
                  <p className="text-[9px] text-white/30 text-right px-1 font-black uppercase tracking-widest">Available Flux: {formatCurrency(profile?.balance || 0)}</p>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Target Account ID</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="RECEIVER NUMBER / IBAN" 
                    className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:border-orange-500 outline-none text-white shadow-inner" 
                  />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] pl-1">Target Identity</label>
                   <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="RECEIVER LEGAL NAME" 
                    className="w-full bg-[#0b0e11] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:border-orange-500 outline-none text-white shadow-inner" 
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-white text-[#0b0e11] py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all disabled:opacity-50 text-xs"
              >
                {loading ? "PROCESSING..." : "REQUEST WITHDRAWAL"}
              </button>
              <p className="text-[9px] text-white/20 text-center font-black uppercase tracking-widest leading-relaxed">Processing Cycle: 2-24 Hours via Secured Channels</p>
            </div>
          </form>
        )}

        {tab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {transactions.length === 0 ? (
              <div className="text-center py-20 bg-[#14254f] rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                <History className="mx-auto text-white/10" size={80} />
                <p className="text-white/20 font-black uppercase text-[10px] tracking-[0.4em]">Empty Transaction Stream</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-[#14254f] border border-white/5 p-5 rounded-3xl flex items-center justify-between shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-y-0 left-0 w-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${tx.amount > 0 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {tx.amount > 0 ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-sm uppercase tracking-tight flex items-center gap-3 text-white italic">
                        {tx.type} 
                        {tx.method && <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-white/40 tracking-widest">{tx.method}</span>}
                      </p>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`font-black text-lg italic tracking-tighter ${tx.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount).replace('RS ', '')}
                    </p>
                    <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded inline-block ${
                      tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                      tx.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
                    }`}>{tx.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
