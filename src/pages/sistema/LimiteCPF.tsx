import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProgramLogo } from '@/components/ui/program-logo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Users2, Search, Edit2, Calendar, AlertTriangle, 
  CheckCircle2, Loader2, Plus, Trash2, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCpfLimits } from '@/hooks/useCpfLimits';
import { useLocalization } from '@/hooks/useLocalization';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Holder {
  id: string;
  name: string;
}

export default function LimiteCPF() {
  const { user } = useAuth();
  const { t, formatNumber } = useLocalization();
  const queryClient = useQueryClient();
  const { 
    defaultLimits, 
    userLimits, 
    cpfUsage, 
    getCpfUsage, 
    updateUserLimit,
    addCpfUsage,
    deleteCpfUsage,
    addProgram,
    isLoading 
  } = useCpfLimits();

  // Filters
  const [holderFilter, setHolderFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit limit dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    holderId: string;
    holderName: string;
    programName: string;
    currentLimit: number;
    defaultLimit: number;
    periodStart: string | null;
  } | null>(null);
  const [newLimit, setNewLimit] = useState<number>(10);
  const [newPeriodStart, setNewPeriodStart] = useState<string>('');

  // Add usage dialog
  const [addUsageDialog, setAddUsageDialog] = useState<{
    open: boolean;
    holderId: string;
    holderName: string;
    programName: string;
  } | null>(null);
  const [newUsage, setNewUsage] = useState({
    cpfCount: 1,
    emissionDate: new Date().toISOString().split('T')[0],
    passengerName: '',
    locator: '',
  });

  // Details dialog - view CPF usage history for a holder
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    holderId: string;
    holderName: string;
    programName: string;
  } | null>(null);

  // Add program dialog
  const [addProgramDialog, setAddProgramDialog] = useState(false);
  const [newProgram, setNewProgram] = useState({
    programName: '',
    defaultLimit: 10,
    renewalType: 'ano_civil' as 'ano_civil' | '12_meses',
    holderCounts: false,
    notes: '',
  });

  // Fetch holders
  const { data: holders = [] } = useQuery({
    queryKey: ['holders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holders')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data || []) as Holder[];
    },
    enabled: !!user,
  });

  // Fetch program balances
  const { data: balances = [] } = useQuery({
    queryKey: ['program_balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_balances')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Compute programs with usage data grouped by program
  const programsData = useMemo(() => {
    if (!holders.length || !defaultLimits.length) return [];

    const programs = defaultLimits.map(limit => {
      const programHolders = holders.map(holder => {
        const usage = getCpfUsage(holder.id, limit.program_name);
        const balance = balances.find(
          b => b.holder_id === holder.id && b.program === limit.program_name
        );

        return {
          holder,
          ...usage,
          balance: balance?.balance || 0,
        };
      });

      return {
        program: limit,
        holders: programHolders,
      };
    });

    // Filter by program if specified
    let filtered = programs;
    if (programFilter !== 'all') {
      filtered = programs.filter(p => p.program.program_name === programFilter);
    }

    // Filter by holder if specified
    if (holderFilter !== 'all') {
      filtered = filtered.map(p => ({
        ...p,
        holders: p.holders.filter(h => h.holder.id === holderFilter),
      })).filter(p => p.holders.length > 0);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.program.program_name.toLowerCase().includes(search) ||
        p.holders.some(h => h.holder.name.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [holders, defaultLimits, balances, getCpfUsage, programFilter, holderFilter, searchTerm]);

  const handleEditLimit = (
    holderId: string, 
    holderName: string, 
    programName: string,
    currentLimit: number,
    defaultLimit: number,
    periodStart: string | null
  ) => {
    setEditDialog({
      open: true,
      holderId,
      holderName,
      programName,
      currentLimit,
      defaultLimit,
      periodStart,
    });
    setNewLimit(currentLimit);
    setNewPeriodStart(periodStart || '');
  };

  const handleSaveLimit = async () => {
    if (!editDialog) return;

    try {
      await updateUserLimit.mutateAsync({
        holderId: editDialog.holderId,
        programName: editDialog.programName,
        customLimit: newLimit,
        periodStart: newPeriodStart || null,
      });
      toast.success('Limite atualizado com sucesso');
      setEditDialog(null);
    } catch (error) {
      toast.error('Erro ao atualizar limite');
    }
  };

  const handleResetToDefault = async () => {
    if (!editDialog) return;

    try {
      await updateUserLimit.mutateAsync({
        holderId: editDialog.holderId,
        programName: editDialog.programName,
        customLimit: null,
        periodStart: null,
      });
      toast.success('Limite resetado para o padrão');
      setEditDialog(null);
    } catch (error) {
      toast.error('Erro ao resetar limite');
    }
  };

  const handleAddUsage = (holderId: string, holderName: string, programName: string) => {
    setAddUsageDialog({
      open: true,
      holderId,
      holderName,
      programName,
    });
    setNewUsage({
      cpfCount: 1,
      emissionDate: new Date().toISOString().split('T')[0],
      passengerName: '',
      locator: '',
    });
  };

  const handleSaveUsage = async () => {
    if (!addUsageDialog) return;

    try {
      await addCpfUsage.mutateAsync({
        holderId: addUsageDialog.holderId,
        programName: addUsageDialog.programName,
        cpfCount: newUsage.cpfCount,
        emissionDate: newUsage.emissionDate,
        passengerName: newUsage.passengerName || undefined,
        locator: newUsage.locator || undefined,
      });
      toast.success('Uso de CPF registrado com sucesso');
      setAddUsageDialog(null);
    } catch (error) {
      toast.error('Erro ao registrar uso');
    }
  };

  const handleAddProgram = async () => {
    if (!newProgram.programName.trim()) {
      toast.error('Nome do programa é obrigatório');
      return;
    }

    try {
      await addProgram.mutateAsync({
        programName: newProgram.programName,
        defaultLimit: newProgram.defaultLimit,
        renewalType: newProgram.renewalType,
        holderCounts: newProgram.holderCounts,
        notes: newProgram.notes || undefined,
      });
      toast.success('Programa adicionado com sucesso');
      setAddProgramDialog(false);
      setNewProgram({
        programName: '',
        defaultLimit: 10,
        renewalType: 'ano_civil',
        holderCounts: false,
        notes: '',
      });
    } catch (error) {
      toast.error('Erro ao adicionar programa');
    }
  };

  // Open details dialog to view CPF usage history
  const handleOpenDetails = (holderId: string, holderName: string, programName: string) => {
    setDetailsDialog({
      open: true,
      holderId,
      holderName,
      programName,
    });
  };

  // Get filtered CPF usage records for details dialog
  const detailsUsageRecords = useMemo(() => {
    if (!detailsDialog) return [];
    return cpfUsage
      .filter(u => u.holder_id === detailsDialog.holderId && u.program_name === detailsDialog.programName)
      .sort((a, b) => new Date(b.emission_date).getTime() - new Date(a.emission_date).getTime());
  }, [cpfUsage, detailsDialog]);

  // Handle delete usage from details dialog
  const handleDeleteUsageFromDetails = async (recordId: string) => {
    try {
      await deleteCpfUsage.mutateAsync(recordId);
      toast.success('Registro de CPF removido');
    } catch (error) {
      toast.error('Erro ao remover registro');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warning';
    return '';
  };

  const getStatusBadge = (usage: { isAtLimit: boolean; isNearLimit: boolean }) => {
    if (usage.isAtLimit) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Limite Atingido
        </Badge>
      );
    }
    if (usage.isNearLimit) {
      return (
        <Badge variant="secondary" className="ml-2 bg-warning/10 text-warning border-warning/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Próximo do Limite
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('cpfLimits.title')}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('cpfLimits.title')}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sistema"
          title={t('cpfLimits.title')}
          subtitle={t('cpfLimits.description')}
          icon={<Users2 className="h-4 w-4" />}
          actions={
            <Button onClick={() => setAddProgramDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('cpfLimits.addProgram')}
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('cpfLimits.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={holderFilter} onValueChange={setHolderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cpfLimits.holder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('cpfLimits.allHolders')}</SelectItem>
                  {holders.map(holder => (
                    <SelectItem key={holder.id} value={holder.id}>
                      {holder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cpfLimits.program')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('cpfLimits.allPrograms')}</SelectItem>
                  {defaultLimits.map(limit => (
                    <SelectItem key={limit.program_name} value={limit.program_name}>
                      {limit.program_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Programs List */}
        {programsData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {holders.length === 0 
                  ? 'Cadastre titulares para ver os limites de CPF' 
                  : 'Nenhum programa encontrado com os filtros aplicados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {programsData.map(({ program, holders: programHolders }) => (
              <Card key={program.program_name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ProgramLogo program={program.program_name} size="md" />
                      <div>
                        <CardTitle className="text-lg">{program.program_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {program.renewal_type === 'ano_civil' 
                            ? t('cpfLimits.annualCivil')
                            : t('cpfLimits.rolling12Months')
                          }
                          {program.holder_counts && (
                            <span className="text-xs">• Titular conta no limite</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">
                      Limite padrão: {program.default_limit} CPFs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>{t('cpfLimits.holder')}</TableHead>
                        <TableHead className="w-[300px]">{t('cpfLimits.cpfs')}</TableHead>
                        <TableHead className="text-center">{t('cpfLimits.used')}/{t('cpfLimits.limit')}</TableHead>
                        <TableHead className="text-right">{t('cpfLimits.balance')}</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programHolders.map((holderData) => (
                        <TableRow key={holderData.holder.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenDetails(
                                  holderData.holder.id,
                                  holderData.holder.name,
                                  program.program_name
                                )}
                                className="font-medium text-left hover:underline hover:text-primary cursor-pointer transition-colors"
                              >
                                {holderData.holder.name}
                              </button>
                              {getStatusBadge(holderData)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress 
                                value={Math.min(holderData.percentage, 100)} 
                                className={cn("h-3", getProgressColor(holderData.percentage))}
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{holderData.used} usado(s)</span>
                                <span>{holderData.remaining} restante(s)</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-mono text-sm",
                              holderData.isAtLimit && "text-destructive font-semibold"
                            )}>
                              {holderData.used}/{holderData.limit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(holderData.balance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAddUsage(
                                  holderData.holder.id,
                                  holderData.holder.name,
                                  program.program_name
                                )}
                                title="Adicionar uso manual"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditLimit(
                                  holderData.holder.id,
                                  holderData.holder.name,
                                  program.program_name,
                                  holderData.limit,
                                  program.default_limit,
                                  holderData.renewalType === '12_meses' 
                                    ? format(holderData.periodStart, 'yyyy-MM-dd')
                                    : null
                                )}
                                title="Editar limite"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Limit Dialog */}
        <Dialog open={editDialog?.open || false} onOpenChange={(open) => !open && setEditDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cpfLimits.editLimit')}</DialogTitle>
              <DialogDescription>
                Configure o limite de CPFs para {editDialog?.holderName} no programa {editDialog?.programName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('cpfLimits.program')}</Label>
                  <p className="font-medium mt-1">{editDialog?.programName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('cpfLimits.holder')}</Label>
                  <p className="font-medium mt-1">{editDialog?.holderName}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t('cpfLimits.customLimit')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newLimit}
                  onChange={(e) => setNewLimit(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('cpfLimits.defaultLimit')}: {editDialog?.defaultLimit} CPFs
                </p>
              </div>

              {defaultLimits.find(l => l.program_name === editDialog?.programName)?.renewal_type === '12_meses' && (
                <div className="space-y-2">
                  <Label>Início do Período (12 meses)</Label>
                  <Input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => setNewPeriodStart(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Data da primeira emissão do período de 12 meses
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleResetToDefault}>
                Usar Padrão
              </Button>
              <Button onClick={handleSaveLimit} disabled={updateUserLimit.isPending}>
                {updateUserLimit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Usage Dialog */}
        <Dialog open={addUsageDialog?.open || false} onOpenChange={(open) => !open && setAddUsageDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Uso de CPF</DialogTitle>
              <DialogDescription>
                Adicione manualmente um uso de CPF para {addUsageDialog?.holderName} no programa {addUsageDialog?.programName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Quantidade de CPFs</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newUsage.cpfCount}
                  onChange={(e) => setNewUsage({ ...newUsage, cpfCount: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data da Emissão</Label>
                <Input
                  type="date"
                  value={newUsage.emissionDate}
                  onChange={(e) => setNewUsage({ ...newUsage, emissionDate: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nome do Passageiro (opcional)</Label>
                <Input
                  value={newUsage.passengerName}
                  onChange={(e) => setNewUsage({ ...newUsage, passengerName: e.target.value })}
                  placeholder="Nome do passageiro"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Localizador (opcional)</Label>
                <Input
                  value={newUsage.locator}
                  onChange={(e) => setNewUsage({ ...newUsage, locator: e.target.value.toUpperCase() })}
                  placeholder="Ex: ABC123"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUsageDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUsage} disabled={addCpfUsage.isPending}>
                {addCpfUsage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Program Dialog */}
        <Dialog open={addProgramDialog} onOpenChange={setAddProgramDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cpfLimits.addProgram')}</DialogTitle>
              <DialogDescription>
                Adicione um novo programa para controle de limite de CPFs
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('cpfLimits.programName')}</Label>
                <Input
                  value={newProgram.programName}
                  onChange={(e) => setNewProgram({ ...newProgram, programName: e.target.value })}
                  placeholder="Ex: Emirates Skywards"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('cpfLimits.defaultLimit')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newProgram.defaultLimit}
                  onChange={(e) => setNewProgram({ ...newProgram, defaultLimit: parseInt(e.target.value) || 10 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('cpfLimits.renewalInfo')}</Label>
                <Select 
                  value={newProgram.renewalType} 
                  onValueChange={(value: 'ano_civil' | '12_meses') => setNewProgram({ ...newProgram, renewalType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ano_civil">{t('cpfLimits.annualCivil')}</SelectItem>
                    <SelectItem value="12_meses">{t('cpfLimits.rolling12Months')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="holderCounts"
                  checked={newProgram.holderCounts}
                  onChange={(e) => setNewProgram({ ...newProgram, holderCounts: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="holderCounts">{t('cpfLimits.holderCounts')}</Label>
              </div>
              
              <div className="space-y-2">
                <Label>{t('cpfLimits.notes')}</Label>
                <Input
                  value={newProgram.notes}
                  onChange={(e) => setNewProgram({ ...newProgram, notes: e.target.value })}
                  placeholder="Observações opcionais"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddProgramDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProgram} disabled={addProgram.isPending}>
                {addProgram.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog - CPF Usage History */}
        <Dialog open={detailsDialog?.open || false} onOpenChange={(open) => !open && setDetailsDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>CPFs Utilizados - {detailsDialog?.holderName}</DialogTitle>
              <DialogDescription>
                Histórico de emissões no programa {detailsDialog?.programName}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {detailsUsageRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum registro de CPF encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Passageiro</TableHead>
                      <TableHead>Localizador</TableHead>
                      <TableHead className="text-center">CPFs</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsUsageRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(new Date(record.emission_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{record.passenger_name || '-'}</TableCell>
                        <TableCell className="font-mono">{record.locator || '-'}</TableCell>
                        <TableCell className="text-center font-medium">{record.cpf_count}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUsageFromDetails(record.id)}
                            disabled={deleteCpfUsage.isPending}
                            title="Remover registro"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialog(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
