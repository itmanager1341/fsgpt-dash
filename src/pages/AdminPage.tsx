
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, Settings, BarChart3 } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import UsageAnalytics from '@/components/admin/UsageAnalytics';
import AdminDashboard from '@/components/admin/AdminDashboard';

const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, monitor usage, and configure system settings</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            Users & Models
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity size={16} />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <UsageAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Additional system settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
