import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";
import { Message, GenerationConfig } from "../types";

// Note: process.env.GEMINI_API_KEY is injected by the platform
const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  // Chat with Search Grounding
  async chat(message: string, history: any[] = []) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web?.uri)
      .filter(Boolean);

    return {
      text: response.text || "",
      groundingUrls,
    };
  },

  // Fast responses using Flash Lite
  async fastResponse(prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return response.text || "";
  },

  // Image Analysis (Vision)
  async analyzeImage(imageBuffer: string, prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBuffer.split(",")[1],
            },
          },
          { text: prompt },
        ],
      },
    });
    return response.text || "";
  },

  // Image Generation
  async generateImage(prompt: string, config: GenerationConfig) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize || "1K",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  },

  // Video Generation
  async generateVideo(prompt: string, aspectRatio: "16:9" | "9:16") {
    const ai = getAI();
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio,
      },
    });

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    const response = await fetch(downloadLink, {
      method: "GET",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  // Text to Speech
  async generateSpeech(text: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    throw new Error("Speech generation failed");
  },
};