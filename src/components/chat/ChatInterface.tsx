
import React, { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useUserApiAccess } from '@/hooks/useUserApiAccess';
import { useSidebar } from '@/hooks/useSidebar';
import ProjectSidebar from './ProjectSidebar';
import MessageThread from './MessageThread';
import InlineChatInput from './InlineChatInput';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    deleteConversation,
    updateConversationProject,
  } = useChat();

  const {
    modelAccess,
    isLoading: isLoadingAccess,
    updateUsage,
  } = useUserApiAccess();

  const { isCollapsed, toggleSidebar } = useSidebar();

  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeSession) {
      if (activeSession.messages.length === 0) {
        loadMessages(activeSession.conversation.id);
      }
    }
  }, [activeSession?.conversation.id, loadMessages]);

  useEffect(() => {
    if (modelAccess.length > 0 && !selectedModel) {
      const firstEnabledModel = modelAccess.find(m => m.isEnabled && !m.isOverLimit);
      if (firstEnabledModel) {
        setSelectedModel(firstEnabledModel.modelName);
        setSelectedProvider(firstEnabledModel.provider);
      }
    }
  }, [modelAccess, selectedModel]);

  const handleNewConversation = async (projectId?: string) => {
    const newSession = await createConversation(undefined, undefined, projectId);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveSession(conversationId);
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
  };

  const handleSendMessage = async (content: string, provider?: string, model?: string, documentIds?: string[]) => {
    if (!activeSession) {
      const newSession = await createConversation(undefined, content);
      if (newSession) {
        await sendMessage(newSession.conversation.id, content, selectedProvider, selectedModel, documentIds, true);
      }
    } else {
      await sendMessage(activeSession.conversation.id, content,  selectedProvider, selectedModel, documentIds, true);
    }
  };

  const handleModelSelect = (model: string, provider: string) => {
    setSelectedModel(model);
    setSelectedProvider(provider);
  };

  const handleConversationMoved = (conversationId: string, projectId: string | null) => {
    updateConversationProject(conversationId, projectId);
  };

  if (isLoadingAccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading model access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex w-full relative">
      {/* Collapsed Sidebar Toggle - Always visible when collapsed */}
      {isCollapsed && (
        <div className="flex-shrink-0 w-12 border-r bg-background flex flex-col">
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-1 h-8 w-8"
            >
              <PanelLeft size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "border-r bg-background transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0",
        isCollapsed ? "w-0" : "w-80"
      )}>
        <div className={cn(
          "h-full w-80 transition-opacity duration-300",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <ProjectSidebar
            sessions={sessions}
            activeSession={activeSession}
            onNewConversation={handleNewConversation}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onToggleSidebar={toggleSidebar}
            isLoading={isLoading}
            onConversationMoved={handleConversationMoved}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          <MessageThread session={activeSession} />
        </div>

        {/* Sticky Input Area */}
        <div className="sticky bottom-0 bg-background">
          <InlineChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="What are you working on?"
            modelAccess={modelAccess}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            onModelSelect={handleModelSelect}
            onNewConversation={handleNewConversation}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
