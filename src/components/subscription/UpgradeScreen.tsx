import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UpgradeScreenProps {
  title?: string;
  description?: string;
  features?: string[];
  className?: string;
}

export function UpgradeScreen({ 
  title = "Funcionalidade Premium",
  description = "Faça upgrade para acessar este recurso e muito mais.",
  features = [
    "Acesso ilimitado a programas",
    "Histórico completo de operações",
    "Relatórios detalhados",
    "Exportação Excel/PDF",
    "Simuladores avançados"
  ],
  className 
}: UpgradeScreenProps) {
  const navigate = useNavigate();
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] py-12 px-6",
      className
    )}>
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-warning/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground mb-8">{description}</p>
        
        {/* Features list */}
        <div className="bg-card/50 rounded-xl border border-border/50 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Incluído no plano Plus:</span>
          </div>
          <ul className="space-y-3 text-left">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* CTA Button */}
        <Button
          size="lg"
          onClick={() => navigate('/assinatura')}
          className="w-full bg-primary hover:bg-primary text-white shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ver planos e preços
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          A partir de R$ 30,32/mês no plano anual
        </p>
      </div>
    </div>
  );
}
