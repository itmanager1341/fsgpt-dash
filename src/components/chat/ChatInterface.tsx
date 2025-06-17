
import React, { useState } from 'react';
import { ChatSession, ModelAccess, UsageAlert } from '@/types/frontend';
import { Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MessageSquare, Settings } from 'lucide-react';
import ConversationSidebar from './ConversationSidebar';
import MessageThread from './MessageThread';
import ChatInputArea from './ChatInputArea';
import ModelSelector from './ModelSelector';
import UsageDashboard from './UsageDashboard';

interface ChatInterfaceProps {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  modelAccess: ModelAccess[];
  usageAlerts: UsageAlert[];
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onSendMessage: (message: string, model?: string, provider?: string) => void;
  onModelChange: (model: string, provider: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessions,
  activeSession,
  modelAccess,
  usageAlerts,
  onSessionSelect,
  onNewSession,
  onSendMessage,
  onModelChange
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUsageDashboard, setShowUsageDashboard] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');

  const handleModelSelection = (model: string, provider: string) => {
    setSelectedModel(model);
    setSelectedProvider(provider);
    onModelChange(model, provider);
  };

  const handleSendMessage = (message: string) => {
    onSendMessage(message, selectedModel, selectedProvider);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <ConversationSidebar
          sessions={sessions}
          activeSession={activeSession}
          onSessionSelect={onSessionSelect}
          onNewSession={onNewSession}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <ConversationSidebar
            sessions={sessions}
            activeSession={activeSession}
            onSessionSelect={onSessionSelect}
            onNewSession={onNewSession}
            onClose={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <MessageSquare size={20} className="text-primary" />
            <h1 className="font-semibold">
              {activeSession?.conversation.title || 'AI Assistant'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector
              modelAccess={modelAccess}
              selectedModel={selectedModel}
              selectedProvider={selectedProvider}
              onModelSelect={handleModelSelection}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowUsageDashboard(true)}
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>

        {/* Usage Alerts */}
        {usageAlerts.length > 0 && (
          <div className="border-b bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2">
            {usageAlerts.map((alert, index) => (
              <div key={index} className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-hidden">
          <MessageThread session={activeSession} />
        </div>

        {/* Chat Input */}
        <div className="border-t">
          <ChatInputArea
            onSendMessage={handleSendMessage}
            isLoading={activeSession?.isLoading || false}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
          />
        </div>
      </div>

      {/* Usage Dashboard Modal */}
      <Sheet open={showUsageDashboard} onOpenChange={setShowUsageDashboard}>
        <SheetContent side="right" className="w-96">
          <UsageDashboard
            modelAccess={modelAccess}
            usageAlerts={usageAlerts}
            onClose={() => setShowUsageDashboard(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatInterface;
