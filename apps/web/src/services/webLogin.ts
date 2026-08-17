import axios, { AxiosRequestConfig } from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not defined. Check your .env file and restart Next.js."
  );
}

// Remove trailing slash and ensure /api/v1 exists
const baseURL =
  API_BASE.replace(/\/$/, "") +
  (API_BASE.includes("/v1") ? "" : "/v1");

console.log("🌍 API_BASE:", API_BASE);
console.log("🌍 baseURL :", baseURL);

const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// -------- NEW: Request interceptor to attach headers --------
api.interceptors.request.use((config) => {
  // Get tokens & IDs from localStorage
  const token = localStorage.getItem('access_token');
  const deviceId = localStorage.getItem('device_id');
  const companyId = localStorage.getItem('company_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (deviceId) {
    config.headers['X-Device-ID'] = deviceId;
  }
  if (companyId) {
    config.headers['X-Company-ID'] = companyId;
  }

  // Log the full URL and headers (mask token)
  let fullUrl = `${config.baseURL}${config.url}`;
  if (config.params) {
    const params = new URLSearchParams(config.params).toString();
    fullUrl += `?${params}`;
  }
  const logHeaders = { ...config.headers };
  if (logHeaders.Authorization) {
    logHeaders.Authorization = 'Bearer [REDACTED]';
  }
  console.log(
    "📤",
    config.method?.toUpperCase(),
    fullUrl,
    "Headers:",
    logHeaders
  );

  return config;
}, (error) => Promise.reject(error));

// --- Response interceptor (logs success & error with full data) ---
api.interceptors.response.use(
  (response) => {
    console.log("📥", response.status, response.config.url);
    console.log("📦 Full response data:", response.data);
    return response;
  },
  (error) => {
    console.error("❌ Axios Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    
    if (error.config) {
      console.error("Request Config:", error.config);
      console.error("URL:", error.config.baseURL + error.config.url);
      if (error.config.params) {
        console.error("Params:", error.config.params);
      }
    }
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received. Request object:", error.request);
      if (error.request instanceof XMLHttpRequest) {
        console.error("XHR readyState:", error.request.readyState);
        console.error("XHR status:", error.request.status);
        console.error("XHR responseText:", error.request.responseText);
      }
    } else {
      console.error("Error setup:", error.message);
    }
    
    return Promise.reject(error);
  }
);

// --- Interfaces ---
export interface QRResponse {
  session_id: string;
  qr_code: string;
  expires_in: number;
  status_url: string;
}

export interface StatusResponse {
  session_id: string;
  status: "pending" | "scanned" | "paired" | "expired";
  user_id?: string;
  phone_number?: string;
  session_type?: string;
  role?: string;
  expires_at: string;
}

// Extended TokenPair with common extra fields (optional)
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id?: string;
  company_id?: string;
  role?: string;
  device_id?: string;
  company_context?: any;
  [key: string]: any;
}

// --- API Functions ---
export const generateQR = async (): Promise<QRResponse> => {
  console.log("🚀 [generateQR] Starting request to /web/login/qr");
  console.log(`   Full URL: ${api.defaults.baseURL}/web/login/qr`);
  
  try {
    const res = await api.get("/web/login/qr");

    if (!res.data?.data) {
      throw new Error("Invalid QR response from server.");
    }

    console.log("✅ QR Generated successfully");
    console.log("   Session ID:", res.data.data.session_id);
    console.log("   QR code (base64):", res.data.data.qr_code.substring(0, 50) + "...");
    console.log("   Expires in:", res.data.data.expires_in, "seconds");
    console.log("   Status URL:", res.data.data.status_url);

    return res.data.data;
  } catch (error: any) {
    console.error("❌ [generateQR] Request failed");
    console.error("   Error message:", error.message);
    throw error;
  }
};

export const getStatus = async (
  sessionId: string
): Promise<StatusResponse> => {
  console.log(`📡 [getStatus] Checking status for session: ${sessionId}`);
  const res = await api.get("/web/login/status", {
    params: {
      session_id: sessionId,
    },
  });

  if (!res.data?.data) {
    throw new Error("Invalid status response.");
  }

  console.log("📊 Status response:", res.data.data);
  return res.data.data;
};

export const confirmPairing = async (
  sessionId: string
): Promise<TokenPair> => {
  console.log(`🔐 [confirmPairing] Confirming session: ${sessionId}`);
  const res = await api.post("/web/login/confirm", {
    session_id: sessionId,
  });

  if (!res.data?.data) {
    throw new Error("Invalid pairing response.");
  }

  // Log the ENTIRE response – this shows ALL fields sent by the backend
  console.log("✅ Pairing confirmed!");
  console.log("📦 Full server response:", res.data);
  console.log("🔑 Token data (res.data.data):", res.data.data);

  const data = res.data.data;
  console.log("   access_token:", data.access_token);
  console.log("   refresh_token:", data.refresh_token);
  console.log("   token_type:", data.token_type);
  console.log("   expires_in:", data.expires_in);
  if (data.user_id) console.log("   user_id:", data.user_id);
  if (data.company_id) console.log("   company_id:", data.company_id);
  if (data.role) console.log("   role:", data.role);
  if (data.device_id) console.log("   device_id:", data.device_id);
  if (data.company_context) console.log("   company_context:", data.company_context);
  
  const extraKeys = Object.keys(data).filter(
    key => !["access_token", "refresh_token", "token_type", "expires_in", "user_id", "company_id", "role", "device_id", "company_context"].includes(key)
  );
  if (extraKeys.length > 0) {
    console.log("   Extra fields:", extraKeys.map(k => `${k}: ${data[k]}`).join(", "));
  }

  return data;
};

export default api;