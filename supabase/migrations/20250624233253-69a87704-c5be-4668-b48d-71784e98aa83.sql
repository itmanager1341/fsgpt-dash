
-- Create summary_templates table
CREATE TABLE IF NOT EXISTS public.summary_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    prompt_template text NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create summary_requests table
CREATE TABLE IF NOT EXISTS public.summary_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_item_id uuid NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
    template_id uuid NOT NULL REFERENCES public.summary_templates(id),
    user_id uuid REFERENCES auth.users(id),
    summary_content text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default summary templates with proper UUIDs
INSERT INTO public.summary_templates (id, name, description, prompt_template, display_order) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Executive Summary', 'High-level overview for leadership', 'Create a concise executive summary of this content focusing on key insights and strategic implications.', 1),
    ('550e8400-e29b-41d4-a716-446655440002', 'Meeting Notes', 'Detailed meeting notes format', 'Structure this content as comprehensive meeting notes with clear sections for discussion points, decisions, and action items.', 2),
    ('550e8400-e29b-41d4-a716-446655440003', 'Action Items', 'Extract actionable tasks', 'Extract and list all actionable items, tasks, and follow-ups mentioned in this content.', 3),
    ('550e8400-e29b-41d4-a716-446655440004', 'Key Decisions', 'Focus on decisions made', 'Identify and summarize all key decisions, resolutions, and commitments made in this content.', 4),
    ('550e8400-e29b-41d4-a716-446655440005', 'Technical Discussion', 'Technical details and analysis', 'Provide a technical analysis focusing on implementation details, technical challenges, and solutions discussed.', 5)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_summary_requests_knowledge_item_id ON public.summary_requests(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_summary_requests_template_id ON public.summary_requests(template_id);
CREATE INDEX IF NOT EXISTS idx_summary_requests_status ON public.summary_requests(status);
CREATE INDEX IF NOT EXISTS idx_summary_templates_active ON public.summary_templates(is_active, display_order);

-- Enable RLS
ALTER TABLE public.summary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view active summary templates" ON public.summary_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own summary requests" ON public.summary_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create summary requests" ON public.summary_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own summary requests" ON public.summary_requests
    FOR UPDATE USING (user_id = auth.uid());
