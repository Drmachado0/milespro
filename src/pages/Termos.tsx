import { Suspense, lazy } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { AlertTriangle } from 'lucide-react';

const FooterSection = lazy(() =>
  import('@/components/landing/AnimatedSections').then((m) => ({ default: m.FooterSection }))
);

const LAST_UPDATED = '19 de abril de 2026';

export default function Termos() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Termos de Uso
          </h1>
          <p className="text-sm text-muted-foreground">
            Última atualização: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 mb-10 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este documento é um modelo inicial. Antes da publicação definitiva, recomenda-se
            revisão por advogado especializado em direito digital e contratos SaaS.
          </p>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao criar uma conta ou utilizar o MilesPro (&quot;Serviço&quot;), você concorda
            integralmente com estes Termos de Uso. Se não concordar com qualquer cláusula,
            não utilize o Serviço.
          </p>

          <h2>2. Descrição do serviço</h2>
          <p>
            O MilesPro é uma plataforma SaaS para gestão de milhas aéreas e pontos de
            programas de fidelidade. Oferecemos dashboard consolidado, simuladores de
            comparação entre milhas e dinheiro, alertas de vencimento, relatórios para
            Imposto de Renda e, nos planos pagos, gestão familiar (até 5 usuários) e módulo
            completo para agentes de viagens.
          </p>
          <p>
            <strong>O MilesPro não tem acesso às contas do usuário nos programas de
            fidelidade.</strong> Todos os saldos e operações são inseridos manualmente ou
            importados via CSV pelo próprio usuário. Nunca solicitamos senhas de programas.
          </p>

          <h2>3. Conta e elegibilidade</h2>
          <p>
            Para utilizar o Serviço, o usuário deve ter ao menos 18 anos (ou ser
            emancipado) e fornecer informações verdadeiras no cadastro. O usuário é
            responsável por manter a confidencialidade de suas credenciais e por todas as
            atividades realizadas em sua conta.
          </p>

          <h2>4. Assinatura, preços e cobrança</h2>
          <p>
            O MilesPro oferece plano Gratuito com limitações e planos pagos (Pro e VIP) nos ciclos mensal, semestral e anual. O plano Pro oferece{' '}
            <strong>7 dias de trial gratuito, com cartão de crédito requerido</strong> (a
            cobrança é feita automaticamente ao fim do 7º dia, com possibilidade de
            cancelamento a qualquer momento antes disso pela área de assinatura). Ao fim do
            trial, o usuário pode optar por permanecer assinante Pro ou retornar ao plano
            Gratuito.
          </p>
          <p>
            Preços podem ser reajustados mediante aviso prévio de 30 dias aos usuários
            ativos. Cobranças recorrentes são processadas via Asaas (gateway brasileiro
            certificado PCI DSS), com opções de Pix, Cartão de Crédito e Boleto.
          </p>
          <p id="garantia">
            <strong>Garantia incondicional de 7 dias após a primeira cobrança:</strong> caso
            queira cancelar e receber reembolso, envie um email para{' '}
            <a href="mailto:dpo@milespro.net.br" className="text-primary underline">
              dpo@milespro.net.br
            </a>{' '}
            dentro de 7 dias da primeira cobrança e processaremos manualmente. Após esse
            período, a assinatura segue até o fim do ciclo pago (sem reembolso pro-rata).
          </p>

          <h2>5. Cancelamento</h2>
          <p>
            A assinatura pode ser cancelada a qualquer momento, diretamente pelo app, sem
            multas ou burocracia. Após o cancelamento, o usuário mantém acesso até o fim
            do período já pago. Dados ficam disponíveis para exportação por 30 dias após
            o cancelamento, sendo então deletados de acordo com a Política de Privacidade.
          </p>

          <h2>6. Uso aceitável</h2>
          <p>O usuário compromete-se a não:</p>
          <ul>
            <li>Usar o Serviço para atividades ilegais ou que violem termos de terceiros
              (por exemplo, regras dos programas de fidelidade);</li>
            <li>Compartilhar credenciais de acesso;</li>
            <li>Tentar acessar dados de outros usuários;</li>
            <li>Fazer engenharia reversa, scraping massivo ou sobrecarga intencional dos
              servidores;</li>
            <li>Utilizar a plataforma para venda de milhas fora dos limites legais e das
              regras dos próprios programas.</li>
          </ul>

          <h2>7. Módulo Multi-CPF (plano VIP)</h2>
          <p>
            O módulo Multi-CPF é uma funcionalidade profissional do plano VIP destinada a
            quem gerencia milhas para múltiplos titulares (família ou clientes). O usuário
            declara ser o legítimo responsável pelos dados de terceiros cadastrados e
            compromete-se a cumprir a LGPD em relação a esses terceiros, obtendo os
            consentimentos necessários.
          </p>

          <h2>8. Propriedade intelectual</h2>
          <p>
            O código, marca, interface e conteúdo produzido pelo MilesPro são de
            propriedade exclusiva da empresa. Os dados inseridos pelo usuário permanecem
            de sua propriedade; o MilesPro atua apenas como processador/operador conforme
            a LGPD.
          </p>

          <h2>9. Limitação de responsabilidade</h2>
          <p>
            Os simuladores e cotações do MilesPro são ferramentas de apoio à decisão com
            base em valores de mercado e parâmetros fornecidos pelo usuário.
            <strong> Resultados reais podem variar </strong>conforme disponibilidade de
            passagens, mudanças em programas de fidelidade, câmbio e outras variáveis
            externas. O MilesPro não se responsabiliza por perdas decorrentes de decisões
            comerciais tomadas com base nas simulações.
          </p>

          <h2>10. LGPD e privacidade</h2>
          <p>
            O tratamento de dados pessoais segue nossa{' '}
            <a href="/privacidade" className="text-primary underline">
              Política de Privacidade
            </a>
            , em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2>11. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes Termos. Alterações relevantes serão comunicadas por
            email aos usuários ativos com antecedência mínima de 15 dias. O uso continuado
            do Serviço após a vigência constitui aceitação das novas condições.
          </p>

          <h2>12. Foro</h2>
          <p>
            Fica eleito o foro da comarca da sede do MilesPro para dirimir quaisquer
            controvérsias, com renúncia expressa a qualquer outro, por mais privilegiado
            que seja.
          </p>

          <h2>13. Contato</h2>
          <p>
            Dúvidas sobre estes Termos:{' '}
            <a href="mailto:suporte@milespro.net.br" className="text-primary underline">
              suporte@milespro.net.br
            </a>
          </p>
          <p>
            Para questões de privacidade e direitos do titular (LGPD):{' '}
            <a href="mailto:dpo@milespro.net.br" className="text-primary underline">
              dpo@milespro.net.br
            </a>
          </p>
        </article>
      </main>

      <Suspense fallback={null}>
        <FooterSection />
      </Suspense>
    </div>
  );
}
