
-- Fix SQL ambiguity errors in admin dashboard functions
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
$$;

-- Fix similar issues in other functions
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
$$;

-- Fix top users function
CREATE OR REPLACE FUNCTION public.get_top_users_by_usage(period_days integer DEFAULT 30, limit_count integer DEFAULT 10)
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
$$;
