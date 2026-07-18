import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useLocalization } from '@/hooks/useLocalization';

type ChartType = 'bar' | 'pie' | 'line';

interface ReportChartProps {
  type: ChartType;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  secondaryDataKey?: string;
  title?: string;
  valueType?: 'currency' | 'number';
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--mp-magenta))',
  'hsl(var(--mp-info))',
  'hsl(var(--mp-success))',
  'hsl(var(--mp-warning))',
  'hsl(var(--mp-danger))',
];

export function ReportChart({
  type,
  data,
  dataKey,
  nameKey,
  secondaryDataKey,
  title,
  valueType = 'number',
}: ReportChartProps) {
  const { formatCurrency, formatNumber } = useLocalization();

  const formatValue = (value: number) => {
    if (valueType === 'currency') {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatValue(entry.value ?? 0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum dado para exibir
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={100}
              fill="hsl(var(--primary))"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey={nameKey} className="text-xs fill-muted-foreground" />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tickFormatter={(value) => formatValue(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
              name="Compras"
            />
            {secondaryDataKey && (
              <Line 
                type="monotone" 
                dataKey={secondaryDataKey} 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
                name="Vendas"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={nameKey} className="text-xs fill-muted-foreground" />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Compras" />
          {secondaryDataKey && (
            <Bar dataKey={secondaryDataKey} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Vendas" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
