import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Circle, Activity } from "lucide-react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { cn } from "../utils";

export const LiveInterface: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        stopSession();
      }
    };
  }, []);

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful, friendly voice assistant. Keep your responses concise and conversational.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            source.connect(processorRef.current!);
            processorRef.current!.connect(audioContextRef.current!.destination);
            
            processorRef.current!.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate audio level for visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setAudioLevel(Math.sqrt(sum / inputData.length));

              // Convert to PCM16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
              }
              
              const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
              session.sendRealtimeInput({
                media: { data: base64, mimeType: "audio/pcm;rate=16000" }
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64 = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const pcm16 = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(pcm16);
              if (!isPlayingRef.current) playNextInQueue();
            }

            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                // Handle transcription if needed
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (err) => {
            console.error("Live error:", err);
            stopSession();
          }
        }
      });
      
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to start live session:", error);
    }
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsThinking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsThinking(true);
    const pcm16 = audioQueueRef.current.shift()!;
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      isPlayingRef.current = false;
      return;
    }
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x7fff;

    const buffer = audioContextRef.current!.createBuffer(1, float32.length, 16000);
    buffer.getChannelData(0).set(float32);
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current!.destination);
    source.onended = playNextInQueue;
    source.start();
  };

  const stopSession = () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    
    setIsConnected(false);
    setAudioLevel(0);
    setIsThinking(false);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl shadow-2xl border border-white/10 overflow-hidden text-white">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isConnected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
          )} />
          <h2 className="font-medium tracking-tight">Live Voice Session</h2>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Gemini 2.5 Native Audio
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] transition-all duration-1000",
            isConnected 
              ? isThinking 
                ? "bg-indigo-500/20 scale-110" 
                : "bg-emerald-500/10 scale-100"
              : "bg-zinc-800/20 scale-90"
          )} />
        </div>

        {/* Audio Visualizer */}
        <div className="relative z-10 flex items-center justify-center gap-1 h-32">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 bg-white rounded-full transition-all duration-75",
                isConnected ? "opacity-100" : "opacity-20"
              )}
              style={{
                height: isConnected 
                  ? `${Math.max(8, (audioLevel * 200) * (0.5 + Math.random() * 0.5))}px` 
                  : "8px"
              }}
            />
          ))}
        </div>

        <div className="mt-12 text-center space-y-4 relative z-10">
          <p className={cn(
            "text-sm font-medium transition-all duration-500",
            isConnected ? "text-white" : "text-zinc-500"
          )}>
            {isConnected 
              ? isThinking ? "Gemini is speaking..." : "Listening to you..." 
              : "Start a conversation with Gemini"}
          </p>
          <p className="text-xs text-zinc-600 max-w-xs mx-auto">
            Experience low-latency, natural voice interaction powered by native multimodal capabilities.
          </p>
        </div>
      </div>

      <div className="p-8 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={!isConnected}
            className={cn(
              "p-4 rounded-full transition-all border",
              isMuted 
                ? "bg-red-500/10 border-red-500/20 text-red-500" 
                : "bg-zinc-800 border-white/5 text-zinc-400 hover:text-white"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={isConnected ? stopSession : startSession}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl",
              isConnected 
                ? "bg-white text-black hover:bg-zinc-200 scale-95" 
                : "bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-105"
            )}
          >
            {isConnected ? (
              <div className="w-6 h-6 bg-black rounded-sm" />
            ) : (
              <Activity className="w-8 h-8" />
            )}
          </button>

          <button
            className="p-4 rounded-full bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white transition-all"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};