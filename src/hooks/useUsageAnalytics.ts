
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyUsageTrend {
  date: string;
  conversations: number;
  cost: number;
  users: number;
}

export interface ModelUsageDistribution {
  provider: string;
  model_name: string;
  usage_count: number;
  total_cost: number;
  usage_percentage: number;
}

export interface TopUser {
  user_id: string;
  user_email: string;
  user_name: string;
  total_cost: number;
  conversation_count: number;
  usage_percentage: number;
}

export interface UsageAlert {
  user_id: string;
  user_email: string;
  user_name: string;
  current_usage: number;
  monthly_limit: number;
  usage_percentage: number;
  alert_level: string;
}

export interface MonthlySummary {
  total_conversations: number;
  total_cost: number;
  average_per_user: number;
  active_users: number;
  new_users: number;
  top_model: string;
  cost_growth_percentage: number;
}

export const useUsageAnalytics = (startDate?: string, endDate?: string) => {
  const { data: dailyTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['daily-usage-trends', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_usage_trends', {
        start_date: startDate,
        end_date: endDate,
      });
      if (error) throw error;
      return data as DailyUsageTrend[];
    },
  });

  const { data: modelUsage, isLoading: modelLoading } = useQuery({
    queryKey: ['model-usage-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_model_usage_distribution');
      if (error) throw error;
      return data as ModelUsageDistribution[];
    },
  });

  const { data: topUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['top-users-by-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_users_by_usage');
      if (error) throw error;
      return data as TopUser[];
    },
  });

  const { data: usageAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['usage-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_alerts');
      if (error) throw error;
      return data as UsageAlert[];
    },
  });

  const { data: monthlySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_summary');
      if (error) throw error;
      return data[0] as MonthlySummary;
    },
  });

  return {
    dailyTrends,
    modelUsage,
    topUsers,
    usageAlerts,
    monthlySummary,
    isLoading: trendsLoading || modelLoading || usersLoading || alertsLoading || summaryLoading,
  };
};
