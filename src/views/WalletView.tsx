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

  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  const paymentMethods = [
    { id: 'EasyPaisa', name: 'Easypaisa', icon: paymentConfig?.easypaisaLogo || 'https://cdn-icons-png.flaticon.com/512/3039/3039431.png', color: '#00c55c' },
    { id: 'JazzCash', name: 'JazzCash', icon: paymentConfig?.jazzcashLogo || 'https://cdn-icons-png.flaticon.com/512/1041/1041844.png', color: '#ff0000' },
    { id: 'Bank', name: 'Transfer', icon: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png', color: '#ffffff' }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === (tab === 'deposit' ? depositMethod : withdrawMethod)) || paymentMethods[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-12 pb-32 text-white overflow-x-hidden"
    >
      <header className="px-6 pt-8 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
           <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
           <span className="text-[9px] font-black uppercase text-white/40 tracking-[0.4em] font-mono">Dream Ledger V2.0</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">Vault<span className="text-orange-500">.</span></h2>
        </div>
        
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 flex items-center gap-4 px-6 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </motion.div>
        )}
      </header>

      {/* Segmented Control Navigation */}
      <div className="px-6">
        <div className="bg-white/5 p-1 rounded-2xl flex relative border border-white/10 backdrop-blur-xl">
          {(['deposit', 'withdraw', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); setIsMethodDropdownOpen(false); }}
              className={`relative z-10 flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                tab === t ? 'text-black' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className="relative z-10">{t}</span>
              {tab === t && (
                <motion.div 
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white rounded-xl shadow-lg" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Balance HUD */}
      <div className="px-6">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-[2rem] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] backdrop-blur-3xl group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/15 blur-[100px] rounded-full group-hover:scale-110 transition-transform duration-1000" />
          
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
                   <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] font-mono">Liquidity Index</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black tracking-tighter text-white font-mono">
                    {formatCurrency(profile?.balance || 0).replace('RS ', '')}
                  </span>
                  <span className="text-sm font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">PKR</span>
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-xl">
                <CreditCard size={28} strokeWidth={2.5} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md transition-all duration-500 border-l-2 border-l-green-500">
                <span className="text-[9px] text-white/40 font-black uppercase tracking-widest font-mono">Earnings</span>
                <p className="text-2xl font-black text-green-400 tracking-tighter font-mono mt-1">
                  +{formatCurrency(transactions.filter(t => t.type === 'win').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).replace('RS ', '')}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md transition-all duration-500 border-l-2 border-l-orange-500">
                <span className="text-[9px] text-white/40 font-black uppercase tracking-widest font-mono">Pending</span>
                <p className="text-2xl font-black text-orange-400 tracking-tighter font-mono mt-1">
                  {formatCurrency(transactions.filter(t => t.status === 'pending' && t.type === 'withdraw').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).replace('RS ', '')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        {tab !== 'history' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em] pl-2 font-mono">Gateway Selection</label>
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                  className="w-full bg-white border border-black/5 h-16 rounded-2xl px-6 flex items-center justify-between group shadow-lg active:scale-[0.98] transition-all overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/5 p-2 flex items-center justify-center transition-transform group-hover:scale-105">
                      <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-black tracking-tight">{selectedMethod.name}</p>
                    </div>
                  </div>
                  <motion.div 
                    animate={{ rotate: isMethodDropdownOpen ? 180 : 0 }}
                    className="text-black/30"
                  >
                    <ArrowDownCircle size={20} />
                  </motion.div>
                </button>

                {isMethodDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden z-50 shadow-2xl border border-black/5"
                  >
                    {paymentMethods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (tab === 'deposit') setDepositMethod(m.id as any);
                          else setWithdrawMethod(m.id as any);
                          setIsMethodDropdownOpen(false);
                        }}
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors group border-b border-black/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-black/5 p-1 flex items-center justify-center">
                          <img src={m.icon} alt={m.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-bold text-black flex-1 text-left">{m.name}</span>
                        {((tab === 'deposit' ? depositMethod : withdrawMethod) === m.id) && (
                          <CheckCircle2 size={16} className="text-orange-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {tab === 'deposit' && (
              <form onSubmit={handleDeposit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white rounded-2xl p-6 space-y-6 shadow-xl text-black">
                  <div className="space-y-6 divide-y divide-black/5">
                    <div className="pb-6 text-center space-y-2">
                       <p className="text-[10px] font-black uppercase text-orange-500 tracking-[0.4em]">Protocol Target</p>
                       <div className="flex items-center justify-center gap-3">
                         <span className="text-2xl font-black tracking-tight">
                           {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaNumber || "0300 0000000" : 
                            depositMethod === 'JazzCash' ? paymentConfig?.jazzcashNumber || "0300 0000000" : 
                            paymentConfig?.bankNumber || "Not Set"}
                         </span>
                         <motion.button 
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => {
                            const val = depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaNumber : depositMethod === 'JazzCash' ? paymentConfig?.jazzcashNumber : paymentConfig?.bankNumber;
                            navigator.clipboard.writeText(val || '');
                            setMessage({ type: 'success', text: 'Copied to clipboard' });
                          }}
                          className="text-orange-500"
                         >
                           <QrCode size={20} />
                         </motion.button>
                       </div>
                       <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                         Alias: {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaName || "ADMIN" : 
                                  depositMethod === 'JazzCash' ? paymentConfig?.jazzcashName || "ADMIN" : 
                                  paymentConfig?.bankName || "ADMIN"}
                       </p>
                    </div>

                    <div className="pt-6 space-y-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Volume (PKR)</label>
                          <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00" 
                            className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-xl font-black focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Origin ID</label>
                            <input 
                              type="text" 
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              placeholder="Mobile" 
                              className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-sm font-bold focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Sender Sig</label>
                            <input 
                              type="text" 
                              value={accountName}
                              onChange={(e) => setAccountName(e.target.value)}
                              placeholder="Name" 
                              className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-sm font-bold focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                            />
                         </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Transaction ID</label>
                          <input 
                            type="text" 
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter TID" 
                            className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-sm font-bold focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                          />
                       </div>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={loading}
                  className="group relative w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all text-xs overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  {loading ? "Processing..." : "Confirm Protocol"}
                </button>
              </form>
            )}

            {tab === 'withdraw' && (
              <form onSubmit={handleWithdraw} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white rounded-2xl p-6 space-y-6 shadow-xl text-black">
                  <div className="flex justify-between items-end px-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40">Egress Volume</label>
                    <span className="text-[10px] font-black text-orange-500 bg-orange-500/5 px-2 py-0.5 rounded-lg">Avail: {formatCurrency(profile?.balance || 0)}</span>
                  </div>
                  
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full bg-black/5 border border-black/5 rounded-xl p-6 text-4xl font-black font-mono tracking-tighter focus:border-orange-500 focus:bg-white outline-none text-black transition-all text-center" 
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Target IBAN / ID</label>
                      <input 
                        type="text" 
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="03xxxxxxxxxxx" 
                        className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-sm font-bold focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-[0.3em] text-black/40 pl-2">Receiver Name</label>
                       <input 
                        type="text" 
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Legal Name" 
                        className="w-full bg-black/5 border border-black/5 rounded-xl p-4 text-sm font-bold focus:border-orange-500 focus:bg-white outline-none text-black transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <button 
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50 text-xs border border-white/10"
                  >
                    {loading ? "Initializing..." : "Submit Egress"}
                  </button>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-2 backdrop-blur-3xl">
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em]">SEC-AUDIT STATUS</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] font-mono">NODE ACTIVE {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 font-mono">
            {transactions.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center gap-4 backdrop-blur-3xl">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <History className="text-orange-500/40" size={24} strokeWidth={1} />
                </div>
                <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.6em]">Ledger Record Nil</p>
              </div>
            ) : (
              transactions.map((tx, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={tx.id} 
                  className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group transition-all hover:bg-white/10 hover:border-orange-500/20 relative overflow-hidden shadow-lg backdrop-blur-3xl"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${tx.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tx.amount > 0 ? <ArrowDownCircle size={24} strokeWidth={2} /> : <ArrowUpCircle size={24} strokeWidth={2} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-black text-xs uppercase text-white tracking-[0.1em]">{tx.type}</p>
                        {tx.method && (
                          <span className="text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-full tracking-tighter font-black">{tx.method}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">
                        {new Date(tx.createdAt).toLocaleDateString()} / {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1 relative z-10">
                    <p className={`font-black text-lg tracking-tighter ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount).replace('RS ', '')}
                    </p>
                    <div className="flex justify-end">
                      <div className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border border-white/10 ${
                        tx.status === 'completed' ? 'text-green-400' : 
                        tx.status === 'pending' ? 'text-orange-400' : 'text-red-400'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
