
-- Verify and update the conversations table structure
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS model_preference TEXT DEFAULT 'gpt-4.1-2025-04-14',
ADD COLUMN IF NOT EXISTS provider_preference TEXT DEFAULT 'openai';

-- Update the messages table to ensure all required fields exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS provider_used TEXT,
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,4) DEFAULT 0.0000;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_status ON public.conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_api_access_user_provider ON public.user_api_access(user_id, provider, model_name);

-- Create RLS policies for conversations (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their own conversations') THEN
    CREATE POLICY "Users can view their own conversations" ON public.conversations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can create their own conversations') THEN
    CREATE POLICY "Users can create their own conversations" ON public.conversations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can update their own conversations') THEN
    CREATE POLICY "Users can update their own conversations" ON public.conversations
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can delete their own conversations') THEN
    CREATE POLICY "Users can delete their own conversations" ON public.conversations
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for messages (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their conversations') THEN
    CREATE POLICY "Users can view messages in their conversations" ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.conversations 
          WHERE id = conversation_id AND user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can create messages in their conversations') THEN
    CREATE POLICY "Users can create messages in their conversations" ON public.messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.conversations 
          WHERE id = conversation_id AND user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update messages in their conversations') THEN
    CREATE POLICY "Users can update messages in their conversations" ON public.messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.conversations 
          WHERE id = conversation_id AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create RLS policies for user_api_access (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_api_access' AND policyname = 'Users can view their own API access') THEN
    CREATE POLICY "Users can view their own API access" ON public.user_api_access
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_api_access' AND policyname = 'Users can update their own API access') THEN
    CREATE POLICY "Users can update their own API access" ON public.user_api_access
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
