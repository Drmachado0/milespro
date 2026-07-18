import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KPIDeltaDirection = 'up' | 'down' | 'flat';
export type KPISize = 'default' | 'sm' | 'xs';
export type KPIAccent = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

export interface KPICardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: string; direction: KPIDeltaDirection };
  period?: string;
  icon?: ReactNode;
  /** Sparkline points. Ignored when size='sm' (no vertical room). */
  sparkline?: number[];
  /** Caption text rendered under the value (size='sm' only). Use for context like "X milhas utilizadas". */
  caption?: ReactNode;
  variant?: 'default' | 'hero';
  /**
   * Card size:
   *  - 'default' (196px min-h, vertical layout): hero KPI with optional sparkline
   *  - 'sm' (compact, horizontal layout): KPI strip tile (icon left, label+value right) — text-2xl value
   *  - 'xs' (super-compact, horizontal layout): denser KPI strip — text-xl value, p-3 padding
   */
  size?: KPISize;
  /**
   * Icon container accent color. Maps to design system tokens.
   *  - 'default': muted neutral, hover -> brand orange
   *  - 'info'/'success'/'warning'/'danger'/'violet': semantic color tinted box
   * The value text stays foreground; pass `value={<span className="text-X">...</span>}` to color it.
   */
  accent?: KPIAccent;
  /** Sparkline stroke color. Accepts any CSS color (hex, hsl, var). Defaults to brand primary. */
  accentColor?: string;
  className?: string;
}

const ACCENT_CLASSES: Record<KPIAccent, { border: string; bg: string; text: string }> = {
  default: { border: 'border-white/[0.06]', bg: 'bg-white/[0.04]', text: 'text-muted-foreground' },
  info: { border: 'border-info/20', bg: 'bg-info/10', text: 'text-info' },
  success: { border: 'border-success/20', bg: 'bg-success/10', text: 'text-success' },
  warning: { border: 'border-warning/20', bg: 'bg-warning/10', text: 'text-warning' },
  danger: { border: 'border-destructive/20', bg: 'bg-destructive/10', text: 'text-destructive' },
  violet: { border: 'border-violet-500/20', bg: 'bg-violet-500/10', text: 'text-violet-500' },
};

const buildSparkPath = (points: number[], w = 280, h = 56) => {
  if (!points.length) return { line: '', area: '' };
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area };
};

export function KPICard({
  label,
  value,
  unit,
  delta,
  period,
  icon,
  sparkline,
  caption,
  variant = 'default',
  size = 'default',
  accent = 'default',
  accentColor = 'hsl(var(--mp-orange-500))',
  className,
}: KPICardProps) {
  const isHero = variant === 'hero';
  const isCompact = size === 'sm' || size === 'xs';
  const isXs = size === 'xs';

  // Hero variant always uses white-on-gradient styling — accent is ignored to preserve brand identity.
  const accentClasses = isHero
    ? { border: 'border-white/20', bg: 'bg-white/15', text: 'text-white' }
    : ACCENT_CLASSES[accent];
  const accentHoverClasses = !isHero && accent === 'default'
    ? 'group-hover:border-primary/25 group-hover:bg-primary/10 group-hover:text-primary'
    : '';

  // ───────── Compact horizontal layouts (size='sm' / 'xs') ─────────
  // Sparkline + delta + period are ignored at this size — no vertical room.
  if (isCompact) {
    return (
      <div
        className={cn(
          'group relative flex items-center overflow-hidden rounded-xl border border-border bg-[hsl(var(--mp-surface-2))] transition-colors duration-200 hover:border-primary/20',
          isXs ? 'gap-2.5 px-3 py-3' : 'gap-3 px-4 py-4',
          className,
        )}
      >
        {icon && (
          <div
            className={cn(
              'grid flex-shrink-0 place-items-center rounded-lg border',
              isXs ? 'h-9 w-9' : 'h-10 w-10',
              accentClasses.border,
              accentClasses.bg,
              accentClasses.text,
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-0.5">
          <p
            className={cn(
              'font-medium uppercase tracking-[0.16em] text-muted-foreground',
              isXs ? 'text-xs' : 'text-[0.65rem]',
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'font-mono font-bold tabular-nums tracking-tight text-foreground',
              isXs ? 'text-xl' : 'text-2xl',
            )}
          >
            {value}
            {unit && <small className="ml-1 text-sm font-medium tracking-tight text-muted-foreground">{unit}</small>}
          </p>
          {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
        </div>
      </div>
    );
  }

  // ───────── Default vertical layout (size='default') — hero KPI with sparkline ─────────
  const spark = sparkline && sparkline.length > 1 ? buildSparkPath(sparkline) : null;
  const gradId = `kpi-spark-${Math.random().toString(36).slice(2, 8)}`;

  const DeltaIcon = delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus;
  const deltaClasses = isHero
    ? 'bg-white/15 border-white/25 text-white'
    : delta?.direction === 'up'
      ? 'bg-success/10 border-success/20 text-success'
      : delta?.direction === 'down'
        ? 'bg-destructive/10 border-destructive/20 text-destructive'
        : 'bg-white/5 border-white/10 text-muted-foreground';

  return (
    <div
      className={cn(
        'group relative flex min-h-[196px] flex-col overflow-hidden rounded-xl border px-[22px] pt-[22px] pb-0 transition-all duration-200',
        isHero
          ? 'border-white/20 text-white'
          : 'border-border bg-[hsl(var(--mp-surface-2))] hover:-translate-y-0.5 hover:border-primary/20',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.4),0_8px_20px_-10px_rgba(0,0,0,0.45)]',
        'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_32px_-12px_rgba(0,0,0,0.6),0_8px_24px_-8px_rgba(255,106,26,0.2)]',
        className,
      )}
      style={
        isHero
          ? {
              backgroundImage:
                'radial-gradient(120% 90% at 100% 0%, rgba(255,45,135,0.45) 0%, transparent 60%), radial-gradient(80% 100% at 0% 100%, rgba(255,106,26,0.55) 0%, transparent 60%), linear-gradient(135deg, #C73E0A 0%, #8C1F4F 100%)',
            }
          : undefined
      }
    >
      {/* Head */}
      <div className="mb-3.5 flex items-center justify-between">
        <span
          className={cn(
            'font-sans text-[11px] font-semibold uppercase tracking-[0.14em]',
            isHero ? 'text-white/80' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              'grid h-[26px] w-[26px] place-items-center rounded-md border',
              accentClasses.border,
              accentClasses.bg,
              accentClasses.text,
              accentHoverClasses,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className={cn(
          'font-display text-[38px] font-semibold leading-none tracking-[-0.04em] tabular-nums',
          isHero ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]' : 'text-foreground',
        )}
      >
        {value}
        {unit && (
          <small
            className={cn(
              'ml-1 text-sm font-medium tracking-tight',
              isHero ? 'text-white/65' : 'text-muted-foreground',
            )}
          >
            {unit}
          </small>
        )}
      </div>

      {/* Meta */}
      {(delta || period) && (
        <div
          className={cn(
            'mt-1.5 flex items-center gap-2 text-xs',
            isHero ? 'text-white/80' : 'text-muted-foreground',
          )}
        >
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full border px-[7px] py-[2px] font-mono text-[12px] font-semibold tabular-nums',
                deltaClasses,
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta.value}
            </span>
          )}
          {period && (
            <span className={cn('font-mono text-[11px] tracking-wider', isHero ? 'text-white/60' : 'text-muted-foreground')}>
              {period}
            </span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {spark && (
        <div className="-mx-[22px] mt-auto h-14 pt-4">
          <svg viewBox="0 0 280 56" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isHero ? '#fff' : accentColor} stopOpacity={isHero ? 0.35 : 0.28} />
                <stop offset="100%" stopColor={isHero ? '#fff' : accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={spark.area} fill={`url(#${gradId})`} />
            <path d={spark.line} fill="none" stroke={isHero ? '#fff' : accentColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
