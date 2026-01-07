/*
  # Chat Files and Storage Setup
  
  1. New Tables
    - `chat_files`
      - `id` (uuid, primary key) - Unique file identifier
      - `user_id` (uuid, references auth.users) - Owner of the file
      - `conversation_id` (uuid, references conversations) - Associated conversation
      - `message_id` (uuid) - Associated message ID
      - `file_name` (text) - Original file name
      - `file_type` (text) - MIME type of the file
      - `file_url` (text) - Storage URL of the file
      - `extracted_text` (text) - Text extracted from the file
      - `file_size` (integer) - File size in bytes
      - `analysis_result` (jsonb) - AI analysis results
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `chat_files` table
    - Add policy for users to manage their own files
  
  3. Storage
    - Create storage bucket for chat uploads
*/

-- Create chat_files table
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  analysis_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_files_user_id ON chat_files(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_conversation_id ON chat_files(conversation_id);

-- Enable RLS
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
  ON chat_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own files
CREATE POLICY "Users can insert own files"
  ON chat_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
  ON chat_files
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON chat_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for chat uploads (if storage extension available)
-- Note: Storage bucket creation is typically done via Supabase dashboard or CLI
-- The bucket should be named 'chat-uploads' with a 10MB file size limit

-- Add comment for documentation
COMMENT ON TABLE chat_files IS 'Stores metadata for files uploaded through the chatbot interface';