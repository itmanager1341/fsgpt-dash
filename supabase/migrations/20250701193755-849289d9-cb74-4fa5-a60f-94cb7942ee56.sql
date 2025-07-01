
-- Fix Function Search Path Mutable vulnerabilities by adding SET search_path to all SECURITY DEFINER functions
-- This prevents schema injection attacks by explicitly setting the search path

-- Batch 1: Core Security Functions
CREATE OR REPLACE FUNCTION public.has_role(_role app_role, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_file_upload(file_name text, file_size bigint, file_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Check file size (max 100MB)
  IF file_size > 104857600 THEN
    RETURN false;
  END IF;
  
  -- Check allowed file types for audio uploads
  IF file_type NOT IN ('audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/flac') THEN
    RETURN false;
  END IF;
  
  -- Check file name length and characters
  IF length(file_name) > 255 OR file_name ~ '[<>:"/\\|?*]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_content(content text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Basic HTML tag removal (for more comprehensive sanitization, use a proper library)
  RETURN regexp_replace(content, '<[^>]*>', '', 'g');
END;
$function$;

-- Batch 2: Admin Dashboard Functions
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(total_users bigint, active_today bigint, active_this_week bigint, active_this_month bigint, total_conversations bigint, conversations_today bigint, conversations_this_week bigint, conversations_this_month bigint, total_cost numeric, cost_today numeric, cost_this_week numeric, cost_this_month numeric, avg_response_time numeric, error_rate numeric, active_connections bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*)::bigint as total_users,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE)::bigint as active_today,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as active_this_week,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days')::bigint as active_this_month
    FROM public.profiles p
  ),
  conversation_stats AS (
    SELECT
      COUNT(*)::bigint as total_conversations,
      COUNT(*) FILTER (WHERE c.created_at >= CURRENT_DATE)::bigint as conversations_today,
      COUNT(*) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as conversations_this_week,
      COUNT(*) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days')::bigint as conversations_this_month
    FROM public.conversations c
  ),
  cost_stats AS (
    SELECT
      COALESCE(SUM(c.total_cost), 0) as total_cost,
      COALESCE(SUM(c.total_cost) FILTER (WHERE c.updated_at >= CURRENT_DATE), 0) as cost_today,
      COALESCE(SUM(c.total_cost) FILTER (WHERE c.updated_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as cost_this_week,
      COALESCE(SUM(c.total_cost) FILTER (WHERE c.updated_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as cost_this_month
    FROM public.conversations c
  ),
  system_stats AS (
    SELECT
      COALESCE(AVG(l.duration_ms), 0) as avg_response_time,
      COALESCE(
        COUNT(*) FILTER (WHERE l.status = 'error')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
        0
      ) as error_rate
    FROM public.llm_usage_logs l
    WHERE l.created_at >= CURRENT_DATE - INTERVAL '24 hours'
  )
  SELECT
    us.total_users,
    us.active_today,
    us.active_this_week,
    us.active_this_month,
    cs.total_conversations,
    cs.conversations_today,
    cs.conversations_this_week,
    cs.conversations_this_month,
    cost.total_cost,
    cost.cost_today,
    cost.cost_this_week,
    cost.cost_this_month,
    ss.avg_response_time,
    ss.error_rate,
    10::bigint as active_connections
  FROM user_stats us, conversation_stats cs, cost_stats cost, system_stats ss;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_daily_usage_trends(start_date date DEFAULT (CURRENT_DATE - '7 days'::interval), end_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(date date, conversations bigint, cost numeric, users bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date as date
  )
  SELECT
    ds.date,
    COALESCE(COUNT(c.id), 0)::bigint as conversations,
    COALESCE(SUM(c.total_cost), 0) as cost,
    COALESCE(COUNT(DISTINCT c.user_id), 0)::bigint as users
  FROM date_series ds
  LEFT JOIN public.conversations c ON c.created_at::date = ds.date
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_model_usage_distribution()
 RETURNS TABLE(provider text, model_name text, usage_count bigint, total_cost numeric, usage_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH model_stats AS (
    SELECT
      m.provider_used as provider,
      m.model_used as model_name,
      COUNT(*)::bigint as usage_count,
      COALESCE(SUM(m.cost), 0) as model_total_cost
    FROM public.messages m
    WHERE m.provider_used IS NOT NULL AND m.model_used IS NOT NULL
    GROUP BY m.provider_used, m.model_used
  ),
  total_usage AS (
    SELECT SUM(ms.usage_count) as total_count FROM model_stats ms
  )
  SELECT
    ms.provider,
    ms.model_name,
    ms.usage_count,
    ms.model_total_cost,
    CASE
      WHEN tu.total_count > 0 THEN (ms.usage_count::numeric / tu.total_count::numeric * 100)
      ELSE 0
    END as usage_percentage
  FROM model_stats ms, total_usage tu
  ORDER BY ms.usage_count DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_users_by_usage(period_days integer DEFAULT 30, limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, user_email text, user_name text, total_cost numeric, conversation_count bigint, usage_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH user_usage AS (
    SELECT
      p.id as user_id,
      p.email as user_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
      COALESCE(SUM(uaa.current_usage), 0) as user_total_cost,
      COUNT(DISTINCT c.id)::bigint as conversation_count
    FROM public.profiles p
    LEFT JOIN public.user_api_access uaa ON p.id = uaa.user_id
    LEFT JOIN public.conversations c ON p.id = c.user_id
      AND c.created_at >= CURRENT_DATE - (period_days || ' days')::interval
    WHERE p.created_at >= CURRENT_DATE - (period_days || ' days')::interval
    GROUP BY p.id, p.email, p.first_name, p.last_name
    HAVING COALESCE(SUM(uaa.current_usage), 0) > 0
  ),
  total_cost AS (
    SELECT SUM(uu.user_total_cost) as total FROM user_usage uu
  )
  SELECT
    uu.user_id,
    uu.user_email,
    uu.user_name,
    uu.user_total_cost,
    uu.conversation_count,
    CASE
      WHEN tc.total > 0 THEN (uu.user_total_cost / tc.total * 100)
      ELSE 0
    END as usage_percentage
  FROM user_usage uu, total_cost tc
  ORDER BY uu.user_total_cost DESC
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_usage_alerts()
 RETURNS TABLE(user_id uuid, user_email text, user_name text, current_usage numeric, monthly_limit numeric, usage_percentage numeric, alert_level text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.email as user_email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
    uaa.current_usage,
    uaa.monthly_limit,
    CASE
      WHEN uaa.monthly_limit > 0 THEN (uaa.current_usage / uaa.monthly_limit * 100)
      ELSE 0
    END as usage_percentage,
    CASE
      WHEN uaa.current_usage >= uaa.monthly_limit THEN 'critical'
      WHEN uaa.current_usage >= uaa.monthly_limit * 0.9 THEN 'warning'
      WHEN uaa.current_usage >= uaa.monthly_limit * 0.8 THEN 'caution'
      ELSE 'normal'
    END as alert_level
  FROM public.profiles p
  JOIN public.user_api_access uaa ON p.id = uaa.user_id
  WHERE uaa.current_usage >= uaa.monthly_limit * 0.8
  ORDER BY usage_percentage DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_recent_admin_activities(limit_count integer DEFAULT 20)
 RETURNS TABLE(id uuid, activity_type text, message text, user_email text, metadata jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH user_activities AS (
    SELECT
      p.id,
      'user_registration' as activity_type,
      'New user registration: ' || p.email as message,
      p.email as user_email,
      jsonb_build_object('status', p.status) as metadata,
      p.created_at
    FROM public.profiles p
    WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT
      p.id,
      'user_approval' as activity_type,
      'User approved: ' || p.email as message,
      p.email as user_email,
      jsonb_build_object('approved_by', p.approved_by) as metadata,
      p.approved_at as created_at
    FROM public.profiles p
    WHERE p.approved_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT
      gen_random_uuid() as id,
      'high_usage' as activity_type,
      'High usage alert: ' || p.email || ' (' || ROUND(uaa.current_usage, 2) || '/' || uaa.monthly_limit || ')' as message,
      p.email as user_email,
      jsonb_build_object(
        'current_usage', uaa.current_usage,
        'monthly_limit', uaa.monthly_limit,
        'provider', uaa.provider,
        'model_name', uaa.model_name
      ) as metadata,
      uaa.updated_at as created_at
    FROM public.user_api_access uaa
    JOIN public.profiles p ON uaa.user_id = p.id
    WHERE uaa.current_usage >= uaa.monthly_limit * 0.9
      AND uaa.updated_at >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT *
  FROM user_activities
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_summary(target_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer, target_month integer DEFAULT (EXTRACT(month FROM CURRENT_DATE))::integer)
 RETURNS TABLE(total_conversations bigint, total_cost numeric, average_per_user numeric, active_users bigint, new_users bigint, top_model text, cost_growth_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  start_date date;
  end_date date;
  prev_month_cost numeric;
BEGIN
  start_date := make_date(target_year, target_month, 1);
  end_date := (start_date + INTERVAL '1 month - 1 day')::date;
  
  -- Get previous month cost for growth calculation
  SELECT COALESCE(SUM(total_cost), 0) INTO prev_month_cost
  FROM public.conversations
  WHERE created_at >= (start_date - INTERVAL '1 month')
    AND created_at < start_date;
  
  RETURN QUERY
  WITH monthly_stats AS (
    SELECT
      COUNT(DISTINCT c.id)::bigint as total_conversations,
      COALESCE(SUM(c.total_cost), 0) as total_cost,
      COUNT(DISTINCT c.user_id)::bigint as active_users
    FROM public.conversations c
    WHERE c.created_at::date BETWEEN start_date AND end_date
  ),
  new_users_count AS (
    SELECT COUNT(*)::bigint as new_users
    FROM public.profiles p
    WHERE p.created_at::date BETWEEN start_date AND end_date
  ),
  top_model_usage AS (
    SELECT m.model_used as top_model
    FROM public.messages m
    JOIN public.conversations c ON m.conversation_id = c.id
    WHERE c.created_at::date BETWEEN start_date AND end_date
      AND m.model_used IS NOT NULL
    GROUP BY m.model_used
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    ms.total_conversations,
    ms.total_cost,
    CASE
      WHEN ms.active_users > 0 THEN ms.total_cost / ms.active_users
      ELSE 0
    END as average_per_user,
    ms.active_users,
    nuc.new_users,
    COALESCE(tmu.top_model, 'N/A') as top_model,
    CASE
      WHEN prev_month_cost > 0 THEN ((ms.total_cost - prev_month_cost) / prev_month_cost * 100)
      ELSE 0
    END as cost_growth_percentage
  FROM monthly_stats ms, new_users_count nuc, top_model_usage tmu;
END;
$function$;

-- Batch 3: User Management Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Insert into profiles (keep this part as is)
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  
  -- Auto-assign the first user as admin, others as viewers
  INSERT INTO public.user_roles (user_id, role)
  SELECT 
    NEW.id,
    CASE WHEN (SELECT COUNT(*) FROM auth.users) <= 1 THEN 'admin'::public.app_role ELSE 'viewer'::public.app_role END;
    
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_user_api_access(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Insert default OpenAI models if they don't exist
  INSERT INTO public.user_api_access (user_id, provider, model_name, is_enabled, monthly_limit, current_usage)
  SELECT 
    user_id_param,
    'openai',
    model_name,
    true,
    CASE 
      WHEN model_name = 'gpt-4.1-2025-04-14' THEN 50.00
      WHEN model_name = 'o3-2025-04-16' THEN 30.00
      ELSE 20.00
    END,
    0.0000
  FROM (VALUES 
    ('gpt-4.1-2025-04-14'),
    ('o3-2025-04-16'),
    ('gpt-4o-mini')
  ) AS models(model_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_api_access 
    WHERE user_id = user_id_param 
    AND provider = 'openai' 
    AND model_name = models.model_name
  );

  -- Insert default Perplexity models if they don't exist
  INSERT INTO public.user_api_access (user_id, provider, model_name, is_enabled, monthly_limit, current_usage)
  SELECT 
    user_id_param,
    'perplexity',
    'llama-3.1-sonar-small-128k-online',
    true,
    20.00,
    0.0000
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_api_access 
    WHERE user_id = user_id_param 
    AND provider = 'perplexity' 
    AND model_name = 'llama-3.1-sonar-small-128k-online'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_api_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Initialize API access for the new user
  PERFORM public.initialize_user_api_access(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_api_usage(user_id_param uuid, provider_param text, model_param text, cost_param numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.user_api_access
  SET 
    current_usage = current_usage + cost_param,
    updated_at = now()
  WHERE user_id = user_id_param
    AND provider = provider_param
    AND model_name = model_param;
    
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_api_access (
      user_id, provider, model_name, is_enabled, monthly_limit, current_usage
    ) VALUES (
      user_id_param, provider_param, model_param, true, 20.00, cost_param
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_model_access(user_id_param uuid)
 RETURNS TABLE(provider text, model_name text, is_enabled boolean, usage_percentage numeric, remaining_credits numeric, monthly_limit numeric, is_over_limit boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    uaa.provider,
    uaa.model_name,
    uaa.is_enabled,
    CASE 
      WHEN uaa.monthly_limit > 0 THEN (uaa.current_usage / uaa.monthly_limit * 100)
      ELSE 0
    END as usage_percentage,
    GREATEST(0, uaa.monthly_limit - uaa.current_usage) as remaining_credits,
    uaa.monthly_limit,
    uaa.current_usage >= uaa.monthly_limit as is_over_limit
  FROM public.user_api_access uaa
  WHERE uaa.user_id = user_id_param
  ORDER BY uaa.provider, uaa.model_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_model_matrix()
 RETURNS TABLE(user_id uuid, user_email text, user_name text, user_status text, total_monthly_usage numeric, conversation_count bigint, model_access jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.bulk_update_user_model_access(user_ids uuid[], provider_param text, model_param text, is_enabled_param boolean, monthly_limit_param numeric DEFAULT NULL::numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_model_overview()
 RETURNS TABLE(provider text, model_name text, display_name text, is_globally_enabled boolean, default_monthly_limit numeric, cost_per_1k_tokens numeric, total_users_with_access bigint, total_monthly_usage numeric, api_key_status text, last_pricing_update timestamp with time zone, pricing_source text, is_deprecated boolean, api_availability text, primary_use_cases jsonb, recommended_for text, cost_tier text, performance_notes text, context_window_tokens integer, supports_streaming boolean, recommended_max_tokens integer, recommended_context_tokens integer, optimal_temperature numeric, provider_specific_params jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_available_models()
 RETURNS TABLE(provider text, model_name text, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  -- OpenAI models with proper table aliases
  SELECT 
    'openai'::text as provider,
    m.model_name,
    ak.is_active
  FROM api_keys ak
  CROSS JOIN (VALUES 
    ('gpt-4.1-2025-04-14'),
    ('gpt-4o'),
    ('gpt-4o-mini')
  ) AS m(model_name)
  WHERE ak.service = 'openai' AND ak.is_active = true
  
  UNION ALL
  
  -- Perplexity models with proper table aliases
  SELECT 
    'perplexity'::text as provider,
    p.model_name,
    ak.is_active
  FROM api_keys ak
  CROSS JOIN (VALUES 
    ('llama-3.1-sonar-small-128k-online'),
    ('llama-3.1-sonar-large-128k-online'), 
    ('llama-3.1-sonar-huge-128k-online')
  ) AS p(model_name)
  WHERE ak.service = 'perplexity' AND ak.is_active = true
  
  ORDER BY provider, model_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_model_token_config(provider_param text, model_param text)
 RETURNS TABLE(recommended_max_tokens integer, recommended_context_tokens integer, optimal_temperature numeric, provider_specific_params jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
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
$function$;

-- Batch 4: Job and Logging Functions
CREATE OR REPLACE FUNCTION public.log_job_execution(p_job_name text, p_execution_type text DEFAULT 'scheduled'::text, p_status text DEFAULT 'running'::text, p_message text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb, p_parameters_used jsonb DEFAULT '{}'::jsonb, p_triggered_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.job_execution_logs (
    job_name,
    execution_type,
    status,
    message,
    details,
    parameters_used,
    triggered_by
  ) VALUES (
    p_job_name,
    p_execution_type,
    p_status,
    p_message,
    p_details,
    p_parameters_used,
    p_triggered_by
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_llm_usage(p_function_name text, p_model text, p_prompt_tokens integer DEFAULT 0, p_completion_tokens integer DEFAULT 0, p_total_tokens integer DEFAULT 0, p_estimated_cost numeric DEFAULT 0.00, p_duration_ms integer DEFAULT NULL::integer, p_status text DEFAULT 'success'::text, p_error_message text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_operation_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.llm_usage_logs (
    function_name,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    estimated_cost,
    duration_ms,
    status,
    error_message,
    user_id,
    operation_metadata
  ) VALUES (
    p_function_name,
    p_model,
    p_prompt_tokens,
    p_completion_tokens,
    p_total_tokens,
    p_estimated_cost,
    p_duration_ms,
    p_status,
    p_error_message,
    p_user_id,
    p_operation_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_job_execution_status(p_log_id uuid, p_status text, p_message text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.job_execution_logs
  SET 
    status = p_status,
    message = COALESCE(p_message, message),
    details = COALESCE(p_details, details),
    completed_at = CASE 
      WHEN p_status IN ('success', 'error', 'cancelled') 
      THEN now() 
      ELSE completed_at 
    END
  WHERE id = p_log_id;
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_job_execution_logs(p_job_name text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_execution_type text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS SETOF job_execution_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.job_execution_logs
  WHERE 
    (p_job_name IS NULL OR job_name = p_job_name)
    AND (p_status IS NULL OR status = p_status)
    AND (p_execution_type IS NULL OR execution_type = p_execution_type)
  ORDER BY started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_job_settings(job_name_param text)
 RETURNS SETOF scheduled_job_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM scheduled_job_settings WHERE job_name = job_name_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_job_settings(job_name_param text, settings_json jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE scheduled_job_settings
  SET 
    is_enabled = COALESCE((settings_json->>'is_enabled')::boolean, is_enabled),
    schedule = COALESCE(settings_json->>'schedule', schedule),
    parameters = COALESCE(settings_json->'parameters', parameters),
    updated_at = now()
  WHERE job_name = job_name_param;
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_job_settings_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  result_msg TEXT;
BEGIN
  RAISE NOTICE 'Trigger fired for job: %, enabled: %', NEW.job_name, NEW.is_enabled;
  
  BEGIN
    -- Call the updated job management function
    SELECT update_news_fetch_job(
      NEW.job_name,
      NEW.schedule,
      NEW.is_enabled,
      NEW.parameters
    ) INTO result_msg;
    
    RAISE NOTICE 'Trigger result: %', result_msg;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Trigger error: %', SQLERRM;
    -- Don't fail the entire transaction, just log the error
  END;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_news_fetch_job(p_job_name text, p_schedule text, p_is_enabled boolean, p_parameters jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  job_id INTEGER;
  result TEXT;
  function_url TEXT;
  auth_header TEXT;
  job_body JSONB;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'update_news_fetch_job called with: %, %, %, %', p_job_name, p_schedule, p_is_enabled, p_parameters;
  
  -- Try to unschedule any existing job first
  BEGIN
    PERFORM cron.unschedule(p_job_name);
    RAISE NOTICE 'Unscheduled existing job: %', p_job_name;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No existing job to unschedule or error: %', SQLERRM;
  END;

  -- If job should be enabled, schedule it with new parameters
  IF p_is_enabled THEN
    -- Use the correct function URL
    function_url := 'https://grebpkcwmurbxorodiyb.supabase.co/functions/v1/run-news-import';
    
    -- Build the request body
    job_body := jsonb_build_object(
      'manual', false,
      'promptId', p_parameters->>'promptId',
      'modelOverride', p_parameters->>'model',
      'limit', COALESCE((p_parameters->>'limit')::integer, 20),
      'triggeredBy', 'cron_job'
    );
    
    RAISE NOTICE 'Scheduling job with body: %', job_body;
    
    BEGIN
      job_id := cron.schedule(
        p_job_name,
        p_schedule,
        format(
          $job$
          SELECT net.http_post(
            url:='%s',
            headers:='{
              "Content-Type": "application/json",
              "Authorization": "Bearer %s"
            }'::jsonb,
            body:='%s'::jsonb
          ) AS request_id;
          $job$,
          function_url,
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZWJwa2N3bXVyYnhvcm9kaXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODg5NzcsImV4cCI6MjA2MTg2NDk3N30.HuJWb1GhJrSD5vqeBhOn6lxcqPN9B4oX-eu1nJvsc68',
          job_body
        )
      );
      
      result := 'Job scheduled successfully with ID: ' || job_id;
      RAISE NOTICE 'Job scheduled successfully with ID: %', job_id;
      
    EXCEPTION WHEN OTHERS THEN
      result := 'Error scheduling job: ' || SQLERRM;
      RAISE NOTICE 'Error scheduling job: %', SQLERRM;
    END;
  ELSE
    result := 'Job unscheduled successfully';
    RAISE NOTICE 'Job unscheduled: %', p_job_name;
  END IF;
  
  -- Log the operation in job_execution_logs for tracking
  INSERT INTO public.job_execution_logs (
    job_name, 
    execution_type,
    status, 
    message,
    details
  ) VALUES (
    p_job_name,
    'configuration',
    'success',
    result,
    jsonb_build_object(
      'schedule', p_schedule,
      'enabled', p_is_enabled,
      'parameters', p_parameters
    )
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_scheduled_job(job_name_param text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  job_settings RECORD;
  result_msg TEXT;
BEGIN
  -- Get the job settings
  SELECT * INTO job_settings 
  FROM scheduled_job_settings 
  WHERE job_name = job_name_param;
  
  IF NOT FOUND THEN
    RETURN 'Job not found: ' || job_name_param;
  END IF;
  
  -- Force re-creation of the cron job using the updated function
  SELECT update_news_fetch_job(
    job_settings.job_name,
    job_settings.schedule,
    job_settings.is_enabled,
    job_settings.parameters
  ) INTO result_msg;
  
  -- Update the job settings to trigger any dependent processes
  UPDATE scheduled_job_settings 
  SET updated_at = now()
  WHERE job_name = job_name_param;
  
  RETURN 'Reactivated job: ' || job_name_param || ' - ' || result_msg;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, nodename text, nodeport integer, database text, username text, active boolean, next_run timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Check if pg_cron is installed and accessible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Return records from cron.job if it exists
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'cron' AND c.relname = 'job'
    ) THEN
      -- Check if next_run column exists, if not use NULL
      IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'cron' 
          AND c.relname = 'job'
          AND a.attname = 'next_run'
      ) THEN
        RETURN QUERY
        SELECT 
          j.jobid,
          j.jobname,
          j.schedule,
          j.command,
          j.nodename,
          j.nodeport,
          j.database,
          j.username,
          j.active,
          j.next_run
        FROM cron.job j;
      ELSE
        -- If next_run doesn't exist, use NULL for that column
        RETURN QUERY
        SELECT 
          j.jobid,
          j.jobname,
          j.schedule,
          j.command,
          j.nodename,
          j.nodeport,
          j.database,
          j.username,
          j.active,
          NULL::TIMESTAMP WITH TIME ZONE as next_run
        FROM cron.job j;
      END IF;
    END IF;
  END IF;
  -- Return empty result set if pg_cron is not available or table doesn't exist
  RETURN;
END;
$function$;

-- Batch 5: Additional API and Utility Functions
CREATE OR REPLACE FUNCTION public.get_active_api_key(service_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  key_id UUID;
BEGIN
  SELECT id INTO key_id 
  FROM public.api_keys 
  WHERE service = service_name 
    AND is_active = true 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  RETURN key_id::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_approval_stats(start_date date, end_date date)
 RETURNS TABLE(approval_date date, mpdaily_count bigint, magazine_count bigint, website_count bigint, dismissed_count bigint, total_reviewed bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date as date
    ),
    status_counts AS (
        SELECT 
            date_trunc('day', timestamp)::date as day,
            COUNT(*) FILTER (WHERE 'mpdaily' = ANY(destinations)) as mpdaily,
            COUNT(*) FILTER (WHERE 'magazine' = ANY(destinations)) as magazine,
            COUNT(*) FILTER (WHERE 'website' = ANY(destinations)) as website,
            COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed,
            COUNT(*) FILTER (WHERE status IN ('approved', 'dismissed')) as total
        FROM news
        WHERE timestamp::date BETWEEN start_date AND end_date
        GROUP BY day
    )
    SELECT 
        d.date as approval_date,
        COALESCE(sc.mpdaily, 0) as mpdaily_count,
        COALESCE(sc.magazine, 0) as magazine_count,
        COALESCE(sc.website, 0) as website_count,
        COALESCE(sc.dismissed, 0) as dismissed_count,
        COALESCE(sc.total, 0) as total_reviewed
    FROM date_range d
    LEFT JOIN status_counts sc ON d.date = sc.day
    ORDER BY d.date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_content_chunks(query_text text, query_embedding vector DEFAULT NULL::vector, similarity_threshold double precision DEFAULT 0.7, max_results integer DEFAULT 20, article_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id uuid, article_id uuid, content text, word_count integer, chunk_type text, similarity double precision, rank double precision, article_title text, article_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      cc.id,
      cc.article_id,
      cc.content,
      cc.word_count,
      cc.chunk_type,
      CASE 
        WHEN query_embedding IS NOT NULL 
        THEN 1 - (cc.embedding <=> query_embedding)
        ELSE 0
      END as similarity,
      a.title as article_title,
      a.status as article_status
    FROM public.content_chunks cc
    JOIN public.articles a ON cc.article_id = a.id
    WHERE 
      (query_embedding IS NULL OR cc.embedding IS NOT NULL)
      AND (article_filters IS NULL OR (
        (article_filters->>'status' IS NULL OR a.status = article_filters->>'status')
        AND (article_filters->>'source_system' IS NULL OR a.source_system = article_filters->>'source_system')
      ))
  ),
  text_search AS (
    SELECT 
      cc.id,
      ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', query_text)) as text_rank
    FROM public.content_chunks cc
    JOIN public.articles a ON cc.article_id = a.id
    WHERE 
      to_tsvector('english', cc.content) @@ plainto_tsquery('english', query_text)
      AND (article_filters IS NULL OR (
        (article_filters->>'status' IS NULL OR a.status = article_filters->>'status')
        AND (article_filters->>'source_system' IS NULL OR a.source_system = article_filters->>'source_system')
      ))
  )
  SELECT 
    vs.id,
    vs.article_id,
    vs.content,
    vs.word_count,
    vs.chunk_type,
    vs.similarity,
    -- Combine vector similarity and text rank for hybrid scoring
    CASE 
      WHEN query_embedding IS NOT NULL AND ts.text_rank IS NOT NULL 
      THEN (vs.similarity * 0.7 + ts.text_rank * 0.3)
      WHEN query_embedding IS NOT NULL 
      THEN vs.similarity
      WHEN ts.text_rank IS NOT NULL 
      THEN ts.text_rank
      ELSE 0
    END as rank,
    vs.article_title,
    vs.article_status
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  WHERE 
    (query_embedding IS NULL OR vs.similarity >= similarity_threshold)
    OR (ts.text_rank IS NOT NULL)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;

-- Fix remaining trigger functions that don't use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_pricing_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Only log if cost_per_1k_tokens actually changed
  IF OLD.cost_per_1k_tokens IS DISTINCT FROM NEW.cost_per_1k_tokens THEN
    INSERT INTO public.pricing_history (
      provider,
      model_name,
      old_price,
      new_price,
      price_change_reason,
      updated_via,
      metadata
    ) VALUES (
      NEW.provider,
      NEW.model_name,
      OLD.cost_per_1k_tokens,
      NEW.cost_per_1k_tokens,
      'Pricing update',
      CASE 
        WHEN NEW.pricing_source = 'api' THEN 'api'
        ELSE 'manual'
      END,
      jsonb_build_object(
        'last_pricing_update', NEW.last_pricing_update,
        'pricing_source', NEW.pricing_source
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
