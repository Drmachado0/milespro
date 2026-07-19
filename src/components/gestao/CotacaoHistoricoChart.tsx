import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { TrendingUp, LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useLocalization } from '@/hooks/useLocalization';
import { useCotacaoUltima, useCotacaoHistorico } from '@/hooks/useMilhasCotacao';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

/**
 * Gráfico de evolução da COTAÇÃO AUTOMÁTICA DIÁRIA (milhas_cotacao_diaria).
 * Fonte distinta das "Cotações Manuais do Mercado" (compra/venda): aqui é a
 * série temporal do milheiro gravada pelo coletor diário. Consome os hooks
 * read-only useCotacaoUltima (lista de programas com dado) + useCotacaoHistorico.
 */
export function CotacaoHistoricoChart() {
  const { formatCurrency } = useLocalization();
  const [programa, setPrograma] = useState<string>();
  const [rangeDays, setRangeDays] = useState('30');

  // Data-driven: os programas que aparecem no seletor são os que realmente têm
  // série gravada (lidos da view latest_milhas_cotacao).
  const { data: latest = [], isLoading: loadingProgramas } = useCotacaoUltima();
  const programas = useMemo(
    () => latest.map((l) => l.programa).sort((a, b) => a.localeCompare(b)),
    [latest],
  );

  const selectedPrograma = programa ?? programas[0];

  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), Number(rangeDays)), 'yyyy-MM-dd');

  const { data: historico = [], isLoading } = useCotacaoHistorico(
    selectedPrograma,
    startDate,
    endDate,
  );

  const chartData = useMemo(
    () =>
      historico.map((row) => ({
        date: row.date,
        label: format(new Date(`${row.date}T00:00:00`), 'dd/MM', { locale: ptBR }),
        cotacao: row.cotacao_milheiro,
      })),
    [historico],
  );

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const values = chartData.map((d) => d.cotacao);
    const first = values[0];
    const last = values[values.length - 1];
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { last, changePct, min: Math.min(...values), max: Math.max(...values) };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">
            Milheiro:{' '}
            <span className="font-medium text-primary">
              {formatCurrency(payload[0].value as number)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const Title = (
    <CardTitle className="flex items-center gap-2 text-base">
      <TrendingUp className="h-5 w-5 text-primary" />
      Evolução da Cotação
    </CardTitle>
  );

  // Carregando a lista de programas.
  if (loadingProgramas) {
    return (
      <Card>
        <CardHeader className="pb-2">{Title}</CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Nenhum programa com série ainda (o coletor diário não populou a tabela).
  if (programas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">{Title}</CardHeader>
        <CardContent className="pt-2">
          <EmptyState
            compact
            icon={LineChartIcon}
            title="Sem dados de cotação ainda"
            description="A série diária automática ainda não foi populada. Assim que o coletor gravar em milhas_cotacao_diaria, a evolução do milheiro aparece aqui."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {Title}
          <div className="flex items-center gap-2">
            <Select value={selectedPrograma} onValueChange={setPrograma}>
              <SelectTrigger className="h-8 w-[170px] text-sm">
                <SelectValue placeholder="Programa" />
              </SelectTrigger>
              <SelectContent>
                {programas.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-8 w-[110px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Atual</p>
              <p className="font-bold text-sm">{formatCurrency(stats.last)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Variação</p>
              <p
                className={cn(
                  'font-bold text-sm',
                  stats.changePct >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {stats.changePct >= 0 ? '+' : ''}
                {stats.changePct.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Mínimo</p>
              <p className="font-bold text-sm">{formatCurrency(stats.min)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Máximo</p>
              <p className="font-bold text-sm">{formatCurrency(stats.max)}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState
            compact
            icon={LineChartIcon}
            title="Sem cotações no período"
            description={`Nenhum registro para ${selectedPrograma} nos últimos ${rangeDays} dias.`}
          />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="cotacaoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={48}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `R$${Number(v).toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cotacao"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#cotacaoGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
