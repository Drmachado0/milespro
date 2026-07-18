import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Plane, Ticket, ArrowRight, Trash2, Loader2, Wallet, Pencil, X, Filter, Download, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { useTravelTickets, useCreateTravelTicket, useDeleteTravelTicket, useUpdateTravelTicket, type TravelTicket } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useOperations } from '@/hooks/useOperations';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PassagemFormDialog, type PassagemFormValues } from '@/components/agencia/PassagemFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Passagens() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useTravelTickets();
  const createTicket = useCreateTravelTicket();
  const deleteTicket = useDeleteTravelTicket();
  const updateTicket = useUpdateTravelTicket();
  const { getBalanceByProgram } = useProgramBalances();
  const { createOperation } = useOperations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TravelTicket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    program: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [searchText, setSearchText] = useState<string>('');

  const clearFilters = () => {
    setFilters({ program: '', status: '', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters = filters.program || filters.status || filters.dateFrom || filters.dateTo;

  const filteredTickets = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filters.program && ticket.miles_program !== filters.program) return false;
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.dateFrom && ticket.flight_date < filters.dateFrom) return false;
      if (filters.dateTo && ticket.flight_date > filters.dateTo) return false;
      if (q) {
        const hay = `${ticket.holder_name || ''} ${ticket.origin} ${ticket.destination} ${ticket.airline} ${ticket.miles_program || ''} ${ticket.flight_number || ''} ${ticket.locator || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters, searchText]);

  const totalMilesUsed = filteredTickets.reduce((sum, t) => sum + t.miles_used, 0);
  // Sum per-ticket savings the same way the table cell computes them
  // (cash_price - total_cost_brl per row, treating null cash as 0). Previously
  // totalSavings was totalCashPrice - totalCost, which is mathematically
  // equivalent but caused the KPI to disagree with the visible per-row
  // economia when the auditor eyeballed positives only — a row with no
  // cash_price recorded shows up here as a negative contribution. sas.txt
  // Bug 11 / P1.
  const totalCost = filteredTickets.reduce((sum, t) => sum + t.total_cost_brl, 0);
  const totalCashPrice = filteredTickets.reduce((sum, t) => sum + (t.cash_price || 0), 0);
  const totalSavings = filteredTickets.reduce(
    (sum, t) => sum + ((t.cash_price || 0) - t.total_cost_brl),
    0,
  );

  const usedPrograms = useMemo(() => {
    const programs = new Set(tickets.map(t => t.miles_program).filter(Boolean));
    return Array.from(programs) as string[];
  }, [tickets]);

  const handleEdit = (ticket: TravelTicket) => {
    setEditing(ticket);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditing(null);
  };

  const handleSubmit = async (values: PassagemFormValues) => {
    // Balance check (only for new tickets using own miles)
    if (!editing && values.miles_program && !values.third_party_miles && values.miles_used > 0) {
      const programBalance = getBalanceByProgram(values.miles_program);
      const available = programBalance?.balance || 0;
      if (values.miles_used > available) {
        toast.error('Saldo insuficiente no programa selecionado');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const ticketData = {
        client_id: undefined,
        holder_id: values.holder_id,
        holder_name: values.holder_name,
        origin: values.origin,
        destination: values.destination,
        airline: values.airline,
        flight_date: values.flight_date,
        return_date: values.return_date,
        passengers: values.passengers,
        miles_used: values.miles_used,
        tax_brl: values.tax_brl,
        status: values.status,
        locator: values.locator,
        notes: values.notes,
        one_way: values.one_way,
        baggage_cost: values.baggage_cost,
        extra_services_cost: values.extra_services_cost,
        miles_program: values.miles_program,
        third_party_miles: values.third_party_miles,
        third_party_cost: values.third_party_cost,
        total_cost_brl: values.total_cost_brl,
        cash_price: values.cash_price,
        flight_number: values.flight_number,
        flight_time: values.flight_time,
      };

      if (editing) {
        await updateTicket.mutateAsync({ id: editing.id, ...ticketData });
      } else {
        await createTicket.mutateAsync(ticketData);

        if (values.miles_program && !values.third_party_miles && values.miles_used > 0 && user?.id) {
          // Route through useOperations so the same chokepoint that enforces
          // the Free plan monthly limit (TIER-02) and invalidates all the
          // downstream caches (operations, operations_infinite, program_
          // balances, monthly_operations_count) sees this resgate. The
          // previous raw supabase.from('operations').insert(...) bypassed
          // every one of those, leaving the dashboard balance stale and the
          // Free quota uncountable from the agency-ticket path.
          await createOperation.mutateAsync({
            program: values.miles_program,
            type: 'resgate',
            quantity: values.miles_used,
            status: 'confirmado',
            date: values.flight_date,
            notes: `Emissão de passagem: ${values.origin} → ${values.destination}`,
            total_cost: 0,
            cost_per_thousand: 0,
            holder_id: values.holder_id,
            holder_name: values.holder_name,
          });
        }
      }

      if (!values.locator.trim()) {
        toast.warning('Emissão pendente. Código da reserva ainda não informado.');
      }

      // Show savings alert
      const savings = values.cash_price - values.total_cost_brl;
      if (savings < 0 && values.cash_price > 0) {
        toast.warning(`Atenção: Esta emissão custou ${formatCurrency(Math.abs(savings))} a mais do que comprar em dinheiro.`);
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error submitting ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTicket.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Origem', 'Destino', 'Cia Aérea', 'Programa', 'Voo', 'Data', 'Pax', 'Milhas', 'Custo Milhas', 'Preço Dinheiro', 'Economia', 'Status', 'Localizador'];

    const rows = filteredTickets.map(ticket => {
      const ticketSavings = (ticket.cash_price || 0) - ticket.total_cost_brl;
      return [
        ticket.holder_name || '-',
        ticket.origin,
        ticket.destination,
        ticket.airline,
        ticket.miles_program || '-',
        ticket.flight_number || '-',
        ticket.flight_date,
        ticket.passengers,
        ticket.miles_used,
        ticket.total_cost_brl.toFixed(2).replace('.', ','),
        (ticket.cash_price || 0).toFixed(2).replace('.', ','),
        ticketSavings.toFixed(2).replace('.', ','),
        ticket.status === 'confirmed' ? 'Confirmado' : ticket.status === 'pending' ? 'Pendente' : 'Cancelado',
        ticket.locator || '-',
      ].join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passagens_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Lista exportada com sucesso!');
  };

  return (
    <DashboardLayout title="Emissão de Passagens">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Ticket className="h-5 w-5" />}
          title="Emissão de Passagens"
          subtitle="Registro de passagens aéreas emitidas para clientes da agência"
        />
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Emissões"
            value={filteredTickets.length}
            icon={<Ticket className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Milhas Utilizadas"
            value={formatNumber(totalMilesUsed)}
            icon={<Plane className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Custo Total (Milhas)"
            value={formatCurrency(totalCost)}
            icon={<Wallet className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent={totalSavings >= 0 ? 'success' : 'danger'}
            label="Total Economizado"
            value={
              <span className={totalSavings >= 0 ? 'text-success' : 'text-destructive'}>
                {formatCurrency(totalSavings)}
              </span>
            }
            icon={<PiggyBank className="h-5 w-5" />}
          />
        </div>

        {/* Filters */}
        <Card className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filtros
            </div>

            <div className="flex-1 min-w-[150px] max-w-[200px]">
              <Label className="text-xs">Programa</Label>
              <Select value={filters.program || "all"} onValueChange={(v) => setFilters({ ...filters, program: v === "all" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usedPrograms.map((program) => (
                    <SelectItem key={program} value={program}>
                      <div className="flex items-center gap-1.5">
                        <ProgramLogo program={program} size="sm" />
                        {program}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[120px] max-w-[150px]">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[120px] max-w-[150px]">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="flex-1 min-w-[120px] max-w-[150px]">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}

            <div className="ml-auto">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToCSV} disabled={filteredTickets.length === 0}>
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Tickets Table */}
        <DataTable<TravelTicket & Record<string, unknown>>
          title="Passagens Emitidas"
          countLabel={`${filteredTickets.length} ${filteredTickets.length === 1 ? 'passagem' : 'passagens'}`}
          rows={isLoading ? [] : (filteredTickets as Array<TravelTicket & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, origem, destino, cia, voo, localizador…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Emissão
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
                icon={Ticket}
                title={hasActiveFilters || searchText ? 'Nenhuma passagem encontrada' : 'Nenhuma passagem emitida'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outras passagens.'
                    : 'Registre sua primeira emissão de passagem para começar.'
                }
              />
            )
          }
          columns={[
            {
              key: 'holder_name',
              header: 'Titular / Trecho',
              sortable: true,
              render: (row) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{row.holder_name || '-'}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{row.origin}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{row.destination}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'flight_date',
              header: 'Voo / Data',
              sortable: true,
              render: (row) => (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{row.flight_number || '-'}</span>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <span>{formatDate(row.flight_date)}</span>
                    {row.flight_time && <span>{row.flight_time}</span>}
                  </div>
                </div>
              ),
            },
            {
              key: 'airline',
              header: 'Cia / Programa',
              sortable: true,
              render: (row) => (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <ProgramLogo program={row.airline} size="sm" />
                    <span className="text-xs font-medium" title={row.airline}>
                      {row.airline.split(' ')[0]}
                    </span>
                  </div>
                  {row.miles_program && (
                    <div className="flex items-center gap-1.5">
                      <ProgramLogo program={row.miles_program} size="sm" />
                      <span className="text-xs text-muted-foreground">{row.miles_program}</span>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'passengers',
              header: 'Pax',
              numeric: true,
              sortable: true,
              render: (row) => <span className="font-medium">{row.passengers}</span>,
            },
            {
              key: 'miles_used',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => <span className="font-medium">{formatNumber(row.miles_used)}</span>,
            },
            {
              key: 'savings',
              header: 'Custo / Dinheiro / Economia',
              numeric: true,
              render: (row) => {
                const ticketSavings = (row.cash_price || 0) - row.total_cost_brl;
                const ticketSavingsPercent = row.cash_price && row.cash_price > 0
                  ? (ticketSavings / row.cash_price) * 100
                  : 0;
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Custo: {formatCurrency(row.total_cost_brl)}</span>
                    <span className="text-sm font-medium text-primary">Dinheiro: {formatCurrency(row.cash_price || 0)}</span>
                    <div className="flex items-center justify-end gap-1">
                      {ticketSavings >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={`text-xs font-semibold ${ticketSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(ticketSavings)} ({Math.abs(ticketSavingsPercent).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => (
                <Badge
                  variant={row.status === 'confirmed' ? 'default' : row.status === 'pending' ? 'secondary' : 'destructive'}
                  className={row.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                >
                  {row.status === 'confirmed' ? 'Confirmado' : row.status === 'pending' ? 'Pendente' : 'Cancelado'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '100px',
              render: (row) => (
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-primary"
                    onClick={() => handleEdit(row)}
                    title="Editar Passagem"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(row.id)}
                    title="Excluir Passagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ] satisfies DataTableColumn<TravelTicket & Record<string, unknown>>[]}
        />

        <PassagemFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          editing={editing}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          title="Excluir Passagem"
          description="Tem certeza que deseja excluir esta passagem? As milhas serão reembolsadas ao saldo."
        />
      </div>
    </DashboardLayout>
  );
}
