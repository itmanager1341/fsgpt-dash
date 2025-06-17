
import { Conversation, Message, UserApiAccess } from './chat';
import { UserWithApiAccess, PaginatedResponse, SortOption } from './utils';

// Admin-specific interfaces
export interface AdminConversationView extends Conversation {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  messageCount: number;
  averageResponseTime: number;
  topModelsUsed: Array<{
    model: string;
    provider: string;
    usage: number;
  }>;
}

export interface UserManagement {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended' | 'pending';
  joinDate: string;
  lastActive: string;
  conversationCount: number;
  totalSpent: number;
  apiAccess: UserApiAccess[];
  flags: string[];
}

export interface UsageAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalCost: number;
  averageCostPerUser: number;
  topModels: Array<{
    model: string;
    provider: string;
    usage: number;
    cost: number;
  }>;
  costByProvider: Array<{
    provider: string;
    cost: number;
    percentage: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
  usageTrends: Array<{
    date: string;
    conversations: number;
    messages: number;
    cost: number;
  }>;
}

export interface ModelManagement {
  model: string;
  provider: string;
  isEnabled: boolean;
  globalLimit: number;
  userLimit: number;
  costPerToken: number;
  maxTokens: number;
  capabilities: string[];
  restrictions: string[];
  usage: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    averageLatency: number;
  };
}

export interface AdminDashboardStats {
  overview: {
    totalUsers: number;
    activeToday: number;
    totalConversations: number;
    totalCost: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    count: number;
    timestamp: string;
  }>;
  recentActivity: Array<{
    type: 'user_joined' | 'conversation_started' | 'high_usage' | 'error';
    user?: string;
    message: string;
    timestamp: string;
  }>;
}

// Admin filter and sort types
export interface AdminUserFilters {
  status?: string[];
  registrationDate?: {
    start: string;
    end: string;
  };
  usageRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
}

export interface AdminConversationFilters {
  userIds?: string[];
  providers?: string[];
  models?: string[];
  costRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
}

// Admin API responses
export type AdminUsersResponse = PaginatedResponse<UserManagement>;
export type AdminConversationsResponse = PaginatedResponse<AdminConversationView>;
export type AdminAnalyticsResponse = UsageAnalytics;

// Admin action types
export interface UserAction {
  type: 'suspend' | 'activate' | 'delete' | 'update_limits' | 'grant_access';
  userId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface BulkAction {
  type: 'suspend' | 'activate' | 'update_limits' | 'export';
  userIds: string[];
  parameters?: Record<string, any>;
}
