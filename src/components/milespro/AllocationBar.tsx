import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AllocationSegment {
  key: string;
  name: string;
  value: number;
  color: string; // hex
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
}

export interface AllocationBarProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  total?: { value: number; unit?: string; format?: (n: number) => string };
  segments: AllocationSegment[];
  variant?: 'full' | 'compact' | 'thin';
  showLegend?: boolean;
  className?: string;
}

const defaultFormat = (n: number) => n.toLocaleString('pt-BR');

export function AllocationBar({
  title,
  eyebrow,
  description,
  total,
  segments,
  variant = 'full',
  showLegend = true,
  className,
}: AllocationBarProps) {
  const sum = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const fmt = total?.format ?? defaultFormat;

  const heightCls = variant === 'thin' ? 'h-2 rounded-full' : variant === 'compact' ? 'h-9 rounded-lg' : 'h-14 rounded-xl';
  const showLabels = variant === 'full';

  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-[hsl(var(--mp-surface-1))] p-7 shadow-raised md:p-8',
        className,
      )}
    >
      {(title || total) && (
        <header className="mb-5 flex items-end justify-between gap-8">
          <div>
            {eyebrow && (
              <span className="mb-2 block font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {eyebrow}
              </span>
            )}
            {title && (
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-1.5 max-w-[460px] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {total && (
            <div className="shrink-0 text-right">
              <div className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
                {fmt(total.value)}
                {total.unit && (
                  <span className="ml-1.5 text-sm font-medium tracking-normal text-muted-foreground">{total.unit}</span>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Bar */}
      <div
        className={cn(
          'relative flex w-full overflow-hidden border border-border bg-[hsl(var(--mp-surface-2))]',
          heightCls,
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_-12px_rgba(0,0,0,0.4)]',
        )}
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / sum) * 100;
          return (
            <div
              key={seg.key}
              className={cn(
                'relative flex h-full items-center justify-center overflow-hidden text-white transition-[filter] duration-200 hover:brightness-110',
                i < segments.length - 1 && 'border-r border-black/20',
              )}
              style={{
                width: `${pct}%`,
                background: `linear-gradient(180deg, ${seg.color} 0%, ${seg.color}DD 100%)`,
              }}
              title={`${seg.name}: ${pct.toFixed(1)}%`}
            >
              {/* gloss */}
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_35%,rgba(0,0,0,0.18)_100%)]" />
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />
              {showLabels && pct > 6 && (
                <span className="relative z-10 truncate px-2 font-mono text-xs font-semibold tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {pct.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && variant !== 'thin' && (
        <div className="mt-6 grid gap-x-6 gap-y-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((seg) => {
            const pct = (seg.value / sum) * 100;
            const DeltaIcon =
              seg.delta?.direction === 'up' ? TrendingUp : seg.delta?.direction === 'down' ? TrendingDown : Minus;
            const deltaCls =
              seg.delta?.direction === 'up'
                ? 'text-success'
                : seg.delta?.direction === 'down'
                  ? 'text-destructive'
                  : 'text-muted-foreground';
            return (
              <div key={seg.key} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.2)]"
                    style={{ background: seg.color }}
                  />
                  <span className="text-xs font-medium tracking-tight text-foreground">{seg.name}</span>
                </div>
                <div className="flex items-baseline gap-2 pl-5">
                  <span className="font-display text-[17px] font-semibold tracking-tight tabular-nums text-foreground">
                    {fmt(seg.value)}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
                {seg.delta && (
                  <div className={cn('flex items-center gap-1.5 pl-5 font-mono text-[10.5px]', deltaCls)}>
                    <DeltaIcon className="h-2.5 w-2.5" />
                    {seg.delta.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
