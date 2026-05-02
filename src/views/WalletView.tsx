import { motion } from "motion/react";
import { Plus, Minus, History, CreditCard, ArrowDownCircle, ArrowUpCircle, QrCode, Smartphone, Landmark, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatCurrency } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
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
      className="p-4 space-y-6 pb-24"
    >
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-3xl font-black italic uppercase text-neutral-900">Wallet</h2>
          <p className="text-neutral-400 text-sm font-medium">Safe & Secure transactions</p>
        </div>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}
          >
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </motion.div>
        )}
      </header>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-[2.5rem] p-8 shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <CreditCard size={120} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Balance</span>
            <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-[10px] uppercase font-black text-white">Verified</div>
          </div>
          <div className="text-5xl font-black tracking-tighter text-white">
            {formatCurrency(profile?.balance || 0)}
          </div>
          <div className="flex gap-4 pt-4">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
              <p className="text-[10px] text-white/60 font-bold uppercase">Total Wins</p>
              <p className="font-bold text-green-200">
                {formatCurrency(transactions.filter(t => t.type === 'win').reduce((acc, curr) => acc + curr.amount, 0))}
              </p>
            </div>
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
              <p className="text-[10px] text-white/60 font-bold uppercase">Pending</p>
              <p className="font-bold text-orange-100">
                {formatCurrency(transactions.filter(t => t.status === 'pending' && t.type === 'withdraw').reduce((acc, curr) => acc + curr.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-100 p-1 rounded-3xl flex border border-neutral-200">
        {(['deposit', 'withdraw', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMessage(null); }}
            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              tab === t ? 'bg-white text-orange-500 shadow-md border border-neutral-100' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
    <div className="space-y-4">
        {tab === 'deposit' && (
          <form onSubmit={handleDeposit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Protocol</label>
                  <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full" /> Instant Processing
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'EasyPaisa', name: 'EasyPaisa', icon: paymentConfig?.easypaisaLogo || 'https://cdn-icons-png.flaticon.com/512/3039/3039431.png' },
                    { id: 'JazzCash', name: 'JazzCash', icon: paymentConfig?.jazzcashLogo || 'https://cdn-icons-png.flaticon.com/512/1041/1041844.png' },
                    { id: 'Bank', name: 'Bank Transfer', icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
                  ].map((m) => (
                    <button 
                      type="button"
                      key={m.id} 
                      onClick={() => setDepositMethod(m.id as any)}
                      className={`relative p-4 rounded-3xl border flex flex-col items-center gap-3 transition-all group ${
                        depositMethod === m.id 
                        ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/5' 
                        : 'border-neutral-100 bg-neutral-50 hover:bg-neutral-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center p-2 transition-transform duration-500 ${depositMethod === m.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                         <img 
                           src={m.icon} 
                           alt={m.name} 
                           className={`w-full h-full object-contain ${depositMethod === m.id ? '' : 'grayscale'}`} 
                         />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${depositMethod === m.id ? 'text-orange-600' : 'text-neutral-400'}`}>{m.name}</span>
                      {depositMethod === m.id && (
                        <motion.div 
                          layoutId="activeMethod"
                          className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center"
                        >
                          <CheckCircle2 size={8} className="text-white" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
                <p className="text-[10px] font-black uppercase text-neutral-400 text-center mb-2">Send Funds to</p>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-100">
                    <span className="text-[8px] font-black uppercase text-neutral-400">Account #</span>
                    <span className="text-xs font-black italic select-all">
                      {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaNumber || "0300 0000000" : 
                       depositMethod === 'JazzCash' ? paymentConfig?.jazzcashNumber || "0300 0000000" : 
                       paymentConfig?.bankNumber || "Not Set"}
                    </span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-100">
                    <span className="text-[8px] font-black uppercase text-neutral-400">Title</span>
                    <span className="text-xs font-black italic">
                      {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaName || "ADMIN" : 
                       depositMethod === 'JazzCash' ? paymentConfig?.jazzcashName || "ADMIN" : 
                       paymentConfig?.bankName || "ADMIN"}
                    </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Amount</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter Amount" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-xl font-black focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Phone or Account #" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Account Holder Name</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full Name" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Transaction ID</label>
                  <input 
                    type="text" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Proof of Payment TID" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none font-mono text-neutral-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Payment Screenshot (Optional)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden" 
                      id="proof-upload"
                    />
                    <label 
                      htmlFor="proof-upload"
                      className="w-full bg-neutral-50 border border-neutral-200 border-dashed rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <Upload size={18} className="text-neutral-400" />
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-tight">
                        {proofFile ? proofFile.name : "Upload Receipt Screenshot"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                {loading ? "Processing..." : "Submit Deposit Request"}
              </button>
            </div>
          </form>
        )}

        {tab === 'withdraw' && (
          <form onSubmit={handleWithdraw} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Select Receiving Method</label>
                   <span className="text-[8px] font-black text-orange-500 uppercase flex items-center gap-1">
                    <span className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" /> Verified Channels Only
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'EasyPaisa', name: 'EasyPaisa', icon: paymentConfig?.easypaisaLogo || 'https://cdn-icons-png.flaticon.com/512/3039/3039431.png' },
                    { id: 'JazzCash', name: 'JazzCash', icon: paymentConfig?.jazzcashLogo || 'https://cdn-icons-png.flaticon.com/512/1041/1041844.png' },
                    { id: 'Bank', name: 'Bank Transfer', icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
                  ].map((m) => (
                    <button 
                      type="button"
                      key={m.id} 
                      onClick={() => setWithdrawMethod(m.id as any)}
                      className={`relative p-4 rounded-3xl border flex flex-col items-center gap-3 transition-all group ${
                        withdrawMethod === m.id 
                        ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/5' 
                        : 'border-neutral-100 bg-neutral-50 hover:bg-neutral-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center p-2 transition-transform duration-500 ${withdrawMethod === m.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                         <img 
                           src={m.icon} 
                           alt={m.name} 
                           className={`w-full h-full object-contain ${withdrawMethod === m.id ? '' : 'grayscale'}`} 
                         />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-tighter ${withdrawMethod === m.id ? 'text-orange-600' : 'text-neutral-400'}`}>{m.name}</span>
                      {withdrawMethod === m.id && (
                        <motion.div 
                          layoutId="activeWithdrawMethod"
                          className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center"
                        >
                          <CheckCircle2 size={8} className="text-white" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Withdraw Amount</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-xl font-black focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                  <p className="text-[9px] text-neutral-400 text-right px-1">Available: {formatCurrency(profile?.balance || 0)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Target Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Receipt Number/IBAN" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Target Account Name</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full Name as on Account" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none text-neutral-900" 
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Submit Withdrawal"}
              </button>
              <p className="text-[10px] text-neutral-400 text-center font-bold italic">Withdrawals are processed within 2-24 hours</p>
            </div>
          </form>
        )}

        {tab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {transactions.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <History className="mx-auto text-neutral-200" size={48} />
                <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">No transaction history found</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white border border-neutral-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.amount > 0 ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase flex items-center gap-2 text-neutral-900">
                        {tx.type} 
                        {tx.method && <span className="text-[8px] bg-neutral-100 px-1 rounded text-neutral-500">{tx.method}</span>}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-medium uppercase font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.amount > 0 ? 'text-green-500' : 'text-neutral-900'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                    <p className={`text-[8px] font-black uppercase ${
                      tx.status === 'completed' ? 'text-green-500' : 
                      tx.status === 'pending' ? 'text-orange-500' : 'text-red-500'
                    }`}>{tx.status}</p>
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
