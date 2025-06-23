
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project, CreateProjectData, ProjectWithConversations } from '@/types/projects';

export const useProjects = () => {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', false)
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: projectsWithConversations = [], isLoading: isLoadingWithConversations } = useQuery({
    queryKey: ['projects-with-conversations'],
    queryFn: async () => {
      // Get projects with their conversations
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          conversations!conversations_project_id_fkey(
            id,
            title,
            updated_at,
            total_cost
          )
        `)
        .eq('is_archived', false)
        .order('name');
      
      if (projectsError) throw projectsError;

      // Build hierarchical structure
      const projectMap = new Map<string, ProjectWithConversations>();
      const rootProjects: ProjectWithConversations[] = [];

      // First, create all projects
      projectsData?.forEach(project => {
        const projectWithConversations: ProjectWithConversations = {
          ...project,
          conversations: project.conversations || [],
          subprojects: [],
        };
        projectMap.set(project.id, projectWithConversations);
      });

      // Then, organize into hierarchy
      projectsData?.forEach(project => {
        const projectWithConversations = projectMap.get(project.id)!;
        if (project.parent_project_id) {
          const parent = projectMap.get(project.parent_project_id);
          if (parent) {
            parent.subprojects = parent.subprojects || [];
            parent.subprojects.push(projectWithConversations);
          }
        } else {
          rootProjects.push(projectWithConversations);
        }
      });

      return rootProjects;
    },
  });

  const createProject = useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          user_id: session.user.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-with-conversations'] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-with-conversations'] });
      toast.success('Project updated successfully');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-with-conversations'] });
      toast.success('Project archived successfully');
    },
    onError: (error) => {
      console.error('Error archiving project:', error);
      toast.error('Failed to archive project');
    },
  });

  const assignConversationToProject = useMutation({
    mutationFn: async ({ conversationId, projectId }: { conversationId: string; projectId: string | null }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ project_id: projectId })
        .eq('id', conversationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure proper state sync
      queryClient.invalidateQueries({ queryKey: ['projects-with-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-items'] });
      // Also invalidate conversations to update the chat list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation moved successfully');
    },
    onError: (error) => {
      console.error('Error moving conversation:', error);
      toast.error('Failed to move conversation');
    },
  });

  return {
    projects,
    projectsWithConversations,
    isLoading: isLoading || isLoadingWithConversations,
    createProject,
    updateProject,
    deleteProject,
    assignConversationToProject,
  };
};
