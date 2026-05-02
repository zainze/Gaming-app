import { motion } from "motion/react";
import { Shield, Lock, Eye, ArrowLeft, Fingerprint, FileText } from "lucide-react";

export default function PrivacyView({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: "Data Protection",
      icon: Shield,
      content: "All your transactions and personal data are encrypted using bank-grade AES-256 encryption. We never store your payment passwords.",
      color: "text-blue-500"
    },
    {
      title: "Privacy Policy",
      icon: Eye,
      content: "We only collect data necessary for transaction processing and anti-fraud measures. Your data is never sold to third parties.",
      color: "text-green-500"
    },
    {
      title: "Security Settings",
      icon: Lock,
      content: "Enable 2FA and Biometric login in your device settings for additional protection during withdrawals.",
      color: "text-orange-500"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-24"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black italic uppercase">Security & Privacy</h2>
      </header>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-3">
            <div className={`w-12 h-12 rounded-2xl bg-neutral-950 flex items-center justify-center ${section.color}`}>
              <section.icon size={24} />
            </div>
            <h3 className="font-bold text-lg">{section.title}</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl flex items-center gap-4">
        <Fingerprint className="text-orange-500" size={32} />
        <div>
          <p className="font-bold text-sm">Enhanced Security Active</p>
          <p className="text-[10px] text-neutral-500 uppercase font-bold">Verified by h666 Guard</p>
        </div>
      </div>

      <button className="w-full bg-neutral-900 border border-neutral-800 text-neutral-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
        <FileText size={16} /> Read Full Terms of Service
      </button>
    </motion.div>
  );
}
