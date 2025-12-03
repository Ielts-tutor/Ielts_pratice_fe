import { VocabItem, QuizQuestion } from "../types";

// Determine API base URL
// - Dev: dùng `vercel dev` để chạy FE + API cùng origin http://localhost:3000
// - Production (deploy Vercel): dùng cùng domain (relative path '')
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : ''; // Production (same domain)

/**
 * Analyzes a vocabulary word using serverless API with Redis cache
 */
export const analyzeVocabulary = async (word: string): Promise<Omit<VocabItem, 'id' | 'createdAt'>> => {
  const response = await fetch(`${API_BASE_URL}/api/analyze-vocabulary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  // Log cache status
  if (data.fromCache) {
    console.log(`✓ Loaded "${word}" from ${data.cacheType} cache`);
  } else {
    console.log(`⚡ Fetched "${word}" from AI (cached for future use)`);
  }
  
  return data;
};

/**
 * Generates a new example sentence for a specific word
 */
export const generateNewExample = async (word: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/generate-example`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.example || "Could not generate example.";
};

/**
 * Generates a mini quiz based on a topic
 * Note: This still uses client-side for now, can be moved to API later
 */
export const generateQuiz = async (topic: string): Promise<QuizQuestion[]> => {
  // For now, return empty array or implement client-side
  // You can create /api/generate-quiz.ts later if needed
  console.warn('Quiz generation not yet implemented via API for topic:', topic);
  return [];
};

/**
 * Chat with AI Tutor via serverless API
 */
export const chatWithTutor = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history, message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};
