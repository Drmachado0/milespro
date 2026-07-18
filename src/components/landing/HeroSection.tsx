import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProgramLogo } from '@/components/ui/program-logo';

const featuredPrograms = ['Livelo', 'Smiles', 'Azul Fidelidade', 'LatamPass', 'Esfera'];

export const HeroSection = () => {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 md:py-16 lg:py-20 px-4 bg-gradient-to-b from-primary/5 via-primary/3 to-background relative overflow-hidden">
      {/* Decorative elements - hidden on mobile for performance */}
      <div className="hidden sm:block absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="hidden sm:block absolute bottom-20 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      
      <div className="container mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Left column - Copy */}
          <div className="text-center lg:text-left animate-fade-in-up">
            {/* Eyebrow — brand orange dot + glow */}
            <div className="inline-flex items-center gap-2.5 mb-5">
              <span className="relative inline-block">
                <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="absolute inset-0 rounded-full bg-primary blur-[5px] opacity-70" aria-hidden />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                Conta grátis · Sem cartão
              </span>
            </div>
            
            {/* Main Headline - Money-focused */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 leading-tight">
              Pare de perder dinheiro com{' '}
              <span className="text-primary">milhas mal usadas</span>
            </h1>
            
            {/* Subheadline with value prop */}
            <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
              O MilesPro mostra quando emitir, transferir, vender ou comprar milhas — com saldo, custo médio, alertas e economia real em um só lugar.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')} 
                className="gap-2 shadow-lg shadow-primary/25 hover:scale-105 hover:-translate-y-0.5 transition-transform text-base"
              >
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={scrollToHowItWorks} 
                className="hover:scale-105 transition-transform"
              >
                Ver Como Funciona
              </Button>
            </div>
            
            {/* Microcopy */}
            <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center lg:justify-start mb-6">
              <Shield className="w-4 h-4 text-success" />
              Sem cartão de crédito • Plano gratuito disponível • Upgrade quando fizer sentido
            </p>
            
          </div>

          {/* Right column - Simplified Economy Card */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="relative z-10 max-w-md mx-auto lg:max-w-none">
              {/* Demo Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1 rounded-full shadow-lg shadow-primary/30">
                Demonstração
              </div>
              
              {/* Economy Card */}
              <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden mt-2">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                      <Plane className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sua economia total</p>
                      <p className="text-xs text-muted-foreground/70">Últimos 12 meses</p>
                    </div>
                  </div>
                </div>
                
                {/* Main Value */}
                <div className="px-6 py-8 text-center">
                  <p className="text-5xl md:text-6xl font-bold text-primary font-mono tabular-nums tracking-tight mb-2">
                    R$&nbsp;6.400
                  </p>
                  <p className="text-muted-foreground">
                    economizados em viagens
                  </p>
                </div>
                
                {/* Stats Row */}
                <div className="grid grid-cols-3 border-t border-border">
                  <div className="px-4 py-4 text-center border-r border-border">
                    <p className="text-lg font-semibold text-foreground font-mono tabular-nums">3</p>
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mt-1">Viagens</p>
                  </div>
                  <div className="px-4 py-4 text-center border-r border-border">
                    <p className="text-lg font-semibold text-foreground font-mono tabular-nums">62%</p>
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mt-1">Economia</p>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <p className="text-lg font-semibold text-foreground font-mono tabular-nums">85K</p>
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mt-1">Milhas</p>
                  </div>
                </div>
                
                {/* Programs Used */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 text-center">Programas utilizados</p>
                  <div className="flex items-center justify-center gap-3">
                    {featuredPrograms.map((program) => (
                      <ProgramLogo key={program} program={program} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Static decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-2xl -z-10 hidden sm:block" />
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full -z-10 hidden sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
};
