export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  QUIZ = 'QUIZ',
  CHAT = 'CHAT'
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: number;
}

export interface VocabItem {
  id: string;
  word: string;
  ipa: string;
  type: string;
  short_meaning: string;
  meaning_vi: string;
  meaning_en: string;
  example: string;
  synonyms?: string[];
  antonyms?: string[];
  createdAt: number;
  mastered?: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: string;
  text: string;
  timestamp: number;
}