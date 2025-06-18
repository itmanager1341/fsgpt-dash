
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const UsageAnalytics: React.FC = () => {
  // TODO: Replace with actual data from API
  const dailyUsageData = [
    { date: '2024-01-15', conversations: 12, cost: 15.23 },
    { date: '2024-01-16', conversations: 18, cost: 22.45 },
    { date: '2024-01-17', conversations: 15, cost: 18.67 },
    { date: '2024-01-18', conversations: 22, cost: 28.90 },
    { date: '2024-01-19', conversations: 19, cost: 24.12 },
    { date: '2024-01-20', conversations: 25, cost: 32.56 },
    { date: '2024-01-21', conversations: 21, cost: 27.34 }
  ];

  const modelUsageData = [
    { name: 'GPT-4', usage: 45, cost: 67.89 },
    { name: 'GPT-4 Mini', usage: 32, cost: 12.45 },
    { name: 'Perplexity', usage: 18, cost: 8.76 },
    { name: 'Claude', usage: 5, cost: 3.21 }
  ];

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

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
              <LineChart data={dailyUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    name === 'cost' ? `$${value}` : value,
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
                  data={modelUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="usage"
                >
                  {modelUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}%`, 'Usage']} />
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
            <BarChart data={modelUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'cost' ? `$${value}` : `${value}%`,
                  name === 'cost' ? 'Cost' : 'Usage %'
                ]}
              />
              <Bar yAxisId="left" dataKey="usage" fill="#3b82f6" name="usage" />
              <Bar yAxisId="right" dataKey="cost" fill="#10b981" name="cost" />
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
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">sarah@company.com</span>
                <span className="text-sm font-medium">$45.67</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">john@example.com</span>
                <span className="text-sm font-medium">$32.12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">mike@tech.com</span>
                <span className="text-sm font-medium">$28.90</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Alerts</CardTitle>
            <CardDescription>Users approaching limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>sarah@company.com (90% of limit)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>alex@startup.com (85% of limit)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>lisa@corp.com (limit exceeded)</span>
              </div>
            </div>
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
                <span className="text-sm font-medium">1,247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Cost</span>
                <span className="text-sm font-medium">$432.18</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average per User</span>
                <span className="text-sm font-medium">$10.29</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Users</span>
                <span className="text-sm font-medium">42</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsageAnalytics;
