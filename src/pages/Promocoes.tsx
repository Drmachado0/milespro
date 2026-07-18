/**
 * Promocoes — TIER-03 / D-13 personalized transfer-promotion alerts.
 *
 * Phase 2 W2b (Plan 02-06). Reads from public.user_promo_alerts (populated
 * by the nightly compute-personalized-promos edge function) and renders a
 * card per actionable promotion. Free users are redirected to /assinatura
 * (the RLS-level gate already blocks SELECT for non-Pro plans; the client
 * redirect is purely UX so the user doesn't see an empty page).
 *
 * Telemetry: trackPromotionAlertShown fires once per alert on first paint,
 * trackPromotionAlertClicked fires on "Ver detalhes". Both helpers come from
 * the useTelemetry chokepoint (W1b) — direct posthog.track() calls are
 * forbidden by the W1b convention.
 */

import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useTelemetry } from '@/hooks/useTelemetry';
import { logger } from '@/lib/logger';

interface PromoAlert {
  id: string;
  promo_id: string;
  from_program: string;
  to_program: string;
  bonus_pct: number;
  balance_in_from: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  dismissed_at: string | null;
}

// Per-program "Ver detalhes" target. Some loyalty programs change their
// transfer-page URLs every few months as part of redesigns, so we keep a
// `home` fallback for every entry — if a `transfer` deep link ever 404s,
// the homepage is still useful to the user. The Google-search final
// fallback only fires for programs we have zero info for.
type ProgramLinks = { transfer?: string; home: string };
const PROGRAM_TRANSFER_INFO: Record<string, ProgramLinks> = {
  'Livelo':     { transfer: 'https://www.livelo.com.br/transferir-pontos',                   home: 'https://www.livelo.com.br' },
  'Esfera':     { transfer: 'https://www.esfera.com.vc/transferencia-de-pontos',             home: 'https://www.esfera.com.vc' },
  'Smiles':     { transfer: 'https://www.smiles.com.br/transferencia-pontos',                home: 'https://www.smiles.com.br' },
  'TudoAzul':   { transfer: 'https://www.voeazul.com.br/tudoazul/transferencia',             home: 'https://www.voeazul.com.br/tudoazul' },
  'Latam Pass': { transfer: 'https://www.latampass.latam.com/transferir-pontos',             home: 'https://www.latampass.latam.com' },
  'Iupp':       {                                                                            home: 'https://www.iupp.com.br' },
};

function transferTarget(fromProgram: string, toProgram: string): string {
  const info = PROGRAM_TRANSFER_INFO[fromProgram];
  if (info?.transfer) return info.transfer;
  if (info?.home) return info.home;
  return `https://www.google.com/search?q=${encodeURIComponent(
    `transferir ${fromProgram} para ${toProgram} bonus`,
  )}`;
}

export default function Promocoes() {
  const { user } = useAuth();
  const { canAccessPro, isLoading } = useSubscription();
  const telemetry = useTelemetry();
  const qc = useQueryClient();

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<PromoAlert[]>({
    queryKey: ['user_promo_alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_promo_alerts')
        .select('*')
        .is('dismissed_at', null)
        .order('bonus_pct', { ascending: false });
      if (error) {
        logger.warn('[promocoes] read failed', error.message);
        return [];
      }
      return (data ?? []) as PromoAlert[];
    },
    enabled: !!user && canAccessPro,
  });

  // Telemetry: fire trackPromotionAlertShown for each alert on first render.
  useEffect(() => {
    if (!alertsLoading && alerts.length > 0) {
      alerts.forEach((a) => {
        telemetry.trackPromotionAlertShown({
          fromProgram: a.from_program,
          toProgram: a.to_program,
          bonusPct: Number(a.bonus_pct),
        });
      });
    }
    // intentionally narrow deps to avoid re-firing per re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length, alertsLoading]);

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_promo_alerts')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_promo_alerts'] });
      toast.success('Promoção dispensada.');
    },
    onError: (err: Error) => {
      toast.error(`Não foi possível dispensar: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Promoções">
        <p className="p-8 text-muted-foreground">Carregando…</p>
      </DashboardLayout>
    );
  }

  // Path C / TIER-03 client redirect — RLS already blocks the SELECT, but
  // sending Free users to /assinatura beats an empty grid.
  if (!canAccessPro) {
    return <Navigate to="/assinatura" replace />;
  }

  return (
    <DashboardLayout title="Promoções">
      <div className="space-y-6 pb-8">
        <PageHeader
          eyebrow="Oportunidades"
          icon={<Sparkles className="h-5 w-5" />}
          title="Promoções de transferência"
          subtitle="Avisamos quando seus programas têm bônus relevantes para o seu perfil"
        />

        {alertsLoading && (
          <p className="text-muted-foreground">Buscando promoções para você…</p>
        )}

        {!alertsLoading && alerts.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>Nenhuma promoção ativa para os seus programas no momento.</p>
              <p className="mt-2 text-sm">
                Voltamos aqui assim que aparecer um bônus que faça sentido para o seu saldo.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {alerts.map((a) => {
            const bonusLabel = `+${Number(a.bonus_pct).toLocaleString('pt-BR')}% bônus`;
            const endsAtLabel = a.ends_at
              ? new Date(a.ends_at).toLocaleDateString('pt-BR')
              : null;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">
                    {a.from_program.toUpperCase()} → {a.to_program.toUpperCase()}: {bonusLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {a.balance_in_from !== null && a.balance_in_from > 0 && (
                    <p>
                      Seu saldo em {a.from_program}:{' '}
                      <strong>{Number(a.balance_in_from).toLocaleString('pt-BR')} pts</strong>
                    </p>
                  )}
                  {endsAtLabel && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Termina em {endsAtLabel}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        telemetry.trackPromotionAlertClicked({
                          fromProgram: a.from_program,
                          toProgram: a.to_program,
                          bonusPct: Number(a.bonus_pct),
                        });
                        window.open(
                          transferTarget(a.from_program, a.to_program),
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }}
                    >
                      Ver detalhes
                    </Button>
                    <Button
                      variant="outline"
                      disabled={dismiss.isPending}
                      onClick={() => dismiss.mutate(a.id)}
                    >
                      Dispensar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
