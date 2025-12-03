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
    const { history, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAIClient();
    const chat = ai.chats.create({
      // Dùng model mới được @google/genai hỗ trợ cho chats
      model: 'gemini-2.5-flash',
      history: history || [],
      config: {
        systemInstruction: 'You are a friendly and strict IELTS Examiner/Tutor. You help students practice English. You correct their grammar mistakes and suggest better vocabulary. You explain things clearly in Vietnamese when asked, but prefer English for practice.',
      }
    });

    const response = await chat.sendMessage({ message });
    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error('Error in chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to chat'
    });
  }
}
