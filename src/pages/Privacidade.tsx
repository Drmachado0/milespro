import { Suspense, lazy } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { AlertTriangle } from 'lucide-react';

const FooterSection = lazy(() =>
  import('@/components/landing/AnimatedSections').then((m) => ({ default: m.FooterSection }))
);

// Plan 02-02 W1a (COMPL-04 / D-17): bump on every material policy change so
// users re-consent via banner. Coordinate with CURRENT_CONSENT_VERSION in
// src/hooks/useConsent.ts when both texts change in the same release.
const LAST_UPDATED = '13 de maio de 2026';

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Política de Privacidade
          </h1>
          <p className="text-sm text-muted-foreground">
            Última atualização: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 mb-10 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este documento é um modelo inicial em conformidade com a LGPD. Antes da
            publicação definitiva, recomenda-se revisão por advogado/DPO especializado em
            proteção de dados.
          </p>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h2>1. Quem somos</h2>
          <p>
            O MilesPro é uma plataforma brasileira de gestão de milhas e pontos de
            fidelidade. Esta política descreve como coletamos, usamos, armazenamos e
            protegemos os dados pessoais dos nossos usuários, em conformidade com a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
          </p>

          <h2>2. Quais dados coletamos</h2>
          <p>Coletamos apenas o necessário para operar o Serviço:</p>
          <ul>
            <li><strong>Cadastro:</strong> nome, email e senha criptografada;</li>
            <li><strong>Titulares/familiares (opcional):</strong> nome, email e CPF dos
              membros cadastrados pelo usuário titular da conta;</li>
            <li><strong>Dados de uso:</strong> saldos por programa, operações de
              compra/venda/transferência, cartões cadastrados (apenas apelido e últimos
              dígitos), notas;</li>
            <li><strong>Dados de pagamento:</strong> processados diretamente pela Asaas
              (gateway brasileiro certificado PCI DSS); o MilesPro não armazena números
              de cartão de crédito;</li>
            <li><strong>Dados técnicos:</strong> IP, navegador, sistema operacional,
              eventos de uso agregados e anonimizados via PostHog Cloud EU
              (<strong>opt-in</strong> via banner de consentimento, desativado por padrão).</li>
          </ul>
          <p>
            <strong>O MilesPro nunca coleta senhas dos programas de fidelidade.</strong> Saldos
            e operações são inseridos manualmente ou importados via CSV pelo próprio
            usuário.
          </p>

          <h2>3. Para que usamos seus dados (finalidade)</h2>
          <ul>
            <li>Prover as funcionalidades do MilesPro (dashboard, simuladores, alertas);</li>
            <li>Processar cobranças e gerenciar assinaturas;</li>
            <li>Enviar comunicações transacionais (confirmação de cadastro, recuperação
              de senha, alertas de vencimento);</li>
            <li>Gerar relatórios fiscais (Imposto de Renda);</li>
            <li>Cumprir obrigações legais;</li>
            <li>Melhorar o produto via analytics agregado e anonimizado (apenas quando
              consentido).</li>
          </ul>

          <h2>4. Base legal (LGPD art. 7º)</h2>
          <ul>
            <li><strong>Execução de contrato</strong>: para prover o Serviço contratado;</li>
            <li><strong>Consentimento</strong>: para analytics agregado e comunicações
              de marketing (sempre com opt-out disponível);</li>
            <li><strong>Obrigação legal</strong>: para dados fiscais e contábeis;</li>
            <li><strong>Legítimo interesse</strong>: para prevenção a fraudes e
              monitoramento de erros (Sentry com PII removida antes do envio).</li>
          </ul>

          <h2>5. Compartilhamento de dados (subprocessadores)</h2>
          <p>
            Não vendemos seus dados. Compartilhamos apenas com subprocessadores estritamente
            necessários para operar o Serviço:
          </p>
          <ul>
            <li><strong>Lovable Cloud (Supabase managed)</strong>: banco de dados,
              autenticação e edge functions (região: us-east-1, vide §10 Transferência
              Internacional);</li>
            <li><strong>Asaas</strong>: processamento de pagamentos e emissão de NFS-e
              (BR, gateway certificado PCI DSS);</li>
            <li><strong>PostHog Cloud EU</strong>: product analytics agregado
              (<strong>opt-in</strong> via banner de consentimento);</li>
            <li><strong>Sentry</strong>: monitoramento de erros (com PII removida antes
              do envio: CPF e email são redatados via beforeSend regex);</li>
            <li><strong>Resend</strong>: entrega de emails transacionais (boas-vindas,
              recuperação de senha, recibos, comunicações DPO);</li>
            <li><strong>Crisp</strong>: helpdesk live-chat (armazena histórico de chat
              na União Europeia);</li>
            <li><strong>Google Calendar API</strong>: somente se o usuário do módulo
              Multi-CPF optar por sincronizar sua agenda.</li>
          </ul>

          <h2>6. Segurança</h2>
          <ul>
            <li>Criptografia SSL 256-bit em trânsito;</li>
            <li>Criptografia em repouso no banco de dados;</li>
            <li>Row Level Security (RLS): cada usuário vê apenas seus próprios dados;</li>
            <li>Hashing de senhas com algoritmos padrão de mercado;</li>
            <li>Acesso administrativo restrito e auditado.</li>
          </ul>

          <h2 id="lgpd">7. Seus direitos como titular (LGPD art. 18)</h2>
          <p>Você tem direito, a qualquer momento, a:</p>
          <ul>
            <li>Confirmação da existência de tratamento;</li>
            <li>Acesso aos seus dados (exportação JSON disponível via endpoint
              auto-serviço, máximo 1 export por hora);</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados
              em desconformidade;</li>
            <li>Portabilidade dos dados;</li>
            <li>Eliminação dos dados tratados com base em consentimento (com janela de
              7 dias para cancelamento da exclusão, vide §8);</li>
            <li>Informação sobre entidades com quem seus dados foram compartilhados;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer qualquer direito, basta enviar email para{' '}
            <a href="mailto:dpo@milespro.net.br" className="text-primary underline">
              dpo@milespro.net.br
            </a>
            . Responderemos em até 15 dias úteis (LGPD art. 18 §1).
          </p>

          <h2>8. Retenção e exclusão de dados</h2>
          <p>
            Mantemos os dados enquanto a conta estiver ativa. Após solicitação de
            exclusão, o fluxo é:
          </p>
          <ol>
            <li>Você solicita a exclusão na área de Configurações;</li>
            <li>Recebe email de confirmação (link válido por 24 horas);</li>
            <li>Ao confirmar, inicia-se uma <strong>janela de 7 dias para
              cancelamento</strong>, você pode escrever para
              {' '}<a href="mailto:dpo@milespro.net.br" className="text-primary underline">dpo@milespro.net.br</a>{' '}
              dentro do prazo para reverter;</li>
            <li>Após o 7º dia, um processo automático diário (04:00 UTC) executa a
              exclusão definitiva em todos os subprocessadores e gera um registro de
              auditoria (apenas timestamps + contagem de registros, sem dados pessoais).</li>
          </ol>
          <p>
            Registros que precisamos manter por obrigação legal (fiscal, contábil) ficam
            anonimizados pelo período legalmente exigido.
          </p>

          <h2>9. Cookies e consentimento granular</h2>
          <p>
            Utilizamos cookies essenciais para manter sua sessão ativa. Para analytics
            (PostHog) e marketing por email, pedimos consentimento granular via banner
            (LGPD art. 8 §4: checkboxes separadas, nunca pré-marcadas). Você pode
            desabilitar cookies nas configurações do seu navegador, mas algumas
            funcionalidades podem deixar de funcionar corretamente.
          </p>

          <h2>10. Transferência internacional</h2>
          <p>
            Alguns subprocessadores armazenam dados fora do Brasil: Asaas (BR), Google
            (US), PostHog (EU), Sentry (US), Resend (US), Lovable Cloud/Supabase (US,
            us-east-1).
          </p>
          <p>
            Para transferências BR→US (Supabase/Lovable Cloud, Sentry, Resend),
            aplicamos as <strong>Cláusulas Contratuais Padrão (Standard Contractual
            Clauses, SCC)</strong> conforme orientação da ANPD para transferências
            internacionais sob LGPD art. 33. O nível de proteção das suas informações
            é equivalente ao garantido pela LGPD.
          </p>
          <p>
            Para transferências BR→EU (PostHog Cloud EU, Crisp), o GDPR já garante
            nível de proteção compatível com a LGPD por avaliação da ANPD.
          </p>

          <h2>11. Alterações nesta política</h2>
          <p>
            Alterações relevantes serão comunicadas por email aos usuários ativos com
            antecedência mínima de 15 dias. Quando o texto mudar materialmente, o banner
            de consentimento solicitará nova aceitação.
          </p>

          <h2>12. Encarregado (DPO) e contato</h2>
          <p>
            Para qualquer questão relacionada à proteção de dados:{' '}
            <a href="mailto:dpo@milespro.net.br" className="text-primary underline">
              dpo@milespro.net.br
            </a>
          </p>

          <h2>13. Designação do DPO</h2>
          <p>
            <strong>DPO designado:</strong> founder, contato{' '}
            <a href="mailto:dpo@milespro.net.br" className="text-primary underline">
              dpo@milespro.net.br
            </a>
            . Responde em até 15 dias úteis a solicitações de direitos do titular
            (LGPD art. 18). Para casos urgentes ou suspeita de incidente de segurança,
            inclua a palavra <strong>URGENTE</strong> no assunto do email.
          </p>
        </article>
      </main>

      <Suspense fallback={null}>
        <FooterSection />
      </Suspense>
    </div>
  );
}
