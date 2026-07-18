import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Bus, Calendar, Trash2, Loader2, Wallet, Download, Pencil, Filter, X, Users, Clock, MapPin, Plane, AlertTriangle, PiggyBank } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTravelTransfers, useCreateTravelTransfer, useDeleteTravelTransfer, useUpdateTravelTransfer, type TravelTransfer } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { useProgramBalances } from '@/hooks/useProgramBalances';
import { format } from 'date-fns';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useAuth } from '@/hooks/useAuth';
import { useOperations } from '@/hooks/useOperations';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TransporteFormDialog, type TransporteFormValues } from '@/components/agencia/TransporteFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Transportes() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { createOperation } = useOperations();
  const { data: transfers = [], isLoading } = useTravelTransfers();
  const createTransfer = useCreateTravelTransfer();
  const deleteTransfer = useDeleteTravelTransfer();
  const updateTransfer = useUpdateTravelTransfer();
  const { getBalanceByProgram } = useProgramBalances();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelTransfer | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Get unique holders from transfers for filter
  const uniqueHolders = useMemo(() => {
    const holders = new Map<string, string>();
    transfers.forEach(t => {
      if (t.holder_id && t.holder_name) {
        holders.set(t.holder_id, t.holder_name);
      }
    });
    return Array.from(holders.entries()).map(([id, name]) => ({ id, name }));
  }, [transfers]);

  // Get unique programs for filter
  const usedPrograms = useMemo(() => {
    const programs = new Set(transfers.map(t => t.miles_program).filter(Boolean));
    return Array.from(programs) as string[];
  }, [transfers]);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return transfers.filter((t) => {
      if (filterHolder !== 'all' && t.holder_id !== filterHolder) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterProgram !== 'all' && t.miles_program !== filterProgram) return false;
      if (filterDateFrom && t.transfer_date < filterDateFrom) return false;
      if (filterDateTo && t.transfer_date > filterDateTo) return false;
      if (q) {
        const hay = `${t.holder_name || ''} ${t.transfer_type} ${t.origin} ${t.destination} ${t.vehicle_type} ${t.miles_program || ''} ${t.flight_number || ''} ${t.locator || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, filterHolder, filterStatus, filterProgram, filterDateFrom, filterDateTo, searchText]);

  // Totals
  const totalMilesUsed = filteredTransfers.reduce((sum, t) => sum + (t.miles_used || 0), 0);
  const totalCost = filteredTransfers.reduce((sum, t) => sum + (t.total_cost_brl || t.cost_brl || 0), 0);
  const totalCashPrice = filteredTransfers.reduce((sum, t) => sum + (t.cash_price || 0), 0);
  const totalSavings = totalCashPrice - totalCost;
  const totalPassengers = filteredTransfers.reduce((sum, t) => sum + t.passengers, 0);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterStatus('all');
    setFilterProgram('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterStatus !== 'all' || filterProgram !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (transfer: TravelTransfer) => {
    setEditing(transfer);
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

  const handleSubmit = async (values: TransporteFormValues) => {
    // Balance check (only for new transfers using own miles)
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
      const transferData: Omit<TravelTransfer, 'id' | 'user_id' | 'created_at' | 'client' | 'client_id'> = {
        holder_id: values.holder_id,
        holder_name: values.holder_name,
        transfer_type: values.transfer_type,
        origin: values.origin,
        destination: values.destination,
        transfer_date: values.transfer_date,
        transfer_time: values.transfer_time,
        passengers: values.passengers,
        vehicle_type: values.vehicle_type,
        status: values.status,
        provider: values.provider,
        flight_number: values.flight_number,
        notes: values.notes,
        miles_program: values.miles_program,
        miles_used: values.miles_used,
        third_party_miles: values.third_party_miles,
        third_party_cost: values.third_party_cost,
        tax_brl: values.tax_brl,
        total_cost_brl: values.total_cost_brl,
        cost_brl: values.cost_brl,
        cash_price: values.cash_price,
        locator: values.locator,
        sale_price: 0,
      };

      if (editing) {
        await updateTransfer.mutateAsync({ id: editing.id, ...transferData });
      } else {
        await createTransfer.mutateAsync(transferData);

        // Create redemption operation for mileage deduction
        if (values.miles_program && !values.third_party_miles && values.miles_used > 0 && user?.id) {
          // Same useOperations chokepoint pattern as Passagens/Hoteis/
          // Cruzeiros/Carros — TIER-02 quota + full cache invalidation.
          await createOperation.mutateAsync({
            program: values.miles_program,
            type: 'resgate',
            quantity: values.miles_used,
            status: 'confirmado',
            date: values.transfer_date,
            notes: `Transfer: ${values.origin} → ${values.destination}`,
            total_cost: 0,
            cost_per_thousand: 0,
            holder_id: values.holder_id,
            holder_name: values.holder_name,
          });
        }
      }

      if (!values.locator.trim()) {
        toast.warning('Transfer pendente. Código de confirmação ainda não informado.');
      }

      // Show savings alert
      const savings = values.cash_price - values.total_cost_brl;
      if (savings < 0 && values.cash_price > 0) {
        toast.warning(`Atenção: Este transfer custou ${formatCurrency(Math.abs(savings))} a mais do que em dinheiro.`);
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving transfer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransfer.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Tipo', 'Trajeto', 'Data', 'Passageiros', 'Programa', 'Milhas', 'Custo', 'Preço Dinheiro', 'Economia', 'Status', 'Localizador'];
    const rows = filteredTransfers.map((t) => {
      const transferSavings = (t.cash_price || 0) - (t.total_cost_brl || t.cost_brl || 0);
      return [
        t.holder_name || '',
        t.transfer_type,
        `${t.origin} → ${t.destination}`,
        format(new Date(t.transfer_date), 'dd/MM/yyyy'),
        t.passengers,
        t.miles_program || '-',
        t.miles_used || 0,
        (t.total_cost_brl || t.cost_brl || 0).toFixed(2).replace('.', ','),
        (t.cash_price || 0).toFixed(2).replace('.', ','),
        transferSavings.toFixed(2).replace('.', ','),
        t.status === 'confirmed' ? 'Confirmado' : t.status === 'pending' ? 'Pendente' : 'Cancelado',
        t.locator || '-',
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transportes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    toast.success('Lista exportada com sucesso!');
  };

  return (
    <DashboardLayout title="Transportes">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Bus className="h-5 w-5" />}
          title="Transportes"
          subtitle="Transfers, ônibus e transportes privativos"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Transfers"
            value={filteredTransfers.length}
            icon={<Bus className="h-5 w-5 text-primary" />}
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
            accent="info"
            label="Passageiros"
            value={totalPassengers}
            icon={<Users className="h-5 w-5" />}
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
            <Select value={filterProgram} onValueChange={setFilterProgram}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs">
                <SelectValue placeholder="Programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Programas</SelectItem>
                {usedPrograms.map((p) => (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-1.5">
                      <ProgramLogo program={p} size="sm" />
                      {p}
                    </div>
                  </SelectItem>
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
        <DataTable<TravelTransfer & Record<string, unknown>>
          title="Transportes"
          countLabel={`${filteredTransfers.length} ${filteredTransfers.length === 1 ? 'transfer' : 'transfers'}`}
          rows={isLoading ? [] : (filteredTransfers as Array<TravelTransfer & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, trajeto, voo, localizador…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Transfer
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
                icon={Bus}
                title={hasActiveFilters || searchText ? 'Nenhum transfer encontrado' : 'Nenhum transfer cadastrado'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outros transfers.'
                    : 'Registre seu primeiro transfer/transporte para começar.'
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
                <div>
                  <div className="font-medium">{row.holder_name}</div>
                  <Badge variant="outline" className="text-xs">{row.vehicle_type}</Badge>
                </div>
              ),
            },
            {
              key: 'origin',
              header: 'Trajeto',
              sortable: true,
              render: (row) => (
                <>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {row.origin}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    → {row.destination}
                  </div>
                  {row.flight_number && (
                    <div className="flex items-center gap-1 text-xs text-info">
                      <Plane className="h-3 w-3" />
                      {row.flight_number}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'transfer_date',
              header: 'Data',
              sortable: true,
              render: (row) => (
                <>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {format(new Date(row.transfer_date), 'dd/MM/yyyy')}
                  </div>
                  {row.transfer_time && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {row.transfer_time}
                    </div>
                  )}
                </>
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
                  <span className="text-xs text-muted-foreground">-</span>
                ),
            },
            {
              key: 'miles_used',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => (row.miles_used ? formatNumber(row.miles_used) : '-'),
            },
            {
              key: 'savings',
              header: 'Economia',
              numeric: true,
              render: (row) => {
                const cost = row.total_cost_brl || row.cost_brl || 0;
                const s = (row.cash_price || 0) - cost;
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
                <>
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
                  {row.locator && (
                    <div className="text-xs text-muted-foreground mt-1">{row.locator}</div>
                  )}
                </>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '80px',
              render: (row) => (
                <div className="flex items-center gap-1">
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
          ] satisfies DataTableColumn<TravelTransfer & Record<string, unknown>>[]}
        />
      </div>

      <TransporteFormDialog
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
        title="Excluir Transfer"
        description="Tem certeza que deseja excluir este transfer?"
      />
    </DashboardLayout>
  );
}
