import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon, Trophy } from 'lucide-react';

interface ProgramDatum {
  name: string;
  value: number;
  fill?: string;
}

interface ProgramDistributionChartProps {
  data: ProgramDatum[];
  /**
   * Total count of programs with positive balance across the whole portfolio.
   * The chart itself only shows the top N (data.length is capped), so callers
   * pass this explicitly to keep the subtitle in sync with the KPI shown
   * elsewhere on the page. Defaults to data.length for backward compat.
   */
  activeCount?: number;
}

interface ProgramLegendEntry {
  value: string;
  payload: ProgramDatum;
}

const COLORS = [
  'hsl(262, 83%, 58%)',  // Purple
  'hsl(221, 83%, 53%)',  // Blue
  'hsl(142, 71%, 45%)',  // Green
  'hsl(38, 92%, 50%)',   // Amber
  'hsl(346, 77%, 50%)',  // Rose
  'hsl(172, 66%, 50%)',  // Teal
  'hsl(25, 95%, 53%)',   // Orange
  'hsl(280, 65%, 60%)',  // Violet
];

const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'K';
  }
  return num.toLocaleString('pt-BR');
};

function ProgramDistributionChartComponent({ data, activeCount }: ProgramDistributionChartProps) {
  const activeProgramsCount = activeCount ?? data.length;
  // Memoize expensive calculations
  const { total, sortedData } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    return { total, sortedData };
  }, [data]);

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ProgramDatum;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-3">
            <ProgramLogo program={item.name} size="sm" />
            <div>
              <p className="font-semibold text-sm text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.value.toLocaleString('pt-BR')} milhas
              </p>
              <p className="text-xs font-medium text-primary mt-0.5">
                {percentage}% do total
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: { payload?: ProgramLegendEntry[] }) => {
    if (!payload) return null;
    
    // Show top 6 programs max
    const displayPayload = payload.slice(0, 6);
    
    return (
      <div className="flex flex-wrap justify-center gap-1.5 mt-2 px-2">
        {displayPayload.map((entry, index) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : '0';
          return (
            <div 
              key={`legend-${index}`} 
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 
                         hover:bg-muted/60 transition-colors cursor-default border border-border/40
                         hover:border-border/60"
            >
              <ProgramLogo program={entry.value} size="xs" />
              <span className="text-[11px] font-medium text-foreground/90 hidden sm:inline max-w-[60px] truncate">
                {entry.value}
              </span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary border-0">
                {percentage}%
              </Badge>
            </div>
          );
        })}
        {payload.length > 6 && (
          <div className="flex items-center px-2 py-1 rounded-lg bg-muted/40 border border-border/40">
            <span className="text-[11px] text-muted-foreground">
              +{payload.length - 6} outros
            </span>
          </div>
        )}
      </div>
    );
  };

  // Custom label for center of donut
  const renderCenterLabel = () => {
    return (
      <g>
        <text 
          x="50%" 
          y="42%" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="fill-foreground"
          style={{ fontSize: '18px', fontWeight: 700 }}
        >
          {formatCompactNumber(total)}
        </text>
        <text 
          x="50%" 
          y="52%" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="fill-muted-foreground"
          style={{ fontSize: '10px', fontWeight: 500 }}
        >
          milhas
        </text>
      </g>
    );
  };

  return (
    <Card className="h-full overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-violet-500/5">
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/10 shadow-sm">
              <PieChartIcon className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <span className="text-foreground">Distribuição por Programa</span>
              <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                {activeProgramsCount} {activeProgramsCount === 1 ? 'programa ativo' : 'programas ativos'}
              </p>
            </div>
          </CardTitle>
          {sortedData.length > 0 && (
            <Badge 
              variant="secondary" 
              className="gap-1 bg-warning/10 text-warning dark:text-warning border-warning/20 hover:bg-warning/15"
            >
              <Trophy className="h-3 w-3" />
              <span className="hidden sm:inline max-w-[80px] truncate">{sortedData[0].name}</span>
              <span className="sm:hidden">Top</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        {data.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-violet-500/15 to-violet-500/5 
                            flex items-center justify-center border border-violet-500/10">
              <PieChartIcon className="h-8 w-8 text-violet-500/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Nenhum saldo registrado
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Registre operações de compra para visualizar a distribuição
            </p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={sortedData.map((item, index) => ({
                    ...item,
                    fill: COLORS[index % COLORS.length]
                  }))}
                  cx="50%"
                  cy="42%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                  startAngle={90}
                  endAngle={450}
                >
                  {sortedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#gradient-${index % COLORS.length})`}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      className="drop-shadow-sm transition-all duration-200 hover:opacity-80"
                      style={{ 
                        cursor: 'pointer',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                      }}
                    />
                  ))}
                </Pie>
                {renderCenterLabel()}
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize the entire chart to prevent re-renders when parent updates
export const ProgramDistributionChart = memo(ProgramDistributionChartComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if data actually changed
  if (prevProps.data.length !== nextProps.data.length) return false;
  if (prevProps.activeCount !== nextProps.activeCount) return false;

  return prevProps.data.every((item, index) => {
    const nextItem = nextProps.data[index];
    return item.name === nextItem.name && item.value === nextItem.value;
  });
});
