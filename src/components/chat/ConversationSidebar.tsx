
import React from 'react';
import { ChatSession } from '@/types/frontend';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  isLoading: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  sessions,
  activeSession,
  onNewConversation,
  onSelectConversation,
  isLoading,
}) => {
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

  const getLastMessage = (session: ChatSession) => {
    if (session.messages.length === 0) return 'No messages yet';
    const lastMessage = session.messages[session.messages.length - 1];
    const content = lastMessage.content || '';
    return content.length > 50 
      ? `${content.substring(0, 50)}...`
      : content;
  };

  const getDisplayTitle = (session: ChatSession) => {
    // If title is "New Conversation" and we have messages, use first message as title
    if (session.conversation.title === 'New Conversation' && session.messages.length > 0) {
      const firstUserMessage = session.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.replace(/^\[SEARCH MODE\]\s*Please search for and provide relevant information about:\s*/i, '').trim();
        return content.length > 40 ? `${content.substring(0, 40)}...` : content;
      }
    }
    return session.conversation.title;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            onClick={onNewConversation}
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            New
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new conversation to begin</p>
            </div>
          ) : (
            sessions.map((session) => (
              <Button
                key={session.conversation.id}
                variant="ghost"
                className={cn(
                  "w-full p-3 h-auto text-left justify-start",
                  activeSession?.conversation.id === session.conversation.id && "bg-accent"
                )}
                onClick={() => onSelectConversation(session.conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate">
                      {getDisplayTitle(session)}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                      <Clock size={12} />
                      {formatTimestamp(session.conversation.updated_at)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {getLastMessage(session)}
                  </p>
                  {session.conversation.total_cost > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ${session.conversation.total_cost.toFixed(4)}
                    </p>
                  )}
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4 text-xs text-muted-foreground">
        {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default ConversationSidebar;
