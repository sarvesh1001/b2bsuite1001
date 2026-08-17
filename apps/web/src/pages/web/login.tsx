import React, { useState, useEffect } from 'react'; // ✅ default import added
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { generateQR, getStatus, confirmPairing, QRResponse, StatusResponse } from '../../services/webLogin';
import { useWebSocket } from '../../hooks/useWebSocket';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { useUserAuthStore } from '../../store/userAuthStore';

// ---------- Helper: decode JWT ----------
function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

interface AuthPayload {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    id: string;
    name?: string;
    email?: string;
    phone_number?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const WebLoginPage: NextPage = () => {
  const router = useRouter();
  const store = useUserAuthStore();
  const { isAuthenticated } = useUserAuthStore(); // read auth state

  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  const sessionId = qrData?.session_id || null;
  const { messages } = useWebSocket(sessionId);

  // Generate QR only if NOT already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
      return;
    }

    const fetchQR = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await generateQR();
        setQrData(data);
        const statusData = await getStatus(data.session_id);
        setStatus(statusData);
      } catch (err: any) {
        console.error('[WebLoginPage] fetchQR error:', err);
        setError(err.message || 'Failed to generate QR code');
      } finally {
        setLoading(false);
      }
    };
    fetchQR();
  }, [isAuthenticated, router]);

  // ----- Handle successful login -----
  const handleSuccessfulLogin = async (payload: AuthPayload, source: 'websocket' | 'http') => {
    console.log(`[WebLoginPage] handleSuccessfulLogin from ${source}`);
    console.log('[WebLoginPage] Payload:', payload);

    const { access_token, refresh_token, user, expires_in } = payload;

    if (!access_token || !refresh_token) {
      console.error('[WebLoginPage] Missing tokens');
      setError('Invalid login response: missing tokens');
      return;
    }

    const decoded = parseJWT(access_token);
    console.log('[WebLoginPage] Decoded JWT:', decoded);

    const deviceId = decoded?.device_id || decoded?.deviceId;
    const companyId = decoded?.company_id || decoded?.companyId;
    const userId = decoded?.user_id || decoded?.userId || decoded?.sub;
    const permissions = decoded?.permissions || [];

    const userObj = user || {
      user_id: userId,
      ...decoded?.user,
    };

    store.login(
      access_token,
      refresh_token,
      userObj,
      deviceId,
      companyId || userObj.company_id,
      permissions
    );

    if (expires_in) {
      localStorage.setItem('token_expiry', String(Date.now() + expires_in * 1000));
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('[WebLoginPage] Redirecting to /dashboard');
    router.replace('/dashboard');
  };

  // WebSocket messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.type === 'status_update' && lastMsg.payload) {
      setStatus(lastMsg.payload);
    } else if (lastMsg.type === 'paired' && lastMsg.payload) {
      handleSuccessfulLogin(lastMsg.payload, 'websocket');
    }
  }, [messages]);

  // Manual confirm
  const handleConfirm = async () => {
    if (!sessionId) return;
    setConfirming(true);
    try {
      const payload = await confirmPairing(sessionId) as AuthPayload;
      await handleSuccessfulLogin(payload, 'http');
    } catch (err: any) {
      console.error('[WebLoginPage] confirmPairing error:', err);
      setError(err.message || 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleRetry = () => window.location.reload();

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

  const getStatusColor = () => {
    if (!status) return '#7B2FBE';
    switch (status.status) {
      case 'pending': return '#7B2FBE';
      case 'scanned': return '#00B4DB';
      case 'paired':  return '#22c55e';
      case 'expired': return '#ef4444';
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

                {userInfo && (
                  <div className="user-info">
                    Welcome, {userInfo.name || userInfo.email || userInfo.full_name || 'User'}!
                  </div>
                )}

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