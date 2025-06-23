
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_admin_model_overview();

-- Add new token-related columns to model_configurations table
ALTER TABLE public.model_configurations 
ADD COLUMN IF NOT EXISTS recommended_max_tokens INTEGER DEFAULT 4000,
ADD COLUMN IF NOT EXISTS recommended_context_tokens INTEGER DEFAULT 8000,
ADD COLUMN IF NOT EXISTS optimal_temperature DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS provider_specific_params JSONB DEFAULT '{}';

-- Update existing model configurations with optimized token settings

-- OpenAI Models
UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 8000,
  recommended_context_tokens = 120000,
  optimal_temperature = 0.70,
  provider_specific_params = '{"supports_function_calling": true, "supports_vision": false}'
WHERE provider = 'openai' AND model_name = 'gpt-4.1-2025-04-14';

UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 6000,
  recommended_context_tokens = 60000,
  optimal_temperature = 0.30,
  provider_specific_params = '{"reasoning_model": true, "supports_complex_tasks": true}'
WHERE provider = 'openai' AND model_name = 'o3-2025-04-16';

UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 4000,
  recommended_context_tokens = 60000,
  optimal_temperature = 0.50,
  provider_specific_params = '{"fast_reasoning": true, "supports_coding": true}'
WHERE provider = 'openai' AND model_name = 'o4-mini-2025-04-16';

UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 2000,
  recommended_context_tokens = 120000,
  optimal_temperature = 0.70,
  provider_specific_params = '{"supports_vision": true, "cost_effective": true}'
WHERE provider = 'openai' AND model_name = 'gpt-4o-mini';

-- Perplexity Models
UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 8000,
  recommended_context_tokens = 100000,
  optimal_temperature = 0.20,
  provider_specific_params = '{
    "online_search": true, 
    "return_images": false, 
    "return_related_questions": false, 
    "search_recency_filter": "month",
    "frequency_penalty": 1.0,
    "presence_penalty": 0.0,
    "search_domain_filter": []
  }'
WHERE provider = 'perplexity' AND model_name = 'llama-3.1-sonar-small-128k-online';

UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 12000,
  recommended_context_tokens = 120000,
  optimal_temperature = 0.20,
  provider_specific_params = '{
    "online_search": true, 
    "return_images": false, 
    "return_related_questions": false, 
    "search_recency_filter": "month",
    "frequency_penalty": 1.0,
    "presence_penalty": 0.0,
    "search_domain_filter": []
  }'
WHERE provider = 'perplexity' AND model_name = 'llama-3.1-sonar-large-128k-online';

UPDATE public.model_configurations 
SET 
  recommended_max_tokens = 16000,
  recommended_context_tokens = 120000,
  optimal_temperature = 0.20,
  provider_specific_params = '{
    "online_search": true, 
    "return_images": false, 
    "return_related_questions": false, 
    "search_recency_filter": "month",
    "frequency_penalty": 1.0,
    "presence_penalty": 0.0,
    "search_domain_filter": []
  }'
WHERE provider = 'perplexity' AND model_name = 'llama-3.1-sonar-huge-128k-online';

-- Create function to get model token configuration
CREATE OR REPLACE FUNCTION public.get_model_token_config(
  provider_param text,
  model_param text
)
RETURNS TABLE(
  recommended_max_tokens integer,
  recommended_context_tokens integer,
  optimal_temperature decimal,
  provider_specific_params jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.recommended_max_tokens,
    mc.recommended_context_tokens,
    mc.optimal_temperature,
    mc.provider_specific_params
  FROM public.model_configurations mc
  WHERE mc.provider = provider_param 
    AND mc.model_name = model_param
    AND mc.is_globally_enabled = true;
END;
$$;

-- Recreate the admin model overview function with new token fields
CREATE OR REPLACE FUNCTION public.get_admin_model_overview()
RETURNS TABLE(
  provider text,
  model_name text,
  display_name text,
  is_globally_enabled boolean,
  default_monthly_limit numeric,
  cost_per_1k_tokens numeric,
  total_users_with_access bigint,
  total_monthly_usage numeric,
  api_key_status text,
  last_pricing_update timestamp with time zone,
  pricing_source text,
  is_deprecated boolean,
  api_availability text,
  primary_use_cases jsonb,
  recommended_for text,
  cost_tier text,
  performance_notes text,
  context_window_tokens integer,
  supports_streaming boolean,
  recommended_max_tokens integer,
  recommended_context_tokens integer,
  optimal_temperature numeric,
  provider_specific_params jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.provider,
    mc.model_name,
    mc.display_name,
    mc.is_globally_enabled,
    mc.default_monthly_limit,
    mc.cost_per_1k_tokens,
    COUNT(DISTINCT uaa.user_id) as total_users_with_access,
    COALESCE(SUM(uaa.current_usage), 0) as total_monthly_usage,
    CASE 
      WHEN ak.is_active THEN 'active'
      ELSE 'inactive'
    END as api_key_status,
    mc.last_pricing_update,
    mc.pricing_source,
    mc.is_deprecated,
    mc.api_availability,
    mc.primary_use_cases,
    mc.recommended_for,
    mc.cost_tier,
    mc.performance_notes,
    mc.context_window_tokens,
    mc.supports_streaming,
    mc.recommended_max_tokens,
    mc.recommended_context_tokens,
    mc.optimal_temperature,
    mc.provider_specific_params
  FROM public.model_configurations mc
  LEFT JOIN public.user_api_access uaa ON mc.provider = uaa.provider AND mc.model_name = uaa.model_name
  LEFT JOIN public.api_keys ak ON mc.provider = ak.service
  GROUP BY 
    mc.provider, 
    mc.model_name, 
    mc.display_name, 
    mc.is_globally_enabled, 
    mc.default_monthly_limit, 
    mc.cost_per_1k_tokens, 
    mc.display_order,
    ak.is_active,
    mc.last_pricing_update,
    mc.pricing_source,
    mc.is_deprecated,
    mc.api_availability,
    mc.primary_use_cases,
    mc.recommended_for,
    mc.cost_tier,
    mc.performance_notes,
    mc.context_window_tokens,
    mc.supports_streaming,
    mc.recommended_max_tokens,
    mc.recommended_context_tokens,
    mc.optimal_temperature,
    mc.provider_specific_params
  ORDER BY mc.display_order;
END;
$$;
