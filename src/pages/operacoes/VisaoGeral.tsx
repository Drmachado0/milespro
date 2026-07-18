import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useOperations, useHolders, useInfiniteOperations, type InfiniteOperationsFilters } from '@/hooks/useOperations';
import type { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/hooks/useLocalization';
import { useSubscription } from '@/hooks/useSubscription';
import { toTitleCase } from '@/lib/formatters';
import { HistoryLimitBanner } from '@/components/subscription/HistoryLimitBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ClipboardList, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight,
  Filter,
  Search,
  Calendar,
  X,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type OperationType = Database['public']['Enums']['operation_type'];
type OperationStatus = Database['public']['Enums']['operation_status'];
type CategoryFilter = 'all' | 'lancamentos' | 'estrategias';

// Define operation categories
const LANCAMENTOS_TYPES: readonly OperationType[] = ['compra', 'entrada_manual', 'venda', 'resgate'] as const;
const ESTRATEGIAS_TYPES: readonly OperationType[] = ['compra_turbinada', 'bumerangue', 'transferencia'] as const;

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra de Milhas',
  venda: 'Venda de Milhas',
  transferencia: 'Transferência',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
  compra_turbinada: 'Compra Turbinada',
  resgate: 'Passagem Emitida',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  confirmado: { label: 'Confirmado', variant: 'default' },
  pendente: { label: 'Pendente', variant: 'secondary' },
  recebido: { label: 'Recebido', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

const PROGRAMS = [
  'Livelo', 'Esfera', 'Átomos', 'Loop',
  'Smiles', 'TudoAzul', 'Latam', 'TAP', 'Ibéria',
  'MileagePlus', 'AAdvantage', 'Aeroplan', 'ConnectMiles',
  'Delta SkyMiles', 'Flying Blue', 'Miles & More', 'Iberia Plus',
  'SUMA', 'Qatar Privilege Club', 'Emirates Skywards', 'Etihad Guest', 'KrisFlyer'
];

type Operation = {
  id: string;
  type: string;
  program: string;
  quantity: number;
  total_cost: number | null;
  cost_per_thousand: number | null;
  holder_id: string | null;
  holder_name: string | null;
  bonus: number | null;
  installments: number | null;
  validity: string | null;
  notes: string | null;
  status: string;
  date: string;
  credit_card: string | null;
};

export default function VisaoGeral() {
  const { isFree, historyStartDate, limits } = useSubscription();
  const { updateOperation, deleteOperation } = useOperations();
  const { holders } = useHolders();
  const { formatCurrency, formatNumber, formatDate } = useLocalization();

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce search term to avoid a new server query on every keystroke
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  // Build server-side filters
  const infiniteFilters: InfiniteOperationsFilters = useMemo(() => ({
    applyHistoryFilter: isFree,
    historyStartDate,
    types:
      categoryFilter === 'lancamentos'
        ? [...LANCAMENTOS_TYPES]
        : categoryFilter === 'estrategias'
          ? [...ESTRATEGIAS_TYPES]
          : undefined,
    programs: programFilter !== 'all' ? [programFilter] : undefined,
    status: statusFilter !== 'all' ? (statusFilter as Database['public']['Enums']['operation_status']) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearchTerm.trim() || undefined,
  }), [isFree, historyStartDate, categoryFilter, programFilter, statusFilter, dateFrom, dateTo, debouncedSearchTerm]);

  const {
    data: infiniteData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOperations(infiniteFilters);

  // Flatten all pages into a single list; totalCount comes from the last page.
  const operations = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.rows) ?? [],
    [infiniteData],
  );
  const totalCount =
    infiniteData?.pages[infiniteData.pages.length - 1]?.totalCount ?? operations.length;

  // Auto-load more rows when the sentinel at the list end scrolls into view.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, operations.length]);

  // Edit/Delete states
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deletingOperation, setDeletingOperation] = useState<Operation | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: '',
    total_cost: '',
    bonus: '',
    notes: '',
    status: '',
    date: '',
    holder_id: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Operations already come filtered from the server. Keep the name for JSX
  // compatibility; these are *only* the rows fetched so far.
  const filteredOperations = operations;

  // KPIs are computed over what's loaded. When hasNextPage is true we show a
  // "loaded X of Y" hint in the UI so the user knows counts are partial.
  const kpis = useMemo(() => {
    const lancamentos = filteredOperations.filter((op) =>
      (LANCAMENTOS_TYPES as readonly string[]).includes(op.type),
    );
    const estrategias = filteredOperations.filter((op) =>
      (ESTRATEGIAS_TYPES as readonly string[]).includes(op.type),
    );

    const entradas = filteredOperations.filter((op) =>
      ['compra', 'entrada_manual', 'compra_turbinada', 'bumerangue'].includes(op.type),
    );
    const saidas = filteredOperations.filter((op) =>
      ['venda', 'resgate', 'transferencia'].includes(op.type),
    );

    const totalEntradas = entradas.reduce((sum, op) => sum + op.quantity + (op.bonus || 0), 0);
    const totalSaidas = saidas.reduce((sum, op) => sum + op.quantity, 0);
    const totalInvestido = filteredOperations.reduce((sum, op) => sum + (op.total_cost || 0), 0);

    return {
      totalOperations: totalCount,
      lancamentosCount: lancamentos.length,
      estrategiasCount: estrategias.length,
      totalEntradas,
      totalSaidas,
      totalInvestido,
    };
  }, [filteredOperations, totalCount]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setProgramFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = categoryFilter !== 'all' || programFilter !== 'all' || statusFilter !== 'all' || searchTerm || dateFrom || dateTo;

  // Export to CSV. When pages are still unloaded, load them all first so the
  // export isn't truncated to whatever the user had scrolled through.
  const [isExporting, setIsExporting] = useState(false);
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      while (hasNextPage && !isFetchingNextPage) {
        await fetchNextPage();
      }
    } catch {
      // best-effort: fall through and export whatever we have
    }

    const headers = ['Data', 'Categoria', 'Tipo', 'Programa', 'Titular', 'Quantidade', 'Bônus', 'Custo Total', '$/Mil', 'Status'];

    const rows = filteredOperations.map(op => {
      const isLancamento = (LANCAMENTOS_TYPES as readonly string[]).includes(op.type);
      return [
        formatDate(op.date),
        isLancamento ? 'Lançamentos' : 'Estratégias',
        TYPE_LABELS[op.type] || op.type,
        op.program,
        op.holder_name || '',
        op.quantity.toString(),
        op.bonus?.toString() || '',
        op.total_cost?.toFixed(2) || '',
        op.cost_per_thousand?.toFixed(2) || '',
        STATUS_LABELS[op.status]?.label || op.status
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operacoes_${formatDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  // Edit handlers
  const handleEditClick = (op: Operation) => {
    setEditingOperation(op);
    setFormErrors({});
    setEditForm({
      quantity: op.quantity.toString(),
      total_cost: op.total_cost?.toString() || '',
      bonus: op.bonus?.toString() || '',
      notes: op.notes || '',
      status: op.status,
      date: op.date,
      holder_id: op.holder_id || '',
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editForm.quantity || parseInt(editForm.quantity) <= 0) {
      errors.quantity = 'Quantidade deve ser maior que zero';
    }
    
    if (!editForm.date) {
      errors.date = 'Data é obrigatória';
    }
    
    if (!editForm.status) {
      errors.status = 'Status é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSave = async () => {
    if (!editingOperation) return;
    
    if (!validateForm()) return;

    const quantity = parseInt(editForm.quantity) || 0;
    const totalCost = parseFloat(editForm.total_cost) || 0;
    const costPerThousand = quantity > 0 ? (totalCost / quantity) * 1000 : 0;
    const selectedHolder = holders.find(h => h.id === editForm.holder_id);

    await updateOperation.mutateAsync({
      id: editingOperation.id,
      quantity,
      total_cost: totalCost,
      cost_per_thousand: costPerThousand,
      bonus: parseInt(editForm.bonus) || 0,
      notes: editForm.notes || undefined,
      status: editForm.status as OperationStatus,
      date: editForm.date,
      holder_id: editForm.holder_id || undefined,
      holder_name: selectedHolder?.name || undefined,
    });

    setEditingOperation(null);
  };

  // Delete handlers
  const handleDeleteClick = (op: Operation) => {
    setDeletingOperation(op);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOperation) return;
    await deleteOperation.mutateAsync(deletingOperation.id);
    setDeletingOperation(null);
  };

  return (
    <DashboardLayout title="Visão Geral das Operações">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Operações"
          title="Visão geral"
          subtitle="Histórico unificado de lançamentos, estratégias e reservas"
          icon={<ClipboardList className="h-4 w-4" />}
        />

        {/* History Limit Banner for Free Users */}
        <HistoryLimitBanner />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiTile
            icon={<ClipboardList className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            label="Total"
            value={formatNumber(kpis.totalOperations)}
          />
          <KpiTile
            icon={<ClipboardList className="h-4 w-4 text-info" />}
            iconBg="bg-info/10"
            label="Lançamentos"
            value={formatNumber(kpis.lancamentosCount)}
          />
          <KpiTile
            icon={<Zap className="h-4 w-4 text-warning" />}
            iconBg="bg-warning/10"
            label="Estratégias"
            value={formatNumber(kpis.estrategiasCount)}
          />
          <KpiTile
            icon={<TrendingUp className="h-4 w-4 text-success" />}
            iconBg="bg-success/10"
            label="Entradas"
            value={formatNumber(kpis.totalEntradas)}
          />
          <KpiTile
            icon={<TrendingDown className="h-4 w-4 text-destructive" />}
            iconBg="bg-destructive/10"
            label="Saídas"
            value={formatNumber(kpis.totalSaidas)}
          />
          <KpiTile
            icon={<ArrowLeftRight className="h-4 w-4 text-violet-500" />}
            iconBg="bg-violet-500/10"
            label="Investido"
            value={formatCurrency(kpis.totalInvestido)}
          />
        </div>

        {/* Filters */}
        <Card className="shadow-sm" data-tour="operations-filters">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToCSV}
                  disabled={filteredOperations.length === 0 || isExporting}
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isExporting ? 'Carregando…' : 'Exportar CSV'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="lancamentos">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-3 w-3" />
                      Lançamentos
                    </span>
                  </SelectItem>
                  <SelectItem value="estrategias">
                    <span className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Estratégias
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Program Filter */}
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Programas</SelectItem>
                  {PROGRAMS.map(program => (
                    <SelectItem key={program} value={program}>{program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Data início"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Data fim"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations Table */}
        <Card className="shadow-sm" data-tour="operations-table">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">
              Operações ({formatNumber(totalCount)})
              {hasNextPage && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  · {filteredOperations.length} carregadas
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredOperations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma operação encontrada
              </div>
            ) : (
              <>
                {/* Mobile card list (<md) — 1 op por card, focado em data + valor + status */}
                <div className="md:hidden divide-y divide-border/40 px-3">
                  {filteredOperations.map((op) => {
                    const isLancamento = (LANCAMENTOS_TYPES as readonly string[]).includes(op.type);
                    const statusInfo = STATUS_LABELS[op.status] || { label: op.status, variant: 'default' as const };
                    return (
                      <div key={op.id} className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <ProgramLogo program={op.program} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{TYPE_LABELS[op.type] || op.type}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {op.program} <span className="opacity-60">·</span>{' '}
                                <span className="font-mono tabular-nums">{format(new Date(op.date), 'dd/MM/yy', { locale: ptBR })}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0">{statusInfo.label}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(op as Operation)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(op as Operation)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Qtd</p>
                            <p className="font-mono tabular-nums text-sm font-medium mt-0.5">{formatNumber(op.quantity)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Custo</p>
                            <p className="font-mono tabular-nums text-sm mt-0.5">{op.total_cost ? formatCurrency(op.total_cost) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">R$/Mil</p>
                            <p className="font-mono tabular-nums text-sm mt-0.5">{op.cost_per_thousand ? formatCurrency(op.cost_per_thousand) : '—'}</p>
                          </div>
                        </div>
                        {(op.bonus || op.holder_name) && (
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                            {op.bonus ? (
                              <span><span className="font-semibold uppercase tracking-[0.08em] mr-1">Bônus</span><span className="font-mono tabular-nums">+{formatNumber(op.bonus)}</span></span>
                            ) : null}
                            {op.holder_name ? <span className="truncate">{toTitleCase(op.holder_name)}</span> : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table (md+) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-xs">Data</TableHead>
                      <TableHead className="h-9 text-xs">Categoria</TableHead>
                      <TableHead className="h-9 text-xs">Tipo</TableHead>
                      <TableHead className="h-9 text-xs">Programa</TableHead>
                      <TableHead className="h-9 text-xs">Titular</TableHead>
                      <TableHead className="h-9 text-xs text-right">Qtd</TableHead>
                      <TableHead className="h-9 text-xs text-right">Bônus</TableHead>
                      <TableHead className="h-9 text-xs text-right">Custo</TableHead>
                      <TableHead className="h-9 text-xs text-right">R$/Mil</TableHead>
                      <TableHead className="h-9 text-xs">Status</TableHead>
                      <TableHead className="h-9 w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOperations.map((op) => {
                      const isLancamento = (LANCAMENTOS_TYPES as readonly string[]).includes(op.type);
                      const statusInfo = STATUS_LABELS[op.status] || { label: op.status, variant: 'default' as const };
                      
                      return (
                        <TableRow key={op.id} className="h-10">
                          <TableCell className="py-2 text-xs font-mono tabular-nums whitespace-nowrap">
                            {format(new Date(op.date), 'dd/MM/yy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${isLancamento ? 'border-info text-info' : 'border-warning text-warning'}`}>
                              {isLancamento ? (
                                <ClipboardList className="h-2.5 w-2.5 mr-0.5" />
                              ) : (
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                              )}
                              {isLancamento ? 'Lanç.' : 'Estr.'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-xs">{TYPE_LABELS[op.type] || op.type}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5">
                              <ProgramLogo program={op.program} size="sm" />
                              <span className="text-xs">{op.program}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {op.holder_name ? toTitleCase(op.holder_name) : <span className="italic text-muted-foreground/70">Sem titular</span>}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right font-mono font-medium tabular-nums">
                            {formatNumber(op.quantity)}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right font-mono tabular-nums">
                            {op.bonus ? formatNumber(op.bonus) : '—'}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right font-mono tabular-nums">
                            {op.total_cost ? formatCurrency(op.total_cost) : '—'}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-right font-mono tabular-nums">
                            {op.cost_per_thousand ? formatCurrency(op.cost_per_thousand) : '—'}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant={statusInfo.variant} className="text-xs px-1.5 py-0">
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(op as Operation)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(op as Operation)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              </>
            )}

            {/* Infinite scroll sentinel + fallback "Load more" button */}
            {filteredOperations.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {formatNumber(filteredOperations.length)} de {formatNumber(totalCount)}
                  {hasNextPage ? ' · role para carregar mais' : ''}
                </p>
                <div className="flex items-center gap-2">
                  {isFetchingNextPage && (
                    <span className="text-xs text-muted-foreground">Carregando…</span>
                  )}
                  {hasNextPage && !isFetchingNextPage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      className="h-8 px-3 text-xs"
                    >
                      Carregar mais
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingOperation} onOpenChange={(open) => !open && setEditingOperation(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Operação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={TYPE_LABELS[editingOperation?.type || ''] || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Programa</Label>
                <Input value={editingOperation?.program || ''} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Titular</Label>
              <Select value={editForm.holder_id || "none"} onValueChange={(v) => setEditForm(prev => ({ ...prev, holder_id: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o titular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {holders.map(holder => (
                    <SelectItem key={holder.id} value={holder.id}>{holder.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={formErrors.quantity ? 'text-destructive' : ''}>Quantidade *</Label>
                <Input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => {
                    setEditForm(prev => ({ ...prev, quantity: e.target.value }));
                    if (formErrors.quantity) setFormErrors(prev => ({ ...prev, quantity: '' }));
                  }}
                  className={formErrors.quantity ? 'border-destructive' : ''}
                />
                {formErrors.quantity && (
                  <p className="text-xs text-destructive">{formErrors.quantity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Bônus</Label>
                <Input
                  type="number"
                  value={editForm.bonus}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bonus: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.total_cost}
                  onChange={(e) => setEditForm(prev => ({ ...prev, total_cost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className={formErrors.date ? 'text-destructive' : ''}>Data *</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => {
                    setEditForm(prev => ({ ...prev, date: e.target.value }));
                    if (formErrors.date) setFormErrors(prev => ({ ...prev, date: '' }));
                  }}
                  className={formErrors.date ? 'border-destructive' : ''}
                />
                {formErrors.date && (
                  <p className="text-xs text-destructive">{formErrors.date}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={formErrors.status ? 'text-destructive' : ''}>Status *</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => {
                  setEditForm(prev => ({ ...prev, status: v }));
                  if (formErrors.status) setFormErrors(prev => ({ ...prev, status: '' }));
                }}
              >
                <SelectTrigger className={formErrors.status ? 'border-destructive' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.status && (
                <p className="text-xs text-destructive">{formErrors.status}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOperation(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={updateOperation.isPending}>
              {updateOperation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingOperation}
        onOpenChange={(open) => !open && setDeletingOperation(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Operação"
        description={`Tem certeza que deseja excluir esta operação de ${TYPE_LABELS[deletingOperation?.type || ''] || 'operação'}? Esta ação não pode ser desfeita.`}
        isLoading={deleteOperation.isPending}
      />
    </DashboardLayout>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}

function KpiTile({ icon, iconBg, label, value }: KpiTileProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 truncate font-mono text-base font-semibold tabular-nums tracking-tight">
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
