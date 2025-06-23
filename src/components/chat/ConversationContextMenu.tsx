
import React from 'react';
import { ChatSession } from '@/types/frontend';
import { ProjectWithConversations } from '@/types/projects';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Folder, FolderOpen, Trash, Edit } from 'lucide-react';

interface ConversationContextMenuProps {
  children: React.ReactNode;
  session: ChatSession;
  projects: ProjectWithConversations[];
  onMoveToProject: (conversationId: string, projectId: string | null) => void;
  onDeleteConversation: (conversationId: string) => void;
}

const ConversationContextMenu: React.FC<ConversationContextMenuProps> = ({
  children,
  session,
  projects,
  onMoveToProject,
  onDeleteConversation,
}) => {
  const currentProject = projects.find(p => 
    p.conversations.some(c => c.id === session.conversation.id)
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Folder className="mr-2 h-4 w-4" />
            Move to project
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {currentProject && (
              <>
                <ContextMenuItem 
                  onClick={() => onMoveToProject(session.conversation.id, null)}
                >
                  Remove from project
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            {projects.map(project => (
              <ContextMenuItem
                key={project.id}
                onClick={() => onMoveToProject(session.conversation.id, project.id)}
                disabled={currentProject?.id === project.id}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {project.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDeleteConversation(session.conversation.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ConversationContextMenu;
