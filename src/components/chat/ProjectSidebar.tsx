
import React, { useState } from 'react';
import { ChatSession } from '@/types/frontend';
import { ProjectWithConversations } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Folder, 
  FolderOpen, 
  MessageSquare, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Trash,
  Edit,
  PanelLeftClose
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import ConversationContextMenu from './ConversationContextMenu';

interface ProjectSidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onNewConversation: (projectId?: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onToggleSidebar: () => void;
  isLoading: boolean;
  onConversationMoved?: (conversationId: string, projectId: string | null) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  sessions,
  activeSession,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onToggleSidebar,
  isLoading,
  onConversationMoved,
}) => {
  const { 
    projectsWithConversations, 
    createProject, 
    assignConversationToProject,
    isLoading: isProjectsLoading 
  } = useProjects();
  
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
  } = useDragAndDrop();

  // Get conversations not assigned to any project by checking sessions data
  const unassignedConversations = sessions.filter(session => 
    !session.conversation.project_id
  );

  // Helper function to get current project ID for a conversation from sessions
  const getCurrentProjectId = (conversationId: string): string | null => {
    const session = sessions.find(s => s.conversation.id === conversationId);
    return session?.conversation.project_id || null;
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    await createProject.mutateAsync({
      name: newProjectName,
      color: '#3B82F6',
      icon: 'folder',
    });
    
    setNewProjectName('');
    setCreateProjectDialog(false);
  };

  const handleMoveToProject = async (conversationId: string, projectId: string | null) => {
    const currentProjectId = getCurrentProjectId(conversationId);
    
    // Only proceed if actually moving to a different project
    if (currentProjectId === projectId) {
      return; // No change needed, don't show success message
    }
    
    // Optimistic update
    if (onConversationMoved) {
      onConversationMoved(conversationId, projectId);
    }
    
    try {
      await assignConversationToProject.mutateAsync({
        conversationId,
        projectId,
      });
    } catch (error) {
      // Revert optimistic update on error
      if (onConversationMoved) {
        onConversationMoved(conversationId, currentProjectId);
      }
      throw error;
    }
  };

  const handleDrop = async (e: React.DragEvent, projectId: string | null) => {
    e.preventDefault();
    if (dragState.draggedItemId) {
      const currentProjectId = getCurrentProjectId(dragState.draggedItemId);
      
      // Only move if it's actually a different project
      if (currentProjectId !== projectId) {
        await handleMoveToProject(dragState.draggedItemId, projectId);
      }
    }
    handleDragEnd();
  };

  const getDisplayTitle = (session: ChatSession) => {
    if (session.conversation.title === 'New Conversation' && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.trim();
        return content.length > 30 ? `${content.substring(0, 30)}...` : content;
      }
    }
    return session.conversation.title;
  };

  // Get conversations for a specific project from sessions data
  const getProjectConversations = (projectId: string) => {
    return sessions.filter(session => session.conversation.project_id === projectId);
  };

  const renderProject = (project: ProjectWithConversations, level = 0) => {
    const isExpanded = expandedProjects.has(project.id);
    const projectConversations = getProjectConversations(project.id);
    const hasConversations = projectConversations.length > 0;
    const hasSubprojects = project.subprojects && project.subprojects.length > 0;
    const isDropTarget = dragState.dragOverTarget === project.id;
    
    return (
      <div key={project.id} className={cn("select-none", level > 0 && "ml-3")}>
        {/* Project Header */}
        <div 
          className={cn(
            "flex items-center justify-between group rounded-lg hover:bg-muted/50 px-2 py-1.5 transition-colors",
            isDropTarget && "bg-accent/50 ring-2 ring-primary/20"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            handleDragOver(project.id);
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, project.id)}
        >
          <div 
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => toggleProjectExpansion(project.id)}
          >
            {(hasConversations || hasSubprojects) && (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            )}
            {isExpanded ? <FolderOpen size={16} className="text-muted-foreground" /> : <Folder size={16} className="text-muted-foreground" />}
            <span className="text-sm truncate">{project.name}</span>
            {hasConversations && (
              <span className="text-xs text-muted-foreground">({projectConversations.length})</span>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0">
                <MoreHorizontal size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNewConversation(project.id)}>
                <Plus size={14} className="mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit size={14} className="mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash size={14} className="mr-2" />
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project Contents */}
        {isExpanded && (
          <div className="ml-2 space-y-0.5">
            {/* Subprojects */}
            {project.subprojects?.map(subproject => 
              renderProject(subproject, level + 1)
            )}
            
            {/* Conversations */}
            {projectConversations.map(session => (
              <ConversationContextMenu
                key={session.conversation.id}
                session={session}
                projects={projectsWithConversations}
                onMoveToProject={handleMoveToProject}
                onDeleteConversation={onDeleteConversation}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 ml-4 rounded-lg cursor-pointer text-sm hover:bg-muted/50 transition-colors",
                    activeSession?.conversation.id === session.conversation.id && "bg-accent",
                    dragState.draggedItemId === session.conversation.id && "opacity-50"
                  )}
                  draggable
                  onDragStart={() => handleDragStart(session.conversation.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectConversation(session.conversation.id)}
                >
                  <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="truncate flex-1">{getDisplayTitle(session)}</span>
                </div>
              </ConversationContextMenu>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header with New Chat and Sidebar Toggle */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-1 h-8 w-8"
          >
            <PanelLeftClose size={16} />
          </Button>
          
          <Button
            onClick={() => onNewConversation()}
            disabled={isLoading}
            className="flex-1 ml-2 justify-start"
            variant="outline"
          >
            <Plus size={16} className="mr-2" />
            New chat
          </Button>
        </div>
      </div>

      {/* Projects and Conversations */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isProjectsLoading ? (
            <div className="text-center text-muted-foreground p-4 text-sm">
              Loading projects...
            </div>
          ) : (
            <>
              {/* Projects */}
              {projectsWithConversations.map(project => renderProject(project))}
              
              {/* Unassigned Conversations */}
              {unassignedConversations.length > 0 && (
                <div 
                  className={cn(
                    "mt-4 p-2 rounded-lg transition-colors",
                    dragState.dragOverTarget === 'unassigned' && "bg-accent/50 ring-2 ring-primary/20"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver('unassigned');
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                >
                  <div className="text-xs text-muted-foreground mb-2 px-2 flex items-center justify-between">
                    <span>Unassigned</span>
                    <span>({unassignedConversations.length})</span>
                  </div>
                  {unassignedConversations.map(session => (
                    <ConversationContextMenu
                      key={session.conversation.id}
                      session={session}
                      projects={projectsWithConversations}
                      onMoveToProject={handleMoveToProject}
                      onDeleteConversation={onDeleteConversation}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm hover:bg-muted/50 transition-colors",
                          activeSession?.conversation.id === session.conversation.id && "bg-accent",
                          dragState.draggedItemId === session.conversation.id && "opacity-50"
                        )}
                        draggable
                        onDragStart={() => handleDragStart(session.conversation.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectConversation(session.conversation.id)}
                      >
                        <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{getDisplayTitle(session)}</span>
                      </div>
                    </ConversationContextMenu>
                  ))}
                </div>
              )}

              {projectsWithConversations.length === 0 && unassignedConversations.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateProjectDialog(true)}
          className="w-full justify-start text-muted-foreground"
        >
          <Plus size={14} className="mr-2" />
          New project
        </Button>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createProjectDialog} onOpenChange={setCreateProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSidebar;
