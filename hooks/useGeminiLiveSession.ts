import { useState, useRef, useCallback, useEffect } from 'react';

interface LiveSessionConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
}

interface LiveMessage {
  serverContent?: {
    turnComplete?: boolean;
  };
  data?: string; // base64 audio data
  text?: string; // transcript text
}

export const useGeminiLiveSession = (config: LiveSessionConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onTranscriptCallbackRef = useRef<((text: string) => void) | null>(null);
  const onAudioStartCallbackRef = useRef<(() => void) | null>(null);
  const onAudioEndCallbackRef = useRef<(() => void) | null>(null);

  // Initialize AudioContext for playback
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
    }
  }, []);

  // Play audio chunks from queue
  const playAudioQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    
    const playNext = () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsSpeaking(false);
        if (onAudioEndCallbackRef.current) {
          onAudioEndCallbackRef.current();
        }
        return;
      }
      
      const chunk = audioQueueRef.current.shift();
      if (!chunk || !audioContextRef.current) {
        playNext();
        return;
      }
      
      try {
        const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < chunk.length; i++) {
          channelData[i] = chunk[i] / 32768; // Convert Int16 to float32
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = playNext;
        source.start(0);
      } catch (err) {
        console.error('Error playing audio chunk:', err);
        playNext();
      }
    };
    
    if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      setIsSpeaking(true);
      if (onAudioStartCallbackRef.current) {
        onAudioStartCallbackRef.current();
      }
      playNext();
    }
  }, []);

  // Connect to Gemini Live API
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      initAudioContext();
      
      const model = config.model || 'models/gemini-2.0-flash-exp';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Live API] ✅ WebSocket Connected Successfully');
        setIsConnected(true);
        setError(null);
        
        // Send initial setup message
        const setupMessage = {
          setup: {
            model: model,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: 'Aoede'
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: config.systemInstruction || 'You are an IELTS Speaking Tutor. You talk like in a normal conversation, give concise answers, and correct pronunciation and grammar when needed. Speak naturally and conversationally.'
              }]
            }
          }
        };
        
        console.log('[Live API] Sending setup message:', JSON.stringify(setupMessage, null, 2));
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message: LiveMessage = JSON.parse(event.data);
          console.log('[Live API] 📨 Received message:', {
            hasAudio: !!message.data,
            hasText: !!message.text,
            turnComplete: message.serverContent?.turnComplete,
            messageKeys: Object.keys(message)
          });
          
          // Handle audio data
          if (message.data) {
            try {
              console.log('[Live API] 🔊 Processing audio chunk, size:', message.data.length);
              // Decode base64 to binary in browser
              const binaryString = atob(message.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const intArray = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Int16Array.BYTES_PER_ELEMENT);
              audioQueueRef.current.push(intArray);
              console.log('[Live API] ✅ Audio chunk added to queue, total chunks:', audioQueueRef.current.length);
              playAudioQueue();
            } catch (err) {
              console.error('[Live API] ❌ Error decoding audio:', err);
            }
          }
          
          // Handle text transcript
          if (message.text && onTranscriptCallbackRef.current) {
            console.log('[Live API] 📝 Transcript:', message.text);
            onTranscriptCallbackRef.current(message.text);
          }
          
          // Handle turn complete
          if (message.serverContent?.turnComplete) {
            console.log('[Live API] ✅ Turn complete');
          }
          
          // Log error messages from server
          if ((message as any).error) {
            console.error('[Live API] ❌ Server error:', (message as any).error);
            setError((message as any).error.message || 'Server error');
          }
        } catch (err) {
          console.error('[Live API] ❌ Error parsing message:', err, 'Raw data:', event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('[Live API] ❌ WebSocket error:', err);
        setError('Connection error - Check API key and network connection');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[Live API] 🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        
        // Common error codes:
        // 1006: Abnormal closure (often means API key invalid or network issue)
        // 1002: Protocol error
        // 1003: Unsupported data
        // 1011: Internal error (often quota exceeded)
        if (event.code === 1011 || (event.reason && event.reason.includes('quota'))) {
          console.error('[Live API] ❌ QUOTA EXCEEDED');
          console.error('Reason:', event.reason);
          console.error('💡 Solutions:');
          console.error('  1. Wait for quota to reset (usually daily)');
          console.error('  2. Upgrade your Google Cloud billing plan');
          console.error('  3. Use a different API key');
          console.error('  4. The app will fallback to REST API + Text-to-Speech');
          setError('Quota exceeded - Falling back to standard chat mode. Please check your Google Cloud quota or wait for reset.');
        } else if (event.code === 1006) {
          console.error('[Live API] ❌ Connection closed abnormally. Possible causes:');
          console.error('  1. Invalid API key (key may not have Live API access)');
          console.error('  2. Network connectivity issue');
          console.error('  3. API key quota exceeded');
          setError('Connection failed - API key may not have Live API access. Please check your key.');
        }
        
        setIsConnected(false);
      };
    } catch (err: any) {
      console.error('[Live API] ❌ Connection error:', err);
      setError(err.message || 'Failed to connect - Check API key');
      setIsConnected(false);
    }
  }, [config, initAudioContext, playAudioQueue]);

  // Start recording microphone and streaming to Live API
  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect();
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      micStreamRef.current = stream;
      
      // Initialize AudioContext for recording
      if (!audioContextRef.current) {
        initAudioContext();
      }
      
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const targetSampleRate = 16000;
      
      // Create a script processor to capture PCM audio
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Resample to 16kHz if needed
        const sourceSampleRate = audioContextRef.current!.sampleRate;
        const ratio = sourceSampleRate / targetSampleRate;
        const newLength = Math.round(inputData.length / ratio);
        const resampled = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
          const index = Math.floor(i * ratio);
          resampled[i] = inputData[Math.min(index, inputData.length - 1)];
        }
        
        // Convert to Int16 PCM
        const pcmData = new Int16Array(newLength);
        for (let i = 0; i < newLength; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64 (browser-compatible)
        const bytes = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        // Send to Live API
        wsRef.current?.send(JSON.stringify({
          realtime_input: {
            media_chunks: [{
              mime_type: 'audio/pcm;rate=16000',
              data: base64
            }]
          }
        }));
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);
      
      // Store processor reference for cleanup
      (mediaRecorderRef as any).current = processor;
    } catch (err: any) {
      console.error('[Live API] Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  }, [connect, initAudioContext]);

  // Stop recording
  const stopRecording = useCallback(() => {
    const processor = mediaRecorderRef.current as any;
    if (processor && processor.disconnect) {
      processor.disconnect();
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    const processor = mediaRecorderRef.current as any;
    if (processor && processor.disconnect) {
      processor.disconnect();
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    isSpeaking,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    onTranscript: useCallback((callback: (text: string) => void) => {
      onTranscriptCallbackRef.current = callback;
    }, []),
    onAudioStart: useCallback((callback: () => void) => {
      onAudioStartCallbackRef.current = callback;
    }, []),
    onAudioEnd: useCallback((callback: () => void) => {
      onAudioEndCallbackRef.current = callback;
    }, [])
  };
};

