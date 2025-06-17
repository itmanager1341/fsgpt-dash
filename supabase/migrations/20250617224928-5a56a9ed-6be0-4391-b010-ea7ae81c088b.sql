
-- Drop the existing faulty INSERT policy for conversations
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;

-- Create a new INSERT policy with proper WITH CHECK clause
CREATE POLICY "Users can create their own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
