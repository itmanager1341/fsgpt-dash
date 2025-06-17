
import { Database } from '@/integrations/supabase/types';
import { Conversation, Message } from './chat';

// Utility types for better developer experience
export type DatabaseConversation = Database['public']['Tables']['conversations']['Row'];
export type DatabaseMessage = Database['public']['Tables']['messages']['Row'];
export type DatabaseUserApiAccess = Database['public']['Tables']['user_api_access']['Row'];
export type DatabaseDocumentUpload = Database['public']['Tables']['document_uploads']['Row'];

// Insert types for database operations
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type UserApiAccessInsert = Database['public']['Tables']['user_api_access']['Insert'];
export type DocumentUploadInsert = Database['public']['Tables']['document_uploads']['Insert'];

// Update types for database operations
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type UserApiAccessUpdate = Database['public']['Tables']['user_api_access']['Update'];
export type DocumentUploadUpdate = Database['public']['Tables']['document_uploads']['Update'];

// Joined types for complex queries
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface UserWithApiAccess {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  apiAccess: DatabaseUserApiAccess[];
  totalUsage: number;
  conversationCount: number;
}

// Pagination utilities
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types for queries
export interface ConversationFilters {
  status?: string[];
  provider?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  costRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
}

export interface MessageFilters {
  role?: string[];
  provider?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  tokenRange?: {
    min: number;
    max: number;
  };
  searchContent?: string;
}

// Sort options
export interface SortOption<T = string> {
  field: T;
  direction: 'asc' | 'desc';
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
