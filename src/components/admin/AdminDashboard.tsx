
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, DollarSign, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { Skeleton } from '@/components/ui/skeleton';

const AdminDashboard: React.FC = () => {
  const { stats, activities, isLoading, error } = useAdminDashboard();

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load dashboard data</p>
          <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, description, icon: Icon, trend, isLoading }: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    trend?: string;
    isLoading?: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'user_approval':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case 'high_usage':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          description="Registered users"
          icon={Users}
          trend={stats?.active_this_week ? `${stats.active_this_week} this week` : undefined}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Today"
          value={stats?.active_today || 0}
          description="Users active today"
          icon={Activity}
          trend={stats?.active_this_month ? `${stats.active_this_month} this month` : undefined}
          isLoading={isLoading}
        />
        <StatCard
          title="Conversations"
          value={stats?.total_conversations || 0}
          description="Total conversations"
          icon={MessageSquare}
          trend={stats?.conversations_this_week ? `${stats.conversations_this_week} this week` : undefined}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Cost"
          value={stats ? `$${stats.total_cost.toFixed(2)}` : '$0.00'}
          description="All-time API costs"
          icon={DollarSign}
          trend={stats?.cost_this_month ? `$${stats.cost_this_month.toFixed(2)} this month` : undefined}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user activities and system events</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-2">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2 text-sm">
                    {getActivityIcon(activity.activity_type)}
                    <span className="flex-1">{activity.message}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent activities</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overview of system performance and status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">API Response Time</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats?.avg_response_time ? `${Math.round(stats.avg_response_time)}ms` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database Status</span>
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Healthy
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Connections</span>
                  <span className="text-sm font-medium">
                    {stats?.active_connections || 0}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats?.error_rate ? `${stats.error_rate.toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
