
-- Add is_public field to projects table
ALTER TABLE public.projects 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Add project_id foreign key to knowledge_items table
ALTER TABLE public.knowledge_items 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Update RLS policies for projects to allow viewing public projects
CREATE POLICY "Users can view public projects" 
ON public.projects 
FOR SELECT 
USING (is_public = true);

-- Update RLS policies for knowledge_items to allow viewing items in public projects
CREATE POLICY "Users can view knowledge items in public projects" 
ON public.knowledge_items 
FOR SELECT 
USING (project_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = knowledge_items.project_id 
  AND projects.is_public = true
));

-- Create index for better performance on public projects
CREATE INDEX idx_projects_is_public ON public.projects(is_public);
CREATE INDEX idx_knowledge_items_project_id ON public.knowledge_items(project_id);
