/**
 * Test if an API key has access to Gemini Live API
 * This function attempts to connect to Live API WebSocket and checks the response
 */
export const testLiveApiKey = async (apiKey: string): Promise<{
  valid: boolean;
  hasLiveAccess: boolean;
  error?: string;
  details?: any;
}> => {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      hasLiveAccess: false,
      error: 'API key is empty'
    };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        valid: false,
        hasLiveAccess: false,
        error: 'Connection timeout (10s) - Key may not have Live API access'
      });
    }, 10000); // 10 second timeout

    const model = 'models/gemini-2.0-flash-exp';
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    const ws = new WebSocket(wsUrl);
    let setupSent = false;

    ws.onopen = () => {
      console.log('[Test] ✅ WebSocket connected');
      
      // Send setup message
      const setupMessage = {
        setup: {
          model: model,
          generation_config: {
            response_modalities: ['AUDIO']
          },
          system_instruction: {
            parts: [{
              text: 'Say hello'
            }]
          }
        }
      };
      
      ws.send(JSON.stringify(setupMessage));
      setupSent = true;
      console.log('[Test] Setup message sent');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Test] 📨 Received:', Object.keys(message));
        
        // If we get any response, the key is valid
        clearTimeout(timeout);
        ws.close();
        
        // Check for error in response
        if ((message as any).error) {
          resolve({
            valid: true,
            hasLiveAccess: false,
            error: (message as any).error.message || 'API returned error',
            details: message
          });
        } else {
          resolve({
            valid: true,
            hasLiveAccess: true,
            details: message
          });
        }
      } catch (err: any) {
        console.error('[Test] Error parsing:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[Test] ❌ WebSocket error:', err);
      clearTimeout(timeout);
      ws.close();
      resolve({
        valid: false,
        hasLiveAccess: false,
        error: 'WebSocket connection failed - Check API key format'
      });
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      
      if (!setupSent) {
        // Connection closed before we could send setup
        resolve({
          valid: false,
          hasLiveAccess: false,
          error: `Connection closed (code: ${event.code}) - Key may be invalid or not have Live API access`
        });
      } else if (event.code === 1006) {
        resolve({
          valid: false,
          hasLiveAccess: false,
          error: 'Connection closed abnormally - API key likely does not have Live API access'
        });
      }
    };
  });
};

