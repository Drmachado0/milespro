import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  accentColor?: 'primary' | 'emerald' | 'amber' | 'blue';
}

const accentStyles = {
  primary: {
    ring: 'ring-primary/10',
    gradient: 'from-primary/8 via-primary/4 to-transparent',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  emerald: {
    ring: 'ring-success/10',
    gradient: 'from-success/8 via-success/4 to-transparent',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  amber: {
    ring: 'ring-warning/10',
    gradient: 'from-warning/8 via-warning/4 to-transparent',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  blue: {
    ring: 'ring-info/10',
    gradient: 'from-info/8 via-info/4 to-transparent',
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
  },
};

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className,
  accentColor = 'primary'
}: KPICardProps) {
  const styles = accentStyles[accentColor];
  
  return (
    <Card className={cn(
      'relative overflow-hidden group ring-1 card-hover',
      styles.ring,
      className
    )}>
      {/* Gradient overlay */}
      <div 
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none',
          styles.gradient
        )} 
      />
      
      <CardContent className="relative z-10 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1 mb-2">
              {title}
            </p>
            <div className="font-mono text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tabular-nums tracking-tight truncate">
              {value}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-2">
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
              {trend && (
                <span className={cn(
                  'text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full w-fit',
                  trend.positive 
                    ? 'text-success bg-success dark:text-success dark:bg-success/20' 
                    : 'text-destructive bg-destructive/10'
                )}>
                  {trend.positive ? '↑' : '↓'} {trend.value}
                </span>
              )}
            </div>
          </div>
          
          {/* Icon with micro-interaction */}
          <div className={cn(
            'h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-transform duration-300 group-hover:rotate-3',
            styles.iconBg
          )}>
            <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
