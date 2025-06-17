import { Conversation, Message, UserApiAccess, DocumentUpload, ChatProvider } from './chat';

// Frontend-specific interfaces for UI components
export interface ChatSession {
  conversation: Conversation;
  messages: Message[];
  isLoading: boolean;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ChatSidebarItem {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: string;
  isActive: boolean;
  unreadCount: number;
  totalCost: number;
}

export interface MessageWithLoading extends Omit<Message, 'created_at'> {
  created_at: string | Date;
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: string;
  localId?: string; // For optimistic updates
}

export interface UsageAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  percentage: number;
  modelName: string;
  provider: string;
  remainingAmount: number;
}

export interface ModelAccess {
  modelName: string;
  provider: ChatProvider;
  isEnabled: boolean;
  usagePercentage: number;
  remainingCredits: number;
  monthlyLimit: number;
  isOverLimit: boolean;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  messageCount: number;
  lastMessage?: Message;
}

export interface ChatInputState {
  message: string;
  isTyping: boolean;
  isSending: boolean;
  attachments: File[];
  selectedModel?: string;
  selectedProvider?: ChatProvider;
}

export interface ChatSettingsState {
  defaultModel: string;
  defaultProvider: ChatProvider;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
  enableStreaming: boolean;
}
