import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Crown, Star, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  message?: string;
  targetPlan?: 'pro' | 'vip';
}

export function UpgradePrompt({
  open,
  onOpenChange,
  feature = 'este recurso',
  message,
  targetPlan = 'pro'
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const { plan, limits, remainingOperations } = useSubscription();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/assinatura');
  };

  const getDefaultMessage = () => {
    if (remainingOperations === 0) {
      return `Você atingiu o limite de ${limits.maxOperationsPerMonth} operações/mês do plano gratuito.`;
    }
    return `O ${feature} está disponível apenas para planos superiores.`;
  };

  // Determine recommended plan based on current plan and target.
  // If caller explicitly targets VIP, OR if the user is already Pro (so the only
  // upgrade left is VIP), recommend VIP. Otherwise recommend Pro.
  const getRecommendedPlan = () => {
    if (targetPlan === 'vip' || plan === 'pro') {
      return { name: 'VIP', Icon: Crown };
    }
    return { name: 'Pro', Icon: Zap };
  };

  const { name: recommendedPlanName, Icon: RecommendedIcon } = getRecommendedPlan();

  const getFeaturesList = () => {
    if (targetPlan === 'vip' || plan === 'pro') {
      return [
        '✓ Até 5 perfis (família ou clientes)',
        '✓ Login individual para cada membro',
        '✓ Dashboards focados em lucro',
        '✓ Relatórios com exportação CSV/Excel',
        '✓ Suporte prioritário via WhatsApp',
      ];
    }
    return [
      '✓ Operações ilimitadas',
      '✓ 70+ programas de fidelidade',
      '✓ Simuladores e projeções',
      '✓ Alertas completos de vencimento',
      '✓ Suporte por e-mail em 24h',
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Star className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Faça upgrade para continuar</DialogTitle>
          <DialogDescription className="text-center">
            {message || getDefaultMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <RecommendedIcon className="h-5 w-5 text-primary" />
            <span className="font-semibold">Plano {recommendedPlanName} recomendado</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-8">
            {getFeaturesList().map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Agora não
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary text-white"
          >
            Ver planos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
