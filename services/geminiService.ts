import { GoogleGenAI, Type, Schema } from "@google/genai";
import { VocabItem, QuizQuestion } from "../types";

// Initialize the client. The API key is guaranteed to be in process.env.API_KEY by index.tsx
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a vocabulary word using Gemini 2.5 Flash
 */
export const analyzeVocabulary = async (word: string): Promise<Omit<VocabItem, 'id' | 'createdAt'>> => {
  const modelId = "gemini-2.5-flash";
  
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
};

/**
 * Generates a new example sentence for a specific word
 */
export const generateNewExample = async (word: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Generate a new, distinct, high-quality IELTS academic example sentence for the word "${word}". Return only the sentence text.`,
  });
  return response.text?.trim() || "Could not generate example.";
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
};

/**
 * Chat with AI Tutor
 */
export const chatWithTutor = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  // Map history to the format expected by the SDK if necessary, or use the chat helper
  // Here we use the chat helper for simplicity
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: history,
    config: {
      systemInstruction: "You are a friendly and strict IELTS Examiner/Tutor. You help students practice English. You correct their grammar mistakes and suggest better vocabulary. You explain things clearly in Vietnamese when asked, but prefer English for practice.",
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};