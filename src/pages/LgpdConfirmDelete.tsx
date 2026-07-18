/**
 * LgpdConfirmDelete — confirmation landing for the lgpd-delete email link
 * (COMPL-02 / D-18 step 4).
 *
 * Route: /lgpd/confirm?token=...
 *
 * Authenticated user (JWT-protected via the parent <ProtectedRoute>) clicks the
 * link in the deletion-confirmation email. On mount this page POSTs the token
 * to the lgpd-delete edge function with action=confirm. The token is HMAC-bound
 * to the user.id so the only way to confirm a deletion is to (a) be logged in
 * as the user AND (b) hold a valid token (which only exists in the inbox of
 * that user's email address — out-of-band 2nd factor).
 *
 * Three render states: loading / confirmed (success) / error.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { logger } from '@/lib/logger';

type State =
  | { status: 'loading' }
  | { status: 'confirmed'; hardDeleteAfter: string }
  | { status: 'error'; reason: string };

interface ConfirmResponse {
  status?: string;
  hard_delete_after?: string;
  error?: string;
}

export default function LgpdConfirmDelete() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setState({ status: 'error', reason: 'Link inválido (token ausente).' });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke<ConfirmResponse>(
          'lgpd-delete',
          {
            body: { action: 'confirm', token },
            method: 'POST',
          },
        );
        if (cancelled) return;
        if (error) {
          logger.warn('[LgpdConfirmDelete] invoke error', error.message);
          setState({
            status: 'error',
            reason:
              'Não foi possível confirmar a exclusão. O link pode ter expirado (válido por 24h) ou já ter sido usado. Solicite uma nova exclusão em Configurações.',
          });
          return;
        }
        if (data?.status === 'confirmed' && data.hard_delete_after) {
          setState({ status: 'confirmed', hardDeleteAfter: data.hard_delete_after });
          return;
        }
        setState({
          status: 'error',
          reason: data?.error ?? 'Resposta inesperada do servidor.',
        });
      } catch (err) {
        if (cancelled) return;
        logger.warn('[LgpdConfirmDelete] unexpected error', err);
        setState({
          status: 'error',
          reason:
            'Erro inesperado. Tente novamente ou escreva para dpo@milespro.net.br.',
        });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto max-w-xl px-4 py-16">
        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          {state.status === 'loading' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                Confirmando exclusão…
              </h1>
              <p className="text-sm text-muted-foreground">
                Estamos validando seu link. Isso leva apenas alguns segundos.
              </p>
            </div>
          )}

          {state.status === 'confirmed' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h1 className="text-2xl font-semibold text-foreground">
                Exclusão confirmada
              </h1>
              <p className="text-sm text-muted-foreground">
                A janela de cancelamento de 7 dias começou agora. Seus dados serão
                excluídos definitivamente após{' '}
                <strong>
                  {new Date(state.hardDeleteAfter).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                Mudou de ideia? Escreva para{' '}
                <a
                  href="mailto:dpo@milespro.net.br"
                  className="font-medium text-primary underline"
                >
                  dpo@milespro.net.br
                </a>{' '}
                antes do prazo para cancelar a exclusão.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Voltar para o início</Link>
              </Button>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-12 w-12 text-warning" />
              <h1 className="text-2xl font-semibold text-foreground">
                Não foi possível confirmar
              </h1>
              <p className="text-sm text-muted-foreground">{state.reason}</p>
              <p className="text-sm text-muted-foreground">
                Dúvidas? Escreva para{' '}
                <a
                  href="mailto:dpo@milespro.net.br"
                  className="font-medium text-primary underline"
                >
                  dpo@milespro.net.br
                </a>
                .
              </p>
              <Button asChild variant="outline">
                <Link to="/configuracoes">Ir para Configurações</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
