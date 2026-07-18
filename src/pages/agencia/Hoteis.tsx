import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Building2, Calendar, Trash2, Loader2, FileText, Wallet, AlertTriangle, Download, Pencil, Filter, X, PiggyBank, CheckCircle2 } from 'lucide-react';
import { useTravelHotelReservations, useCreateTravelHotelReservation, useDeleteTravelHotelReservation, useUpdateTravelHotelReservation, TravelHotelReservation, useAgencySettings } from '@/hooks/travel';
import { useHolders, useOperations } from '@/hooks/useOperations';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { generateHotelInvoice } from '@/lib/invoiceGenerator';
import { preloadPDFLibraries } from '@/lib/pdfLoader';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HotelFormDialog, type HotelFormValues } from '@/components/agencia/HotelFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Hoteis() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  useEffect(() => { preloadPDFLibraries(); }, []);
  const { user } = useAuth();
  const { holders } = useHolders();
  const { data: reservations = [], isLoading } = useTravelHotelReservations();
  const createReservation = useCreateTravelHotelReservation();
  const deleteReservation = useDeleteTravelHotelReservation();
  const updateReservation = useUpdateTravelHotelReservation();
  const { getBalanceByProgram } = useProgramBalances();
  const { data: agencySettings } = useAgencySettings();
  const { createOperation } = useOperations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelHotelReservation | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return reservations.filter((r) => {
      if (filterHolder !== 'all' && r.holder_id !== filterHolder) return false;
      if (filterProgram !== 'all' && r.miles_program !== filterProgram) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterDateFrom && r.check_in < filterDateFrom) return false;
      if (filterDateTo && r.check_in > filterDateTo) return false;
      if (q) {
        const hay = `${r.holder_name || ''} ${r.hotel_name} ${r.city} ${r.miles_program || ''} ${r.confirmation_number || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reservations, filterHolder, filterProgram, filterStatus, filterDateFrom, filterDateTo, searchText]);

  // Totals from filtered data
  const totalMilesUsed = filteredReservations.reduce((sum, r) => sum + r.miles_used, 0);
  const totalCost = filteredReservations.reduce((sum, r) => sum + r.total_cost_brl, 0);
  const totalCashPrice = filteredReservations.reduce((sum, r) => sum + (r.cash_price || 0), 0);
  const totalSavings = totalCashPrice - totalCost;
  const totalNights = filteredReservations.reduce((sum, r) => sum + r.nights, 0);

  // Unique programs for filter
  const uniquePrograms = useMemo(() => {
    const programs = new Set(reservations.map(r => r.miles_program).filter(Boolean));
    return Array.from(programs) as string[];
  }, [reservations]);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterProgram('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterProgram !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (reservation: TravelHotelReservation) => {
    setEditing(reservation);
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

  const handleSubmit = async (values: HotelFormValues) => {
    // Validation: check balance if program selected and status is confirmed (only for new reservations)
    const shouldDeductNow = values.status === 'confirmed';
    if (!editing && shouldDeductNow && values.miles_program) {
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
        await updateReservation.mutateAsync({
          id: editing.id,
          ...values,
        });
      } else {
        await createReservation.mutateAsync({
          ...values,
          sale_price: 0,
        });

        // Deduct miles via resgate operation ONLY if confirmed. Route
        // through useOperations.createOperation so the TIER-02 Free quota
        // check, the toast, and every downstream cache invalidation
        // (operations / operations_infinite / program_balances /
        // monthly_operations_count) fires the same way the manual operation
        // forms do.
        if (shouldDeductNow && values.miles_program && values.miles_used > 0 && user?.id) {
          await createOperation.mutateAsync({
            program: values.miles_program,
            type: 'resgate',
            quantity: values.miles_used,
            status: 'confirmado',
            date: values.check_in,
            notes: `Reserva de hotel: ${values.hotel_name} - ${values.city}`,
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving reservation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReservation = async (reservation: TravelHotelReservation) => {
    if (!user?.id) return;

    // Check balance before confirming
    const programBalance = reservation.miles_program ? getBalanceByProgram(reservation.miles_program) : undefined;
    const balance = programBalance?.balance || 0;

    if (reservation.miles_program && reservation.miles_used > balance) {
      toast.error(`Saldo insuficiente em ${reservation.miles_program}. Disponível: ${formatNumber(balance)} milhas`);
      return;
    }

    setConfirmingId(reservation.id);

    try {
      await updateReservation.mutateAsync({
        id: reservation.id,
        status: 'confirmed',
      });

      if (reservation.miles_program && reservation.miles_used > 0) {
        await createOperation.mutateAsync({
          program: reservation.miles_program,
          type: 'resgate',
          quantity: reservation.miles_used,
          status: 'confirmado',
          date: reservation.check_in,
          notes: `Reserva de hotel confirmada: ${reservation.hotel_name} - ${reservation.city}`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      toast.success('Reserva confirmada e milhas descontadas!');
    } catch (error) {
      logger.error('Error confirming reservation:', error);
      toast.error('Erro ao confirmar reserva');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteReservation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Cliente', 'Hotel', 'Cidade', 'Check-in', 'Check-out', 'Diárias', 'Quartos', 'Programa', 'Milhas', 'Taxas', 'Custo Total', 'Preço Dinheiro', 'Economia', 'Status', 'Confirmação'];
    const rows = filteredReservations.map((r) => [
      r.client?.name || '',
      r.hotel_name,
      r.city,
      format(new Date(r.check_in), 'dd/MM/yyyy'),
      format(new Date(r.check_out), 'dd/MM/yyyy'),
      r.nights,
      r.rooms,
      r.miles_program || '',
      r.miles_used,
      r.tax_brl.toFixed(2).replace('.', ','),
      r.total_cost_brl.toFixed(2).replace('.', ','),
      (r.cash_price || 0).toFixed(2).replace('.', ','),
      ((r.cash_price || 0) - r.total_cost_brl).toFixed(2).replace('.', ','),
      r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendente' : 'Cancelado',
      r.confirmation_number || '',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hoteis_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <DashboardLayout title="Reservas de Hotel">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Building2 className="h-5 w-5" />}
          title="Reservas de Hotel"
          subtitle="Gestão de reservas hoteleiras"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Reservas"
            value={filteredReservations.length}
            icon={<Building2 className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Total Diárias"
            value={totalNights}
            icon={<Calendar className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Milhas Utilizadas"
            value={formatNumber(totalMilesUsed)}
            icon={<Building2 className="h-5 w-5 text-primary" />}
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
                {holders.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProgram} onValueChange={setFilterProgram}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs">
                <SelectValue placeholder="Programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Programas</SelectItem>
                {uniquePrograms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
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
              placeholder="De"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-[100px] sm:w-[130px] h-8 text-xs"
              placeholder="Até"
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

        {/* Reservations Table */}
        <DataTable<TravelHotelReservation & Record<string, unknown>>
          title="Reservas de Hotel"
          countLabel={`${filteredReservations.length} ${filteredReservations.length === 1 ? 'reserva' : 'reservas'}`}
          rows={isLoading ? [] : (filteredReservations as Array<TravelHotelReservation & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, hotel, cidade, programa…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reserva
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
                icon={Building2}
                title={hasActiveFilters || searchText ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva cadastrada'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outras reservas.'
                    : 'Registre sua primeira reserva de hotel para começar.'
                }
              />
            )
          }
          columns={[
            {
              key: 'holder_name',
              header: 'Titular',
              sortable: true,
              render: (row) => {
                const holderName = row.holder_name || holders.find(h => h.id === row.holder_id)?.name || '-';
                return <span className="font-medium">{holderName}</span>;
              },
            },
            {
              key: 'hotel_name',
              header: 'Hotel',
              sortable: true,
              render: (row) => (
                <div>
                  <div>{row.hotel_name}</div>
                  <div className="text-xs text-muted-foreground">{row.city}</div>
                </div>
              ),
            },
            {
              key: 'miles_program',
              header: 'Programa',
              sortable: true,
              render: (row) =>
                row.miles_program ? (
                  <div className="flex items-center gap-1.5">
                    <ProgramLogo program={row.miles_program} size="sm" />
                    <span className="text-xs">{row.miles_program}</span>
                  </div>
                ) : (
                  '-'
                ),
            },
            {
              key: 'check_in',
              header: 'Check-in',
              sortable: true,
              render: (row) => formatDate(row.check_in),
            },
            { key: 'nights', header: 'Diárias', numeric: true, sortable: true },
            {
              key: 'miles_used',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => <span className="font-medium">{formatNumber(row.miles_used)}</span>,
            },
            {
              key: 'total_cost_brl',
              header: 'Custo',
              numeric: true,
              sortable: true,
              render: (row) => formatCurrency(row.total_cost_brl),
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
              width: '160px',
              render: (row) => {
                const holderName = row.holder_name || holders.find(h => h.id === row.holder_id)?.name || '-';
                return (
                  <div className="flex items-center justify-end gap-1">
                    {row.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:text-success hover:bg-success"
                        onClick={() => handleConfirmReservation(row)}
                        disabled={confirmingId === row.id}
                        title="Confirmar e descontar milhas"
                      >
                        {confirmingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(row)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => generateHotelInvoice(row, { name: holderName, cpf: '', email: '' }, agencySettings)}
                      title="Gerar Fatura PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(row.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            },
          ] satisfies DataTableColumn<TravelHotelReservation & Record<string, unknown>>[]}
        />
      </div>

      <HotelFormDialog
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
        title="Excluir Reserva"
        description="Tem certeza que deseja excluir esta reserva? As milhas serão reembolsadas ao saldo do programa."
      />
    </DashboardLayout>
  );
}
