import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocalization } from '@/hooks/useLocalization';

interface MonthlyData {
  month: string;
  compras: number;
  vendas: number;
  transferencias: number;
  emissoes: number;
}

interface MonthlyOperationsDetailChartProps {
  data: MonthlyData[];
}

const COLORS = {
  compras: 'hsl(var(--mp-success))',
  vendas: 'hsl(var(--mp-danger))',
  transferencias: 'hsl(var(--mp-orange-500))',
  emissoes: 'hsl(var(--mp-violet))',
};

const LABELS = {
  compras: 'Compras',
  vendas: 'Vendas',
  transferencias: 'Transferências',
  emissoes: 'Emissões',
};

export function MonthlyOperationsDetailChart({ data }: MonthlyOperationsDetailChartProps) {
  const { formatNumber } = useLocalization();
  
  // Format month labels
  const chartData = data.map((item) => {
    const [year, month] = item.month.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return {
      ...item,
      monthLabel: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
    };
  });

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, keyof typeof LABELS>) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {LABELS[entry.dataKey as keyof typeof LABELS]}: {formatNumber(entry.value ?? 0, 0)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Operações Mensais</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma operação registrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value, 0)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => LABELS[value as keyof typeof LABELS]}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="compras" stackId="a" fill={COLORS.compras} radius={[0, 0, 0, 0]} />
              <Bar dataKey="vendas" stackId="a" fill={COLORS.vendas} radius={[0, 0, 0, 0]} />
              <Bar dataKey="transferencias" stackId="a" fill={COLORS.transferencias} radius={[0, 0, 0, 0]} />
              <Bar dataKey="emissoes" stackId="a" fill={COLORS.emissoes} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
