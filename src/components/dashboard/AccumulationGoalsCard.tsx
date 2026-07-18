import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { ProgramLogo } from '@/components/ui/program-logo';
import { useAccumulationGoals } from '@/hooks/useAccumulationGoals';
import { useLocalization } from '@/hooks/useLocalization';
import { Target, Plus, Trash2, Calendar, Trophy, TrendingUp, Check } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export function AccumulationGoalsCard() {
  const { goals, isLoading, createGoal, deleteGoal, markAsCompleted } = useAccumulationGoals();
  const { formatNumber } = useLocalization();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    program: '',
    target_quantity: '',
    deadline: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGoal.mutate({
      program: formData.program,
      target_quantity: parseInt(formData.target_quantity),
      deadline: formData.deadline || null,
      notes: formData.notes || null,
    });
    setFormData({ program: '', target_quantity: '', deadline: '', notes: '' });
    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteGoal.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-success';
    if (progress >= 50) return 'bg-warning';
    if (progress >= 25) return 'bg-primary';
    return 'bg-destructive';
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(parseISO(deadline), new Date());
    return days;
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed || g.isCompleted);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-info/10">
              <Target className="w-4 h-4 text-info" />
            </div>
            Metas de Acúmulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-info/10">
                <Target className="w-4 h-4 text-info" />
              </div>
              Metas de Acúmulo
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Meta</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Programa</Label>
                    <ProgramSelect
                      value={formData.program}
                      onValueChange={(v) => setFormData({ ...formData, program: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta de Milhas/Pontos</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={formData.target_quantity}
                      onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações (opcional)</Label>
                    <Input
                      placeholder="Ex: Viagem para Europa"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createGoal.isPending}>
                    Criar Meta
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeGoals.length === 0 && completedGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta criada"
              description="Defina um objetivo de acúmulo para cada programa."
              actionLabel="Criar meta"
              onAction={() => setIsDialogOpen(true)}
              compact
            />
          ) : (
            <>
              {activeGoals.slice(0, 4).map((goal, index) => {
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isOverdue = daysRemaining !== null && daysRemaining < 0;
                
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      'p-3 rounded-xl border bg-card hover:bg-accent/30 transition-all duration-200',
                      'hover:shadow-sm animate-fade-in'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted/50">
                          <ProgramLogo program={goal.program} size="sm" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{goal.program}</p>
                          {goal.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{goal.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {goal.progress >= 100 && !goal.completed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10"
                            onClick={() => markAsCompleted.mutate(goal.id)}
                            title="Marcar como concluída"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(goal.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {formatNumber(goal.current_quantity)} / {formatNumber(goal.target_quantity)}
                        </span>
                        <span className={cn(
                          'font-mono tabular-nums font-semibold',
                          goal.isCompleted ? 'text-success' : 'text-foreground'
                        )}>
                          {goal.progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn(
                            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                            getProgressColor(goal.progress)
                          )}
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Faltam <span className="font-mono tabular-nums">{formatNumber(goal.remaining)}</span>
                        </span>
                        {goal.deadline && (
                          <span className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono tabular-nums',
                            isOverdue
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted/50 text-muted-foreground'
                          )}>
                            <Calendar className="w-3 h-3" />
                            {isOverdue 
                              ? `Atrasado ${Math.abs(daysRemaining!)}d`
                              : `${daysRemaining}d restantes`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {completedGoals.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-success" />
                    Metas Concluídas (<span className="font-mono tabular-nums">{completedGoals.length}</span>)
                  </p>
                  {completedGoals.slice(0, 2).map((goal) => (
                    <div
                      key={goal.id}
                      className="p-2.5 rounded-xl bg-success/10 border border-success/20 mb-2 last:mb-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ProgramLogo program={goal.program} size="sm" />
                          <span className="text-sm font-medium">{goal.program}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-success font-semibold">
                          <span className="font-mono tabular-nums">{formatNumber(goal.target_quantity)}</span>
                          <Check className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Meta"
        description="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita."
      />
    </>
  );
}
