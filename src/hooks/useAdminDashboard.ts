
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminDashboardStats {
  total_users: number;
  active_today: number;
  active_this_week: number;
  active_this_month: number;
  total_conversations: number;
  conversations_today: number;
  conversations_this_week: number;
  conversations_this_month: number;
  total_cost: number;
  cost_today: number;
  cost_this_week: number;
  cost_this_month: number;
  avg_response_time: number;
  error_rate: number;
  active_connections: number;
}

export interface RecentActivity {
  id: string;
  activity_type: string;
  message: string;
  user_email: string;
  metadata: any;
  created_at: string;
}

export const useAdminDashboard = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      console.log('Fetching admin dashboard stats...');
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      
      if (error) {
        console.error('Admin dashboard stats error:', error);
        throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.warn('No dashboard stats data returned');
        // Return default values if no data
        return {
          total_users: 0,
          active_today: 0,
          active_this_week: 0,
          active_this_month: 0,
          total_conversations: 0,
          conversations_today: 0,
          conversations_this_week: 0,
          conversations_this_month: 0,
          total_cost: 0,
          cost_today: 0,
          cost_this_week: 0,
          cost_this_month: 0,
          avg_response_time: 0,
          error_rate: 0,
          active_connections: 0,
        } as AdminDashboardStats;
      }
      
      console.log('Dashboard stats fetched successfully:', data[0]);
      return data[0] as AdminDashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  const { data: activities, isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      console.log('Fetching recent activities...');
      const { data, error } = await supabase.rpc('get_recent_admin_activities');
      
      if (error) {
        console.error('Recent activities error:', error);
        throw new Error(`Failed to fetch recent activities: ${error.message}`);
      }
      
      console.log('Recent activities fetched:', data?.length || 0, 'items');
      return (data || []) as RecentActivity[];
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
    retryDelay: 1000,
  });

  return {
    stats,
    activities,
    isLoading: statsLoading || activitiesLoading,
    error: statsError || activitiesError,
    hasData: stats !== undefined || activities !== undefined,
  };
};
