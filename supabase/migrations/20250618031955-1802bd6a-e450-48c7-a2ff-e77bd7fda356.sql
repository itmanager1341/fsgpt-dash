
-- Create model_configurations table for global model settings
CREATE TABLE public.model_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_globally_enabled BOOLEAN NOT NULL DEFAULT true,
  default_monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  cost_per_1k_tokens DECIMAL(8,4) NOT NULL DEFAULT 0.0200,
  max_tokens INTEGER DEFAULT 4000,
  capabilities JSONB DEFAULT '{}',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider, model_name)
);

-- Enable RLS
ALTER TABLE public.model_configurations ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage model configurations" ON public.model_configurations
  FOR ALL USING (public.has_role('admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_model_configurations_provider ON public.model_configurations(provider);
CREATE INDEX idx_model_configurations_enabled ON public.model_configurations(is_globally_enabled);

-- Insert default model configurations
INSERT INTO public.model_configurations (provider, model_name, display_name, cost_per_1k_tokens, default_monthly_limit, max_tokens, capabilities, display_order) VALUES
-- OpenAI models
('openai', 'gpt-4.1-2025-04-14', 'GPT-4.1 (Latest)', 0.0300, 50.00, 128000, '{"vision": false, "streaming": true, "reasoning": true}', 1),
('openai', 'o3-2025-04-16', 'O3 (Reasoning)', 0.0600, 30.00, 65536, '{"vision": false, "streaming": false, "reasoning": true}', 2),
('openai', 'o4-mini-2025-04-16', 'O4 Mini (Fast Reasoning)', 0.0150, 40.00, 65536, '{"vision": false, "streaming": true, "reasoning": true}', 3),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 0.0010, 60.00, 128000, '{"vision": true, "streaming": true, "reasoning": false}', 4),

-- Perplexity models
('perplexity', 'llama-3.1-sonar-small-128k-online', 'Llama 3.1 Sonar Small (Online)', 0.0020, 30.00, 127072, '{"vision": false, "streaming": true, "online": true}', 5),
('perplexity', 'llama-3.1-sonar-large-128k-online', 'Llama 3.1 Sonar Large (Online)', 0.0060, 20.00, 127072, '{"vision": false, "streaming": true, "online": true}', 6),
('perplexity', 'llama-3.1-sonar-huge-128k-online', 'Llama 3.1 Sonar Huge (Online)', 0.0200, 10.00, 127072, '{"vision": false, "streaming": true, "online": true}', 7);

-- Create function to get admin model overview
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
  api_key_status text
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
    END as api_key_status
  FROM public.model_configurations mc
  LEFT JOIN public.user_api_access uaa ON mc.provider = uaa.provider AND mc.model_name = uaa.model_name
  LEFT JOIN public.api_keys ak ON mc.provider = ak.service
  GROUP BY mc.provider, mc.model_name, mc.display_name, mc.is_globally_enabled, 
           mc.default_monthly_limit, mc.cost_per_1k_tokens, ak.is_active
  ORDER BY mc.display_order;
END;
$$;

-- Create function to get user-model matrix data
CREATE OR REPLACE FUNCTION public.get_user_model_matrix()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_name text,
  user_status text,
  total_monthly_usage numeric,
  conversation_count bigint,
  model_access jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      p.id as user_id,
      p.email,
      CONCAT(p.first_name, ' ', p.last_name) as full_name,
      p.status,
      COALESCE(SUM(uaa.current_usage), 0) as total_usage,
      COUNT(DISTINCT c.id) as conv_count
    FROM public.profiles p
    LEFT JOIN public.user_api_access uaa ON p.id = uaa.user_id
    LEFT JOIN public.conversations c ON p.id = c.user_id
    GROUP BY p.id, p.email, p.first_name, p.last_name, p.status
  ),
  model_data AS (
    SELECT 
      us.user_id,
      jsonb_object_agg(
        CONCAT(mc.provider, ':', mc.model_name),
        jsonb_build_object(
          'isEnabled', COALESCE(uaa.is_enabled, false),
          'currentUsage', COALESCE(uaa.current_usage, 0),
          'monthlyLimit', COALESCE(uaa.monthly_limit, mc.default_monthly_limit),
          'usagePercentage', 
            CASE 
              WHEN COALESCE(uaa.monthly_limit, mc.default_monthly_limit) > 0 
              THEN (COALESCE(uaa.current_usage, 0) / COALESCE(uaa.monthly_limit, mc.default_monthly_limit) * 100)
              ELSE 0 
            END,
          'isOverLimit', COALESCE(uaa.current_usage, 0) >= COALESCE(uaa.monthly_limit, mc.default_monthly_limit)
        )
      ) as access_data
    FROM user_stats us
    CROSS JOIN public.model_configurations mc
    LEFT JOIN public.user_api_access uaa ON us.user_id = uaa.user_id 
      AND mc.provider = uaa.provider 
      AND mc.model_name = uaa.model_name
    WHERE mc.is_globally_enabled = true
    GROUP BY us.user_id
  )
  SELECT 
    us.user_id,
    us.email,
    us.full_name,
    us.status,
    us.total_usage,
    us.conv_count,
    COALESCE(md.access_data, '{}'::jsonb)
  FROM user_stats us
  LEFT JOIN model_data md ON us.user_id = md.user_id
  ORDER BY us.email;
END;
$$;

-- Create function to bulk update user model access
CREATE OR REPLACE FUNCTION public.bulk_update_user_model_access(
  user_ids uuid[],
  provider_param text,
  model_param text,
  is_enabled_param boolean,
  monthly_limit_param numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count integer := 0;
  user_id_param uuid;
  default_limit numeric;
BEGIN
  -- Get default limit from model configuration
  SELECT default_monthly_limit INTO default_limit
  FROM public.model_configurations
  WHERE provider = provider_param AND model_name = model_param;
  
  -- If no default found, use 20.00
  default_limit := COALESCE(default_limit, 20.00);
  
  FOREACH user_id_param IN ARRAY user_ids
  LOOP
    INSERT INTO public.user_api_access (
      user_id, provider, model_name, is_enabled, monthly_limit, current_usage
    ) VALUES (
      user_id_param, 
      provider_param, 
      model_param, 
      is_enabled_param, 
      COALESCE(monthly_limit_param, default_limit), 
      0.0000
    )
    ON CONFLICT (user_id, model_name, provider) 
    DO UPDATE SET 
      is_enabled = is_enabled_param,
      monthly_limit = COALESCE(monthly_limit_param, user_api_access.monthly_limit),
      updated_at = now();
    
    affected_count := affected_count + 1;
  END LOOP;
  
  RETURN affected_count;
END;
$$;
