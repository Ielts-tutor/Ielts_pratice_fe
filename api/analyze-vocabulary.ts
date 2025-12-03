import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import Redis from 'ioredis';

// Initialize Redis client
let redis: Redis | null = null;
const getRedisClient = () => {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        }
      });
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }
  return redis;
};

// Determine allowed frontend origin from env (e.g. FRONTEND_URL=http://localhost:5173)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';

// API Keys rotation
const API_KEYS = [
  process.env.VITE_API_KEY,
  process.env.VITE_API_KEY1,
  process.env.VITE_API_KEY2,
  process.env.VITE_API_KEY3,
  process.env.VITE_API_KEY4,
  process.env.VITE_API_KEY5,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

const getAIClient = () => {
  if (API_KEYS.length === 0) {
    throw new Error('No API keys available');
  }
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

const rotateAPIKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Switched to API key ${currentKeyIndex + 1}/${API_KEYS.length}`);
};

// Cache duration: 7 days
const CACHE_DURATION = 7 * 24 * 60 * 60; // in seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { word } = req.body;

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    const cacheKey = `vocab:${word.toLowerCase().trim()}`;
    const redisClient = getRedisClient();

    // Try to get from Redis cache first
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`Cache HIT for: ${word}`);
          return res.status(200).json({
            ...JSON.parse(cached),
            fromCache: true,
            cacheType: 'redis'
          });
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    console.log(`Cache MISS for: ${word}, calling AI...`);

    // Define schema for vocabulary analysis
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING, description: 'The word being analyzed capitalized correctly' },
        ipa: { type: Type.STRING, description: 'IPA phonetic transcription' },
        type: { type: Type.STRING, description: 'Part of speech (noun, verb, adj, etc.)' },
        short_meaning: { type: Type.STRING, description: 'A very short, direct Vietnamese translation' },
        meaning_vi: { type: Type.STRING, description: 'Detailed meaning in Vietnamese' },
        meaning_en: { type: Type.STRING, description: 'Definition in English (IELTS academic level)' },
        example: { type: Type.STRING, description: 'An example sentence using the word in an IELTS context' },
        synonyms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of 3 advanced synonyms useful for IELTS'
        },
        antonyms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of 3 antonyms useful for IELTS context'
        }
      },
      required: ['word', 'ipa', 'type', 'short_meaning', 'meaning_vi', 'meaning_en', 'example', 'synonyms', 'antonyms']
    };

    // Retry logic with key rotation
    let lastError: Error | null = null;
    let baseDelay = 1000;

    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          // Dùng model mới được @google/genai hỗ trợ
          model: 'gemini-2.5-flash',
          contents: `Analyze the English word: "${word}" for an IELTS student. Provide accurate definitions, IPA, and examples.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            systemInstruction: 'You are an expert IELTS tutor. Your goal is to help students expand their academic vocabulary. Provide precise and high-band score outputs.'
          }
        });

        const text = response.text;
        if (!text) throw new Error('No response from AI');

        const result = JSON.parse(text);

        // Cache the result in Redis
        if (redisClient) {
          try {
            await redisClient.setex(cacheKey, CACHE_DURATION, JSON.stringify(result));
            console.log(`Cached result for: ${word}`);
          } catch (error) {
            console.error('Redis set error:', error);
          }
        }

        return res.status(200).json({
          ...result,
          fromCache: false,
          cacheType: 'none'
        });

      } catch (error: any) {
        lastError = error;

        const is429 = error?.message?.includes('429') ||
          error?.status === 429 ||
          error?.message?.toLowerCase().includes('quota') ||
          error?.message?.toLowerCase().includes('rate limit');

        if (is429 && attempt < API_KEYS.length - 1) {
          console.warn(`Rate limit hit on key ${currentKeyIndex + 1}, rotating...`);
          rotateAPIKey();

          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('All API keys exhausted');

  } catch (error: any) {
    console.error('Error in analyze-vocabulary:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze vocabulary',
      details: error.toString()
    });
  }
}
