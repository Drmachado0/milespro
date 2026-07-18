import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Gift, Check, Clock, Calendar, Loader2, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/hooks/useLocalization';
import { toast } from 'sonner';
import { ProgramLogo } from '@/components/ui/program-logo';
import { toTitleCase } from '@/lib/formatters';
import { logger } from '@/lib/logger';

type StatusFilter = 'todos' | 'pendente' | 'atrasado' | 'confirmado';

export default function BonusPendentes() {
  const { formatNumber, formatDate } = useLocalization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [programFilter, setProgramFilter] = useState<string>('todos');

  // Fetch pending bonuses. Defense in depth: even though RLS scopes the
  // table to the caller, every other reader in the codebase (useOperations,
  // useProgramBalances) carries an explicit user_id filter — and the query
  // key was missing user.id too, which leaked cache between accounts on the
  // same tab.
  const { data: pendingBonuses = [], isLoading } = useQuery({
    queryKey: ['pending_bonuses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pending_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .order('expected_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation to confirm a bonus. Both UPDATEs scope by user_id as belt-and-
  // suspenders against RLS misconfiguration. Cache invalidation now also
  // hits ['operations_infinite'] (the paginated reader used by tables like
  // PassagemEmitida) so the new confirmado status surfaces immediately.
  const confirmBonus = useMutation({
    mutationFn: async (bonusId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('pending_bonuses')
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', bonusId)
        .eq('user_id', user.id);

      if (error) throw error;

      const bonus = pendingBonuses.find(b => b.id === bonusId);
      if (bonus?.operation_id) {
        await supabase
          .from('operations')
          .update({ status: 'confirmado' })
          .eq('id', bonus.operation_id)
          .eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_bonuses', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['operations_infinite'] });
      queryClient.invalidateQueries({ queryKey: ['program_balances'] });
      toast.success('Bônus confirmado com sucesso!');
      setConfirmingId(null);
    },
    onError: (error) => {
      logger.error('Error confirming bonus:', error);
      toast.error('Erro ao confirmar bônus');
    },
  });

  const isOverdue = (date: string, confirmed: boolean) => {
    return new Date(date + 'T00:00:00') < new Date() && !confirmed;
  };

  const getStatus = useCallback((bonus: typeof pendingBonuses[0]): 'confirmado' | 'atrasado' | 'pendente' => {
    if (bonus.confirmed) return 'confirmado';
    if (isOverdue(bonus.expected_date, bonus.confirmed)) return 'atrasado';
    return 'pendente';
  }, []);

  // Get unique programs for filter
  const uniquePrograms = useMemo(() => {
    const programs = new Set(pendingBonuses.map(b => b.program));
    return Array.from(programs).sort();
  }, [pendingBonuses]);

  // Filtered bonuses
  const filteredBonuses = useMemo(() => {
    return pendingBonuses.filter(bonus => {
      const status = getStatus(bonus);
      const matchesStatus = statusFilter === 'todos' || status === statusFilter;
      const matchesProgram = programFilter === 'todos' || bonus.program === programFilter;
      return matchesStatus && matchesProgram;
    });
  }, [pendingBonuses, statusFilter, programFilter, getStatus]);

  const pendingCount = pendingBonuses.filter(b => !b.confirmed).length;
  const confirmedCount = pendingBonuses.filter(b => b.confirmed).length;
  const overdueCount = pendingBonuses.filter(b => isOverdue(b.expected_date, b.confirmed)).length;
  const totalPoints = pendingBonuses.filter(b => !b.confirmed).reduce((acc, b) => acc + b.quantity, 0);

  const getDaysUntil = (date: string) => {
    const target = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <DashboardLayout title="Bônus Pendentes">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão"
          icon={<Gift className="h-5 w-5" />}
          title="Bônus Pendentes"
          subtitle="Acompanhe bônus de transferência ainda não creditados pelos programas"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                Bônus Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">{pendingCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                Bônus Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-destructive" />
                <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">{overdueCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                Pontos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">{formatNumber(totalPoints)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.14em]">
                Bônus Confirmados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">{confirmedCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[140px] sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Programa:</span>
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="w-[140px] sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {uniquePrograms.map(program => (
                      <SelectItem key={program} value={program}>
                        <div className="flex items-center gap-2">
                          <ProgramLogo program={program} size="sm" />
                          <span>{program}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(statusFilter !== 'todos' || programFilter !== 'todos') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('todos');
                    setProgramFilter('todos');
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Histórico de Bônus
              {filteredBonuses.length !== pendingBonuses.length && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredBonuses.length} de {pendingBonuses.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBonuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{pendingBonuses.length === 0 ? 'Nenhum bônus registrado' : 'Nenhum bônus encontrado com os filtros selecionados'}</p>
                <p className="text-sm">{pendingBonuses.length === 0 ? 'Registre compras turbinadas para acompanhar os bônus' : 'Tente ajustar os filtros'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Programa</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBonuses.map((bonus) => {
                      const daysUntil = getDaysUntil(bonus.expected_date);
                      const overdue = isOverdue(bonus.expected_date, bonus.confirmed);
                      
                      return (
                        <TableRow key={bonus.id} className={overdue ? 'bg-warning/10' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ProgramLogo program={bonus.program} size="sm" />
                              <span>{bonus.program}</span>
                            </div>
                          </TableCell>
                          <TableCell>{bonus.holder_name ? toTitleCase(bonus.holder_name) : '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={bonus.produto || ''}>
                            {bonus.produto || '-'}
                          </TableCell>
                          <TableCell>{bonus.loja || '-'}</TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {formatNumber(bonus.quantity)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono tabular-nums">{formatDate(bonus.expected_date)}</span>
                              {!bonus.confirmed && (
                                <span className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {overdue 
                                    ? `(${Math.abs(daysUntil)} dias atrasado)` 
                                    : daysUntil === 0 
                                      ? '(hoje)' 
                                      : `(${daysUntil} dias)`
                                  }
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {bonus.confirmed ? (
                              <Badge variant="default" className="bg-success/15 hover:bg-success/20 text-success border-success/30">
                                <Check className="h-3 w-3 mr-1" />
                                Confirmado
                              </Badge>
                            ) : overdue ? (
                              <Badge variant="destructive">
                                <Clock className="h-3 w-3 mr-1" />
                                Atrasado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!bonus.confirmed && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmingId(bonus.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Confirmar
                              </Button>
                            )}
                            {bonus.confirmed && bonus.confirmed_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(bonus.confirmed_at)}
                              </span>
                            )}
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

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmingId} onOpenChange={() => setConfirmingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar recebimento do bônus?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao confirmar, você está indicando que os pontos já foram creditados na sua conta.
                Esta ação atualizará o status da operação para "Confirmado".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmingId && confirmBonus.mutate(confirmingId)}
                disabled={confirmBonus.isPending}
              >
                {confirmBonus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Recebimento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
