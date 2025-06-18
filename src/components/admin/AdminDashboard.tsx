
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, DollarSign, Activity } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  // TODO: Replace with actual data from API
  const stats = {
    totalUsers: 42,
    activeToday: 12,
    totalConversations: 156,
    totalCost: 89.43
  };

  const StatCard = ({ title, value, description, icon: Icon, trend }: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    trend?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered users"
          icon={Users}
          trend="+12% from last month"
        />
        <StatCard
          title="Active Today"
          value={stats.activeToday}
          description="Users active today"
          icon={Activity}
          trend="+5% from yesterday"
        />
        <StatCard
          title="Conversations"
          value={stats.totalConversations}
          description="Total conversations"
          icon={MessageSquare}
          trend="+18% from last week"
        />
        <StatCard
          title="Total Cost"
          value={`$${stats.totalCost}`}
          description="This month's API costs"
          icon={DollarSign}
          trend="+8% from last month"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user activities and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>New user registration: john@example.com</span>
                <span className="text-muted-foreground">2 min ago</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>High usage alert: API costs exceeding threshold</span>
                <span className="text-muted-foreground">15 min ago</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>User approval pending: sarah@company.com</span>
                <span className="text-muted-foreground">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overview of system performance and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">API Response Time</span>
                <span className="text-sm font-medium text-green-600">142ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Database Status</span>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Connections</span>
                <span className="text-sm font-medium">23/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium text-green-600">0.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
