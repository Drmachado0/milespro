import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Landmark, Trash2, Loader2, Wallet, Download, Pencil, Filter, X, Users, MapPin, AlertTriangle, PiggyBank } from 'lucide-react';
import { useTravelAttractions, useCreateTravelAttraction, useDeleteTravelAttraction, useUpdateTravelAttraction, TravelAttraction } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format } from 'date-fns';
import { AtracaoFormDialog, type AtracaoFormValues } from '@/components/agencia/AtracaoFormDialog';
import { KPICard, DataTable, type DataTableColumn } from '@/components/milespro';
import { logger } from '@/lib/logger';

export default function Atracoes() {
  const { formatCurrency } = useLocalization();
  const { data: attractions = [], isLoading } = useTravelAttractions();
  const createAttraction = useCreateTravelAttraction();
  const deleteAttraction = useDeleteTravelAttraction();
  const updateAttraction = useUpdateTravelAttraction();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<TravelAttraction | null>(null);

  // Filters
  const [filterHolder, setFilterHolder] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Get unique holders from attractions for filter
  const uniqueHolders = useMemo(() => {
    const holders = new Map<string, string>();
    attractions.forEach(a => {
      if (a.holder_id && a.holder_name) {
        holders.set(a.holder_id, a.holder_name);
      }
    });
    return Array.from(holders.entries()).map(([id, name]) => ({ id, name }));
  }, [attractions]);

  // Filtered attractions
  const filteredAttractions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return attractions.filter((a) => {
      if (filterHolder !== 'all' && a.holder_id !== filterHolder) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterDateFrom && a.activity_date < filterDateFrom) return false;
      if (filterDateTo && a.activity_date > filterDateTo) return false;
      if (q) {
        const hay = `${a.holder_name || ''} ${a.attraction_name} ${a.city} ${a.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attractions, filterHolder, filterStatus, filterDateFrom, filterDateTo, searchText]);

  // Totals
  const totalCost = filteredAttractions.reduce((sum, a) => sum + a.cost_brl, 0);
  const totalCashPrice = filteredAttractions.reduce((sum, a) => sum + (a.cash_price || 0), 0);
  const totalSavings = totalCashPrice - totalCost;
  const totalParticipants = filteredAttractions.reduce((sum, a) => sum + a.participants, 0);

  const clearFilters = () => {
    setFilterHolder('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = filterHolder !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const handleEdit = (attraction: TravelAttraction) => {
    setEditing(attraction);
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

  const handleSubmit = async (values: AtracaoFormValues) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateAttraction.mutateAsync({ id: editing.id, ...values });
      } else {
        await createAttraction.mutateAsync({ ...values, sale_price: 0 });
      }
      setIsDialogOpen(false);
      setEditing(null);
    } catch (error) {
      logger.error('Error saving attraction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAttraction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Titular', 'Atração', 'Tipo', 'Cidade', 'País', 'Data', 'Participantes', 'Fornecedor', 'Custo', 'Preço Dinheiro', 'Economia', 'Status'];
    const rows = filteredAttractions.map((a) => [
      a.holder_name || '',
      a.attraction_name,
      a.attraction_type,
      a.city,
      a.country,
      format(new Date(a.activity_date), 'dd/MM/yyyy'),
      a.participants,
      a.provider || '',
      a.cost_brl.toFixed(2).replace('.', ','),
      (a.cash_price || 0).toFixed(2).replace('.', ','),
      ((a.cash_price || 0) - a.cost_brl).toFixed(2).replace('.', ','),
      a.status === 'confirmed' ? 'Confirmado' : a.status === 'pending' ? 'Pendente' : 'Cancelado',
    ]);

    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `atracoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  return (
    <DashboardLayout title="Atrações Turísticas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<Landmark className="h-5 w-5" />}
          title="Atrações Turísticas"
          subtitle="Tours, passeios e ingressos para clientes"
        />
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            size="xs"
            accent="default"
            label="Total Atrações"
            value={filteredAttractions.length}
            icon={<Landmark className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="xs"
            accent="info"
            label="Participantes"
            value={totalParticipants}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            size="xs"
            accent="default"
            label="Total Custo"
            value={formatCurrency(totalCost)}
            icon={<Wallet className="h-5 w-5 text-primary" />}
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
              <SelectTrigger className="w-[150px] h-8 text-xs">
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
              <SelectTrigger className="w-[130px] h-8 text-xs">
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
              className="w-[130px] h-8 text-xs"
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-[130px] h-8 text-xs"
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
        <DataTable<TravelAttraction & Record<string, unknown>>
          title="Atrações Turísticas"
          countLabel={`${filteredAttractions.length} ${filteredAttractions.length === 1 ? 'atração' : 'atrações'}`}
          rows={isLoading ? [] : (filteredAttractions as Array<TravelAttraction & Record<string, unknown>>)}
          rowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar atração, titular, cidade…"
          onSearch={setSearchText}
          toolbarRight={
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atração
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
                icon={MapPin}
                title={hasActiveFilters || searchText ? 'Nenhuma atração encontrada' : 'Nenhuma atração cadastrada'}
                description={
                  hasActiveFilters || searchText
                    ? 'Ajuste os filtros para ver outras atrações.'
                    : 'Cadastre sua primeira atração turística para começar.'
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
              key: 'attraction_name',
              header: 'Atração',
              sortable: true,
              render: (row) => (
                <div>
                  <div>{row.attraction_name}</div>
                  <Badge variant="outline" className="text-xs">{row.attraction_type}</Badge>
                </div>
              ),
            },
            {
              key: 'city',
              header: 'Local',
              sortable: true,
              render: (row) => (
                <div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{row.city}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{row.country}</div>
                </div>
              ),
            },
            {
              key: 'activity_date',
              header: 'Data',
              sortable: true,
              render: (row) => format(new Date(row.activity_date), 'dd/MM/yyyy'),
            },
            {
              key: 'participants',
              header: 'Part.',
              numeric: true,
              sortable: true,
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
                const s = (row.cash_price || 0) - row.cost_brl;
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
          ] satisfies DataTableColumn<TravelAttraction & Record<string, unknown>>[]}
        />
      </div>

      <AtracaoFormDialog
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
        title="Excluir Atração"
        description="Tem certeza que deseja excluir esta atração turística?"
      />
    </DashboardLayout>
  );
}
