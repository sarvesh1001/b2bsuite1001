# Combined Source Code

Total Files: 40

# File: clean.py

```python
#!/usr/bin/env python3

from pathlib import Path
import mimetypes

ROOT = Path(".")
OUTPUT_FILE = "combined_code.md"

# Directories to ignore
IGNORE_DIRS = {
    ".git",
    ".github",
    ".next",
    ".turbo",
    ".expo",
    ".expo-shared",
    ".idea",
    ".vscode",
    ".cache",
    "__pycache__",
    ".pytest_cache",

    "node_modules",
    "dist",
    "coverage",
    "vendor",
    "Pods",

    # Build folders
    "build",
    ".gradle",
    ".cxx",
    ".kotlin",

    # Generated
    "generated",
    "tmp",
    "intermediates",
    "outputs",
    "reports",
    "executionHistory",
    "expanded",
    "fileHashes",
    "fileChanges",
    "checksums",
}

# Ignore exact filenames
IGNORE_FILENAMES = {
    ".DS_Store",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".prettierignore",
    ".eslintignore",
    ".npmrc",

    ".env",
    ".env.local",
    ".env.production",
    ".env.development",

    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "Cargo.lock",
    "composer.lock",

    "debug.keystore",
}

# Ignore docs
IGNORE_PREFIXES = (
    "README",
    "LICENSE",
    "CHANGELOG",
    "CONTRIBUTING",
    "CODE_OF_CONDUCT",
)

# Allowed source extensions
CODE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",

    ".go",
    ".py",
    ".java",
    ".kt",
    ".kts",
    ".swift",

    ".xml",
    ".gradle",
    ".properties",

    ".css",
    ".scss",
    ".html",

    ".json",
    ".yaml",
    ".yml",

    ".sql",
    ".graphql",
    ".proto",

    ".sh",
    ".md",
}

# Important config files
ALLOWED_FILES = {
    "package.json",
    "tsconfig.json",
    "turbo.json",
    "pnpm-workspace.yaml",
    "pnpm-workspace.yml",

    "app.json",
    "eas.json",

    "metro.config.js",
    "metro.config.cjs",

    "babel.config.js",
    "babel.config.cjs",

    "next.config.js",
    "next.config.ts",

    "vite.config.js",
    "vite.config.ts",

    "jest.config.js",
    "jest.config.ts",

    "eslint.config.js",
    "eslint.config.mjs",

    "tailwind.config.js",
    "tailwind.config.ts",

    "gradle.properties",
    "settings.gradle",
    "build.gradle",
    "gradle-wrapper.properties",

    "AndroidManifest.xml",
}

LANGUAGE_MAP = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".go": "go",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",

    ".xml": "xml",
    ".gradle": "gradle",
    ".properties": "properties",

    ".css": "css",
    ".scss": "scss",
    ".html": "html",

    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",

    ".sql": "sql",
    ".graphql": "graphql",
    ".proto": "proto",

    ".sh": "bash",
    ".md": "markdown",
}


def is_binary(path: Path):
    mime, _ = mimetypes.guess_type(path)

    if mime and not mime.startswith("text"):
        return True

    try:
        with open(path, "rb") as f:
            return b"\0" in f.read(2048)
    except Exception:
        return True


def should_skip(path: Path):
    # Ignore directories
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True

    # Ignore filenames
    if path.name in IGNORE_FILENAMES:
        return True

    # Ignore docs
    if path.name.startswith(IGNORE_PREFIXES):
        return True

    # Always allow important config
    if path.name in ALLOWED_FILES:
        return False

    # Only keep desired source files
    return path.suffix.lower() not in CODE_EXTENSIONS


files = []

print("Scanning project...")

for file in ROOT.rglob("*"):
    if not file.is_file():
        continue

    if should_skip(file):
        continue

    if is_binary(file):
        continue

    files.append(file)

files.sort()

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("# Combined Source Code\n\n")
    out.write(f"Total Files: {len(files)}\n\n")

    for file in files:
        rel = file.relative_to(ROOT)
        lang = LANGUAGE_MAP.get(file.suffix.lower(), "")

        print(rel)

        out.write(f"# File: {rel}\n\n")
        out.write(f"```{lang}\n")

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file.read_text(encoding="latin-1")

        out.write(text)

        if not text.endswith("\n"):
            out.write("\n")

        out.write("```\n\n")

print(f"\n✅ Done!")
print(f"Files included : {len(files)}")
print(f"Output         : {OUTPUT_FILE}")
```

# File: combined_code.md

```markdown

```

# File: next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // swcMinify: true,
  };
  
  module.exports = nextConfig;
```

# File: postcss.config.js

```javascript
module.exports = {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
```

# File: src/components/AuthInitializer.tsx

```tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  setRefreshTokenFunction,
  setUnauthorizedCallback,
} from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';
import { refreshUserAccessToken } from '../services/auth';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const router = useRouter();
  const {
    isAuthenticated,
    refreshToken,
    updateTokens,
    clearSession,
    validateSession,
    logout,
  } = useUserAuthStore();

  const refreshTimerRef = useRef<number | null>(null);
  const hasRefreshedOnLaunch = useRef(false);

  // ---- 1. Define refresh function ----
  const doRefresh = useCallback(async (): Promise<{ accessToken: string; refreshToken: string }> => {
    console.log('[Auth] doRefresh() called');
    const rt = useUserAuthStore.getState().refreshToken;
    if (!rt) {
      console.error('[Auth] No refresh token');
      throw new Error('No refresh token');
    }
    try {
      const response = await refreshUserAccessToken(rt);
      const { access_token, refresh_token } = response.data;
      console.log('[Auth] New tokens received');
      updateTokens(access_token, refresh_token);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error: any) {
      console.error('[Auth] refreshUserAccessToken error:', error.message);
      throw error;
    }
  }, [updateTokens]);

  // ---- 2. Set refresh function for axios interceptor ----
  useEffect(() => {
    setRefreshTokenFunction(doRefresh);
    return () => setRefreshTokenFunction(null);
  }, [doRefresh]);

  // ---- 3. Set unauthorized callback ----
  useEffect(() => {
    const onUnauthorized = () => {
      console.warn('[Auth] Unauthorized callback triggered');
      clearSession();
      router.push('/web/login');
    };
    setUnauthorizedCallback(onUnauthorized);
    return () => setUnauthorizedCallback(null);
  }, [clearSession, router]);

  // ---- 4. Proactive refresh timer (every 27 seconds) ----
  useEffect(() => {
    const startTimer = () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = window.setInterval(() => {
        if (useUserAuthStore.getState().isAuthenticated) {
          console.log('[Auth] Timer tick - proactive refresh');
          doRefresh().catch((err) => {
            console.error('[Auth] Proactive refresh error:', err);
            if (err.response?.status === 401) {
              clearSession();
              router.push('/web/login');
            }
          });
        }
      }, 27000);
    };

    if (isAuthenticated) {
      startTimer();
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, doRefresh, clearSession, router]);

  // ---- 5. Proactive refresh on page load ----
  useEffect(() => {
    async function refreshOnLaunch() {
      if (hasRefreshedOnLaunch.current) return;
      hasRefreshedOnLaunch.current = true;

      const rt = useUserAuthStore.getState().refreshToken;
      if (!rt) {
        // No refresh token – ensure logged out
        logout();
        router.push('/web/login');
        return;
      }

      try {
        await doRefresh();
        console.log('[Auth] Proactive refresh succeeded on launch');
      } catch (error: any) {
        console.warn('[Auth] Proactive refresh failed on launch:', error);
        if (error.response?.status === 401) {
          clearSession();
          router.push('/web/login');
        }
      }
    }

    refreshOnLaunch();
  }, [doRefresh, clearSession, logout, router]);

  // ---- 6. Re‑validate when tab gains focus ----
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log('[Auth] Tab focused – validating session');
        validateSession().catch((err) =>
          console.error('[Auth] validateSession error:', err)
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, validateSession]);

  return <>{children}</>;
};
```

# File: src/components/LoginStatus.tsx

```tsx
import React from 'react';
import { StatusResponse } from '../services/webLogin';

interface Props {
  status: StatusResponse | null;
}

const LoginStatus: React.FC<Props> = ({ status }) => {
  if (!status) return <div className="text-gray-500 mt-4">Waiting for status...</div>;

  // 🎨 Brand colors: purple (#7B2FBE) and cyan (#00B4DB)
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'Scan the QR with the mobile app', color: 'text-purple-600', icon: '⏳' },
    scanned: { label: 'QR scanned! Waiting for confirmation...', color: 'text-cyan-600', icon: '✅' },
    paired: { label: 'Paired successfully!', color: 'text-green-600', icon: '🎉' },
    expired: { label: 'QR code expired. Please refresh.', color: 'text-red-600', icon: '⏰' },
  };

  const info = statusMap[status.status] || { label: 'Unknown status', color: 'text-gray-600', icon: '❓' };

  return (
    <div className={`mt-4 flex items-center justify-center space-x-2 ${info.color}`}>
      <span className="text-xl">{info.icon}</span>
      <span className="font-medium">{info.label}</span>
    </div>
  );
};

export default LoginStatus;
```

# File: src/components/QRCodeDisplay.tsx

```tsx
import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  qrData: string;     // base64-encoded JSON payload
  expiresIn: number;
}

const QRCodeDisplay: React.FC<Props> = ({ qrData, expiresIn }) => {
  // Decode base64 to get the actual JSON string (contains session_id, signature, etc.)
  const jsonString = atob(qrData);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
        <QRCodeCanvas value={jsonString} size={256} level="H" includeMargin />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        QR code expires in {Math.floor(expiresIn / 60)} minutes
      </p>
    </div>
  );
};

export default QRCodeDisplay;
```

# File: src/components/SelectModal.tsx

```tsx
import React from 'react';
import { FiX } from 'react-icons/fi';

interface SelectModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const SelectModal: React.FC<SelectModalProps> = ({ visible, onClose, title, children }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
};
```

# File: src/components/Switch.tsx

```tsx
import React from 'react';

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      onClick={() => onChange(!value)}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};
```

# File: src/components/UserAvatar.tsx

```tsx
import React from 'react';
import { useAvatar } from '../hooks/useAvatar';

interface UserAvatarProps {
  userId?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  loading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  username,
  fullName,
  avatarUrl: propAvatarUrl,
  size = 40,
  className = '',
  loading: propLoading = false,
}) => {
  // Use the hook to fetch avatar if userId is provided and no explicit avatarUrl
  const { avatarUrl: fetchedUrl, isLoading, error } = useAvatar(userId || '');

  const finalAvatarUrl = propAvatarUrl !== undefined ? propAvatarUrl : fetchedUrl;
  const isLoadingFinal = propLoading || isLoading;

  // Fallback initial
  const initial = (fullName || username || '?').charAt(0).toUpperCase();

  // Loading state
  if (isLoadingFinal) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600" />
      </div>
    );
  }

  // Image if URL exists
  if (finalAvatarUrl) {
    return (
      <img
        src={finalAvatarUrl}
        alt={fullName || username || 'avatar'}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => console.warn(`Failed to load avatar for user ${userId}`)}
      />
    );
  }

  // Fallback initials
  return (
    <div
      className={`flex items-center justify-center bg-gray-500 text-white font-bold ${className}`}
      style={{ width: size, height: size, borderRadius: size / 2, fontSize: size * 0.5 }}
    >
      {initial}
    </div>
  );
};
```

# File: src/components/WebLoginContainer.tsx

```tsx

```

# File: src/pages/_app.tsx

```tsx
// apps/web/src/pages/_app.tsx
import '../styles/globals.css';      // already there
import '../styles/css/qr-login.css';  // ✅ add
import '../styles/css/dashboard.css'; // ✅ add

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

# File: src/pages/_document.tsx

```tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

# File: src/pages/dashboard.tsx

```tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [userType, setUserType] = useState<string | null>(null);
  const [companyContext, setCompanyContext] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/web/login');
    }
    setUserType(localStorage.getItem('user_type') || 'user');
    const ctx = localStorage.getItem('company_context');
    if (ctx) {
      try { setCompanyContext(JSON.parse(ctx)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/web/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Prayantra Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome to Prayantra</h2>
          <p>User Type: {userType === 'admin' ? 'Administrator' : 'User'}</p>
        </div>

        {companyContext && userType === 'user' && (
          <div className="company-info">
            <h3>Company Information</h3>
            <div className="info-grid">
              {Object.entries(companyContext).map(([key, value]) => (
                <div key={key} className="info-item">
                  <label>{key.replace(/_/g, ' ').toUpperCase()}:</label>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <button className="action-button">View Profile</button>
            <button className="action-button">Settings</button>
            <button className="action-button">Help & Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

# File: src/pages/web/login.tsx

```tsx
import { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { generateQR, getStatus, confirmPairing, QRResponse, StatusResponse } from '../../services/webLogin';
import { useWebSocket } from '../../hooks/useWebSocket';
import QRCodeDisplay from '../../components/QRCodeDisplay';

const WebLoginPage: NextPage = () => {
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const sessionId = qrData?.session_id || null;
  const { messages } = useWebSocket(sessionId);

  // Generate QR on mount
  useEffect(() => {
    const fetchQR = async () => {
      setLoading(true);
      try {
        const data = await generateQR();
        setQrData(data);
        // initial status poll (or rely on WebSocket)
        const statusData = await getStatus(data.session_id);
        setStatus(statusData);
      } catch (err: any) {
        setError(err.message || 'Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, []);

  // Process WebSocket messages for status updates
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.type === 'status_update' && lastMsg.payload) {
      setStatus(lastMsg.payload);
    } else if (lastMsg.type === 'paired' && lastMsg.payload) {
      // Store tokens and redirect
      const tokens = lastMsg.payload;
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    }
  }, [messages]);

  const handleConfirm = async () => {
    if (!sessionId) return;
    setConfirming(true);
    try {
      const tokens = await confirmPairing(sessionId);
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const getStatusMessage = () => {
    if (!status) return 'Generating QR code...';
    switch (status.status) {
      case 'pending': return 'Scan the QR code with your mobile app';
      case 'scanned': return `Scanned by ${status.phone_number || 'user'}`;
      case 'paired':  return 'Paired successfully! Redirecting...';
      case 'expired': return 'QR code expired. Please refresh.';
      default: return 'Unknown status';
    }
  };

  // 🎨 Status colors – brand purple & cyan
  const getStatusColor = () => {
    if (!status) return '#7B2FBE'; // default purple
    switch (status.status) {
      case 'pending': return '#7B2FBE'; // purple
      case 'scanned': return '#00B4DB'; // cyan
      case 'paired':  return '#22c55e'; // green
      case 'expired': return '#ef4444'; // red
      default: return '#7B2FBE';
    }
  };

  return (
    <>
      <Head>
        <title>Web Login – Scan QR with Mobile</title>
      </Head>
      <div className="qr-login-container">
        <div className="qr-login-card">
          {/* ✨ Gradient heading – matches the mobile app */}
          <h1 className="brand-heading">Prayantra</h1>
          <p className="login-subtitle">Scan QR code with your mobile app</p>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={handleRetry} className="retry-button">Retry</button>
            </div>
          )}

          {loading && !qrData && (
            <div className="loading-spinner">Generating QR Code...</div>
          )}

          {qrData && (
            <div className="qr-section">
              <div className="qr-code-container">
                <QRCodeDisplay qrData={qrData.qr_code} expiresIn={qrData.expires_in} />
              </div>

              <div className="status-section">
                <div className="status-indicator" style={{ backgroundColor: getStatusColor() }}>
                  {getStatusMessage()}
                </div>

                {status?.status === 'scanned' && (
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="confirm-button"
                  >
                    {confirming ? 'Confirming...' : 'Confirm Login'}
                  </button>
                )}

                {status?.status === 'expired' && (
                  <button onClick={handleRetry} className="retry-button">
                    Generate New QR Code
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="help-text">
            <p>Don't have the app? Download Prayantra from your app store.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebLoginPage;
```

# File: src/screens/module/ModuleDetailScreen.tsx

```tsx
import React from 'react';
import { useRouter } from 'next/router';
import { FEATURES_CONFIG } from '../../config/moduleFeatures';
import {
  FiBox,
  FiTool,        // instead of FiFactory
  FiHome,
  FiKey,
  FiUsers,
  FiUser,
  FiSearch,
  FiPhone,
} from 'react-icons/fi';

// Icon mapping (since we use react-icons/fi)
const iconMap: Record<string, React.ReactNode> = {
  factory: <FiTool className="w-8 h-8 text-blue-600" />,
  'office-building': <FiHome className="w-8 h-8 text-blue-600" />,
  'account-key': <FiKey className="w-8 h-8 text-blue-600" />,
  'badge-account': <FiUsers className="w-8 h-8 text-blue-600" />,
  'account-multiple': <FiUsers className="w-8 h-8 text-blue-600" />,
  'account-search': <FiSearch className="w-8 h-8 text-blue-600" />,
  'account-circle': <FiUser className="w-8 h-8 text-blue-600" />,
  phone: <FiPhone className="w-8 h-8 text-blue-600" />,
};

const defaultIcon = <FiBox className="w-8 h-8 text-blue-600" />;

export default function ModuleDetailScreen() {
  const router = useRouter();
  const { moduleName } = router.query;

  if (!moduleName || typeof moduleName !== 'string') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500">Invalid module</p>
      </div>
    );
  }

  const features = FEATURES_CONFIG[moduleName] || [];

  if (features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <FiBox className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-800 mt-4">No Features Yet</h2>
        <p className="text-gray-500 text-center">This module does not have any available features at the moment.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 shadow-md">
        <h1 className="text-2xl font-bold text-white capitalize">{moduleName}</h1>
        <p className="text-blue-100 text-sm">Select a feature to manage</p>
      </div>

      {/* Divider */}
      <div className="h-4 bg-gray-100" />

      {/* Feature grid */}
      <div className="px-4 py-2 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((feature) => (
            <button
              key={feature.key}
              onClick={() => router.push(feature.path)}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex items-center gap-4 border border-gray-200 hover:border-blue-300"
            >
              <div className="flex-shrink-0">
                {iconMap[feature.icon] || defaultIcon}
              </div>
              <span className="text-gray-800 font-medium text-lg">
                {feature.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/AddEmployeeScreen.tsx

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiX, FiSearch, FiCheck, FiUser } from 'react-icons/fi';

import { addEmployee, addManager, listRoles, listPositions, getEmployeeSuggestions } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role, Position, CompanyEmployee } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar'; // we'll create this later

// ---- Zod schema (same as mobile) ----
const schema = z.object({
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  username: z.string().optional(),
  full_name: z.string().optional(),
  employee_id: z.string().optional(),
  role_id: z.string().min(1, 'Role is required'),
  reports_to: z.string().optional(),
  position_id: z.string().optional(),
  is_manager: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ---- Simple Switch component ----
const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      onClick={() => onChange(!value)}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// ---- Simple TextInput (outlined style) ----
const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  error?: boolean;
  type?: string;
  placeholder?: string;
}> = ({ label, value, onChange, onBlur, error, type = 'text', placeholder }) => {
  return (
    <div className="mt-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full rounded-md border ${error ? 'border-red-500' : 'border-gray-300'} px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
      />
    </div>
  );
};

// ---- Dropdown select (for role/position) ----
const DropdownSelect: React.FC<{
  label: string;
  value: string | undefined;
  onPress: () => void;
  placeholder: string;
  error?: any;
  displayText?: string;
}> = ({ label, value, onPress, placeholder, error, displayText }) => {
  return (
    <div className="mt-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      <button
        type="button"
        onClick={onPress}
        className={`w-full flex justify-between items-center bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 text-left`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayText || placeholder}
        </span>
        <FiChevronDown className="text-gray-500" />
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </div>
  );
};

// ---- Modal component for dropdowns ----
const SelectModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
};

// ---- Reports To search modal ----
const ReportsToModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelect: (user: CompanyEmployee) => void;
  accessToken: string;
  companyId: string;
  deviceId: string;
}> = ({ visible, onClose, onSelect, accessToken, companyId, deviceId }) => {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSuggestions([]);
    }
  }, [visible]);

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getEmployeeSuggestions(companyId, deviceId, text, 20, accessToken);
      setSuggestions(res.data || []);
    } catch (error) {
      console.error('Failed to search employees', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-h-[80%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">Select Manager/Supervisor</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
            <FiSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name or username"
              className="flex-1 bg-transparent outline-none text-gray-800"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {search.length > 0 && (
              <button onClick={() => handleSearch('')} className="text-gray-400">
                <FiX size={18} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="px-2 pb-4">
            {suggestions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                {search.length >= 2 ? 'No users found' : 'Type at least 2 characters to search'}
              </p>
            ) : (
              suggestions.map((user) => (
                <button
                  key={user.user_id}
                  className="w-full flex items-center gap-3 py-3 px-2 border-b border-gray-100 hover:bg-gray-50"
                  onClick={() => {
                    onSelect(user);
                    onClose();
                  }}
                >
                  <UserAvatar
                    userId={user.user_id}
                    username={user.username}
                    fullName={user.full_name}
                    size={40}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-gray-800 font-medium">
                      {user.full_name || user.username || user.user_id}
                    </p>
                    {user.username && user.full_name && (
                      <p className="text-gray-400 text-sm">@{user.username}</p>
                    )}
                    {user.employee_id && (
                      <p className="text-gray-400 text-sm">ID: {user.employee_id}</p>
                    )}
                    {user.role_name && (
                      <p className="text-gray-400 text-sm">{user.role_name}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Main Screen ----
export default function AddEmployeeScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Modal visibility
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [reportsToModalVisible, setReportsToModalVisible] = useState(false);

  // Reports To selected name
  const [selectedReportsToName, setSelectedReportsToName] = useState('');

  // React Hook Form
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: '',
      role_id: '',
      position_id: '',
      is_manager: false,
      reports_to: '',
    },
  });

  const selectedRoleId = watch('role_id');
  const selectedPositionId = watch('position_id');
  const isManager = watch('is_manager');
  const reportsToId = watch('reports_to');

  // Fetch roles & positions
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingOptions(false);
        return;
      }
      try {
        const [rolesRes, positionsRes] = await Promise.all([
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          listPositions(companyId, deviceId, { limit: 100, offset: 0 }, accessToken),
        ]);
        setRoles(rolesRes.data?.roles || []);
        setPositions(positionsRes.data?.positions || []);
      } catch (error) {
        alert('Failed to load options');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  // Submit
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication');
      return;
    }

    const token = accessToken;
    const compId = companyId;
    const devId = deviceId;
    const cleanPhone = data.phone.trim().replace(/\s/g, '');

    setLoading(true);
    try {
      const payload = {
        phone: cleanPhone,
        username: data.username,
        full_name: data.full_name,
        employee_id: data.employee_id,
        role_id: data.role_id,
        reports_to: data.reports_to,
        position_id: data.position_id,
      };
      if (data.is_manager) {
        await addManager(compId, devId, payload, token);
      } else {
        await addEmployee(compId, devId, payload, token);
      }
      alert(`Success: ${data.is_manager ? 'Manager' : 'Employee'} added`);
      router.back();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get display text for role/position
  const getRoleDisplay = (id: string) => roles.find(r => r.role_id === id)?.role_name || '';
  const getPositionDisplay = (id: string) => positions.find(p => p.position_id === id)?.title || '';

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {/* Manager Toggle */}
        <Controller
          control={control}
          name="is_manager"
          render={({ field: { onChange, value } }) => (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700 font-medium">Add as Manager</span>
              <Switch value={value} onChange={onChange} />
            </div>
          )}
        />

        {/* Phone */}
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Phone *"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              type="tel"
              error={!!errors.phone}
            />
          )}
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}

        {/* Username */}
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Username (optional)"
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}
        />

        {/* Full Name */}
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Full Name (optional)"
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}
        />

        {/* Employee ID */}
        <Controller
          control={control}
          name="employee_id"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Employee ID (optional)"
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}
        />

        {/* Role */}
        <DropdownSelect
          label="Role"
          value={selectedRoleId}
          onPress={() => setRoleModalVisible(true)}
          placeholder="Select a role"
          error={errors.role_id}
          displayText={selectedRoleId ? getRoleDisplay(selectedRoleId) : undefined}
        />

        {/* Position */}
        <DropdownSelect
          label="Position"
          value={selectedPositionId}
          onPress={() => setPositionModalVisible(true)}
          placeholder="Select a position (optional)"
          error={errors.position_id}
          displayText={selectedPositionId ? getPositionDisplay(selectedPositionId) : undefined}
        />

        {/* Reports To */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reports To (optional)
          </label>
          <button
            type="button"
            onClick={() => setReportsToModalVisible(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={reportsToId ? 'text-gray-900' : 'text-gray-400'}>
              {reportsToId ? selectedReportsToName || 'Selected' : 'Search for user...'}
            </span>
            <FiSearch className="text-gray-500" />
          </button>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Adding...
              </div>
            ) : (
              `Add ${isManager ? 'Manager' : 'Employee'}`
            )}
          </button>
        </div>
      </div>

      {/* Role Modal */}
      <SelectModal
        visible={roleModalVisible}
        onClose={() => setRoleModalVisible(false)}
        title="Select Role"
      >
        {roles.map((role) => (
          <button
            key={role.role_id}
            className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
              selectedRoleId === role.role_id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => {
              setValue('role_id', role.role_id);
              setRoleModalVisible(false);
            }}
          >
            <span className={selectedRoleId === role.role_id ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
              {role.role_name} (Level {role.role_level})
            </span>
            {selectedRoleId === role.role_id && <FiCheck className="text-blue-600" />}
          </button>
        ))}
      </SelectModal>

      {/* Position Modal */}
      <SelectModal
        visible={positionModalVisible}
        onClose={() => setPositionModalVisible(false)}
        title="Select Position"
      >
        {positions.map((pos) => (
          <button
            key={pos.position_id}
            className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
              selectedPositionId === pos.position_id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => {
              setValue('position_id', pos.position_id);
              setPositionModalVisible(false);
            }}
          >
            <span className={selectedPositionId === pos.position_id ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
              {pos.title}
            </span>
            {selectedPositionId === pos.position_id && <FiCheck className="text-blue-600" />}
          </button>
        ))}
      </SelectModal>

      {/* Reports To Modal */}
      {accessToken && companyId && deviceId && (
        <ReportsToModal
          visible={reportsToModalVisible}
          onClose={() => setReportsToModalVisible(false)}
          onSelect={(user) => {
            setValue('reports_to', user.user_id);
            setSelectedReportsToName(user.full_name || user.username || user.user_id);
          }}
          accessToken={accessToken}
          companyId={companyId}
          deviceId={deviceId}
        />
      )}
    </div>
  );
}
```

# File: src/screens/module/administration/AvatarManagementScreen.tsx

```tsx
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiPlus,
  FiStar,
  FiStar as FiStarOutline,
  FiTrash2,
  FiRefreshCw,
  FiUpload,
  FiX,
} from 'react-icons/fi';

import {
  listMyAvatars,
  listInactiveAvatars,
  generateAvatarUploadUrl,
  uploadAvatarFile,
  confirmAvatarUpload,
  setAvatarPrimary,
  deleteAvatar,
  reactivateAvatar,
  getAvatarUrl,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

type ViewMode = 'active' | 'deleted';

export default function AvatarManagementScreen() {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; avatarId: string | null }>({
    open: false,
    avatarId: null,
  });

  // ---- Queries ----
  const {
    data: activeAvatars = [],
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['myAvatars', 'active'],
    queryFn: () => listMyAvatars(deviceId!, accessToken!, companyId!),
    enabled: !!accessToken && !!deviceId && !!companyId,
  });

  const {
    data: inactiveAvatars = [],
    isLoading: inactiveLoading,
    refetch: refetchInactive,
  } = useQuery({
    queryKey: ['myAvatars', 'inactive'],
    queryFn: () => listInactiveAvatars(deviceId!, accessToken!, companyId!),
    enabled: !!accessToken && !!deviceId && !!companyId,
  });

  const isLoading = viewMode === 'active' ? activeLoading : inactiveLoading;
  const avatars = viewMode === 'active' ? activeAvatars : inactiveAvatars;
  const refetch = viewMode === 'active' ? refetchActive : refetchInactive;

  // ---- Mutations ----
  const setPrimaryMutation = useMutation({
    mutationFn: ({ avatarId, idempotencyKey }: { avatarId: string; idempotencyKey: string }) =>
      setAvatarPrimary(avatarId, deviceId!, accessToken!, idempotencyKey, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      alert('Primary avatar updated');
    },
    onError: (error: any) => {
      alert(error?.message || 'Failed to set primary avatar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ avatarId, idempotencyKey }: { avatarId: string; idempotencyKey: string }) =>
      deleteAvatar(avatarId, deviceId!, accessToken!, idempotencyKey, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      setDeleteDialog({ open: false, avatarId: null });
      alert('Avatar deleted');
    },
    onError: (error: any) => {
      alert(error?.message || 'Failed to delete avatar');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: ({
      avatarId,
      idempotencyKey,
      setPrimary,
    }: {
      avatarId: string;
      idempotencyKey: string;
      setPrimary: boolean;
    }) => reactivateAvatar(avatarId, deviceId!, accessToken!, idempotencyKey, companyId!, setPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      alert('Avatar restored');
    },
    onError: (error: any) => {
      alert(error?.message || 'Failed to restore avatar');
    },
  });

  // ---- Upload flow ----
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get upload URL
      const { uploadUrl, fileKey } = await generateAvatarUploadUrl(
        file.type || 'image/jpeg',
        deviceId!,
        accessToken!,
        companyId!
      );

      // 2. Upload file
      await uploadAvatarFile(
        uploadUrl,
        fileKey,
        URL.createObjectURL(file), // we can pass the object URL or the file directly
        file.name,
        file.type,
        accessToken!,
        companyId!
      );

      // 3. Confirm
      const idempotencyKey = `confirm-${Date.now()}`;
      await confirmAvatarUpload(
        fileKey,
        file.type,
        true,
        deviceId!,
        accessToken!,
        idempotencyKey,
        companyId!
      );

      await queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      alert('Avatar uploaded and set as primary.');
    } catch (error: any) {
      alert(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- Handlers ----
  const handleSetPrimary = (avatarId: string) => {
    const idempotencyKey = `set-primary-${Date.now()}`;
    setPrimaryMutation.mutate({ avatarId, idempotencyKey });
  };

  const handleDelete = (avatarId: string) => {
    setDeleteDialog({ open: true, avatarId });
  };

  const confirmDelete = () => {
    if (deleteDialog.avatarId) {
      const idempotencyKey = `delete-${Date.now()}`;
      deleteMutation.mutate({ avatarId: deleteDialog.avatarId, idempotencyKey });
    }
  };

  const handleReactivate = (avatarId: string, setPrimary: boolean = false) => {
    const idempotencyKey = `reactivate-${Date.now()}`;
    reactivateMutation.mutate({ avatarId, idempotencyKey, setPrimary });
  };

  // ---- Render ----
  if (!accessToken || !deviceId || !companyId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500">Authentication required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header with toggle */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
          <button
            className={`flex-1 py-2 text-center rounded-md transition ${
              viewMode === 'active' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setViewMode('active')}
          >
            Active
          </button>
          <button
            className={`flex-1 py-2 text-center rounded-md transition ${
              viewMode === 'deleted' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setViewMode('deleted')}
          >
            Deleted
          </button>
        </div>
      </div>

      {/* Avatar list */}
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-6xl mb-4">
              {viewMode === 'active' ? '👤' : '🗑️'}
            </div>
            <h3 className="text-gray-700 text-xl font-medium">
              {viewMode === 'active' ? 'No avatars yet' : 'No deleted avatars'}
            </h3>
            <p className="text-gray-500 mt-2">
              {viewMode === 'active'
                ? 'Upload your first avatar using the button below.'
                : 'Deleted avatars will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {avatars.map((avatar) => {
              const imageUrl = getAvatarUrl(avatar, 'medium');
              const isPrimary = avatar.isPrimary;
              const isActive = avatar.isActive;

              return (
                <div
                  key={avatar.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4"
                >
                  {/* Avatar image */}
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiUpload className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-medium capitalize">{avatar.type}</p>
                    <p className="text-gray-400 text-sm">
                      Uploaded: {new Date(avatar.createdAt).toLocaleDateString()}
                    </p>
                    {isActive && isPrimary && (
                      <span className="inline-flex items-center gap-1 text-yellow-500 text-xs font-semibold">
                        <FiStar className="w-4 h-4 fill-current" /> Primary
                      </span>
                    )}
                    {!isActive && (
                      <span className="text-red-500 text-xs font-semibold">Deleted</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <>
                        {!isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(avatar.id)}
                            disabled={setPrimaryMutation.isPending}
                            className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                            title="Set as primary"
                          >
                            <FiStarOutline className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(avatar.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReactivate(avatar.id, false)}
                          disabled={reactivateMutation.isPending}
                          className="p-2 text-gray-400 hover:text-green-600 disabled:opacity-50"
                          title="Restore"
                        >
                          <FiRefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReactivate(avatar.id, true)}
                          disabled={reactivateMutation.isPending}
                          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 bg-blue-50 rounded-full"
                          title="Restore and set as primary"
                        >
                          <FiStar className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB: Upload (only in active mode) */}
      {viewMode === 'active' && (
        <div className="fixed bottom-6 right-6">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            id="avatar-upload"
          />
          <label
            htmlFor="avatar-upload"
            className={`flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg cursor-pointer hover:bg-blue-700 transition ${
              uploading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
            ) : (
              <FiPlus className="w-6 h-6" />
            )}
          </label>
        </div>
      )}

      {/* Delete Confirmation Dialog (simple overlay) */}
      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800">Delete Avatar</h3>
            <p className="text-gray-600 mt-2">Are you sure you want to delete this avatar?</p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteDialog({ open: false, avatarId: null })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

# File: src/screens/module/administration/CreateDepartmentScreen.tsx

```tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Switch } from '../../../components/Switch'; // reuse the toggle component

// ---- Zod Schema ----
const schema = z.object({
  department_name: z.string().min(1, 'Department name is required'),
  module_code: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CreateDepartmentScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication details');
      return;
    }
    setLoading(true);
    try {
      await createDepartment(companyId, deviceId, data, accessToken);
      alert('Department created successfully');
      router.back();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Creation failed';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Department</h1>

        {/* Department Name */}
        <Controller
          control={control}
          name="department_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department Name *
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={`w-full rounded-md border px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.department_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.department_name && (
                <p className="text-red-500 text-xs mt-1">{errors.department_name.message}</p>
              )}
            </div>
          )}
        />

        {/* Module Code (optional) */}
        <Controller
          control={control}
          name="module_code"
          render={({ field: { onChange, onBlur, value } }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module Code (optional)
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        />

        {/* Active Switch */}
        <Controller
          control={control}
          name="is_active"
          render={({ field: { onChange, value } }) => (
            <div className="mt-6 flex items-center justify-between py-2">
              <span className="text-gray-700 font-medium">Active</span>
              <Switch value={value} onChange={onChange} />
            </div>
          )}
        />

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Department'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/CreatePositionScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiCheck, FiX } from 'react-icons/fi';
import { createPosition, getRootDepartments, listWorkCenters } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Switch } from '../../../components/Switch';
import { SelectModal } from '../../../components/SelectModal';

// ---- Zod Schema ----
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  department_id: z.string().min(1, 'Department is required'),
  work_center_code: z.string().nullable().optional(),
  is_open: z.boolean(),
  is_schedulable: z.boolean(),
  attendance_required: z.boolean(),
  overtime_allowed: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type Department = { department_id: string; department_name: string };
type WorkCenter = { work_center_code: string; name: string };

export default function CreatePositionScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'department' | 'workCenter'>('department');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      department_id: '',
      work_center_code: null,
      is_open: true,
      is_schedulable: true,
      attendance_required: true,
      overtime_allowed: false,
    },
  });

  const selectedDepartment = watch('department_id');
  const selectedWorkCenter = watch('work_center_code');

  // Fetch options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingOptions(false);
        return;
      }
      setLoadingOptions(true);
      try {
        const [deptRes, wcRes] = await Promise.all([
          getRootDepartments(companyId, deviceId, accessToken),
          listWorkCenters(companyId, deviceId, { page: 1, page_size: 100 }, accessToken),
        ]);
        setDepartments(deptRes.data || []);
        setWorkCenters(wcRes.data || []);
      } catch (error) {
        console.error('Failed to load options', error);
        alert('Failed to load departments or work centers');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  // Submit
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...data,
        company_id: companyId,
        work_center_code: data.work_center_code ?? undefined,
      };
      await createPosition(companyId, deviceId, payload, accessToken);
      alert('Position created successfully');
      router.back();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const openPicker = (type: 'department' | 'workCenter') => {
    setModalType(type);
    setModalVisible(true);
  };

  const selectItem = (value: string) => {
    if (modalType === 'department') {
      setValue('department_id', value);
    } else {
      setValue('work_center_code', value);
    }
    setModalVisible(false);
  };

  const getDepartmentLabel = (id: string) => {
    const dept = departments.find(d => d.department_id === id);
    return dept ? dept.department_name : 'Select Department';
  };

  // Fixed: accept undefined as well
  const getWorkCenterLabel = (code: string | null | undefined) => {
    if (!code) return 'Select Work Center (optional)';
    const wc = workCenters.find(w => w.work_center_code === code);
    return wc ? wc.name : 'Select Work Center (optional)';
  };

  if (loadingOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Position</h1>

        {/* Title */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position Title *
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={`w-full rounded-md border px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
          )}
        />

        {/* Department Dropdown */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <button
            type="button"
            onClick={() => openPicker('department')}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={selectedDepartment ? 'text-gray-900' : 'text-gray-400'}>
              {selectedDepartment ? getDepartmentLabel(selectedDepartment) : 'Select Department'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
          {errors.department_id && <p className="text-red-500 text-xs mt-1">{errors.department_id.message}</p>}
        </div>

        {/* Work Center Dropdown */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Center (optional)
          </label>
          <button
            type="button"
            onClick={() => openPicker('workCenter')}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={selectedWorkCenter ? 'text-gray-900' : 'text-gray-400'}>
              {getWorkCenterLabel(selectedWorkCenter)}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* Switches */}
        <div className="mt-6 space-y-3">
          <Controller
            control={control}
            name="is_open"
            render={({ field: { onChange, value } }) => (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Open Position</span>
                <Switch value={value} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="is_schedulable"
            render={({ field: { onChange, value } }) => (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Schedulable</span>
                <Switch value={value} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="attendance_required"
            render={({ field: { onChange, value } }) => (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Attendance Required</span>
                <Switch value={value} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="overtime_allowed"
            render={({ field: { onChange, value } }) => (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Overtime Allowed</span>
                <Switch value={value} onChange={onChange} />
              </div>
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Position'
            )}
          </button>
        </div>
      </div>

      {/* Modal for department/work center selection */}
      <SelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalType === 'department' ? 'Select Department' : 'Select Work Center'}
      >
        {modalType === 'department' ? (
          <div>
            {departments.map((dept) => (
              <button
                key={dept.department_id}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  selectedDepartment === dept.department_id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => selectItem(dept.department_id)}
              >
                <span className={selectedDepartment === dept.department_id ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {dept.department_name}
                </span>
                {selectedDepartment === dept.department_id && <FiCheck className="text-blue-600" />}
              </button>
            ))}
          </div>
        ) : (
          <div>
            {workCenters.map((wc) => (
              <button
                key={wc.work_center_code}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  selectedWorkCenter === wc.work_center_code ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => selectItem(wc.work_center_code)}
              >
                <span className={selectedWorkCenter === wc.work_center_code ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {wc.name}
                </span>
                {selectedWorkCenter === wc.work_center_code && <FiCheck className="text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </SelectModal>
    </div>
  );
}
```

# File: src/screens/module/administration/CreateRoleScreen.tsx

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiX, FiCheck, FiPlus, FiMinus, FiSearch } from 'react-icons/fi';

import {
  getRole,
  updateRole,
  getRootDepartments,
  getRolePermissionsDetailed,
  getRoleDepartments,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// ---- Types ----
type DepartmentItem = { department_id: string; department_name: string; module_code?: string };
type PermissionItem = { permission_name: string; description: string; module: string };

// ---- Zod schema ----
const schema = z.object({
  role_name: z.string().min(1, 'Role name is required').optional(),
  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000')
    .optional(),
  description: z.string().nullable().optional(),
  add_departments: z.array(z.string()),
  remove_departments: z.array(z.string()),
  add_permissions: z.array(z.string()),
  remove_permissions: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

// ---- Custom Switch (not used here, but we may reuse) ----

export default function EditRoleScreen() {
  const router = useRouter();
  const { roleId } = router.query; // get from URL, e.g., ?roleId=xyz
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  // All departments
  const [allDepartments, setAllDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Current state
  const [currentPermissions, setCurrentPermissions] = useState<PermissionItem[]>([]);
  const [currentDepartments, setCurrentDepartments] = useState<DepartmentItem[]>([]);

  // Permission picker state for ADD
  const [addModule, setAddModule] = useState<string>('');
  const [addPermissionsList, setAddPermissionsList] = useState<PermissionItem[]>([]);
  const [loadingAddPermissions, setLoadingAddPermissions] = useState(false);
  const [addPermissionModalOpen, setAddPermissionModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [tempAddPermissions, setTempAddPermissions] = useState<string[]>([]);

  // Permission picker state for REMOVE
  const [removeModule, setRemoveModule] = useState<string>('');
  const [removePermissionsList, setRemovePermissionsList] =  useState<PermissionItem[]>([]);
  const [loadingRemovePermissions, setLoadingRemovePermissions] = useState(false);
  const [removePermissionModalOpen, setRemovePermissionModalOpen] = useState(false);
  const [removeSearchQuery, setRemoveSearchQuery] = useState('');
  const [tempRemovePermissions, setTempRemovePermissions] = useState<string[]>([]);

  // Department modals
  const [addDeptModalOpen, setAddDeptModalOpen] = useState(false);
  const [removeDeptModalOpen, setRemoveDeptModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      add_departments: [],
      remove_departments: [],
      add_permissions: [],
      remove_permissions: [],
    },
  });

  const addDeptIds = watch('add_departments') || [];
  const removeDeptIds = watch('remove_departments') || [];
  const addPermissions = watch('add_permissions') || [];
  const removePermissions = watch('remove_permissions') || [];

  // Unique modules from departments
  const modules = useMemo(
    () => Array.from(new Set(allDepartments.map(d => d.module_code).filter(Boolean) as string[])),
    [allDepartments]
  );

  // Fetch data
  useEffect(() => {
    if (!roleId || !accessToken || !companyId) {
      if (!roleId) alert('Role ID missing');
      router.back();
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setLoadingDepartments(true);
      try {
        const [roleRes, deptRes, permRes, roleDeptRes] = await Promise.all([
          getRole(companyId, deviceId!, roleId as string, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
          getRolePermissionsDetailed(companyId, deviceId!, roleId as string, accessToken),
          getRoleDepartments(companyId, deviceId!, roleId as string, accessToken),
        ]);

        const role = roleRes.data;
        if (!role) {
          alert('Role not found');
          router.back();
          return;
        }

        setIsSystemRole(role.is_system_role);
        setAllDepartments(deptRes.data || []);
        setCurrentPermissions(permRes.data || []);
        setCurrentDepartments(roleDeptRes.data || []);

        reset({
          role_name: role.role_name,
          role_level: role.role_level,
          description: role.description || '',
          add_departments: [],
          remove_departments: [],
          add_permissions: [],
          remove_permissions: [],
        });
      } catch (error: any) {
        alert(error.message || 'Failed to load role');
        router.back();
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };
    fetchData();
  }, [roleId]);

  // Fetch permissions for ADD
  const fetchAddPermissions = async (moduleCode: string) => {
    if (!accessToken || !companyId) return;
    setLoadingAddPermissions(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Device-ID': deviceId!,
            'X-Company-ID': companyId,
          },
        }
      );
      const json = await response.json();
      setAddPermissionsList(json.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      alert('Could not load permissions');
    } finally {
      setLoadingAddPermissions(false);
    }
  };

  // Fetch permissions for REMOVE
  const fetchRemovePermissions = async (moduleCode: string) => {
    if (!accessToken || !companyId) return;
    setLoadingRemovePermissions(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Device-ID': deviceId!,
            'X-Company-ID': companyId,
          },
        }
      );
      const json = await response.json();
      setRemovePermissionsList(json.data || []);
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      alert('Could not load permissions');
    } finally {
      setLoadingRemovePermissions(false);
    }
  };

  // ---- Handlers for ADD permissions ----
  const openAddPermissionPicker = () => {
    if (!addModule) {
      alert('Please select a module first');
      return;
    }
    setTempAddPermissions([...addPermissions]);
    setAddPermissionModalOpen(true);
  };

  const toggleTempAddPermission = (perm: string) => {
    setTempAddPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const confirmAddPermissions = () => {
    setValue('add_permissions', tempAddPermissions);
    setAddPermissionModalOpen(false);
  };

  const removeAddPermission = (perm: string) => {
    setValue('add_permissions', addPermissions.filter(p => p !== perm));
  };

  // ---- Handlers for REMOVE permissions ----
  const openRemovePermissionPicker = () => {
    if (!removeModule) {
      alert('Please select a module first');
      return;
    }
    setTempRemovePermissions([...removePermissions]);
    setRemovePermissionModalOpen(true);
  };

  const toggleTempRemovePermission = (perm: string) => {
    setTempRemovePermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const confirmRemovePermissions = () => {
    setValue('remove_permissions', tempRemovePermissions);
    setRemovePermissionModalOpen(false);
  };

  const removeRemovePermission = (perm: string) => {
    setValue('remove_permissions', removePermissions.filter(p => p !== perm));
  };

  // ---- Department toggle ----
  const toggleDepartment = (id: string, list: 'add' | 'remove') => {
    const current = list === 'add' ? addDeptIds : removeDeptIds;
    if (current.includes(id)) {
      setValue(list === 'add' ? 'add_departments' : 'remove_departments', current.filter(d => d !== id));
    } else {
      setValue(list === 'add' ? 'add_departments' : 'remove_departments', [...current, id]);
    }
  };

  // ---- Toggle removal of current department/permission ----
  const toggleRemoveCurrentDepartment = (deptId: string) => {
    const currentRemove = removeDeptIds;
    if (currentRemove.includes(deptId)) {
      setValue('remove_departments', currentRemove.filter(id => id !== deptId));
    } else {
      setValue('remove_departments', [...currentRemove, deptId]);
    }
  };

  const toggleRemoveCurrentPermission = (permName: string) => {
    const currentRemove = removePermissions;
    if (currentRemove.includes(permName)) {
      setValue('remove_permissions', currentRemove.filter(p => p !== permName));
    } else {
      setValue('remove_permissions', [...currentRemove, permName]);
    }
  };

  // ---- Submit ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) return;
    setSaving(true);
    try {
      const payload: any = {
        role_name: data.role_name,
        description: data.description,
        add_departments: data.add_departments,
        remove_departments: data.remove_departments,
        add_permissions: data.add_permissions,
        remove_permissions: data.remove_permissions,
      };
      if (data.role_level !== undefined) payload.role_level = data.role_level;
      await updateRole(companyId, deviceId!, roleId as string, payload, accessToken);
      alert('Role updated successfully');
      router.back();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {/* System role warning */}
        {isSystemRole && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
            <p className="text-orange-700 text-sm">
              ⚠️ This is a system role. You can update its name, level, and description, but it cannot be deleted.
            </p>
          </div>
        )}

        {/* Role Name */}
        <Controller
          control={control}
          name="role_name"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Role Name *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${errors.role_name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.role_name && <p className="text-red-500 text-xs mt-1">{errors.role_name.message}</p>}
            </div>
          )}
        />

        {/* Role Level */}
        <Controller
          control={control}
          name="role_level"
          render={({ field: { onChange, onBlur, value } }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Role Level * (1-1000)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={value || ''}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (e.target.value === '' || isNaN(num)) {
                    onChange(undefined);
                  } else {
                    onChange(Math.min(Math.max(1, num), 1000));
                  }
                }}
                onBlur={onBlur}
                className={`w-full rounded-md border ${errors.role_level ? 'border-red-500' : 'border-gray-300'} px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.role_level && <p className="text-red-500 text-xs mt-1">{errors.role_level.message}</p>}
            </div>
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    />       
                 </div>
          )}
        />

        {/* ============ CURRENT PERMISSIONS ============ */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Current Permissions ({currentPermissions.length})</p>
          {currentPermissions.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No permissions currently assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {currentPermissions.map(perm => {
                const isBeingRemoved = removePermissions.includes(perm.permission_name);
                return (
                  <span
                    key={perm.permission_name}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      isBeingRemoved ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {perm.permission_name}
                    {isBeingRemoved && ' (removing)'}
                    <button
                      type="button"
                      onClick={() => toggleRemoveCurrentPermission(perm.permission_name)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      {isBeingRemoved ? <FiCheck size={14} /> : <FiX size={14} />}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ CURRENT DEPARTMENTS ============ */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Current Departments ({currentDepartments.length})</p>
          {currentDepartments.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No departments currently assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {currentDepartments.map(dept => {
                const isBeingRemoved = removeDeptIds.includes(dept.department_id);
                return (
                  <span
                    key={dept.department_id}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      isBeingRemoved ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {dept.department_name}
                    {isBeingRemoved && ' (removing)'}
                    <button
                      type="button"
                      onClick={() => toggleRemoveCurrentDepartment(dept.department_id)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      {isBeingRemoved ? <FiCheck size={14} /> : <FiX size={14} />}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* ----- ADD DEPARTMENTS ----- */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Add More Departments</p>
          <button
            type="button"
            onClick={() => setAddDeptModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 mt-1"
          >
            <span className={addDeptIds.length ? 'text-gray-900' : 'text-gray-400'}>
              {addDeptIds.length ? `${addDeptIds.length} selected` : 'Select departments to add'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* ----- REMOVE DEPARTMENTS ----- */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Remove Departments (additional)</p>
          <button
            type="button"
            onClick={() => setRemoveDeptModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 mt-1"
          >
            <span className={removeDeptIds.length ? 'text-gray-900' : 'text-gray-400'}>
              {removeDeptIds.length ? `${removeDeptIds.length} selected` : 'Select departments to remove'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* ----- ADD PERMISSIONS ----- */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Add Permissions</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (modules.length === 0) {
                    alert('No modules available. Please select a department first.');
                    return;
                  }
                  // Show a simple prompt with module list (better to use a small modal)
                  const moduleList = modules.join('\n');
                  const selected = prompt('Select module (enter the exact name):\n' + moduleList);
                  if (selected && modules.includes(selected)) {
                    setAddModule(selected);
                    fetchAddPermissions(selected);
                  } else if (selected) {
                    alert('Module not found');
                  }
                }}
                className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
              >
                <span className={addModule ? 'text-gray-900' : 'text-gray-400'}>
                  {addModule || 'Select module'}
                </span>
                <FiChevronDown className="text-gray-500" />
              </button>
            </div>
            <button
              type="button"
              onClick={openAddPermissionPicker}
              disabled={!addModule}
              className={`p-2 rounded-md ${addModule ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'} text-white`}
            >
              <FiPlus size={20} />
            </button>
          </div>
          {loadingAddPermissions && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-2" />}
          {addPermissions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {addPermissions.map(perm => (
                <span key={perm} className="inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  {perm}
                  <button type="button" onClick={() => removeAddPermission(perm)} className="ml-2 text-gray-500 hover:text-gray-700">
                    <FiX size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ----- REMOVE PERMISSIONS ----- */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">Remove Permissions (additional)</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (modules.length === 0) {
                    alert('No modules available. Please select a department first.');
                    return;
                  }
                  const moduleList = modules.join('\n');
                  const selected = prompt('Select module (enter the exact name):\n' + moduleList);
                  if (selected && modules.includes(selected)) {
                    setRemoveModule(selected);
                    fetchRemovePermissions(selected);
                  } else if (selected) {
                    alert('Module not found');
                  }
                }}
                className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
              >
                <span className={removeModule ? 'text-gray-900' : 'text-gray-400'}>
                  {removeModule || 'Select module'}
                </span>
                <FiChevronDown className="text-gray-500" />
              </button>
            </div>
            <button
              type="button"
              onClick={openRemovePermissionPicker}
              disabled={!removeModule}
              className={`p-2 rounded-md ${removeModule ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'} text-white`}
            >
              <FiMinus size={20} />
            </button>
          </div>
          {loadingRemovePermissions && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-2" />}
          {removePermissions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {removePermissions.map(perm => (
                <span key={perm} className="inline-flex items-center bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                  {perm}
                  <button type="button" onClick={() => removeRemovePermission(perm)} className="ml-2 text-gray-500 hover:text-gray-700">
                    <FiX size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ----- UPDATE BUTTON ----- */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex justify-center items-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Updating...
              </span>
            ) : (
              'Update Role'
            )}
          </button>
        </div>
      </div>

      {/* ========== ADD DEPARTMENT MODAL ========== */}
      {addDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setAddDeptModalOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Select Departments to Add</h3>
              <button onClick={() => setAddDeptModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-2">
              {loadingDepartments ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : (
                allDepartments.map(dept => {
                  const checked = addDeptIds.includes(dept.department_id);
                  return (
                    <div key={dept.department_id} className="flex items-center py-2 border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDepartment(dept.department_id, 'add')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-gray-800">{dept.department_name}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setAddDeptModalOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== REMOVE DEPARTMENT MODAL ========== */}
      {removeDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setRemoveDeptModalOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Select Departments to Remove</h3>
              <button onClick={() => setRemoveDeptModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-2">
              {loadingDepartments ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : (
                allDepartments.map(dept => {
                  const checked = removeDeptIds.includes(dept.department_id);
                  return (
                    <div key={dept.department_id} className="flex items-center py-2 border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDepartment(dept.department_id, 'remove')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-gray-800">{dept.department_name}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setRemoveDeptModalOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ADD PERMISSIONS MODAL ========== */}
      {addPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setAddPermissionModalOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[85%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Add Permissions for {addModule}</h3>
              <button onClick={() => setAddPermissionModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search permissions"
                  className="flex-1 bg-transparent outline-none text-gray-800"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                />
                {addSearchQuery && (
                  <button onClick={() => setAddSearchQuery('')} className="text-gray-400">
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </div>
            {loadingAddPermissions ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : (
              <div className="p-2">
                {addPermissionsList
                  .filter(p =>
                    p.permission_name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
                    p.description?.toLowerCase().includes(addSearchQuery.toLowerCase())
                  )
                  .map(item => {
                    const checked = tempAddPermissions.includes(item.permission_name);
                    return (
                      <div key={item.permission_name} className="flex items-start py-2 border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTempAddPermission(item.permission_name)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="text-gray-800 font-medium">{item.permission_name}</p>
                          {item.description && <p className="text-gray-500 text-sm">{item.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                {addPermissionsList.length === 0 && <p className="text-gray-500 text-center py-4">No permissions found</p>}
              </div>
            )}
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setAddPermissionModalOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddPermissions}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Confirm ({tempAddPermissions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== REMOVE PERMISSIONS MODAL ========== */}
      {removePermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setRemovePermissionModalOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[85%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Remove Permissions for {removeModule}</h3>
              <button onClick={() => setRemovePermissionModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
                <FiSearch className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search permissions"
                  className="flex-1 bg-transparent outline-none text-gray-800"
                  value={removeSearchQuery}
                  onChange={(e) => setRemoveSearchQuery(e.target.value)}
                />
                {removeSearchQuery && (
                  <button onClick={() => setRemoveSearchQuery('')} className="text-gray-400">
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </div>
            {loadingRemovePermissions ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : (
              <div className="p-2">
                {removePermissionsList
                  .filter(p =>
                    p.permission_name.toLowerCase().includes(removeSearchQuery.toLowerCase()) ||
                    p.description?.toLowerCase().includes(removeSearchQuery.toLowerCase())
                  )
                  .map(item => {
                    const checked = tempRemovePermissions.includes(item.permission_name);
                    return (
                      <div key={item.permission_name} className="flex items-start py-2 border-b border-gray-100">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTempRemovePermission(item.permission_name)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="text-gray-800 font-medium">{item.permission_name}</p>
                          {item.description && <p className="text-gray-500 text-sm">{item.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                {removePermissionsList.length === 0 && <p className="text-gray-500 text-center py-4">No permissions found</p>}
              </div>
            )}
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setRemovePermissionModalOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePermissions}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
              >
                Confirm ({tempRemovePermissions.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

# File: src/screens/module/administration/CreateWorkCenterScreen.tsx

```tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

import { createWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

const schema = z.object({
  work_center_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export default function CreateWorkCenterScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: 'Asia/Kolkata',
      is_active: true,
    },
  });

  const selectedTimezone = watch('timezone');

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      alert('Missing authentication details');
      return;
    }
    try {
      await createWorkCenter(companyId, deviceId!, data, accessToken);
      alert('Work center created successfully');
      router.back();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Creation failed';
      alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Work Center</h2>

        <Controller
          control={control}
          name="work_center_code"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Work Center Code *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${errors.work_center_code ? 'border-red-500' : 'border-gray-300'} px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                autoCapitalize="characters"
              />
              {errors.work_center_code && (
                <p className="text-red-500 text-xs mt-1">{errors.work_center_code.message}</p>
              )}
            </div>
          )}
        />

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...field}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        />

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Timezone *</label>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={selectedTimezone ? 'text-gray-900' : 'text-gray-400'}>
              {selectedTimezone || 'Select timezone'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
          {errors.timezone && <p className="text-red-500 text-xs mt-1">{errors.timezone.message}</p>}
        </div>

        <Controller
          control={control}
          name="is_active"
          render={({ field: { value, onChange } }) => (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Active</span>
              <Switch value={value} onChange={onChange} />
            </div>
          )}
        />

        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex justify-center items-center">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Creating...
              </span>
            ) : (
              'Create Work Center'
            )}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Select Timezone</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>
            <div className="p-2">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz}
                  className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                    selectedTimezone === tz ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setValue('timezone', tz);
                    setModalOpen(false);
                  }}
                >
                  <span className={selectedTimezone === tz ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                    {tz}
                  </span>
                  {selectedTimezone === tz && <FiCheck className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

# File: src/screens/module/administration/DepartmentsListScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { listDepartments, deleteDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Department } from '@b2b/shared-types';

export default function DepartmentsListScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDepartments = async () => {
    if (!accessToken || !companyId) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const res = await listDepartments(
        companyId,
        deviceId!,
        { page: 1, limit: 100 },
        accessToken
      );
      setDepartments(res.data || []);
    } catch (error: any) {
      alert(error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    (async () => {
      try {
        await deleteDepartment(companyId!, deviceId!, id, accessToken!);
        fetchDepartments();
      } catch (error: any) {
        alert(error.response?.data?.message || error.message);
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Departments</h2>
          <button
            onClick={() => router.push('/module/administration/create-department')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Department
          </button>
        </div>

        {departments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No departments found. Create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => (
              <div
                key={dept.department_id}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200"
              >
                <div>
                  <h3 className="font-medium text-gray-800">{dept.department_name}</h3>
                  {dept.module_code && (
                    <p className="text-sm text-gray-500">Module: {dept.module_code}</p>
                  )}
                  <p className="text-xs text-gray-400">ID: {dept.department_id}</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      dept.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        `/module/administration/edit-department?departmentId=${dept.department_id}`
                      )
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.department_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={fetchDepartments}
          disabled={refreshing}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={24} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/EditDepartmentScreen.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getRootDepartments, updateDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// Switch component
const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const schema = z.object({
  department_name: z.string().min(1, 'Department name is required').optional(),
  module_code: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditDepartmentScreen() {
  const router = useRouter();
  const { departmentId } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!departmentId || !accessToken || !companyId) {
      if (!departmentId) alert('Department ID missing');
      router.back();
      return;
    }
    const fetchDepartment = async () => {
      try {
        const res = await getRootDepartments(companyId, deviceId!, accessToken);
        const dept = res.data?.find((d) => d.department_id === departmentId);
        if (dept) {
          reset({
            department_name: dept.department_name,
            module_code: dept.module_code,
            is_active: dept.is_active,
          });
        } else {
          alert('Department not found');
          router.back();
        }
      } catch (error: any) {
        alert(error.message || 'Failed to load department');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchDepartment();
  }, [departmentId]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      alert('Missing authentication');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        module_code: data.module_code ?? undefined,
      };
      await updateDepartment(companyId, deviceId!, departmentId as string, payload, accessToken);
      alert('Department updated successfully');
      router.back();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Department</h2>

        <Controller
          control={control}
          name="department_name"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Department Name *
              </label>
              <input
                {...field}
                className={`w-full rounded-md border ${
                  errors.department_name ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.department_name && (
                <p className="text-red-500 text-xs mt-1">{errors.department_name.message}</p>
              )}
            </div>
          )}
        />

        <Controller
        control={control}
        name="module_code"
        render={({ field }) => (
            <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
                Module Code (optional)
            </label>
            <input
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            </div>
        )}
        />

        <Controller
          control={control}
          name="is_active"
          render={({ field: { value, onChange } }) => (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Active</span>
              <Switch value={value ?? true} onChange={onChange} />
            </div>
          )}
        />

        <div className="mt-8">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Department'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/EditEmployeeScreen.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getEmployeeDetails,
  updateEmployee,
  getCompanyEmployees,
  listRoles,
  listPositions,
  findEmployeeByUsername,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role, Position, CompanyEmployee } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';
import { FiChevronDown, FiX, FiSearch, FiCheck, FiUser } from 'react-icons/fi';

// Switch component
const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ---- Shared Modal Component ----
const SelectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
};

// ---- Simple Search input with clear ----
const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}> = ({ value, onChange, placeholder = 'Search...', onSearch }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
      <FiSearch className="text-gray-400 mr-2" />
      <input
        type="text"
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-gray-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
      />
      {value.length > 0 && (
        <button onClick={() => onChange('')} className="text-gray-400">
          <FiX size={18} />
        </button>
      )}
    </div>
  );
};

export default function EditEmployeeScreen() {
  const router = useRouter();
  const { userId } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [reportsTo, setReportsTo] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Options
  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<CompanyEmployee[]>([]);

  // Modal visibility
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [reportsToModalOpen, setReportsToModalOpen] = useState(false);

  // Role/Position search terms
  const [roleSearch, setRoleSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');

  // Reports To search
  const [reportsToSearch, setReportsToSearch] = useState('');
  const [reportsToResults, setReportsToResults] = useState<CompanyEmployee[]>([]);
  const [reportsToLoading, setReportsToLoading] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // ---- Load data ----
  useEffect(() => {
    if (!userId || !accessToken || !companyId || !deviceId) {
      if (!userId) alert('User ID missing');
      router.back();
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [employeeRaw, rolesRes, positionsRes, managersRes] = await Promise.all([
          getEmployeeDetails(companyId, userId as string, deviceId!, accessToken),
          listRoles(companyId, deviceId!, { page: 1, limit: 100 }, accessToken),
          listPositions(companyId, deviceId!, { offset: 0, limit: 100 }, accessToken),
          getCompanyEmployees(companyId, deviceId!, accessToken),
        ]);

        const employee = employeeRaw as any;
        if (!employee) throw new Error('Employee not found');

        setEmployeeId(employee.employee_id || '');
        setRoleId(employee.role_id || '');
        setPositionId(employee.position_id || '');
        setReportsTo(employee.reports_to ?? null);
        setIsActive(employee.is_active ?? true);

        setRoles(rolesRes.data?.roles || []);
        setPositions(positionsRes.data?.positions || []);
        const allEmployees = managersRes.data?.employees || [];
        setManagers(allEmployees);
        setReportsToResults(allEmployees);
      } catch (error: any) {
        alert(error.message || 'Failed to load data');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // ---- Reports To search ----
  const handleReportsToSearch = async () => {
    if (!reportsToSearch.trim()) {
      setReportsToResults(managers);
      return;
    }
    setReportsToLoading(true);
    try {
      const res = await findEmployeeByUsername(
        companyId!,
        deviceId!,
        reportsToSearch.trim(),
        accessToken!
      );
      const employee = (res.data as any)?.employee || null;
      setReportsToResults(employee ? [employee] : []);
    } catch (error) {
      setReportsToResults([]);
    } finally {
      setReportsToLoading(false);
    }
  };

  const clearReportsToSearch = () => {
    setReportsToSearch('');
    setReportsToResults(managers);
  };

  // ---- Validation ----
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!roleId) newErrors.roleId = 'Please select a role';
    if (!positionId) newErrors.positionId = 'Please select a position';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Submit ----
  const handleUpdate = async () => {
    if (!validate()) return;
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employee_id: employeeId.trim(),
        role_id: roleId,
        position_id: positionId,
        reports_to: reportsTo || null,
        is_active: isActive,
      };
      await updateEmployee(companyId, userId as string, deviceId, accessToken, payload);
      alert('Employee updated successfully');
      router.back();
    } catch (error: any) {
      alert(error.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ---- Helpers ----
  const selectedRole = roles.find(r => r.role_id === roleId);
  const selectedPosition = positions.find(p => p.position_id === positionId);
  const selectedManager = managers.find(m => m.user_id === reportsTo);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Employee</h2>

        {/* Employee ID (read-only) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
          <input
            value={employeeId}
            disabled
            className={`w-full rounded-md border ${
              errors.employeeId ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed`}
          />
          {errors.employeeId && (
            <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>
          )}
        </div>

        {/* Role */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Role *</label>
          <button
            type="button"
            onClick={() => setRoleModalOpen(true)}
            className={`w-full flex justify-between items-center bg-white border ${
              errors.roleId ? 'border-red-500' : 'border-gray-300'
            } rounded-md px-3 py-2 text-left`}
          >
            <span className={roleId ? 'text-gray-900' : 'text-gray-400'}>
              {selectedRole?.role_name || 'Select a role'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
          {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId}</p>}
        </div>

        {/* Position */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Position *</label>
          <button
            type="button"
            onClick={() => setPositionModalOpen(true)}
            className={`w-full flex justify-between items-center bg-white border ${
              errors.positionId ? 'border-red-500' : 'border-gray-300'
            } rounded-md px-3 py-2 text-left`}
          >
            <span className={positionId ? 'text-gray-900' : 'text-gray-400'}>
              {selectedPosition?.title || 'Select a position'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
          {errors.positionId && <p className="text-red-500 text-xs mt-1">{errors.positionId}</p>}
        </div>

        {/* Reports To */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Reports To</label>
          <button
            type="button"
            onClick={() => setReportsToModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={reportsTo ? 'text-gray-900' : 'text-gray-400'}>
              {selectedManager
                ? selectedManager.full_name || selectedManager.username || selectedManager.user_id
                : 'None'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* Active Switch */}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-gray-700 font-medium">Active</span>
          <Switch value={isActive} onChange={setIsActive} />
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Employee'}
          </button>
        </div>
      </div>

      {/* ====== ROLE MODAL ====== */}
      <SelectModal
        isOpen={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false);
          setRoleSearch('');
        }}
        title="Select Role"
      >
        <div className="mb-2">
          <SearchInput
            value={roleSearch}
            onChange={setRoleSearch}
            placeholder="Search roles..."
          />
        </div>
        {roles
          .filter(r => r.role_name.toLowerCase().includes(roleSearch.toLowerCase()))
          .map(role => {
            const isSelected = roleId === role.role_id;
            return (
              <button
                key={role.role_id}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setRoleId(role.role_id);
                  setRoleModalOpen(false);
                  setRoleSearch('');
                }}
              >
                <span className={isSelected ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {role.role_name}
                </span>
                {isSelected && <FiCheck className="text-blue-600" />}
              </button>
            );
          })}
        {roles.length === 0 && <p className="text-gray-500 text-center py-4">No roles found</p>}
      </SelectModal>

      {/* ====== POSITION MODAL ====== */}
      <SelectModal
        isOpen={positionModalOpen}
        onClose={() => {
          setPositionModalOpen(false);
          setPositionSearch('');
        }}
        title="Select Position"
      >
        <div className="mb-2">
          <SearchInput
            value={positionSearch}
            onChange={setPositionSearch}
            placeholder="Search positions..."
          />
        </div>
        {positions
          .filter(p => p.title.toLowerCase().includes(positionSearch.toLowerCase()))
          .map(pos => {
            const isSelected = positionId === pos.position_id;
            return (
              <button
                key={pos.position_id}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setPositionId(pos.position_id);
                  setPositionModalOpen(false);
                  setPositionSearch('');
                }}
              >
                <span className={isSelected ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {pos.title}
                </span>
                {isSelected && <FiCheck className="text-blue-600" />}
              </button>
            );
          })}
        {positions.length === 0 && <p className="text-gray-500 text-center py-4">No positions found</p>}
      </SelectModal>

      {/* ====== REPORTS TO MODAL ====== */}
      <SelectModal
        isOpen={reportsToModalOpen}
        onClose={() => {
          setReportsToModalOpen(false);
          clearReportsToSearch();
        }}
        title="Select Manager"
      >
        <div className="flex items-center gap-2 mb-2">
          <SearchInput
            value={reportsToSearch}
            onChange={setReportsToSearch}
            placeholder="Search by username..."
            onSearch={handleReportsToSearch}
          />
          <button
            onClick={handleReportsToSearch}
            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
          >
            Search
          </button>
          {reportsTo && (
            <button
              onClick={() => {
                setReportsTo(null);
                setReportsToModalOpen(false);
                clearReportsToSearch();
              }}
              className="text-sm text-blue-600"
            >
              Clear
            </button>
          )}
        </div>
        {reportsToLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div>
            {reportsToResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {reportsToSearch ? 'No employee found' : 'No employees available'}
              </p>
            ) : (
              reportsToResults.map(emp => {
                const isSelected = reportsTo === emp.user_id;
                return (
                  <button
                    key={emp.user_id}
                    className={`w-full flex items-center gap-3 py-3 px-2 border-b border-gray-100 ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setReportsTo(emp.user_id);
                      setReportsToModalOpen(false);
                      clearReportsToSearch();
                    }}
                  >
                    <UserAvatar
                      userId={emp.user_id}
                      username={emp.username}
                      fullName={emp.full_name}
                      size={40}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-gray-800 font-medium">
                        {emp.full_name || emp.username || emp.user_id}
                      </p>
                      {emp.username && (
                        <p className="text-gray-400 text-sm">@{emp.username}</p>
                      )}
                      <p className="text-gray-400 text-sm">ID: {emp.employee_id || 'N/A'}</p>
                    </div>
                    {isSelected && <FiCheck className="text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </SelectModal>
    </div>
  );
}
```

# File: src/screens/module/administration/EditPositionScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

import { getPosition, updatePosition, getRootDepartments, listWorkCenters } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// ---- Types ----
type DepartmentItem = { department_id: string; department_name: string };
type WorkCenterItem = { work_center_code: string; name: string };

// ---- Zod Schema ----
const schema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  department_id: z.string().optional(),
  work_center_code: z.string().nullable().optional(),
  is_open: z.boolean().optional(),
  is_schedulable: z.boolean().optional(),
  attendance_required: z.boolean().optional(),
  overtime_allowed: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ---- Switch Component ----
const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ---- Modal for dropdown ----
const SelectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: Array<{ id: string; name: string }>;
  selectedId?: string;
  onSelect: (id: string) => void;
}> = ({ isOpen, onClose, title, items, selectedId, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <span className={isSelected ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {item.name}
                </span>
                {isSelected && <FiCheck className="text-blue-600" />}
              </button>
            );
          })}
          {items.length === 0 && <p className="text-gray-500 text-center py-4">No items found</p>}
        </div>
      </div>
    </div>
  );
};

export default function EditPositionScreen() {
  const router = useRouter();
  const { positionId } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenterItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [wcModalOpen, setWcModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      department_id: '',
      work_center_code: null,
      is_open: false,
      is_schedulable: false,
      attendance_required: false,
      overtime_allowed: false,
    },
  });

  const selectedDepartment = watch('department_id');
  const selectedWorkCenter = watch('work_center_code');

  useEffect(() => {
    if (!positionId || !accessToken || !companyId) {
      if (!positionId) alert('Position ID missing');
      router.back();
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setLoadingOptions(true);
      try {
        const [positionRes, deptRes, wcRes] = await Promise.all([
          getPosition(companyId, deviceId!, positionId as string, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
          listWorkCenters(companyId, deviceId!, { page: 1, page_size: 100 }, accessToken),
        ]);

        const position = positionRes.data;
        if (!position) {
          alert('Position not found');
          router.back();
          return;
        }

        setDepartments(deptRes.data || []);
        setWorkCenters(wcRes.data || []);

        reset({
          title: position.title,
          department_id: position.department_id,
          work_center_code: position.work_center_code || null,
          is_open: position.is_open,
          is_schedulable: position.is_schedulable,
          attendance_required: position.attendance_required,
          overtime_allowed: position.overtime_allowed,
        });
      } catch (error: any) {
        alert(error.message || 'Failed to load position');
        router.back();
      } finally {
        setLoading(false);
        setLoadingOptions(false);
      }
    };
    fetchData();
  }, [positionId]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) return;
    setSaving(true);
    try {
      const payload = {
        ...data,
        work_center_code: data.work_center_code ?? undefined,
      };
      await updatePosition(companyId, deviceId!, positionId as string, payload, accessToken);
      alert('Position updated');
      router.back();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentLabel = (id: string) =>
    departments.find(d => d.department_id === id)?.department_name || 'Select Department';
  const getWorkCenterLabel = (code: string) =>
    workCenters.find(w => w.work_center_code === code)?.name || 'Select Work Center (optional)';

  if (loading || loadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Position</h2>

        {/* Title */}
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Position Title *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
          )}
        />

        {/* Department Dropdown */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <button
            type="button"
            onClick={() => setDeptModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={selectedDepartment ? 'text-gray-900' : 'text-gray-400'}>
              {selectedDepartment ? getDepartmentLabel(selectedDepartment) : 'Select Department'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* Work Center Dropdown */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Work Center (optional)</label>
          <button
            type="button"
            onClick={() => setWcModalOpen(true)}
            className="w-full flex justify-between items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-left"
          >
            <span className={selectedWorkCenter ? 'text-gray-900' : 'text-gray-400'}>
              {selectedWorkCenter ? getWorkCenterLabel(selectedWorkCenter) : 'Select Work Center (optional)'}
            </span>
            <FiChevronDown className="text-gray-500" />
          </button>
        </div>

        {/* Switches */}
        <div className="mt-6 space-y-4">
          <Controller
            control={control}
            name="is_open"
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Open Position</span>
                <Switch value={value ?? false} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="is_schedulable"
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Schedulable</span>
                <Switch value={value ?? false} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="attendance_required"
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Attendance Required</span>
                <Switch value={value ?? false} onChange={onChange} />
              </div>
            )}
          />
          <Controller
            control={control}
            name="overtime_allowed"
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Overtime Allowed</span>
                <Switch value={value ?? false} onChange={onChange} />
              </div>
            )}
          />
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Position'}
          </button>
        </div>
      </div>

      {/* Department Modal */}
      <SelectModal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Select Department"
        items={departments.map(d => ({ id: d.department_id, name: d.department_name }))}
        selectedId={selectedDepartment}
        onSelect={(id) => setValue('department_id', id)}
      />

      {/* Work Center Modal */}
      <SelectModal
        isOpen={wcModalOpen}
        onClose={() => setWcModalOpen(false)}
        title="Select Work Center"
        items={workCenters.map(w => ({ id: w.work_center_code, name: w.name }))}
        selectedId={selectedWorkCenter || undefined}
        onSelect={(code) => setValue('work_center_code', code)}
      />
    </div>
  );
}
```

# File: src/screens/module/administration/EditRoleScreen.tsx

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiChevronDown, FiX, FiCheck, FiArrowLeft } from 'react-icons/fi';

import {
  getRole,
  updateRole,
  getRootDepartments,
  getRolePermissionsDetailed,
  getRoleDepartments,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// ---- Types ----
type DepartmentItem = { department_id: string; department_name: string; module_code?: string };
type PermissionItem = { permission_name: string; description: string; module: string };

// ---- Zod Schema ----
const schema = z.object({
  role_name: z.string().min(1, 'Role name is required').optional(),
  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000')
    .optional(),
  description: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditRoleScreen() {
  const router = useRouter();
  const { roleId } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  const [allDepartments, setAllDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Original data (for delta)
  const [originalDepartmentIds, setOriginalDepartmentIds] = useState<string[]>([]);
  const [originalPermissionNames, setOriginalPermissionNames] = useState<string[]>([]);

  // Current selections
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  // Permission cache
  const [permissionCache, setPermissionCache] = useState<Record<string, PermissionItem[]>>({});

  // Department modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [tempDeptIds, setTempDeptIds] = useState<string[]>([]);

  // Permission modal
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [tempPermsForModule, setTempPermsForModule] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role_name: '', role_level: 100, description: '' },
  });

  // Fetch data
  useEffect(() => {
    if (!roleId || !accessToken || !companyId) {
      if (!roleId) alert('Role ID missing');
      router.back();
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setLoadingDepartments(true);
      try {
        const [roleRes, deptRes, permRes, roleDeptRes] = await Promise.all([
          getRole(companyId, deviceId!, roleId as string, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
          getRolePermissionsDetailed(companyId, deviceId!, roleId as string, accessToken),
          getRoleDepartments(companyId, deviceId!, roleId as string, accessToken),
        ]);

        const role = roleRes.data;
        if (!role) {
          alert('Role not found');
          router.back();
          return;
        }

        setIsSystemRole(role.is_system_role);
        setAllDepartments(deptRes.data || []);

        const deptIds = (roleDeptRes.data || []).map(d => d.department_id);
        setOriginalDepartmentIds(deptIds);
        setSelectedDepartmentIds(deptIds);

        const perms = permRes.data || [];
        const permNames = perms.map(p => p.permission_name);
        setOriginalPermissionNames(permNames);
        const grouped: Record<string, string[]> = {};
        perms.forEach(p => {
          const mod = p.module || 'other';
          if (!grouped[mod]) grouped[mod] = [];
          grouped[mod].push(p.permission_name);
        });
        setSelectedPermissions(grouped);

        const cache: Record<string, PermissionItem[]> = {};
        perms.forEach(p => {
          const mod = p.module || 'other';
          if (!cache[mod]) cache[mod] = [];
          cache[mod].push(p);
        });
        setPermissionCache(cache);

        reset({
          role_name: role.role_name,
          role_level: role.role_level,
          description: role.description || '',
        });
      } catch (error: any) {
        alert(error.message || 'Failed to load role');
        router.back();
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };
    fetchData();
  }, [roleId]);

  // Fetch permissions for a module
  const fetchPermissionsForModule = useCallback(
    async (moduleCode: string): Promise<PermissionItem[]> => {
      if (permissionCache[moduleCode]) return permissionCache[moduleCode];
      if (!accessToken || !companyId) return [];
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Device-ID': deviceId!,
              'X-Company-ID': companyId,
            },
          }
        );
        const json = await response.json();
        const data = json.data || [];
        setPermissionCache(prev => ({ ...prev, [moduleCode]: data }));
        return data;
      } catch (error) {
        console.error('Failed to fetch permissions', error);
        alert('Could not load permissions');
        return [];
      }
    },
    [accessToken, companyId, deviceId, permissionCache]
  );

  // Department modal handlers
  const openDeptModal = () => {
    setTempDeptIds([...selectedDepartmentIds]);
    setDeptModalOpen(true);
  };

  const toggleTempDept = (id: string) => {
    setTempDeptIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleAllTempDepts = () => {
    if (tempDeptIds.length === allDepartments.length) {
      setTempDeptIds([]);
    } else {
      setTempDeptIds(allDepartments.map(d => d.department_id));
    }
  };

  const confirmDepartments = () => {
    setSelectedDepartmentIds(tempDeptIds);
    setDeptModalOpen(false);
  };

  // Permission modal handlers
  const openPermissionModal = () => {
    if (selectedDepartmentIds.length === 0) {
      alert('Please select at least one department first.');
      return;
    }
    setPermModalOpen(true);
    setCurrentModule(null);
  };

  const closePermissionModal = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
  };

  const handleDepartmentSelect = async (dept: DepartmentItem) => {
    if (!dept.module_code) {
      alert('This department does not have a module assigned.');
      return;
    }
    setCurrentModule(dept.module_code);
    setLoadingPermissions(true);
    await fetchPermissionsForModule(dept.module_code);
    setTempPermsForModule(selectedPermissions[dept.module_code] || []);
    setLoadingPermissions(false);
  };

  const toggleTempPermission = (permName: string) => {
    setTempPermsForModule(prev =>
      prev.includes(permName) ? prev.filter(p => p !== permName) : [...prev, permName]
    );
  };

  const toggleAllTempPermissions = () => {
    if (!currentModule) return;
    const perms = permissionCache[currentModule] || [];
    const allPermNames = perms.map(p => p.permission_name);
    const allSelected = allPermNames.every(p => tempPermsForModule.includes(p));
    if (allSelected) {
      setTempPermsForModule([]);
    } else {
      setTempPermsForModule(allPermNames);
    }
  };

  const saveModulePermissions = () => {
    if (!currentModule) return;
    setSelectedPermissions(prev => ({
      ...prev,
      [currentModule]: tempPermsForModule,
    }));
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const cancelDepartmentPermissions = () => {
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const confirmAllPermissions = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
  };

  // Submit
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) return;
    setSaving(true);
    try {
      // Compute add/remove department IDs (backend expects names)
      const addDeptIds = selectedDepartmentIds.filter(id => !originalDepartmentIds.includes(id));
      const removeDeptIds = originalDepartmentIds.filter(id => !selectedDepartmentIds.includes(id));

      const addDeptNames = addDeptIds.map(id => {
        const dept = allDepartments.find(d => d.department_id === id);
        return dept ? dept.department_name : id;
      });
      const removeDeptNames = removeDeptIds.map(id => {
        const dept = allDepartments.find(d => d.department_id === id);
        return dept ? dept.department_name : id;
      });

      const allSelectedPerms = Object.values(selectedPermissions).flat();
      const addPerms = allSelectedPerms.filter(p => !originalPermissionNames.includes(p));
      const removePerms = originalPermissionNames.filter(p => !allSelectedPerms.includes(p));

      const payload: any = {
        role_name: data.role_name,
        description: data.description,
        add_departments: addDeptNames,
        remove_departments: removeDeptNames,
        add_permissions: addPerms,
        remove_permissions: removePerms,
      };
      if (data.role_level !== undefined) payload.role_level = data.role_level;

      await updateRole(companyId, deviceId!, roleId as string, payload, accessToken);
      alert('Role updated successfully');
      router.back();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Helper to get department name by ID
  const getDeptName = (id: string) =>
    allDepartments.find(d => d.department_id === id)?.department_name || id;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {isSystemRole && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
            <p className="text-orange-700 text-sm">
              ⚠️ This is a system role. You can update its name, level, and description, but it cannot be deleted.
            </p>
          </div>
        )}

        {/* Role Name */}
        <Controller
          control={control}
          name="role_name"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Role Name *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${
                  errors.role_name ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.role_name && <p className="text-red-500 text-xs mt-1">{errors.role_name.message}</p>}
            </div>
          )}
        />

        {/* Role Level */}
        <Controller
          control={control}
          name="role_level"
          render={({ field: { onChange, onBlur, value } }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Role Level * (1-1000)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={value || ''}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (e.target.value === '' || isNaN(num)) {
                    onChange(undefined);
                  } else {
                    onChange(Math.min(Math.max(1, num), 1000));
                  }
                }}
                onBlur={onBlur}
                className={`w-full rounded-md border ${
                  errors.role_level ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.role_level && <p className="text-red-500 text-xs mt-1">{errors.role_level.message}</p>}
            </div>
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <textarea
                {...field}
                value={field.value ?? ''}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
          )}
        />

        {/* ---------- Department Selection ---------- */}
        <div className="mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">
              Departments ({selectedDepartmentIds.length} selected)
            </p>
            <button
              onClick={openDeptModal}
              className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700"
            >
              Select
            </button>
          </div>
          {selectedDepartmentIds.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No departments selected.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedDepartmentIds.slice(0, 5).map(id => (
                <span key={id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {getDeptName(id)}
                </span>
              ))}
              {selectedDepartmentIds.length > 5 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  +{selectedDepartmentIds.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* ---------- Permission Selection ---------- */}
        <div className="mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">
              Permissions ({Object.values(selectedPermissions).flat().length} selected)
            </p>
            <button
              onClick={openPermissionModal}
              disabled={selectedDepartmentIds.length === 0}
              className={`text-xs px-3 py-1 rounded-full ${
                selectedDepartmentIds.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Select
            </button>
          </div>
          {Object.keys(selectedPermissions).length === 0 ? (
            <p className="text-gray-500 text-sm italic">No permissions selected.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(selectedPermissions).slice(0, 5).map(([module, perms]) => (
                <span key={module} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {module}: {perms.length}
                </span>
              ))}
              {Object.keys(selectedPermissions).length > 5 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  +{Object.keys(selectedPermissions).length - 5} more modules
                </span>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Role'}
          </button>
        </div>
      </div>

      {/* ========== DEPARTMENT MODAL ========== */}
      {deptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setDeptModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-md max-h-[80%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">Select Departments</h3>
              <button onClick={() => setDeptModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            {/* Select All */}
            <div className="px-4 py-2 border-b border-gray-200">
              <button
                onClick={toggleAllTempDepts}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <input
                  type="checkbox"
                  checked={tempDeptIds.length === allDepartments.length && allDepartments.length > 0}
                  onChange={toggleAllTempDepts}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Select All
              </button>
            </div>

            <div className="p-2">
              {loadingDepartments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                allDepartments.map(dept => {
                  const checked = tempDeptIds.includes(dept.department_id);
                  return (
                    <div key={dept.department_id} className="flex items-center py-2 border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTempDept(dept.department_id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-gray-800">{dept.department_name}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={confirmDepartments}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Confirm ({tempDeptIds.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== PERMISSION MODAL ========== */}
      {permModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closePermissionModal}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-md max-h-[85%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
              <h3 className="font-semibold text-gray-800">
                {currentModule
                  ? `Permissions for ${allDepartments.find(d => d.module_code === currentModule)?.department_name || currentModule}`
                  : 'Select Permissions by Department'}
              </h3>
              <button onClick={closePermissionModal} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            {currentModule === null ? (
              // ---- Department list (to choose module) ----
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">Choose a department to assign permissions:</p>
                {selectedDepartmentIds.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No departments selected.</p>
                    <button
                      onClick={() => {
                        setPermModalOpen(false);
                        openDeptModal();
                      }}
                      className="mt-2 text-blue-600 underline"
                    >
                      Select Departments
                    </button>
                  </div>
                ) : (
                  allDepartments
                    .filter(d => selectedDepartmentIds.includes(d.department_id))
                    .map(dept => {
                      const count = dept.module_code
                        ? (selectedPermissions[dept.module_code] || []).length
                        : 0;
                      return (
                        <button
                          key={dept.department_id}
                          onClick={() => handleDepartmentSelect(dept)}
                          disabled={!dept.module_code}
                          className={`w-full flex items-center justify-between py-3 px-2 border-b border-gray-100 ${
                            dept.module_code ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-gray-800">{dept.department_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {count}
                            </span>
                            <FiChevronDown className="text-gray-400" />
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            ) : (
              // ---- Permission grid for selected module ----
              <>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
                  <button
                    onClick={cancelDepartmentPermissions}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <FiArrowLeft className="mr-1" /> Back
                  </button>
                  <button
                    onClick={toggleAllTempPermissions}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {tempPermsForModule.length === (permissionCache[currentModule] || []).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                {loadingPermissions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {(permissionCache[currentModule] || []).map(perm => {
                        const checked = tempPermsForModule.includes(perm.permission_name);
                        return (
                          <div
                            key={perm.permission_name}
                            onClick={() => toggleTempPermission(perm.permission_name)}
                            className={`border rounded-md p-2 cursor-pointer ${
                              checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="ml-2">
                                <p className="text-sm font-medium text-gray-800">{perm.permission_name}</p>
                                {perm.description && (
                                  <p className="text-xs text-gray-500">{perm.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(permissionCache[currentModule] || []).length === 0 && (
                        <p className="col-span-2 text-center text-gray-500 py-4">No permissions for this module.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 p-4 border-t border-gray-200">
                  <button
                    onClick={cancelDepartmentPermissions}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveModulePermissions}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                  >
                    Save ({tempPermsForModule.length})
                  </button>
                </div>
              </>
            )}

            {currentModule === null && (
              <div className="flex gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={closePermissionModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAllPermissions}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  Done ({Object.values(selectedPermissions).flat().length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

# File: src/screens/module/administration/EditWorkCenterScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getWorkCenterByCode, updateWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// ---- Switch ----
const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      value ? 'bg-blue-600' : 'bg-gray-300'
    }`}
    onClick={() => onChange(!value)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditWorkCenterScreen() {
  const router = useRouter();
  const { code } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', is_active: true },
  });

  useEffect(() => {
    if (!code || !accessToken || !companyId) {
      if (!code) alert('Work center code missing');
      router.back();
      return;
    }
    const fetchData = async () => {
      try {
        const response = await getWorkCenterByCode(companyId, deviceId!, code as string, accessToken);
        if (response.success && response.data) {
          reset({
            name: response.data.name,
            description: response.data.description || '',
            is_active: response.data.is_active,
          });
        } else {
          alert('Work center not found');
          router.back();
        }
      } catch (error: any) {
        alert(error.message || 'Failed to load work center');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [code]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.description !== undefined) payload.description = data.description?.trim() || '';
      if (data.is_active !== undefined) payload.is_active = data.is_active;

      const response = await updateWorkCenter(companyId, deviceId, code as string, payload, accessToken);
      if (response.success) {
        alert('Work center updated successfully');
        router.back();
      } else {
        alert(response.message || 'Update failed');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      alert(msg || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Work Center</h2>

        {/* Read-only code */}
        <div className="mt-4 flex justify-between items-center border-b border-gray-200 pb-2">
          <span className="text-sm font-medium text-gray-500">Code</span>
          <span className="text-gray-800 font-semibold">{code}</span>
        </div>

        {/* Name */}
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                {...field}
                className={`w-full rounded-md border ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
          )}
        />

        {/* Description */}
            <Controller
            control={control}
            name="description"
            render={({ field }) => (
                <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                <textarea
                    {...field}
                    value={field.value ?? ''}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
            )}
            />
        {/* Active Switch */}
        <Controller
          control={control}
          name="is_active"
          render={({ field: { value, onChange } }) => (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Active</span>
              <Switch value={value ?? false} onChange={onChange} />
            </div>
          )}
        />

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Work Center'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/EmployeeDetailScreen.tsx

```tsx
import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeDetails } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { useAvatar } from '../../../hooks/useAvatar';

// DetailRow component
const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex justify-between py-3 border-b border-gray-200">
    <span className="font-medium text-gray-700">{label}</span>
    <span className="text-gray-600">{value || '-'}</span>
  </div>
);

export default function EmployeeDetailScreen() {
  const router = useRouter();
  const { userId } = router.query; // from URL ?userId=...
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500">Invalid employee ID</p>
      </div>
    );
  }

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee', userId],
    queryFn: () => getEmployeeDetails(companyId!, userId as string, deviceId!, accessToken!),
    enabled: !!userId && !!accessToken && !!companyId && !!deviceId,
  });

  const { avatarUrl, isLoading: avatarLoading } = useAvatar(userId as string);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500">Could not load employee data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <UserAvatar
            userId={userId as string}
            username={employee.username}
            fullName={employee.full_name}
            avatarUrl={avatarUrl}
            loading={avatarLoading}
            size={80}
          />
          <h2 className="text-xl font-bold text-gray-800 mt-2">
            {employee.full_name || 'Unnamed'}
          </h2>
          {employee.username && (
            <p className="text-gray-500">@{employee.username}</p>
          )}
          <div className="mt-2 px-3 py-1 rounded-full bg-gray-200">
            <span className={employee.is_active ? 'text-green-600' : 'text-red-600'}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="border-t border-gray-200 pt-4">
          <DetailRow label="Employee ID" value={employee.employee_id} />
          <DetailRow label="Role" value={employee.role_name} />
          <DetailRow label="Position" value={employee.position_title} />
          <DetailRow label="Department" value={employee.department_name} />
          <DetailRow label="Work Center" value={employee.work_center_code} />
          <DetailRow
            label="Hire Date"
            value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
          />
          <DetailRow label="Company" value={employee.company_id} />
        </div>

        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/EmployeeSearchScreen.tsx

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  axiosInstance,
  listRoles,
  getRootDepartments,
  findEmployeeByUsername,
  advancedSearchEmployees,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee, Role, Department } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';
import { FiSearch, FiX, FiChevronDown, FiChevronRight, FiCheck } from 'react-icons/fi';

// ---- Reusable SelectModal ----
const SelectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: Array<{ id: string; name: string }>;
  selectedId?: string;
  onSelect: (id: string) => void;
}> = ({ isOpen, onClose, title, items, selectedId, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl w-full max-w-md max-h-[70%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        <div className="p-2">
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                className={`w-full flex justify-between items-center py-3 px-2 border-b border-gray-100 ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <span className={isSelected ? 'text-blue-600 font-semibold' : 'text-gray-800'}>
                  {item.name}
                </span>
                {isSelected && <FiCheck className="text-blue-600" />}
              </button>
            );
          })}
          {items.length === 0 && <p className="text-gray-500 text-center py-4">No items found</p>}
        </div>
      </div>
    </div>
  );
};

export default function EmployeeSearchScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // ---- Search state ----
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // ---- Filter state ----
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);

  // ---- Dropdown data ----
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // ---- Modal visibility ----
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);

  // ---- Fetch filters ----
  useEffect(() => {
    const fetchFilters = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingFilters(false);
        return;
      }
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          listRoles(companyId, deviceId, { page: 1, limit: 100 }, accessToken),
          getRootDepartments(companyId, deviceId!, accessToken),
        ]);
        setRoles(rolesRes.data?.roles || []);
        setDepartments(deptsRes.data || []);
      } catch (error) {
        console.error('Failed to load filters', error);
        alert('Could not load department/role options');
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, [accessToken, companyId, deviceId]);

  // ---- Core load function ----
  const loadEmployees = useCallback(
    async (reset = true, loadMore = false) => {
      if (!accessToken || !companyId || !deviceId) return;

      const currentOffset = reset ? 0 : offset;
      setLoading(true);

      try {
        const hasSearch = searchQuery.trim().length > 0;
        const hasFilters = !!(selectedRoleId || selectedDeptId);

        if (hasSearch) {
          try {
            const res = await findEmployeeByUsername(
              companyId,
              deviceId,
              searchQuery.trim(),
              accessToken
            );
            const employee = (res.data as any)?.employee || null;
            setEmployees(employee ? [employee] : []);
            setOffset(1);
            setHasMore(false);
            setLoading(false);
            setRefreshing(false);
            return;
          } catch (err: any) {
            setEmployees([]);
            setOffset(0);
            setHasMore(false);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }

        if (hasFilters) {
          const params: any = { limit, offset: currentOffset };
          if (selectedRoleId) params.role_id = selectedRoleId;
          if (selectedDeptId) params.department_id = selectedDeptId;

          const res = await advancedSearchEmployees(
            companyId,
            deviceId,
            params,
            accessToken
          );
          const data = res.data?.employees || [];
          if (reset) {
            setEmployees(data);
            setOffset(data.length);
            setHasMore(data.length === limit);
          } else {
            setEmployees(prev => [...prev, ...data]);
            setOffset(prev => prev + data.length);
            setHasMore(data.length === limit);
          }
          setLoading(false);
          setRefreshing(false);
          return;
        }

        // No search, no filters: get all employees
        const url = `/companies/${companyId}/getemployees`;
        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const response = await axiosInstance.get(url, {
          headers,
          params: { limit, offset: currentOffset },
        });
        const data = response.data?.data?.employees || [];
        if (reset) {
          setEmployees(data);
          setOffset(data.length);
          setHasMore(data.length === limit);
        } else {
          setEmployees(prev => [...prev, ...data]);
          setOffset(prev => prev + data.length);
          setHasMore(data.length === limit);
        }
      } catch (error: any) {
        alert(error.message || 'Failed to load employees');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, searchQuery, selectedRoleId, selectedDeptId, offset, limit]
  );

  // ---- Trigger on filter/search change ----
  useEffect(() => {
    setOffset(0);
    loadEmployees(true);
  }, [searchQuery, selectedRoleId, selectedDeptId]);

  // ---- Refresh ----
  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    loadEmployees(true);
  };

  // ---- Load more ----
  const loadMore = () => {
    if (!loading && hasMore && !refreshing && !searchQuery.trim()) {
      loadEmployees(false, true);
    }
  };

  // ---- Clear filters ----
  const clearFilters = () => {
    setSelectedRoleId(undefined);
    setSelectedDeptId(undefined);
    setSearchTerm('');
    setSearchQuery('');
  };

  // ---- Perform search ----
  const performSearch = () => {
    setSearchQuery(searchTerm);
  };

  // ---- Render item ----
  const renderItem = (item: CompanyEmployee) => {
    const displayName = item.full_name || item.username || 'Unnamed';
    return (
      <div
        key={item.user_id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 flex items-center cursor-pointer hover:bg-gray-50"
        onClick={() => router.push(`/module/administration/employee-detail?userId=${item.user_id}`)}
      >
        <UserAvatar
          userId={item.user_id}
          username={item.username}
          fullName={item.full_name}
          size={48}
          className="mr-3"
        />
        <div className="flex-1">
          <p className="font-medium text-gray-800">{displayName}</p>
          {item.username && <p className="text-sm text-gray-500">@{item.username}</p>}
          <p className="text-sm text-gray-500">ID: {item.employee_id || 'N/A'}</p>
        </div>
        <FiChevronRight className="text-gray-400" size={20} />
      </div>
    );
  };

  if (loadingFilters) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 mb-3">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by exact username"
            className="flex-1 outline-none text-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchQuery('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={18} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setRoleModalOpen(true)}
            className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            {selectedRoleId
              ? roles.find(r => r.role_id === selectedRoleId)?.role_name || 'Role'
              : 'All Roles'}
            <FiChevronDown className="ml-1" size={16} />
          </button>

          <button
            onClick={() => setDeptModalOpen(true)}
            className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            {selectedDeptId
              ? departments.find(d => d.department_id === selectedDeptId)?.department_name || 'Department'
              : 'All Departments'}
            <FiChevronDown className="ml-1" size={16} />
          </button>

          {(selectedRoleId || selectedDeptId || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading && employees.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {employees.length === 0 ? (
              <div className="text-center py-12">
                <FiSearch className="mx-auto text-gray-300" size={64} />
                <p className="text-gray-500 mt-4">
                  {searchQuery || selectedRoleId || selectedDeptId
                    ? 'No employees found matching your criteria'
                    : 'Search for an employee by exact username'}
                </p>
              </div>
            ) : (
              <div>
                {employees.map(renderItem)}
                {loading && employees.length > 0 && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                )}
                {hasMore && !loading && (
                  <button
                    onClick={loadMore}
                    className="w-full text-center text-blue-600 py-2 hover:underline"
                  >
                    Load more
                  </button>
                )}
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {refreshing ? (
                    <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
                  ) : (
                    <FiSearch size={20} />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Role Modal */}
      <SelectModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Filter by Role"
        items={[
          { id: '', name: 'All Roles' },
          ...roles.map(r => ({ id: r.role_id, name: r.role_name })),
        ]}
        selectedId={selectedRoleId || ''}
        onSelect={(id) => setSelectedRoleId(id || undefined)}
      />

      {/* Department Modal */}
      <SelectModal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Filter by Department"
        items={[
          { id: '', name: 'All Departments' },
          ...departments.map(d => ({ id: d.department_id, name: d.department_name })),
        ]}
        selectedId={selectedDeptId || ''}
        onSelect={(id) => setSelectedDeptId(id || undefined)}
      />
    </div>
  );
}
```

# File: src/screens/module/administration/EmployeesListScreen.tsx

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCompanyEmployees, findEmployeeByUsername } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';
import { FiPlus, FiSearch, FiX, FiEdit2 } from 'react-icons/fi';

export default function EmployeesListScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmployees = useCallback(
    async (query?: string) => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoading(true);
      try {
        let employeesData: CompanyEmployee[] = [];
        if (query && query.trim()) {
          try {
            const res = await findEmployeeByUsername(
              companyId,
              deviceId,
              query.trim(),
              accessToken
            );
            const employee = (res.data as any)?.employee || null;
            employeesData = employee ? [employee] : [];
          } catch {
            employeesData = [];
          }
        } else {
          const res = await getCompanyEmployees(companyId, deviceId, accessToken);
          employeesData = res.data?.employees || [];
        }
        setEmployees(employeesData);
      } catch (error: any) {
        alert(error.message || 'Failed to load employees');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId]
  );

  useEffect(() => {
    fetchEmployees(searchQuery);
  }, [fetchEmployees, searchQuery]);

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const renderItem = (item: CompanyEmployee) => {
    const displayName = item.full_name || item.username || 'Unnamed';
    return (
      <div
        key={item.user_id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 flex items-center justify-between"
      >
        <div className="flex items-center">
          <UserAvatar
            userId={item.user_id}
            username={item.username}
            fullName={item.full_name}
            size={48}
            className="mr-3"
          />
          <div>
            <p className="font-medium text-gray-800">{displayName}</p>
            <p className="text-sm text-gray-500">ID: {item.employee_id}</p>
          </div>
        </div>
        <button
          onClick={() =>
            router.push(`/module/administration/edit-employee?userId=${item.user_id}`)
          }
          className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"
        >
          <FiEdit2 size={20} />
        </button>
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 mb-4">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by exact username"
            className="flex-1 outline-none text-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="text-gray-400 hover:text-gray-600">
              <FiX size={18} />
            </button>
          )}
        </div>

        {/* List */}
        {employees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">
              {searchQuery ? 'No matching employee' : 'No employees yet'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 mt-1">Tap + button to add one</p>
            )}
          </div>
        ) : (
          <div>{employees.map(renderItem)}</div>
        )}

        {/* Refresh button */}
        <button
          onClick={() => {
            setRefreshing(true);
            fetchEmployees(searchQuery);
          }}
          disabled={refreshing}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing ? (
            <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
          ) : (
            <FiSearch size={20} />
          )}
        </button>

        {/* Add button (FAB) */}
        <button
          onClick={() => router.push('/module/administration/add-employee')}
          className="fixed bottom-20 right-6 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700"
        >
          <FiPlus size={24} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/PositionsListScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { listPositions, deletePosition } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Position } from '@b2b/shared-types';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw } from 'react-icons/fi';

export default function PositionsListScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPositions = async () => {
    if (!accessToken || !companyId) return;
    setLoading(true);
    try {
      const res = await listPositions(
        companyId,
        deviceId!,
        { limit: 100, offset: 0 },
        accessToken
      );
      setPositions(res.data?.positions || []);
    } catch (error: any) {
      alert(error.message || 'Failed to load positions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this position?')) return;
    (async () => {
      try {
        await deletePosition(companyId!, deviceId!, id, accessToken!);
        fetchPositions();
      } catch (error: any) {
        alert(error.message);
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Positions</h2>
          <button
            onClick={() => router.push('/module/administration/create-position')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Position
          </button>
        </div>

        {positions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No positions found. Create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <div
                key={pos.position_id}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200"
              >
                <div>
                  <h3 className="font-medium text-gray-800">{pos.title}</h3>
                  <p className="text-sm text-gray-500">Department: {pos.department_id}</p>
                  {pos.work_center_code && (
                    <p className="text-sm text-gray-500">Work Center: {pos.work_center_code}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      pos.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {pos.is_open ? 'Open' : 'Closed'}
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      pos.is_schedulable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {pos.is_schedulable ? 'Schedulable' : 'Not Schedulable'}
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      pos.attendance_required ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {pos.attendance_required ? 'Attend. Req.' : 'No Attend.'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/module/administration/edit-position?positionId=${pos.position_id}`)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(pos.position_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={fetchPositions}
          disabled={refreshing}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={24} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/RolesListScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { listRoles, deleteRole } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role } from '@b2b/shared-types';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw } from 'react-icons/fi';

export default function RolesListScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoles = async () => {
    if (!accessToken || !companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listRoles(
        companyId,
        deviceId!,
        { page: 1, limit: 50 },
        accessToken
      );
      setRoles(res.data?.roles || []);
    } catch (error: any) {
      alert(error.message || 'Failed to load roles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    (async () => {
      try {
        await deleteRole(companyId!, deviceId!, id, accessToken!);
        fetchRoles();
      } catch (error: any) {
        alert(error.response?.data?.message || error.message);
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Roles</h2>
          <button
            onClick={() => router.push('/module/administration/create-role')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Role
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No roles found. Create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.role_id}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200"
              >
                <div>
                  <h3 className="font-medium text-gray-800">{role.role_name}</h3>
                  <p className="text-sm text-gray-500">Level: {role.role_level}</p>
                  {role.description && (
                    <p className="text-sm text-gray-500 truncate max-w-sm">{role.description}</p>
                  )}
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                    role.is_system_role
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {role.is_system_role ? 'System Role' : 'Custom Role'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/module/administration/edit-role?roleId=${role.role_id}`)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleDelete(role.role_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={fetchRoles}
          disabled={refreshing}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={24} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/UserPhoneScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getUserPhone, findEmployeeByUsername } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { FiSearch, FiX, FiPhone, FiMessageSquare, FiUser } from 'react-icons/fi';

export default function UserPhoneScreen() {
  const router = useRouter();
  const { userId: initialUserId, userName: initialUserName } = router.query;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    initialUserId as string | undefined
  );
  const [selectedUserName, setSelectedUserName] = useState<string | undefined>(
    initialUserName as string | undefined
  );
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch phone when userId changes
  useEffect(() => {
    const fetchPhone = async () => {
      if (!selectedUserId || !accessToken || !companyId || !deviceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const phoneNumber = await getUserPhone(companyId, selectedUserId, deviceId, accessToken);
        setPhone(phoneNumber || 'No phone number found');
      } catch (error) {
        console.error('Failed to fetch phone', error);
        alert('Could not retrieve phone number.');
        setPhone('Error');
      } finally {
        setLoading(false);
      }
    };
    fetchPhone();
  }, [selectedUserId, accessToken, companyId, deviceId]);

  // Handle search by username
  const handleSearch = async () => {
    if (!searchTerm.trim() || !accessToken || !companyId || !deviceId) return;
    setIsSearching(true);
    try {
      const res = await findEmployeeByUsername(
        companyId,
        deviceId,
        searchTerm.trim(),
        accessToken
      );
      const employee = (res.data as any)?.employee || null;
      if (employee) {
        setSelectedUserId(employee.user_id);
        setSelectedUserName(employee.full_name || employee.username);
        setSearchTerm('');
        // Clear phone to trigger loading
        setPhone(null);
        setLoading(true);
      } else {
        alert('No employee found with that username.');
      }
    } catch (error) {
      alert('Could not search for employee.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedUserId(undefined);
    setSelectedUserName(undefined);
    setPhone(null);
  };

  // ---- Render when no user selected ----
  if (!selectedUserId) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-center text-gray-800 mb-2">
            Search for an Employee
          </h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            Enter the exact username to view their phone number.
          </p>
          <div className="flex items-center border border-gray-300 rounded-md">
            <input
              type="text"
              placeholder="Username"
              className="flex-1 px-3 py-2 outline-none text-gray-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? (
                <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
              ) : (
                <FiSearch size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render user phone details ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isPhoneValid = phone && phone !== 'No phone number found' && phone !== 'Error';

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center">
          <UserAvatar
            userId={selectedUserId}
            username={selectedUserName}
            fullName={selectedUserName}
            size={72}
            className="mb-3"
          />
          <h2 className="text-xl font-bold text-gray-800">{selectedUserName || 'User'}</h2>
          <button
            onClick={handleClearSelection}
            className="text-blue-600 text-sm mt-1 hover:underline"
          >
            Change User
          </button>

          <div className="flex items-center mt-4 mb-6">
            <FiPhone className="text-blue-600 mr-3" size={28} />
            <span className="text-2xl font-semibold text-gray-800">{phone}</span>
          </div>

          <div className="flex gap-4 w-full">
            <button
              onClick={() => window.location.href = `tel:${phone}`}
              disabled={!isPhoneValid}
              className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 ${
                isPhoneValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiPhone size={18} /> Call
            </button>
            <button
              onClick={() => window.location.href = `sms:${phone}`}
              disabled={!isPhoneValid}
              className={`flex-1 py-2 rounded-md border flex items-center justify-center gap-2 ${
                isPhoneValid
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiMessageSquare size={18} /> Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

# File: src/screens/module/administration/WorkCentersListScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { listWorkCenters, searchWorkCenters, deleteWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';

type WorkCenter = {
  work_center_code: string;
  name: string;
  description?: string;
  is_active: boolean;
};

export default function WorkCentersListScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchWorkCenters = async () => {
    if (!accessToken || !companyId) {
      console.warn('Missing token or companyId');
      return;
    }
    setLoading(true);
    try {
      const res = await listWorkCenters(
        companyId,
        deviceId!,
        { page: 1, page_size: 100 },
        accessToken
      );
      const data = res.data || [];
      setWorkCenters(data);
      setFilteredCenters(data);
    } catch (error: any) {
      alert(error.message || 'Failed to load work centers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkCenters();
  }, []);

  const performSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCenters(workCenters);
      return;
    }
    setSearching(true);
    try {
      const res = await searchWorkCenters(
        companyId!,
        deviceId!,
        { name: query, page: 1, page_size: 100 },
        accessToken!
      );
      const data = res.data || [];
      setFilteredCenters(data);
    } catch (error: any) {
      // fallback to local filtering
      const filtered = workCenters.filter(
        (wc) =>
          wc.name.toLowerCase().includes(query.toLowerCase()) ||
          wc.work_center_code.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCenters(filtered);
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = (code: string) => {
    if (!confirm('Are you sure you want to delete this work center?')) return;
    (async () => {
      try {
        await deleteWorkCenter(companyId!, deviceId!, code, accessToken!);
        await fetchWorkCenters();
      } catch (error: any) {
        alert(error.message || 'Failed to delete');
      }
    })();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Work Centers</h2>
          <button
            onClick={() => router.push('/module/administration/create-work-center')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <FiPlus /> Add Work Center
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 mb-4">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name or code"
            className="flex-1 outline-none text-gray-800"
            value={searchQuery}
            onChange={(e) => performSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => performSearch('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={18} />
            </button>
          )}
          {searching && (
            <div className="ml-2 animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full" />
          )}
        </div>

        {/* List */}
        {filteredCenters.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">
              {searchQuery ? 'No matching work centers' : 'No work centers yet'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 mt-1">Tap + button to create one</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCenters.map((wc) => (
              <div
                key={wc.work_center_code}
                className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200"
              >
                <div>
                  <h3 className="font-medium text-gray-800">{wc.name}</h3>
                  <p className="text-sm text-gray-500">Code: {wc.work_center_code}</p>
                  {wc.description && (
                    <p className="text-sm text-gray-500 truncate max-w-sm">{wc.description}</p>
                  )}
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                    wc.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {wc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/module/administration/edit-work-center?code=${wc.work_center_code}`)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(wc.work_center_code)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={fetchWorkCenters}
          disabled={refreshing}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={24} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/screens/module/chat/ChatScreen.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import { sendChatMessage } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// ---- Types ----
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! How can I assist you with payroll today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (!accessToken || !deviceId) {
      alert('Missing authentication or device information. Please log in again.');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(
        trimmed,
        accessToken,
        deviceId,
        companyId || ''
      );

      let assistantMsg: Message;
      if (response.success) {
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message || 'Operation completed.',
        };
        if (response.data) {
          assistantMsg.content += '\n\n' + JSON.stringify(response.data, null, 2);
        }
      } else {
        let errorMessage = response.message || 'An error occurred.';
        if (response.type === 'session_error') {
          errorMessage = 'Session expired. Please log in again.';
        } else if (response.type === 'permission_error') {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.type === 'tool_error') {
          errorMessage = 'Tool execution failed: ' + errorMessage;
        }
        assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: errorMessage,
          isError: true,
        };
      }
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: error?.response?.data?.message || error.message || 'Network error',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between shadow-md">
        <button
          onClick={() => router.back()}
          className="text-white hover:bg-white/20 p-2 rounded-full transition"
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-semibold">Payroll Assistant</h1>
        <div className="w-10" /> {/* spacer for alignment */}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isError = msg.role === 'system' && msg.isError;

          let bubbleClasses = 'max-w-[80%] px-4 py-3 rounded-lg shadow-sm';
          if (isUser) {
            bubbleClasses += ' ml-auto bg-blue-600 text-white';
          } else if (isError) {
            bubbleClasses += ' mx-auto bg-red-500 text-white text-center';
          } else {
            bubbleClasses += ' mr-auto bg-white border border-gray-200 text-gray-800';
          }

          return (
            <div key={msg.id} className={bubbleClasses}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          );
        })}
        {loading && (
          <div className="max-w-[80%] mr-auto bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-end gap-2">
        <textarea
          className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={`p-3 rounded-full transition ${
            !input.trim() || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
}
```

# File: src/styles/css/dashboard.css

```css
/* Dashboard – white background, horizontal cyan→purple gradient */
.dashboard-container {
    min-height: 100vh;
    background: #f5f7fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .dashboard-header {
    background: white;
    padding: 1rem 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .dashboard-header h1 {
    color: #1A1A1A;
    margin: 0;
    font-size: 1.6rem;
    font-weight: 700;
    /* Horizontal gradient text – same as mobile app */
    background: linear-gradient(to right, #00B4DB, #7B2FBE);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .logout-button {
    background: linear-gradient(to right, #00B4DB, #7B2FBE) !important;
    color: white !important;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: opacity 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 180, 219, 0.25);
  }
  
  .logout-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .dashboard-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .welcome-section,
  .company-info,
  .quick-actions {
    background: white;
    padding: 2rem 2.5rem;
    border-radius: 16px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    border: 1px solid #f0f0f0;
  }
  
  .welcome-section h2 {
    color: #1A1A1A;
    margin-bottom: 0.5rem;
    font-size: 1.8rem;
    font-weight: 700;
  }
  
  .welcome-section p {
    color: #666;
    font-size: 1rem;
  }
  
  .company-info {
    border-left: 6px solid #7B2FBE; /* purple accent */
  }
  
  .company-info h3,
  .quick-actions h3 {
    color: #1A1A1A;
    margin-bottom: 1.5rem;
    font-size: 1.3rem;
    font-weight: 600;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 0.5rem;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .info-item {
    background: #fafafa;
    padding: 1.25rem;
    border-radius: 12px;
    border-left: 4px solid #00B4DB; /* cyan accent */
    transition: all 0.2s ease;
  }
  
  .info-item:hover {
    background: #f0f4ff;
    transform: translateY(-2px);
  }
  
  .info-item label {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
    display: block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .info-item span {
    color: #555;
    font-size: 1rem;
    word-break: break-word;
  }
  
  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .action-button {
    background: linear-gradient(to right, #00B4DB, #7B2FBE) !important;
    color: white !important;
    border: none;
    padding: 1.25rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s ease, transform 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 180, 219, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70px;
  }
  
  .action-button:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }
  
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    font-size: 1rem;
    color: #666;
  }
  
  .loading::after {
    content: '';
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #7B2FBE;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-left: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .dashboard-header {
      padding: 1rem;
      flex-direction: column;
      gap: 0.8rem;
    }
    .dashboard-header h1 { font-size: 1.4rem; }
    .dashboard-content { padding: 1rem; }
    .welcome-section, .company-info, .quick-actions {
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .info-grid { grid-template-columns: 1fr; }
    .action-grid { grid-template-columns: 1fr; }
    .action-button { padding: 1rem; min-height: 60px; }
  }
  
  @media (max-width: 480px) {
    .dashboard-header h1 { font-size: 1.2rem; }
    .welcome-section h2 { font-size: 1.4rem; }
    .info-item { padding: 1rem; }
  }
```

# File: src/styles/css/qr-login.css

```css
/* QR Login Page – matches mobile app colors with horizontal gradient */
.qr-login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f5f7fa;
    padding: 20px;
  }
  
  .qr-login-card {
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    text-align: center;
    max-width: 420px;
    width: 100%;
  }
  
  /* Heading with gradient text – matches mobile app */
  .brand-heading {
    background: linear-gradient(to right, #00B4DB, #7B2FBE);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 6px;
    display: inline-block;
  }
  
  /* Or if you prefer a solid background block with white text:
     .brand-gradient { background: linear-gradient(to right, #00B4DB, #7B2FBE); ... }
     but the above is cleaner.
  */
  
  .login-subtitle {
    color: #666;
    margin-bottom: 30px;
    font-size: 1rem;
  }
  
  .qr-section {
    margin: 30px 0;
  }
  
  .qr-code-container {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    padding: 16px;
    background: #fafafa;
    border-radius: 12px;
    border: 1px solid #eee;
  }
  
  .status-section {
    margin-top: 20px;
  }
  
  /* Status indicator – solid colors (no gradient) */
  .status-indicator {
    padding: 12px 20px;
    border-radius: 25px;
    color: white;
    font-weight: 600;
    margin-bottom: 15px;
    transition: all 0.3s ease;
    background: #7B2FBE; /* fallback – overridden inline */
  }
  
  /* BUTTONS – horizontal gradient (to right) */
  .confirm-button,
  .retry-button {
    background: linear-gradient(to right, #00B4DB, #7B2FBE) !important;
    color: white !important;
    border: none;
    padding: 12px 30px;
    border-radius: 25px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s ease;
    margin: 5px;
    box-shadow: 0 4px 12px rgba(0, 180, 219, 0.3);
  }
  
  .confirm-button:hover,
  .retry-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .confirm-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  .error-message {
    background: #FF5252;
    color: white;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95rem;
  }
  
  .error-message .retry-button {
    background: white !important;
    color: #FF5252 !important;
    box-shadow: none;
    padding: 6px 16px;
    font-size: 0.85rem;
  }
  
  /* Optional: if you need a solid gradient block (e.g., for a badge) */
  .brand-gradient {
    display: inline-block;
    background: linear-gradient(to right, #00B4DB, #7B2FBE);
    padding: 6px 20px;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  
  .brand-gradient h1 {
    color: white;
    font-size: 1.8rem;
    font-weight: 900;
    letter-spacing: 2px;
    margin: 0;
  }
  
  .help-text {
    margin-top: 24px;
    color: #888;
    font-size: 0.85rem;
  }
  
  .loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    font-size: 1rem;
    color: #666;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .qr-login-container { padding: 16px; }
    .qr-login-card { padding: 24px; }
    .brand-heading { font-size: 1.6rem; }
    .brand-gradient h1 { font-size: 1.4rem; }
  }
  
  @media (max-width: 480px) {
    .qr-code-container { padding: 8px; }
    .qr-code-container canvas { width: 200px !important; height: 200px !important; }
  }
```

# File: src/styles/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  min-height: 100vh;
}
```

# File: tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx}',
      './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  };
```

