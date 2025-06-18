
-- Phase 2: Database Schema Enhancements
-- Add columns to model_configurations for live pricing updates
ALTER TABLE public.model_configurations 
ADD COLUMN IF NOT EXISTS last_pricing_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pricing_source TEXT DEFAULT 'manual' CHECK (pricing_source IN ('manual', 'api', 'documentation')),
ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS api_availability TEXT DEFAULT 'unknown' CHECK (api_availability IN ('available', 'unavailable', 'unknown', 'deprecated'));

-- Create pricing_history table for tracking price changes
CREATE TABLE IF NOT EXISTS public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  price_change_reason TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_via TEXT DEFAULT 'manual' CHECK (updated_via IN ('manual', 'api', 'bulk_update')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for better performance on pricing history queries
CREATE INDEX IF NOT EXISTS idx_pricing_history_model ON public.pricing_history(provider, model_name);
CREATE INDEX IF NOT EXISTS idx_pricing_history_date ON public.pricing_history(created_at);

-- Function to log pricing changes automatically
CREATE OR REPLACE FUNCTION public.log_pricing_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for automatic pricing history logging
DROP TRIGGER IF EXISTS trigger_log_pricing_changes ON public.model_configurations;
CREATE TRIGGER trigger_log_pricing_changes
  AFTER UPDATE ON public.model_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pricing_change();
