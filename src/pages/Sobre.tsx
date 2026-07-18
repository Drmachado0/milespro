import { Suspense, lazy } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Plane, Target, Users, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FooterSection = lazy(() =>
  import('@/components/landing/AnimatedSections').then((m) => ({ default: m.FooterSection }))
);

const values = [
  {
    icon: Target,
    title: 'Clareza antes de economia',
    description:
      'Milha é moeda — e toda moeda tem câmbio. Acreditamos que o primeiro passo pra economizar de verdade é entender o que seus pontos valem.',
  },
  {
    icon: Users,
    title: 'Família no centro',
    description:
      'A maioria das viagens que importam são em família. Por isso o MilesPro foi desenhado pra consolidar até 5 CPFs num único painel desde o início.',
  },
  {
    icon: Shield,
    title: 'Seus dados, suas regras',
    description:
      'Nunca pedimos senha de programa nenhum. Todos os dados são criptografados e cada usuário vê apenas o próprio saldo. LGPD-compliant por design.',
  },
  {
    icon: Plane,
    title: 'Viajante inteligente, não guru',
    description:
      'Sem promessas mirabolantes e sem estética de "mestre das milhas". Aqui é matemática, simulador e alerta antes de vencer. Simples assim.',
  },
];

export default function Sobre() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <header className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">
            Sobre o MilesPro
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            A planilha morreu.<br />
            <span className="text-primary">Viajantes inteligentes</span> fazem assim agora.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Somos a plataforma brasileira de gestão de milhas e pontos pensada para quem
            trata viagem como investimento — não como loteria.
          </p>
        </header>

        <section className="prose prose-slate dark:prose-invert max-w-none mb-16">
          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Nossa missão</h2>
          <p className="text-muted-foreground leading-relaxed">
            Brasileiros perdem mais de <strong>R$ 2,3 bilhões por ano</strong> em milhas que
            vencem sem aviso. E pagam passagem até 75% mais cara por não saber quando usar
            seus pontos. O MilesPro existe pra mudar essa conta — de forma prática, direta
            e sem jargão.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">O que fazemos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Consolidamos <strong>70+ programas de fidelidade</strong> (Livelo, Esfera, Smiles,
            Azul Fidelidade, LatamPass, TAP, Marriott, Hilton, Accor e dezenas de outros) num
            único dashboard. Calculamos em segundos se vale mais usar milha ou pagar em dinheiro.
            Avisamos antes dos seus pontos vencerem. Organizamos tudo para o Imposto de Renda.
            E, para agentes de viagens, incluímos um ERP completo — clientes, passagens, hotéis,
            cruzeiros, orçamentos e financeiro.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">O que oferecemos</h2>
          <ul className="text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-1" /><span><strong>70+ programas</strong> de fidelidade suportados</span></li>
            <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-1" /><span>Simulador de ROI para decidir entre milha e dinheiro</span></li>
            <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-1" /><span>Alertas antes do vencimento dos seus pontos</span></li>
            <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-1" /><span>Relatórios prontos para o Imposto de Renda</span></li>
            <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-1" /><span>ERP completo para agentes de viagens</span></li>
          </ul>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Em que acreditamos
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <value.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Teste o MilesPro por 14 dias
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Sem cartão de crédito. Sem compromisso. Só a economia de uma viagem já paga o
            MilesPro por um ano inteiro.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Começar 14 Dias Grátis
          </Button>
        </section>
      </main>

      <Suspense fallback={null}>
        <FooterSection />
      </Suspense>
    </div>
  );
}
