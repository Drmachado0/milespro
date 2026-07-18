import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OnboardingStep } from '@/data/onboardingSteps';

interface OnboardingStepItemProps {
  step: OnboardingStep;
  stepNumber: number;
  isCompleted: boolean;
  onSkip: () => void;
  onMarkComplete: () => void;
}

const STEP_TIPS: Record<string, string> = {
  holders: 'Você pode cadastrar titulares, dependentes ou clientes',
  cards: 'Quanto mais cartões, mais milhas acumuladas',
  prices: 'Defina o custo por milheiro para calcular lucro real',
  balance: 'Registre seu saldo atual para ter controle total',
  club: 'Clubes dão bônus de 30-200% nas compras',
  alerts: 'Receba alertas de promoções e vencimentos',
  first_operation: 'Operações podem ser compras, vendas ou transferências',
  vip_quota: 'Salas VIP economizam tempo e dinheiro nos aeroportos',
};

const STEP_TIME: Record<string, string> = {
  holders: '3 min',
  cards: '2 min',
  prices: '1 min',
  balance: '2 min',
  club: '2 min',
  alerts: '1 min',
  first_operation: '3 min',
  vip_quota: '2 min',
};

export const OnboardingStepItem = memo(function OnboardingStepItem({
  step,
  stepNumber,
  isCompleted,
  onSkip,
  onMarkComplete,
}: OnboardingStepItemProps) {
  const navigate = useNavigate();
  const Icon = step.icon;
  const tip = STEP_TIPS[step.id] || '';
  const time = STEP_TIME[step.id] || '2 min';

  const handleStart = () => {
    navigate(step.path);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200',
        isCompleted
          ? 'bg-primary/5 dark:bg-primary/10'
          : 'bg-muted/30 hover:bg-muted/50'
      )}
    >
      {/* Step indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300',
          isCompleted
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted border-2 border-border text-muted-foreground'
        )}
      >
        {isCompleted ? (
          <Check className="w-4 h-4" />
        ) : (
          <span className="text-sm font-semibold">{stepNumber}</span>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={cn(
            'w-4 h-4 flex-shrink-0',
            isCompleted ? 'text-primary' : 'text-muted-foreground'
          )} />
          <h4
            className={cn(
              'font-semibold text-sm sm:text-base truncate',
              isCompleted && 'text-muted-foreground'
            )}
          >
            {step.title}
          </h4>
          {step.optional && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Opcional
            </Badge>
          )}
        </div>
        
        {/* Tip - motivating value prop */}
        {tip && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
            {tip}
          </p>
        )}
        
        {/* Time estimate badge */}
        {!isCompleted && (
          <div className="flex items-center gap-1 mt-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{time}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <Sparkles className="w-3 h-3 text-warning" />
            <span className="text-xs text-muted-foreground">Fácil</span>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {isCompleted ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            <Check className="w-3 h-3 mr-1" />
            Feito
          </Badge>
        ) : step.optional ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground text-xs px-2"
            >
              Pular
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStart}
              className="gap-1 text-xs sm:text-sm"
            >
              Fazer
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleStart}
            className="gap-1 text-xs sm:text-sm"
          >
            Fazer
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
});
