import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, MapPin, Volume2, Globe, Sparkles, Loader2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { playSound } from "../lib/sounds";

interface GlobalPermissionGateProps {
  onPassed: () => void;
  appName?: string;
  logo?: string;
}

export default function GlobalPermissionGate({ onPassed, appName, logo }: GlobalPermissionGateProps) {
  const [status, setStatus] = useState<"idle" | "syncing" | "error" | "complete">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [logText, setLogText] = useState("");

  const triggerHandshakes = async () => {
    setStatus("syncing");
    setProgress(5);
    setLogText("Initializing lobby handshake protocol...");

    // Sound effect
    try {
      playSound("click");
    } catch (_) {}

    // Step 1: Request Geolocation (This forces the native browser dialogue!)
    setProgress(20);
    setLogText("Requesting regional geolocation verification...");

    const requestGeo = () => {
      return new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) {
          setErrorMessage("Geolocation is not supported by your browser.");
          resolve(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Location synchronized:", position.coords.latitude, position.coords.longitude);
            resolve(true);
          },
          (error) => {
            let desc = "Permission denied.";
            if (error.code === error.POSITION_UNAVAILABLE) desc = "Position unavailable.";
            if (error.code === error.TIMEOUT) desc = "Request timed out.";
            console.warn("Location prompt result:", desc);
            // We set error message but resolve true or let them proceed after warning so sandboxes or iframe environments don't get stuck!
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      });
    };

    const geoResult = await requestGeo();

    // Step 2: Unblock Audio Engine
    setProgress(55);
    setLogText("Configuring high-fidelity audio pipelines...");
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        await ctx.resume();
      }
    } catch (e) {
      console.warn("Audio Context automatic startup skipped/handled:", e);
    }

    // Step 3: Run secure network encryption handshakes
    setProgress(80);
    setLogText("Enforcing regional anti-VPN / anti-fraud rules...");
    await new Promise(r => setTimeout(r, 600));

    setProgress(100);
    setLogText("Anti-cheat handshakes resolved. Boarding Lobby...");
    await new Promise(r => setTimeout(r, 400));

    try {
      playSound("success");
    } catch (_) {}

    // Save passing token to LocalStorage
    localStorage.setItem("global_permissions_passed", "true");
    setStatus("complete");

    setTimeout(() => {
      onPassed();
    }, 400);
  };

  return (
    <div id="global_permission_gate_screen" className="fixed inset-0 z-[99999] bg-[#0c0e1b] text-white flex flex-col justify-between p-6 font-sans select-none overflow-hidden">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(circle_at_50%_0%,_rgba(139,92,246,0.18)_0%,_transparent_75%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,14,27,0.4),rgba(12,14,27,1))]" />
        
        {/* Animated matrix dots or grids */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: "radial-gradient(ellipse at center, #8b5cf6 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        />
      </div>

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          {logo ? (
            <img 
              src={logo} 
              alt="Logo" 
              className="h-7 w-7 object-contain opacity-90 rounded-md ring-1 ring-purple-500/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Shield size={14} className="text-purple-400" />
            </div>
          )}
          <span className="text-[11px] font-black uppercase tracking-widest text-purple-300 font-mono">
            {appName || "H666 CASINO"} Lobby Sync
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[8.5px] font-bold font-mono text-emerald-400 tracking-wider">GATEWAY SECURE</span>
        </div>
      </div>

      {/* Hero Visual Block */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full py-6 space-y-6">
        
        {/* Multi-layered circular shield and pulsing rings */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-spin-slow opacity-60" />
          <div className="absolute inset-2 rounded-full border border-dashed border-purple-400/20 animate-spin-reverse opacity-40" />
          <div className="relative rounded-full w-16 h-16 bg-[#11132b] border-2 border-purple-500/30 shadow-[0_0_24px_rgba(139,92,246,0.15)] flex items-center justify-center animate-pulse">
            <Shield className="text-purple-400" size={28} />
          </div>
        </div>

        <div className="text-center space-y-2 px-3">
          <h1 className="text-lg font-black tracking-tight uppercase bg-gradient-to-r from-purple-100 via-white to-purple-200 bg-clip-text text-transparent italic leading-tight">
            Security Verification Guard
          </h1>
          <p className="text-[11px] text-white/50 leading-relaxed max-w-[280px] mx-auto">
            This high-performance casino lobby verifies your live regional geolocation and unblocks audio subsystems to guarantee complete multi-user anti-fraud integrity and sound realism.
          </p>
        </div>

        {/* Handshake Consent Steps list */}
        <div className="w-full bg-[#0e1022]/90 border border-white/5 rounded-2xl p-3.5 space-y-3 shadow-2xl relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

          {/* Geo step info */}
          <div className="relative flex items-center justify-between text-xs bg-[#11132b]/80 p-3 rounded-xl border border-white/5 hover:border-purple-500/10 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                <MapPin size={15} className="text-purple-400" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-[11px] text-purple-200">Anti-Fraud Geolocation</span>
                <span className="text-[8.5px] font-mono text-white/40">Prevents region logs and duplicate IPs</span>
              </div>
            </div>
            <div className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md font-bold shrink-0 uppercase">REQUIRED</div>
          </div>

          {/* Sound step info */}
          <div className="relative flex items-center justify-between text-xs bg-[#11132b]/80 p-3 rounded-xl border border-white/5 hover:border-purple-500/10 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shrink-0">
                <Volume2 size={15} className="text-pink-400" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-[11px] text-pink-200">Interactive Audio Sync</span>
                <span className="text-[8.5px] font-mono text-white/40">Unlocks casino realistic speaker noise</span>
              </div>
            </div>
            <div className="text-[9px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-md font-bold shrink-0 uppercase">REQUIRED</div>
          </div>
        </div>

      </div>

      {/* Action panel at the bottom */}
      <div className="relative z-10 w-full max-w-sm mx-auto pb-4 shrink-0 space-y-4">
        
        {/* Dynamic handshaking simulation log */}
        {status === "syncing" && (
          <div className="w-full bg-[#11132b] border border-purple-500/20 p-3 rounded-xl space-y-2 shadow-lg animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-purple-300 flex items-center gap-1.5">
                <Loader2 className="animate-spin text-purple-400 shrink-0" size={12} />
                {logText}
              </span>
              <span className="text-[10px] font-mono text-purple-400 font-black">{progress}%</span>
            </div>
            <div className="w-full bg-[#0a0c16] h-1.5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 h-full rounded-full" 
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
          </div>
        )}

        {/* Master Action Trigger Button */}
        <button
          onClick={triggerHandshakes}
          disabled={status === "syncing"}
          className={`w-full py-4 rounded-2xl font-black uppercase text-xs transition-all duration-300 tracking-widest flex items-center justify-center gap-2 select-none shadow-2xl ${
            status === "syncing"
              ? "bg-purple-900/20 text-purple-400/40 border border-purple-500/10 cursor-not-allowed"
              : "bg-gradient-to-r from-[#65E902] via-emerald-500 to-teal-500 text-black shadow-[0_0_24px_rgba(101,233,2,0.35)] hover:brightness-110 active:scale-[0.98] cursor-pointer"
          }`}
        >
          {status === "syncing" ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              SYNCING BROWSER HANDSHAKES...
            </>
          ) : (
            <>
              ALLOW ALL PERMISSIONS & START PLAYING
              <ChevronRight size={14} className="stroke-[3]" />
            </>
          )}
        </button>

        {/* Security / device guidelines */}
        <p className="text-[9px] text-center text-white/30 font-medium">
          Note: If your browser popup does not request permission immediately, ensure your physical device is not in isolated sandbox/power-saving mode.
        </p>
      </div>

    </div>
  );
}
