
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserModelMatrixData {
  user_id: string;
  user_email: string;
  user_name: string;
  user_status: string;
  total_monthly_usage: number;
  conversation_count: number;
  model_access: Record<string, {
    isEnabled: boolean;
    currentUsage: number;
    monthlyLimit: number;
    usagePercentage: number;
    isOverLimit: boolean;
  }>;
}

export interface ModelConfigData {
  provider: string;
  model_name: string;
  display_name: string;
  is_globally_enabled: boolean;
  default_monthly_limit: number;
  cost_per_1k_tokens: number;
  total_users_with_access: number;
  total_monthly_usage: number;
  api_key_status: string;
  last_pricing_update?: string;
  pricing_source?: string;
  is_deprecated?: boolean;
  api_availability?: string;
  primary_use_cases?: string[];
  recommended_for?: string;
  cost_tier?: 'Budget' | 'Moderate' | 'Premium';
  performance_notes?: string;
  context_window_tokens?: number;
  supports_streaming?: boolean;
  recommended_max_tokens?: number;
  recommended_context_tokens?: number;
  optimal_temperature?: number;
  provider_specific_params?: Record<string, any>;
}

export type UseCaseCategory = 
  | 'quick_tasks'
  | 'deep_research'
  | 'real_time_info'
  | 'coding'
  | 'reasoning'
  | 'content_creation'
  | 'vision_tasks'
  | 'complex_problem_solving';

export type CostTier = 'Budget' | 'Moderate' | 'Premium';

export const useAdminModelMatrix = () => {
  const [matrixData, setMatrixData] = useState<UserModelMatrixData[]>([]);
  const [modelConfigs, setModelConfigs] = useState<ModelConfigData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const validateModelAccess = (modelAccess: any): Record<string, any> => {
    if (!modelAccess || typeof modelAccess !== 'object') {
      return {};
    }
    
    // Ensure all model access entries have required properties
    const validatedAccess: Record<string, any> = {};
    
    Object.entries(modelAccess).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        validatedAccess[key] = {
          isEnabled: Boolean(value.isEnabled),
          currentUsage: Number(value.currentUsage) || 0,
          monthlyLimit: Number(value.monthlyLimit) || 20,
          usagePercentage: Number(value.usagePercentage) || 0,
          isOverLimit: Boolean(value.isOverLimit),
        };
      }
    });
    
    return validatedAccess;
  };

  const fetchMatrixData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setWarnings([]);

      // Fetch both datasets with individual error handling
      const [matrixResponse, configResponse] = await Promise.allSettled([
        supabase.rpc('get_user_model_matrix'),
        supabase.rpc('get_admin_model_overview')
      ]);

      let hasWarnings = false;

      // Handle matrix data
      if (matrixResponse.status === 'fulfilled') {
        const { data: matrixResult, error: matrixError } = matrixResponse.value;
        
        if (matrixError) {
          console.error('Matrix data error:', matrixError);
          setWarnings(prev => [...prev, `User matrix data failed to load: ${matrixError.message}`]);
          hasWarnings = true;
        } else {
          // Process and validate matrix data
          const typedMatrixData = (matrixResult || []).map((row: any) => {
            let modelAccess = {};
            
            try {
              modelAccess = typeof row.model_access === 'string' 
                ? JSON.parse(row.model_access) 
                : row.model_access || {};
              
              modelAccess = validateModelAccess(modelAccess);
            } catch (parseError) {
              console.warn('Failed to parse model_access for user:', row.user_id, parseError);
              modelAccess = {};
            }

            return {
              ...row,
              user_name: row.user_name || 'Unnamed User',
              total_monthly_usage: Number(row.total_monthly_usage) || 0,
              conversation_count: Number(row.conversation_count) || 0,
              model_access: modelAccess
            };
          }) as UserModelMatrixData[];

          setMatrixData(typedMatrixData);
        }
      } else {
        console.error('Matrix fetch failed:', matrixResponse.reason);
        setWarnings(prev => [...prev, 'Failed to fetch user matrix data']);
        hasWarnings = true;
      }

      // Handle config data with new token fields
      if (configResponse.status === 'fulfilled') {
        const { data: configResult, error: configError } = configResponse.value;
        
        if (configError) {
          console.error('Config data error:', configError);
          setWarnings(prev => [...prev, `Model configuration failed to load: ${configError.message}`]);
          hasWarnings = true;
        } else {
          // Process model configs with new token configuration data
          const processedConfigs = (configResult || []).map((config: any) => ({
            ...config,
            primary_use_cases: Array.isArray(config.primary_use_cases) 
              ? config.primary_use_cases 
              : config.primary_use_cases 
                ? JSON.parse(config.primary_use_cases) 
                : [],
            cost_tier: config.cost_tier as CostTier,
            context_window_tokens: config.context_window_tokens || 0,
            supports_streaming: config.supports_streaming !== false,
            recommended_max_tokens: config.recommended_max_tokens || 4000,
            recommended_context_tokens: config.recommended_context_tokens || 8000,
            optimal_temperature: Number(config.optimal_temperature) || 0.7,
            provider_specific_params: config.provider_specific_params || {}
          }));
          
          setModelConfigs(processedConfigs);
        }
      } else {
        console.error('Config fetch failed:', configResponse.reason);
        setWarnings(prev => [...prev, 'Failed to fetch model configurations']);
        hasWarnings = true;
      }

      // Show appropriate notifications
      if (hasWarnings) {
        toast.warning('Partial data loaded - some features may be limited');
      }

    } catch (err) {
      console.error('Unexpected error fetching matrix data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      toast.error('Failed to load admin matrix data');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUpdateAccess = async (
    userIds: string[],
    provider: string,
    modelName: string,
    isEnabled: boolean,
    monthlyLimit?: number
  ) => {
    try {
      const { data, error } = await supabase.rpc('bulk_update_user_model_access', {
        user_ids: userIds,
        provider_param: provider,
        model_param: modelName,
        is_enabled_param: isEnabled,
        monthly_limit_param: monthlyLimit
      });

      if (error) throw error;

      toast.success(`Updated access for ${data} users`);
      await fetchMatrixData(); // Refresh data
      return data;
    } catch (err) {
      console.error('Error updating bulk access:', err);
      toast.error('Failed to update user access');
      throw err;
    }
  };

  const updateModelConfig = async (
    provider: string,
    modelName: string,
    updates: Partial<{
      is_globally_enabled: boolean;
      default_monthly_limit: number;
      cost_per_1k_tokens: number;
      primary_use_cases: string[];
      recommended_for: string;
      cost_tier: CostTier;
      performance_notes: string;
      context_window_tokens: number;
      supports_streaming: boolean;
      recommended_max_tokens: number;
      recommended_context_tokens: number;
      optimal_temperature: number;
      provider_specific_params: Record<string, any>;
    }>
  ) => {
    try {
      // Convert arrays and objects to proper format for database
      const dbUpdates: any = { ...updates };
      
      if (updates.primary_use_cases) {
        dbUpdates.primary_use_cases = JSON.stringify(updates.primary_use_cases);
      }
      
      if (updates.provider_specific_params) {
        dbUpdates.provider_specific_params = JSON.stringify(updates.provider_specific_params);
      }

      const { error } = await supabase
        .from('model_configurations')
        .update(dbUpdates)
        .eq('provider', provider)
        .eq('model_name', modelName);

      if (error) throw error;

      toast.success('Model configuration updated');
      await fetchMatrixData(); // Refresh data
    } catch (err) {
      console.error('Error updating model config:', err);
      toast.error('Failed to update model configuration');
      throw err;
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, []);

  return {
    matrixData,
    modelConfigs,
    isLoading,
    error,
    warnings,
    refetch: fetchMatrixData,
    bulkUpdateAccess,
    updateModelConfig,
  };
};
