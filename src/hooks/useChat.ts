
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatSession, MessageWithLoading } from '@/types/frontend';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';

export const useChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to generate a title from message content
  const generateTitleFromMessage = (content: string): string => {
    const cleaned = content.replace(/^\[SEARCH MODE\]\s*Please search for and provide relevant information about:\s*/i, '').trim();
    if (cleaned.length <= 40) return cleaned;
    return cleaned.substring(0, 40) + '...';
  };

  // Helper function to sync active session with sessions array
  const syncActiveSession = useCallback((updatedSessions: ChatSession[], activeSessionId?: string) => {
    const targetId = activeSessionId || activeSession?.conversation.id;
    if (targetId) {
      const updatedActiveSession = updatedSessions.find(s => s.conversation.id === targetId);
      if (updatedActiveSession) {
        setActiveSession(updatedActiveSession);
      }
    }
  }, [activeSession?.conversation.id]);

  const createConversation = useCallback(async (title?: string, initialMessage?: string) => {
    try {
      setIsLoading(true);
      console.log('Creating conversation with title:', title, 'initialMessage:', initialMessage);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found');
        toast.error('Please sign in to create a conversation');
        return null;
      }

      // Generate title from initial message if provided
      const conversationTitle = initialMessage 
        ? generateTitleFromMessage(initialMessage)
        : (title || 'New Conversation');

      console.log('Invoking create-conversation function...');
      const response = await supabase.functions.invoke('create-conversation', {
        body: { title: conversationTitle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Function response:', response);

      if (response.error) {
        console.error('Function error:', response.error);
        throw response.error;
      }

      if (!response.data || !response.data.conversation) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }

      const conversation: Conversation = response.data.conversation;
      console.log('Conversation created:', conversation);
      
      const newSession: ChatSession = {
        conversation,
        messages: [],
        isLoading: false,
        unreadCount: 0,
      };

      // Update sessions and set as active
      setSessions(prev => {
        const updated = [newSession, ...prev];
        syncActiveSession(updated, newSession.conversation.id);
        return updated;
      });
      
      setActiveSession(newSession);
      return newSession;

    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [syncActiveSession]);

  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    provider?: string, 
    model?: string,
    enableStreaming = true
  ) => {
    // Create optimistic message first
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

    // Create streaming assistant message placeholder
    const streamingMessage: MessageWithLoading = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      localId: `temp-assistant-${Date.now()}`,
      isStreaming: true,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to send messages');
        return;
      }

      // Update both sessions and activeSession with optimistic user message
      setSessions(prev => {
        const updated = prev.map(session => 
          session.conversation.id === conversationId
            ? {
                ...session,
                messages: [...session.messages, optimisticMessage],
                isLoading: true,
              }
            : session
        );
        syncActiveSession(updated, conversationId);
        return updated;
      });

      // Add streaming message placeholder if streaming is enabled
      if (enableStreaming) {
        setSessions(prev => {
          const updated = prev.map(session => 
            session.conversation.id === conversationId
              ? {
                  ...session,
                  messages: [...session.messages, streamingMessage],
                }
              : session
          );
          syncActiveSession(updated, conversationId);
          return updated;
        });
      }

      const response = await supabase.functions.invoke('send-message', {
        body: {
          conversationId,
          message: content,
          provider,
          model,
          stream: enableStreaming,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const { userMessage, assistantMessage } = response.data;

      // Convert database messages to MessageWithLoading format
      const convertedUserMessage: MessageWithLoading = {
        ...userMessage,
        metadata: (userMessage.metadata as Record<string, any>) || {},
        created_at: userMessage.created_at,
      };

      const convertedAssistantMessage: MessageWithLoading = {
        ...assistantMessage,
        metadata: (assistantMessage.metadata as Record<string, any>) || {},
        created_at: assistantMessage.created_at,
      };

      // Replace optimistic and streaming messages with real messages
      setSessions(prev => {
        const updated = prev.map(session => 
          session.conversation.id === conversationId
            ? {
                ...session,
                messages: [
                  ...session.messages.filter(m => 
                    m.localId !== optimisticMessage.localId && 
                    m.localId !== streamingMessage.localId
                  ),
                  convertedUserMessage,
                  convertedAssistantMessage,
                ],
                isLoading: false,
              }
            : session
        );
        syncActiveSession(updated, conversationId);
        return updated;
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove optimistic and streaming messages on error
      setSessions(prev => {
        const updated = prev.map(session => 
          session.conversation.id === conversationId
            ? {
                ...session,
                messages: session.messages.filter(m => 
                  m.localId !== optimisticMessage.localId && 
                  m.localId !== streamingMessage.localId
                ),
                isLoading: false,
              }
            : session
        );
        syncActiveSession(updated, conversationId);
        return updated;
      });
    }
  }, [syncActiveSession]);

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
        conversation: {
          ...conv,
          status: conv.status as 'active' | 'archived' | 'deleted',
          metadata: (conv.metadata as Record<string, any>) || {},
        },
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

      // Convert database messages to MessageWithLoading format
      const convertedMessages: MessageWithLoading[] = (messages || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system',
        metadata: (msg.metadata as Record<string, any>) || {},
        created_at: msg.created_at,
      }));

      setSessions(prev => {
        const updated = prev.map(session => 
          session.conversation.id === conversationId
            ? { ...session, messages: convertedMessages }
            : session
        );
        syncActiveSession(updated, conversationId);
        return updated;
      });

    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  }, [syncActiveSession]);

  const setActiveSessionById = useCallback((conversationId: string) => {
    const session = sessions.find(s => s.conversation.id === conversationId);
    if (session) {
      setActiveSession(session);
    }
  }, [sessions]);

  return {
    sessions,
    activeSession,
    isLoading,
    createConversation,
    sendMessage,
    loadConversations,
    loadMessages,
    setActiveSession: setActiveSessionById,
  };
};
