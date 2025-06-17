
import React, { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, Search } from 'lucide-react';
import ConversationSidebar from './ConversationSidebar';
import MessageThread from './MessageThread';
import ChatInputArea from './ChatInputArea';
import ModelSelector from './ModelSelector';
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

  const [chatMode, setChatMode] = useState<'chat' | 'search'>('chat');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-2025-04-14');

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeSession && activeSession.messages.length === 0) {
      loadMessages(activeSession.conversation.id);
    }
  }, [activeSession, loadMessages]);

  const handleNewConversation = async () => {
    const title = chatMode === 'search' ? 'Search Session' : undefined;
    await createConversation(title);
  };

  const handleSelectConversation = (conversationId: string) => {
    const session = sessions.find(s => s.conversation.id === conversationId);
    if (session) {
      setActiveSession(session);
    }
  };

  const handleSendMessage = async (content: string) => {
    let processedContent = content;
    
    // Modify prompt for search mode
    if (chatMode === 'search') {
      processedContent = `[SEARCH MODE] Please search for and provide relevant information about: ${content}`;
    }

    if (!activeSession) {
      // Create new conversation if none exists
      const title = chatMode === 'search' ? 'Search Session' : undefined;
      const newSession = await createConversation(title);
      if (newSession) {
        await sendMessage(newSession.conversation.id, processedContent, selectedProvider, selectedModel);
      }
    } else {
      await sendMessage(activeSession.conversation.id, processedContent, selectedProvider, selectedModel);
    }
  };

  const getPlaceholder = () => {
    return chatMode === 'search' 
      ? 'Search your knowledge base...' 
      : 'Type your message...';
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
        {/* Header with Mode Toggle and Model Selector */}
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <Tabs value={chatMode} onValueChange={(value) => setChatMode(value as 'chat' | 'search')}>
              <TabsList>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search size={16} />
                  Search
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <ModelSelector
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>

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
            placeholder={getPlaceholder()}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
