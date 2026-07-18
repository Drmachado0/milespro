import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Filter, Plus, MoreVertical, Heart, Loader2, Calendar, DollarSign, Target, TrendingDown, Gift, Sparkles, Check, HelpCircle, RotateCcw } from 'lucide-react';
import { SubscriptionHistoryChart } from '@/components/clube/SubscriptionHistoryChart';
import { SubscriptionProjectionChart } from '@/components/clube/SubscriptionProjectionChart';
import { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ALL_PROGRAMS } from '@/data/programs';
import { useClubSubscriptions, type ClubSubscription, BonusType, BonusFrequency, Modality, BONUS_FREQUENCY_CONFIG } from '@/hooks/useClubSubscriptions';
import { useLocalization } from '@/hooks/useLocalization';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type HolderOption = Pick<Database['public']['Tables']['holders']['Row'], 'id' | 'name'>;
type CreditCardOption = Pick<Database['public']['Tables']['credit_cards']['Row'], 'id' | 'card_name' | 'last_four_digits'>;

const linkedPrograms = ALL_PROGRAMS.map(p => ({ value: p.name, label: p.name }));

const modalityLabels: Record<Modality, string> = {
  monthly: 'Mensal',
  annual_installments: 'Anual (12x)',
  annual_upfront: 'Anual (à vista)',
};

export default function ClubeAssinante() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  const { user } = useAuth();
  const {
    subscriptions,
    isLoading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    toggleActive,
    calculateModalityProjection,
    calculateFirstYearProjection,
    calculateOverallStats,
    activeCount,
    totalMonthlyCost,
    totalPointsPerMonth,
  } = useClubSubscriptions();

  const [filtro, setFiltro] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    holder_id: '',
    program: '',
    subscription_name: '',
    points_per_month: '',
    monthly_fee: '',
    annual_installment_price: '',
    annual_price: '',
    modality: 'monthly' as Modality,
    initial_bonus: '',
    billing_day: '',
    credit_card_id: '',
    notes: '',
    bonus_type: 'none' as BonusType,
    bonus_value: '',
    bonus_frequency: 'quarterly' as BonusFrequency,
    start_date: new Date().toISOString().split('T')[0],
  });

  // Fetch holders for select
  const { data: holders = [] } = useQuery({
    queryKey: ['holders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holders')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch credit cards for select
  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('id, card_name, last_four_digits')
        .order('card_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.program?.toLowerCase().includes(filtro.toLowerCase()) ||
      sub.holders?.name?.toLowerCase().includes(filtro.toLowerCase()) ||
      sub.subscription_name?.toLowerCase().includes(filtro.toLowerCase())
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      holder_id: '',
      program: '',
      subscription_name: '',
      points_per_month: '',
      monthly_fee: '',
      annual_installment_price: '',
      annual_price: '',
      modality: 'monthly',
      initial_bonus: '',
      billing_day: '',
      credit_card_id: '',
      notes: '',
      bonus_type: 'none',
      bonus_value: '',
      bonus_frequency: 'quarterly',
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleEdit = (sub: ClubSubscription) => {
    setEditingId(sub.id);
    setFormData({
      holder_id: sub.holder_id || '',
      program: sub.program || '',
      subscription_name: sub.subscription_name || '',
      points_per_month: sub.points_per_month?.toString() || '',
      monthly_fee: sub.monthly_fee?.toString() || '',
      annual_installment_price: sub.annual_installment_price?.toString() || '',
      annual_price: sub.annual_price?.toString() || '',
      modality: sub.modality || 'monthly',
      initial_bonus: sub.initial_bonus?.toString() || '',
      billing_day: sub.billing_day?.toString() || '',
      credit_card_id: sub.credit_card_id || '',
      notes: sub.notes || '',
      bonus_type: sub.bonus_type || 'none',
      bonus_value: sub.bonus_value?.toString() || '',
      bonus_frequency: sub.bonus_frequency || 'quarterly',
      start_date: sub.start_date || new Date().toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.program) {
      return;
    }
    
    const data = {
      holder_id: formData.holder_id && formData.holder_id !== 'none' ? formData.holder_id : null,
      program: formData.program,
      subscription_name: formData.subscription_name || null,
      points_per_month: parseInt(formData.points_per_month) || 0,
      monthly_fee: parseFloat(formData.monthly_fee.replace(',', '.')) || 0,
      annual_installment_price: formData.annual_installment_price ? parseFloat(formData.annual_installment_price.replace(',', '.')) : null,
      annual_price: formData.annual_price ? parseFloat(formData.annual_price.replace(',', '.')) : null,
      modality: formData.modality,
      initial_bonus: parseInt(formData.initial_bonus) || 0,
      billing_day: formData.billing_day ? parseInt(formData.billing_day) : null,
      credit_card_id: formData.credit_card_id && formData.credit_card_id !== 'none' ? formData.credit_card_id : null,
      notes: formData.notes || null,
      bonus_type: formData.bonus_type,
      bonus_value: parseFloat(formData.bonus_value.replace(',', '.')) || 0,
      bonus_frequency: formData.bonus_frequency,
      start_date: formData.start_date || null,
    };

    if (editingId) {
      updateSubscription.mutate({ id: editingId, data }, { onSuccess: closeDialog });
    } else {
      createSubscription.mutate(data, { onSuccess: closeDialog });
    }
  };

  // Calculate preview projection for all modalities
  const previewProjections = useMemo(() => {
    const fee = parseFloat(formData.monthly_fee.replace(',', '.')) || 0;
    const annualInstallment = formData.annual_installment_price ? parseFloat(formData.annual_installment_price.replace(',', '.')) : null;
    const annual = formData.annual_price ? parseFloat(formData.annual_price.replace(',', '.')) : null;
    const points = parseInt(formData.points_per_month) || 0;
    const initialBonus = parseInt(formData.initial_bonus) || 0;
    const bonusValue = parseFloat(formData.bonus_value.replace(',', '.')) || 0;
    
    return calculateModalityProjection(
      fee, 
      annualInstallment, 
      annual, 
      points, 
      initialBonus,
      formData.bonus_type,
      bonusValue,
      formData.bonus_frequency
    );
  }, [calculateModalityProjection, formData.monthly_fee, formData.annual_installment_price, formData.annual_price, formData.points_per_month, formData.initial_bonus, formData.bonus_type, formData.bonus_value, formData.bonus_frequency]);

  // Overall stats
  const overallStats = useMemo(() => calculateOverallStats(), [calculateOverallStats]);

  return (
    <DashboardLayout title="Assinaturas dos Programas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão"
          icon={<Heart className="h-5 w-5" />}
          title="Assinaturas dos Programas"
          subtitle="Clubes e assinaturas recorrentes que geram milhas mensalmente"
        />
        {/* KPI Cards */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" data-tour="club-kpis">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Assinaturas Ativas</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">Quantidade de assinaturas de clubes de milhas com status ativo.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums tracking-tight mt-1">{activeCount}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Custo Mensal</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="text-xs">Soma do valor mensal equivalente de todas as assinaturas ativas. Para planos anuais, considera o valor da parcela ou o valor à vista dividido por 12.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums tracking-tight mt-1">{formatCurrency(totalMonthlyCost)}</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Pontos/Mês</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">Soma dos pontos mensais fixos de todas as assinaturas ativas. Não inclui bônus.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums tracking-tight mt-1">{formatNumber(totalPointsPerMonth)}</p>
              <p className="text-xs text-muted-foreground">fixos mensais</p>
            </Card>
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Pontos c/ Bônus (1º ano)</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p className="text-xs">Total projetado para o 1º ano: (Pontos fixos × 12) + Bônus único + Bônus recorrente de todas as assinaturas ativas.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums tracking-tight mt-1 text-primary">{formatNumber(overallStats.totalYearlyPoints)}</p>
              <p className="text-xs text-muted-foreground">pontos + bônus</p>
            </Card>
          </div>
        </TooltipProvider>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SubscriptionHistoryChart />
          <SubscriptionProjectionChart />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-5 w-5" />
              <span>Clube do Assinante</span>
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setEditingId(null); setDialogOpen(true); }} data-tour="add-subscription">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Assinatura
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Assinatura' : 'Cadastrar Plano de Clube'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Programa *</Label>
                      <Select 
                        value={formData.program} 
                        onValueChange={(v) => setFormData({ ...formData, program: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione">
                            {formData.program && (
                              <div className="flex items-center gap-2">
                                <ProgramLogo program={formData.program} size="sm" />
                                <span>{formData.program}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {linkedPrograms.map((program) => (
                            <SelectItem key={program.value} value={program.value}>
                              <div className="flex items-center gap-2">
                                <ProgramLogo program={program.value} size="sm" />
                                <span>{program.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Plano</Label>
                      <Input 
                        placeholder="Ex: Clube Smiles Gold" 
                        value={formData.subscription_name}
                        onChange={(e) => setFormData({ ...formData, subscription_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Titular</Label>
                      <Select 
                        value={formData.holder_id} 
                        onValueChange={(v) => setFormData({ ...formData, holder_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Não associar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não associar</SelectItem>
                          {(holders as HolderOption[]).map((holder) => (
                            <SelectItem key={holder.id} value={holder.id}>
                              {holder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Início</Label>
                      <Input 
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Plan Values */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valores do Plano
                    </Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Pontos Mensais Fixos *</Label>
                        <Input 
                          type="number"
                          placeholder="Ex: 2500" 
                          value={formData.points_per_month}
                          onChange={(e) => setFormData({ ...formData, points_per_month: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Pontos recorrentes creditados todo mês (sem bônus)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Dia Vencimento</Label>
                        <Input 
                          type="number"
                          placeholder="Ex: 5" 
                          min={1}
                          max={31}
                          value={formData.billing_day}
                          onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Modality Pricing */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                      <Label className="text-xs font-medium">Preços por Modalidade</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Mensal (R$) *</Label>
                          <Input 
                            placeholder="Ex: 25,00" 
                            value={formData.monthly_fee}
                            onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Parcela 12x (R$)</Label>
                          <Input 
                            placeholder="Ex: 79,90" 
                            value={formData.annual_installment_price}
                            onChange={(e) => setFormData({ ...formData, annual_installment_price: e.target.value })}
                          />
                          {formData.annual_installment_price && (
                            <p className="text-xs text-muted-foreground">
                              Total: {formatCurrency(parseFloat(formData.annual_installment_price.replace(',', '.')) * 12 || 0)}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Anual à vista (R$)</Label>
                          <Input 
                            placeholder="Ex: 799,00" 
                            value={formData.annual_price}
                            onChange={(e) => setFormData({ ...formData, annual_price: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected Modality */}
                    <div className="space-y-2">
                      <Label className="text-xs">Modalidade Escolhida</Label>
                      <Select 
                        value={formData.modality} 
                        onValueChange={(v) => setFormData({ ...formData, modality: v as Modality })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="annual_installments">Anual (12x)</SelectItem>
                          <SelectItem value="annual_upfront">Anual (à vista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Bonus Configuration */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Configuração de Bônus
                    </Label>
                    
                    {/* Initial Bonus - One-time */}
                    <div className="bg-success dark:bg-success/30 border border-success dark:border-success rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center">
                          <Gift className="h-3 w-3 text-white" />
                        </div>
                        <Label className="text-xs font-semibold text-success dark:text-success">Bônus Único (1º Mês)</Label>
                      </div>
                      <div className="space-y-2">
                        <Input 
                          type="number"
                          placeholder="Ex: 10000" 
                          value={formData.initial_bonus}
                          onChange={(e) => setFormData({ ...formData, initial_bonus: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Milhas creditadas apenas uma vez na ativação da assinatura.
                        </p>
                      </div>
                    </div>

                    {/* Recurring Bonus */}
                    <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                          <TrendingDown className="h-3 w-3 text-white" />
                        </div>
                        <Label className="text-xs font-semibold text-violet-700 dark:text-violet-400">Bônus Recorrente (1º Ano)</Label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Pontos por Crédito</Label>
                          <Input 
                            type="number"
                            placeholder="Ex: 4200" 
                            value={formData.bonus_value}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              bonus_value: e.target.value,
                              bonus_type: e.target.value && parseFloat(e.target.value) > 0 ? 'recurring' : 'none'
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Frequência</Label>
                          <Select 
                            value={formData.bonus_frequency} 
                            onValueChange={(v) => setFormData({ ...formData, bonus_frequency: v as BonusFrequency })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(BONUS_FREQUENCY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.label} ({config.occurrences}x/ano)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {formData.bonus_value && parseFloat(formData.bonus_value) > 0 && (
                        <div className="mt-3 p-2 bg-violet-100 dark:bg-violet-900/40 rounded-md">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Total no 1º ano:</span>
                            <span className="font-bold text-violet-700 dark:text-violet-300">
                              +{formatNumber(
                                Math.floor(parseFloat(formData.bonus_value.replace(',', '.')) || 0) * 
                                BONUS_FREQUENCY_CONFIG[formData.bonus_frequency].occurrences
                              )} pontos
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(parseFloat(formData.bonus_value.replace(',', '.')) || 0)} pontos × {BONUS_FREQUENCY_CONFIG[formData.bonus_frequency].occurrences} créditos
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Milhas creditadas em intervalos regulares durante o 1º ano da assinatura.
                      </p>
                    </div>
                  </div>

                  {/* First Year Preview - All Modalities */}
                  {formData.points_per_month && formData.monthly_fee && previewProjections.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Comparativo de Modalidades (1º Ano)</Label>
                        {previewProjections.length > 1 && (
                          <div className="flex items-center gap-1 text-xs text-success">
                            <TrendingDown className="h-3 w-3" />
                            <span>Melhor: {previewProjections.reduce((best, curr) => 
                              curr.costPerThousandWithBonus < best.costPerThousandWithBonus ? curr : best
                            ).label}</span>
                          </div>
                        )}
                      </div>

                      {/* Savings Summary Card */}
                      {previewProjections.some(p => p.savings > 0) && (
                        <div className="bg-success dark:bg-success/30 border border-success dark:border-success rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                              <TrendingDown className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-success dark:text-success">Economia Comparativa</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {previewProjections.filter(p => p.savings > 0).map(proj => (
                              <div key={proj.modality} className="flex items-center justify-between bg-white dark:bg-success/30 rounded-md p-2">
                                <span className="text-xs font-medium">{proj.label}</span>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-success">-{formatCurrency(proj.savings)}</p>
                                  <p className="text-xs text-success">
                                    {((proj.savings / (previewProjections[0]?.totalCost || 1)) * 100).toFixed(0)}% off
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {previewProjections.map((proj, index) => {
                          const isBestValue = previewProjections.every(p => 
                            proj.costPerThousandWithBonus <= p.costPerThousandWithBonus
                          );
                          
                          return (
                            <div 
                              key={proj.modality}
                              className={cn(
                                "rounded-lg p-3 border transition-all relative",
                                formData.modality === proj.modality 
                                  ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20" 
                                  : "bg-background border-border hover:border-primary/20"
                              )}
                            >
                              {isBestValue && previewProjections.length > 1 && (
                                <div className="absolute -top-2 -right-2">
                                  <Badge className="bg-success text-white text-xs px-2">
                                    Melhor Custo
                                  </Badge>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {formData.modality === proj.modality && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                  <span className="font-medium text-sm">{proj.label}</span>
                                  {proj.savings > 0 && (
                                    <Badge variant="outline" className="text-success border-success bg-success text-xs ml-1">
                                      -{formatCurrency(proj.savings)}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(proj.monthlyEquivalent)}/mês
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Custo Total</p>
                                  <p className={cn("font-semibold", proj.savings > 0 && "text-success")}>
                                    {formatCurrency(proj.totalCost)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Pontos Fixos ×12</p>
                                  <p className="font-semibold">{formatNumber(proj.totalMonthlyPoints)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Bônus Único</p>
                                  <p className="font-semibold text-success">
                                    {proj.initialBonus > 0 ? `+${formatNumber(proj.initialBonus)}` : '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Bônus Recorrente</p>
                                  <p className="font-semibold text-violet-600">
                                    {proj.recurringBonusTotal > 0 
                                      ? `+${formatNumber(proj.recurringBonusTotal)} (${proj.bonusOccurrences}x)` 
                                      : '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total 1º Ano</p>
                                  <p className="font-bold">{formatNumber(proj.totalPoints)}</p>
                                </div>
                              </div>
                              
                              <Separator className="my-2" />
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 rounded-md p-2 text-center">
                                  <p className="text-xs text-muted-foreground">Milheiro Base</p>
                                  <p className="font-bold text-sm">{formatCurrency(proj.costPerThousandBase)}</p>
                                </div>
                                <div className={cn(
                                  "rounded-md p-2 text-center border",
                                  isBestValue && previewProjections.length > 1
                                    ? "bg-success dark:bg-success/40 border-success"
                                    : formData.modality === proj.modality 
                                      ? "bg-primary/20 border-primary/40"
                                      : "bg-success dark:bg-success/30 border-transparent"
                                )}>
                                  <p className="text-xs text-muted-foreground">Milheiro c/ Bônus</p>
                                  <p className={cn(
                                    "font-bold text-sm",
                                    isBestValue && previewProjections.length > 1 
                                      ? "text-success" 
                                      : formData.modality === proj.modality 
                                        ? "text-primary" 
                                        : "text-success"
                                  )}>
                                    {formatCurrency(proj.costPerThousandWithBonus)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cartão de Pagamento</Label>
                      <Select 
                        value={formData.credit_card_id} 
                        onValueChange={(v) => setFormData({ ...formData, credit_card_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {(creditCards as CreditCardOption[]).map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.card_name} {card.last_four_digits ? `****${card.last_four_digits}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea 
                        placeholder="Notas..." 
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={1}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSubmit}
                    disabled={!formData.program || createSubscription.isPending || updateSubscription.isPending}
                  >
                    {(createSubscription.isPending || updateSubscription.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingId ? 'Salvar Alterações' : 'Criar Assinatura'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por programa, titular ou nome do plano..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="h-8 border-0 bg-transparent focus-visible:ring-0 text-sm"
              />
            </div>

            {/* Subscriptions List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <EmptyState
                icon={Gift}
                title={filtro ? 'Nenhum resultado encontrado' : 'Nenhuma assinatura cadastrada'}
                description={filtro
                  ? 'Nenhum resultado para o filtro selecionado.'
                  : 'Cadastre os clubes de assinatura para acompanhar seus benefícios.'}
                actionLabel={filtro ? undefined : 'Nova Assinatura'}
                onAction={filtro ? undefined : () => { setEditingId(null); setDialogOpen(true); }}
              />
            ) : (
              <div className="space-y-2">
                {filteredSubscriptions.map((sub) => {
                  const projection = calculateFirstYearProjection(
                    sub.monthly_fee || 0,
                    sub.points_per_month || 0,
                    (sub.bonus_type as BonusType) || 'none',
                    sub.bonus_value || 0,
                    (sub.bonus_frequency as BonusFrequency) || 'quarterly',
                    sub.initial_bonus || 0,
                    (sub.modality as Modality) || 'monthly',
                    sub.annual_price,
                    sub.annual_installment_price
                  );
                  
                  const hasRecurringBonus = sub.bonus_type === 'recurring' && (sub.bonus_value || 0) > 0;
                  const recurringConfig = hasRecurringBonus ? BONUS_FREQUENCY_CONFIG[(sub.bonus_frequency as BonusFrequency) || 'quarterly'] : null;
                  
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ProgramLogo program={sub.program} size="md" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {sub.subscription_name || sub.program}
                            </span>
                            {sub.holders?.name && (
                              <span className="text-xs text-muted-foreground">• {sub.holders.name}</span>
                            )}
                            <Badge variant={sub.active ? 'default' : 'secondary'} className="text-xs">
                              {sub.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {modalityLabels[(sub.modality as Modality)] || 'Mensal'}
                            </Badge>
                            {(sub.initial_bonus || 0) > 0 && (
                              <Badge variant="outline" className="text-xs text-success border-success bg-success">
                                <Sparkles className="h-3 w-3 mr-1" />
                                +{formatNumber(sub.initial_bonus)} único
                              </Badge>
                            )}
                            {hasRecurringBonus && recurringConfig && (
                              <Badge variant="outline" className="text-xs text-violet-600 border-violet-200 bg-violet-50">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                +{formatNumber(sub.bonus_value || 0)} {recurringConfig.label.toLowerCase()}
                              </Badge>
                            )}
                          </div>
                          {sub.start_date && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Início: {formatDate(sub.start_date)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                        <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Pontos/Mês</p>
                          <p className="font-semibold text-sm">{formatNumber(sub.points_per_month || 0)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Valor/Mês</p>
                          <p className="font-semibold text-sm">{formatCurrency(
                            sub.modality === 'annual_upfront' && sub.annual_price 
                              ? sub.annual_price / 12 
                              : sub.modality === 'annual_installments' && sub.annual_installment_price 
                                ? sub.annual_installment_price 
                                : sub.monthly_fee || 0
                          )}</p>
                        </div>
                        <div className="text-center min-w-[80px] bg-muted/50 rounded-md p-1.5">
                          <p className="text-xs text-muted-foreground">Milheiro Base</p>
                          <p className="font-semibold text-sm">{formatCurrency(projection.costPerThousandBase)}</p>
                        </div>
                        <div className="text-center min-w-[80px] bg-primary/10 rounded-md p-1.5">
                          <p className="text-xs text-muted-foreground">Milheiro c/ Bônus</p>
                          <p className="font-semibold text-sm text-primary">{formatCurrency(projection.costPerThousandWithBonus)}</p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive.mutate({ id: sub.id, active: !sub.active })}
                          className="text-xs"
                        >
                          {sub.active ? 'Cancelar' : 'Reativar'}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(sub)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(sub.id)}
                              className="text-destructive"
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Count */}
            <div className="text-right text-xs text-muted-foreground">
              {filteredSubscriptions.length} assinatura{filteredSubscriptions.length !== 1 ? 's' : ''}.
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteSubscription.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
          }
        }}
        title="Excluir Assinatura"
        description="Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita."
      />
    </DashboardLayout>
  );
}