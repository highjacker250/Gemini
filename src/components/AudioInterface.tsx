import React, { useState, useEffect } from "react";
import { AudioLines, Play, Loader2, Volume2, Sparkles } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { cn } from "../utils";

export const AudioInterface: React.FC = () => {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/messages/audio");
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch audio history:", error);
      }
    };
    fetchHistory();
  }, []);

  const saveToHistory = async (msg: any) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, mode: "audio" }),
      });
      setHistory(prev => [...prev, msg]);
    } catch (error) {
      console.error("Failed to save audio history:", error);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setAudioUrl(null);
    try {
      const url = await geminiService.generateSpeech(text);
      setAudioUrl(url);
      saveToHistory({
        id: Date.now().toString(),
        role: "model",
        text: text,
        timestamp: Date.now(),
        image: url, // Reusing image column for audio data URL
        mode: "audio"
      });
    } catch (error) {
      console.error("TTS error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear audio history?")) return;
    try {
      await fetch("/api/messages/audio", { method: "DELETE" });
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear audio history:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-4 border-b border-black/5 bg-zinc-50 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 flex items-center gap-2">
          <AudioLines className="w-4 h-4 text-zinc-500" />
          Text to Speech
        </h2>
        <button 
          onClick={clearHistory}
          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wider font-bold"
        >
          Clear History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12">
        <div className="max-w-2xl mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-zinc-900">Natural Voice Synthesis</h3>
            <p className="text-sm text-zinc-500">Convert your text into high-quality speech using Gemini 2.5 Flash TTS.</p>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to synthesize..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[200px] resize-none shadow-inner"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              Model: Flash 2.5 TTS
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!text.trim() || isLoading}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-medium flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Synthesize Speech
          </button>

          {audioUrl && (
            <div className="w-full p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Volume2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-900">Audio Ready</p>
                <audio src={audioUrl} controls className="w-full mt-2 h-8" />
              </div>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="max-w-4xl mx-auto w-full space-y-4 pt-8 border-t border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Synthesis History</h3>
            <div className="space-y-3">
              {history.slice().reverse().map((item) => (
                <div key={item.id} className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setText(item.text);
                      setAudioUrl(item.image);
                    }}
                    className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-300 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 truncate font-medium">{item.text}</p>
                    <p className="text-[10px] text-zinc-400">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <audio src={item.image} className="h-8 max-w-[200px]" controls />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};