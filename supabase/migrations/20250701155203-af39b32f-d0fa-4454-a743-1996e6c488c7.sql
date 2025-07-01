
-- Phase 1: Critical RLS Policy Fixes (Fixed for existing policies)

-- 1. Secure API Keys Table - Replace blanket authenticated policies with admin-only access
DROP POLICY IF EXISTS "Allow authenticated users to read api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow authenticated users to insert api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow authenticated users to update api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow authenticated users to delete api_keys" ON public.api_keys;

CREATE POLICY "Only admins can manage api_keys" ON public.api_keys
  FOR ALL USING (has_role('admin'::app_role));

-- 2. Secure LLM Prompts - Admin only access
DROP POLICY IF EXISTS "Allow authenticated users to read llm_prompts" ON public.llm_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to insert llm_prompts" ON public.llm_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to update llm_prompts" ON public.llm_prompts;
DROP POLICY IF EXISTS "Allow authenticated users to delete llm_prompts" ON public.llm_prompts;

CREATE POLICY "Only admins can manage llm_prompts" ON public.llm_prompts
  FOR ALL USING (has_role('admin'::app_role));

-- 3. Secure Scheduled Job Settings - Admin only access
DROP POLICY IF EXISTS "Allow authenticated users to read scheduled_job_settings" ON public.scheduled_job_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert scheduled_job_settings" ON public.scheduled_job_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update scheduled_job_settings" ON public.scheduled_job_settings;
DROP POLICY IF EXISTS "Allow authenticated users to delete scheduled_job_settings" ON public.scheduled_job_settings;

CREATE POLICY "Only admins can manage scheduled_job_settings" ON public.scheduled_job_settings
  FOR ALL USING (has_role('admin'::app_role));

-- 4. Secure Sources Table - Restrict write access to admins
DROP POLICY IF EXISTS "Allow authenticated users to insert sources" ON public.sources;
DROP POLICY IF EXISTS "Allow authenticated users to update sources" ON public.sources;
DROP POLICY IF EXISTS "Allow authenticated users to delete sources" ON public.sources;

-- Keep read access for authenticated users, but restrict modifications to admins
CREATE POLICY "Only admins can modify sources" ON public.sources
  FOR INSERT WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Only admins can update sources" ON public.sources
  FOR UPDATE USING (has_role('admin'::app_role));

CREATE POLICY "Only admins can delete sources" ON public.sources
  FOR DELETE USING (has_role('admin'::app_role));

-- 5. Secure Keyword Management - Restrict to admins
DROP POLICY IF EXISTS "Allow authenticated users to insert keyword_clusters" ON public.keyword_clusters;
DROP POLICY IF EXISTS "Allow authenticated users to update keyword_clusters" ON public.keyword_clusters;
DROP POLICY IF EXISTS "Allow authenticated users to delete keyword_clusters" ON public.keyword_clusters;

CREATE POLICY "Only admins can modify keyword_clusters" ON public.keyword_clusters
  FOR INSERT WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Only admins can update keyword_clusters" ON public.keyword_clusters
  FOR UPDATE USING (has_role('admin'::app_role));

CREATE POLICY "Only admins can delete keyword_clusters" ON public.keyword_clusters
  FOR DELETE USING (has_role('admin'::app_role));

DROP POLICY IF EXISTS "Allow authenticated users to insert keyword_tracking" ON public.keyword_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to update keyword_tracking" ON public.keyword_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to delete keyword_tracking" ON public.keyword_tracking;

CREATE POLICY "Only admins can modify keyword_tracking" ON public.keyword_tracking
  FOR INSERT WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Only admins can update keyword_tracking" ON public.keyword_tracking
  FOR UPDATE USING (has_role('admin'::app_role));

CREATE POLICY "Only admins can delete keyword_tracking" ON public.keyword_tracking
  FOR DELETE USING (has_role('admin'::app_role));

-- 6. Fix summary_templates policies (drop existing first)
DROP POLICY IF EXISTS "Users can view active summary templates" ON public.summary_templates;
DROP POLICY IF EXISTS "Only admins can manage summary templates" ON public.summary_templates;

CREATE POLICY "Users can view active summary templates" ON public.summary_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage summary templates" ON public.summary_templates
  FOR ALL USING (has_role('admin'::app_role));

-- 7. Complete summary_requests policies
DROP POLICY IF EXISTS "Users can delete their own summary requests" ON public.summary_requests;
CREATE POLICY "Users can delete their own summary requests" ON public.summary_requests
  FOR DELETE USING (user_id = auth.uid());

-- 8. Fix knowledge_items RLS policy (the USING clause has a bug)
DROP POLICY IF EXISTS "Users can view knowledge items they have access to" ON public.knowledge_items;

CREATE POLICY "Users can view knowledge items they have access to" ON public.knowledge_items
  FOR SELECT USING (
    (user_id = auth.uid()) OR 
    (classification_level = 'public'::text) OR 
    (EXISTS (
      SELECT 1 FROM knowledge_shares ks 
      WHERE ks.knowledge_item_id = knowledge_items.id 
      AND (
        ks.shared_with = auth.uid() OR 
        ks.shared_with_department IN (
          SELECT p.department FROM profiles p WHERE p.id = auth.uid()
        )
      )
    ))
  );

-- 9. Secure knowledge_shares - add missing policies
DROP POLICY IF EXISTS "Users can update shares they created" ON public.knowledge_shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON public.knowledge_shares;

CREATE POLICY "Users can update shares they created" ON public.knowledge_shares
  FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "Users can delete shares they created" ON public.knowledge_shares
  FOR DELETE USING (shared_by = auth.uid());

-- 10. Add input validation functions
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  file_name text,
  file_size bigint,
  file_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 11. Add content sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_content(content text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic HTML tag removal (for more comprehensive sanitization, use a proper library)
  RETURN regexp_replace(content, '<[^>]*>', '', 'g');
END;
$$;

-- 12. Add rate limiting table for authentication
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  attempt_type text NOT NULL, -- 'login', 'signup', etc.
  attempts integer DEFAULT 1,
  last_attempt timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage rate limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.auth_rate_limits;
CREATE POLICY "Service role can manage rate limits" ON public.auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- 13. Add audit log table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view audit logs" ON public.security_audit_log
  FOR SELECT USING (has_role('admin'::app_role));

-- Service role can insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Service role can insert audit logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
