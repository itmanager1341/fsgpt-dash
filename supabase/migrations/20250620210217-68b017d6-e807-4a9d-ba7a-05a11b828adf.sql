
-- First, add department field to profiles table
ALTER TABLE public.profiles ADD COLUMN department text;

-- Create knowledge_items table to store FSG documents and resources
CREATE TABLE public.knowledge_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text,
  content_type text NOT NULL, -- 'document', 'presentation', 'recording', 'template', 'guideline', 'report'
  category text NOT NULL, -- 'company_resources', 'department_library', 'project_workspace', 'personal_collection'
  subcategory text, -- department name, project name, etc.
  file_path text, -- reference to uploaded file
  document_upload_id uuid REFERENCES public.document_uploads(id),
  classification_level text NOT NULL DEFAULT 'internal', -- 'public', 'internal', 'confidential'
  department text, -- 'marketing', 'operations', 'strategy', 'hr', 'finance'
  project_code text,
  client_reference text,
  processing_status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ai_summary text,
  ai_keywords jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  view_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create knowledge_categories table for FSG-specific organization
CREATE TABLE public.knowledge_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  parent_category text,
  icon text,
  description text,
  access_level text NOT NULL DEFAULT 'internal', -- 'public', 'internal', 'restricted'
  department_restricted text[], -- departments that can access this category
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create knowledge_shares table for collaboration
CREATE TABLE public.knowledge_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_item_id uuid REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
  shared_by uuid REFERENCES auth.users NOT NULL,
  shared_with uuid REFERENCES auth.users,
  shared_with_department text,
  permission_level text NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_items
CREATE POLICY "Users can view knowledge items they have access to" 
  ON public.knowledge_items 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    classification_level = 'public' OR
    EXISTS (
      SELECT 1 FROM public.knowledge_shares ks 
      WHERE ks.knowledge_item_id = id 
      AND (ks.shared_with = auth.uid() OR 
           ks.shared_with_department IN (
             SELECT p.department FROM public.profiles p WHERE p.id = auth.uid()
           ))
    )
  );

CREATE POLICY "Users can create their own knowledge items" 
  ON public.knowledge_items 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge items" 
  ON public.knowledge_items 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge items" 
  ON public.knowledge_items 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for knowledge_categories
CREATE POLICY "Users can view all categories" 
  ON public.knowledge_categories 
  FOR SELECT 
  USING (true);

-- RLS policies for knowledge_shares
CREATE POLICY "Users can view shares they created or are shared with" 
  ON public.knowledge_shares 
  FOR SELECT 
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY "Users can create shares for their own items" 
  ON public.knowledge_shares 
  FOR INSERT 
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.knowledge_items ki 
      WHERE ki.id = knowledge_item_id AND ki.user_id = auth.uid()
    )
  );

-- Insert FSG-specific categories
INSERT INTO public.knowledge_categories (name, parent_category, icon, description, access_level) VALUES
('Company Resources', null, 'building', 'FSG brand guidelines, templates, and policies', 'internal'),
('Department Libraries', null, 'users', 'Department-specific knowledge and resources', 'internal'),
('Project Workspaces', null, 'folder', 'Client and project-specific knowledge bases', 'restricted'),
('Personal Collections', null, 'user', 'Individual user libraries and notes', 'internal'),
('Marketing', 'Department Libraries', 'megaphone', 'Marketing materials and campaigns', 'internal'),
('Operations', 'Department Libraries', 'settings', 'Operational procedures and resources', 'internal'),
('Strategy', 'Department Libraries', 'target', 'Strategic planning and analysis', 'restricted'),
('HR', 'Department Libraries', 'users', 'Human resources and training materials', 'internal'),
('Finance', 'Department Libraries', 'dollar-sign', 'Financial reports and procedures', 'restricted');

-- Create indexes for better performance
CREATE INDEX idx_knowledge_items_category ON public.knowledge_items(category);
CREATE INDEX idx_knowledge_items_department ON public.knowledge_items(department);
CREATE INDEX idx_knowledge_items_user_id ON public.knowledge_items(user_id);
CREATE INDEX idx_knowledge_items_classification ON public.knowledge_items(classification_level);
CREATE INDEX idx_knowledge_shares_item_id ON public.knowledge_shares(knowledge_item_id);
CREATE INDEX idx_knowledge_shares_shared_with ON public.knowledge_shares(shared_with);
