import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PiggyBank,
  Plane,
  Building2,
  Car,
  Ship,
  ShieldCheck,
  Landmark,
  Bus,
  TrendingUp,
  TrendingDown,
  Download,
  Loader2,
  Filter,
  BarChart3,
  PieChart,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useConsolidatedSavings, SavingsCategory } from '@/hooks/useConsolidatedSavings';
import { useLocalization } from '@/hooks/useLocalization';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_PROGRAMS, PROGRAMS_BY_CATEGORY } from '@/data/programs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--mp-success))',
  'hsl(var(--mp-warning))',
];

const TYPE_ICONS: Record<SavingsCategory, React.ElementType> = {
  ticket: Plane,
  hotel: Building2,
  car: Car,
  cruise: Ship,
  insurance: ShieldCheck,
  attraction: Landmark,
  transfer: Bus,
};

const TYPE_LABELS: Record<SavingsCategory, string> = {
  ticket: 'Passagens',
  hotel: 'Hotéis',
  car: 'Carros',
  cruise: 'Cruzeiros',
  insurance: 'Seguros',
  attraction: 'Atrações',
  transfer: 'Transfers',
};

const TYPE_COLORS: Record<SavingsCategory, string> = {
  ticket: 'bg-info/10 text-info border-info/20',
  hotel: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  car: 'bg-primary/10 text-primary border-primary/20',
  cruise: 'bg-info/10 text-info border-info/20',
  insurance: 'bg-success/10 text-success border-success/20',
  attraction: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  transfer: 'bg-warning/10 text-warning border-warning/20',
};

export default function EconomiaRelatorio() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  const { user } = useAuth();

  const [holderId, setHolderId] = useState('all');
  const [programId, setProgramId] = useState('all');
  const [category, setCategory] = useState<SavingsCategory | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch holders
  const { data: holders = [] } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('holders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data, isLoading } = useConsolidatedSavings({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    holderId: holderId !== 'all' ? holderId : undefined,
    programId: programId !== 'all' ? programId : undefined,
    category: category !== 'all' ? category : undefined,
  });

  const totalPages = Math.ceil((data?.reservations.length || 0) / itemsPerPage);
  const paginatedReservations = useMemo(() => {
    if (!data?.reservations) return [];
    return data.reservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [data?.reservations, currentPage]);

  // Chart data for categories
  const categoryChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.savingsByCategory)
      .map(([key, value]) => ({
        name: TYPE_LABELS[key.replace(/s$/, '') as SavingsCategory] || key,
        value: Math.max(0, value),
        rawValue: value,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Monthly trend chart data
  const monthlyChartData = useMemo(() => {
    if (!data?.monthlyTrend) return [];
    return data.monthlyTrend.slice(-12).map((m) => ({
      month: m.monthLabel,
      'Custo Milhas': m.totalCost,
      'Preço Dinheiro': m.cashPrice,
      Economia: m.savings,
    }));
  }, [data?.monthlyTrend]);

  const exportToCSV = () => {
    if (!data?.reservations.length) return;
    const headers = ['Tipo', 'Descrição', 'Data', 'Custo Milhas (R$)', 'Preço Dinheiro (R$)', 'Economia (R$)', 'Economia (%)', 'Status', 'Titular', 'Programa'];
    const rows = data.reservations.map((r) =>
      [
        TYPE_LABELS[r.type],
        r.description,
        r.date,
        r.total_cost_brl.toFixed(2).replace('.', ','),
        r.cash_price.toFixed(2).replace('.', ','),
        r.savings.toFixed(2).replace('.', ','),
        r.savingsPercentage.toFixed(1).replace('.', ',') + '%',
        r.status,
        r.holder_name || '-',
        r.program || '-',
      ].join(';')
    );
    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_economia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Relatório de Economia">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Relatório de Economia">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          title="Relatório de Economia"
          subtitle="Quanto você economiza usando milhas vs. pagar em dinheiro"
          icon={<PiggyBank className="h-4 w-4" />}
        />

        {/* Hero KPI */}
        <Card className="bg-gradient-to-br from-success/10 via-success/5 to-background border-success/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-4 rounded-2xl bg-success/20 shrink-0">
                <PiggyBank className="h-10 w-10 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Economia Total no Período</p>
                <p
                  className={cn(
                    'text-4xl font-bold',
                    (data?.totalSavings || 0) >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {formatCurrency(data?.totalSavings || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.reservationsCount || 0} reservas • Custo: {formatCurrency(data?.totalCost || 0)} vs Dinheiro:{' '}
                  {formatCurrency(data?.totalCashPrice || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(
            [
              { key: 'tickets', icon: Plane, label: 'Passagens' },
              { key: 'hotels', icon: Building2, label: 'Hotéis' },
              { key: 'cars', icon: Car, label: 'Carros' },
              { key: 'cruises', icon: Ship, label: 'Cruzeiros' },
              { key: 'insurances', icon: ShieldCheck, label: 'Seguros' },
              { key: 'attractions', icon: Landmark, label: 'Atrações' },
              { key: 'transfers', icon: Bus, label: 'Transfers' },
            ] as const
          ).map(({ key, icon: Icon, label }) => {
            const value = data?.savingsByCategory[key] || 0;
            return (
              <Card
                key={key}
                className={cn(
                  'p-3 transition-all hover:scale-[1.02] hover:shadow-md',
                  value >= 0 ? 'border-success/20' : 'border-destructive/20'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-lg', value >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
                    <Icon className={cn('h-4 w-4', value >= 0 ? 'text-success' : 'text-destructive')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className={cn('text-sm font-bold', value >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(value)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Categoria</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v as SavingsCategory | 'all'); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="ticket">Passagens</SelectItem>
                    <SelectItem value="hotel">Hotéis</SelectItem>
                    <SelectItem value="car">Carros</SelectItem>
                    <SelectItem value="cruise">Cruzeiros</SelectItem>
                    <SelectItem value="insurance">Seguros</SelectItem>
                    <SelectItem value="attraction">Atrações</SelectItem>
                    <SelectItem value="transfer">Transfers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Titular</Label>
                <Select value={holderId} onValueChange={(v) => { setHolderId(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os titulares</SelectItem>
                    {holders.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Programa</Label>
                <Select value={programId} onValueChange={(v) => { setProgramId(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os programas</SelectItem>
                    {Object.entries(PROGRAMS_BY_CATEGORY).map(([key, cat]) => (
                      <div key={key}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat.title}</div>
                        {cat.programs.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data Início</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">&nbsp;</Label>
                <Button variant="outline" className="w-full" onClick={exportToCSV} disabled={!data?.reservations.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Por Categoria</span>
            </TabsTrigger>
            <TabsTrigger value="holder" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Por Titular</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Detalhes</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                <CardDescription>Comparativo de custo em milhas vs preço em dinheiro</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Custo Milhas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Preço Dinheiro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Economia" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhuma reserva encontrada no período
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Tab */}
          <TabsContent value="category" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ranking de Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryChartData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                        </div>
                        <p className="font-semibold text-sm text-success">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                    {categoryChartData.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Holder Tab */}
          <TabsContent value="holder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Economia por Titular</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.savingsByHolder.map((h, index) => (
                    <div key={h.holder_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{h.holder_name}</p>
                        <p className="text-xs text-muted-foreground">{h.reservationsCount} reservas</p>
                      </div>
                      <p className={cn('font-bold text-lg', h.savings >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatCurrency(h.savings)}
                      </p>
                    </div>
                  ))}
                  {(!data?.savingsByHolder || data.savingsByHolder.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Custo Milhas</TableHead>
                        <TableHead className="text-right">Preço Dinheiro</TableHead>
                        <TableHead className="text-right">Economia</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReservations.map((r) => {
                        const Icon = TYPE_ICONS[r.type];
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant="outline" className={TYPE_COLORS[r.type]}>
                                <Icon className="h-3 w-3 mr-1" />
                                {TYPE_LABELS[r.type]}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                            <TableCell>{formatDate(r.date)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.total_cost_brl)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.cash_price)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-medium', r.savings >= 0 ? 'text-success' : 'text-destructive')}>
                                {r.savings >= 0 ? (
                                  <TrendingUp className="h-3 w-3 inline mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 inline mr-1" />
                                )}
                                {formatCurrency(r.savings)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>
                                {r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendente' : r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginatedReservations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma reserva encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
