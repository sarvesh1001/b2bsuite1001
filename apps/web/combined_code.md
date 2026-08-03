# Combined Source Code

Total Files: 15

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

