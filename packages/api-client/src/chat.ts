import axios, { AxiosInstance, AxiosError } from 'axios';
import { ChatRequest, ChatResponse } from '@b2b/shared-types';

// ----- Base URL with explicit fallback for development -----
// IMPORTANT: In production, set EXPO_PUBLIC_CHATBOT_API_URL in .env or eas.json
const CHATBOT_BASE_URL =
  process.env.EXPO_PUBLIC_CHATBOT_API_URL ||   // mobile (Expo)
  process.env.NEXT_PUBLIC_CHATBOT_API_URL ||   // web (Next.js)
  process.env.CHATBOT_API_URL ||               // generic fallback
  'https://agrologic-roger-frostily.ngrok-free.dev'; // 👈 hardcoded fallback for dev

console.log('[Chat API] 🔍 CHATBOT_BASE_URL =', CHATBOT_BASE_URL);

// Warn if using the hardcoded fallback (means env var is missing)
if (CHATBOT_BASE_URL === 'https://agrologic-roger-frostily.ngrok-free.dev') {
  console.warn('[Chat API] ⚠️ Using hardcoded fallback URL - set EXPO_PUBLIC_CHATBOT_API_URL in .env');
}

const chatbotClient: AxiosInstance = axios.create({
  baseURL: CHATBOT_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
chatbotClient.interceptors.request.use(
  (config) => {
    console.log('[Chat API] 📤 Request:', {
      url: (config.baseURL ?? '') + (config.url ?? ''),
      method: config.method,
      headers: {
        ...config.headers,
        Authorization: config.headers?.Authorization ? 'Bearer [REDACTED]' : undefined,
        'X-Device-ID': config.headers?.['X-Device-ID'],
        'X-Company-ID': config.headers?.['X-Company-ID'],
        'ngrok-skip-browser-warning': config.headers?.['ngrok-skip-browser-warning'],
      },
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('[Chat API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
chatbotClient.interceptors.response.use(
  (response) => {
    console.log('[Chat API] 📥 Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('[Chat API] ❌ Response error:', {
      message: error.message,
      code: error.code,
      config: {
        url: (error.config?.baseURL ?? '') + (error.config?.url ?? ''),
        method: error.config?.method,
        headers: {
          ...error.config?.headers,
          Authorization: error.config?.headers?.Authorization ? 'Bearer [REDACTED]' : undefined,
        },
      },
      response: error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
          }
        : undefined,
      request: error.request ? { _hasRequest: true } : undefined,
    });
    return Promise.reject(error);
  }
);

/**
 * Send a message to the chatbot.
 */
export const sendChatMessage = async (
  message: string,
  accessToken: string,
  deviceId: string,
  companyId: string,
  args?: Record<string, any>,
  idempotencyKey?: string
): Promise<ChatResponse> => {
  if (!accessToken) {
    console.error('[Chat API] ❌ Missing accessToken');
    throw new Error('Missing authentication token');
  }

  console.log('[Chat API] 🚀 sendChatMessage called', {
    messageLength: message.length,
    deviceId,
    companyId,
    hasArgs: !!args,
    idempotencyKey,
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'X-Device-ID': deviceId,
    'X-Company-ID': companyId,
    'ngrok-skip-browser-warning': 'true', // bypass ngrok interstitial
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const payload: ChatRequest = { message };
  if (args) payload.arguments = args;

  const fullUrl = CHATBOT_BASE_URL + '/chat';
  console.log('[Chat API] 🌐 Full URL:', fullUrl);

  try {
    const response = await chatbotClient.post<ChatResponse>('/chat', payload, { headers });
    console.log('[Chat API] ✅ Request successful:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[Chat API] 💥 sendChatMessage caught error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw error;
  }
};