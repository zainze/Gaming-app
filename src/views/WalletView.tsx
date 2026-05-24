import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, CreditCard, Shield, CheckCircle2, XCircle, AlertCircle, Copy, Check,
  History, Smartphone, HelpCircle, Upload
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, 
  addDoc, updateDoc, doc, increment 
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { playSound } from "../lib/sounds";

type Tab = "deposit" | "withdraw" | "history";

export default function WalletView({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab ] = useState<Tab>("withdraw");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Platform configuration state (EasyPaisa & JazzCash credentials)
  const [systemConfig, setSystemConfig] = useState<any>({
    easypaisaLogo: "https://cdn-icons-png.flaticon.com/512/3039/3039431.png",
    easypaisaNumber: "03001234567",
    easypaisaName: "Admin Wallet",
    jazzcashLogo: "https://cdn-icons-png.flaticon.com/512/1041/1041844.png",
    jazzcashNumber: "03107654321",
    jazzcashName: "Main Office",
    minBet: 10
  });

  // User transaction list state
  const [transactions, setTransactions] = useState<any[]>([]);

  // Deposit Form Inputs
  const [depositGateway, setDepositGateway] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNumber, setDepositNumber] = useState("");
  const [depositName, setDepositName] = useState("");
  const [depositTid, setDepositTid] = useState("");
  const [depositProof, setDepositProof] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Withdrawal Form Inputs
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNumber, setWithdrawNumber] = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Listen to platform configurations dynamically
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  // Listen to transactions history matches profile.uid
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "transactions");
    });
    return () => unsub();
  }, [profile?.uid]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    playSound("click");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Calculate stats matching "Task Income" and "Total Payout"
  const currentBalance = profile?.balance || 0;
  const totalPayout = transactions
    .filter(tx => tx.type === 'withdraw' && tx.status === 'completed')
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");
    setDepositSuccess(false);
    playSound("click");

    const amountNum = parseFloat(depositAmount);
    if (!depositGateway) {
      setDepositError("Please select a deposit payment method first.");
      return;
    }
    if (!depositAmount || isNaN(amountNum) || amountNum <= 0) {
      setDepositError("Please enter a valid amount of points to deposit.");
      return;
    }
    if (!depositNumber.trim()) {
      setDepositError("Please enter your account number/name.");
      return;
    }
    if (!depositTid.trim()) {
      setDepositError("Please specify the 11-digit Transaction ID (TID).");
      return;
    }

    setDepositLoading(true);
    try {
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: amountNum,
        type: 'deposit',
        status: 'pending',
        method: depositGateway,
        accountNumber: depositNumber.trim(),
        accountName: depositName.trim() || `${depositGateway} Sender`,
        transactionId: depositTid.toUpperCase().trim(),
        proofUrl: depositProof || null,
        createdAt: new Date().toISOString()
      });

      setDepositAmount("");
      setDepositNumber("");
      setDepositName("");
      setDepositTid("");
      setDepositProof(null);
      setDepositSuccess(true);
      playSound("success" as any);
    } catch (err: any) {
      console.error(err);
      setDepositError("Failed to register deposit. Please try again.");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess(false);
    playSound("click");

    const amountNum = parseFloat(withdrawAmount);
    const userBalance = profile?.balance || 0;

    if (!selectedGateway) {
      setWithdrawError("Please select a payout payment method first.");
      return;
    }
    if (!withdrawNumber.trim()) {
      setWithdrawError(`Please enter your valid ${selectedGateway} number.`);
      return;
    }
    if (!withdrawAmount || isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError("Please enter a valid amount of points to withdraw.");
      return;
    }
    if (amountNum > userBalance) {
      setWithdrawError(`Insufficient points. Maximum available is ₹${userBalance}`);
      return;
    }

    setWithdrawLoading(true);
    try {
      // 1. Instantly subtract withdrawal amount from the client's balance in Firestore
      await updateDoc(doc(db, "users", profile.uid), {
        balance: increment(-Math.abs(amountNum))
      });

      // 2. Insert into transactions storage
      await addDoc(collection(db, "transactions"), {
        userId: profile.uid,
        amount: -Math.abs(amountNum),
        type: 'withdraw',
        status: 'pending',
        method: selectedGateway,
        accountNumber: withdrawNumber.trim(),
        accountName: withdrawName.trim() || `${selectedGateway} Account`,
        createdAt: new Date().toISOString()
      });

      setWithdrawAmount("");
      setWithdrawNumber("");
      setWithdrawName("");
      setWithdrawSuccess(true);
      playSound("success" as any);
    } catch (err: any) {
      console.error(err);
      setWithdrawError("Withdrawal request failed. Please check connection.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Dynamic input placeholder matching selection
  const getPlaceholderLabel = () => {
    if (!selectedGateway) return "Account Number";
    return `${selectedGateway} Number`;
  };

  return (
    <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
      {/* Blue Top Action Header */}
      <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
        <button 
          onClick={() => {
            playSound("click");
            navigate(-1);
          }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>

        <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">My Wallet</h1>

        <div className="bg-white text-neutral-900 font-bold px-3 py-1 rounded-full text-[14px] flex items-center gap-1 shadow-sm border border-black/5">
          <span className="text-[#2196F3]">₹</span>
          <span>{Number(currentBalance).toLocaleString()}</span>
        </div>
      </header>

      {/* Royal Blue Tab Bar Grid */}
      <nav className="bg-[#1C2070] text-white/50 font-bold flex text-center text-[11px] uppercase tracking-wider shadow-inner">
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("deposit");
          }}
          className={`flex-1 py-3.5 relative transition-all ${
            activeTab === "deposit" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          Deposit
          {activeTab === "deposit" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("withdraw");
          }}
          className={`flex-1 py-3.5 relative transition-all ${
            activeTab === "withdraw" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          Withdraw
          {activeTab === "withdraw" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
        <button
          onClick={() => {
            playSound("click");
            setActiveTab("history");
          }}
          className={`flex-1 py-3.5 relative transition-all ${
            activeTab === "history" 
              ? "text-white font-extrabold" 
              : "hover:text-white/80"
          }`}
        >
          History
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-white rounded-t" />
          )}
        </button>
      </nav>

      {/* Main View Area */}
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Statistics HUD Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Card 1: Task Income */}
          <div className="bg-white border border-[#2196F3]/40 rounded-[14px] p-4 text-center shadow-sm">
            <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-tight">Task Income</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{Number(currentBalance).toLocaleString()}</p>
          </div>

          {/* Card 2: Total Payout */}
          <div className="bg-white border border-[#2196F3]/40 rounded-[14px] p-4 text-center shadow-sm">
            <h3 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-tight">Total Payout</h3>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{Number(totalPayout).toLocaleString()}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "deposit" && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Form Outline Boarder Container */}
              <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-5">
                
                {/* Custom Payment dropdown select */}
                <div className="relative">
                  <select
                    value={depositGateway}
                    onChange={(e) => {
                      playSound("click");
                      setDepositGateway(e.target.value);
                    }}
                    className="w-full bg-white border border-[#2196F3]/40 text-neutral-600 font-bold rounded-xl px-4 py-3 text-xs outline-none focus:border-[#2196F3] transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Select Deposit Method: - Select -</option>
                    <option value="Paytm">Paytm</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="GooglePay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#2196F3]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                {depositGateway && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                      <span className="font-bold text-neutral-500 uppercase tracking-wide">Merchant Details</span>
                      <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">Send Amount First</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div 
                        onClick={() => copyToClipboard(depositGateway === "EasyPaisa" ? systemConfig.easypaisaNumber : (depositGateway === "JazzCash" ? systemConfig.jazzcashNumber : "03001234567"), "depNum")} 
                        className="p-2 bg-white rounded border border-neutral-100 cursor-pointer active:bg-neutral-100 transition-colors"
                      >
                        <p className="text-[9px] text-neutral-400 font-bold uppercase">Account Number</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono font-bold text-neutral-800">
                            {depositGateway === "EasyPaisa" ? systemConfig.easypaisaNumber : (depositGateway === "JazzCash" ? systemConfig.jazzcashNumber : "03001234567")}
                          </span>
                          {copiedText === "depNum" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-neutral-400" />}
                        </div>
                      </div>
                      <div 
                        onClick={() => copyToClipboard(depositGateway === "EasyPaisa" ? systemConfig.easypaisaName : (depositGateway === "JazzCash" ? systemConfig.jazzcashName : "Main Office"), "depName")} 
                        className="p-2 bg-white rounded border border-neutral-100 cursor-pointer active:bg-neutral-100 transition-colors"
                      >
                        <p className="text-[9px] text-neutral-400 font-bold uppercase">Account Name</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-neutral-800 truncate block max-w-[80px]">
                            {depositGateway === "EasyPaisa" ? systemConfig.easypaisaName : (depositGateway === "JazzCash" ? systemConfig.jazzcashName : "Main Office")}
                          </span>
                          {copiedText === "depName" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-neutral-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Form Fields */}
                <form onSubmit={handleDepositSubmit} className="space-y-4">
                  
                  {/* Account detail entry */}
                  <div className="bg-white border border-neutral-200/60 rounded-3xl p-1 px-4 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-3 bg-[#FCFCFD]">
                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-neutral-100">
                      <svg viewBox="0 0 100 100" className="w-9 h-9">
                        <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
                        <path d="M15 90 C 15 65, 85 65, 85 90 Z" fill="#EF4444" />
                        <rect x="44" y="52" width="12" height="15" fill="#FDBA74" />
                        <circle cx="50" cy="40" r="20" fill="#FDBA74" />
                        <path d="M30 35 C 30 15, 70 15, 70 35 C 65 25, 35 25, 30 35" fill="#1E293B" />
                        <path d="M30 34 L 70 34 L 70 20 L 30 20 Z" fill="#1E293B" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Your Sender Wallet Number"
                      value={depositNumber}
                      onChange={(e) => setDepositNumber(e.target.value)}
                      className="w-full py-3.5 bg-transparent text-neutral-800 placeholder-neutral-400 text-sm font-semibold outline-none"
                    />
                  </div>

                  {/* Points amount indicator input */}
                  <div className="bg-white border border-neutral-200/60 rounded-3xl p-1 px-4 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-3 bg-[#FCFCFD]">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-[22px] font-extrabold text-[#2196F3] font-sans">
                      ₹
                    </div>
                    <input
                      type="number"
                      placeholder="Enter Deposit Points / Amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full py-3.5 bg-transparent text-neutral-800 placeholder-neutral-400 text-sm font-semibold outline-none"
                    />
                  </div>

                  {/* TID proof of payment */}
                  <div className="bg-white border border-neutral-200/60 rounded-3xl p-1 px-4 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-3 bg-[#FCFCFD]">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-xs font-bold text-[#2196F3] font-mono">
                      TID
                    </div>
                    <input
                      type="text"
                      placeholder="Enter 11-Digit Transaction ID"
                      value={depositTid}
                      onChange={(e) => setDepositTid(e.target.value)}
                      className="w-full py-3.5 bg-transparent text-neutral-800 placeholder-neutral-400 text-sm font-semibold uppercase tracking-wider outline-none"
                    />
                  </div>

                  {/* Receipt screenshot simulation attach */}
                  <div 
                    onClick={() => {
                      playSound("click");
                      setDepositProof("https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=400&auto=format&fit=crop");
                    }}
                    className="border border-dashed border-neutral-300 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#2196F3]/50 transition-all bg-neutral-50/50"
                  >
                    {depositProof ? (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <CheckCircle2 size={16} className="text-emerald-500 animate-bounce" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Screenshot Receipt Attached</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <Upload size={16} className="text-neutral-400" />
                        <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Tap to Mock-Attach Receipt Screenshot</span>
                      </div>
                    )}
                  </div>

                  {/* Status Notifications */}
                  {depositError && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">
                      <AlertCircle size={15} className="shrink-0" />
                      <span className="font-semibold">{depositError}</span>
                    </div>
                  )}

                  {depositSuccess && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs p-3 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={15} className="shrink-0 animate-bounce" />
                      <span className="font-semibold">Deposit request submitted! Once verified by our manual audit, points will credit.</span>
                    </div>
                  )}

                  {/* Multi-gradient submit button */}
                  <button
                    type="submit"
                    disabled={depositLoading || !depositGateway}
                    className="w-full bg-gradient-to-r from-[#2196F3] to-[#9C27B0] text-white font-bold tracking-wide py-3.5 rounded-full text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-95"
                  >
                    {depositLoading ? "Submitting..." : "Deposit"}
                  </button>
                </form>

              </div>

              {/* Exact Disclaimer Warning banner from the UI photo */}
              <div className="text-center px-4 pt-2">
                <p className="text-[11.5px] font-black text-black leading-snug tracking-normal uppercase max-w-sm mx-auto">
                  deposit requests are processed instantly upon blockchain / manual audits within 24 hours.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "withdraw" && (
            <motion.div
              key="withdraw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Form Outline Boarder Container */}
              <div className="bg-white border border-[#2196F3]/40 rounded-2xl p-5 shadow-sm space-y-5">
                
                {/* Custom Payment dropdown select */}
                <div className="relative">
                  <select
                    value={selectedGateway}
                    onChange={(e) => {
                      playSound("click");
                      setSelectedGateway(e.target.value);
                    }}
                    className="w-full bg-white border border-[#2196F3]/40 text-neutral-600 font-bold rounded-xl px-4 py-3 text-xs outline-none focus:border-[#2196F3] transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Select Payment Method: - Select -</option>
                    <option value="Paytm">Paytm</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="GooglePay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#2196F3]">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                {/* Main Form Fields */}
                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                  
                  {/* Avatar input entry */}
                  <div className="bg-white border border-neutral-200/60 rounded-3xl p-1 px-4 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-3 bg-[#FCFCFD]">
                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-neutral-100">
                      {/* Stylised User Head Illustration avatar with black hair and red shirt as mock avatar */}
                      <svg viewBox="0 0 100 100" className="w-9 h-9">
                        <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
                        {/* Red shirt */}
                        <path d="M15 90 C 15 65, 85 65, 85 90 Z" fill="#EF4444" />
                        {/* Neck */}
                        <rect x="44" y="52" width="12" height="15" fill="#FDBA74" />
                        {/* Face */}
                        <circle cx="50" cy="40" r="20" fill="#FDBA74" />
                        {/* Black Hair */}
                        <path d="M30 35 C 30 15, 70 15, 70 35 C 65 25, 35 25, 30 35" fill="#1E293B" />
                        <path d="M30 34 L 70 34 L 70 20 L 30 20 Z" fill="#1E293B" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder={getPlaceholderLabel()}
                      value={withdrawNumber}
                      onChange={(e) => setWithdrawNumber(e.target.value)}
                      className="w-full py-3.5 bg-transparent text-neutral-800 placeholder-neutral-400 text-sm font-semibold outline-none"
                    />
                  </div>

                  {/* Points amount indicator input */}
                  <div className="bg-white border border-neutral-200/60 rounded-3xl p-1 px-4 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-3 bg-[#FCFCFD]">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-[22px] font-extrabold text-[#2196F3] font-sans">
                      ₹
                    </div>
                    <input
                      type="number"
                      placeholder="Enter Points"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full py-3.5 bg-transparent text-neutral-800 placeholder-neutral-400 text-sm font-semibold outline-none"
                    />
                  </div>

                  {/* Status Notifications */}
                  {withdrawError && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">
                      <AlertCircle size={15} className="shrink-0" />
                      <span className="font-semibold">{withdrawError}</span>
                    </div>
                  )}

                  {withdrawSuccess && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs p-3 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={15} className="shrink-0 animate-bounce" />
                      <span className="font-semibold">Your withdrawal request was submitted successfully! We release payments within 24h.</span>
                    </div>
                  )}

                  {/* Multi-gradient submit button */}
                  <button
                    type="submit"
                    disabled={withdrawLoading || !selectedGateway}
                    className="w-full bg-gradient-to-r from-[#2196F3] to-[#9C27B0] text-white font-bold tracking-wide py-3.5 rounded-full text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-95"
                  >
                    {withdrawLoading ? "Withdrawing..." : "Withdraw"}
                  </button>
                </form>

              </div>

              {/* Exact Disclaimer Warning banner from the UI photo */}
              <div className="text-center px-4 pt-2">
                <p className="text-[11.5px] font-black text-black leading-snug tracking-normal uppercase max-w-sm mx-auto">
                  AFTER GETTING YOUR PAYMENT REQUEST YOUR PAYMENT RELEASE WITH IN 24H AND OR 2 DAYS NO MORE TAKING LONGER
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">Recent Withdrawals</h3>

              {transactions.length === 0 ? (
                <div className="bg-white border border-[#2196F3]/20 p-10 rounded-2xl text-center space-y-2">
                  <History className="mx-auto text-neutral-200" size={32} />
                  <p className="text-neutral-400 font-bold text-xs uppercase tracking-wider">No transaction logs</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {transactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    const absAmount = Math.abs(tx.amount);
                    const isPending = tx.status === "pending" || !tx.status;
                    const isCompleted = tx.status === "completed";
                    const isFailed = tx.status === "failed";

                    return (
                      <div 
                        key={tx.id} 
                        className="bg-white border border-[#2196F3]/15 rounded-xl p-3.5 flex justify-between items-center shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isPositive ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                          }`}>
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-neutral-800 uppercase">{tx.type}</span>
                              <span className="text-[9px] font-mono text-neutral-400">#{tx.id?.substring(0, 6).toUpperCase()}</span>
                            </div>
                            <div className="text-[9px] text-neutral-400">{new Date(tx.createdAt || Date.now()).toLocaleString()}</div>
                            {tx.method && (
                              <span className="inline-block mt-0.5 text-[8px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">
                                {tx.method} {tx.accountNumber ? ` • ${tx.accountNumber}` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <p className={`text-sm font-bold tracking-tight ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                            {isPositive ? "+" : "-"}₹{Number(absAmount).toLocaleString()}
                          </p>
                          <div>
                            {isPending && (
                              <span className="text-[8px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Pending</span>
                            )}
                            {isCompleted && (
                              <span className="text-[8px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">Approved</span>
                            )}
                            {isFailed && (
                              <span className="text-[8px] font-bold uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Rejected</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
