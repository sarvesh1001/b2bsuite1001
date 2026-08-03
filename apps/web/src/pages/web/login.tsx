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