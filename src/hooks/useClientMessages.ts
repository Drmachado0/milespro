import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientMessage {
  id: string;
  user_id: string;
  client_id: string;
  subject: string;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  sent_at: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface ClientMessageWithClient extends ClientMessage {
  client_name?: string;
  client_email?: string;
}

export function useClientMessages(clientId?: string) {
  return useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ClientMessage[];
    },
  });
}

export function useClientMessagesWithClients() {
  return useQuery({
    queryKey: ['client-messages-with-clients'],
    queryFn: async () => {
      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from('client_messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Fetch clients to get names
      const clientIds = [...new Set((messages || []).map(m => m.client_id))];
      
      if (clientIds.length === 0) {
        return [];
      }

      const { data: clients, error: clientsError } = await supabase
        .from('travel_clients')
        .select('id, name, email')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // Map client data to messages
      const clientMap = new Map(clients?.map(c => [c.id, c]));
      
      return (messages || []).map(msg => ({
        ...msg,
        client_name: clientMap.get(msg.client_id)?.name,
        client_email: clientMap.get(msg.client_id)?.email,
      })) as ClientMessageWithClient[];
    },
  });
}

interface SendEmailParams {
  client_id: string;
  subject: string;
  body: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
}

interface EmailErrorResponse {
  error: string;
  resolution?: string;
  original_error?: string;
}

export function useSendClientEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-client-email', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) {
        // Throw with resolution info if available
        const err = new Error(data.error) as Error & { resolution?: string };
        err.resolution = data.resolution;
        throw err;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      queryClient.invalidateQueries({ queryKey: ['client-messages-with-clients'] });
      toast({
        title: 'Email enviado!',
        description: 'A mensagem foi enviada com sucesso para o cliente.',
      });
    },
    onError: (error: Error & { resolution?: string }) => {
      const description = error.resolution 
        ? `${error.message}\n\n${error.resolution}`
        : error.message;
      
      toast({
        title: 'Erro ao enviar email',
        description: description,
        variant: 'destructive',
        duration: 10000, // Show longer for errors with resolution
      });
    },
  });
}

export function useUploadAttachment() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('client-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-attachments')
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        path: data.path,
      };
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('client_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-messages'] });
      queryClient.invalidateQueries({ queryKey: ['client-messages-with-clients'] });
      toast({
        title: 'Mensagem excluída',
        description: 'O registro foi removido do histórico.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
