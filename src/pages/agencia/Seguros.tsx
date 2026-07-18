import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, ShieldCheck, Trash2, Loader2, Wallet, Download, Pencil, Filter, X, Users, Plane, CheckCircle2, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTravelInsurances, useCreateTravelInsurance, useDeleteTravelInsurance, useUpdateTravelInsurance, TravelInsurance } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useOperations } from '@/hooks/useOperations';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { SeguroFormDialog, type SeguroFormValues } from '@/components/agencia/SeguroFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Seguros() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { data: insurances = [], isLoading } = useTravelInsurances();
  const createInsurance = useCreateTravelInsurance();
  const deleteInsurance = useDeleteTravelInsurance();
  const updateInsurance = useUpdateTravelInsurance();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { createOperation } = useOperations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelInsurance | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Get unique holders from insurances for filter
  const uniqueHolders = useMemo(() => {
    const holders = new Map<string, string>();
    insurances.forEach(i => {
      if (i.holder_id && i.holder_name) {
        holders.set(i.holder_id, i.holder_name);
      }
    });
    return Array.from(holders.entries()).map(([id, name]) => ({ id, name }));
  }, [insurances]);

  // Filtered insurances
  const filteredInsurances = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return insurances.filter((i) => {
      if (filterHolder !== 'all' && i.holder_id !== filterHolder) return false;
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      if (filterDateFrom && i.start_date < filterDateFrom) return false;
      if (filterDateTo && i.start_date > filterDateTo) return false;
      if (q) {
        const hay = `${i.holder_name || ''} ${i.insurance_company} ${i.plan_name} ${i.destination} ${i.coverage_type} ${i.miles_program || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [insurances, filterHolder, filterStatus, filterDateFrom, filterDateTo, searchText]);

  // KPI Totals
  const totalCost = filteredInsurances.reduce((sum, i) => sum + i.cost_brl, 0);
  const totalMilesEarned = filteredInsurances.reduce((sum, i) => sum + (i.miles_earned || 0), 0);
  const totalMilesValue = filteredInsurances.reduce((sum, i) => {
    const earned = i.miles_earned || 0;
    const valuePerK = i.mile_value_per_thousand || 35;
    return sum + (earned / 1000) * valuePerK;
  }, 0);
  const totalTravelers = filteredInsurances.reduce((sum, i) => sum + i.travelers, 0);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (insurance: TravelInsurance) => {
    setEditing(insurance);
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

  // Credit miles to program balance. Routes through useOperations so
  // TIER-02 quota, toast, and full cache invalidation (operations /
  // operations_infinite / program_balances / monthly_count) fire —
  // same rationale as the Fase 4 refactor in 90a503e.
  const creditMilesToProgram = async (holderId: string, holderName: string, program: string, quantity: number) => {
    if (!user?.id || !program || quantity <= 0) return;

    await createOperation.mutateAsync({
      holder_id: holderId || undefined,
      holder_name: holderName || undefined,
      program: program,
      quantity: quantity,
      type: 'entrada_manual',
      status: 'confirmado',
      date: new Date().toISOString().split('T')[0],
      notes: 'Acúmulo via Seguro Viagem',
      total_cost: 0,
      cost_per_thousand: 0,
    });
  };

  const handleConfirmInsurance = async (insurance: TravelInsurance) => {
    if (!insurance.miles_program || !insurance.miles_earned || insurance.miles_earned <= 0) {
      toast.error('Seguro não possui programa ou milhas configuradas');
      return;
    }

    setIsConfirming(insurance.id);
    try {
      await updateInsurance.mutateAsync({
        id: insurance.id,
        status: 'active',
      });

      await creditMilesToProgram(
        insurance.holder_id || '',
        insurance.holder_name || '',
        insurance.miles_program,
        insurance.miles_earned
      );

      toast.success(`${formatNumber(insurance.miles_earned)} milhas creditadas em ${insurance.miles_program}!`);
    } catch (error) {
      logger.error('Error confirming insurance:', error);
      toast.error('Erro ao confirmar seguro');
    } finally {
      setIsConfirming(null);
    }
  };

  const handleSubmit = async (values: SeguroFormValues) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateInsurance.mutateAsync({
          id: editing.id,
          ...values,
        });
      } else {
        await createInsurance.mutateAsync({
          ...values,
          sale_price: 0,
        });

        if (values.status === 'active' && values.miles_program && values.miles_earned > 0) {
          await creditMilesToProgram(
            values.holder_id || '',
            values.holder_name || '',
            values.miles_program,
            values.miles_earned
          );
          toast.success(`${formatNumber(values.miles_earned)} milhas creditadas em ${values.miles_program}!`);
        }
      }

      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving insurance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInsurance.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Seguradora', 'Plano', 'Destino', 'Cobertura', 'Início', 'Fim', 'Dias', 'Viajantes', 'Custo', 'Programa', 'Milhas', 'Valor Milhas', 'Status'];
    const rows = filteredInsurances.map((i) => {
      const earned = i.miles_earned || 0;
      const valuePerK = i.mile_value_per_thousand || 35;
      const mValue = (earned / 1000) * valuePerK;
      return [
        i.holder_name || '',
        i.insurance_company,
        i.plan_name,
        i.destination,
        i.coverage_type,
        format(new Date(i.start_date), 'dd/MM/yyyy'),
        format(new Date(i.end_date), 'dd/MM/yyyy'),
        i.days,
        i.travelers,
        i.cost_brl.toFixed(2).replace('.', ','),
        i.miles_program || '',
        earned,
        mValue.toFixed(2).replace('.', ','),
        i.status === 'active' ? 'Ativo' : i.status === 'pending' ? 'Pendente' : i.status === 'expired' ? 'Expirado' : 'Cancelado',
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `seguros_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <DashboardLayout title="Seguros de Viagem">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Seguros de Viagem"
          subtitle="Apólices e coberturas para clientes em viagem"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Seguros"
            value={filteredInsurances.length}
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Viajantes"
            value={totalTravelers}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Total Investido"
            value={formatCurrency(totalCost)}
            icon={<Wallet className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="violet"
            label="Milhas Acumuladas"
            value={formatNumber(totalMilesEarned)}
            icon={<Plane className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="success"
            label="Valor das Milhas"
            value={<span className="text-success">{formatCurrency(totalMilesValue)}</span>}
            icon={<TrendingUp className="h-5 w-5" />}
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
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
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
        <DataTable<TravelInsurance & Record<string, unknown>>
          title="Seguros de Viagem"
          countLabel={`${filteredInsurances.length} ${filteredInsurances.length === 1 ? 'seguro' : 'seguros'}`}
          rows={isLoading ? [] : (filteredInsurances as Array<TravelInsurance & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar titular, seguradora, plano, destino…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Seguro
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
                icon={ShieldCheck}
                title={hasActiveFilters || searchText ? 'Nenhum seguro encontrado' : 'Nenhum seguro cadastrado'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outros seguros.'
                    : 'Registre seu primeiro seguro de viagem para começar.'
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
              key: 'insurance_company',
              header: 'Seguradora / Plano',
              sortable: true,
              render: (row) => (
                <div>
                  <div>{row.insurance_company}</div>
                  <div className="text-xs text-muted-foreground">{row.plan_name}</div>
                </div>
              ),
            },
            {
              key: 'destination',
              header: 'Destino',
              sortable: true,
              render: (row) => (
                <div>
                  <div>{row.destination}</div>
                  <Badge variant="outline" className="text-xs">{row.coverage_type}</Badge>
                </div>
              ),
            },
            {
              key: 'start_date',
              header: 'Período',
              sortable: true,
              render: (row) => (
                <div>
                  <div className="text-xs">{format(new Date(row.start_date), 'dd/MM/yyyy')}</div>
                  <div className="text-xs text-muted-foreground">→ {format(new Date(row.end_date), 'dd/MM/yyyy')}</div>
                  <div className="text-xs text-muted-foreground">{row.days} dias</div>
                </div>
              ),
            },
            {
              key: 'cost_brl',
              header: 'Custo',
              numeric: true,
              sortable: true,
              render: (row) => formatCurrency(row.cost_brl),
            },
            {
              key: 'miles_earned',
              header: 'Milhas',
              numeric: true,
              sortable: true,
              render: (row) => (
                <div>
                  <div>{formatNumber(row.miles_earned || 0)}</div>
                  {row.miles_program && (
                    <div className="text-xs text-muted-foreground">{row.miles_program}</div>
                  )}
                </div>
              ),
            },
            {
              key: 'miles_value',
              header: 'Valor',
              numeric: true,
              render: (row) => {
                const earned = row.miles_earned || 0;
                const valuePerK = row.mile_value_per_thousand || 35;
                const mValue = (earned / 1000) * valuePerK;
                return <span className="text-success font-medium">{formatCurrency(mValue)}</span>;
              },
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (row) => (
                <Badge
                  variant={
                    row.status === 'active'
                      ? 'default'
                      : row.status === 'pending'
                        ? 'secondary'
                        : row.status === 'expired'
                          ? 'outline'
                          : 'destructive'
                  }
                >
                  {row.status === 'active' ? 'Ativo' : row.status === 'pending' ? 'Pendente' : row.status === 'expired' ? 'Expirado' : 'Cancelado'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              render: (row) => (
                <div className="flex items-center gap-1">
                  {row.status === 'pending' && row.miles_program && (row.miles_earned || 0) > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success hover:text-success hover:bg-success"
                      onClick={() => handleConfirmInsurance(row)}
                      disabled={isConfirming === row.id}
                      title="Confirmar e creditar milhas"
                    >
                      {isConfirming === row.id ? (
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
          ] satisfies DataTableColumn<TravelInsurance & Record<string, unknown>>[]}
        />
      </div>

      <SeguroFormDialog
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
        title="Excluir Seguro"
        description="Tem certeza que deseja excluir este seguro viagem?"
      />
    </DashboardLayout>
  );
}
