
-- Ensure user_api_access table has proper default records for users
-- and add functions to calculate real usage statistics

-- Function to initialize default API access for a user
CREATE OR REPLACE FUNCTION public.initialize_user_api_access(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to get real model access data for a user
CREATE OR REPLACE FUNCTION public.get_user_model_access(user_id_param UUID)
RETURNS TABLE(
  provider text,
  model_name text,
  is_enabled boolean,
  usage_percentage numeric,
  remaining_credits numeric,
  monthly_limit numeric,
  is_over_limit boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to update usage when a message is sent
CREATE OR REPLACE FUNCTION public.update_user_api_usage(
  user_id_param UUID,
  provider_param text,
  model_param text,
  cost_param numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger to initialize API access for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_api_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialize API access for the new user
  PERFORM public.initialize_user_api_access(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_user_created_api_access ON public.profiles;
CREATE TRIGGER on_user_created_api_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_api_access();

-- Initialize API access for existing users who don't have it
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.profiles 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_api_access 
      WHERE user_id = profiles.id
    )
  LOOP
    PERFORM public.initialize_user_api_access(user_record.id);
  END LOOP;
END $$;
