import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileQuestion, Trash2, Loader2, Download, Pencil, Filter, X, CheckCircle2, Send, XCircle, Clock, ArrowRightCircle, Ticket, Building2, Car, Package, FileText, Copy, MoreHorizontal, CalendarRange } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateQuotePDF } from '@/lib/invoiceGenerator';
import { preloadPDFLibraries } from '@/lib/pdfLoader';
import { useTravelClients, useTravelQuotes, useCreateTravelQuote, useUpdateTravelQuote, useDeleteTravelQuote, TravelQuote, useCreateTravelTicket, useCreateTravelHotelReservation, useCreateTravelCarRental, useAgencySettings } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { ProgramLogo } from '@/components/ui/program-logo';
import { toast } from 'sonner';
import { OrcamentoFormDialog, type OrcamentoFormValues } from '@/components/agencia/OrcamentoFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

const QUOTE_TYPES = [
  { value: 'ticket', label: 'Passagem', icon: Ticket },
  { value: 'hotel', label: 'Hotel', icon: Building2 },
  { value: 'car', label: 'Carro', icon: Car },
  { value: 'package', label: 'Pacote', icon: Package },
];

const STATUS_OPTIONS: Array<{ value: string; label: string; color: BadgeProps['variant'] }> = [
  { value: 'pending', label: 'Pendente', color: 'secondary' },
  { value: 'sent', label: 'Enviado', color: 'outline' },
  { value: 'approved', label: 'Aprovado', color: 'default' },
  { value: 'rejected', label: 'Rejeitado', color: 'destructive' },
  { value: 'converted', label: 'Convertido', color: 'default' },
  { value: 'expired', label: 'Expirado', color: 'secondary' },
];

export default function Orcamentos() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  useEffect(() => { preloadPDFLibraries(); }, []);
  const { data: clients = [] } = useTravelClients();
  const { data: quotes = [], isLoading } = useTravelQuotes();
  const createQuote = useCreateTravelQuote();
  const updateQuote = useUpdateTravelQuote();
  const deleteQuote = useDeleteTravelQuote();
  const createTicket = useCreateTravelTicket();
  const createHotel = useCreateTravelHotelReservation();
  const createCar = useCreateTravelCarRental();
  const { data: agencySettings } = useAgencySettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelQuote | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<TravelQuote | null>(null);

  // Filters
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (filterClient !== 'all' && quote.client_id !== filterClient) return false;
      if (filterType !== 'all' && quote.quote_type !== filterType) return false;
      if (filterStatus !== 'all' && quote.status !== filterStatus) return false;
      if (filterDateStart && quote.created_at < filterDateStart) return false;
      if (filterDateEnd && quote.created_at > filterDateEnd + 'T23:59:59') return false;
      if (q) {
        const hay = `${quote.quote_number} ${quote.client?.name || ''} ${quote.description || ''} ${quote.miles_program || ''} ${quote.origin || ''} ${quote.destination || ''} ${quote.airline || ''} ${quote.hotel_name || ''} ${quote.city || ''} ${quote.rental_company || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [quotes, filterClient, filterType, filterStatus, filterDateStart, filterDateEnd, searchText]);

  // Totals
  const pendingCount = quotes.filter(q => q.status === 'pending' || q.status === 'sent').length;
  const convertedCount = quotes.filter(q => q.status === 'converted').length;
  const totalSalesEstimate = filteredQuotes.reduce((sum, q) => sum + (q.sale_price || 0), 0);

  const clearFilters = () => {
    setFilterClient('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const hasActiveFilters = filterClient !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterDateStart !== '' || filterDateEnd !== '';

  const handleNew = () => {
    setEditing(null);
    setDuplicateOf(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (quote: TravelQuote) => {
    setEditing(quote);
    setDuplicateOf(null);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (quote: TravelQuote) => {
    setEditing(null);
    setDuplicateOf(quote);
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditing(null);
      setDuplicateOf(null);
    }
  };

  const handleQuickStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateQuote.mutateAsync({ id, status: newStatus });
      toast.success(`Status atualizado para ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
    } catch (error) {
      logger.error('Error updating quote status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSubmit = async (values: OrcamentoFormValues) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateQuote.mutateAsync({ id: editing.id, ...values });
      } else {
        await createQuote.mutateAsync(values);
      }
      setIsDialogOpen(false);
      setEditing(null);
      setDuplicateOf(null);
    } catch (error) {
      logger.error('Error saving quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteQuote.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleConvert = async () => {
    if (!convertId) return;

    const quote = quotes.find(q => q.id === convertId);
    if (!quote) return;

    setIsSubmitting(true);
    try {
      // Create the corresponding reservation based on quote type
      if (quote.quote_type === 'ticket' && quote.origin && quote.destination && quote.airline && quote.flight_date) {
        await createTicket.mutateAsync({
          client_id: quote.client_id,
          origin: quote.origin,
          destination: quote.destination,
          airline: quote.airline,
          flight_date: quote.flight_date,
          return_date: quote.return_date,
          passengers: quote.passengers || 1,
          miles_used: quote.miles_estimate,
          tax_brl: quote.tax_estimate,
          total_cost_brl: quote.cost_estimate,
          sale_price: quote.sale_price,
          status: 'pending',
          one_way: quote.one_way || false,
          miles_program: quote.miles_program,
        });
      } else if (quote.quote_type === 'hotel' && quote.hotel_name && quote.city && quote.check_in && quote.check_out) {
        await createHotel.mutateAsync({
          client_id: quote.client_id,
          hotel_name: quote.hotel_name,
          city: quote.city,
          check_in: quote.check_in,
          check_out: quote.check_out,
          nights: quote.nights || 1,
          rooms: quote.rooms || 1,
          miles_used: quote.miles_estimate,
          tax_brl: quote.tax_estimate,
          total_cost_brl: quote.cost_estimate,
          sale_price: quote.sale_price,
          status: 'confirmed',
          hotel_program: quote.hotel_program,
          miles_program: quote.miles_program,
        });
      } else if (quote.quote_type === 'car' && quote.rental_company && quote.pickup_location && quote.dropoff_location && quote.pickup_date && quote.dropoff_date) {
        await createCar.mutateAsync({
          client_id: quote.client_id,
          rental_company: quote.rental_company,
          pickup_location: quote.pickup_location,
          dropoff_location: quote.dropoff_location,
          pickup_date: quote.pickup_date,
          dropoff_date: quote.dropoff_date,
          days: quote.days || 1,
          vehicle_category: quote.vehicle_category || 'economy',
          miles_used: quote.miles_estimate,
          tax_brl: quote.tax_estimate,
          total_cost_brl: quote.cost_estimate,
          sale_price: quote.sale_price,
          status: 'confirmed',
          miles_program: quote.miles_program,
        });
      }

      // Update quote status to converted
      await updateQuote.mutateAsync({
        id: convertId,
        status: 'converted',
        converted_at: new Date().toISOString(),
      });

      toast.success('Orçamento convertido em reserva com sucesso!');
      setConvertId(null);
    } catch (error) {
      logger.error('Error converting quote:', error);
      toast.error('Erro ao converter orçamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Número', 'Cliente', 'Tipo', 'Programa', 'Milhas', 'Taxas', 'Custo', 'Valor Venda', 'Status', 'Válido até', 'Criado em'];
    const rows = filteredQuotes.map((q) => [
      q.quote_number,
      q.client?.name || '',
      QUOTE_TYPES.find(t => t.value === q.quote_type)?.label || q.quote_type,
      q.miles_program || '',
      q.miles_estimate,
      q.tax_estimate.toFixed(2).replace('.', ','),
      q.cost_estimate.toFixed(2).replace('.', ','),
      q.sale_price.toFixed(2).replace('.', ','),
      STATUS_OPTIONS.find(s => s.value === q.status)?.label || q.status,
      q.valid_until ? format(new Date(q.valid_until), 'dd/MM/yyyy') : '',
      format(new Date(q.created_at), 'dd/MM/yyyy'),
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orcamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge variant={statusConfig?.color || 'secondary'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = QUOTE_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || FileQuestion;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <DashboardLayout title="Orçamentos">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<FileQuestion className="h-5 w-5" />}
          title="Orçamentos"
          subtitle="Propostas comerciais enviadas aos clientes"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Orçamentos"
            value={quotes.length}
            icon={<FileQuestion className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="warning"
            label="Pendentes"
            value={pendingCount}
            icon={<Clock className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="success"
            label="Convertidos"
            value={convertedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="violet"
            label="Valor Total"
            value={formatCurrency(totalSalesEstimate)}
            icon={<Package className="h-5 w-5" />}
          />
        </div>

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {QUOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-[100px] sm:w-[130px] h-8 text-xs"
                placeholder="Data início"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-[100px] sm:w-[130px] h-8 text-xs"
                placeholder="Data fim"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
            <div className="ml-auto">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToCSV}>
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Quotes Table */}
        <DataTable<TravelQuote & Record<string, unknown>>
          title="Orçamentos"
          countLabel={`${filteredQuotes.length} ${filteredQuotes.length === 1 ? 'orçamento' : 'orçamentos'}`}
          rows={isLoading ? [] : (filteredQuotes as Array<TravelQuote & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar número, cliente, descrição, programa…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          }
          emptyState={
            isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Carregando…</span>
              </div>
            ) : (
              <EmptyState
                compact
                icon={FileQuestion}
                title={hasActiveFilters || searchText ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outros orçamentos.'
                    : 'Registre seu primeiro orçamento para começar.'
                }
              />
            )
          }
          columns={[
            {
              key: 'quote_number',
              header: 'Número',
              sortable: true,
              render: (row) => <span className="font-medium">{row.quote_number}</span>,
            },
            {
              key: 'client_name',
              header: 'Cliente',
              sortable: true,
              render: (row) => row.client?.name || '-',
            },
            {
              key: 'quote_type',
              header: 'Tipo',
              sortable: true,
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(row.quote_type)}
                  <span className="text-xs">{QUOTE_TYPES.find(t => t.value === row.quote_type)?.label}</span>
                </div>
              ),
            },
            {
              key: 'description',
              header: 'Descrição',
              render: (row) => <span className="max-w-[200px] truncate inline-block">{row.description || '-'}</span>,
            },
            {
              key: 'miles_program',
              header: 'Programa',
              sortable: true,
              render: (row) =>
                row.miles_program ? (
                  <div className="flex items-center gap-1">
                    <ProgramLogo program={row.miles_program} size="sm" />
                    <span className="text-xs">{row.miles_program}</span>
                  </div>
                ) : (
                  '-'
                ),
            },
            {
              key: 'miles_estimate',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => formatNumber(row.miles_estimate),
            },
            {
              key: 'sale_price',
              header: 'Valor Venda',
              numeric: true,
              sortable: true,
              render: (row) => <span className="font-medium">{formatCurrency(row.sale_price)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => getStatusBadge(row.status),
            },
            {
              key: 'valid_until',
              header: 'Válido até',
              sortable: true,
              render: (row) => (row.valid_until ? formatDate(row.valid_until) : '-'),
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              render: (row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    onClick={() => {
                      const client = clients.find(c => c.id === row.client_id);
                      if (client) {
                        generateQuotePDF(row, client, agencySettings);
                        toast.success('PDF do orçamento gerado com sucesso!');
                      }
                    }}
                    title="Gerar PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(row)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(row)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {row.status === 'pending' && (
                        <DropdownMenuItem onClick={() => handleQuickStatusUpdate(row.id, 'sent')}>
                          <Send className="h-4 w-4 mr-2" />
                          Marcar como Enviado
                        </DropdownMenuItem>
                      )}
                      {(row.status === 'pending' || row.status === 'sent') && (
                        <DropdownMenuItem onClick={() => handleQuickStatusUpdate(row.id, 'approved')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Marcar como Aprovado
                        </DropdownMenuItem>
                      )}
                      {row.status !== 'rejected' && row.status !== 'converted' && (
                        <DropdownMenuItem onClick={() => handleQuickStatusUpdate(row.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Marcar como Rejeitado
                        </DropdownMenuItem>
                      )}
                      {(row.status === 'approved' || row.status === 'pending' || row.status === 'sent') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setConvertId(row.id)} className="text-success">
                            <ArrowRightCircle className="h-4 w-4 mr-2" />
                            Converter em Reserva
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ] satisfies DataTableColumn<TravelQuote & Record<string, unknown>>[]}
        />
      </div>

      <OrcamentoFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        editing={editing}
        duplicateOf={duplicateOf}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Orçamento"
        description="Tem certeza que deseja excluir este orçamento?"
      />

      {/* Convert Confirmation Dialog */}
      <Dialog open={!!convertId} onOpenChange={() => setConvertId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Reserva</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja converter este orçamento em uma reserva?
            O orçamento será marcado como "Convertido" e uma nova reserva será criada.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConvertId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConvert} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Converter em Reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
