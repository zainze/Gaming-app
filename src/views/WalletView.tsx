import { motion } from "motion/react";
import { Plus, Minus, History, CreditCard, ArrowDownCircle, ArrowUpCircle, QrCode, Smartphone, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { formatCurrency } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";

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
};

export default function WalletView({ profile }: { profile: any }) {
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositMethod, setDepositMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank'>('EasyPaisa');
  const [withdrawMethod, setWithdrawMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank'>('EasyPaisa');
  
  // Form States
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: parseFloat(amount),
        type: 'deposit',
        method: depositMethod,
        accountNumber,
        accountName,
        transactionId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: 'Deposit request submitted!' });
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      setTransactionId("");
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
      });

      // Deduct balance immediately to prevent double spending
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        balance: profile.balance - withdrawAmount
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
          <h2 className="text-3xl font-black italic uppercase">Wallet</h2>
          <p className="text-neutral-500 text-sm font-medium">Safe & Secure transactions</p>
        </div>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
          >
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </motion.div>
        )}
      </header>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-[2.5rem] p-8 shadow-2xl shadow-orange-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <CreditCard size={120} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Balance</span>
            <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-[10px] uppercase font-black">Verified</div>
          </div>
          <div className="text-5xl font-black tracking-tighter text-white">
            {formatCurrency(profile?.balance || 0)}
          </div>
          <div className="flex gap-4 pt-4">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
              <p className="text-[10px] text-white/60 font-bold uppercase">Total Wins</p>
              <p className="font-bold text-green-300">
                {formatCurrency(transactions.filter(t => t.type === 'win').reduce((acc, curr) => acc + curr.amount, 0))}
              </p>
            </div>
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl p-3">
              <p className="text-[10px] text-white/60 font-bold uppercase">Pending</p>
              <p className="font-bold text-orange-200">
                {formatCurrency(transactions.filter(t => t.status === 'pending' && t.type === 'withdraw').reduce((acc, curr) => acc + curr.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-900/50 p-1 rounded-3xl flex border border-neutral-800/50">
        {(['deposit', 'withdraw', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMessage(null); }}
            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              tab === t ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' : 'text-neutral-500 hover:text-neutral-300'
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
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Select Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['EasyPaisa', 'JazzCash', 'Bank'] as const).map((m) => (
                    <button 
                      type="button"
                      key={m} 
                      onClick={() => setDepositMethod(m)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        depositMethod === m 
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500' 
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      {m === 'EasyPaisa' ? <Smartphone size={18} /> : m === 'JazzCash' ? <Smartphone size={18} /> : <Landmark size={18} />}
                      <span className="text-[8px] font-black uppercase tracking-tighter">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Amount</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter Amount" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xl font-black focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Phone or Account #" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Account Holder Name</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full Name" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Transaction ID</label>
                  <input 
                    type="text" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Proof of Payment TID" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none font-mono" 
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
              >
                {loading ? "Processing..." : "Submit Deposit Request"}
              </button>
            </div>
          </form>
        )}

        {tab === 'withdraw' && (
          <form onSubmit={handleWithdraw} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Select Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['EasyPaisa', 'JazzCash', 'Bank'] as const).map((m) => (
                    <button 
                      type="button"
                      key={m} 
                      onClick={() => setWithdrawMethod(m)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        withdrawMethod === m 
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500' 
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      {m === 'EasyPaisa' ? <Smartphone size={18} /> : m === 'JazzCash' ? <Smartphone size={18} /> : <Landmark size={18} />}
                      <span className="text-[8px] font-black uppercase tracking-tighter">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Withdraw Amount</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xl font-black focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                  <p className="text-[9px] text-neutral-500 text-right px-1">Available: {formatCurrency(profile?.balance || 0)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Target Account Number</label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Receipt Number/IBAN" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Target Account Name</label>
                  <input 
                    type="text" 
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full Name as on Account" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm font-bold focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Submit Withdrawal"}
              </button>
              <p className="text-[10px] text-neutral-500 text-center font-bold italic">Withdrawals are processed within 2-24 hours</p>
            </div>
          </form>
        )}

        {tab === 'history' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {transactions.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <History className="mx-auto text-neutral-800" size={48} />
                <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-widest">No transaction history found</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.amount > 0 ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase flex items-center gap-2">
                        {tx.type} 
                        {tx.method && <span className="text-[8px] bg-neutral-800 px-1 rounded text-neutral-400">{tx.method}</span>}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-medium uppercase font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.amount > 0 ? 'text-green-500' : 'text-neutral-100'}`}>
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
