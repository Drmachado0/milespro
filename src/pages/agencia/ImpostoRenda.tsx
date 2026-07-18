import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProgramLogo } from '@/components/ui/program-logo';
import { DataTable, KPICard, type DataTableColumn } from '@/components/milespro';
import { useIncomeTaxReport } from '@/hooks/useIncomeTaxReport';
import { useHolders } from '@/hooks/useOperations';
import { useLocalization } from '@/hooks/useLocalization';
import { Download, FileText, DollarSign, TrendingUp, TrendingDown, Calculator, CheckCircle, AlertTriangle, Plane, Info } from 'lucide-react';
import { startOfYear, endOfYear } from 'date-fns';
import { ALL_PROGRAMS } from '@/data/programs';
import { generateIncomeTaxPDF } from '@/lib/incomeTaxPdfGenerator';
import { preloadPDFLibraries } from '@/lib/pdfLoader';
import { IncomeTaxEvolutionChart } from '@/components/imposto-renda/IncomeTaxEvolutionChart';
import { ExemptionLimitAlert } from '@/components/imposto-renda/ExemptionLimitAlert';
import { QuarterlySummaryCards } from '@/components/imposto-renda/QuarterlySummaryCards';
import { YearComparisonCard } from '@/components/imposto-renda/YearComparisonCard';
import { AssetsDeclarationAlert } from '@/components/imposto-renda/AssetsDeclarationAlert';
import { DeclarationInstructions } from '@/components/imposto-renda/DeclarationInstructions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ImpostoRenda() {
  const { formatCurrency, formatNumber, t } = useLocalization();
  const currentYear = new Date().getFullYear();

  // Preload PDF libraries in idle time so export is instant when clicked
  useEffect(() => { preloadPDFLibraries(); }, []);
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedHolder, setSelectedHolder] = useState<string>('all');

  const { holders } = useHolders();

  const filters = useMemo(() => ({
    startDate: startOfYear(new Date(selectedYear, 0, 1)),
    endDate: endOfYear(new Date(selectedYear, 0, 1)),
    program: selectedProgram !== 'all' ? selectedProgram : undefined,
    holderId: selectedHolder !== 'all' ? selectedHolder : undefined,
  }), [selectedYear, selectedProgram, selectedHolder]);

  const { 
    monthlyData, 
    programData, 
    summary, 
    quarterlySummary,
    currentMonthAlert,
    yearOverYearComparison,
    assetsDeclaration,
    isLoading, 
    exemptionLimit, 
    taxRate,
    assetThreshold,
    previousYear,
  } = useIncomeTaxReport(filters);

  const years = useMemo(() => {
    const result = [];
    for (let i = 0; i < 5; i++) {
      result.push(currentYear - i);
    }
    return result;
  }, [currentYear]);

  const selectedHolderData = useMemo(() => {
    if (selectedHolder === 'all') return undefined;
    return holders?.find(h => h.id === selectedHolder);
  }, [selectedHolder, holders]);

  const exportToCSV = () => {
    const headers = ['Mês', 'Milhas Vendidas', 'Custo/Milheiro', 'Vendas (R$)', 'Custo (R$)', 'Lucro (R$)', 'Isento', 'IR a Pagar (R$)'];
    const rows = monthlyData.map(m => [
      m.monthLabel,
      m.milesSold.toString(),
      m.costPerThousand.toFixed(2),
      m.totalSales.toFixed(2),
      m.totalCost.toFixed(2),
      m.profit.toFixed(2),
      m.isExempt ? 'Sim' : 'Não',
      m.taxDue.toFixed(2),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imposto-renda-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    generateIncomeTaxPDF({
      year: selectedYear,
      monthlyData,
      programData,
      summary,
      exemptionLimit,
      taxRate,
      holderName: selectedHolderData?.name,
      holderCpf: selectedHolderData?.cpf ?? undefined,
      programFilter: selectedProgram !== 'all' ? selectedProgram : undefined,
    });
  };

  // Check if we're viewing the current year to show the alert
  const showCurrentMonthAlert = selectedYear === currentYear;

  return (
    <DashboardLayout title={t('incomeTax.title')}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Relatório fiscal"
          title={t('incomeTax.title')}
          icon={<Calculator className="h-4 w-4" />}
          actions={
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              {t('incomeTax.exportPDF')}
            </Button>
          }
        />

        {/* Filters card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('incomeTax.exportCSV')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('incomeTax.fiscalYear')}</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('operations.program')}</label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {ALL_PROGRAMS.map((program) => (
                      <SelectItem key={program.name} value={program.name}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('operations.holder')}</label>
                <Select value={selectedHolder} onValueChange={setSelectedHolder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {holders?.map((holder) => (
                      <SelectItem key={holder.id} value={holder.id}>
                        {holder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Month Alert - Only show for current year */}
        {showCurrentMonthAlert && currentMonthAlert.currentSales > 0 && (
          <ExemptionLimitAlert alert={currentMonthAlert} exemptionLimit={exemptionLimit} />
        )}

        {/* Assets Declaration Alert */}
        {assetsDeclaration.mustDeclare && (
          <AssetsDeclarationAlert 
            totalPurchased={assetsDeclaration.totalPurchased} 
            threshold={assetThreshold} 
          />
        )}

        {/* Declaration Instructions */}
        <DeclarationInstructions />

        {/* Info Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm space-y-2">
                <div>
                  <p className="font-medium">{t('incomeTax.exemptionInfo')}</p>
                  <p className="text-muted-foreground mt-1">
                    {t('incomeTax.exemptionDescription', { limit: formatCurrency(exemptionLimit), rate: (taxRate * 100).toFixed(0) })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground italic border-t pt-2">
                  {t('incomeTax.organicMilesNote')} {t('incomeTax.consultAccountant')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year-over-Year Comparison */}
        {yearOverYearComparison && (
          <YearComparisonCard 
            comparison={yearOverYearComparison} 
            currentYear={selectedYear} 
            previousYear={previousYear} 
          />
        )}

        {/* Summary KPIs — milespro KPICard size='sm' (accent maps icon to semantic color) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            size="sm"
            accent="info"
            label={t('incomeTax.totalSales')}
            value={formatCurrency(summary.totalSales)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="default"
            label={t('incomeTax.totalCost')}
            value={formatCurrency(summary.totalCost)}
            icon={<TrendingDown className="h-5 w-5 text-primary" />}
            className="border-primary/20"
          />
          <KPICard
            size="sm"
            accent="success"
            label={t('incomeTax.taxableProfit')}
            value={formatCurrency(summary.totalProfit)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="violet"
            label={t('incomeTax.milesSold')}
            value={formatNumber(summary.totalMilesSold)}
            icon={<Plane className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="danger"
            label={t('incomeTax.estimatedTax')}
            value={<span className="text-destructive">{formatCurrency(summary.totalTaxDue)}</span>}
            icon={<Calculator className="h-5 w-5" />}
            className="border-destructive/30"
          />
        </div>

        {/* Sales Evolution Chart */}
        <IncomeTaxEvolutionChart data={monthlyData} exemptionLimit={exemptionLimit} />

        {/* Quarterly Summary */}
        <QuarterlySummaryCards data={quarterlySummary} />

        {/* Monthly breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('incomeTax.monthlyBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : monthlyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.noData')}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('incomeTax.month')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.milesSoldColumn')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.costPerThousand')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.sales')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.cost')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.profit')}</TableHead>
                      <TableHead className="text-center">{t('incomeTax.status')}</TableHead>
                      <TableHead className="text-right">{t('incomeTax.taxDue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.monthLabel}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatNumber(month.milesSold)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(month.costPerThousand)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(month.totalSales)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(month.totalCost)}</TableCell>
                        <TableCell className={`text-right font-mono tabular-nums ${month.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(month.profit)}
                        </TableCell>
                        <TableCell className="text-center">
                          {month.isExempt ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('incomeTax.exempt')}
                            </Badge>
                          ) : month.taxDue > 0 ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                              {t('incomeTax.taxable')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted">
                              {t('incomeTax.noProfit')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold font-mono tabular-nums ${month.taxDue > 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(month.taxDue)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>{t('common.total')}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatNumber(summary.totalMilesSold)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(summary.avgCostPerThousand)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(summary.totalSales)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{formatCurrency(summary.totalCost)}</TableCell>
                      <TableCell className={`text-right font-mono tabular-nums ${summary.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(summary.totalProfit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          <span className="font-mono tabular-nums">{summary.exemptMonths}</span> {t('incomeTax.exemptMonths')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-mono tabular-nums">
                        {formatCurrency(summary.totalTaxDue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Program — milespro DataTable: sort por coluna + search por programa + paginação automática.
            (Monthly table acima permanece em <Table> shadcn por causa da row Total no footer,
            que DataTable não suporta nativamente.) */}
        {programData.length > 0 && (
          <div className="space-y-2">
            <DataTable
              title={t('incomeTax.byProgram')}
              countLabel={`${programData.length} ${programData.length === 1 ? 'programa' : 'programas'}`}
              rows={programData}
              rowKey={(row) => row.program}
              pageSize={20}
              searchPlaceholder="Buscar programa…"
              toolbarRight={
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Sobre o cálculo por programa">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('incomeTax.programNote')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
              columns={[
                {
                  key: 'program',
                  header: t('operations.program'),
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={row.program} size="sm" />
                      <span className="font-medium">{row.program}</span>
                    </div>
                  ),
                },
                {
                  key: 'milesSold',
                  header: t('incomeTax.milesSoldColumn'),
                  numeric: true,
                  sortable: true,
                  render: (row) => formatNumber(row.milesSold),
                },
                {
                  key: 'costPerThousand',
                  header: t('incomeTax.costPerThousand'),
                  numeric: true,
                  sortable: true,
                  render: (row) => formatCurrency(row.costPerThousand),
                },
                {
                  key: 'totalSales',
                  header: t('incomeTax.sales'),
                  numeric: true,
                  sortable: true,
                  render: (row) => formatCurrency(row.totalSales),
                },
                {
                  key: 'totalCost',
                  header: t('incomeTax.cost'),
                  numeric: true,
                  sortable: true,
                  render: (row) => formatCurrency(row.totalCost),
                },
                {
                  key: 'profit',
                  header: t('incomeTax.profit'),
                  numeric: true,
                  sortable: true,
                  render: (row) => (
                    <span className={row.profit >= 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                      {formatCurrency(row.profit)}
                    </span>
                  ),
                },
              ] satisfies DataTableColumn<typeof programData[number]>[]}
            />
            {/* Note about IR calculation — kept outside the table (was previously a footer note) */}
            <p className="text-xs text-muted-foreground italic px-1">
              {t('incomeTax.programNote')}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
