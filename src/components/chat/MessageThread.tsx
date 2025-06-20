
import React, { useEffect, useRef } from 'react';
import { ChatSession, MessageWithLoading } from '@/types/frontend';
import { User, Bot, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  session: ChatSession | null;
}

const MessageThread: React.FC<MessageThreadProps> = ({ session }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Bot size={64} className="mx-auto text-muted-foreground" />
          <h3 className="text-xl font-semibold">Welcome to AI Assistant</h3>
          <p className="text-muted-foreground">
            Select a conversation from the sidebar or start a new one to begin chatting.
          </p>
        </div>
      </div>
    );
  }

  if (session.messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Bot size={64} className="mx-auto text-primary" />
          <h3 className="text-xl font-semibold">Start Your Conversation</h3>
          <p className="text-muted-foreground">
            Ask me anything! I'm here to help with your questions and tasks.
          </p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getModelBadge = (message: MessageWithLoading) => {
    if (message.role === 'assistant' && message.model_used && message.provider_used) {
      return (
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span className="bg-muted px-2 py-0.5 rounded">
            {message.provider_used} • {message.model_used}
          </span>
          {message.cost && message.cost > 0.0001 && (
            <span className="text-green-600 dark:text-green-400">
              ${message.cost.toFixed(4)}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  // Enhanced unique key generation to prevent duplicates
  const generateMessageKey = (message: MessageWithLoading, index: number) => {
    // Create a stable hash from content and timestamp for better uniqueness
    const contentHash = message.content.substring(0, 20).replace(/\s+/g, '');
    const timestamp = new Date(message.created_at).getTime();
    const rolePrefix = message.role.substring(0, 1);
    
    // Prioritize database IDs over local IDs, but ensure uniqueness
    if (message.id && !message.id.startsWith('temp-')) {
      return `${rolePrefix}-db-${message.id}`;
    }
    if (message.localId) {
      return `${rolePrefix}-local-${message.localId}`;
    }
    // Enhanced fallback with better uniqueness
    return `${rolePrefix}-fallback-${index}-${timestamp}-${contentHash}`;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {session.messages.map((message, index) => (
        <div
          key={generateMessageKey(message, index)}
          className={cn(
            "flex gap-4 max-w-4xl",
            message.role === 'user' ? "ml-auto flex-row-reverse" : ""
          )}
        >
          {/* Avatar */}
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            message.role === 'user' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted"
          )}>
            {message.role === 'user' ? (
              <User size={16} />
            ) : (
              <Bot size={16} />
            )}
          </div>

          {/* Message Content */}
          <div className={cn(
            "flex-1 space-y-2",
            message.role === 'user' ? "text-right" : ""
          )}>
            {/* Message Bubble */}
            <div className={cn(
              "inline-block max-w-full p-4 rounded-2xl",
              message.role === 'user'
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted rounded-tl-sm",
              message.error && "border border-destructive"
            )}>
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin">
                    <Clock size={16} />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : message.error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle size={16} />
                  <span className="text-sm">{message.error}</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap m-0">{message.content}</p>
                </div>
              )}
            </div>

            {/* Message Metadata */}
            <div className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              message.role === 'user' ? "justify-end" : ""
            )}>
              <span>{formatTimestamp(message.created_at)}</span>
              {message.isStreaming && (
                <span className="text-primary">Streaming...</span>
              )}
            </div>

            {/* Model Badge for Assistant Messages */}
            {message.role === 'assistant' && (
              <div>
                {getModelBadge(message)}
              </div>
            )}

            {/* Token Usage */}
            {message.role === 'assistant' && message.total_tokens && (
              <div className="text-xs text-muted-foreground">
                {message.total_tokens} tokens
                {message.prompt_tokens && message.completion_tokens && (
                  <span className="ml-2">
                    ({message.prompt_tokens} + {message.completion_tokens})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {session.isLoading && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div className="flex-1">
            <div className="bg-muted p-4 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">Generating response...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageThread;
