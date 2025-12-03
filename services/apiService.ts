import { VocabItem, QuizQuestion } from "../types";

// Determine API base URL
// - Dev: dùng `vercel dev` để chạy FE + API cùng origin http://localhost:3000
// - Production (deploy Vercel): dùng cùng domain (relative path '')
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : ''; // Production (same domain)

// Backend URL - lấy từ environment variable VITE_BACKEND_URL
// Ví dụ: VITE_BACKEND_URL=http://localhost:4000 (dev) hoặc https://ielts-practice-be.onrender.com (production)
const SPEAKING_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

if (!SPEAKING_BACKEND_URL) {
  console.error('[apiService] ⚠️ VITE_BACKEND_URL is not set in environment variables');
  throw new Error('VITE_BACKEND_URL environment variable is required');
}

// Log để debug
if (import.meta.env.DEV) {
  console.log('[apiService] Backend URL:', SPEAKING_BACKEND_URL);
}

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

/**
 * Chat với Speaking Tutor (backend Node riêng, dùng cho chế độ voice)
 */
export const chatWithSpeakingTutor = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  const response = await fetch(`${SPEAKING_BACKEND_URL}/api/speaking-chat`, {
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
  return data.text as string;
};

// --- User analytics & admin APIs (Mongo backend) ---

interface BasicUserPayload {
  id: string;
  name: string;
  joinedAt: number;
  lastLoginAt?: number;
}

export const syncUserSnapshot = async (payload: {
  user: BasicUserPayload;
  vocab?: VocabItem[];
  globalNotes?: { text: string; savedAt: number };
  lessonNotes?: any[];
}) => {
  try {
    await fetch(`${SPEAKING_BACKEND_URL}/api/user-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('syncUserSnapshot failed', err);
  }
};

export const logChatActivity = async (
  userId: string,
  userMessage: string,
  modelReply: string,
  timestamp: number,
) => {
  try {
    const response = await fetch(`${SPEAKING_BACKEND_URL}/api/chat-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userMessage, modelReply, timestamp }),
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[logChatActivity] HTTP ${response.status}:`, errorText);
      return; // Fail silently - logging is not critical for app functionality
    }
  } catch (err) {
    // Network errors or other issues - fail silently
    console.warn('[logChatActivity] Request failed:', err instanceof Error ? err.message : 'Unknown error');
  }
};

export interface AdminUserSummary {
  userId: string;
  name: string;
  joinedAt: number;
  lastLoginAt?: number;
  vocabCount: number;
  lessonCount: number;
  chatCount: number;
}

export interface AdminUserDetail {
  userId: string;
  name: string;
  joinedAt: number;
  lastLoginAt?: number;
  vocab?: VocabItem[];
  globalNotes?: { text: string; savedAt: number } | null;
  lessonNotes?: any[];
  chatHistory?: { role: string; text: string; timestamp: number }[];
}

export const fetchAdminUsers = async (): Promise<AdminUserSummary[]> => {
  const res = await fetch(`${SPEAKING_BACKEND_URL}/api/admin/users`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AdminUserSummary[];
};

export const fetchAdminUserDetail = async (
  userId: string,
): Promise<AdminUserDetail> => {
  const res = await fetch(`${SPEAKING_BACKEND_URL}/api/admin/users/${userId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as AdminUserDetail;
};
