import { ChatProvider, MessageRole } from './chat';
import { ConversationWithMessages } from './utils';

// API Request/Response types for edge functions
export interface SendMessageRequest {
  conversationId: string;
  message: string;
  role: MessageRole;
  model?: string;
  provider?: ChatProvider;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  streamResponse?: boolean;
}

export interface SendMessageResponse {
  messageId: string;
  content: string;
  model: string;
  provider: ChatProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  finishReason: string;
  created: string;
}

export interface CreateConversationRequest {
  title?: string;
  modelPreference?: string;
  providerPreference?: ChatProvider;
  metadata?: Record<string, any>;
}

export interface CreateConversationResponse {
  conversationId: string;
  title: string;
  created: string;
}

export interface UploadDocumentRequest {
  conversationId?: string;
  file: File;
  extractText?: boolean;
  chunkSize?: number;
}

export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadStatus: string;
  extractedText?: string;
  processingTime?: number;
}

export interface UpdateUsageRequest {
  modelName: string;
  provider: ChatProvider;
  tokensUsed: number;
  cost: number;
}

export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
  status?: string;
  orderBy?: 'created_at' | 'updated_at' | 'total_cost';
  orderDirection?: 'asc' | 'desc';
}

export interface GetConversationsResponse {
  conversations: ConversationWithMessages[];
  totalCount: number;
  hasMore: boolean;
}

export interface ModelAvailabilityResponse {
  models: Array<{
    name: string;
    provider: ChatProvider;
    isAvailable: boolean;
    costPerToken: number;
    maxTokens: number;
    capabilities: string[];
  }>;
}

// Streaming response types
export interface StreamChunk {
  type: 'content' | 'usage' | 'error' | 'done';
  data: any;
  messageId?: string;
}

// Error response type
export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}
