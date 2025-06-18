
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, MessageSquare, DollarSign, CheckSquare } from 'lucide-react';
import { useAdminModelMatrix, UserModelMatrixData } from '@/hooks/useAdminModelMatrix';
import { cn } from '@/lib/utils';

const UserModelMatrix: React.FC = () => {
  const { matrixData, modelConfigs, isLoading, bulkUpdateAccess } = useAdminModelMatrix();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  const enabledModels = modelConfigs.filter(m => m.is_globally_enabled);

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(matrixData.map(u => u.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkModelToggle = async (provider: string, modelName: string, enabled: boolean) => {
    if (selectedUsers.size === 0) return;

    setBulkOperationLoading(true);
    try {
      await bulkUpdateAccess(
        Array.from(selectedUsers),
        provider,
        modelName,
        enabled
      );
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleSingleUserToggle = async (
    userId: string,
    provider: string,
    modelName: string,
    enabled: boolean
  ) => {
    try {
      await bulkUpdateAccess([userId], provider, modelName, enabled);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getUsageColor = (percentage: number, isOverLimit: boolean) => {
    if (isOverLimit) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Operations Panel */}
      {selectedUsers.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare size={20} />
              Bulk Operations ({selectedUsers.size} users selected)
            </CardTitle>
            <CardDescription>
              Apply model access changes to all selected users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {enabledModels.map((model) => (
                <div key={`${model.provider}:${model.model_name}`} className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkOperationLoading}
                    onClick={() => handleBulkModelToggle(model.provider, model.model_name, true)}
                  >
                    Enable {model.display_name}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkOperationLoading}
                    onClick={() => handleBulkModelToggle(model.provider, model.model_name, false)}
                  >
                    Disable {model.display_name}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User-Model Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            User-Model Access Matrix
          </CardTitle>
          <CardDescription>
            Manage model access for all users with inline usage analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === matrixData.length && matrixData.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Analytics</TableHead>
                  {enabledModels.map((model) => (
                    <TableHead key={`${model.provider}:${model.model_name}`} className="text-center min-w-[120px]">
                      <div className="text-xs font-medium">{model.display_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.user_id)}
                        onCheckedChange={(checked) => handleUserSelection(user.user_id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.user_name || 'Unnamed User'}</div>
                        <div className="text-sm text-muted-foreground">{user.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.user_status)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign size={12} />
                          ${user.total_monthly_usage.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <MessageSquare size={12} />
                          {user.conversation_count} chats
                        </div>
                      </div>
                    </TableCell>
                    {enabledModels.map((model) => {
                      const modelKey = `${model.provider}:${model.model_name}`;
                      const access = user.model_access[modelKey];
                      
                      if (!access) {
                        return (
                          <TableCell key={modelKey} className="text-center">
                            <Switch
                              checked={false}
                              onCheckedChange={(checked) =>
                                handleSingleUserToggle(user.user_id, model.provider, model.model_name, checked)
                              }
                            />
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={modelKey} className="text-center">
                          <div className="space-y-2">
                            <Switch
                              checked={access.isEnabled}
                              onCheckedChange={(checked) =>
                                handleSingleUserToggle(user.user_id, model.provider, model.model_name, checked)
                              }
                            />
                            {access.isEnabled && (
                              <>
                                <div className="text-xs text-muted-foreground">
                                  ${access.currentUsage.toFixed(2)} / ${access.monthlyLimit.toFixed(2)}
                                </div>
                                <Progress
                                  value={Math.min(access.usagePercentage, 100)}
                                  className="h-1"
                                />
                                {access.isOverLimit && (
                                  <div className="text-xs text-red-600 font-medium">
                                    Over Limit
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserModelMatrix;
