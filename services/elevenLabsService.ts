/**
 * ElevenLabs Text-to-Speech Service
 * Sử dụng backend API để gọi ElevenLabs (API key được bảo mật ở backend)
 */

// Backend URL cho Speaking API
const SPEAKING_BACKEND_URL =
  import.meta.env.VITE_SPEAKING_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '');

// Voice ID mặc định - có thể thay đổi theo nhu cầu
// Các voice phổ biến: 21m00Tcm4TlvDq8ikWAM (Rachel), pNInz6obpgDQGcFmaJgB (Adam), etc.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - giọng nữ tự nhiên

interface ElevenLabsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

/**
 * Chuyển đổi text thành audio sử dụng backend API (gọi ElevenLabs)
 * @param text - Text cần chuyển đổi thành giọng nói
 * @param options - Các tùy chọn cho voice
 * @returns Promise<Blob> - Audio blob để phát
 */
export const textToSpeechElevenLabs = async (
  text: string,
  options: ElevenLabsOptions = {}
): Promise<Blob> => {
  const {
    voiceId = DEFAULT_VOICE_ID,
    modelId = 'eleven_multilingual_v2', // Model mới theo tài liệu chính thức
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    useSpeakerBoost = true,
  } = options;

  const response = await fetch(`${SPEAKING_BACKEND_URL}/api/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
      modelId,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    console.error('[ElevenLabs] API Error:', errorMessage);
    throw new Error(`ElevenLabs API error: ${errorMessage}`);
  }

  return await response.blob();
};

// Track audio element hiện tại để có thể cancel khi cần
let currentAudioElement: HTMLAudioElement | null = null;

/**
 * Phát audio từ blob
 * @param audioBlob - Audio blob từ ElevenLabs
 * @returns Promise<void> - Promise resolve khi audio phát xong
 */
export const playAudioBlob = (audioBlob: Blob): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Cancel audio cũ nếu đang phát
    if (currentAudioElement) {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      if (currentAudioElement.src) {
        URL.revokeObjectURL(currentAudioElement.src);
      }
    }
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioElement = audio;
    
    // Đảm bảo audio đã load đầy đủ trước khi phát để tránh mất chữ đầu
    audio.preload = 'auto';
    
    let isPlaying = false;
    let cleanupDone = false;
    
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      if (currentAudioElement === audio) {
        currentAudioElement = null;
      }
      URL.revokeObjectURL(audioUrl);
    };
    
    const startPlayback = () => {
      if (isPlaying) return;
      isPlaying = true;
      
      // Đợi một chút để đảm bảo buffer đầy đủ
      setTimeout(() => {
        audio.play().catch((err) => {
          cleanup();
          reject(err);
        });
      }, 50);
    };
    
    // Đợi audio sẵn sàng (canplaythrough) trước khi phát - đây là event tốt nhất
    const handleCanPlayThrough = () => {
      cleanup();
      startPlayback();
    };
    
    // Fallback: nếu canplaythrough không fire, đợi canplay
    const handleCanPlay = () => {
      if (!isPlaying && audio.readyState >= 3) { // HAVE_FUTURE_DATA
        cleanup();
        startPlayback();
      }
    };
    
    // Fallback: nếu canplay không fire, đợi loadeddata
    const handleLoadedData = () => {
      if (!isPlaying && audio.readyState >= 2) { // HAVE_CURRENT_DATA
        cleanup();
        // Đợi thêm một chút để buffer đầy đủ
        setTimeout(() => {
          startPlayback();
        }, 100);
      }
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('loadeddata', handleLoadedData, { once: true });
    
    // Load audio
    audio.load();
    
    audio.onended = () => {
      cleanup();
      resolve();
    };
    
    audio.onerror = (error) => {
      cleanup();
      reject(error);
    };
    
    // Timeout fallback: nếu quá lâu không load được (2 giây)
    setTimeout(() => {
      if (!isPlaying && audio.readyState >= 2) { // HAVE_CURRENT_DATA
        cleanup();
        startPlayback();
      } else if (audio.readyState < 2) {
        cleanup();
        reject(new Error('Audio loading timeout'));
      }
    }, 2000);
  });
};

/**
 * Text-to-Speech với ElevenLabs và phát audio
 * @param text - Text cần chuyển đổi
 * @param options - Các tùy chọn cho voice
 * @returns Promise<void>
 */
export const speakWithElevenLabs = async (
  text: string,
  options: ElevenLabsOptions = {}
): Promise<void> => {
  try {
    const audioBlob = await textToSpeechElevenLabs(text, options);
    await playAudioBlob(audioBlob);
  } catch (error) {
    console.error('[ElevenLabs] ❌ Error:', error);
    throw error;
  }
};

