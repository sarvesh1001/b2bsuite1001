import { useEffect, useRef, useState } from 'react';
import { StatusResponse } from '../services/webLogin';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
// Just replace protocol; keep the full path including /v1
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export function useWebSocket(sessionId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = `${WS_BASE}/web/login/ws?session_id=${sessionId}`;
    console.log('🔌 [WebSocket] Connecting to:', wsUrl); // helpful for debugging

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log('✅ WebSocket connected');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch (e) {
        console.error('❌ WebSocket parse error', e);
      }
    };
    ws.onerror = (err) => {
      console.error('❌ WebSocket error', err);
      console.error('   readyState:', ws.readyState);
      console.error('   URL:', ws.url);
    };
    ws.onclose = () => console.log('🔌 WebSocket closed');

    return () => {
      ws.close();
    };
  }, [sessionId]);

  return { messages };
}