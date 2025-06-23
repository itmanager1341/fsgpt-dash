
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
import { Settings, Key, Users, DollarSign, RefreshCw, Download, AlertCircle, CheckCircle, Info, Zap, Brain, Clock, Cpu, Thermometer } from 'lucide-react';
import { useAdminModelMatrix, ModelConfigData, CostTier, UseCaseCategory } from '@/hooks/useAdminModelMatrix';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

interface PricingUpdateResult {
  success: boolean;
  results?: {
    updated_models: any[];
    new_models: any[];
    deprecated_models: string[];
    errors: string[];
  };
  summary?: {
    total_updated: number;
    new_models_added: number;
    models_deprecated: number;
    errors_count: number;
  };
  error?: string;
}

const ModelManagementSettings: React.FC = () => {
  const { modelConfigs, isLoading, updateModelConfig, refetch } = useAdminModelMatrix();
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    defaultLimit: number;
    costPer1k: number;
    maxTokens: number;
    contextTokens: number;
    temperature: number;
    providerParams: string;
  }>({ 
    defaultLimit: 0, 
    costPer1k: 0, 
    maxTokens: 4000, 
    contextTokens: 8000, 
    temperature: 0.7,
    providerParams: '{}'
  });
  const [isUpdatingPricing, setIsUpdatingPricing] = useState(false);
  const [lastUpdateResult, setLastUpdateResult] = useState<PricingUpdateResult | null>(null);

  const handleEditModel = (model: ModelConfigData) => {
    setEditingModel(`${model.provider}:${model.model_name}`);
    setEditValues({
      defaultLimit: model.default_monthly_limit,
      costPer1k: model.cost_per_1k_tokens,
      maxTokens: model.recommended_max_tokens || 4000,
      contextTokens: model.recommended_context_tokens || 8000,
      temperature: model.optimal_temperature || 0.7,
      providerParams: JSON.stringify(model.provider_specific_params || {}, null, 2)
    });
  };

  const handleSaveModel = async (provider: string, modelName: string) => {
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(editValues.providerParams);
      } catch (e) {
        toast.error('Invalid JSON in provider-specific parameters');
        return;
      }

      await updateModelConfig(provider, modelName, {
        default_monthly_limit: editValues.defaultLimit,
        cost_per_1k_tokens: editValues.costPer1k,
        recommended_max_tokens: editValues.maxTokens,
        recommended_context_tokens: editValues.contextTokens,
        optimal_temperature: editValues.temperature,
        provider_specific_params: parsedParams
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

  const handleUpdatePricing = async () => {
    setIsUpdatingPricing(true);
    setLastUpdateResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('update-model-pricing');

      if (error) {
        throw error;
      }

      const result: PricingUpdateResult = data;
      setLastUpdateResult(result);

      if (result.success) {
        const summary = result.summary!;
        toast.success(
          `Pricing updated! ${summary.total_updated} models updated, ${summary.new_models_added} new models added, ${summary.models_deprecated} deprecated.`
        );
        await refetch(); // Refresh the data
      } else {
        toast.error(`Failed to update pricing: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast.error('Failed to update model pricing');
      setLastUpdateResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsUpdatingPricing(false);
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800';
      case 'perplexity': return 'bg-blue-100 text-blue-800';
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCostTierBadge = (tier?: CostTier) => {
    if (!tier) return null;
    
    const colors = {
      Budget: 'bg-green-100 text-green-800',
      Moderate: 'bg-yellow-100 text-yellow-800',
      Premium: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      Budget: <DollarSign size={12} />,
      Moderate: <Zap size={12} />,
      Premium: <Brain size={12} />
    };
    
    return (
      <Badge className={`${colors[tier]} flex items-center gap-1`}>
        {icons[tier]}
        {tier}
      </Badge>
    );
  };

  const getUseCaseBadges = (useCases?: string[]) => {
    if (!useCases || useCases.length === 0) return null;
    
    const useCaseLabels: Record<UseCaseCategory, string> = {
      quick_tasks: 'Quick Tasks',
      deep_research: 'Deep Research',
      real_time_info: 'Real-time Info',
      coding: 'Coding',
      reasoning: 'Reasoning',
      content_creation: 'Content',
      vision_tasks: 'Vision',
      complex_problem_solving: 'Complex Problems'
    };
    
    return (
      <div className="flex flex-wrap gap-1">
        {useCases.slice(0, 3).map((useCase) => (
          <Badge key={useCase} variant="outline" className="text-xs">
            {useCaseLabels[useCase as UseCaseCategory] || useCase}
          </Badge>
        ))}
        {useCases.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{useCases.length - 3} more
          </Badge>
        )}
      </div>
    );
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

  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Live Pricing Update Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw size={20} />
              Live Model & Pricing Updates
            </CardTitle>
            <CardDescription>
              Fetch the latest models and pricing from provider APIs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleUpdatePricing}
                disabled={isUpdatingPricing}
                className="flex items-center gap-2"
              >
                {isUpdatingPricing ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Update Models & Pricing
                  </>
                )}
              </Button>
              
              {modelConfigs.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Last update: {formatLastUpdate(
                    modelConfigs.find(m => m.last_pricing_update)?.last_pricing_update || null
                  )}
                </div>
              )}
            </div>

            {lastUpdateResult && (
              <div className={`p-4 rounded-lg border ${
                lastUpdateResult.success 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastUpdateResult.success ? (
                    <CheckCircle className="text-green-600" size={16} />
                  ) : (
                    <AlertCircle className="text-red-600" size={16} />
                  )}
                  <span className="font-medium">
                    {lastUpdateResult.success ? 'Update Successful' : 'Update Failed'}
                  </span>
                </div>
                
                {lastUpdateResult.success && lastUpdateResult.summary && (
                  <div className="text-sm space-y-1">
                    <div>• {lastUpdateResult.summary.total_updated} models updated</div>
                    <div>• {lastUpdateResult.summary.new_models_added} new models added</div>
                    <div>• {lastUpdateResult.summary.models_deprecated} models deprecated</div>
                    {lastUpdateResult.summary.errors_count > 0 && (
                      <div className="text-orange-600">
                        • {lastUpdateResult.summary.errors_count} errors occurred
                      </div>
                    )}
                  </div>
                )}
                
                {!lastUpdateResult.success && (
                  <div className="text-sm text-red-600">
                    {lastUpdateResult.error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={20} />
              Global Model Configuration & Token Settings
            </CardTitle>
            <CardDescription>
              Manage model availability, pricing, and optimize token configurations for each provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Cost Tier</TableHead>
                  <TableHead>Use Cases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Monthly Limit</TableHead>
                  <TableHead>Cost/1K Tokens</TableHead>
                  <TableHead>Token Settings</TableHead>
                  <TableHead>Temperature</TableHead>
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
                        <div>
                          <div className="font-medium">{model.display_name}</div>
                          <div className="text-sm text-muted-foreground">{model.model_name}</div>
                          {model.is_deprecated && (
                            <Badge variant="destructive" className="text-xs mt-1">Deprecated</Badge>
                          )}
                          {model.recommended_for && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info size={12} className="inline-block ml-1 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{model.recommended_for}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getProviderBadgeColor(model.provider)}>
                          {model.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getCostTierBadge(model.cost_tier)}
                      </TableCell>
                      <TableCell>
                        {getUseCaseBadges(model.primary_use_cases)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={model.is_globally_enabled}
                            onCheckedChange={(checked) => 
                              handleToggleModel(model.provider, model.model_name, checked)
                            }
                            disabled={model.is_deprecated}
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
                          <div>
                            <span>${model.cost_per_1k_tokens}</span>
                            {model.pricing_source && (
                              <div className="text-xs text-muted-foreground">
                                {model.pricing_source}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Cpu size={12} />
                              <Input
                                type="number"
                                value={editValues.maxTokens}
                                onChange={(e) => setEditValues(prev => ({
                                  ...prev,
                                  maxTokens: parseInt(e.target.value) || 4000
                                }))}
                                className="w-16 text-xs"
                                placeholder="Max"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <Input
                                type="number"
                                value={editValues.contextTokens}
                                onChange={(e) => setEditValues(prev => ({
                                  ...prev,
                                  contextTokens: parseInt(e.target.value) || 8000
                                }))}
                                className="w-16 text-xs"
                                placeholder="Context"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Cpu size={12} />
                              <span>{model.recommended_max_tokens || 4000}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock size={12} />
                              <span>{((model.recommended_context_tokens || 8000) / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Thermometer size={12} />
                            <Input
                              type="number"
                              value={editValues.temperature}
                              onChange={(e) => setEditValues(prev => ({
                                ...prev,
                                temperature: parseFloat(e.target.value) || 0.7
                              }))}
                              className="w-16"
                              step="0.1"
                              min="0"
                              max="2"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Thermometer size={12} />
                            <span className="text-sm">{model.optimal_temperature || 0.7}</span>
                          </div>
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
                          <div className="flex flex-col gap-1">
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
                            <Textarea
                              value={editValues.providerParams}
                              onChange={(e) => setEditValues(prev => ({
                                ...prev,
                                providerParams: e.target.value
                              }))}
                              placeholder="Provider params (JSON)"
                              className="text-xs h-20 w-48"
                            />
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditModel(model)}
                            disabled={model.is_deprecated}
                          >
                            Configure
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

        {/* API Key Status */}
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
    </TooltipProvider>
  );
};

export default ModelManagementSettings;
