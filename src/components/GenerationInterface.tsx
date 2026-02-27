import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Video as VideoIcon, Loader2, Wand2, Download, Maximize2 } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { cn } from "../utils";

export const GenerationInterface: React.FC = () => {
  const [type, setType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/messages/generation");
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch generation history:", error);
      }
    };
    fetchHistory();
  }, []);

  const saveToHistory = async (msg: any) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, mode: "generation" }),
      });
      setHistory(prev => [...prev, msg]);
    } catch (error) {
      console.error("Failed to save generation history:", error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResult(null);
    try {
      if (type === "image") {
        const url = await geminiService.generateImage(prompt, {
          aspectRatio: aspectRatio as any,
          imageSize,
        });
        setResult(url);
        saveToHistory({
          id: Date.now().toString(),
          role: "model",
          text: prompt,
          timestamp: Date.now(),
          image: url,
          mode: "generation"
        });
      } else {
        const url = await geminiService.generateVideo(prompt, aspectRatio as any);
        setResult(url);
        // We don't save video blobs to DB as they are too large/temporary
        saveToHistory({
          id: Date.now().toString(),
          role: "model",
          text: `[Video] ${prompt}`,
          timestamp: Date.now(),
          video: url,
          mode: "generation"
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear generation history?")) return;
    try {
      await fetch("/api/messages/generation", { method: "DELETE" });
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear generation history:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-4 border-b border-black/5 bg-zinc-50 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-zinc-500" />
          Creative Generation
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={clearHistory}
            className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wider font-bold"
          >
            Clear History
          </button>
          <div className="flex bg-zinc-200 p-1 rounded-lg">
            <button
              onClick={() => setType("image")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                type === "image" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Image
            </button>
            <button
              onClick={() => setType("video")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                type === "video" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Video
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* ... existing generation section ... */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={type === "image" ? "A futuristic city at sunset..." : "A cat playing piano in space..."}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 min-h-[120px] resize-none"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "py-2 text-xs border rounded-lg transition-all",
                        aspectRatio === ratio
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {type === "image" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Image Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["1K", "2K", "4K"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setImageSize(size)}
                        className={cn(
                          "py-2 text-xs border rounded-lg transition-all",
                          imageSize === size
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="w-full py-4 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              Generate {type === "image" ? "Image" : "Video"}
            </button>
            
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] text-amber-700 leading-relaxed">
                {type === "image" 
                  ? "Powered by Gemini 3 Pro Image. High-quality image generation with precise detail."
                  : "Powered by Veo 3.1 Fast. Cinematic video generation from text prompts."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="relative aspect-video lg:aspect-square bg-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden flex items-center justify-center group">
              {isLoading ? (
                <div className="text-center space-y-4">
                  <Loader2 className="w-10 h-10 text-zinc-300 animate-spin mx-auto" />
                  <p className="text-sm text-zinc-400 animate-pulse">
                    {type === "video" ? "Crafting your cinematic sequence... this may take a minute." : "Visualizing your prompt..."}
                  </p>
                </div>
              ) : result ? (
                <>
                  {type === "image" ? (
                    <img src={result} alt="Generated" className="w-full h-full object-contain" />
                  ) : (
                    <video src={result} controls className="w-full h-full object-contain" autoPlay loop />
                  )}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={result}
                      download={`generated-${type}.png`}
                      className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg text-zinc-900 hover:bg-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  {type === "image" ? <ImageIcon className="w-12 h-12 text-zinc-200 mx-auto" /> : <VideoIcon className="w-12 h-12 text-zinc-200 mx-auto" />}
                  <p className="text-sm text-zinc-400">Your masterpiece will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Generation Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.slice().reverse().map((item) => (
                <div key={item.id} className="group bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden flex flex-col relative">
                  <div className="aspect-square relative bg-zinc-200">
                    {item.image ? (
                      <img src={item.image} alt="History" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <VideoIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-[10px] text-white line-clamp-3 mb-2">"{item.text}"</p>
                      <button 
                        onClick={() => {
                          setPrompt(item.text.replace("[Video] ", ""));
                          if (item.image) {
                            setResult(item.image);
                            setType("image");
                          } else {
                            setType("video");
                          }
                        }}
                        className="px-3 py-1 bg-white text-zinc-900 text-[10px] font-bold rounded-full hover:bg-zinc-100"
                      >
                        Reuse Prompt
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