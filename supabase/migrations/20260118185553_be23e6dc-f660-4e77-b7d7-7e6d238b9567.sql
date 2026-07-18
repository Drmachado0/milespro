-- Criar tabela de mensagens para clientes
CREATE TABLE public.client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_client_messages_user ON client_messages(user_id);
CREATE INDEX idx_client_messages_client ON client_messages(client_id);
CREATE INDEX idx_client_messages_sent ON client_messages(sent_at DESC);

-- Habilitar RLS
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own messages"
ON client_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON client_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON client_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON client_messages FOR DELETE
USING (auth.uid() = user_id);

-- Criar bucket para anexos (5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-attachments', 'client-attachments', false, 5242880);

-- Políticas de storage para anexos
CREATE POLICY "Users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);