import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KPICard } from '@/components/milespro';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plane, 
  Filter, 
  Users, 
  TrendingUp,
  Ticket,
  Loader2,
  BarChart3,
  PieChart,
  Table2,
  Wallet,
  PiggyBank,
} from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_PROGRAMS, PROGRAMS_BY_CATEGORY } from '@/data/programs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ProgramLogo } from '@/components/ui/program-logo';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ReportExport } from '@/components/relatorios/ReportExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--mp-success))',
  'hsl(var(--mp-warning))',
  'hsl(var(--mp-danger))',
];

interface TicketReportRow {
  id: string;
  date: string;
  formattedDate: string;
  program: string;
  holder: string;
  origin: string;
  destination: string;
  route: string;
  locator: string;
  passengers: number;
  milesUsed: number;
  taxBrl: number;
  totalCostBrl: number;
  cashPrice: number;
  savings: number;
  savingsPercentage: number;
  status: string;
}

interface ProgramDistribution {
  program: string;
  totalMiles: number;
  totalEmissions: number;
  totalSavings: number;
  percentage: number;
}

interface HolderDistribution {
  holder: string;
  totalMiles: number;
  totalEmissions: number;
  totalSavings: number;
  percentage: number;
}

interface MonthlyEvolution {
  month: string;
  monthKey: string;
  milesUsed: number;
  emissions: number;
  savings: number;
}

interface TicketsSummary {
  totalEmissions: number;
  totalMilesUsed: number;
  totalPassengers: number;
  totalTaxes: number;
  totalCost: number;
  totalCashPrice: number;
  totalSavings: number;
  averageSavingsPercentage: number;
}

export default function PassagensEmitidas() {
  const { formatCurrency, formatNumber, t } = useLocalization();
  const { user } = useAuth();
  const [holderId, setHolderId] = useState('all');
  const [programId, setProgramId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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

  // Fetch tickets from travel_tickets table
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['travel-tickets-report', user?.id, holderId, programId, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('travel_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('flight_date', { ascending: false });

      if (holderId && holderId !== 'all') {
        query = query.eq('holder_id', holderId);
      }
      if (programId && programId !== 'all') {
        query = query.eq('miles_program', programId);
      }
      if (startDate) {
        query = query.gte('flight_date', startDate);
      }
      if (endDate) {
        query = query.lte('flight_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Process report data
  const reportData = useMemo<TicketReportRow[]>(() => {
    if (!ticketsData) return [];
    return ticketsData.map((t) => {
      const cashPrice = t.cash_price || 0;
      const savings = cashPrice - t.total_cost_brl;
      const savingsPercentage = cashPrice > 0 ? (savings / cashPrice) * 100 : 0;

      return {
        id: t.id,
        date: t.flight_date,
        formattedDate: format(parseISO(t.flight_date), 'dd/MM/yyyy'),
        program: t.miles_program || '-',
        holder: t.holder_name || '-',
        origin: t.origin,
        destination: t.destination,
        route: `${t.origin} → ${t.destination}`,
        locator: t.locator || '-',
        passengers: t.passengers || 1,
        milesUsed: t.miles_used,
        taxBrl: t.tax_brl || 0,
        totalCostBrl: t.total_cost_brl,
        cashPrice,
        savings,
        savingsPercentage,
        status: t.status,
      };
    });
  }, [ticketsData]);

  // Program distribution
  const programDistribution = useMemo<ProgramDistribution[]>(() => {
    const programMap = new Map<string, { miles: number; count: number; savings: number }>();
    let totalMiles = 0;

    reportData.forEach((t) => {
      const current = programMap.get(t.program) || { miles: 0, count: 0, savings: 0 };
      current.miles += t.milesUsed;
      current.count += 1;
      current.savings += t.savings;
      totalMiles += t.milesUsed;
      programMap.set(t.program, current);
    });

    const result: ProgramDistribution[] = [];
    programMap.forEach((data, program) => {
      result.push({
        program,
        totalMiles: data.miles,
        totalEmissions: data.count,
        totalSavings: data.savings,
        percentage: totalMiles > 0 ? (data.miles / totalMiles) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.totalMiles - a.totalMiles);
  }, [reportData]);

  // Holder distribution
  const holderDistribution = useMemo<HolderDistribution[]>(() => {
    const holderMap = new Map<string, { miles: number; count: number; savings: number }>();
    let totalMiles = 0;

    reportData.forEach((t) => {
      const current = holderMap.get(t.holder) || { miles: 0, count: 0, savings: 0 };
      current.miles += t.milesUsed;
      current.count += 1;
      current.savings += t.savings;
      totalMiles += t.milesUsed;
      holderMap.set(t.holder, current);
    });

    const result: HolderDistribution[] = [];
    holderMap.forEach((data, holder) => {
      result.push({
        holder,
        totalMiles: data.miles,
        totalEmissions: data.count,
        totalSavings: data.savings,
        percentage: totalMiles > 0 ? (data.miles / totalMiles) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.totalMiles - a.totalMiles);
  }, [reportData]);

  // Monthly evolution
  const monthlyEvolution = useMemo<MonthlyEvolution[]>(() => {
    const monthMap = new Map<string, { miles: number; count: number; savings: number }>();

    reportData.forEach((t) => {
      const monthKey = t.date.substring(0, 7);
      const current = monthMap.get(monthKey) || { miles: 0, count: 0, savings: 0 };
      current.miles += t.milesUsed;
      current.count += 1;
      current.savings += t.savings;
      monthMap.set(monthKey, current);
    });

    const result: MonthlyEvolution[] = [];
    monthMap.forEach((data, monthKey) => {
      result.push({
        month: format(parseISO(`${monthKey}-01`), 'MMM/yy', { locale: ptBR }),
        monthKey,
        milesUsed: data.miles,
        emissions: data.count,
        savings: data.savings,
      });
    });

    return result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [reportData]);

  // Summary stats
  const summary = useMemo<TicketsSummary>(() => {
    let totalMiles = 0;
    let totalPassengers = 0;
    let totalTaxes = 0;
    let totalCost = 0;
    let totalCashPrice = 0;

    reportData.forEach((t) => {
      totalMiles += t.milesUsed;
      totalPassengers += t.passengers;
      totalTaxes += t.taxBrl;
      totalCost += t.totalCostBrl;
      totalCashPrice += t.cashPrice;
    });

    const totalSavings = totalCashPrice - totalCost;
    const avgSavingsPercentage = totalCashPrice > 0 ? (totalSavings / totalCashPrice) * 100 : 0;

    return {
      totalEmissions: reportData.length,
      totalMilesUsed: totalMiles,
      totalPassengers,
      totalTaxes,
      totalCost,
      totalCashPrice,
      totalSavings,
      averageSavingsPercentage: avgSavingsPercentage,
    };
  }, [reportData]);

  const exportColumns = [
    { key: 'formattedDate', label: 'Data', type: 'text' as const },
    { key: 'program', label: 'Programa', type: 'text' as const },
    { key: 'holder', label: 'Titular', type: 'text' as const },
    { key: 'route', label: 'Rota', type: 'text' as const },
    { key: 'locator', label: 'Localizador', type: 'text' as const },
    { key: 'passengers', label: 'Passageiros', type: 'number' as const },
    { key: 'milesUsed', label: 'Milhas', type: 'number' as const },
    { key: 'taxBrl', label: 'Taxas', type: 'currency' as const },
    { key: 'totalCostBrl', label: 'Custo Total', type: 'currency' as const },
    { key: 'cashPrice', label: 'Preço Dinheiro', type: 'currency' as const },
    { key: 'savings', label: 'Economia', type: 'currency' as const },
  ];

  return (
    <DashboardLayout title={t('reports.issuedTickets')}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          title={t('reports.issuedTickets')}
          subtitle="Histórico e estatísticas de emissões com milhas"
          icon={<Plane className="h-4 w-4" />}
        />

        {/* KPI strip — milespro KPICard size='sm'. Loading state shows '—' (Skeleton not
            supported in the compact horizontal layout). border-l-{color} accent dropped
            in favor of the icon container accent (consistent with IR + agencia/Dashboard). */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard
            size="sm"
            label="Emissões"
            value={isLoading ? '-' : formatNumber(summary.totalEmissions)}
            icon={<Plane className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="sm"
            accent="info"
            label="Milhas Usadas"
            value={isLoading ? '-' : formatNumber(summary.totalMilesUsed)}
            icon={<Ticket className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="success"
            label="Economia"
            value={
              isLoading ? '-' : (
                <span className={summary.totalSavings >= 0 ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(summary.totalSavings)}
                </span>
              )
            }
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="violet"
            label="Passageiros"
            value={isLoading ? '-' : formatNumber(summary.totalPassengers)}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="warning"
            label="Total Taxas"
            value={isLoading ? '-' : formatCurrency(summary.totalTaxes)}
            icon={<Wallet className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="danger"
            label="% Economia"
            value={
              isLoading ? '-' : (
                <span className={summary.averageSavingsPercentage >= 0 ? 'text-success' : 'text-destructive'}>
                  {formatNumber(summary.averageSavingsPercentage, 1)}%
                </span>
              )
            }
            icon={<TrendingUp className="h-5 w-5" />}
          />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Titular</Label>
                <Select value={holderId} onValueChange={setHolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os titulares</SelectItem>
                    {holders.map((holder) => (
                      <SelectItem key={holder.id} value={holder.id}>
                        {holder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Programa</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os programas</SelectItem>
                    {Object.entries(PROGRAMS_BY_CATEGORY).map(([key, category]) => (
                      <div key={key}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {category.title}
                        </div>
                        {category.programs.map((program) => (
                          <SelectItem key={program.name} value={program.name}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data Início</Label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Data Fim</Label>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">&nbsp;</Label>
                <ReportExport 
                  data={reportData as unknown as Record<string, unknown>[]}
                  columns={exportColumns}
                  reportName="passagens-emitidas"
                />
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
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Por Programa</span>
            </TabsTrigger>
            <TabsTrigger value="holders" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Por Titular</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Detalhes</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal</CardTitle>
                <CardDescription>Milhas utilizadas e economia ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : monthlyEvolution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyEvolution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis yAxisId="left" className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'milesUsed') return [formatNumber(value), 'Milhas'];
                          if (name === 'savings') return [formatCurrency(value), 'Economia'];
                          return [value, name];
                        }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left" 
                        dataKey="milesUsed" 
                        name="Milhas" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="savings" 
                        name="Economia" 
                        fill="hsl(142, 76%, 36%)" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhuma emissão encontrada no período
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Programa</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : programDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={programDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="totalMiles"
                          nameKey="program"
                          label={({ program, percentage }) => `${program} (${percentage.toFixed(1)}%)`}
                        >
                          {programDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatNumber(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
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
                  <CardTitle className="text-lg">Ranking de Programas</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {programDistribution.slice(0, 8).map((item, index) => (
                        <div key={item.program} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <ProgramLogo program={item.program} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.program}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.totalEmissions} emissões • {formatCurrency(item.totalSavings)} economia
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatNumber(item.totalMiles)}</p>
                            <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                      {programDistribution.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Holders Tab */}
          <TabsContent value="holders" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Titular</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : holderDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={holderDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="totalMiles"
                          nameKey="holder"
                          label={({ holder, percentage }) => `${holder} (${percentage.toFixed(1)}%)`}
                        >
                          {holderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatNumber(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
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
                  <CardTitle className="text-lg">Ranking de Titulares</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {holderDistribution.slice(0, 8).map((item, index) => (
                        <div key={item.holder} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.holder}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.totalEmissions} emissões • {formatCurrency(item.totalSavings)} economia
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatNumber(item.totalMiles)}</p>
                            <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                      {holderDistribution.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Emissão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Programa</TableHead>
                        <TableHead>Titular</TableHead>
                        <TableHead>Rota</TableHead>
                        <TableHead>Localizador</TableHead>
                        <TableHead className="text-right">Milhas</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Economia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            {[...Array(8)].map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : reportData.length > 0 ? (
                        reportData.slice(0, 50).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.formattedDate}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ProgramLogo program={row.program} size="sm" />
                                <span className="text-sm">{row.program}</span>
                              </div>
                            </TableCell>
                            <TableCell>{row.holder}</TableCell>
                            <TableCell>{row.route}</TableCell>
                            <TableCell className="font-mono text-xs">{row.locator}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.milesUsed)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.totalCostBrl)}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "font-medium",
                                row.savings >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {formatCurrency(row.savings)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma emissão encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {reportData.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Mostrando 50 de {reportData.length} registros. Exporte para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
