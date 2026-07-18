import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Ship, Calendar, Trash2, Loader2, Wallet, Download, Pencil, Filter, X, Users, AlertTriangle, PiggyBank, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTravelCruises, useCreateTravelCruise, useDeleteTravelCruise, useUpdateTravelCruise, TravelCruise } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { useOperations } from '@/hooks/useOperations';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CruzeiroFormDialog, type CruzeiroFormValues } from '@/components/agencia/CruzeiroFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Cruzeiros() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { user } = useAuth();
  const { data: cruises = [], isLoading } = useTravelCruises();
  const createCruise = useCreateTravelCruise();
  const deleteCruise = useDeleteTravelCruise();
  const updateCruise = useUpdateTravelCruise();
  const { getBalanceByProgram } = useProgramBalances();
  const { createOperation } = useOperations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelCruise | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Get unique holders from cruises for filter
  const uniqueHolders = useMemo(() => {
    const holders = new Map<string, string>();
    cruises.forEach(c => {
      if (c.holder_id && c.holder_name) {
        holders.set(c.holder_id, c.holder_name);
      }
    });
    return Array.from(holders.entries()).map(([id, name]) => ({ id, name }));
  }, [cruises]);

  // Filtered cruises
  const filteredCruises = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return cruises.filter((c) => {
      if (filterHolder !== 'all' && c.holder_id !== filterHolder) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterDateFrom && c.departure_date < filterDateFrom) return false;
      if (filterDateTo && c.departure_date > filterDateTo) return false;
      if (q) {
        const hay = `${c.holder_name || ''} ${c.cruise_line} ${c.ship_name} ${c.departure_port} ${c.arrival_port} ${c.cabin_type} ${c.miles_program || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cruises, filterHolder, filterStatus, filterDateFrom, filterDateTo, searchText]);

  // Totals
  const totalMilesUsed = filteredCruises.reduce((sum, c) => sum + c.miles_used, 0);
  const totalCashPrice = filteredCruises.reduce((sum, c) => sum + (c.cash_price || 0), 0);
  const totalCost = filteredCruises.reduce((sum, c) => sum + c.total_cost_brl, 0);
  const totalSavings = totalCashPrice - totalCost;
  const totalNights = filteredCruises.reduce((sum, c) => sum + c.nights, 0);
  const totalPassengers = filteredCruises.reduce((sum, c) => sum + c.passengers, 0);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (cruise: TravelCruise) => {
    setEditing(cruise);
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

  const handleSubmit = async (values: CruzeiroFormValues) => {
    if (!editing && values.miles_program && values.miles_used > 0) {
      const programBalance = getBalanceByProgram(values.miles_program);
      const available = programBalance?.balance || 0;
      if (values.miles_used > available) {
        toast.error('Saldo insuficiente no programa selecionado');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editing) {
        await updateCruise.mutateAsync({ id: editing.id, ...values });
      } else {
        await createCruise.mutateAsync({ ...values, sale_price: 0 });

        if (values.status === 'confirmed' && values.miles_program && values.miles_used > 0 && user?.id) {
          // Same rationale as Passagens/Hoteis: useOperations centralizes
          // TIER-02 limit checking, toast, and cache invalidation across
          // operations / operations_infinite / program_balances /
          // monthly_operations_count.
          await createOperation.mutateAsync({
            program: values.miles_program,
            type: 'resgate',
            quantity: values.miles_used,
            status: 'confirmado',
            date: values.departure_date,
            notes: `Cruzeiro: ${values.cruise_line} - ${values.ship_name}`,
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving cruise:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCruise = async (cruise: TravelCruise) => {
    if (!cruise.miles_program || cruise.miles_used <= 0 || !user?.id) {
      toast.error('Cruzeiro sem programa de milhas ou quantidade inválida');
      return;
    }

    setConfirmingId(cruise.id);

    try {
      await updateCruise.mutateAsync({
        id: cruise.id,
        status: 'confirmed',
      });

      await createOperation.mutateAsync({
        program: cruise.miles_program,
        type: 'resgate',
        quantity: cruise.miles_used,
        status: 'confirmado',
        date: cruise.departure_date,
        notes: `Cruzeiro: ${cruise.cruise_line} - ${cruise.ship_name}`,
        total_cost: 0,
        cost_per_thousand: 0,
      });

      toast.success('Cruzeiro confirmado e milhas debitadas!');
    } catch (error) {
      logger.error('Error confirming cruise:', error);
      toast.error('Erro ao confirmar cruzeiro');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCruise.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Companhia', 'Navio', 'Cabine', 'Porto Embarque', 'Porto Desembarque', 'Embarque', 'Desembarque', 'Noites', 'Passageiros', 'Programa', 'Milhas', 'Taxas', 'Custo Total', 'Preço Dinheiro', 'Economia', 'Status'];
    const rows = filteredCruises.map((c) => [
      c.holder_name || '',
      c.cruise_line,
      c.ship_name,
      c.cabin_type,
      c.departure_port,
      c.arrival_port,
      format(new Date(c.departure_date), 'dd/MM/yyyy'),
      format(new Date(c.return_date), 'dd/MM/yyyy'),
      c.nights,
      c.passengers,
      c.miles_program || '',
      c.miles_used,
      c.tax_brl.toFixed(2).replace('.', ','),
      c.total_cost_brl.toFixed(2).replace('.', ','),
      (c.cash_price || 0).toFixed(2).replace('.', ','),
      ((c.cash_price || 0) - c.total_cost_brl).toFixed(2).replace('.', ','),
      c.status === 'confirmed' ? 'Confirmado' : c.status === 'pending' ? 'Pendente' : 'Cancelado',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cruzeiros_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <DashboardLayout title="Cruzeiros">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Ship className="h-5 w-5" />}
          title="Cruzeiros"
          subtitle="Reservas de cruzeiros marítimos"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Cruzeiros"
            value={filteredCruises.length}
            icon={<Ship className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Total Noites"
            value={totalNights}
            icon={<Calendar className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="violet"
            label="Passageiros"
            value={totalPassengers}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Milhas Utilizadas"
            value={formatNumber(totalMilesUsed)}
            icon={<Ship className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="violet"
            label="Preço Dinheiro"
            value={formatCurrency(totalCashPrice)}
            icon={<Wallet className="h-5 w-5" />}
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
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterHolder} onValueChange={setFilterHolder}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs">
                <SelectValue placeholder="Titular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Titulares</SelectItem>
                {uniqueHolders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-[100px] sm:w-[130px] h-8 text-xs"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-[100px] sm:w-[130px] h-8 text-xs"
            />
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

        {/* Table */}
        <DataTable<TravelCruise & Record<string, unknown>>
          title="Cruzeiros"
          countLabel={`${filteredCruises.length} ${filteredCruises.length === 1 ? 'cruzeiro' : 'cruzeiros'}`}
          rows={isLoading ? [] : (filteredCruises as Array<TravelCruise & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, companhia, navio, porto…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cruzeiro
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
                icon={Ship}
                title={hasActiveFilters || searchText ? 'Nenhum cruzeiro encontrado' : 'Nenhum cruzeiro cadastrado'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outros cruzeiros.'
                    : 'Registre seu primeiro cruzeiro para começar.'
                }
              />
            )
          }
          columns={[
            {
              key: 'holder_name',
              header: 'Titular',
              sortable: true,
              render: (row) => <span className="font-medium">{row.holder_name}</span>,
            },
            {
              key: 'cruise_line',
              header: 'Companhia / Navio',
              sortable: true,
              render: (row) => (
                <div>
                  <div>{row.cruise_line}</div>
                  <div className="text-xs text-muted-foreground">{row.ship_name}</div>
                </div>
              ),
            },
            { key: 'cabin_type', header: 'Cabine', sortable: true },
            {
              key: 'portos',
              header: 'Portos',
              render: (row) => (
                <div>
                  <div className="text-xs">{row.departure_port}</div>
                  <div className="text-xs text-muted-foreground">→ {row.arrival_port}</div>
                </div>
              ),
            },
            {
              key: 'departure_date',
              header: 'Embarque',
              sortable: true,
              render: (row) => format(new Date(row.departure_date), 'dd/MM/yyyy'),
            },
            { key: 'nights', header: 'Noites', numeric: true, sortable: true },
            {
              key: 'miles_used',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) =>
                row.miles_program ? (
                  <div className="flex items-center justify-end gap-1">
                    <ProgramLogo program={row.miles_program} size="xs" />
                    <span>{formatNumber(row.miles_used)}</span>
                  </div>
                ) : null,
            },
            {
              key: 'cash_price',
              header: 'Dinheiro',
              numeric: true,
              sortable: true,
              render: (row) => formatCurrency(row.cash_price || 0),
            },
            {
              key: 'savings',
              header: 'Economia',
              numeric: true,
              render: (row) => {
                const s = (row.cash_price || 0) - row.total_cost_brl;
                return (
                  <span className={`font-medium ${s >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(s)}
                    {s < 0 && <AlertTriangle className="h-3 w-3 ml-1 inline text-destructive" />}
                  </span>
                );
              },
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => (
                <Badge
                  variant={
                    row.status === 'confirmed'
                      ? 'default'
                      : row.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {row.status === 'confirmed' ? 'Confirmado' : row.status === 'pending' ? 'Pendente' : 'Cancelado'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              render: (row) => (
                <div className="flex items-center gap-1">
                  {row.status === 'pending' && row.miles_program && row.miles_used > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success hover:text-success hover:bg-success"
                      onClick={() => handleConfirmCruise(row)}
                      disabled={confirmingId === row.id}
                      title="Confirmar e debitar milhas"
                    >
                      {confirmingId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(row)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ),
            },
          ] satisfies DataTableColumn<TravelCruise & Record<string, unknown>>[]}
        />
      </div>

      <CruzeiroFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        editing={editing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Cruzeiro"
        description="Tem certeza que deseja excluir este cruzeiro? As milhas serão reembolsadas ao saldo do programa."
      />
    </DashboardLayout>
  );
}
