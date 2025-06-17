
import React, { useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import ConversationSidebar from './ConversationSidebar';
import MessageThread from './MessageThread';
import ChatInputArea from './ChatInputArea';
import { Separator } from '@/components/ui/separator';

const ChatInterface: React.FC = () => {
  const {
    sessions,
    activeSession,
    isLoading,
    createConversation,
    sendMessage,
    loadConversations,
    loadMessages,
    setActiveSession,
  } = useChat();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeSession && activeSession.messages.length === 0) {
      loadMessages(activeSession.conversation.id);
    }
  }, [activeSession, loadMessages]);

  const handleNewConversation = async () => {
    await createConversation();
  };

  const handleSelectConversation = (conversationId: string) => {
    const session = sessions.find(s => s.conversation.id === conversationId);
    if (session) {
      setActiveSession(session);
    }
  };

  const handleSendMessage = async (content: string, provider?: string, model?: string) => {
    if (!activeSession) {
      // Create new conversation if none exists
      const newSession = await createConversation();
      if (newSession) {
        await sendMessage(newSession.conversation.id, content, provider, model);
      }
    } else {
      await sendMessage(activeSession.conversation.id, content, provider, model);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background">
        <ConversationSidebar
          sessions={sessions}
          activeSession={activeSession}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoading}
        />
      </div>

      <Separator orientation="vertical" />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          <MessageThread session={activeSession} />
        </div>

        <Separator />

        {/* Input Area */}
        <div className="border-t bg-background">
          <ChatInputArea
            onSendMessage={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
