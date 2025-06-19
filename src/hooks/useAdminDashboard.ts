
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
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      return data[0] as AdminDashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activities, isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_admin_activities');
      if (error) throw error;
      return data as RecentActivity[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    stats,
    activities,
    isLoading: statsLoading || activitiesLoading,
    error: statsError || activitiesError,
  };
};
