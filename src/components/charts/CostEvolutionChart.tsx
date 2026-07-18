import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMemo } from 'react';
import { useLocalization } from '@/hooks/useLocalization';
import { TrendingUp } from 'lucide-react';

type PeriodFilter = '30d' | '90d' | '6m' | '1a' | 'all';

interface CostEvolutionChartProps {
  data: Array<{
    date: string;
    cost: number;
  }>;
  programs?: string[];
  selectedProgram?: string;
  onProgramChange?: (program: string) => void;
  selectedPeriod?: PeriodFilter;
  onPeriodChange?: (period: PeriodFilter) => void;
  referencePrice?: number;
}

export function CostEvolutionChart({
  data,
  programs = [],
  selectedProgram = 'all',
  onProgramChange,
  selectedPeriod = 'all',
  onPeriodChange,
  referencePrice = 20
}: CostEvolutionChartProps) {
  const { formatCurrency, getCurrencySymbol } = useLocalization();
  
  // Calculate average cost from data for reference line
  const avgCost = useMemo(() => {
    if (data.length === 0) return referencePrice;
    const sum = data.reduce((acc, d) => acc + d.cost, 0);
    return Number((sum / data.length).toFixed(2));
  }, [data, referencePrice]);

  const CustomTooltip = ({
    active,
    payload,
    label
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
          <p className="font-medium text-foreground text-sm">{label}</p>
          <p className="text-base font-bold mt-1" style={{ color: 'hsl(27, 95%, 60%)' }}>
            {formatCurrency(Number(payload[0].value || 0))}/mil
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Média: {formatCurrency(avgCost)}/mil
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom dot renderer - green for first and last, orange for others
  const CustomDot = ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
    if (typeof cx !== 'number' || typeof cy !== 'number' || typeof index !== 'number') return null;
    const isFirstOrLast = index === 0 || index === data.length - 1;
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isFirstOrLast ? 6 : 4}
        fill={isFirstOrLast ? 'hsl(142, 71%, 45%)' : 'hsl(27, 95%, 60%)'}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        className="drop-shadow-sm"
      />
    );
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              Evolução do Custo do Milheiro
            </CardTitle>
            {onPeriodChange && (
              <ToggleGroup 
                type="single" 
                value={selectedPeriod} 
                onValueChange={(value) => value && onPeriodChange(value as PeriodFilter)}
                className="bg-muted/50 rounded-lg p-1"
              >
                <ToggleGroupItem value="30d" className="h-7 px-2.5 text-xs rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  30d
                </ToggleGroupItem>
                <ToggleGroupItem value="90d" className="h-7 px-2.5 text-xs rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  90d
                </ToggleGroupItem>
                <ToggleGroupItem value="6m" className="h-7 px-2.5 text-xs rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  6m
                </ToggleGroupItem>
                <ToggleGroupItem value="1a" className="h-7 px-2.5 text-xs rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  1a
                </ToggleGroupItem>
                <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  Tudo
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          {programs.length > 0 && onProgramChange && (
            <Select value={selectedProgram} onValueChange={onProgramChange}>
              <SelectTrigger className="w-[200px] h-9 text-xs rounded-lg">
                <SelectValue placeholder="Todos os programas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="text-xs">Todos os programas</span>
                </SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program} value={program}>
                    <div className="flex items-center gap-2">
                      <ProgramLogo program={program} size="sm" />
                      <span className="text-xs">{program}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(27, 95%, 60%)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(27, 95%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false}
                  stroke="hsl(var(--muted-foreground) / 0.15)" 
                />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--muted-foreground) / 0.15)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${getCurrencySymbol()} ${value}`}
                  domain={['dataMin - 3', 'dataMax + 3']}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Reference line for average cost */}
                <ReferenceLine 
                  y={avgCost} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: 'Média',
                    position: 'right',
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(27, 95%, 60%)"
                  strokeWidth={2.5}
                  fill="url(#costGradient)"
                  dot={<CustomDot />}
                  activeDot={{ 
                    r: 7, 
                    fill: 'hsl(27, 95%, 60%)', 
                    stroke: 'hsl(var(--background))', 
                    strokeWidth: 2,
                    className: 'drop-shadow-md'
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
