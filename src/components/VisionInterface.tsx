import React, { useState, useRef, useEffect } from "react";
import { Image as ImageIcon, Upload, Loader2, Sparkles, X } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { cn } from "../utils";

export const VisionInterface: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("What's in this image?");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/messages/vision");
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch vision history:", error);
      }
    };
    fetchHistory();
  }, []);

  const saveToHistory = async (msg: any) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, mode: "vision" }),
      });
      setHistory(prev => [...prev, msg]);
    } catch (error) {
      console.error("Failed to save vision history:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || isLoading) return;
    setIsLoading(true);
    try {
      const result = await geminiService.analyzeImage(image, prompt);
      setAnalysis(result);
      
      const entry = {
        id: Date.now().toString(),
        role: "model",
        text: result,
        timestamp: Date.now(),
        image: image
      };
      saveToHistory(entry);
    } catch (error) {
      console.error("Vision error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear vision history?")) return;
    try {
      await fetch("/api/messages/vision", { method: "DELETE" });
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear vision history:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-4 border-b border-black/5 bg-zinc-50 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-zinc-500" />
          Vision Analysis
        </h2>
        <button 
          onClick={clearHistory}
          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wider font-bold"
        >
          Clear History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ... existing upload section ... */}
          <div className="space-y-4">
            <div
              onClick={() => !image && fileInputRef.current?.click()}
              className={cn(
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative group",
                image ? "border-transparent" : "border-zinc-200 hover:border-zinc-400 cursor-pointer bg-zinc-50"
              )}
            >
              {image ? (
                <>
                  <img src={image} alt="Upload" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setAnalysis("");
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 font-medium">Click to upload image</p>
                  <p className="text-xs text-zinc-400 mt-1">JPEG, PNG supported</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask something about the image..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[100px] resize-none"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!image || isLoading}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-800 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analyze Image
            </button>
          </div>

          <div className="space-y-4">
            <div className="h-full flex flex-col">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Analysis Result</label>
              <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-700 leading-relaxed overflow-y-auto min-h-[300px]">
                {analysis ? (
                  <div className="whitespace-pre-wrap">{analysis}</div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic">
                    Upload an image and click analyze to see results
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Analysis History</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.slice().reverse().map((item) => (
                <div key={item.id} className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden flex flex-col">
                  <div className="aspect-video relative">
                    <img src={item.image} alt="History" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <p className="text-xs text-zinc-600 line-clamp-3 flex-1 italic">"{item.text}"</p>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                      <span className="text-[10px] text-zinc-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => {
                          setImage(item.image);
                          setAnalysis(item.text);
                        }}
                        className="text-[10px] font-bold text-zinc-900 hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};