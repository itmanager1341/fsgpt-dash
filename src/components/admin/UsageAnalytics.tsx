
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

const UsageAnalytics: React.FC = () => {
  const { dailyTrends, modelUsage, topUsers, usageAlerts, monthlySummary, isLoading } = useUsageAnalytics();

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'caution': return 'text-orange-600';
      default: return 'text-green-600';
    }
  };

  const getAlertDot = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'caution': return 'bg-orange-500';
      default: return 'bg-green-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-[300px]" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Model Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="w-full h-[300px]" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage Trends</CardTitle>
            <CardDescription>Conversations and costs over the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    name === 'cost' ? `$${Number(value).toFixed(2)}` : value,
                    name === 'cost' ? 'Cost' : 'Conversations'
                  ]}
                />
                <Bar yAxisId="left" dataKey="conversations" fill="#3b82f6" name="conversations" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} name="cost" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
            <CardDescription>Usage breakdown by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelUsage || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ model_name, usage_percentage }) => `${model_name} ${usage_percentage.toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="usage_percentage"
                >
                  {(modelUsage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Usage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis by Model</CardTitle>
          <CardDescription>Compare costs and usage across different AI models</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={modelUsage || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model_name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'total_cost' ? `$${Number(value).toFixed(2)}` : `${Number(value).toFixed(1)}%`,
                  name === 'total_cost' ? 'Cost' : 'Usage %'
                ]}
              />
              <Bar yAxisId="left" dataKey="usage_percentage" fill="#3b82f6" name="usage_percentage" />
              <Bar yAxisId="right" dataKey="total_cost" fill="#10b981" name="total_cost" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Users by Usage</CardTitle>
            <CardDescription>Highest API usage this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topUsers && topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.slice(0, 5).map((user) => (
                  <div key={user.user_id} className="flex justify-between items-center">
                    <span className="text-sm truncate">{user.user_email}</span>
                    <span className="text-sm font-medium">${user.total_cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No usage data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Alerts</CardTitle>
            <CardDescription>Users approaching limits</CardDescription>
          </CardHeader>
          <CardContent>
            {usageAlerts && usageAlerts.length > 0 ? (
              <div className="space-y-3">
                {usageAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.user_id} className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${getAlertDot(alert.alert_level)}`}></div>
                    <span className="truncate flex-1">{alert.user_email}</span>
                    <span className={`text-xs ${getAlertColor(alert.alert_level)}`}>
                      {alert.usage_percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No alerts at this time</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>Current month statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Conversations</span>
                <span className="text-sm font-medium">{monthlySummary?.total_conversations || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Cost</span>
                <span className="text-sm font-medium">${monthlySummary?.total_cost.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average per User</span>
                <span className="text-sm font-medium">${monthlySummary?.average_per_user.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Users</span>
                <span className="text-sm font-medium">{monthlySummary?.active_users || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Top Model</span>
                <span className="text-sm font-medium">{monthlySummary?.top_model || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsageAnalytics;
