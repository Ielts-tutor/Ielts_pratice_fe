import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VocabItem, QuizQuestion } from "../types";

// Collect all API keys from environment variables
const API_KEYS = [
  import.meta.env.VITE_API_KEY,
  import.meta.env.VITE_API_KEY1,
  import.meta.env.VITE_API_KEY2,
  import.meta.env.VITE_API_KEY3,
  import.meta.env.VITE_API_KEY4,
  import.meta.env.VITE_API_KEY5,
].filter(Boolean); // Remove any undefined keys

let currentKeyIndex = 0;

// Get the current AI client
const getAIClient = () => {
  if (API_KEYS.length === 0) {
    throw new Error("No API keys available");
  }
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

// Rotate to next API key
const rotateAPIKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Switched to API key ${currentKeyIndex + 1}/${API_KEYS.length}`);
};

// Cache for vocabulary analysis (to reduce API calls)
const CACHE_PREFIX = 'ielts_cache_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCachedData = (key: string): any | null => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCachedData = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to cache data:', e);
  }
};

// Wrapper function to handle retries with key rotation and exponential backoff
async function withRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  maxRetries: number = API_KEYS.length,
  cacheKey?: string
): Promise<T> {
  // Check cache first if cacheKey is provided
  if (cacheKey) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`Using cached data for: ${cacheKey}`);
      return cached;
    }
  }

  let lastError: Error | null = null;
  let baseDelay = 1000; // Start with 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const ai = getAIClient();
      const result = await operation(ai);
      
      // Cache the result if cacheKey is provided
      if (cacheKey && result) {
        setCachedData(cacheKey, result);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a 429 error (rate limit)
      const is429 = error?.message?.includes('429') || 
                    error?.status === 429 ||
                    error?.message?.toLowerCase().includes('quota') ||
                    error?.message?.toLowerCase().includes('rate limit');
      
      if (is429 && attempt < maxRetries - 1) {
        console.warn(`Rate limit hit on key ${currentKeyIndex + 1}, rotating to next key...`);
        rotateAPIKey();
        
        // Exponential backoff: wait longer with each retry
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not a 429 error or we've exhausted retries, throw
      throw error;
    }
  }
  
  throw lastError || new Error("All API keys exhausted");
}

/**
 * Analyzes a vocabulary word using Gemini 2.5 Flash
 */
export const analyzeVocabulary = async (word: string): Promise<Omit<VocabItem, 'id' | 'createdAt'>> => {
  const modelId = "gemini-2.5-flash";
  const cacheKey = `vocab_${word.toLowerCase().trim()}`;
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING, description: "The word being analyzed capitalized correctly" },
      ipa: { type: Type.STRING, description: "IPA phonetic transcription" },
      type: { type: Type.STRING, description: "Part of speech (noun, verb, adj, etc.)" },
      short_meaning: { type: Type.STRING, description: "A very short, direct Vietnamese translation (e.g., hello: xin chào)" },
      meaning_vi: { type: Type.STRING, description: "Detailed meaning in Vietnamese" },
      meaning_en: { type: Type.STRING, description: "Definition in English (IELTS academic level)" },
      example: { type: Type.STRING, description: "An example sentence using the word in an IELTS context" },
      synonyms: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of 3 advanced synonyms useful for IELTS"
      },
      antonyms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 3 antonyms useful for IELTS context"
      }
    },
    required: ["word", "ipa", "type", "short_meaning", "meaning_vi", "meaning_en", "example", "synonyms", "antonyms"]
  };

  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Analyze the English word: "${word}" for an IELTS student. Provide accurate definitions, IPA, and examples.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert IELTS tutor. Your goal is to help students expand their academic vocabulary. Provide precise and high-band score outputs."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as Omit<VocabItem, 'id' | 'createdAt'>;
  }, API_KEYS.length, cacheKey); // Pass cacheKey here
};

/**
 * Generates a new example sentence for a specific word
 */
export const generateNewExample = async (word: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  
  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Generate a new, distinct, high-quality IELTS academic example sentence for the word "${word}". Return only the sentence text.`,
    });
    return response.text?.trim() || "Could not generate example.";
  });
};

/**
 * Generates a mini quiz based on a topic
 */
export const generateQuiz = async (topic: string): Promise<QuizQuestion[]> => {
  const modelId = "gemini-2.5-flash";

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        question: { type: Type.STRING, description: "A multiple choice question related to the topic" },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "4 possible answers"
        },
        correctAnswerIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" },
        explanation: { type: Type.STRING, description: "Why this answer is correct" }
      },
      required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
    }
  };

  return withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Create a 5-question multiple choice quiz for IELTS preparation about the topic: "${topic}". The questions should test vocabulary, grammar, or reading comprehension suitable for IELTS Band 7.0+.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as QuizQuestion[];
  });
};

/**
 * Chat with AI Tutor
 */
export const chatWithTutor = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  return withRetry(async (ai) => {
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: history,
      config: {
        systemInstruction: "You are a friendly and strict IELTS Examiner/Tutor. You help students practice English. You correct their grammar mistakes and suggest better vocabulary. You explain things clearly in Vietnamese when asked, but prefer English for practice.",
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  });
};