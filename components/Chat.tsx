import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCcw } from 'lucide-react';
import { chatWithTutor, chatWithSpeakingTutor, logChatActivity } from '../services/apiService';
import { ChatMessage, User as AppUser } from '../types';
import { speakWithElevenLabs } from '../services/elevenLabsService';

interface ChatProps {
  user: AppUser;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I am your IELTS Tutor. I can help you with Writing correction, Speaking ideas, or general English questions. How can I help you today?",
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [hasVoiceWelcome, setHasVoiceWelcome] = useState(false);

  // Hàm tạo lời chào dựa trên tên user và thời gian (giờ Việt Nam UTC+7)
  const generateWelcomeMessage = (): string => {
    // Lấy giờ Việt Nam (UTC+7) - sử dụng Intl để lấy đúng timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      hour12: false,
    });
    const vietnamHour = formatter.formatToParts(now).find(part => part.type === 'hour');
    const hour = vietnamHour ? parseInt(vietnamHour.value, 10) : now.getHours();
    const userName = user?.name?.trim() || '';
    
    // Xác định buổi trong ngày theo giờ Việt Nam
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = 'Good evening';
    } else {
      timeGreeting = 'Good evening'; // Late night (21h-5h)
    }
    
    // Nhiều mẫu câu chào hỏi đa dạng và dài hơn
    const greetings = [
      // Với tên user
      ...(userName ? [
        `${timeGreeting}, ${userName}! I'm your IELTS Speaking Tutor, and I'm really excited to help you practice today. We can work on Part 1 questions, Part 2 long turn, or just have a general conversation to improve your fluency. What would you like to focus on today?`,
        `${timeGreeting}, ${userName}! Welcome to your IELTS Speaking practice session. I'm here to help you improve your speaking skills, pronunciation, and confidence. Feel free to start speaking whenever you're ready. What topic interests you today?`,
        `Hello ${userName}! ${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm here to support you on your journey to improve your English speaking skills. We can practice different parts of the IELTS Speaking test, or just have a natural conversation. What would you like to work on?`,
        `${timeGreeting}, ${userName}! Great to see you again. I'm your IELTS Speaking Tutor, and I'm ready to help you practice. Whether you want to work on Part 1 introductions, Part 2 long turn, or Part 3 discussions, I'm here to guide you. What would you like to discuss today?`,
        `Hi ${userName}! ${timeGreeting}! I'm your IELTS Speaking Tutor. Let's make today's practice session really productive and helpful for your IELTS preparation. You can practice speaking about various topics, and I'll help you with pronunciation, grammar, and fluency. What would you like to start with?`,
        `${timeGreeting}, ${userName}! I'm your IELTS Speaking Tutor, and I'm here to support your speaking journey. Whether you're preparing for Part 1, Part 2, or Part 3, or just want to have a general conversation to build confidence, I'm ready to help. Feel free to start speaking. What would you like to practice?`,
        `Hello ${userName}! ${timeGreeting}! Ready to practice your IELTS Speaking? I'm here to help you improve your fluency, pronunciation, and overall speaking skills. We can work on any part of the test or just have a natural conversation. What topic would you like to explore today?`,
        `${timeGreeting}, ${userName}! Welcome back! I'm your IELTS Speaking Tutor. Let's practice together and make progress on your speaking skills. Whether you want to work on specific test parts or just improve your general conversation skills, I'm here to help. What would you like to talk about?`,
        `Hi there, ${userName}! ${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm really looking forward to helping you practice today. We can focus on any aspect of the IELTS Speaking test that you'd like to improve. Feel free to start speaking whenever you're ready. What interests you?`,
        `${timeGreeting}, ${userName}! I'm your IELTS Speaking Tutor, and I'm excited to work with you today. We can practice Part 1 questions about yourself, Part 2 long turn presentations, or Part 3 discussions on various topics. What would you like to begin with?`,
      ] : []),
      // Không có tên user
      `${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm here to help you practice and improve your speaking skills. We can work on different parts of the IELTS Speaking test – Part 1 introductions, Part 2 long turn, or Part 3 discussions. What would you like to focus on today?`,
      `${timeGreeting}! Welcome to your IELTS Speaking practice session. I'm really excited to help you today and support you in improving your English speaking abilities. Feel free to start speaking whenever you're ready. What topic interests you?`,
      `Hello! ${timeGreeting}! I'm your IELTS Speaking Tutor. Let's make this practice session really productive and beneficial for your IELTS preparation. We can practice various speaking tasks, and I'll help you with pronunciation, grammar, and fluency. What would you like to practice today?`,
      `${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm ready to help you improve your speaking skills. Whether you want to practice Part 1, Part 2, or Part 3, or just have a general conversation to build confidence, I'm here to guide you. You can start speaking now. What topic would you like to discuss?`,
      `Hi there! ${timeGreeting}! I'm here to support your IELTS Speaking journey and help you become more confident in speaking English. We can work on any part of the test that you'd like to improve, or just have a natural conversation. Feel free to start speaking. What would you like to work on?`,
      `${timeGreeting}! Great to have you here! I'm your IELTS Speaking Tutor. Let's practice together and make real progress on your speaking skills. Whether you're preparing for Part 1, Part 2, or Part 3, or just want to improve your general conversation, I'm ready to help. What would you like to talk about today?`,
      `Hello! ${timeGreeting}! I'm your IELTS Speaking Tutor. Ready to practice? We can work on different aspects of the IELTS Speaking test, and I'll help you with pronunciation, vocabulary, and fluency. You can start speaking now. What interests you?`,
      `${timeGreeting}! Welcome! I'm here to help you practice IELTS Speaking and improve your English communication skills. Whether you want to focus on specific test parts or just have a natural conversation, I'm ready to support you. Feel free to start whenever you're ready. What would you like to discuss?`,
      `Hi! ${timeGreeting}! I'm your IELTS Speaking Tutor. Let's make today's session really productive and helpful for your IELTS preparation. We can practice Part 1 questions, Part 2 long turn, or Part 3 discussions. What would you like to practice – Part 1, Part 2, or general conversation?`,
      `${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm really excited to help you today. We can work on any part of the IELTS Speaking test that you'd like to improve, and I'll provide feedback on your pronunciation, grammar, and fluency. You can start speaking now. What topic would you like to explore?`,
      `Hello there! ${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm here to help you build confidence and improve your speaking skills. We can practice different speaking tasks, and I'll guide you through each one. What would you like to start with today?`,
      `${timeGreeting}! I'm your IELTS Speaking Tutor, and I'm looking forward to helping you practice today. Whether you want to work on Part 1 introductions, Part 2 presentations, or Part 3 discussions, I'm here to support you. Feel free to start speaking. What interests you?`,
    ];
    
    // Random chọn một mẫu câu
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  };
  // Sóng âm động cho user & AI
  const baseUserWave = [8, 14, 20, 14, 8, 16, 10];
  const baseAiWave = [10, 18, 24, 18, 10, 20, 12];
  const [userWave, setUserWave] = useState<number[]>(baseUserWave);
  const [aiWave, setAiWave] = useState<number[]>(baseAiWave);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceStageRef = useRef<number>(0); // 0: chưa hỏi, 1: đã hỏi lần 1 (10s), 2: đã hỏi lần 2 (20s), 3: đã thông báo (30s)
  const isRecognitionActiveRef = useRef<boolean>(false);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0); // Thời gian bắt đầu session
  const shouldKeepRecordingRef = useRef<boolean>(true); // Flag để biết có nên tiếp tục recording không
  const hasSpeechDetectedRef = useRef<boolean>(false); // Flag để biết đã có speech detected chưa
  const [isSpeaking, setIsSpeaking] = useState(false);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) {
      setInput('');
    }
    setIsTyping(true);

    try {
      // Convert current messages to history format for the service
      // Giảm history xuống 5 turns để tăng tốc độ (ít token hơn = nhanh hơn)
      // Filter out the welcome message and ensure history starts with user turn
      let history = messages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('voice-welcome')) // Remove welcome messages
        .slice(-5) // Giảm từ 10 xuống 5 để tăng tốc
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model', // Ensure role is correct
          parts: [{ text: m.text }]
        }));
      
      // Gemini API requires history to start with a user turn
      // If history starts with model message, remove it or ensure we have at least one user message
      if (history.length > 0 && history[0].role === 'model') {
        // Find first user message index
        const firstUserIndex = history.findIndex(h => h.role === 'user');
        if (firstUserIndex > 0) {
          // Remove model messages before first user message
          history = history.slice(firstUserIndex);
        } else if (firstUserIndex === -1) {
          // No user messages in history, use empty history (only send current message)
          history = [];
        }
      }

      const service =
        mode === 'voice' ? chatWithSpeakingTutor : chatWithTutor;

      const responseText = await service(history, userMsg.text);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I'm having trouble connecting. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
      if (responseText) {
        logChatActivity(user.id, userMsg.text, responseText, Date.now());
      }
      
      // Nếu ở voice mode, đọc text response bằng ElevenLabs TTS
      if (mode === 'voice') {
        handleSpeak(responseText);
      }
    } catch (error: any) {
      console.error('[Chat] Error sending message:', error);
      const errorMessage = error?.message || 'Unknown error';
      const errorText = errorMessage.includes('500') || errorMessage.includes('HTTP 500')
        ? "Sorry, the server encountered an error. Please check if the backend is running and has a valid API key."
        : "Sorry, I encountered an error. Please try again.";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorText,
        timestamp: Date.now()
      }]);
      // Nếu ở voice mode, đọc error message bằng TTS
      if (mode === 'voice') {
        handleSpeak(errorText);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Khởi tạo visualizer dựa trên âm thanh thật từ micro
  const startMicVisualizer = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices) return;
    if (audioContextRef.current) return; // đã chạy

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AnyWindow = window as any;
      const AudioCtx =
        AnyWindow.AudioContext || AnyWindow.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      micStreamRef.current = stream;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += Math.abs(dataArray[i] - 128);
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 30); // 0 -> 1

        setUserWave(
          baseUserWave.map((v) => v * (0.6 + normalized * 1.2))
        );

        animationFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (e) {
      console.error('Cannot start mic visualizer', e);
    }
  };

  const stopMicVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setUserWave(baseUserWave);
  };

  // Handle start/stop recording for Live API
  // Text-to-Speech: Đọc text response của AI sử dụng ElevenLabs
  const handleSpeak = async (text: string) => {
    if (!text || typeof window === 'undefined') return;
    
    // Cancel bất kỳ audio nào đang phát trước đó
    // (nếu có audio element đang chạy, dừng nó lại)
    
    setIsSpeaking(true);
    
    try {
      // Sử dụng ElevenLabs API để tạo giọng nói tự nhiên
      await speakWithElevenLabs(text, {
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - giọng nữ tự nhiên
        modelId: 'eleven_multilingual_v2', // Model mới theo tài liệu chính thức
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
      });
      
      setIsSpeaking(false);
      
      // Reset silence detection sau khi AI nói xong
      lastSpeechTimeRef.current = Date.now();
      silenceStageRef.current = 0;
      // Restart silence detection
      if (mode === 'voice') {
        startSilenceDetection();
      }
      
      // Tự động resume recording sau khi AI nói xong để tiếp tục session 30s
      // CHỈ resume nếu đã có speech detected trước đó
      if (mode === 'voice' && shouldKeepRecordingRef.current && hasSpeechDetectedRef.current) {
        const sessionDuration = Date.now() - sessionStartTimeRef.current;
        if (sessionDuration < 30000 && !isRecording) {
          setTimeout(() => {
            if (mode === 'voice' && !isRecording && shouldKeepRecordingRef.current && hasSpeechDetectedRef.current) {
              console.log('[Speech-to-Text] 🎤 Auto-resuming recording after AI finished speaking (speech detected)');
              startWebSpeechRecording('start');
            }
          }, 300);
        }
      }
    } catch (error: any) {
      const errorStatus = error?.status || 0;
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || String(error);
      
      // Log error với thông tin chi tiết
      const isAbuseDetection = errorStatus === 401 || errorCode === 'ELEVENLABS_AUTH_ERROR' || 
                               errorMessage?.includes('detected_unusual_activity');
      
      if (!isAbuseDetection) {
        console.error('[Text-to-Speech] ❌ ElevenLabs error, falling back to browser TTS:', {
          status: errorStatus,
          code: errorCode,
          message: errorMessage,
        });
      } else {
        // ElevenLabs free tier bị disable - đây là vấn đề từ ElevenLabs API, không phải lỗi code
        // App sẽ tự động fallback sang browser TTS (vẫn hoạt động bình thường)
        console.warn('[Text-to-Speech] ⚠️ ElevenLabs free tier unavailable (unusual activity detected by ElevenLabs). Automatically using browser TTS - functionality continues normally.');
      }
      
      setIsSpeaking(false);
      
      // Fallback to browser TTS nếu ElevenLabs fail
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        setIsSpeaking(true);
        
        utterance.onend = () => {
          console.log('[Text-to-Speech] ✅ Finished speaking (browser TTS fallback)');
          setIsSpeaking(false);
          lastSpeechTimeRef.current = Date.now();
          silenceStageRef.current = 0;
          if (mode === 'voice') {
            startSilenceDetection();
          }
        };
        
        utterance.onerror = (err) => {
          console.error('[Text-to-Speech] ❌ Browser TTS error:', err);
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        // Chỉ hiển thị alert nếu cả ElevenLabs và browser TTS đều không hoạt động
        console.error('[Text-to-Speech] ❌ No TTS available (neither ElevenLabs nor browser TTS)');
        setIsSpeaking(false);
      }
    }
  };

  // Initialize browser speech recognition (Chrome) - Fallback khi Live API không khả dụng
  const getSpeechRecognition = (): any | null => {
    if (typeof window === 'undefined') return null;
    const AnyWindow = window as any;
    const SR = AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition;
    if (!SR) return null;
    if (!recognitionRef.current) {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;
    }
    return recognitionRef.current;
  };

  const handleStartStopRecording = async (force?: 'start' | 'stop') => {
    if (mode !== 'voice') return;
    
    // Chỉ sử dụng Web Speech API (không dùng Live API)
    startWebSpeechRecording(force);
  };

  // Hàm bắt đầu silence detection với các mốc thời gian: 10s, 20s, 30s
  const startSilenceDetection = () => {
    // Clear timers cũ
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
    const currentStage = silenceStageRef.current;
    
    // Mốc 1: Sau 10s không có speech (nếu chưa hỏi lần 1)
    if (currentStage < 1) {
      const delay1 = Math.max(0, 10000 - timeSinceLastSpeech);
      silenceTimerRef.current = setTimeout(() => {
        if (mode === 'voice' && !isSpeaking && !isTyping && isRecognitionActiveRef.current) {
          triggerAIQuestion(1);
          // Tiếp tục với mốc 2 (20s)
          setTimeout(() => {
            if (mode === 'voice' && silenceStageRef.current === 1 && !isSpeaking && !isTyping) {
              triggerAIQuestion(2);
              // Tiếp tục với mốc 3 (30s)
              setTimeout(() => {
                if (mode === 'voice' && silenceStageRef.current === 2 && !isSpeaking && !isTyping) {
                  triggerAIQuestion(3);
                  // Sau đó tắt sau 30s
                  inactivityTimerRef.current = setTimeout(() => {
                    if (mode === 'voice' && silenceStageRef.current === 3) {
                      triggerAutoStop();
                    }
                  }, 3000); // Thêm 3s sau khi thông báo
                }
              }, 10000); // 10s từ mốc 2 đến mốc 3
            }
          }, 10000); // 10s từ mốc 1 đến mốc 2
        }
      }, delay1);
    }
    // Mốc 2: Sau 20s không có speech (nếu đã hỏi lần 1)
    else if (currentStage === 1) {
      const delay2 = Math.max(0, 10000 - (timeSinceLastSpeech - 10000));
      silenceTimerRef.current = setTimeout(() => {
        if (mode === 'voice' && !isSpeaking && !isTyping && isRecognitionActiveRef.current) {
          triggerAIQuestion(2);
          // Tiếp tục với mốc 3 (30s)
          setTimeout(() => {
            if (mode === 'voice' && silenceStageRef.current === 2 && !isSpeaking && !isTyping) {
              triggerAIQuestion(3);
              // Sau đó tắt sau 30s
              inactivityTimerRef.current = setTimeout(() => {
                if (mode === 'voice' && silenceStageRef.current === 3) {
                  triggerAutoStop();
                }
              }, 3000);
            }
          }, 10000);
        }
      }, delay2);
    }
    // Mốc 3: Sau 30s không có speech (nếu đã hỏi lần 2)
    else if (currentStage === 2) {
      const delay3 = Math.max(0, 10000 - (timeSinceLastSpeech - 20000));
      silenceTimerRef.current = setTimeout(() => {
        if (mode === 'voice' && !isSpeaking && !isTyping && isRecognitionActiveRef.current) {
          triggerAIQuestion(3);
          // Sau đó tắt sau 30s
          inactivityTimerRef.current = setTimeout(() => {
            if (mode === 'voice' && silenceStageRef.current === 3) {
              triggerAutoStop();
            }
          }, 3000);
        }
      }, delay3);
    }
  };

  // AI tự động hỏi thăm theo các mốc thời gian
  const triggerAIQuestion = async (stage: number) => {
    if (isTyping || isSpeaking) return;
    
    let question = '';
    
    if (stage === 0) {
      // Lần đầu vào Speaking mode - chào hỏi
      question = generateWelcomeMessage();
    } else if (stage === 1) {
      // Sau 10s không có speech - hỏi lần 1
      const questions = [
        "Hello! I'm here to help you practice IELTS Speaking. What would you like to talk about today?",
        "Hi there! Ready to practice? You can tell me about yourself, or we can discuss any topic you'd like.",
        "Hello! Feel free to start speaking whenever you're ready. What's on your mind?"
      ];
      question = questions[Math.floor(Math.random() * questions.length)];
    } else if (stage === 2) {
      // Sau 20s không có speech - hỏi lần 2
      const questions = [
        "Are you still there? I'm ready to help you practice speaking. Just say something when you're ready!",
        "Hello? Feel free to speak up! I'm here to help you improve your English speaking skills.",
        "Don't be shy! You can start speaking now. What would you like to discuss?"
      ];
      question = questions[Math.floor(Math.random() * questions.length)];
    } else if (stage === 3) {
      // Gần hết 30s - thông báo sắp tắt
      question = "I notice you haven't spoken for a while. I'll close the speaking mode in a few seconds. Feel free to start again anytime!";
    }
    
    if (question) {
      console.log(`[AI] 🤖 Stage ${stage} - Auto-asking user:`, question);
      
      const aiMsg: ChatMessage = {
        id: `auto-question-${Date.now()}`,
        role: 'model',
        text: question,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      handleSpeak(question);
      silenceStageRef.current = stage;
    }
  };

  // Tự động tắt sau 30s không có hoạt động
  const triggerAutoStop = () => {
    console.log('[Chat] ⏰ 30 seconds of inactivity - Auto stopping speaking mode');
    handleStartStopRecording('stop');
    setMode('text'); // Chuyển về text mode
    setMessages((prev) => [
      ...prev,
      {
        id: `auto-stop-${Date.now()}`,
        role: 'model',
        text: "Speaking mode has been closed due to inactivity. You can switch back to Speaking mode anytime to continue practicing!",
        timestamp: Date.now(),
      },
    ]);
  };

  const startWebSpeechRecording = (force?: 'start' | 'stop', shouldGreet: boolean = false) => {
    const rec = getSpeechRecognition();
    if (!rec) {
      alert('Trình duyệt của bạn không hỗ trợ luyện Speaking trực tiếp. Hãy thử Chrome trên desktop.');
      return;
    }

    // Kiểm tra nếu đang stop (chỉ khi user click tắt thủ công)
    if (force === 'stop') {
      console.log('[Speech-to-Text] 🛑 User manually stopped recording');
      if (isRecognitionActiveRef.current) {
        try {
          rec.stop();
        } catch (e) {
          console.warn('[Speech-to-Text] Error stopping:', e);
        }
      }
      setIsRecording(false);
      isRecognitionActiveRef.current = false;
      stopMicVisualizer();
      // Clear all timers khi user tắt thủ công
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
      // Reset flags
      silenceStageRef.current = 0;
      lastSpeechTimeRef.current = 0;
      shouldKeepRecordingRef.current = false; // User tắt thủ công
      sessionStartTimeRef.current = 0;
      hasSpeechDetectedRef.current = false; // Reset flag khi user tắt
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Kiểm tra nếu đã đang recording hoặc recognition đang active
    if (isRecording || isRecognitionActiveRef.current) {
      console.warn('[Speech-to-Text] ⚠️ Already recording, skipping start');
      return;
    }

    // Reset silence detection và bắt đầu session 30s
    lastSpeechTimeRef.current = Date.now();
    silenceStageRef.current = 0;
    sessionStartTimeRef.current = Date.now(); // Bắt đầu đếm 30s
    shouldKeepRecordingRef.current = true; // Cho phép tiếp tục recording
    hasSpeechDetectedRef.current = false; // Reset flag khi bắt đầu recording mới
    
    // Nếu cần chào hỏi (lần đầu bật), AI sẽ tự động chào
    if (shouldGreet && !hasVoiceWelcome) {
      setTimeout(() => {
        const welcomeText = generateWelcomeMessage();
        setMessages((prev) => [
          ...prev,
          {
            id: `voice-welcome-${Date.now()}`,
            role: 'model',
            text: welcomeText,
            timestamp: Date.now(),
          },
        ]);
        setHasVoiceWelcome(true);
        handleSpeak(welcomeText);
      }, 500);
    }
    
    // Clear any existing timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Set timer để tự động dừng sau 30s không có hoạt động
    inactivityTimerRef.current = setTimeout(() => {
      const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
      if (timeSinceLastSpeech >= 30000) {
        console.log('[Chat] ⏰ 30 seconds of inactivity - Auto stopping');
        shouldKeepRecordingRef.current = false;
        triggerAutoStop();
      }
    }, 30000);
    
    // Reset event handlers mỗi lần start để tránh conflict
    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      // Cập nhật thời gian có speech và đánh dấu đã có speech detected
      if (transcript.trim()) {
        hasSpeechDetectedRef.current = true; // Đánh dấu đã có speech detected
        lastSpeechTimeRef.current = Date.now();
        silenceStageRef.current = 0; // Reset stage khi có speech
        
        // Clear tất cả timers khi có speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        
        // Restart silence detection timers
        startSilenceDetection();
      }
      
      // Hiển thị transcript tạm thời trong input
      setInput(transcript);
      
      // Khi có kết quả cuối cùng (user ngừng nói), gửi đến AI
      const isFinal = event.results[event.results.length - 1].isFinal;
      if (isFinal && transcript.trim()) {
        console.log('[Speech-to-Text] ✅ Final transcript:', transcript);
        // KHÔNG dừng recording - giữ kết nối liên tục
        // Chỉ clear silence timer và gửi text
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        // Gửi text đến AI và đợi response (recognition sẽ tự động tiếp tục qua onend)
        handleSend(transcript);
        // Restart silence detection sau khi gửi
        startSilenceDetection();
      }
    };

    rec.onerror = (event: any) => {
      const errorType = event.error;
      console.warn('[Speech-to-Text] ⚠️ Error:', errorType);
      
      // "no-speech" là lỗi bình thường khi không có speech, không cần dừng
      // Chỉ dừng khi có lỗi nghiêm trọng hoặc user tắt thủ công
      if (errorType === 'no-speech') {
        // Không làm gì cả, recognition sẽ tự động tiếp tục
        console.log('[Speech-to-Text] ℹ️ No speech detected (normal), keeping connection alive');
        return;
      }
      
      // Các lỗi khác: network, audio-capture, not-allowed
      if (errorType === 'network' || errorType === 'audio-capture' || errorType === 'not-allowed') {
        console.error('[Speech-to-Text] ❌ Critical error:', errorType);
        setIsRecording(false);
        isRecognitionActiveRef.current = false;
        stopMicVisualizer();
        // Clear silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        // Không auto-resume khi có lỗi nghiêm trọng
        return;
      }
      
      // Các lỗi khác: aborted, service-not-allowed
      if (errorType === 'aborted') {
        // Aborted thường do user tắt hoặc stop() được gọi, không cần làm gì
        console.log('[Speech-to-Text] ℹ️ Recognition aborted');
        setIsRecording(false);
        isRecognitionActiveRef.current = false;
        return;
      }
    };

    rec.onend = () => {
      console.log('[Speech-to-Text] 🔌 Recognition ended');
      setIsRecording(false);
      isRecognitionActiveRef.current = false;
      
      // Kiểm tra xem có nên tiếp tục recording không (trong vòng 30s)
      const sessionDuration = Date.now() - sessionStartTimeRef.current;
      const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
      
      // Chỉ tự động resume nếu:
      // 1. Vẫn ở voice mode
      // 2. Chưa hết 30s từ khi bắt đầu session
      // 3. Không phải do user tắt thủ công
      // 4. Không đang nói
      // 5. ĐÃ CÓ SPEECH DETECTED TRƯỚC ĐÓ (quan trọng!)
      if (shouldKeepRecordingRef.current && 
          mode === 'voice' && 
          sessionDuration < 30000 && 
          !isSpeaking && 
          !autoResumeTimerRef.current &&
          hasSpeechDetectedRef.current) { // CHỈ resume nếu đã có speech detected
        
        autoResumeTimerRef.current = setTimeout(() => {
          autoResumeTimerRef.current = null;
          // Double check trước khi resume
          if (shouldKeepRecordingRef.current && 
              mode === 'voice' && 
              !isRecording && 
              !isRecognitionActiveRef.current && 
              !isSpeaking &&
              hasSpeechDetectedRef.current) {
            console.log('[Speech-to-Text] 🔄 Auto-resuming to keep 30s session alive (speech detected)');
            startWebSpeechRecording('start');
          }
        }, 200); // Resume nhanh để giữ kết nối liên tục
      } else if (sessionDuration >= 30000) {
        console.log('[Speech-to-Text] ⏰ 30s session completed, stopping');
        // Sau 30s, dừng recording và kiểm tra inactivity
        if (timeSinceLastSpeech >= 30000) {
          triggerAutoStop();
        }
      }
    };

    // Kiểm tra state trước khi start
    try {
      console.log('[Speech-to-Text] 🎤 Starting speech recognition...');
      isRecognitionActiveRef.current = true;
      setIsRecording(true);
      startMicVisualizer();
      rec.start();
      
      // Start silence detection với các mốc: 10s, 20s, 30s
      startSilenceDetection();
    } catch (error: any) {
      console.error('[Speech-to-Text] ❌ Failed to start:', error);
      isRecognitionActiveRef.current = false;
      setIsRecording(false);
      stopMicVisualizer();
    }
  };

  useEffect(() => {
    return () => {
      stopMicVisualizer();
      // Stop recognition nếu đang chạy
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
        isRecognitionActiveRef.current = false;
      }
      // Clear all timers on unmount
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi chuyển sang Text mode thì chắc chắn tắt mic
  useEffect(() => {
    if (mode === 'text' && isRecording) {
      const rec = getSpeechRecognition();
      if (rec && isRecognitionActiveRef.current) {
        try {
          rec.stop();
        } catch (e) {
          console.warn('[Speech-to-Text] Error stopping:', e);
        }
      }
      setIsRecording(false);
      isRecognitionActiveRef.current = false;
      stopMicVisualizer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isRecording]);

  // Khi chuyển sang Speaking mode: tự động chào hỏi
  useEffect(() => {
    if (mode !== 'voice') {
      return;
    }

    // Chào hỏi chỉ 1 lần khi chuyển sang voice mode
    if (!hasVoiceWelcome) {
      const welcomeText = generateWelcomeMessage();
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-welcome-${Date.now()}`,
          role: 'model',
          text: welcomeText,
          timestamp: Date.now(),
        },
      ]);
      setHasVoiceWelcome(true);
      // Đọc lời chào bằng ElevenLabs TTS
      handleSpeak(welcomeText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Sóng âm cho AI dựa trên trạng thái đang nói
  useEffect(() => {
    if (!isSpeaking) {
      setAiWave(baseAiWave);
      return;
    }
    const id = window.setInterval(() => {
      setAiWave(
        baseAiWave.map((v) => v * (0.7 + Math.random() * 0.9))
      );
    }, 140);
    return () => window.clearInterval(id);
  }, [isSpeaking]);

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-7xl mx-auto gap-4">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">IELTS Assistant</h3>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex text-xs bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1.5 font-medium ${
                mode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`px-3 py-1.5 font-medium ${
                mode === 'voice'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Speaking
            </button>
          </div>
          <button
            onClick={() => setMessages([messages[0]])}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"
            title="Reset Chat"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {/* Speaking Tutor Status Bar + Voice UI */}
      {mode === 'voice' && (
        <div className="px-4 py-3 bg-slate-50 text-slate-800 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {isSpeaking && (
                <span className="absolute inset-0 rounded-full border-2 border-blue-300/60 animate-ping" />
              )}
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Bot size={20} />
              </div>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                IELTS Speaking Tutor
              </p>
              <p className="text-slate-600">
                {isSpeaking
                  ? 'Tutor đang trả lời bạn...'
                  : isRecording
                    ? 'Đang nghe bạn nói, hãy nói như đang trò chuyện với 1 người.'
                    : 'Nhấn nút micro để bắt đầu, sau khi AI trả lời xong hệ thống sẽ tự nghe lại.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sóng âm đơn giản giống minh họa UI voice assistant */}
            <div className="hidden sm:flex items-end gap-1 mr-3">
              {[6, 10, 14, 10, 6].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-blue-400 transition-all duration-300 ${
                    (isRecording || isSpeaking)
                      ? 'animate-[pulse_0.9s_ease-in-out_infinite]'
                      : 'opacity-40'
                  }`}
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                handleStartStopRecording(isRecording ? 'stop' : 'start')
              }
              className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 shadow-[0_0_0_6px_rgba(248,113,113,0.35)]'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_0_6px_rgba(37,99,235,0.35)]'
              }`}
            >
              <span className="absolute inset-0 rounded-full border border-white/20" />
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? 'bg-red-200' : 'bg-blue-200'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Nội dung chính */}
      {mode === 'voice' ? (
        // Chế độ Speaking: vòng tròn lớn ở giữa + sóng âm + input ở dưới
        <div className="flex-1 flex flex-col bg-white">
          {/* Phần chính: Vòng tròn lớn ở giữa với sóng âm */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
            {/* Sóng âm cho User & AI - đặt xung quanh vòng tròn */}
            <div className="absolute top-20 left-0 right-0 flex justify-center gap-8 px-8">
              {/* User wave */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">You</span>
                <div className="flex items-end gap-1 h-16">
                  {userWave.map((h, i) => (
                    <span
                      key={i}
                      className={`w-1.5 rounded-full bg-gradient-to-t from-sky-400 to-blue-500 transition-all duration-300 ${
                        isRecording ? 'opacity-100' : 'opacity-30'
                      }`}
                      style={{
                        height: `${h * 1.5}px`,
                        animationDelay: `${i * 90}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* AI wave */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">AI</span>
                <div className="flex items-end gap-1 h-16">
                  {aiWave.map((h, i) => (
                    <span
                      key={i}
                      className={`w-1.5 rounded-full bg-gradient-to-t from-indigo-400 via-sky-400 to-blue-500 transition-all duration-300 ${
                        isSpeaking ? 'opacity-100' : 'opacity-25'
                      }`}
                      style={{
                        height: `${h * 1.5}px`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Vòng tròn lớn màu xanh ở giữa */}
            <div className="relative mt-20">
              <button
                type="button"
                onClick={() =>
                  handleStartStopRecording(isRecording ? 'stop' : 'start')
                }
                className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-[0_0_0_20px_rgba(239,68,68,0.15),0_0_60px_rgba(239,68,68,0.3)]'
                    : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-[0_0_0_20px_rgba(37,99,235,0.15),0_0_60px_rgba(37,99,235,0.3)]'
                }`}
              >
                {/* Hiệu ứng glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                <span className="absolute inset-0 rounded-full border-2 border-white/30" />
                
                {/* Text trong vòng tròn */}
                <div className="text-center z-10">
                  <p className="text-white font-semibold text-lg mb-1">
                    {isRecording ? 'Listening...' : isSpeaking ? 'AI Speaking' : 'Talk to interrupt'}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isRecording ? 'bg-red-200 animate-pulse' : isSpeaking ? 'bg-blue-200 animate-pulse' : 'bg-white/60'
                      }`}
                    />
                    <span className="text-white/80 text-xs">
                      {isRecording ? 'Recording' : isSpeaking ? 'Speaking' : 'Ready'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Input Area ở dưới cùng */}
          <div className="px-4 pb-6 pt-4 border-t border-slate-200 bg-white">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) {
                        handleSend();
                      }
                    }
                  }}
                  placeholder="Send a message to start the conversation"
                  rows={2}
                  className="flex-1 pl-4 pr-20 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed text-sm"
                  style={{ maxHeight: '120px' }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-2">
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex items-center gap-1"
                  >
                    <Send size={18} />
                    <span className="text-xs font-medium hidden sm:inline">Send</span>
                  </button>
                </div>
              </div>
              
              {/* End call button */}
              <button
                onClick={() => {
                  if (isRecording) {
                    handleStartStopRecording('stop');
                  }
                  setMode('text');
                }}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
              >
                End call
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Area (chỉ dùng cho Text mode) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-full flex-shrink-0 flex items-center justify-center mt-1">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area cho Text mode */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Ctrl+Enter hoặc Shift+Enter sẽ xuống dòng bình thường
                }}
                placeholder="Hỏi về Writing, Speaking, hoặc ngữ pháp..."
                rows={2}
                className="flex-1 pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none leading-relaxed"
                style={{ maxHeight: '160px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Sidebar: Lịch sử trò chuyện - chỉ hiển thị ở voice mode */}
      {mode === 'voice' && (
        <div className="w-80 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">Lịch sử trò chuyện</h3>
            <p className="text-xs text-slate-500 mt-1">Những gì bạn và AI đã nói</p>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages
              .filter(m => m.id !== 'welcome' && !m.id.startsWith('voice-welcome'))
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {msg.role === 'user' ? 'B' : 'AI'}
                    </div>
                    <span className="text-xs font-medium text-slate-600">
                      {msg.role === 'user' ? 'Bạn' : 'AI Tutor'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pl-8">
                    {msg.text}
                  </p>
                </div>
              ))}
            {messages.filter(m => m.id !== 'welcome' && !m.id.startsWith('voice-welcome')).length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Chưa có lịch sử trò chuyện
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
