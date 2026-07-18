import { useState, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabletSplitPane } from '@/components/layout/TabletSplitPane';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Mail, Send, Paperclip, X, Search, Trash2,
  CheckCircle, XCircle, Clock, FileText, Loader2, MailOpen
} from 'lucide-react';
import { useTravelClients } from '@/hooks/travel';
import { 
  useClientMessagesWithClients, 
  useSendClientEmail, 
  useUploadAttachment,
  useDeleteMessage,
  ClientMessageWithClient 
} from '@/hooks/useClientMessages';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Comunicacao() {
  const { formatDate } = useLocalization();
  const { data: clients = [], isLoading: clientsLoading } = useTravelClients();
  const { data: messages = [], isLoading: messagesLoading } = useClientMessagesWithClients();
  const sendEmail = useSendClientEmail();
  const uploadAttachment = useUploadAttachment();
  const deleteMessage = useDeleteMessage();

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; url?: string; name: string; size: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMessage, setViewMessage] = useState<ClientMessageWithClient | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientsWithEmail = clients.filter(c => c.email);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setAttachment({ file, name: file.name, size: file.size });
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !subject.trim() || !body.trim()) {
      return;
    }

    try {
      let attachmentData: { url: string; name: string; size: number } | undefined;

      // Upload attachment if present
      if (attachment?.file) {
        const result = await uploadAttachment.mutateAsync(attachment.file);
        attachmentData = {
          url: result.url,
          name: result.name,
          size: result.size,
        };
      }

      // Send email
      await sendEmail.mutateAsync({
        client_id: selectedClient,
        subject: subject.trim(),
        body: body.trim(),
        attachment_url: attachmentData?.url,
        attachment_name: attachmentData?.name,
        attachment_size: attachmentData?.size,
      });

      // Reset form
      setSelectedClient('');
      setSubject('');
      setBody('');
      removeAttachment();
    } catch (error) {
      logger.error('Error sending email:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMessage.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const filteredMessages = messages.filter(msg =>
    msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.client_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMessage = useMemo(
    () => filteredMessages.find((m) => m.id === selectedMessageId) ?? null,
    [filteredMessages, selectedMessageId],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" /> Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isSending = sendEmail.isPending || uploadAttachment.isPending;

  return (
    <DashboardLayout title="Comunicação">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Mail className="h-5 w-5" />}
          title="Comunicação"
          subtitle="Envie emails para seus clientes com anexos e acompanhe o histórico"
        />
        <div className="hidden">
          <p className="text-muted-foreground">
            Legacy placeholder
          </p>
        </div>

        <Tabs defaultValue="enviar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="enviar">
              <Send className="h-4 w-4 mr-2" />
              Enviar Email
            </TabsTrigger>
            <TabsTrigger value="historico">
              <FileText className="h-4 w-4 mr-2" />
              Histórico ({messages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="enviar">
            <Card>
              <CardHeader>
                <CardTitle>Nova Mensagem</CardTitle>
                <CardDescription>
                  Compose e envie um email para o cliente selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsLoading ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : clientsWithEmail.length === 0 ? (
                          <SelectItem value="empty" disabled>Nenhum cliente com email cadastrado</SelectItem>
                        ) : (
                          clientsWithEmail.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} ({client.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {clients.length > 0 && clientsWithEmail.length === 0 && (
                      <p className="text-sm text-warning">
                        Cadastre o email dos clientes para poder enviar mensagens.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto *</Label>
                    <Input
                      id="subject"
                      placeholder="Assunto do email"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Mensagem *</Label>
                    <Textarea
                      id="body"
                      placeholder="Digite sua mensagem..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Anexo (opcional)</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept="*/*"
                    />
                    {attachment ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={removeAttachment}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Adicionar anexo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Tamanho máximo: 5MB
                    </p>
                    <p className="text-xs text-warning dark:text-warning mt-2">
                      ⚠️ Modo teste: emails só podem ser enviados para o endereço da conta Resend.
                      Para produção, <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">verifique seu domínio</a>.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!selectedClient || !subject.trim() || !body.trim() || isSending}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Email
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12 rounded-2xl border border-border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <EmptyState
                icon={Mail}
                title={searchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem enviada ainda'}
                description={searchTerm
                  ? 'Ajuste sua busca ou limpe os filtros.'
                  : 'Envie sua primeira mensagem para um cliente para começar.'}
              />
            ) : (
              <TabletSplitPane
                className="min-h-0"
                masterHeader={
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Histórico</p>
                        <h3 className="text-sm font-medium">
                          Mensagens <span className="font-mono tabular-nums text-muted-foreground">({filteredMessages.length})</span>
                        </h3>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                }
                master={
                  <div className="divide-y divide-border/40">
                    {filteredMessages.map((msg) => {
                      const isSelected = selectedMessageId === msg.id;
                      return (
                        <button
                          key={msg.id}
                          type="button"
                          onClick={() => {
                            setSelectedMessageId(msg.id);
                            // mobile/portrait: também abre Dialog para evitar scroll longo até o detalhe
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                              setViewMessage(msg);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-primary/5 lg:border-l-2 lg:border-l-primary lg:pl-[14px]'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">
                                  {msg.client_name || 'Cliente removido'}
                                </p>
                                {msg.attachment_name && (
                                  <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.subject}</p>
                              <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono tabular-nums">
                                {format(new Date(msg.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="flex-shrink-0">{getStatusBadge(msg.status)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                }
                detail={
                  selectedMessage ? (
                    <div className="hidden lg:flex flex-col p-6 gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold leading-tight">{selectedMessage.subject}</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Para <span className="text-foreground">{selectedMessage.client_name || 'Cliente removido'}</span>
                            {selectedMessage.client_email && (
                              <span className="text-muted-foreground"> ({selectedMessage.client_email})</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
                            {format(new Date(selectedMessage.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getStatusBadge(selectedMessage.status)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(selectedMessage.id)}
                            aria-label="Excluir mensagem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/40 rounded-lg whitespace-pre-wrap text-sm leading-relaxed border border-border/60">
                        {selectedMessage.body}
                      </div>

                      {selectedMessage.attachment_name && (
                        <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-card">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm truncate">{selectedMessage.attachment_name}</span>
                          {selectedMessage.attachment_size && (
                            <span className="text-xs text-muted-foreground font-mono tabular-nums">
                              {formatFileSize(selectedMessage.attachment_size)}
                            </span>
                          )}
                        </div>
                      )}

                      {selectedMessage.status === 'failed' && selectedMessage.error_message && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          <strong>Erro:</strong> {selectedMessage.error_message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center h-full text-center px-6 py-12 text-muted-foreground">
                      <div className="grid place-items-center h-12 w-12 rounded-full bg-muted/40 mb-3">
                        <MailOpen className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Selecione uma mensagem</p>
                      <p className="text-xs mt-1">Visualize o conteúdo, status e anexos no painel ao lado.</p>
                    </div>
                  )
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Message Dialog */}
      <Dialog open={!!viewMessage} onOpenChange={() => setViewMessage(null)}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewMessage?.subject}</DialogTitle>
            <DialogDescription>
              Enviado para {viewMessage?.client_name} ({viewMessage?.client_email}) em{' '}
              {viewMessage && format(new Date(viewMessage.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
              {viewMessage?.body}
            </div>
            {viewMessage?.attachment_name && (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{viewMessage.attachment_name}</span>
                {viewMessage.attachment_size && (
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(viewMessage.attachment_size)}
                  </span>
                )}
              </div>
            )}
            {viewMessage?.status === 'failed' && viewMessage.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <strong>Erro:</strong> {viewMessage.error_message}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir mensagem"
        description="Tem certeza que deseja excluir esta mensagem do histórico? Esta ação não pode ser desfeita."
      />
    </DashboardLayout>
  );
}
