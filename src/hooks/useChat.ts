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

      // Add optimistic user message
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

      // Add streaming message placeholder if streaming is enabled
      if (enableStreaming) {
        setSessions(prev => prev.map(session => 
          session.conversation.id === conversationId
            ? {
                ...session,
                messages: [...session.messages, streamingMessage],
              }
            : session
        ));

        if (activeSession?.conversation.id === conversationId) {
          setActiveSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, streamingMessage],
          } : null);
        }
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
      setSessions(prev => prev.map(session => 
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
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: [
            ...prev.messages.filter(m => 
              m.localId !== optimisticMessage.localId && 
              m.localId !== streamingMessage.localId
            ),
            convertedUserMessage,
            convertedAssistantMessage,
          ],
          isLoading: false,
        } : null);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove optimistic and streaming messages on error
      setSessions(prev => prev.map(session => 
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
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => 
            m.localId !== optimisticMessage.localId && 
            m.localId !== streamingMessage.localId
          ),
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

      setSessions(prev => prev.map(session => 
        session.conversation.id === conversationId
          ? { ...session, messages: convertedMessages }
          : session
      ));

      if (activeSession?.conversation.id === conversationId) {
        setActiveSession(prev => prev ? {
          ...prev,
          messages: convertedMessages,
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
