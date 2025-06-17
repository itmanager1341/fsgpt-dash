
// Enhanced chat types that map to our Supabase tables
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  total_cost: number;
  model_preference: string;
  provider_preference: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  provider_used?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserApiAccess {
  id: string;
  user_id: string;
  model_name: string;
  provider: string;
  is_enabled: boolean;
  monthly_limit: number;
  current_usage: number;
  usage_period_start: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentUpload {
  id: string;
  user_id: string;
  conversation_id?: string;
  file_name: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  file_type: string;
  upload_status: 'pending' | 'completed' | 'failed' | 'processing';
  metadata: Record<string, any>;
  uploaded_at: string;
}

// Union types for better type safety
export type ChatProvider = 'openai' | 'perplexity' | 'anthropic' | 'google';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type UploadStatus = 'pending' | 'completed' | 'failed' | 'processing';
export type ModelType = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'claude-3' | 'perplexity-llama';

// Legacy types for backward compatibility
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
