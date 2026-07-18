import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  iconClassName?: string;
  className?: string;
  compact?: boolean;
  eyebrow?: string;
}

/**
 * Padronized empty state for lists, search results, feature gating, and zero data.
 *
 * Usage:
 *   <EmptyState
 *     icon={Inbox}
 *     title="Nenhum alerta cadastrado"
 *     description="Crie seu primeiro alerta pra acompanhar oportunidades em tempo real."
 *     actionLabel="Criar alerta"
 *     onAction={() => setOpen(true)}
 *   />
 *
 *   <EmptyState
 *     icon={Lock}
 *     title="Feature exclusiva Pro"
 *     description="Faça upgrade para acessar análise avançada."
 *     eyebrow="Plano Pro"
 *     actionLabel="Ver planos"
 *     actionHref="/assinatura"
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  iconClassName,
  className,
  compact = false,
  eyebrow,
}: EmptyStateProps) {
  const handleClick = () => {
    if (actionHref) {
      window.location.href = actionHref;
    } else if (onAction) {
      onAction();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-6',
        'rounded-xl border border-dashed border-border/60 bg-background/40',
        className,
      )}
    >
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 blur-[3px]" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          {eyebrow}
        </div>
      )}
      <div
        className={cn(
          'grid place-items-center rounded-2xl border border-border/60 bg-muted/40 mb-4',
          compact ? 'h-12 w-12' : 'h-14 w-14',
        )}
      >
        <Icon
          className={cn(
            'text-muted-foreground/80',
            compact ? 'h-5 w-5' : 'h-6 w-6',
            iconClassName,
          )}
        />
      </div>
      <h3
        className={cn(
          'font-semibold text-foreground mb-1.5',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-muted-foreground max-w-xs leading-relaxed',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {description}
      </p>
      {actionLabel && (onAction || actionHref) && (
        <Button
          onClick={handleClick}
          size={compact ? 'sm' : 'default'}
          className={cn('mt-4', compact && 'h-8 text-xs')}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
