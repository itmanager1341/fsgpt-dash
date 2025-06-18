
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings2 } from 'lucide-react';
import UserModelMatrix from './UserModelMatrix';
import ModelManagementSettings from './ModelManagementSettings';

const UserManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Users size={16} />
            User Access Matrix
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 size={16} />
            Model Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <UserModelMatrix />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ModelManagementSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
