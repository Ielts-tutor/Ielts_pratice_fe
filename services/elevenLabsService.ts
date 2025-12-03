/**
 * ElevenLabs Text-to-Speech Service
 * Sử dụng backend API để gọi ElevenLabs (API key được bảo mật ở backend)
 */

// Backend URL - lấy từ environment variable VITE_BACKEND_URL
// Fallback: nếu không có, dùng backend URL mặc định
const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  
  // Nếu có env variable và không rỗng, dùng nó
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  
  // Fallback dựa trên môi trường
  if (import.meta.env.PROD) {
    return 'https://ielts-practice-be.onrender.com';
  }
  
  return 'http://localhost:4000';
};

const SPEAKING_BACKEND_URL = getBackendUrl();

// Log để debug (cả dev và production)
console.log('[elevenLabsService] Backend URL:', SPEAKING_BACKEND_URL, {
  hasEnvVar: !!import.meta.env.VITE_BACKEND_URL,
  envValue: import.meta.env.VITE_BACKEND_URL,
  isProd: import.meta.env.PROD,
});

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
    let errorDetail: any = null;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.detail?.message || errorMessage;
      errorDetail = errorJson.detail;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    // Tạo error object với thông tin chi tiết
    const error = new Error(`ElevenLabs API error: Status code: ${response.status}\nBody: ${errorText}`) as any;
    error.status = response.status;
    error.details = errorDetail;
    error.code = errorDetail?.status === 'detected_unusual_activity' ? 'ELEVENLABS_AUTH_ERROR' : 'ELEVENLABS_API_ERROR';
    
    // Chỉ log chi tiết nếu không phải là abuse detection (401)
    // Để giảm log spam cho các lỗi expected
    if (response.status === 401 && errorDetail?.status === 'detected_unusual_activity') {
      console.warn('[ElevenLabs] API Error (401 - Unusual activity detected, will fallback to browser TTS):', {
        status: response.status,
        code: error.code,
      });
    } else {
      console.error('[ElevenLabs] API Error:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        details: errorDetail,
      });
    }
    
    throw error;
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
      currentAudioElement.src = '';
      currentAudioElement.load(); // Clear buffer
      if (currentAudioElement.src) {
        URL.revokeObjectURL(currentAudioElement.src);
      }
      currentAudioElement = null;
    }
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioElement = audio;
    
    // Đảm bảo audio đã load đầy đủ trước khi phát để tránh mất chữ đầu
    audio.preload = 'auto';
    
    let isPlaying = false;
    let cleanupDone = false;
    let playTimeout: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (playTimeout) {
        clearTimeout(playTimeout);
        playTimeout = null;
      }
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('progress', handleProgress);
      if (currentAudioElement === audio) {
        currentAudioElement = null;
      }
      URL.revokeObjectURL(audioUrl);
    };
    
    // Kiểm tra xem buffer đã đủ chưa
    const checkBufferReady = (): boolean => {
      try {
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const duration = audio.duration || 0;
          // Đảm bảo có ít nhất 0.5 giây buffer hoặc toàn bộ audio đã load
          return bufferedEnd >= Math.min(0.5, duration) || (duration > 0 && bufferedEnd >= duration * 0.1);
        }
      } catch (e) {
        // Ignore errors
      }
      return false;
    };
    
    const startPlayback = () => {
      if (isPlaying) return;
      
      // Kiểm tra lại buffer trước khi play
      if (!checkBufferReady() && audio.readyState < 3) {
        // Chưa đủ buffer, đợi thêm
        playTimeout = setTimeout(() => {
          if (!isPlaying) {
            startPlayback();
          }
        }, 100);
        return;
      }
      
      isPlaying = true;
      
      // Đợi thêm một chút để đảm bảo buffer hoàn toàn sẵn sàng
      playTimeout = setTimeout(() => {
        audio.play().then(() => {
          // Đảm bảo audio thực sự đang phát
          if (audio.paused) {
            audio.play().catch((err) => {
              cleanup();
              reject(err);
            });
          }
        }).catch((err) => {
          cleanup();
          reject(err);
        });
      }, 150); // Tăng delay lên 150ms để đảm bảo buffer đầy đủ
    };
    
    // Đợi audio sẵn sàng (canplaythrough) trước khi phát - đây là event tốt nhất
    const handleCanPlayThrough = () => {
      if (!isPlaying) {
        // Đợi thêm một chút để buffer hoàn toàn sẵn sàng
        playTimeout = setTimeout(() => {
          if (!isPlaying) {
            // Remove event listeners trước khi play
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadeddata', handleLoadedData);
            audio.removeEventListener('progress', handleProgress);
            startPlayback();
          }
        }, 150);
      }
    };
    
    // Fallback: nếu canplaythrough không fire, đợi canplay
    const handleCanPlay = () => {
      if (!isPlaying && audio.readyState >= 3) { // HAVE_FUTURE_DATA
        playTimeout = setTimeout(() => {
          if (!isPlaying) {
            // Remove event listeners trước khi play
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadeddata', handleLoadedData);
            audio.removeEventListener('progress', handleProgress);
            startPlayback();
          }
        }, 200);
      }
    };
    
    // Fallback: nếu canplay không fire, đợi loadeddata
    const handleLoadedData = () => {
      if (!isPlaying && audio.readyState >= 2) { // HAVE_CURRENT_DATA
        playTimeout = setTimeout(() => {
          if (!isPlaying) {
            // Remove event listeners trước khi play
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadeddata', handleLoadedData);
            audio.removeEventListener('progress', handleProgress);
            startPlayback();
          }
        }, 250); // Tăng delay cho loadeddata
      }
    };
    
    // Kiểm tra progress để đảm bảo buffer đang load
    const handleProgress = () => {
      if (!isPlaying && checkBufferReady() && audio.readyState >= 3) {
        playTimeout = setTimeout(() => {
          if (!isPlaying) {
            // Remove event listeners trước khi play
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('loadeddata', handleLoadedData);
            audio.removeEventListener('progress', handleProgress);
            startPlayback();
          }
        }, 150);
      }
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    audio.addEventListener('loadeddata', handleLoadedData, { once: true });
    audio.addEventListener('progress', handleProgress);
    
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
    
    // Timeout fallback: nếu quá lâu không load được (3 giây)
    setTimeout(() => {
      if (!isPlaying) {
        // Remove event listeners
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('progress', handleProgress);
        
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
          startPlayback();
        } else {
          cleanup();
          reject(new Error('Audio loading timeout'));
        }
      }
    }, 3000);
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

