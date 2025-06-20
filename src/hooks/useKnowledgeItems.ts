
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content_type: 'document' | 'presentation' | 'recording' | 'template' | 'guideline' | 'report';
  category: 'company_resources' | 'department_library' | 'project_workspace' | 'personal_collection';
  subcategory?: string;
  file_path?: string;
  document_upload_id?: string;
  classification_level: 'public' | 'internal' | 'confidential';
  department?: string;
  project_code?: string;
  client_reference?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_summary?: string;
  ai_keywords?: string[];
  metadata?: Record<string, any>;
  tags?: string[];
  view_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  parent_category?: string;
  icon?: string;
  description?: string;
  access_level: 'public' | 'internal' | 'restricted';
  department_restricted?: string[];
  created_at: string;
}

export const useKnowledgeItems = (categoryId?: string, subcategoryId?: string) => {
  return useQuery({
    queryKey: ['knowledge-items', categoryId, subcategoryId],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_items')
        .select('*')
        .order('updated_at', { ascending: false });

      if (categoryId && categoryId !== 'overview') {
        query = query.eq('category', categoryId);
      }

      if (subcategoryId && subcategoryId !== 'overview') {
        query = query.eq('subcategory', subcategoryId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching knowledge items:', error);
        throw error;
      }
      
      return data as KnowledgeItem[];
    },
  });
};

export const useKnowledgeCategories = () => {
  return useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching knowledge categories:', error);
        throw error;
      }
      
      return data as KnowledgeCategory[];
    },
  });
};

export const useCreateKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at' | 'view_count'>) => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
    },
  });
};

export const useUpdateKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('knowledge_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
    },
  });
};

export const useDeleteKnowledgeItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
    },
  });
};
