import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { Send, Search, Loader2, Link as LinkIcon } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { Message } from "../types";
import { cn } from "../utils";

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/messages/chat");
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = async (msg: Message) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, mode: "chat" }),
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    saveMessage(userMsg);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const response = await geminiService.chat(input, history);

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: response.text,
        timestamp: Date.now(),
        groundingUrls: response.groundingUrls,
      };

      setMessages((prev) => [...prev, modelMsg]);
      saveMessage(modelMsg);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear conversation history?")) return;
    try {
      await fetch("/api/messages/chat", { method: "DELETE" });
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="p-4 border-bottom border-black/5 bg-zinc-50 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-500" />
          AI Chatbot
          <span className="text-xs font-normal text-zinc-400 ml-2">Grounded with Google Search</span>
        </h2>
        <button 
          onClick={clearHistory}
          className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors uppercase tracking-wider font-bold"
        >
          Clear History
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm">Ask anything... I'll search the web for you.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div
              className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-zinc-900 text-white rounded-tr-none"
                  : "bg-zinc-100 text-zinc-900 rounded-tl-none"
              )}
            >
              <Markdown>{msg.text}</Markdown>
            </div>
            {msg.groundingUrls && msg.groundingUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.groundingUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] flex items-center gap-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-100 transition-colors"
                  >
                    <LinkIcon className="w-2 h-2" />
                    {new URL(url).hostname}
                  </a>
                ))}
              </div>
            )}
            <span className="text-[10px] text-zinc-400 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Searching and thinking...
          </div>
        )}
      </div>

      <div className="p-4 border-t border-black/5 bg-zinc-50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="w-full bg-white border border-black/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};