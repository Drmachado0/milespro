import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Filter, Plus, MoreVertical, CreditCard, Loader2, Plane, Crown, Infinity as InfinityIcon, Info } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/hooks/useLocalization';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CardBrandIcon, cardBrands, getBrandFromName, type CardBrand } from '@/components/ui/card-brand-icon';
import { ProgramLogo } from '@/components/ui/program-logo';
import { ALL_PROGRAMS } from '@/data/programs';
import { BankLogo, issuerBanks, getBankValueFromLabel } from '@/components/ui/bank-logo';
import { useAllCardsVIPStatus } from '@/hooks/useVIPCounters';
import { vipQueryKeys } from '@/hooks/useVIPEntries';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { toTitleCase } from '@/lib/formatters';

type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'] & {
  holders?: { name: string | null } | null;
};
type HolderOption = Pick<Database['public']['Tables']['holders']['Row'], 'id' | 'name'>;

// Programas disponíveis para vinculação
const linkedPrograms = ALL_PROGRAMS.map(p => ({ value: p.name, label: p.name }));

const initialFormData = {
  holder_id: '',
  card_name: '',
  card_brand: '' as CardBrand | '',
  issuer_bank: '',
  last_four_digits: '',
  expiry_date: '',
  billing_day: '',
  due_day: '',
  credit_limit: '',
  annual_fee: '',
  account_type: 'principal',
  is_active: true,
  schedule_points_on_closing: false,
  miles_per_dollar: '1',
  linked_program: '',
  vip_quota_titular: '' as string | 'unlimited',
  vip_quota_convidado: '' as string | 'unlimited',
  vip_active: true,
  notes: '',
};

export default function Cartoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { formatNumber } = useLocalization();
  const [filtro, setFiltro] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invoiceValue, setInvoiceValue] = useState('');
  const [dollarRate, setDollarRate] = useState('5.50');
  const [vipSectionOpen, setVipSectionOpen] = useState(false);
  const [pointsSectionOpen, setPointsSectionOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  // Fetch cards. Both the query key and the WHERE clause carry user.id so a
  // tab that survives a logout/login cycle doesn't serve stale rows from the
  // previous account, and a hypothetical RLS relaxation can't widen the read.
  const { data: cartoes = [], isLoading } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          holders(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch VIP status for all cards
  const { data: vipStatusMap } = useAllCardsVIPStatus();

  // Fetch holders for select. Same defense-in-depth + cache-isolation pattern.
  const { data: holders = [] } = useQuery({
    queryKey: ['holders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('holders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create card mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const brandLabel = cardBrands.find(b => b.value === data.card_brand)?.label || '';
      const cardName = data.card_name || brandLabel;
      const bankLabel = issuerBanks.find(b => b.value === data.issuer_bank)?.label || data.issuer_bank || null;
      
      const { error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user!.id,
          holder_id: data.holder_id && data.holder_id !== 'none' ? data.holder_id : null,
          card_name: cardName,
          issuer_bank: bankLabel,
          last_four_digits: data.last_four_digits || null,
          expiry_date: data.expiry_date || null,
          billing_day: data.billing_day ? parseInt(data.billing_day) : null,
          due_day: data.due_day ? parseInt(data.due_day) : null,
          credit_limit: data.credit_limit ? parseFloat(data.credit_limit.replace(/\./g, '').replace(',', '.')) : 0,
          annual_fee: data.annual_fee ? parseFloat(data.annual_fee.replace(/\./g, '').replace(',', '.')) : 0,
          account_type: data.account_type || 'principal',
          is_active: data.is_active,
          schedule_points_on_closing: data.schedule_points_on_closing,
          miles_per_dollar: data.miles_per_dollar ? parseFloat(data.miles_per_dollar) : 1,
          linked_program: data.linked_program && data.linked_program !== 'none' ? data.linked_program : null,
          vip_quota_titular: data.vip_quota_titular === 'unlimited' ? null : (data.vip_quota_titular ? parseInt(data.vip_quota_titular) : null),
          vip_quota_convidado: data.vip_quota_convidado === 'unlimited' ? null : (data.vip_quota_convidado ? parseInt(data.vip_quota_convidado) : null),
          vip_active: data.vip_active,
          notes: data.notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.cardsWithQuota });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success('Cartão criado com sucesso!');
      closeDialog();
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Update card mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const brandLabel = cardBrands.find(b => b.value === data.card_brand)?.label || '';
      const cardName = data.card_name || brandLabel;
      const bankLabel = issuerBanks.find(b => b.value === data.issuer_bank)?.label || data.issuer_bank || null;

      const { error } = await supabase
        .from('credit_cards')
        .update({
          holder_id: data.holder_id && data.holder_id !== 'none' ? data.holder_id : null,
          card_name: cardName,
          issuer_bank: bankLabel,
          last_four_digits: data.last_four_digits || null,
          expiry_date: data.expiry_date || null,
          billing_day: data.billing_day ? parseInt(data.billing_day) : null,
          due_day: data.due_day ? parseInt(data.due_day) : null,
          credit_limit: data.credit_limit ? parseFloat(data.credit_limit.replace(/\./g, '').replace(',', '.')) : 0,
          annual_fee: data.annual_fee ? parseFloat(data.annual_fee.replace(/\./g, '').replace(',', '.')) : 0,
          account_type: data.account_type || 'principal',
          is_active: data.is_active,
          schedule_points_on_closing: data.schedule_points_on_closing,
          miles_per_dollar: data.miles_per_dollar ? parseFloat(data.miles_per_dollar) : 1,
          linked_program: data.linked_program && data.linked_program !== 'none' ? data.linked_program : null,
          vip_quota_titular: data.vip_quota_titular === 'unlimited' ? null : (data.vip_quota_titular ? parseInt(data.vip_quota_titular) : null),
          vip_quota_convidado: data.vip_quota_convidado === 'unlimited' ? null : (data.vip_quota_convidado ? parseInt(data.vip_quota_convidado) : null),
          vip_active: data.vip_active,
          notes: data.notes || null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.cardsWithQuota });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success('Cartão atualizado com sucesso!');
      closeDialog();
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  // Delete card mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.cardsWithQuota });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.counters });
      queryClient.invalidateQueries({ queryKey: vipQueryKeys.allCardsStatus });
      toast.success('Cartão excluído com sucesso!');
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error));
    },
  });

  const cartoesFiltrados = (cartoes as CreditCardRow[]).filter(
    (cartao) =>
      cartao.card_name?.toLowerCase().includes(filtro.toLowerCase()) ||
      cartao.holders?.name?.toLowerCase().includes(filtro.toLowerCase())
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setInvoiceValue('');
    setVipSectionOpen(false);
    setPointsSectionOpen(false);
    setFormData(initialFormData);
  };

  const handleEdit = (cartao: CreditCardRow) => {
    setEditingId(cartao.id);
    const detectedBrand = getBrandFromName(cartao.card_name || '');
    const detectedBank = getBankValueFromLabel(cartao.issuer_bank);
    setFormData({
      holder_id: cartao.holder_id || '',
      card_name: cartao.card_name || '',
      card_brand: detectedBrand,
      issuer_bank: detectedBank,
      last_four_digits: cartao.last_four_digits || '',
      expiry_date: cartao.expiry_date || '',
      billing_day: cartao.billing_day?.toString() || '',
      due_day: cartao.due_day?.toString() || '',
      credit_limit: cartao.credit_limit ? formatCurrencyValue(cartao.credit_limit) : '',
      annual_fee: cartao.annual_fee ? formatCurrencyValue(cartao.annual_fee) : '',
      account_type: cartao.account_type || 'principal',
      is_active: cartao.is_active ?? true,
      schedule_points_on_closing: cartao.schedule_points_on_closing ?? false,
      miles_per_dollar: cartao.miles_per_dollar?.toString() || '1',
      linked_program: cartao.linked_program || '',
      vip_quota_titular: cartao.vip_quota_titular === null ? 'unlimited' : (cartao.vip_quota_titular?.toString() || ''),
      vip_quota_convidado: cartao.vip_quota_convidado === null ? 'unlimited' : (cartao.vip_quota_convidado?.toString() || ''),
      vip_active: cartao.vip_active ?? true,
      notes: cartao.notes || '',
    });
    // Open sections if they have data
    if (cartao.vip_quota_titular || cartao.vip_quota_convidado || cartao.vip_active === false) {
      setVipSectionOpen(true);
    }
    if (cartao.linked_program || (cartao.miles_per_dollar ?? 0) > 1) {
      setPointsSectionOpen(true);
    }
    setDialogOpen(true);
  };

  const formatCurrencyValue = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInput = (value: string, field: 'credit_limit' | 'annual_fee') => {
    // Remove non-numeric chars except comma
    const cleaned = value.replace(/[^\d,]/g, '');
    // Format with thousands separator
    const parts = cleaned.split(',');
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    const formatted = parts.join(',');
    setFormData({ ...formData, [field]: formatted });
  };

  const calculatedMiles = invoiceValue && formData.miles_per_dollar && dollarRate
    ? Math.floor((parseFloat(invoiceValue.replace(',', '.')) / parseFloat(dollarRate.replace(',', '.'))) * parseFloat(formData.miles_per_dollar))
    : 0;

  const handleBrandChange = (brand: CardBrand) => {
    const brandLabel = cardBrands.find(b => b.value === brand)?.label || '';
    setFormData({ 
      ...formData, 
      card_brand: brand,
      card_name: brand === 'other' ? formData.card_name : brandLabel
    });
  };

  const handleSubmit = () => {
    if (!formData.card_brand && !formData.card_name) {
      toast.error('Selecione a bandeira ou informe o nome do cartão');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <DashboardLayout title="Cartões de Crédito">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão"
          icon={<CreditCard className="h-5 w-5" />}
          title="Cartões de Crédito"
          subtitle="Gerencie seus cartões, associações a programas e limites por titular"
          actions={(
            <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => { setEditingId(null); setInvoiceValue(''); setDialogOpen(true); setFormData(initialFormData); }}
                  data-tour="add-card"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cartão
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar cartão' : 'Preencha as informações do novo cartão.'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Row 1: Descrição, Pessoa, Programa */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição *</Label>
                      <Input 
                        placeholder="Nome do cartão" 
                        value={formData.card_name}
                        onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pessoa</Label>
                      <Select 
                        value={formData.holder_id} 
                        onValueChange={(v) => setFormData({ ...formData, holder_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                      <Label>Programa de Fidelidade</Label>
                      <Select 
                        value={formData.linked_program} 
                        onValueChange={(v) => setFormData({ ...formData, linked_program: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione">
                            {formData.linked_program && formData.linked_program !== 'none' && (
                              <div className="flex items-center gap-2">
                                <ProgramLogo program={formData.linked_program} size="sm" />
                                <span>{formData.linked_program}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
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
                  </div>

                  {/* Row 2: Últimos 4 dígitos, Fechamento, Vencimento, Limite, Anuidade, Conta */}
                  <div className="grid grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label>Últimos 4 díg.</Label>
                      <Input 
                        placeholder="0000" 
                        maxLength={4} 
                        value={formData.last_four_digits}
                        onChange={(e) => setFormData({ ...formData, last_four_digits: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="flex items-center gap-1 cursor-help">
                              Fechamento
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Dia do mês em que a fatura fecha</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input 
                        placeholder="00" 
                        maxLength={2} 
                        value={formData.billing_day}
                        onChange={(e) => setFormData({ ...formData, billing_day: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="flex items-center gap-1 cursor-help">
                              Vencimento
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Dia do mês em que a fatura vence</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Input 
                        placeholder="00" 
                        maxLength={2} 
                        value={formData.due_day}
                        onChange={(e) => setFormData({ ...formData, due_day: e.target.value.replace(/\D/g, '') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input 
                          placeholder="0,00" 
                          className="pl-9"
                          value={formData.credit_limit}
                          onChange={(e) => handleCurrencyInput(e.target.value, 'credit_limit')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Anuidade</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input 
                          placeholder="0,00" 
                          className="pl-9"
                          value={formData.annual_fee}
                          onChange={(e) => handleCurrencyInput(e.target.value, 'annual_fee')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <Select 
                        value={formData.account_type} 
                        onValueChange={(v) => setFormData({ ...formData, account_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principal">Principal</SelectItem>
                          <SelectItem value="adicional">Adicional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Toggle: Ativo */}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label>Ativo</Label>
                      <p className="text-xs text-muted-foreground">Cartão está ativo para uso</p>
                    </div>
                    <Switch 
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>

                  {/* Toggle: Agendar lançamento */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-0.5">
                      <Label>Agendar lançamento dos pontos/milhas para o dia de fechamento</Label>
                      <p className="text-xs text-muted-foreground">
                        Utilize essa opção caso seu cartão pontue em algum programa de fidelidade e você deseje registrar automaticamente os pontos gerados
                      </p>
                    </div>
                    <Switch 
                      checked={formData.schedule_points_on_closing}
                      onCheckedChange={(checked) => setFormData({ ...formData, schedule_points_on_closing: checked })}
                    />
                  </div>

                  {/* Observação */}
                  <div className="space-y-2 border-t pt-4">
                    <Label>Observação</Label>
                    <Textarea 
                      placeholder="Anotações sobre este cartão..." 
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Seção colapsável: Acesso Sala VIP */}
                  <Collapsible open={vipSectionOpen} onOpenChange={setVipSectionOpen} className="border-t pt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <Crown className="h-4 w-4" />
                          Acesso Sala VIP (opcional)
                        </Label>
                        <span className="text-muted-foreground text-sm">
                          {vipSectionOpen ? '▼' : '▶'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Cota Titular</Label>
                          <Select 
                            value={formData.vip_quota_titular === 'unlimited' ? 'unlimited' : 'limited'} 
                            onValueChange={(v) => setFormData({ ...formData, vip_quota_titular: v === 'unlimited' ? 'unlimited' : '' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unlimited">
                                <div className="flex items-center gap-2">
                                  <InfinityIcon className="h-4 w-4" />
                                  Ilimitada
                                </div>
                              </SelectItem>
                              <SelectItem value="limited">Definir cota</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.vip_quota_titular !== 'unlimited' && (
                            <Input 
                              type="number"
                              min="1"
                              placeholder="Quantidade de acessos" 
                              value={formData.vip_quota_titular}
                              onChange={(e) => setFormData({ ...formData, vip_quota_titular: e.target.value })}
                              className="mt-2"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formData.vip_quota_titular === 'unlimited' ? 'Sem limite para titular' : 'Limite anual do titular'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Cota Convidado</Label>
                          <Select 
                            value={formData.vip_quota_convidado === 'unlimited' ? 'unlimited' : 'limited'} 
                            onValueChange={(v) => setFormData({ ...formData, vip_quota_convidado: v === 'unlimited' ? 'unlimited' : '' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unlimited">
                                <div className="flex items-center gap-2">
                                  <InfinityIcon className="h-4 w-4" />
                                  Ilimitada
                                </div>
                              </SelectItem>
                              <SelectItem value="limited">Definir cota</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.vip_quota_convidado !== 'unlimited' && (
                            <Input 
                              type="number"
                              min="1"
                              placeholder="Quantidade de acessos" 
                              value={formData.vip_quota_convidado}
                              onChange={(e) => setFormData({ ...formData, vip_quota_convidado: e.target.value })}
                              className="mt-2"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formData.vip_quota_convidado === 'unlimited' ? 'Sem limite para convidados' : 'Limite anual de convidados'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Status VIP</Label>
                          <Select 
                            value={formData.vip_active ? 'active' : 'inactive'} 
                            onValueChange={(v) => setFormData({ ...formData, vip_active: v === 'active' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Habilitar acesso VIP</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Seção colapsável: Pontos Orgânicos */}
                  <Collapsible open={pointsSectionOpen} onOpenChange={setPointsSectionOpen} className="border-t pt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <Plane className="h-4 w-4" />
                          Pontos Orgânicos (opcional)
                        </Label>
                        <span className="text-muted-foreground text-sm">
                          {pointsSectionOpen ? '▼' : '▶'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Banco Emissor</Label>
                          <Select 
                            value={formData.issuer_bank} 
                            onValueChange={(v) => setFormData({ ...formData, issuer_bank: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o banco">
                                {formData.issuer_bank && (
                                  <div className="flex items-center gap-2">
                                    <BankLogo bank={formData.issuer_bank} size="sm" />
                                    <span>{issuerBanks.find(b => b.value === formData.issuer_bank)?.label}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {issuerBanks.map((bank) => (
                                <SelectItem key={bank.value} value={bank.value}>
                                  <div className="flex items-center gap-2">
                                    <BankLogo bank={bank.value} size="sm" />
                                    <span>{bank.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Pontos por Dólar Gasto</Label>
                          <Input 
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="1.0" 
                            value={formData.miles_per_dollar}
                            onChange={(e) => setFormData({ ...formData, miles_per_dollar: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Taxa de acúmulo de pontos por dólar</p>
                        </div>
                      </div>

                      {formData.linked_program && formData.linked_program !== 'none' && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                          <Label className="text-sm text-muted-foreground">Simulador de Pontos (opcional)</Label>
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div className="space-y-2">
                              <Label className="text-sm">Valor da Fatura (R$)</Label>
                              <Input 
                                type="text"
                                placeholder="0,00" 
                                value={invoiceValue}
                                onChange={(e) => setInvoiceValue(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Cotação do Dólar (R$)</Label>
                              <Input 
                                type="text"
                                placeholder="5,50" 
                                value={dollarRate}
                                onChange={(e) => setDollarRate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Pontos Estimados</Label>
                              <div className="h-10 flex items-center px-3 rounded-md border bg-background">
                                <span className="font-medium text-primary">
                                  {formatNumber(calculatedMiles, 0)} pontos
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Bandeira do Cartão - movido para baixo */}
                  <Collapsible className="border-t pt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                        <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          Bandeira do Cartão (opcional)
                        </Label>
                        <span className="text-muted-foreground text-sm">▶</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <div className="grid grid-cols-4 gap-2">
                        {cardBrands.map((brand) => (
                          <button
                            key={brand.value}
                            type="button"
                            onClick={() => handleBrandChange(brand.value)}
                            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${
                              formData.card_brand === brand.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <CardBrandIcon brand={brand.value} size="md" />
                            <span className="text-xs text-muted-foreground">{brand.label}</span>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={closeDialog}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingId ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        />

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar cartões..."
              className="pl-10"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cartoesFiltrados.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Nenhum cartão cadastrado"
                description="Cadastre os cartões de crédito que você usa para acumular milhas."
                actionLabel="Cadastrar Cartão"
                onAction={() => {
                  setEditingId(null);
                  setInvoiceValue('');
                  setFormData(initialFormData);
                  setDialogOpen(true);
                }}
              />
            ) : (
              <div className="space-y-2" data-tour="cards-list">
                {cartoesFiltrados.map((cartao) => {
                  const brand = getBrandFromName(cartao.card_name || '');
                  return (
                    <div
                      key={cartao.id}
                      className={`flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors ${
                        cartao.is_active === false ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CardBrandIcon brand={brand} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {cartao.card_name}
                              {cartao.issuer_bank && <span className="text-muted-foreground font-normal"> • {cartao.issuer_bank}</span>}
                            </p>
                            {cartao.is_active === false && (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cartao.holders?.name ? toTitleCase(cartao.holders.name) : 'Sem titular'}
                            {cartao.last_four_digits && (
                              <>
                                {' • '}
                                <span className="font-mono tabular-nums">**** {cartao.last_four_digits}</span>
                              </>
                            )}
                          </p>
                          {cartao.linked_program && (
                            <div className="flex items-center gap-2 mt-1">
                              <ProgramLogo program={cartao.linked_program} size="sm" />
                              <span className="text-xs text-muted-foreground">
                                <span className="font-mono tabular-nums">{cartao.miles_per_dollar || 1}</span> milhas/dólar
                              </span>
                            </div>
                          )}
                          {/* VIP Badge */}
                          {vipStatusMap?.get(cartao.id)?.overallStatus !== 'inactive' && vipStatusMap?.get(cartao.id) && (
                            <div className="mt-1 flex gap-1">
                              <Badge
                                variant="secondary"
                                className={`text-xs gap-1 font-normal font-mono tabular-nums ${
                                  vipStatusMap.get(cartao.id)?.overallStatus === 'critical'
                                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                                    : vipStatusMap.get(cartao.id)?.overallStatus === 'warning'
                                    ? 'bg-warning/10 text-warning border-warning/30'
                                    : vipStatusMap.get(cartao.id)?.overallStatus === 'unlimited'
                                    ? 'bg-primary/10 text-primary border-primary/30'
                                    : 'bg-success/10 text-success border-success/30'
                                }`}
                              >
                                <Crown className="h-3 w-3" />
                                T: {vipStatusMap.get(cartao.id)?.isTitularUnlimited ? (
                                  <InfinityIcon className="h-3 w-3" />
                                ) : (
                                  vipStatusMap.get(cartao.id)?.titularRemaining
                                )}
                                {' | '}
                                C: {vipStatusMap.get(cartao.id)?.isConvidadoUnlimited ? (
                                  <InfinityIcon className="h-3 w-3" />
                                ) : (
                                  vipStatusMap.get(cartao.id)?.convidadoRemaining
                                )}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Mais opções">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(cartao)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/gestao/cartoes/${cartao.id}`)}>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteId(cartao.id)}
                          >
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}

          <p className="text-sm text-muted-foreground text-right">
            <span className="font-mono tabular-nums">{cartoesFiltrados.length}</span> cartões.
          </p>
        </div>

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          title="Excluir cartão"
          description="Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita."
          isLoading={deleteMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
