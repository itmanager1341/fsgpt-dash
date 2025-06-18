
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Settings, Key, Users, DollarSign } from 'lucide-react';
import { useAdminModelMatrix, ModelConfigData } from '@/hooks/useAdminModelMatrix';

const ModelManagementSettings: React.FC = () => {
  const { modelConfigs, isLoading, updateModelConfig } = useAdminModelMatrix();
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    defaultLimit: number;
    costPer1k: number;
  }>({ defaultLimit: 0, costPer1k: 0 });

  const handleEditModel = (model: ModelConfigData) => {
    setEditingModel(`${model.provider}:${model.model_name}`);
    setEditValues({
      defaultLimit: model.default_monthly_limit,
      costPer1k: model.cost_per_1k_tokens,
    });
  };

  const handleSaveModel = async (provider: string, modelName: string) => {
    try {
      await updateModelConfig(provider, modelName, {
        default_monthly_limit: editValues.defaultLimit,
        cost_per_1k_tokens: editValues.costPer1k,
      });
      setEditingModel(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleToggleModel = async (provider: string, modelName: string, isEnabled: boolean) => {
    try {
      await updateModelConfig(provider, modelName, {
        is_globally_enabled: isEnabled,
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800';
      case 'perplexity': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (apiKeyStatus: string, isEnabled: boolean) => {
    if (!isEnabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    return apiKeyStatus === 'active' ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="destructive">No API Key</Badge>
    );
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} />
            Global Model Configuration
          </CardTitle>
          <CardDescription>
            Manage which models are available system-wide and configure default settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Default Limit</TableHead>
                <TableHead>Cost/1K Tokens</TableHead>
                <TableHead>Monthly Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelConfigs.map((model) => {
                const isEditing = editingModel === `${model.provider}:${model.model_name}`;
                
                return (
                  <TableRow key={`${model.provider}:${model.model_name}`}>
                    <TableCell>
                      <div className="font-medium">{model.display_name}</div>
                      <div className="text-sm text-muted-foreground">{model.model_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getProviderBadgeColor(model.provider)}>
                        {model.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={model.is_globally_enabled}
                          onCheckedChange={(checked) => 
                            handleToggleModel(model.provider, model.model_name, checked)
                          }
                        />
                        {getStatusBadge(model.api_key_status, model.is_globally_enabled)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {model.total_users_with_access}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editValues.defaultLimit}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            defaultLimit: parseFloat(e.target.value) || 0
                          }))}
                          className="w-20"
                          step="0.01"
                        />
                      ) : (
                        <span>${model.default_monthly_limit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editValues.costPer1k}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            costPer1k: parseFloat(e.target.value) || 0
                          }))}
                          className="w-20"
                          step="0.0001"
                        />
                      ) : (
                        <span>${model.cost_per_1k_tokens}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        ${model.total_monthly_usage.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveModel(model.provider, model.model_name)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingModel(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditModel(model)}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key size={20} />
            API Key Status
          </CardTitle>
          <CardDescription>
            Current status of API keys for each provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from(new Set(modelConfigs.map(m => m.provider))).map(provider => {
              const providerModels = modelConfigs.filter(m => m.provider === provider);
              const hasActiveKey = providerModels.some(m => m.api_key_status === 'active');
              
              return (
                <div key={provider} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getProviderBadgeColor(provider)}>
                      {provider}
                    </Badge>
                    <span className="font-medium capitalize">{provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveKey ? (
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    ) : (
                      <Badge variant="destructive">Not Connected</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {providerModels.length} models
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelManagementSettings;
