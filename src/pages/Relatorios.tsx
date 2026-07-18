import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  FileText,
  BarChart3,
  Table2,
  Filter,
  TrendingUp,
  Wallet,
  Receipt,
  Calculator,
  Eye,
  Download,
  Loader2,
  PieChart,
  LineChart,
  Crown,
  Activity,
  ShoppingCart,
  Users,
  User,
  UserPlus,
  MapPin,
} from 'lucide-react';
import { KPICard } from '@/components/milespro';
import { useReportData, ReportType } from '@/hooks/useReportData';
import { useVIPReportData } from '@/hooks/useVIPReportData';
import { ReportTable } from '@/components/relatorios/ReportTable';
import { ReportChart } from '@/components/relatorios/ReportChart';
import { ReportExport } from '@/components/relatorios/ReportExport';
import { useLocalization } from '@/hooks/useLocalization';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ALL_PROGRAMS, PROGRAMS_BY_CATEGORY } from '@/data/programs';
// UpgradePrompt removed — Pro+ access is now enforced at the route layer
// via PlanProtectedRoute in App.tsx (QA audit sas.txt Bug 1).
import { HistoryLimitBanner } from '@/components/subscription/HistoryLimitBanner';

type ExtendedReportType = ReportType | 'vip';

const reportTypes = [
  {
    id: 'operations' as ExtendedReportType,
    title: 'Relatório de Operações',
    description: 'Lista completa de compras, vendas e transferências',
    icon: Receipt,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  {
    id: 'balance' as ExtendedReportType,
    title: 'Extrato de Saldos',
    description: 'Saldo atual por programa e titular',
    icon: Wallet,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    id: 'financial' as ExtendedReportType,
    title: 'Relatório Financeiro',
    description: 'Fluxo de caixa, custos e receitas',
    icon: TrendingUp,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'tax' as ExtendedReportType,
    title: 'Relatório para IR',
    description: 'Dados para declaração de imposto de renda',
    icon: Calculator,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    id: 'vip' as ExtendedReportType,
    title: 'Relatório Sala VIP',
    description: 'Acessos a salas VIP por cartão, localização e período',
    icon: Crown,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

type ViewMode = 'table' | 'chart';
type ChartVariant = 'bar' | 'pie' | 'line';

export default function Relatorios() {
  const { formatCurrency, formatNumber } = useLocalization();
  const [searchParams] = useSearchParams();
  // `useNavigate` and `useSubscription().isFree` removed alongside the
  // in-page UpgradePrompt — route-level PlanProtectedRoute handles redirect.
  
  // Check for URL parameter to pre-select report type
  const initialReportType = (searchParams.get('type') as ExtendedReportType) || 'operations';
  
  const [selectedReport, setSelectedReport] = useState<ExtendedReportType>(initialReportType);
  const [holderId, setHolderId] = useState('all');
  const [programId, setProgramId] = useState('all');
  const [cardId, setCardId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartVariant, setChartVariant] = useState<ChartVariant>('bar');
  const [isGenerated, setIsGenerated] = useState(false);
  const [vipSubReport, setVipSubReport] = useState<'entries' | 'byCard' | 'byLocation' | 'byMonth'>('entries');
  // Free-user paywall moved up to the route level — PlanProtectedRoute
  // in App.tsx redirects to /assinatura before this component mounts
  // (QA audit sas.txt Bug 1 — the in-page UpgradePrompt was bypassable
  // by clicking "Agora não").

  // Auto-generate report if coming from URL with type parameter
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['operations', 'balance', 'financial', 'tax', 'vip'].includes(typeParam)) {
      setSelectedReport(typeParam as ExtendedReportType);
      // Auto-generate when coming from IR banner
      if (typeParam === 'tax') {
        setIsGenerated(true);
      }
    }
  }, [searchParams]);

  // Regular reports data
  const {
    operationsReport,
    balanceReport,
    financialReport,
    taxReport,
    summary,
    holders,
    isLoading,
    isHistoryLimited,
  } = useReportData({
    type: selectedReport === 'vip' ? 'operations' : selectedReport,
    holderId,
    programId,
    startDate,
    endDate,
  });

  // VIP report data
  const {
    entriesReport: vipEntriesReport,
    byCardReport: vipByCardReport,
    byLocationReport: vipByLocationReport,
    byMonthReport: vipByMonthReport,
    summary: vipSummary,
    cards: vipCards,
    isLoading: isLoadingVip,
  } = useVIPReportData({
    cardId,
    startDate,
    endDate,
  });

  const handleGenerateReport = () => {
    setIsGenerated(true);
  };

  const currentReportData = useMemo(() => {
    switch (selectedReport) {
      case 'operations':
        return operationsReport;
      case 'balance':
        return balanceReport;
      case 'financial':
        return financialReport;
      case 'tax':
        return taxReport;
      case 'vip':
        switch (vipSubReport) {
          case 'entries':
            return vipEntriesReport;
          case 'byCard':
            return vipByCardReport;
          case 'byLocation':
            return vipByLocationReport;
          case 'byMonth':
            return vipByMonthReport;
          default:
            return vipEntriesReport;
        }
      default:
        return [];
    }
  }, [selectedReport, operationsReport, balanceReport, financialReport, taxReport, vipSubReport, vipEntriesReport, vipByCardReport, vipByLocationReport, vipByMonthReport]);

  const getColumns = () => {
    switch (selectedReport) {
      case 'operations':
        return [
          { key: 'date', label: 'Data', type: 'text' as const },
          { key: 'type', label: 'Tipo', type: 'text' as const },
          { key: 'program', label: 'Programa', type: 'program' as const },
          { key: 'holder', label: 'Titular', type: 'text' as const },
          { key: 'quantity', label: 'Quantidade', type: 'number' as const, align: 'right' as const },
          { key: 'totalCost', label: 'Custo Total', type: 'currency' as const, align: 'right' as const },
          { key: 'costPerThousand', label: 'R$/Mil', type: 'currency' as const, align: 'right' as const },
          { key: 'status', label: 'Status', type: 'text' as const },
        ];
      case 'balance':
        return [
          { key: 'program', label: 'Programa', type: 'program' as const },
          { key: 'holder', label: 'Titular', type: 'text' as const },
          { key: 'balance', label: 'Saldo', type: 'number' as const, align: 'right' as const },
          { key: 'averageCost', label: 'Custo Médio', type: 'currency' as const, align: 'right' as const },
          { key: 'totalInvested', label: 'Total Investido', type: 'currency' as const, align: 'right' as const },
          { key: 'estimatedValue', label: 'Valor Estimado', type: 'currency' as const, align: 'right' as const },
        ];
      case 'financial':
        return [
          { key: 'month', label: 'Mês', type: 'text' as const },
          { key: 'purchases', label: 'Compras', type: 'currency' as const, align: 'right' as const },
          { key: 'sales', label: 'Vendas', type: 'currency' as const, align: 'right' as const },
          { key: 'netFlow', label: 'Fluxo Líquido', type: 'currency' as const, align: 'right' as const },
          { key: 'totalOperations', label: 'Operações', type: 'number' as const, align: 'right' as const },
        ];
      case 'tax':
        return [
          { key: 'program', label: 'Programa', type: 'program' as const },
          { key: 'totalPurchased', label: 'Total Comprado', type: 'number' as const, align: 'right' as const },
          { key: 'totalSold', label: 'Total Vendido', type: 'number' as const, align: 'right' as const },
          { key: 'totalCost', label: 'Custo Total', type: 'currency' as const, align: 'right' as const },
          { key: 'totalRevenue', label: 'Receita Total', type: 'currency' as const, align: 'right' as const },
          { key: 'result', label: 'Resultado', type: 'currency' as const, align: 'right' as const },
        ];
      case 'vip':
        switch (vipSubReport) {
          case 'entries':
            return [
              { key: 'date', label: 'Data', type: 'text' as const },
              { key: 'cardName', label: 'Cartão', type: 'text' as const },
              { key: 'personName', label: 'Nome', type: 'text' as const },
              { key: 'relationship', label: 'Tipo', type: 'text' as const },
              { key: 'location', label: 'Localização', type: 'text' as const },
              { key: 'notes', label: 'Observações', type: 'text' as const },
            ];
          case 'byCard':
            return [
              { key: 'cardName', label: 'Cartão', type: 'text' as const },
              { key: 'titularEntries', label: 'Titular', type: 'number' as const, align: 'right' as const },
              { key: 'guestEntries', label: 'Convidados', type: 'number' as const, align: 'right' as const },
              { key: 'totalEntries', label: 'Total', type: 'number' as const, align: 'right' as const },
              { key: 'usageTitular', label: 'Uso Titular', type: 'text' as const, align: 'right' as const },
              { key: 'usageConvidado', label: 'Uso Convidado', type: 'text' as const, align: 'right' as const },
            ];
          case 'byLocation':
            return [
              { key: 'location', label: 'Localização', type: 'text' as const },
              { key: 'titularEntries', label: 'Titular', type: 'number' as const, align: 'right' as const },
              { key: 'guestEntries', label: 'Convidados', type: 'number' as const, align: 'right' as const },
              { key: 'totalEntries', label: 'Total', type: 'number' as const, align: 'right' as const },
              { key: 'percentage', label: '%', type: 'text' as const, align: 'right' as const },
            ];
          case 'byMonth':
            return [
              { key: 'month', label: 'Mês', type: 'text' as const },
              { key: 'titularEntries', label: 'Titular', type: 'number' as const, align: 'right' as const },
              { key: 'guestEntries', label: 'Convidados', type: 'number' as const, align: 'right' as const },
              { key: 'totalEntries', label: 'Total', type: 'number' as const, align: 'right' as const },
            ];
          default:
            return [];
        }
      default:
        return [];
    }
  };

  const getChartConfig = () => {
    switch (selectedReport) {
      case 'balance':
        return {
          dataKey: 'balance',
          nameKey: 'program',
          valueType: 'number' as const,
        };
      case 'financial':
        return {
          dataKey: 'purchases',
          secondaryDataKey: 'sales',
          nameKey: 'month',
          valueType: 'currency' as const,
        };
      case 'tax':
        return {
          dataKey: 'result',
          nameKey: 'program',
          valueType: 'currency' as const,
        };
      case 'vip':
        switch (vipSubReport) {
          case 'byCard':
            return {
              dataKey: 'totalEntries',
              nameKey: 'cardName',
              valueType: 'number' as const,
            };
          case 'byLocation':
            return {
              dataKey: 'totalEntries',
              nameKey: 'location',
              valueType: 'number' as const,
            };
          case 'byMonth':
            return {
              dataKey: 'totalEntries',
              secondaryDataKey: 'guestEntries',
              nameKey: 'month',
              valueType: 'number' as const,
            };
          default:
            return {
              dataKey: 'totalEntries',
              nameKey: 'location',
              valueType: 'number' as const,
            };
        }
      default:
        return {
          dataKey: 'quantity',
          nameKey: 'program',
          valueType: 'number' as const,
        };
    }
  };

  const selectedReportInfo = reportTypes.find(r => r.id === selectedReport);

  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          icon={<FileText className="h-5 w-5" />}
          title="Relatórios"
          subtitle="Cartões, passagens, economia, sala VIP e imposto de renda"
        />
        {/* History Limit Banner for Free Users */}
        {isHistoryLimited && <HistoryLimitBanner />}

        {/* Summary Cards */}
        {selectedReport === 'vip' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              size="sm"
              accent="warning"
              label="Total Entradas"
              value={formatNumber(vipSummary.totalEntries)}
              icon={<Users className="h-5 w-5" />}
            />
            <KPICard
              size="sm"
              accent="info"
              label="Titulares"
              value={formatNumber(vipSummary.titularEntries)}
              icon={<User className="h-5 w-5" />}
            />
            <KPICard
              size="sm"
              accent="violet"
              label="Convidados"
              value={formatNumber(vipSummary.guestEntries)}
              icon={<UserPlus className="h-5 w-5" />}
            />
            <KPICard
              size="sm"
              accent="success"
              label="Localizações"
              value={formatNumber(vipSummary.uniqueLocations)}
              icon={<MapPin className="h-5 w-5" />}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              size="sm"
              accent="default"
              label="Operações"
              value={formatNumber(summary.totalOperations)}
              icon={<Activity className="h-5 w-5 text-primary" />}
            />
            <KPICard
              size="sm"
              accent="success"
              label="Saldo Total"
              value={formatNumber(summary.totalMiles)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <KPICard
              size="sm"
              accent="info"
              label="Total Compras"
              value={formatCurrency(summary.totalPurchases)}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <KPICard
              size="sm"
              accent="violet"
              label="Total Vendas"
              value={formatCurrency(summary.totalSales)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        )}

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {reportTypes.map((report) => (
            <Card 
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedReport === report.id 
                  ? 'ring-2 ring-primary shadow-md' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => {
                setSelectedReport(report.id);
                setIsGenerated(false);
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg ${report.bgColor} flex items-center justify-center`}>
                    <report.icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{report.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.description}</p>
                  </div>
                </div>
                {selectedReport === report.id && (
                  <Badge variant="secondary" className="mt-3 text-xs">
                    Selecionado
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
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
              {selectedReport === 'vip' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Cartão VIP</Label>
                    <Select value={cardId} onValueChange={setCardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os cartões</SelectItem>
                        {vipCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.card_name} {card.last_four_digits ? `(****${card.last_four_digits})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Tipo de Relatório</Label>
                    <Select value={vipSubReport} onValueChange={(v) => setVipSubReport(v as typeof vipSubReport)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entries">Lista de Entradas</SelectItem>
                        <SelectItem value="byCard">Por Cartão</SelectItem>
                        <SelectItem value="byLocation">Por Localização</SelectItem>
                        <SelectItem value="byMonth">Por Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

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
                <Label className="text-sm">Visualização</Label>
                <div className="flex rounded-lg border border-input overflow-hidden">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-none"
                    onClick={() => setViewMode('table')}
                  >
                    <Table2 className="h-4 w-4 mr-1" />
                    Tabela
                  </Button>
                  <Button
                    variant={viewMode === 'chart' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 rounded-none"
                    onClick={() => setViewMode('chart')}
                    disabled={selectedReport === 'vip' && vipSubReport === 'entries'}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Gráfico
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">&nbsp;</Label>
                <Button 
                  className="w-full"
                  onClick={handleGenerateReport}
                  disabled={isLoading || isLoadingVip}
                >
                  {(isLoading || isLoadingVip) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Gerar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Visualization */}
        {isGenerated && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                {selectedReportInfo && (
                  <div className={`h-10 w-10 rounded-lg ${selectedReportInfo.bgColor} flex items-center justify-center`}>
                    <selectedReportInfo.icon className={`h-5 w-5 ${selectedReportInfo.color}`} />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{selectedReportInfo?.title}</CardTitle>
                  <CardDescription>
                    {currentReportData.length} registro{currentReportData.length !== 1 ? 's' : ''} encontrado{currentReportData.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'chart' && (
                  <div className="flex rounded-lg border border-input overflow-hidden mr-2">
                    <Button
                      variant={chartVariant === 'bar' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-none px-2"
                      onClick={() => setChartVariant('bar')}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartVariant === 'pie' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-none px-2"
                      onClick={() => setChartVariant('pie')}
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={chartVariant === 'line' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-none px-2"
                      onClick={() => setChartVariant('line')}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <ReportExport 
                  data={currentReportData as unknown as Record<string, unknown>[]}
                  columns={getColumns()}
                  reportName={selectedReport}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : viewMode === 'table' ? (
                <ReportTable
                  columns={getColumns()}
                  data={currentReportData as unknown as Record<string, unknown>[]}
                  emptyMessage="Nenhum dado encontrado para os filtros selecionados"
                />
              ) : (
                <ReportChart
                  type={chartVariant}
                  data={currentReportData as unknown as Record<string, unknown>[]}
                  {...getChartConfig()}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isGenerated && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Selecione um relatório</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Escolha um tipo de relatório acima, ajuste os filtros se necessário e clique em "Gerar Relatório" para visualizar os dados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
