import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Users, Plane, Edit, Trash2, Loader2, FileText } from 'lucide-react';
import { useTravelClients, useCreateTravelClient, useUpdateTravelClient, useDeleteTravelClient, useTravelTickets, useTravelHotelReservations, useTravelCarRentals, TravelClient } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { generateClientStatement } from '@/lib/invoiceGenerator';
import { preloadPDFLibraries } from '@/lib/pdfLoader';
import { formatCPF, formatPhone } from '@/lib/formatters';

export default function Clientes() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  useEffect(() => { preloadPDFLibraries(); }, []);
  const { data: clients = [], isLoading } = useTravelClients();
  const { data: tickets = [] } = useTravelTickets();
  const { data: hotels = [] } = useTravelHotelReservations();
  const { data: cars = [] } = useTravelCarRentals();
  const createClient = useCreateTravelClient();
  const updateClient = useUpdateTravelClient();
  const deleteClient = useDeleteTravelClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<TravelClient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    status: 'active',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      email: '',
      phone: '',
      status: 'active',
      notes: '',
    });
    setEditingClient(null);
  };

  const handleOpenDialog = (client?: TravelClient) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        cpf: client.cpf,
        email: client.email || '',
        phone: client.phone || '',
        status: client.status,
        notes: client.notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      await updateClient.mutateAsync({
        id: editingClient.id,
        ...formData,
      });
    } else {
      await createClient.mutateAsync({
        ...formData,
        miles_balance: 0,
        total_miles_used: 0,
        total_spent_brl: 0,
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteClient.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cpf.includes(searchTerm)
  );

  const totalMiles = clients.reduce((sum, c) => sum + c.miles_balance, 0);
  const activeClients = clients.filter(c => c.status === 'active').length;

  return (
    <DashboardLayout title="Cadastro de Clientes">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Users className="h-5 w-5" />}
          title="Clientes"
          subtitle="Cadastro e histórico de clientes da agência"
        />
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Clientes</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{clients.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{activeClients}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Plane className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Milhas Disponíveis</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{formatNumber(totalMiles)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média por Cliente</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{formatNumber(clients.length ? totalMiles / clients.length : 0)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Clientes Cadastrados</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>CPF *</Label>
                        <Input
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                          placeholder="000.000.000-00"
                          required
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                        {(createClient.isPending || updateClient.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingClient ? 'Salvar' : 'Cadastrar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title={searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                description={searchTerm
                  ? 'Ajuste sua busca ou limpe os filtros.'
                  : 'Cadastre seu primeiro cliente para começar a gerenciar reservas.'}
              />
            ) : (
              <>
                {/* Mobile card list (<md) — single-column, touch-friendly */}
                <div className="md:hidden space-y-3">
                  {filteredClients.map((client) => (
                    <Card key={client.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{client.name}</h3>
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="flex-shrink-0">
                              {client.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">{client.cpf}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => generateClientStatement(client, tickets, hotels, cars)} aria-label="Extrato PDF">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenDialog(client)} aria-label="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(client.id)} aria-label="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Milhas</p>
                          <p className="font-mono tabular-nums text-sm font-semibold text-primary mt-0.5">{formatNumber(client.miles_balance)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Usadas</p>
                          <p className="font-mono tabular-nums text-sm mt-0.5">{formatNumber(client.total_miles_used)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gasto</p>
                          <p className="font-mono tabular-nums text-sm mt-0.5">{formatCurrency(client.total_spent_brl)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop table (md+) */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Saldo Milhas</TableHead>
                        <TableHead className="text-right">Milhas Usadas</TableHead>
                        <TableHead className="text-right">Total Gasto</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono tabular-nums">{client.cpf}</TableCell>
                          <TableCell>
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                              {client.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary font-mono tabular-nums">
                            {formatNumber(client.miles_balance)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono tabular-nums">
                            {formatNumber(client.total_miles_used)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(client.total_spent_brl)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => generateClientStatement(client, tickets, hotels, cars)}
                                title="Gerar Extrato PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(client)} aria-label="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(client.id)} aria-label="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e todas as reservas associadas serão removidas."
      />
    </DashboardLayout>
  );
}
