import { PlaneIcon, Clock, Calculator, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const painPoints = [
  {
    icon: PlaneIcon,
    title: 'Paga Passagem em Dinheiro',
    highlight: 'até 75% mais caro',
    description: 'Uma São Paulo → Miami em executiva custa R$ 8.500 em dinheiro, mas apenas R$ 2.100 com milhas',
  },
  {
    icon: Clock,
    title: 'Milhas Vencendo',
    highlight: 'milhares perdidos por ano',
    description: 'Quem não controla acaba perdendo pontos que custaram dinheiro para acumular. O MilesPro avisa antes de expirar',
  },
  {
    icon: Calculator,
    title: 'Não Sabe Se Vale a Pena',
    highlight: '62% de economia média',
    description: 'Sem um simulador, você não sabe quando usar milhas é melhor do que pagar em dinheiro',
  },
  {
    icon: TrendingDown,
    title: 'Milhas Paradas',
    highlight: 'poderiam ser R$ 12.000',
    description: 'Seus pontos acumulados podem virar hotéis 5 estrelas, cruzeiros e passagens de classe executiva',
  },
];

export const PainPointsSection = () => {
  const scrollToPricing = () => {
    const element = document.getElementById('pricing');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 px-4 bg-destructive/5 border-y border-destructive/10">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Você Está Perdendo Dinheiro Se...
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A maioria dos brasileiros desperdiça milhares de reais por não controlar suas milhas
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {painPoints.map((pain, index) => (
            <div 
              key={pain.title}
              className="flex flex-col items-center text-center p-5 rounded-xl bg-background border border-border hover:border-destructive/30 transition-all hover:shadow-md"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <pain.icon className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{pain.title}</h3>
              <p className="text-lg font-bold text-destructive mb-2">{pain.highlight}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{pain.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 space-y-3">
          <Button 
            size="lg" 
            onClick={scrollToPricing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-base"
          >
            Parar de Perder Dinheiro
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground">
            Comece grátis e descubra quanto suas milhas realmente valem
          </p>
        </div>
      </div>
    </section>
  );
};
