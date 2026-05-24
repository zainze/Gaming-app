import { motion } from "motion/react";
import { Shield, Lock, Eye, ArrowLeft, Fingerprint, FileText } from "lucide-react";
import { playSound } from "../lib/sounds";

export default function PrivacyView({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: "Data Encryption",
      icon: Shield,
      content: "All your transactions, points history, and personal references are fully encrypted using high-grade AES-256 protocols. Your account passwords and payouts are entirely private.",
      color: "text-[#2196F3]",
      bg: "bg-blue-50 border border-blue-100",
    },
    {
      title: "Data Governance",
      icon: Eye,
      content: "We only log data strictly relevant to payment authorization, withdrawal processing, and anti-fraud algorithms. We do not sell or lease user metadata to any third parties.",
      color: "text-emerald-500",
      bg: "bg-emerald-50 border border-emerald-100",
    },
    {
      title: "Access Safeguards",
      icon: Lock,
      content: "Ensure you activate strong credentials and screen locks on your device for additional security when requesting points transfers or managing coin balances.",
      color: "text-indigo-500",
      bg: "bg-indigo-50 border border-indigo-100",
    }
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F8] pb-32 text-neutral-800 font-sans select-none antialiased">
      {/* Blue Top Action Header */}
      <header className="bg-[#2196F3] text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-20">
        <button 
          onClick={() => {
            playSound("click");
            onBack();
          }}
          className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>
        
        <h1 className="text-[19px] font-bold tracking-tight text-white pl-3">Security & Privacy</h1>
        <div className="w-10" />
      </header>

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Paragraph Sections list inside unified list or separate cards */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div 
              key={section.title} 
              className="bg-white border border-[#2196F3]/40 p-5 rounded-2xl space-y-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center ${section.color}`}>
                  <section.icon size={20} />
                </div>
                <h3 className="font-extrabold text-[#1C2070] text-sm tracking-tight">{section.title}</h3>
              </div>
              <p className="text-neutral-500 text-xs leading-relaxed font-semibold pl-1">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Dream Guard status banner card */}
        <div className="bg-white border border-[#2196F3]/40 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
            <Fingerprint size={24} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-neutral-800">Advanced Security Verification</p>
            <p className="text-[9px] text-[#2196F3] uppercase tracking-widest font-bold mt-0.5">Verified SECURE BY DREAM GUARD</p>
          </div>
        </div>

        {/* Read Full Terms & legal bounds button */}
        <button 
          onClick={() => playSound("click")}
          className="w-full bg-[#1C2070] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow"
        >
          <FileText size={16} /> 
          Read Full Terms of Service
        </button>

      </div>
    </div>
  );
}
