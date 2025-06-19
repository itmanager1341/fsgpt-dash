
-- Add new columns to model_configurations table for usage guidance
ALTER TABLE public.model_configurations 
ADD COLUMN IF NOT EXISTS primary_use_cases JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_for TEXT,
ADD COLUMN IF NOT EXISTS cost_tier TEXT CHECK (cost_tier IN ('Budget', 'Moderate', 'Premium')),
ADD COLUMN IF NOT EXISTS performance_notes TEXT,
ADD COLUMN IF NOT EXISTS context_window_tokens INTEGER,
ADD COLUMN IF NOT EXISTS supports_streaming BOOLEAN DEFAULT true;

-- Update existing models with actual usage guidance data based on their costs and capabilities

-- OpenAI GPT-4.1 (Premium tier - $0.030 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["deep_research", "reasoning", "coding", "content_creation"]'::jsonb,
  recommended_for = 'Complex analysis, advanced reasoning, high-quality content creation, and sophisticated coding tasks',
  cost_tier = 'Premium',
  performance_notes = 'Flagship model with superior reasoning and comprehensive capabilities',
  context_window_tokens = 128000,
  supports_streaming = true
WHERE provider = 'openai' AND model_name = 'gpt-4.1-2025-04-14';

-- OpenAI O3 (Premium tier - $0.060 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["reasoning", "deep_research", "complex_problem_solving"]'::jsonb,
  recommended_for = 'Multi-step reasoning, complex mathematical problems, advanced analysis requiring deep thinking',
  cost_tier = 'Premium',
  performance_notes = 'Powerful reasoning model optimized for complex analytical tasks',
  context_window_tokens = 128000,
  supports_streaming = true
WHERE provider = 'openai' AND model_name = 'o3-2025-04-16';

-- OpenAI O4 Mini (Moderate tier - $0.0063 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["quick_tasks", "coding", "reasoning", "content_creation"]'::jsonb,
  recommended_for = 'Fast reasoning, efficient coding assistance, quick analysis tasks',
  cost_tier = 'Moderate',
  performance_notes = 'Fast reasoning model optimized for efficiency and coding tasks',
  context_window_tokens = 128000,
  supports_streaming = true
WHERE provider = 'openai' AND model_name = 'o4-mini-2025-04-16';

-- OpenAI GPT-4o Mini (Budget tier - $0.0003 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["quick_tasks", "content_creation", "coding"]'::jsonb,
  recommended_for = 'Quick responses, simple content generation, basic coding assistance, cost-effective tasks',
  cost_tier = 'Budget',
  performance_notes = 'Cost-effective model for routine tasks and quick responses',
  context_window_tokens = 128000,
  supports_streaming = true
WHERE provider = 'openai' AND model_name = 'gpt-4o-mini';

-- Perplexity Llama Small Online (Budget tier - $0.0002 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["real_time_info", "quick_tasks", "research"]'::jsonb,
  recommended_for = 'Real-time information retrieval, current events, quick research with web access',
  cost_tier = 'Budget',
  performance_notes = 'Cost-effective model with real-time web access for current information',
  context_window_tokens = 127072,
  supports_streaming = true
WHERE provider = 'perplexity' AND model_name = 'llama-3.1-sonar-small-128k-online';

-- Anthropic Claude Opus 4 (Premium tier - $0.075 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["deep_research", "reasoning", "content_creation", "complex_problem_solving"]'::jsonb,
  recommended_for = 'Most capable model for complex analysis, superior reasoning, and high-quality content',
  cost_tier = 'Premium',
  performance_notes = 'Most capable and intelligent model with exceptional reasoning abilities',
  context_window_tokens = 200000,
  supports_streaming = true
WHERE provider = 'anthropic' AND model_name = 'claude-opus-4-20250514';

-- Anthropic Claude Sonnet 4 (Moderate tier - $0.015 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["reasoning", "coding", "content_creation", "quick_tasks"]'::jsonb,
  recommended_for = 'High-performance model with exceptional reasoning and efficiency balance',
  cost_tier = 'Moderate',
  performance_notes = 'Balanced performance model with strong reasoning and efficiency',
  context_window_tokens = 200000,
  supports_streaming = true
WHERE provider = 'anthropic' AND model_name = 'claude-sonnet-4-20250514';

-- Anthropic Claude Haiku 3.5 (Budget tier - $0.001 per 1k tokens)
UPDATE public.model_configurations 
SET 
  primary_use_cases = '["quick_tasks", "content_creation", "coding"]'::jsonb,
  recommended_for = 'Fastest model for quick responses, simple tasks, and rapid interactions',
  cost_tier = 'Budget',
  performance_notes = 'Fastest model optimized for speed and quick responses',
  context_window_tokens = 200000,
  supports_streaming = true
WHERE provider = 'anthropic' AND model_name = 'claude-3-5-haiku-20241022';

-- Update the get_admin_model_overview function to include new fields
DROP FUNCTION IF EXISTS public.get_admin_model_overview();

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
  supports_streaming boolean
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
    mc.supports_streaming
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
    mc.supports_streaming
  ORDER BY mc.display_order;
END;
$$;
