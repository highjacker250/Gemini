import React, { useState } from "react";
import { 
  MessageSquare, 
  Mic2, 
  Image as ImageIcon, 
  Wand2, 
  AudioLines, 
  LayoutDashboard,
  Zap,
  Github,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppMode } from "./types";
import { ChatInterface } from "./components/ChatInterface";
import { LiveInterface } from "./components/LiveInterface";
import { VisionInterface } from "./components/VisionInterface";
import { GenerationInterface } from "./components/GenerationInterface";
import { AudioInterface } from "./components/AudioInterface";
import { geminiService } from "./services/geminiService";
import { cn } from "./utils";

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fastPrompt, setFastPrompt] = useState("");
  const [fastResult, setFastResult] = useState("");
  const [isFastLoading, setIsFastLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFastAction = async () => {
    if (!fastPrompt.trim() || isFastLoading) return;
    setIsFastLoading(true);
    try {
      const result = await geminiService.fastResponse(fastPrompt);
      setFastResult(result);
    } catch (error) {
      console.error("Fast action error:", error);
    } finally {
      setIsFastLoading(false);
    }
  };

  const navItems = [
    { id: AppMode.CHAT, label: "Smart Chat", icon: MessageSquare, desc: "Search-grounded AI" },
    { id: AppMode.LIVE, label: "Live Voice", icon: Mic2, desc: "Real-time conversation" },
    { id: AppMode.VISION, label: "Vision", icon: ImageIcon, desc: "Image understanding" },
    { id: AppMode.CREATE, label: "Create", icon: Wand2, desc: "Images & Video" },
    { id: AppMode.AUDIO, label: "Speech", icon: AudioLines, desc: "Text to Speech" },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-black/5 flex flex-col relative z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", !isSidebarOpen && "opacity-0")}>
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">Gemini Hub</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                mode === item.id 
                  ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", mode === item.id ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
              {isSidebarOpen && (
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
                  <span className={cn("text-[10px] whitespace-nowrap", mode === item.id ? "text-zinc-400" : "text-zinc-400")}>
                    {item.desc}
                  </span>
                </div>
              )}
              {!isSidebarOpen && mode === item.id && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Fast Action Utility */}
        {isSidebarOpen && (
          <div className="p-4 m-4 bg-zinc-50 rounded-2xl border border-black/5 space-y-3">
            <div className="flex items-center gap-2 text-zinc-900">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Quick Flash</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={fastPrompt}
                onChange={(e) => setFastPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFastAction()}
                placeholder="Ask something fast..."
                className="w-full bg-white border border-black/10 rounded-lg py-2 pl-3 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
              />
              <button 
                onClick={handleFastAction}
                disabled={isFastLoading || !fastPrompt.trim()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
              >
                {isFastLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
            {fastResult && (
              <div className="p-2 bg-white rounded-lg border border-black/5 text-[10px] text-zinc-600 max-h-24 overflow-y-auto leading-relaxed">
                {fastResult}
              </div>
            )}
          </div>
        )}

        <div className="p-6 border-t border-black/5">
          <div className={cn("flex items-center gap-3 text-zinc-400", !isSidebarOpen && "justify-center")}>
            <Github className="w-4 h-4" />
            {isSidebarOpen && <span className="text-xs font-medium">v1.0.0 Stable</span>}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">
              {navItems.find(i => i.id === mode)?.label}
            </h1>
            <div className="h-4 w-[1px] bg-zinc-200" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-zinc-500">System Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Gemini 3.1 Pro
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-hidden">
          {!hasApiKey && (mode === AppMode.CREATE) ? (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-black/5 p-12 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                <Zap className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold">Paid API Key Required</h3>
                <p className="text-zinc-500 text-sm">
                  To use high-quality image and video generation (Veo & Gemini 3 Pro), you must select a paid API key from your Google Cloud project.
                </p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline inline-block mt-2"
                >
                  Learn more about billing
                </a>
              </div>
              <button
                onClick={handleSelectKey}
                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
              >
                Select API Key
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {mode === AppMode.CHAT && <ChatInterface />}
                {mode === AppMode.LIVE && <LiveInterface />}
                {mode === AppMode.VISION && <VisionInterface />}
                {mode === AppMode.CREATE && <GenerationInterface />}
                {mode === AppMode.AUDIO && <AudioInterface />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Global Loader for Fast Action */}
      {isFastLoading && (
        <div className="fixed bottom-8 right-8 p-4 bg-zinc-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-right-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-medium">Flash processing...</span>
        </div>
      )}
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);