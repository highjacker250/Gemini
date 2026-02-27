import { Type } from "@google/genai";

export enum AppMode {
  CHAT = "chat",
  LIVE = "live",
  VISION = "vision",
  CREATE = "create",
  AUDIO = "audio",
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  image?: string;
  video?: string;
  groundingUrls?: string[];
}

export interface GenerationConfig {
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize?: "1K" | "2K" | "4K";
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}