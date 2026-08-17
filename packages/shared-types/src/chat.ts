// Chat message roles
export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  id: string;
  user_id: string;
  company_id?: string | null;
  role: ChatRole;
  content: string;
  tool_name?: string | null;
  tool_success?: boolean | null;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  arguments?: Record<string, any>;
}

// Response from the chatbot backend
export interface ChatResponse {
  success: boolean;
  type: 'text' | 'session_error' | 'permission_error' | 'tool_error';
  message: string;
  data?: any;
}