
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatSession, MessageWithLoading } from '@/types/frontend';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';

export const useChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createConversation = useCallback(async (title?: string) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to create a conversation');
        return null;
      }

      const response = await supabase.functions.invoke('create-conversation', {
        body: { title },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const conversation: Conversation = response.data.conversation;
      const newSession: ChatSession = {
        conversation,
        messages: [],
        isLoading: false,
        unreadCount: 0,
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      return newSession;

    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string, provider?: string, model?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to send messages');
        return;
      }

      // Add optimistic user message
      const optimisticMessage: MessageWithLoading = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost: 0,
        metadata: {},
        created_at: new Date().toISOString(),
        localId: `temp-${Date.now()}`,
      };

      setSessions(prev => prev.map(session => 
        session.conversation.id === conversationId
          ? {
              ...session,
              messages: [...session.messages, optimisticMessage],
              isLoading: true,
            }
          : session
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: [...prev.messages, optimisticMessage],
          isLoading: true,
        } : null);
      }

      const response = await supabase.functions.invoke('send-message', {
        body: {
          conversationId,
          message: content,
          provider,
          model,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { userMessage, assistantMessage } = response.data;

      // Replace optimistic message with real messages
      setSessions(prev => prev.map(session => 
        session.conversation.id === conversationId
          ? {
              ...session,
              messages: [
                ...session.messages.filter(m => m.localId !== optimisticMessage.localId),
                userMessage,
                assistantMessage,
              ],
              isLoading: false,
            }
          : session
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: [
            ...prev.messages.filter(m => m.localId !== optimisticMessage.localId),
            userMessage,
            assistantMessage,
          ],
          isLoading: false,
        } : null);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove optimistic message on error
      setSessions(prev => prev.map(session => 
        session.conversation.id === conversationId
          ? {
              ...session,
              messages: session.messages.filter(m => m.localId !== optimisticMessage.localId),
              isLoading: false,
            }
          : session
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => m.localId !== optimisticMessage.localId),
          isLoading: false,
        } : null);
      }
    }
  }, [activeSession]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const sessionsData: ChatSession[] = conversations.map(conv => ({
        conversation: conv,
        messages: [],
        isLoading: false,
        unreadCount: 0,
      }));

      setSessions(sessionsData);

    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.conversation.id === conversationId
          ? { ...session, messages: messages || [] }
          : session
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: messages || [],
        } : null);
      }

    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, [activeSession]);

  return {
    sessions,
    activeSession,
    isLoading,
    createConversation,
    sendMessage,
    loadConversations,
    loadMessages,
    setActiveSession,
  };
};
