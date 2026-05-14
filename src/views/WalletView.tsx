import { motion } from "motion/react";
import { Plus, Minus, History, CreditCard, ArrowDownCircle, ArrowUpCircle, QrCode, Smartphone, Landmark, CheckCircle2, AlertCircle, Upload, Timer } from "lucide-react";
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
      <header className="px-6 pt-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-0.5">
           <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
           <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.4em] font-mono">Ledger V2.0</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">Vault<span className="text-orange-500">.</span></h2>
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
      <div className="px-6 space-y-4">
        <div className="bg-white/5 p-1 rounded-xl flex relative border border-white/10 backdrop-blur-xl">
          {(['deposit', 'withdraw', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); setIsMethodDropdownOpen(false); }}
              className={`relative z-10 flex-1 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${
                tab === t ? 'text-black' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className="relative z-10">{t}</span>
              {tab === t && (
                <motion.div 
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white rounded-lg shadow-lg" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Balance HUD */}
      <div className="px-6">
        <div className="relative isolate overflow-hidden bg-[#14254f] border border-white/10 rounded-[1.8rem] p-5 shadow-2xl group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 blur-[80px] rounded-full" />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-white/30 text-[8px] font-black uppercase tracking-[0.5em] font-mono">Total Equity</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/10">PKR</span>
                  <span className="text-4xl font-black italic tracking-tighter text-white">
                    {Number(profile?.balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <CreditCard size={24} className="text-white opacity-40" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3.5 backdrop-blur-md group-hover:border-green-500/20 transition-all">
                <div className="flex items-center gap-1.5 mb-0.5">
                   <ArrowDownCircle size={8} className="text-green-400" />
                   <span className="text-[7px] text-white/30 font-black uppercase tracking-widest font-mono">Profits</span>
                </div>
                <p className="text-lg font-black italic text-green-400 tracking-tighter truncate">
                  +{transactions.filter(t => t.type === 'win').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3.5 backdrop-blur-md group-hover:border-orange-500/20 transition-all">
                <div className="flex items-center gap-1.5 mb-0.5">
                   <Timer size={8} className="text-orange-400" />
                   <span className="text-[7px] text-white/30 font-black uppercase tracking-widest font-mono">In-Transit</span>
                </div>
                <p className="text-lg font-black italic text-orange-400 tracking-tighter truncate">
                  {Math.abs(transactions.filter(t => t.status === 'pending' && t.type === 'withdraw').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        {tab !== 'history' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] pl-1 font-mono">Gateway Selection</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                    className="w-full bg-white border border-black/5 h-12 rounded-xl px-4 flex items-center justify-between group shadow-lg active:scale-[0.98] transition-all overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black/5 p-1.5 flex items-center justify-center">
                        <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-black uppercase tracking-tight">{selectedMethod.name}</p>
                      </div>
                    </div>
                    <ArrowDownCircle size={16} className={`text-black/30 transition-transform ${isMethodDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                {isMethodDropdownOpen &&
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
                }
              </div>
            </div>
          </div>

            {tab === 'deposit' && (
              <form onSubmit={handleDeposit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-[#14254f] border border-white/10 rounded-[1.8rem] p-6 space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full" />
                  
                  <div className="space-y-6 divide-y divide-white/5">
                    <div className="text-center space-y-2 pb-6">
                       <p className="text-[9px] font-black uppercase text-orange-500 tracking-[0.3em] font-mono">Transfer Protocol</p>
                       <div className="bg-black/20 rounded-xl p-4 border border-white/5 backdrop-blur-md">
                         <div className="flex items-center justify-center gap-3 mb-1">
                           <span className="text-2xl font-black italic tracking-tighter text-white">
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
                              setMessage({ type: 'success', text: 'Protocol Copied' });
                            }}
                            className="bg-orange-500 text-white p-2 rounded-lg shadow-lg"
                           >
                              <QrCode size={14} />
                           </motion.button>
                         </div>
                         <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] font-mono">
                           A/C: {depositMethod === 'EasyPaisa' ? paymentConfig?.easypaisaName || "ADMIN" : 
                                    depositMethod === 'JazzCash' ? paymentConfig?.jazzcashName || "ADMIN" : 
                                    paymentConfig?.bankName || "ADMIN"}
                         </p>
                       </div>
                    </div>

                    <div className="pt-6 space-y-5">
                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Amount (PKR)</label>
                          <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0" 
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xl font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Ph. Number</label>
                            <input 
                              type="text" 
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              placeholder="03..." 
                              className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Sender Name</label>
                            <input 
                              type="text" 
                              value={accountName}
                              onChange={(e) => setAccountName(e.target.value)}
                              placeholder="Legal Name" 
                              className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                            />
                         </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Network TID</label>
                          <input 
                            type="text" 
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Transaction ID" 
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                          />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="px-1">
                  <button 
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-xl font-black italic uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all text-xs"
                  >
                    {loading ? "INITIALIZING..." : "CONFIRM DEPOSIT"}
                  </button>
                </div>
              </form>
            )}

            {tab === 'withdraw' && (
              <form onSubmit={handleWithdraw} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-[#14254f] border border-white/10 rounded-[1.8rem] p-6 space-y-5 shadow-2xl relative overflow-hidden">
                   <div className="flex justify-between items-end px-1">
                     <label className="text-[8px] font-black uppercase tracking-[0.34em] text-white/30 font-mono">Quota Transfer</label>
                     <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/10">Avail: {Number(profile?.balance || 0).toLocaleString()}</span>
                   </div>
                   
                   <div className="relative group">
                     <input 
                       type="number" 
                       value={amount}
                       onChange={(e) => setAmount(e.target.value)}
                       placeholder="0.00" 
                       className="w-full bg-black/20 border border-white/5 rounded-xl p-5 text-3xl font-black italic text-center text-white focus:border-orange-500 focus:bg-white/5 outline-none transition-all shadow-inner" 
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Receiver ID</label>
                       <input 
                         type="text" 
                         value={accountNumber}
                         onChange={(e) => setAccountNumber(e.target.value)}
                         placeholder="03..." 
                         className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                       />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 pl-1 font-mono">Legal Signature</label>
                        <input 
                         type="text" 
                         value={accountName}
                         onChange={(e) => setAccountName(e.target.value)}
                         placeholder="Name" 
                         className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-black italic focus:border-orange-500 focus:bg-white/5 outline-none text-white transition-all shadow-inner" 
                       />
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <button 
                    disabled={loading}
                    className="w-full bg-white text-black py-4 rounded-xl font-black italic uppercase tracking-[0.2em] shadow-xl hover:bg-neutral-100 active:scale-[0.98] transition-all disabled:opacity-50 text-[10px]"
                  >
                    {loading ? "INITIALIZING..." : "EXECUTE RELEASE"}
                  </button>
                  <div className="p-4 bg-black/20 border border-white/5 rounded-xl text-center space-y-1 backdrop-blur-3xl">
                    <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.4em] font-mono">Security Node Active</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-[7px] text-white/10 font-black uppercase tracking-[0.2em] font-mono">GRID ENCRYPTED_V2.1</p>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {transactions.length === 0 ? (
              <div className="text-center py-20 bg-[#14254f] rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <History className="text-white/10" size={20} />
                </div>
                <p className="text-white/20 font-black uppercase text-[8px] tracking-[0.5em] font-mono">Ledger Null</p>
              </div>
            ) : (
              transactions.map((tx, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={tx.id} 
                  className="bg-[#14254f] border border-white/5 p-4 rounded-2xl flex items-center justify-between group transition-all hover:bg-white/5 relative overflow-hidden mb-3"
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-black/20 ${tx.amount > 0 ? 'text-green-400' : 'text-orange-500'}`}>
                      {tx.amount > 0 ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-black italic text-xs uppercase text-white tracking-tight">{tx.type}</p>
                        {tx.method && (
                          <span className="text-[7px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-black uppercase">{tx.method}</span>
                        )}
                      </div>
                      <p className="text-[8px] text-white/20 font-black uppercase tracking-widest font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()} / {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1 relative z-10">
                    <p className={`font-black italic text-sm tracking-tighter ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                      {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()}
                    </p>
                    <div className="flex justify-end">
                      <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        tx.status === 'completed' ? 'text-green-400/60 border-green-500/20' : 
                        tx.status === 'pending' ? 'text-orange-400/60 border-orange-500/20' : 'text-red-400/60 border-red-500/20'
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
