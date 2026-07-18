import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Optional eyebrow label rendered above the title with brand dot + glow. */
  eyebrow?: string;
  /** Short, imperative title. No "Página de ..." */
  title: string;
  /** Optional context line under the title */
  subtitle?: string;
  /** Optional icon badge to the left of the title */
  icon?: ReactNode;
  /** Action buttons on the right */
  actions?: ReactNode;
  /** Inline metadata chips under the subtitle */
  meta?: ReactNode;
}

/**
 * Shared page header used by cockpit-styled screens.
 * Matches the greeting row pattern from Dashboard.tsx.
 */
export function PageHeader({ eyebrow, title, subtitle, icon, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_1px_hsl(var(--primary)/0.55)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </span>
          </div>
        )}
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
            {meta && <div className="mt-1 flex flex-wrap items-center gap-1.5">{meta}</div>}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

interface StatStripProps {
  items: { label: string; value: ReactNode; sub?: ReactNode }[];
}

/**
 * Horizontal strip of compact stats under a PageHeader.
 * Visually consistent with the HeroValueCard KPI row.
 */
export function StatStrip({ items }: StatStripProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={i}>
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
            {item.label}
          </div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight">
            {item.value}
          </div>
          {item.sub && <div className="mt-0.5 text-xs text-muted-foreground">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
