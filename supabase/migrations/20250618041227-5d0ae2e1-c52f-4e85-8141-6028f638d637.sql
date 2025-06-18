
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_admin_model_overview();

-- Create the function with the complete return type including missing fields
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
  api_availability text
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
    mc.api_availability
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
    mc.api_availability
  ORDER BY mc.display_order;
END;
$$;
