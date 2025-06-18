
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
import { Users, MessageSquare, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAdminModelMatrix, UserModelMatrixData } from '@/hooks/useAdminModelMatrix';
import { cn } from '@/lib/utils';

const UserModelMatrix: React.FC = () => {
  const { matrixData, modelConfigs, isLoading, error, warnings, refetch, bulkUpdateAccess } = useAdminModelMatrix();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkOperationLoading, setBulkOperationLoading] = useState<string | null>(null);

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

    const operationKey = `${provider}:${modelName}:${enabled}`;
    setBulkOperationLoading(operationKey);
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
      setBulkOperationLoading(null);
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

  const getModelBulkOperationStats = (provider: string, modelName: string) => {
    const modelKey = `${provider}:${modelName}`;
    const selectedUserData = matrixData.filter(user => selectedUsers.has(user.user_id));
    
    const enabledCount = selectedUserData.filter(user => 
      user.model_access[modelKey]?.isEnabled
    ).length;
    
    const disabledCount = selectedUsers.size - enabledCount;
    
    return { enabledCount, disabledCount };
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            Error Loading Matrix Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" className="flex items-center gap-2">
            <RefreshCw size={16} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (warnings.length > 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle size={20} />
            Partial Data Loaded
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-yellow-700 text-sm space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
          <Button 
            onClick={refetch} 
            variant="outline" 
            size="sm" 
            className="mt-3 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User-Model Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            User-Model Access Matrix
            {selectedUsers.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedUsers.size} users selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage model access for all users with inline usage analytics. Select users and use the bulk operation buttons in each model column.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matrixData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user data available. Check your database connection and permissions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === matrixData.length && matrixData.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Analytics</TableHead>
                    {enabledModels.map((model) => {
                      const stats = selectedUsers.size > 0 ? getModelBulkOperationStats(model.provider, model.model_name) : null;
                      const enableOperationKey = `${model.provider}:${model.model_name}:true`;
                      const disableOperationKey = `${model.provider}:${model.model_name}:false`;
                      
                      return (
                        <TableHead key={`${model.provider}:${model.model_name}`} className="text-center min-w-[140px]">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs font-medium">{model.display_name}</div>
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                            </div>
                            
                            {selectedUsers.size > 0 && stats && (
                              <div className="flex flex-col gap-1">
                                {stats.disabledCount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    disabled={bulkOperationLoading === enableOperationKey}
                                    onClick={() => handleBulkModelToggle(model.provider, model.model_name, true)}
                                  >
                                    {bulkOperationLoading === enableOperationKey ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                    ) : (
                                      `Enable ${stats.disabledCount}`
                                    )}
                                  </Button>
                                )}
                                {stats.enabledCount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    disabled={bulkOperationLoading === disableOperationKey}
                                    onClick={() => handleBulkModelToggle(model.provider, model.model_name, false)}
                                  >
                                    {bulkOperationLoading === disableOperationKey ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                    ) : (
                                      `Disable ${stats.enabledCount}`
                                    )}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixData.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.user_id)}
                          onCheckedChange={(checked) => handleUserSelection(user.user_id, checked === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.user_name}</div>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserModelMatrix;
