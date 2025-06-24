
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ChatInterface from '@/components/chat/ChatInterface';
import Navbar from '@/components/Navbar';

const ChatPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <div className="h-screen w-full flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ChatPage;
