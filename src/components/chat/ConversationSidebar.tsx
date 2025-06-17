
import React, { useState } from 'react';
import { ChatSession } from '@/types/frontend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, MessageSquare, Edit3, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onClose?: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  sessions,
  activeSession,
  onSessionSelect,
  onNewSession,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditStart = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.conversation.id);
    setEditTitle(session.conversation.title);
  };

  const handleEditSave = (sessionId: string) => {
    // This would typically call an API to update the conversation title
    setEditingId(null);
    setEditTitle('');
  };

  const handleSessionClick = (session: ChatSession) => {
    onSessionSelect(session);
    onClose?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const groupedSessions = sessions.reduce((groups, session) => {
    const dateKey = formatDate(session.conversation.created_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  return (
    <div className="h-full flex flex-col bg-muted/30 border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <Button 
          onClick={onNewSession}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <PlusCircle size={16} />
          New Conversation
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedSessions).map(([dateGroup, groupSessions]) => (
          <div key={dateGroup} className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <Calendar size={14} className="text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground">
                {dateGroup}
              </h3>
            </div>
            
            <div className="space-y-1">
              {groupSessions.map((session) => (
                <div
                  key={session.conversation.id}
                  onClick={() => handleSessionClick(session)}
                  className={cn(
                    "group p-3 rounded-lg cursor-pointer transition-all duration-200",
                    "hover:bg-accent/50",
                    activeSession?.conversation.id === session.conversation.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                    
                    <div className="flex-1 min-w-0">
                      {editingId === session.conversation.id ? (
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleEditSave(session.conversation.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            onBlur={() => handleEditSave(session.conversation.id)}
                            className="h-7 text-sm"
                          />
                        </form>
                      ) : (
                        <>
                          <h4 className="text-sm font-medium truncate">
                            {session.conversation.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {session.lastMessageAt 
                              ? `Last message: ${new Date(session.lastMessageAt).toLocaleTimeString()}`
                              : 'No messages yet'
                            }
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {session.messages.length} messages
                            </span>
                            {session.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                {session.unreadCount}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => handleEditStart(session, e)}
                      >
                        <Edit3 size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">
              No conversations yet
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Start a new conversation to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
