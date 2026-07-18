import { Plane, Hotel, Ship, Car, Ticket, Bus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SavingsExample {
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  description: string;
  cashPrice: number;
  milesPrice: number;
}

const savingsExamples: SavingsExample[] = [
  {
    icon: Plane,
    category: 'Passagens Aéreas',
    description: 'São Paulo → Miami (executiva)',
    cashPrice: 15000,
    milesPrice: 3200,
  },
  {
    icon: Hotel,
    category: 'Hotéis',
    description: '5 noites em Orlando (família)',
    cashPrice: 8500,
    milesPrice: 2400,
  },
  {
    icon: Ship,
    category: 'Cruzeiros',
    description: 'Caribe 7 dias (2 adultos)',
    cashPrice: 12000,
    milesPrice: 4500,
  },
  {
    icon: Plane,
    category: 'Passagens Europa',
    description: 'São Paulo → Paris (econômica)',
    cashPrice: 5500,
    milesPrice: 1200,
  },
  {
    icon: Ticket,
    category: 'Passeios',
    description: 'Disney World 4 dias (família)',
    cashPrice: 2800,
    milesPrice: 900,
  },
  {
    icon: Hotel,
    category: 'Hotéis Premium',
    description: 'Marriott ou Hyatt 3 noites',
    cashPrice: 4500,
    milesPrice: 1200,
  },
];

// Calculate total savings
const totalSavings = savingsExamples.reduce((acc, example) => acc + (example.cashPrice - example.milesPrice), 0);

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

export const SavingsShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Quanto Você Pode Economizar?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Exemplos de economia usando milhas em vez de pagar em dinheiro — valores aproximados de 2026
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {savingsExamples.map((example, index) => {
            const savings = example.cashPrice - example.milesPrice;
            const savingsPercent = Math.round((savings / example.cashPrice) * 100);
            
            return (
              <div
                key={example.category}
                className="relative bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Savings badge */}
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[11px] font-bold font-mono tabular-nums px-3 py-1 rounded-full shadow-lg">
                  −{savingsPercent}%
                </div>

                {/* Icon and category */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 grid place-items-center rounded-xl bg-primary/10 border border-primary/15 group-hover:bg-primary/15 transition-colors">
                    <example.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{example.category}</h3>
                    <p className="text-xs text-muted-foreground">{example.description}</p>
                  </div>
                </div>

                {/* Price comparison */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Em dinheiro:</span>
                    <span className="text-muted-foreground line-through font-mono tabular-nums">
                      {formatCurrency(example.cashPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">Com milhas:</span>
                    <span className="text-emerald-500 font-bold text-lg font-mono tabular-nums">
                      {formatCurrency(example.milesPrice)}
                    </span>
                  </div>
                </div>

                {/* Savings highlight */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">Economia</span>
                    <span className="text-emerald-500 font-bold font-mono tabular-nums">
                      {formatCurrency(savings)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Savings Card — fintech, brand orange */}
        <div className="relative mt-8 rounded-2xl border border-primary/20 bg-card overflow-hidden p-8 md:p-10 text-center">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60%_70%_at_50%_0%,hsl(var(--primary)/0.16),transparent_75%)]" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="relative inline-block">
                <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="absolute inset-0 rounded-full bg-primary blur-[5px] opacity-70" aria-hidden />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Economia total potencial
              </span>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-primary font-mono tabular-nums tracking-tight mb-3">
              {formatCurrency(totalSavings)}
            </p>
            <p className="text-muted-foreground text-sm md:text-base inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary/80" aria-hidden />
              em exemplos de uso inteligente de milhas
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')} 
            className="gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/25"
          >
            Calcular Minha Economia
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            * Valores aproximados para demonstração. Resultados individuais podem variar de acordo com programas e promoções vigentes.
          </p>
        </div>
      </div>
    </section>
  );
};