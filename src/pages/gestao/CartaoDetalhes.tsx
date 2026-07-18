import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';
import { DataTable, type DataTableColumn } from '@/components/milespro';
import type { Database } from '@/integrations/supabase/types';

type OperationRow = Database['public']['Tables']['operations']['Row'];

const statusStyles: Record<string, string> = {
  confirmado: 'bg-success/15 text-success border-success/30',
  pendente: 'bg-warning/15 text-warning border-warning/30',
  recebido: 'bg-info/15 text-info border-info/30',
  cancelado: 'bg-destructive/15 text-destructive border-destructive/30',
};

const typeLabels: Record<string, string> = {
  compra: 'Compra',
  venda: 'Venda',
  transferencia: 'Transferência',
  bumerangue: 'Bumerangue',
  entrada_manual: 'Entrada Manual',
  compra_turbinada: 'Compra Turbinada',
  resgate: 'Resgate',
};

export default function CartaoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency, formatNumber, formatDate } = useLocalization();

  const { data: cartao, isLoading: cartaoLoading } = useQuery({
    queryKey: ['credit_card', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          holders(name, cpf, email)
        `)
        .eq('id', id ?? '')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: operations = [], isLoading: operationsLoading } = useQuery({
    queryKey: ['card_operations', id, cartao?.card_name],
    queryFn: async () => {
      if (!cartao?.card_name) return [];
      
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('credit_card', cartao.card_name)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!cartao?.card_name,
  });

  const formatDateStr = (dateStr: string) => {
    return formatDate(new Date(dateStr));
  };

  if (cartaoLoading) {
    return (
      <DashboardLayout title="Detalhes do Cartão">
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!cartao) {
    return (
      <DashboardLayout title="Cartão não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Cartão não encontrado.</p>
          <Button onClick={() => navigate('/gestao/cartoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cartões
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Detalhes do Cartão">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/gestao/cartoes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Cartões
        </Button>

        <PageHeader
          eyebrow="Cartão"
          title={cartao.card_name}
          subtitle={
            cartao.last_four_digits
              ? `**** ${cartao.last_four_digits}`
              : undefined
          }
          icon={<CreditCard className="h-4 w-4" />}
        />

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Titular</p>
                  <p className="font-medium">{cartao.holders?.name || 'Não associado'}</p>
                </div>
              </div>
              {cartao.cardholder_name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Nome no cartão</p>
                    <p className="font-medium">{cartao.cardholder_name}</p>
                  </div>
                </div>
              )}
              {cartao.expiry_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Validade</p>
                    <p className="font-medium font-mono tabular-nums">{cartao.expiry_date}</p>
                  </div>
                </div>
              )}
              {cartao.billing_day && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Dia de vencimento</p>
                    <p className="font-medium">
                      Dia <span className="font-mono tabular-nums">{cartao.billing_day}</span>
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium font-mono tabular-nums">{formatDateStr(cartao.created_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Operações — milespro DataTable: sort por qualquer coluna +
            search por programa/tipo + paginação automática (default 10/page). */}
        {operationsLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <DataTable
            title="Histórico de Operações"
            countLabel={`${operations.length} ${operations.length === 1 ? 'operação' : 'operações'}`}
            rows={operations as OperationRow[]}
            rowKey={(row) => row.id}
            pageSize={15}
            searchPlaceholder="Buscar programa ou tipo…"
            emptyState="Nenhuma operação encontrada para este cartão."
            columns={[
              {
                key: 'date',
                header: 'Data',
                sortable: true,
                render: (row) => <span className="font-mono tabular-nums">{formatDateStr(row.date)}</span>,
              },
              {
                key: 'program',
                header: 'Programa',
                sortable: true,
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <ProgramLogo program={row.program} size="sm" />
                    <span>{row.program}</span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Tipo',
                sortable: true,
                render: (row) => typeLabels[row.type] || row.type,
              },
              {
                key: 'quantity',
                header: 'Quantidade',
                numeric: true,
                sortable: true,
                render: (row) => formatNumber(row.quantity, 0),
              },
              {
                key: 'total_cost',
                header: 'Custo Total',
                numeric: true,
                sortable: true,
                render: (row) => formatCurrency(row.total_cost || 0),
              },
              {
                key: 'installments',
                header: 'Parcelas',
                sortable: true,
                render: (row) => <span className="font-mono tabular-nums">{row.installments || 1}x</span>,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (row) => (
                  <Badge variant="outline" className={statusStyles[row.status] || ''}>
                    {row.status}
                  </Badge>
                ),
              },
            ] satisfies DataTableColumn<OperationRow>[]}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
