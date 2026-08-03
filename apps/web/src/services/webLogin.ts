import axios from "axios";

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

// Request logging
api.interceptors.request.use((config) => {
  console.log(
    "📤",
    config.method?.toUpperCase(),
    `${config.baseURL}${config.url}`
  );
  return config;
});

// Response logging
api.interceptors.response.use(
  (response) => {
    console.log(
      "📥",
      response.status,
      response.config.url,
      response.data
    );
    return response;
  },
  (error) => {
    console.error("❌ Axios Error");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("URL:", error.config?.baseURL + error.config?.url);
    console.error("Response:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Request:", error.request);

    return Promise.reject(error);
  }
);

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

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export const generateQR = async (): Promise<QRResponse> => {
  const res = await api.get("/web/login/qr");

  if (!res.data?.data) {
    throw new Error("Invalid QR response from server.");
  }

  console.log("✅ QR Generated", res.data.data);

  return res.data.data;
};

export const getStatus = async (
  sessionId: string
): Promise<StatusResponse> => {
  const res = await api.get("/web/login/status", {
    params: {
      session_id: sessionId,
    },
  });

  if (!res.data?.data) {
    throw new Error("Invalid status response.");
  }

  return res.data.data;
};

export const confirmPairing = async (
  sessionId: string
): Promise<TokenPair> => {
  const res = await api.post("/web/login/confirm", {
    session_id: sessionId,
  });

  if (!res.data?.data) {
    throw new Error("Invalid pairing response.");
  }

  return res.data.data;
};

export default api;