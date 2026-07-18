import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/milespro';
import { CreditCard, TrendingUp, Coins, DollarSign, Loader2, Plane } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useLocalization } from '@/hooks/useLocalization';
import { PageHeader } from '@/components/layout/PageHeader';
import { toTitleCase } from '@/lib/formatters';
import type { Database } from '@/integrations/supabase/types';

type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'] & {
  holders?: { name: string | null } | null;
};
type OperationRow = Database['public']['Tables']['operations']['Row'];

interface CardSpending {
  cardId: string;
  cardName: string;
  issuerBank: string | null;
  linkedProgram: string | null;
  milesPerDollar: number;
  totalSpent: number;
  operationsCount: number;
  pointsGenerated: number;
  holderName: string | null;
}

export default function CartoesRelatorio() {
  const { formatCurrency, formatNumber } = useLocalization();
  const { user } = useAuth();

  // Fetch credit cards. Cache key + WHERE clause include user.id so a
  // tab carrying state across an account switch doesn't surface stale rows.
  const { data: creditCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['credit_cards_report', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          holders(name)
        `)
        .eq('user_id', user.id)
        .order('card_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch operations with credit card
  const { data: operations = [], isLoading: opsLoading } = useQuery({
    queryKey: ['operations_for_card_report', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .eq('user_id', user.id)
        .not('credit_card', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = cardsLoading || opsLoading;

  // Calculate spending per card
  const cardSpending: CardSpending[] = (creditCards as CreditCardRow[]).map((card) => {
    const cardOperations = (operations as OperationRow[]).filter((op) => 
      op.credit_card === card.card_name
    );
    
    const totalSpent = cardOperations.reduce((sum, op) => 
      sum + (op.total_cost || 0), 0
    );
    
    const milesPerDollar = card.miles_per_dollar || 1;
    const pointsGenerated = Math.floor(totalSpent * milesPerDollar);

    return {
      cardId: card.id,
      cardName: card.card_name,
      issuerBank: card.issuer_bank,
      linkedProgram: card.linked_program,
      milesPerDollar,
      totalSpent,
      operationsCount: cardOperations.length,
      pointsGenerated,
      holderName: card.holders?.name || null,
    };
  });

  // Calculate totals
  const totals = cardSpending.reduce(
    (acc, card) => ({
      totalSpent: acc.totalSpent + card.totalSpent,
      totalPoints: acc.totalPoints + card.pointsGenerated,
      totalOperations: acc.totalOperations + card.operationsCount,
    }),
    { totalSpent: 0, totalPoints: 0, totalOperations: 0 }
  );

  // Group by program for points summary
  const pointsByProgram = cardSpending.reduce((acc: Record<string, number>, card) => {
    if (card.linkedProgram && card.pointsGenerated > 0) {
      acc[card.linkedProgram] = (acc[card.linkedProgram] || 0) + card.pointsGenerated;
    }
    return acc;
  }, {});

  return (
    <DashboardLayout title="Relatório de Cartões">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análise"
          title="Relatório de Gastos por Cartão"
          icon={<CreditCard className="h-4 w-4" />}
        />

        {/* Summary KPIs — milespro KPICard size='sm' (was: 3 manual <Card> with text-2xl font-bold) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            size="sm"
            label="Total Gasto"
            value={formatCurrency(totals.totalSpent)}
            icon={<DollarSign className="h-5 w-5 text-primary" />}
          />
          <KPICard
            size="sm"
            accent="success"
            label="Pontos Gerados"
            value={formatNumber(totals.totalPoints)}
            icon={<Coins className="h-5 w-5" />}
          />
          <KPICard
            size="sm"
            accent="info"
            label="Operações"
            value={totals.totalOperations}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Points by Program */}
        {Object.keys(pointsByProgram).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plane className="h-5 w-5" />
                Pontos por Programa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(pointsByProgram).map(([program, points]) => (
                  <div key={program} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <ProgramLogo program={program} size="md" />
                    <div>
                      <p className="text-sm text-muted-foreground">{program}</p>
                      <p className="font-semibold text-foreground">{formatNumber(points)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Detalhes por Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cardSpending.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum cartão cadastrado.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartão</TableHead>
                    <TableHead>Titular</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead className="text-right">Milhas/USD</TableHead>
                    <TableHead className="text-right">Operações</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Pontos Gerados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardSpending.map((card) => {
                    const brand = getBrandFromName(card.cardName);
                    return (
                      <TableRow key={card.cardId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CardBrandIcon brand={brand} size="sm" />
                            <div>
                              <p className="font-medium">{card.cardName}</p>
                              {card.issuerBank && (
                                <p className="text-xs text-muted-foreground">{card.issuerBank}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {card.holderName ? toTitleCase(card.holderName) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {card.linkedProgram ? (
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={card.linkedProgram} size="sm" />
                              <span className="text-sm">{card.linkedProgram}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono tabular-nums">
                            {card.milesPerDollar}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {card.operationsCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(card.totalSpent)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-success">
                            {formatNumber(card.pointsGenerated)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          * Os pontos gerados são calculados com base no total gasto × taxa de milhas por dólar configurada em cada cartão.
        </p>
      </div>
    </DashboardLayout>
  );
}
