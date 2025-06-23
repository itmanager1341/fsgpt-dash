
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatInterface from '@/components/chat/ChatInterface';

const ChatPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <div className="h-screen w-full">
        <ChatInterface />
      </div>
    </ProtectedRoute>
  );
};

export default ChatPage;
