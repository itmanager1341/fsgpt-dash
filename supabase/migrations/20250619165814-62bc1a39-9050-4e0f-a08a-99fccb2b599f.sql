
-- Create comprehensive admin dashboard statistics function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  active_today bigint,
  active_this_week bigint,
  active_this_month bigint,
  total_conversations bigint,
  conversations_today bigint,
  conversations_this_week bigint,
  conversations_this_month bigint,
  total_cost numeric,
  cost_today numeric,
  cost_this_week numeric,
  cost_this_month numeric,
  avg_response_time numeric,
  error_rate numeric,
  active_connections bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      COUNT(*)::bigint as total_users,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::bigint as active_today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as active_this_week,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::bigint as active_this_month
    FROM public.profiles
  ),
  conversation_stats AS (
    SELECT
      COUNT(*)::bigint as total_conversations,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::bigint as conversations_today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::bigint as conversations_this_week,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::bigint as conversations_this_month
    FROM public.conversations
  ),
  cost_stats AS (
    SELECT
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(total_cost) FILTER (WHERE updated_at >= CURRENT_DATE), 0) as cost_today,
      COALESCE(SUM(total_cost) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as cost_this_week,
      COALESCE(SUM(total_cost) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as cost_this_month
    FROM public.conversations
  ),
  system_stats AS (
    SELECT
      COALESCE(AVG(duration_ms), 0) as avg_response_time,
      COALESCE(
        COUNT(*) FILTER (WHERE status = 'error')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
        0
      ) as error_rate
    FROM public.llm_usage_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
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
    10::bigint as active_connections -- Placeholder for now
  FROM user_stats us, conversation_stats cs, cost_stats cost, system_stats ss;
END;
$$;

-- Create daily usage trends function
CREATE OR REPLACE FUNCTION public.get_daily_usage_trends(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  date date,
  conversations bigint,
  cost numeric,
  users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create model usage distribution function
CREATE OR REPLACE FUNCTION public.get_model_usage_distribution()
RETURNS TABLE(
  provider text,
  model_name text,
  usage_count bigint,
  total_cost numeric,
  usage_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH model_stats AS (
    SELECT
      m.provider_used as provider,
      m.model_used as model_name,
      COUNT(*)::bigint as usage_count,
      COALESCE(SUM(m.cost), 0) as total_cost
    FROM public.messages m
    WHERE m.provider_used IS NOT NULL AND m.model_used IS NOT NULL
    GROUP BY m.provider_used, m.model_used
  ),
  total_usage AS (
    SELECT SUM(usage_count) as total_count FROM model_stats
  )
  SELECT
    ms.provider,
    ms.model_name,
    ms.usage_count,
    ms.total_cost,
    CASE
      WHEN tu.total_count > 0 THEN (ms.usage_count::numeric / tu.total_count::numeric * 100)
      ELSE 0
    END as usage_percentage
  FROM model_stats ms, total_usage tu
  ORDER BY ms.usage_count DESC;
END;
$$;

-- Create top users by usage function
CREATE OR REPLACE FUNCTION public.get_top_users_by_usage(
  period_days integer DEFAULT 30,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_name text,
  total_cost numeric,
  conversation_count bigint,
  usage_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_usage AS (
    SELECT
      p.id as user_id,
      p.email as user_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name,
      COALESCE(SUM(uaa.current_usage), 0) as total_cost,
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
    SELECT SUM(total_cost) as total FROM user_usage
  )
  SELECT
    uu.user_id,
    uu.user_email,
    uu.user_name,
    uu.total_cost,
    uu.conversation_count,
    CASE
      WHEN tc.total > 0 THEN (uu.total_cost / tc.total * 100)
      ELSE 0
    END as usage_percentage
  FROM user_usage uu, total_cost tc
  ORDER BY uu.total_cost DESC
  LIMIT limit_count;
END;
$$;

-- Create usage alerts function
CREATE OR REPLACE FUNCTION public.get_usage_alerts()
RETURNS TABLE(
  user_id uuid,
  user_email text,
  user_name text,
  current_usage numeric,
  monthly_limit numeric,
  usage_percentage numeric,
  alert_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create recent admin activities function
CREATE OR REPLACE FUNCTION public.get_recent_admin_activities(
  limit_count integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  activity_type text,
  message text,
  user_email text,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create monthly summary function
CREATE OR REPLACE FUNCTION public.get_monthly_summary(
  target_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)::integer,
  target_month integer DEFAULT EXTRACT(month FROM CURRENT_DATE)::integer
)
RETURNS TABLE(
  total_conversations bigint,
  total_cost numeric,
  average_per_user numeric,
  active_users bigint,
  new_users bigint,
  top_model text,
  cost_growth_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
