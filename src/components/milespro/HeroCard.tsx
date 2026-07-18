import { ReactNode, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface HeroChartPoint {
  label: string;
  value: number;
  reference?: number;
}

export interface HeroCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: string; direction: 'up' | 'down'; sub?: string };
  ranges?: { key: string; label: string }[];
  defaultRange?: string;
  onRangeChange?: (key: string) => void;
  data: HeroChartPoint[];
  legend?: { name: string; type: 'solid' | 'dashed'; value?: string }[];
  liveLabel?: string;
  rightMeta?: ReactNode;
  className?: string;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

export function HeroCard({
  eyebrow = 'Resumo',
  title,
  subtitle,
  value,
  unit,
  delta,
  ranges,
  defaultRange,
  onRangeChange,
  data,
  legend,
  liveLabel,
  rightMeta,
  className,
}: HeroCardProps) {
  const [active, setActive] = useState(defaultRange ?? ranges?.[0]?.key ?? '');
  const DeltaIcon = delta?.direction === 'up' ? TrendingUp : TrendingDown;
  const hasReference = data.some((d) => typeof d.reference === 'number');

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 px-10 pb-8 pt-9',
        className,
      )}
      style={{
        backgroundImage:
          'radial-gradient(80% 60% at 100% 0%, rgba(255,45,135,0.22) 0%, transparent 55%), radial-gradient(70% 90% at 0% 100%, rgba(255,106,26,0.18) 0%, transparent 55%), radial-gradient(120% 100% at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 65%), hsl(var(--mp-surface-1))',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4), 0 24px 48px -16px rgba(0,0,0,0.65), 0 8px 64px -16px rgba(255,106,26,0.2), 0 8px 64px -16px rgba(255,45,135,0.12)',
      }}
    >
      {/* hairline highlight */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_30%)]" />

      <div className="relative z-10">
        {/* Head */}
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--mp-orange-300,24_95%_64%))]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
              {eyebrow}
            </div>
            <h2 className="m-0 font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
              {subtitle && <small className="mt-1 block font-sans text-[12.5px] font-normal text-muted-foreground">{subtitle}</small>}
            </h2>
          </div>

          {ranges && ranges.length > 0 && (
            <div className="inline-flex rounded-[10px] border border-white/10 bg-white/[0.04] p-[3px] backdrop-blur-md">
              {ranges.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    setActive(r.key);
                    onRangeChange?.(r.key);
                  }}
                  className={cn(
                    'rounded-[7px] px-3.5 py-1.5 font-mono text-[11.5px] font-semibold tracking-wider transition-colors',
                    active === r.key
                      ? 'bg-white/[0.07] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.25)]'
                      : 'text-muted-foreground hover:text-foreground/80',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Value */}
        <div className="mb-5 flex items-end gap-6">
          <div
            className="font-display text-[64px] font-semibold leading-[0.94] tracking-[-0.045em] tabular-nums lg:text-[84px]"
            style={{
              backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #C8CAD3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {value}
            {unit && (
              <small className="ml-2 text-2xl font-medium tracking-tight text-muted-foreground" style={{ WebkitTextFillColor: 'hsl(var(--muted-foreground))' }}>
                {unit}
              </small>
            )}
          </div>

          {delta && (
            <div className="flex flex-col gap-1.5 pb-3.5">
              <span
                className={cn(
                  'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-sm font-semibold tabular-nums',
                  delta.direction === 'up'
                    ? 'border-success/30 bg-success/15 text-success'
                    : 'border-destructive/30 bg-destructive/15 text-destructive',
                )}
              >
                <DeltaIcon className="h-3.5 w-3.5" />
                {delta.value}
              </span>
              {delta.sub && <span className="text-xs text-muted-foreground">{delta.sub}</span>}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="-mx-10 -mb-2 h-[240px] px-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
              <defs>
                <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--mp-orange-500))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--mp-orange-500))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--mp-font-mono, monospace)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'var(--mp-font-mono, monospace)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(Number(v))}
                width={56}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1 }}
                contentStyle={{
                  background: 'rgba(31,32,40,0.9)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  backdropFilter: 'blur(20px)',
                  fontFamily: 'var(--mp-font-mono, monospace)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--mp-orange-300, 24 95% 64%))', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                formatter={(v: number) => fmt(v)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--mp-orange-500))"
                strokeWidth={2.5}
                fill="url(#hero-area)"
                activeDot={{ r: 5, fill: 'hsl(var(--mp-orange-400))', stroke: '#fff', strokeWidth: 2 }}
              />
              {hasReference && (
                <Line
                  type="monotone"
                  dataKey="reference"
                  stroke="hsl(var(--mp-magenta))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        {(legend || liveLabel || rightMeta) && (
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            {legend && (
              <div className="flex flex-wrap items-center gap-4">
                {legend.map((l) => (
                  <span key={l.name} className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-[3px]',
                        l.type === 'solid'
                          ? 'bg-[linear-gradient(135deg,#FF6A1A,#FF842E)]'
                          : 'bg-[repeating-linear-gradient(90deg,#FF2D87_0_3px,transparent_3px_6px)]',
                      )}
                    />
                    <span className="font-medium text-foreground">{l.name}</span>
                    {l.value && <span className="font-mono text-[11.5px] text-muted-foreground">{l.value}</span>}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 font-mono text-[11px] tracking-wider text-muted-foreground">
              {liveLabel && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_#22C55E]" />
                  {liveLabel}
                </span>
              )}
              {rightMeta}
            </div>
          </footer>
        )}
      </div>
    </section>
  );
}
