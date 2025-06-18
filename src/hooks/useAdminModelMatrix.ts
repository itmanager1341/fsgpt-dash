
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
}

export const useAdminModelMatrix = () => {
  const [matrixData, setMatrixData] = useState<UserModelMatrixData[]>([]);
  const [modelConfigs, setModelConfigs] = useState<ModelConfigData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrixData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: matrixResult, error: matrixError } = await supabase.rpc('get_user_model_matrix');
      const { data: configResult, error: configError } = await supabase.rpc('get_admin_model_overview');

      if (matrixError) throw matrixError;
      if (configError) throw configError;

      // Type the data properly to handle the Json type from Supabase
      const typedMatrixData = (matrixResult || []).map((row: any) => ({
        ...row,
        model_access: typeof row.model_access === 'string' 
          ? JSON.parse(row.model_access) 
          : row.model_access || {}
      })) as UserModelMatrixData[];

      setMatrixData(typedMatrixData);
      setModelConfigs(configResult || []);
    } catch (err) {
      console.error('Error fetching matrix data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      toast.error('Failed to load user-model matrix');
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
    }>
  ) => {
    try {
      const { error } = await supabase
        .from('model_configurations')
        .update(updates)
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
    refetch: fetchMatrixData,
    bulkUpdateAccess,
    updateModelConfig,
  };
};
