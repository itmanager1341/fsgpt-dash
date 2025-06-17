
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  total_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  model_preference TEXT DEFAULT 'gpt-4.1-2025-04-14',
  provider_preference TEXT DEFAULT 'openai',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  provider_used TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0.0000,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_api_access table
CREATE TABLE public.user_api_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  current_usage DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  usage_period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_name, provider)
);

-- Create document_uploads table
CREATE TABLE public.document_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed', 'processing')),
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_user_api_access_user_id ON public.user_api_access(user_id);
CREATE INDEX idx_user_api_access_model ON public.user_api_access(model_name, provider);
CREATE INDEX idx_document_uploads_user_id ON public.document_uploads(user_id);
CREATE INDEX idx_document_uploads_conversation_id ON public.document_uploads(conversation_id);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their conversations" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for user_api_access
CREATE POLICY "Users can view their own API access" ON public.user_api_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own API access" ON public.user_api_access
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for document_uploads
CREATE POLICY "Users can view their own documents" ON public.document_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload documents" ON public.document_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.document_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (using correct has_role function signature)
CREATE POLICY "Admins can view all conversations" ON public.conversations
  FOR ALL USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can view all messages" ON public.messages
  FOR ALL USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can manage all API access" ON public.user_api_access
  FOR ALL USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can view all documents" ON public.document_uploads
  FOR ALL USING (public.has_role('admin'::app_role));

-- Create function to update conversation updated_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation timestamp
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Create function to update conversation total cost when messages are added/updated
CREATE OR REPLACE FUNCTION update_conversation_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total cost for the conversation
  UPDATE public.conversations 
  SET total_cost = (
    SELECT COALESCE(SUM(cost), 0) 
    FROM public.messages 
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
  )
  WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating conversation cost
CREATE TRIGGER update_conversation_cost_on_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_cost();

CREATE TRIGGER update_conversation_cost_on_update
  AFTER UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_cost();

CREATE TRIGGER update_conversation_cost_on_delete
  AFTER DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_cost();
