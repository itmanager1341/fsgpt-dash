
import React, { useState } from 'react';
import { ChatSession } from '@/types/frontend';
import { ProjectWithConversations } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Clock, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Trash,
  Edit,
  Move
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';

interface ProjectSidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onNewConversation: (projectId?: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoading: boolean;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  sessions,
  activeSession,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  isLoading,
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
  const [selectedProjectForNew, setSelectedProjectForNew] = useState<string | undefined>();

  // Get conversations not assigned to any project
  const unassignedConversations = sessions.filter(session => 
    !session.conversation.project_id
  );

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getDisplayTitle = (session: ChatSession) => {
    if (session.conversation.title === 'New Conversation' && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.replace(/^\[SEARCH MODE\]\s*Please search for and provide relevant information about:\s*/i, '').trim();
        return content.length > 40 ? `${content.substring(0, 40)}...` : content;
      }
    }
    return session.conversation.title;
  };

  const renderProject = (project: ProjectWithConversations, level = 0) => {
    const isExpanded = expandedProjects.has(project.id);
    const hasConversations = project.conversations.length > 0;
    const hasSubprojects = project.subprojects && project.subprojects.length > 0;
    
    return (
      <div key={project.id} className={cn("select-none", level > 0 && "ml-4")}>
        {/* Project Header */}
        <div className="flex items-center justify-between group py-1">
          <div 
            className="flex items-center gap-2 flex-1 cursor-pointer rounded px-2 py-1 hover:bg-muted/50"
            onClick={() => toggleProjectExpansion(project.id)}
          >
            {(hasConversations || hasSubprojects) && (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            )}
            {isExpanded ? <FolderOpen size={16} style={{ color: project.color }} /> : <Folder size={16} style={{ color: project.color }} />}
            <span className="text-sm font-medium truncate">{project.name}</span>
            {hasConversations && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {project.conversations.length}
              </Badge>
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
          <div className="ml-2">
            {/* Subprojects */}
            {project.subprojects?.map(subproject => 
              renderProject(subproject, level + 1)
            )}
            
            {/* Conversations */}
            {project.conversations.map(conv => {
              const session = sessions.find(s => s.conversation.id === conv.id);
              if (!session) return null;
              
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 mx-2 my-1 rounded cursor-pointer text-sm hover:bg-muted/50",
                    activeSession?.conversation.id === conv.id && "bg-accent"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <MessageSquare size={14} className="text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{getDisplayTitle(session)}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={10} />
                      {formatTimestamp(conv.updated_at)}
                      {conv.total_cost > 0 && (
                        <span className="text-green-600">${conv.total_cost.toFixed(4)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Projects</h2>
          <Button
            onClick={() => setCreateProjectDialog(true)}
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Project
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isProjectsLoading ? (
            <div className="text-center text-muted-foreground p-4">
              Loading projects...
            </div>
          ) : (
            <>
              {/* Projects */}
              {projectsWithConversations.map(project => renderProject(project))}
              
              {/* Unassigned Conversations */}
              {unassignedConversations.length > 0 && (
                <div className="mt-4">
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                    Unassigned Conversations
                  </div>
                  {unassignedConversations.map(session => (
                    <div
                      key={session.conversation.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 mx-2 my-1 rounded cursor-pointer text-sm hover:bg-muted/50",
                        activeSession?.conversation.id === session.conversation.id && "bg-accent"
                      )}
                      onClick={() => onSelectConversation(session.conversation.id)}
                    >
                      <MessageSquare size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{getDisplayTitle(session)}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={10} />
                          {formatTimestamp(session.conversation.updated_at)}
                          {session.conversation.total_cost > 0 && (
                            <span className="text-green-600">${session.conversation.total_cost.toFixed(4)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {projectsWithConversations.length === 0 && unassignedConversations.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  <Folder size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects yet</p>
                  <p className="text-xs">Create a project to organize your conversations</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

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
