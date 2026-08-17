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