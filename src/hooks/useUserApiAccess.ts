
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModelAccess } from '@/types/frontend';
import { toast } from 'sonner';

interface UserApiAccessData {
  provider: string;
  model_name: string;
  is_enabled: boolean;
  usage_percentage: number;
  remaining_credits: number;
  monthly_limit: number;
  is_over_limit: boolean;
}

export const useUserApiAccess = () => {
  const [modelAccess, setModelAccess] = useState<ModelAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserApiAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .rpc('get_user_model_access', { user_id_param: session.user.id });

      if (error) {
        throw error;
      }

      if (!data) {
        setModelAccess([]);
        return;
      }

      const formattedModelAccess: ModelAccess[] = data.map((item: UserApiAccessData) => ({
        modelName: item.model_name,
        provider: item.provider as any,
        isEnabled: item.is_enabled,
        usagePercentage: Number(item.usage_percentage),
        remainingCredits: Number(item.remaining_credits),
        monthlyLimit: Number(item.monthly_limit),
        isOverLimit: item.is_over_limit,
      }));

      setModelAccess(formattedModelAccess);

    } catch (err) {
      console.error('Error fetching user API access:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch API access data');
      toast.error('Failed to load model access data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUsage = useCallback(async (provider: string, model: string, cost: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .rpc('update_user_api_usage', {
          user_id_param: session.user.id,
          provider_param: provider,
          model_param: model,
          cost_param: cost
        });

      if (error) {
        throw error;
      }

      // Refresh the data after updating usage
      await fetchUserApiAccess();

    } catch (err) {
      console.error('Error updating usage:', err);
      toast.error('Failed to update usage data');
    }
  }, [fetchUserApiAccess]);

  useEffect(() => {
    fetchUserApiAccess();
  }, [fetchUserApiAccess]);

  return {
    modelAccess,
    isLoading,
    error,
    refetch: fetchUserApiAccess,
    updateUsage,
  };
};
