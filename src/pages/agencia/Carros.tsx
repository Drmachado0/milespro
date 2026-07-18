import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Car, Calendar, ArrowRight, Trash2, Loader2, FileText, Wallet, AlertTriangle, Download, Pencil, Filter, X, PiggyBank, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTravelCarRentals, useCreateTravelCarRental, useDeleteTravelCarRental, useUpdateTravelCarRental, TravelCarRental, useAgencySettings } from '@/hooks/travel';
import { useHolders, useOperations } from '@/hooks/useOperations';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { generateCarInvoice } from '@/lib/invoiceGenerator';
import { preloadPDFLibraries } from '@/lib/pdfLoader';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { ProgramLogo } from '@/components/ui/program-logo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CarroFormDialog, type CarroFormValues } from '@/components/agencia/CarroFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Carros() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  // Preload PDF libraries for instant invoice generation
  useEffect(() => { preloadPDFLibraries(); }, []);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { createOperation } = useOperations();
  const { holders } = useHolders();
  const { data: rentals = [], isLoading } = useTravelCarRentals();
  const createRental = useCreateTravelCarRental();
  const deleteRental = useDeleteTravelCarRental();
  const updateRental = useUpdateTravelCarRental();
  const { getBalanceByProgram } = useProgramBalances();
  const { data: agencySettings } = useAgencySettings();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelCarRental | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Filtered rentals
  const filteredRentals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rentals.filter((r) => {
      if (filterHolder !== 'all' && r.holder_id !== filterHolder) return false;
      if (filterCompany !== 'all' && r.rental_company !== filterCompany) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterDateFrom && r.pickup_date < filterDateFrom) return false;
      if (filterDateTo && r.pickup_date > filterDateTo) return false;
      if (q) {
        const hay = `${r.holder_name || ''} ${r.rental_company} ${r.pickup_location} ${r.dropoff_location} ${r.vehicle_category} ${r.miles_program || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rentals, filterHolder, filterCompany, filterStatus, filterDateFrom, filterDateTo, searchText]);

  // Totals from filtered data
  const totalMilesUsed = filteredRentals.reduce((sum, r) => sum + r.miles_used, 0);
  const totalCost = filteredRentals.reduce((sum, r) => sum + r.total_cost_brl, 0);
  const totalCashPrice = filteredRentals.reduce((sum, r) => sum + (r.cash_price || 0), 0);
  const totalSavings = totalCashPrice - totalCost;
  const totalDays = filteredRentals.reduce((sum, r) => sum + r.days, 0);

  // Unique companies for filter
  const uniqueCompanies = useMemo(() => {
    const companies = new Set(rentals.map(r => r.rental_company));
    return Array.from(companies);
  }, [rentals]);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterCompany('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterCompany !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (rental: TravelCarRental) => {
    setEditing(rental);
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

  const handleSubmit = async (values: CarroFormValues) => {
    const shouldDeductNow = values.status === 'confirmed';

    if (!editing && shouldDeductNow && values.miles_program && values.miles_used > 0) {
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
        await updateRental.mutateAsync({ id: editing.id, ...values });
      } else {
        await createRental.mutateAsync({ ...values, sale_price: 0 });

        if (shouldDeductNow && values.miles_program && values.miles_used > 0 && user?.id) {
          // Route through useOperations.createOperation so TIER-02 quota,
          // toast, and full cache invalidation (operations / infinite /
          // program_balances / monthly_count) fire — same rationale as the
          // Passagens/Hoteis/Cruzeiros refactor in commit 90a503e.
          await createOperation.mutateAsync({
            program: values.miles_program,
            type: 'resgate',
            quantity: values.miles_used,
            status: 'confirmado',
            date: values.pickup_date,
            notes: `Aluguel de carro: ${values.rental_company} - ${values.pickup_location} → ${values.dropoff_location}`,
            total_cost: 0,
            cost_per_thousand: 0,
          });
        }
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving rental:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRental = async (rental: TravelCarRental) => {
    if (!user?.id) return;

    const programBalance = rental.miles_program ? getBalanceByProgram(rental.miles_program) : undefined;
    const balance = programBalance?.balance || 0;

    if (rental.miles_program && rental.miles_used > balance) {
      toast.error(`Saldo insuficiente em ${rental.miles_program}. Disponível: ${formatNumber(balance)} milhas`);
      return;
    }

    setConfirmingId(rental.id);

    try {
      await updateRental.mutateAsync({
        id: rental.id,
        status: 'confirmed',
      });

      if (rental.miles_program && rental.miles_used > 0) {
        await createOperation.mutateAsync({
          program: rental.miles_program,
          type: 'resgate',
          quantity: rental.miles_used,
          status: 'confirmado',
          date: rental.pickup_date,
          notes: `Aluguel de carro confirmado: ${rental.rental_company} - ${rental.pickup_location} → ${rental.dropoff_location}`,
          total_cost: 0,
          cost_per_thousand: 0,
        });
      }

      toast.success('Aluguel confirmado e milhas descontadas!');
    } catch (error) {
      logger.error('Error confirming rental:', error);
      toast.error('Erro ao confirmar aluguel');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteRental.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Locadora', 'Local Retirada', 'Local Devolução', 'Data Retirada', 'Data Devolução', 'Diárias', 'Categoria', 'Programa', 'Milhas', 'Taxas', 'Custo Total', 'Preço Dinheiro', 'Economia', 'Status'];
    const rows = filteredRentals.map((r) => [
      r.holder_name || holders.find(h => h.id === r.holder_id)?.name || '',
      r.rental_company,
      r.pickup_location,
      r.dropoff_location,
      format(new Date(r.pickup_date), 'dd/MM/yyyy'),
      format(new Date(r.dropoff_date), 'dd/MM/yyyy'),
      r.days,
      r.vehicle_category,
      r.miles_program || '',
      r.miles_used,
      r.tax_brl.toFixed(2).replace('.', ','),
      r.total_cost_brl.toFixed(2).replace('.', ','),
      (r.cash_price || 0).toFixed(2).replace('.', ','),
      ((r.cash_price || 0) - r.total_cost_brl).toFixed(2).replace('.', ','),
      r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendente' : 'Cancelado',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `carros_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <DashboardLayout title="Aluguel de Carros">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Car className="h-5 w-5" />}
          title="Aluguel de Carros"
          subtitle="Locações de veículos para clientes"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Aluguéis"
            value={filteredRentals.length}
            icon={<Car className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Total Diárias"
            value={totalDays}
            icon={<Calendar className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Milhas Utilizadas"
            value={formatNumber(totalMilesUsed)}
            icon={<Car className="h-5 w-5 text-primary" />}
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
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs">
                <SelectValue placeholder="Locadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Locadoras</SelectItem>
                {uniqueCompanies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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

        {/* Rentals Table */}
        <DataTable<TravelCarRental & Record<string, unknown>>
          title="Aluguéis de Carros"
          countLabel={`${filteredRentals.length} ${filteredRentals.length === 1 ? 'aluguel' : 'aluguéis'}`}
          rows={isLoading ? [] : (filteredRentals as Array<TravelCarRental & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, locadora, trecho, programa…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aluguel
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
                icon={Car}
                title={hasActiveFilters || searchText ? 'Nenhum aluguel encontrado' : 'Nenhum aluguel cadastrado'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outros aluguéis.'
                    : 'Registre seu primeiro aluguel de carro para começar.'
                }
              />
            )
          }
          columns={[
            {
              key: 'holder_name',
              header: 'Titular',
              sortable: true,
              render: (row) => (
                <span className="font-medium">
                  {row.holder_name || holders.find(h => h.id === row.holder_id)?.name || '-'}
                </span>
              ),
            },
            { key: 'rental_company', header: 'Locadora', sortable: true },
            {
              key: 'miles_program',
              header: 'Programa',
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
              key: 'trecho',
              header: 'Trecho',
              render: (row) => (
                <div className="flex items-center gap-1 text-xs">
                  <span>{row.pickup_location}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{row.dropoff_location}</span>
                </div>
              ),
            },
            {
              key: 'pickup_date',
              header: 'Data',
              sortable: true,
              render: (row) => formatDate(row.pickup_date),
            },
            { key: 'vehicle_category', header: 'Categoria', sortable: true },
            { key: 'days', header: 'Diárias', numeric: true, sortable: true },
            {
              key: 'miles_used',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => formatNumber(row.miles_used),
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
                        onClick={() => handleConfirmRental(row)}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(row)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => generateCarInvoice(row, { name: holderName, cpf: '', email: '' }, agencySettings)}
                      title="Gerar PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              },
            },
          ] satisfies DataTableColumn<TravelCarRental & Record<string, unknown>>[]}
        />
      </div>

      <CarroFormDialog
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
        title="Excluir Aluguel"
        description="Tem certeza que deseja excluir este aluguel? As milhas serão reembolsadas ao saldo do programa."
      />
    </DashboardLayout>
  );
}
