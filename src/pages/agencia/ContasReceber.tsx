import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Search, DollarSign, Clock, CheckCircle, AlertTriangle, Filter, Calendar } from 'lucide-react';
import { useTravelClients, useTravelReceivables, useCreateTravelReceivable, useUpdateTravelReceivable, useDeleteTravelReceivable, type TravelReceivable } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export default function ContasReceber() {
  const { formatCurrency, formatDate } = useLocalization();
  const { data: clients = [] } = useTravelClients();
  const { data: receivables = [], isLoading } = useTravelReceivables();
  const createReceivable = useCreateTravelReceivable();
  const updateReceivable = useUpdateTravelReceivable();
  const deleteReceivable = useDeleteTravelReceivable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<TravelReceivable | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  const [formData, setFormData] = useState({
    client_id: '',
    description: '',
    amount: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      description: '',
      amount: '',
      due_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: '',
      notes: ''
    });
    setEditingReceivable(null);
  };

  const handleOpenDialog = (receivable?: TravelReceivable) => {
    if (receivable) {
      setEditingReceivable(receivable);
      setFormData({
        client_id: receivable.client_id,
        description: receivable.description,
        amount: receivable.amount.toString(),
        due_date: receivable.due_date,
        payment_method: receivable.payment_method || '',
        notes: receivable.notes || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.client_id || !formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const data = {
      client_id: formData.client_id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      status: 'pending',
      payment_method: formData.payment_method || null,
      notes: formData.notes || null
    };

    if (editingReceivable) {
      await updateReceivable.mutateAsync({ id: editingReceivable.id, ...data });
      toast.success('Conta atualizada com sucesso');
    } else {
      await createReceivable.mutateAsync(data);
      toast.success('Conta criada com sucesso');
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleMarkAsPaid = async (receivable: TravelReceivable) => {
    await updateReceivable.mutateAsync({
      id: receivable.id,
      status: 'paid',
      paid_at: new Date().toISOString()
    });
    toast.success('Pagamento registrado');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteReceivable.mutateAsync(deleteId);
      toast.success('Conta removida');
      setDeleteId(null);
    }
  };

  // Calculate status based on due_date and paid_at
  const getStatus = (receivable: TravelReceivable) => {
    if (receivable.status === 'paid' || receivable.paid_at) return 'paid';
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(receivable.due_date));
    if (isBefore(dueDate, today)) return 'overdue';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/20 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>;
      default:
        return <Badge className="bg-warning/20 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  // Filter receivables
  const filteredReceivables = receivables.filter(r => {
    const status = getStatus(r);
    const client = clients.find(c => c.id === r.client_id);
    const matchesSearch = r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    const matchesClient = filterClient === 'all' || r.client_id === filterClient;
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Calculate totals
  const totalPending = filteredReceivables.filter(r => getStatus(r) === 'pending').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOverdue = filteredReceivables.filter(r => getStatus(r) === 'overdue').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPaid = filteredReceivables.filter(r => getStatus(r) === 'paid').reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAll = filteredReceivables.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <DashboardLayout title="Contas a Receber">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            eyebrow="Agência"
            icon={<DollarSign className="h-5 w-5" />}
            title="Contas a Receber"
            subtitle="Controle de pagamentos pendentes de clientes"
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>{editingReceivable ? 'Editar Conta' : 'Nova Conta a Receber'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Passagem São Paulo - Lisboa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Vencimento *</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingReceivable ? 'Salvar Alterações' : 'Criar Conta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-warning">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencido</p>
                <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-destructive">{formatCurrency(totalOverdue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-success">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-lg font-bold tabular-nums tracking-tight">{formatCurrency(totalAll)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-8">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Clientes</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredReceivables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma conta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceivables.map(receivable => {
                  const client = clients.find(c => c.id === receivable.client_id);
                  const status = getStatus(receivable);
                  return (
                    <TableRow key={receivable.id}>
                      <TableCell className="font-medium">{client?.name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{receivable.description}</TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">{formatCurrency(receivable.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(new Date(receivable.due_date))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {receivable.payment_method || '-'}
                        {receivable.paid_at && (
                          <div className="text-success">
                            Pago em {formatDate(new Date(receivable.paid_at))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs bg-success/10 hover:bg-success/20 text-success border-success/30"
                              onClick={() => handleMarkAsPaid(receivable)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Receber
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleOpenDialog(receivable)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(receivable.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {filteredReceivables.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-medium">Total ({filteredReceivables.length} contas)</TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">{formatCurrency(totalAll)}</TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
          </div>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Conta"
        description="Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita."
      />
    </DashboardLayout>
  );
}
