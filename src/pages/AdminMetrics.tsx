/**
 * AdminMetrics — /admin/metrics page consuming mrr-dashboard edge fn.
 *
 * Phase 2 W1b (TEL-02 / D-14). Founder-only dashboard for the internal
 * "how is MRR doing" view. Defense in depth:
 *   - Client side: query profiles.is_admin → redirect to / if false
 *   - Server side: mrr-dashboard edge fn returns 403 for non-admin
 *
 * Pre-W2a (no ASAAS_API_KEY set yet): the edge fn gracefully returns
 * mrr_total: 0 + active_subscriptions: 0. Page still renders so the
 * founder can verify the route + auth wiring before Asaas onboarding.
 *
 * Note: `is_admin` is not yet in supabase/types.ts (regenerates after
 * the 20260513120004 migration is applied via Lovable Cloud chat).
 * Until then we cast through `unknown` to avoid build breakage.
 */

import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { KPICard } from '@/components/milespro';
import { PageHeader } from '@/components/layout/PageHeader';
import { CircleDollarSign, Users } from 'lucide-react';

interface MrrPayload {
  mrr_total: number;
  mrr_by_plan: { pro: number; vip: number };
  active_subscriptions: number;
  asaas_env: 'sandbox' | 'production';
  generated_at: string;
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export default function AdminMetrics() {
  const { user } = useAuth();

  // Defense in depth: client-side admin check. The mrr-dashboard edge
  // function also enforces this server-side (403 for non-admin).
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile_is_admin', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        // Select the column via untyped builder so this compiles
        // BEFORE supabase/types.ts is regenerated with is_admin.
        .select('id, is_admin' as '*')
        .eq('id', user.id)
        .single();
      return (data as unknown as { id: string; is_admin: boolean } | null) ?? null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isAdmin = profile?.is_admin === true;

  const {
    data: mrr,
    isLoading: mrrLoading,
    error,
  } = useQuery<MrrPayload>({
    queryKey: ['mrr_dashboard'],
    queryFn: async () => {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        'mrr-dashboard',
      );
      if (invokeErr) throw invokeErr;
      return data as MrrPayload;
    },
    enabled: isAdmin,
    refetchInterval: 60_000, // refresh once per minute
  });

  if (!user || profileLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (mrrLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-sm text-muted-foreground">
          Carregando métricas…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-sm text-destructive">
          Erro ao carregar métricas: {String(error)}
        </p>
      </div>
    );
  }

  if (!mrr) return null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Métricas internas"
        meta={
          <span className="text-xs text-muted-foreground">
            Ambiente Asaas:{' '}
            <span className="font-mono tabular-nums">{mrr.asaas_env}</span> · Atualizado em{' '}
            <span className="font-mono tabular-nums">
              {new Date(mrr.generated_at).toLocaleString('pt-BR')}
            </span>
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          size="sm"
          accent="success"
          label="MRR total"
          value={`R$ ${formatBRL(mrr.mrr_total)}`}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />

        {/* MRR por plano — multi-value card; KPICard sm doesn't fit (single value). */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              MRR por plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>Pro: <span className="font-mono tabular-nums">R$ {formatBRL(mrr.mrr_by_plan.pro)}</span></div>
            <div>VIP: <span className="font-mono tabular-nums">R$ {formatBRL(mrr.mrr_by_plan.vip)}</span></div>
          </CardContent>
        </Card>

        <KPICard
          size="sm"
          accent="info"
          label="Assinaturas ativas"
          value={mrr.active_subscriptions}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
