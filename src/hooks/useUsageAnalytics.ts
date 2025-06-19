
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
  const { data: dailyTrends, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['daily-usage-trends', startDate, endDate],
    queryFn: async () => {
      console.log('Fetching daily usage trends...');
      const { data, error } = await supabase.rpc('get_daily_usage_trends', {
        start_date: startDate,
        end_date: endDate,
      });
      if (error) {
        console.error('Daily trends error:', error);
        throw new Error(`Failed to fetch daily trends: ${error.message}`);
      }
      console.log('Daily trends fetched:', data?.length || 0, 'items');
      return (data || []) as DailyUsageTrend[];
    },
    retry: 3,
  });

  const { data: modelUsage, isLoading: modelLoading, error: modelError } = useQuery({
    queryKey: ['model-usage-distribution'],
    queryFn: async () => {
      console.log('Fetching model usage distribution...');
      const { data, error } = await supabase.rpc('get_model_usage_distribution');
      if (error) {
        console.error('Model usage error:', error);
        throw new Error(`Failed to fetch model usage: ${error.message}`);
      }
      console.log('Model usage fetched:', data?.length || 0, 'items');
      return (data || []) as ModelUsageDistribution[];
    },
    retry: 3,
  });

  const { data: topUsers, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['top-users-by-usage'],
    queryFn: async () => {
      console.log('Fetching top users...');
      const { data, error } = await supabase.rpc('get_top_users_by_usage');
      if (error) {
        console.error('Top users error:', error);
        throw new Error(`Failed to fetch top users: ${error.message}`);
      }
      console.log('Top users fetched:', data?.length || 0, 'items');
      return (data || []) as TopUser[];
    },
    retry: 3,
  });

  const { data: usageAlerts, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['usage-alerts'],
    queryFn: async () => {
      console.log('Fetching usage alerts...');
      const { data, error } = await supabase.rpc('get_usage_alerts');
      if (error) {
        console.error('Usage alerts error:', error);
        throw new Error(`Failed to fetch usage alerts: ${error.message}`);
      }
      console.log('Usage alerts fetched:', data?.length || 0, 'items');
      return (data || []) as UsageAlert[];
    },
    retry: 3,
  });

  const { data: monthlySummary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: async () => {
      console.log('Fetching monthly summary...');
      const { data, error } = await supabase.rpc('get_monthly_summary');
      if (error) {
        console.error('Monthly summary error:', error);
        throw new Error(`Failed to fetch monthly summary: ${error.message}`);
      }
      if (!data || data.length === 0) {
        console.warn('No monthly summary data returned');
        return {
          total_conversations: 0,
          total_cost: 0,
          average_per_user: 0,
          active_users: 0,
          new_users: 0,
          top_model: 'N/A',
          cost_growth_percentage: 0,
        } as MonthlySummary;
      }
      console.log('Monthly summary fetched:', data[0]);
      return data[0] as MonthlySummary;
    },
    retry: 3,
  });

  const combinedError = trendsError || modelError || usersError || alertsError || summaryError;

  return {
    dailyTrends,
    modelUsage,
    topUsers,
    usageAlerts,
    monthlySummary,
    isLoading: trendsLoading || modelLoading || usersLoading || alertsLoading || summaryLoading,
    error: combinedError,
    hasData: Boolean(dailyTrends || modelUsage || topUsers || usageAlerts || monthlySummary),
  };
};
