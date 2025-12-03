import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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
};

// Determine allowed frontend origin from env (e.g. FRONTEND_URL=http://localhost:5173)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';

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

    // Retry logic with key rotation
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          // Dùng model mới được @google/genai hỗ trợ
          model: 'gemini-2.5-flash',
          contents: `Generate a new, distinct, high-quality IELTS academic example sentence for the word "${word}". Return only the sentence text.`,
        });

        const text = response.text?.trim();
        if (!text) throw new Error('No response from AI');

        return res.status(200).json({ example: text });

      } catch (error: any) {
        lastError = error;

        const is429 = error?.message?.includes('429') ||
          error?.status === 429 ||
          error?.message?.toLowerCase().includes('quota') ||
          error?.message?.toLowerCase().includes('rate limit');

        if (is429 && attempt < API_KEYS.length - 1) {
          rotateAPIKey();
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('All API keys exhausted');

  } catch (error: any) {
    console.error('Error in generate-example:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate example'
    });
  }
}
